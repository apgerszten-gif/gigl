// Turns the song titles on someone's Wrapped card into the artists who made
// them. The Top Songs column lists titles only ("3 Days Later"), and a title
// alone is ambiguous ("Runaway" has dozens of owners), so each one is looked
// up in MusicBrainz, the open music database, which has the full credit
// including collaborators: "3 Days Later" is Rhye & Adam Ten, where a
// streaming catalogue credits only one of them.
//
// Several recordings usually share a title, so the right one is picked by,
// in order of strength:
//   - the artist Claude thought it was, when it was confident;
//   - an artist already on their Top Artists (people hear their favourites);
//   - Deezer's most popular track of that name (a popularity tie-break only,
//     nothing from Deezer is kept).
// A title nothing settles is left out rather than guessed at, and the check
// screen lets the person untick anything wrong anyway.
//
// MusicBrainz asks for at most one request a second and a named client.
// Self-contained (no app imports) so it can be run on its own to test.

export interface SongRead {
  title:  string
  // Claude's own guess at the artist, or null when it wasn't sure.
  guess:  string | null
}

const MB_GAP_MS = 1100
const MB_USER_AGENT = 'Gigl/0.1 (non-commercial; Wrapped song lookup)'

let lastMusicBrainz = 0

async function musicBrainzGate() {
  const wait = lastMusicBrainz + MB_GAP_MS - Date.now()
  lastMusicBrainz = Math.max(Date.now(), lastMusicBrainz + MB_GAP_MS)
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
}

// Folds case, accents and punctuation, so "All I Need" and "All I Need!" and
// "Leaveyourlove" compare equal to their credits.
function plain(text: string): string {
  return text.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '')
}

interface Candidate { artists: string[] }

async function musicBrainz(title: string): Promise<Candidate[]> {
  const escaped = title.replace(/(["\\])/g, '\\$1')
  const url = `https://musicbrainz.org/ws/2/recording?fmt=json&limit=40&query=${encodeURIComponent(`recording:"${escaped}"`)}`
  // MusicBrainz answers 503 when it's being asked too fast (shared server
  // addresses get it more than most), so wait and try again a couple of times.
  let res: Response | null = null
  for (let attempt = 0; attempt < 3; attempt++) {
    await musicBrainzGate()
    res = await fetch(url, { headers: { 'User-Agent': MB_USER_AGENT }, signal: AbortSignal.timeout(8000) })
    if (res.status !== 503 && res.status !== 429) break
    await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)))
  }
  if (!res || !res.ok) throw new Error(`MusicBrainz HTTP ${res?.status}`)
  const body = await res.json() as { recordings?: { title: string; score?: number; 'artist-credit'?: { artist?: { name: string }; name?: string }[] }[] }

  const seen = new Set<string>()
  const out: Candidate[] = []
  for (const r of body.recordings ?? []) {
    if ((r.score ?? 0) < 90 || plain(r.title) !== plain(title)) continue
    const artists = (r['artist-credit'] ?? []).map(c => c.artist?.name ?? c.name ?? '').filter(Boolean)
    if (artists.length === 0) continue
    const key = artists.map(plain).sort().join('|')
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ artists })
  }
  return out
}

// Deezer's most popular track of that exact name, with everyone credited on
// it (the track's own page lists collaborators; a search only shows one).
async function deezerCredit(title: string): Promise<string[] | null> {
  try {
    const search = await fetch(`https://api.deezer.com/search?limit=5&q=${encodeURIComponent(`track:"${title.replace(/"/g, '')}"`)}`, { signal: AbortSignal.timeout(6000) })
    if (!search.ok) return null
    const found = await search.json() as { data?: { id: number; title: string }[] }
    const top = (found.data ?? []).find(t => plain(t.title) === plain(title))
    if (!top) return null
    const detail = await fetch(`https://api.deezer.com/track/${top.id}`, { signal: AbortSignal.timeout(6000) })
    if (!detail.ok) return null
    const track = await detail.json() as { contributors?: { name: string }[]; artist?: { name: string } }
    const names = (track.contributors ?? []).map(c => c.name).filter(Boolean)
    return names.length > 0 ? names : track.artist ? [track.artist.name] : null
  } catch {
    return null
  }
}

// The artists behind each song, in song order, without repeats. `topArtists`
// are the names already read off the Top Artists column.
export async function resolveSongs(songs: SongRead[], topArtists: string[]): Promise<string[]> {
  const top = new Set(topArtists.map(plain))
  const found: string[] = []
  const have = new Set(top)

  for (const song of songs) {
    let picked: string[] | null = null
    let candidates: Candidate[] = []
    try {
      candidates = await musicBrainz(song.title)
    } catch (err) {
      console.error(`[wrapped/songs] MusicBrainz failed for "${song.title}":`, err instanceof Error ? err.message : err)
    }

    const guess = song.guess ? plain(song.guess) : null
    // A song is usually credited to several versions (the original, then
    // collaborations and remixes: Parcels' "Leaveyourlove" has six), so among
    // the credits that name a likely artist, the one with the fewest other
    // names on it is the original.
    const score = (c: Candidate) => {
      const names = c.artists.map(plain)
      const likely = (guess && names.includes(guess) ? 100 : 0) + (names.some(n => top.has(n)) ? 50 : 0)
      return likely > 0 ? likely - 5 * (names.length - 1) : 0
    }
    const best = candidates.map(c => ({ c, s: score(c) })).sort((a, b) => b.s - a.s)[0]
    if (best && best.s !== 0) picked = best.c.artists

    // Nothing points at one recording, so take Deezer's most popular track of
    // that name and everyone credited on it. A title only one recording has
    // is used as it stands.
    if (!picked) picked = await deezerCredit(song.title)
    if (!picked && candidates.length === 1) picked = candidates[0].artists

    // MusicBrainz had nothing usable: Claude's own guess, if it had one.
    if (!picked && song.guess) picked = [song.guess]

    for (const name of picked ?? []) {
      if (have.has(plain(name))) continue
      have.add(plain(name))
      found.push(name)
    }
  }
  return found
}
