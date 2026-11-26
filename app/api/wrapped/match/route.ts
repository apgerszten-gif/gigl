import { NextRequest, NextResponse } from 'next/server'
import { searchArtists, showsForArtists, type ArtistMatch } from '@/lib/shows/repository'
import { editDistance, nameKey } from '@/lib/nameKey'
import { KNOWN_ARTISTS } from '@/lib/shows/knownArtists'
import { windowEndIso } from '@/lib/dates'
import type { Show } from '@/lib/ticketmaster'
import type { MatchResult, WrappedArtist, WrappedCard, WrappedName, WrappedShow } from '@/lib/wrapped/types'

// POST /api/wrapped/match - the names read off someone's Wrapped, matched to
// Gigl's spelling, with each one's shows: what's coming up and what happened
// in the past year (as far back as the catalogue keeps).
//
//   { names: [{ name, from: 'artists' | 'songs' | 'typed' }], lat?, lng? }
//   -> { artists, upcoming, past }
//
// A screenshot is read exactly as printed, and Spotify's spelling isn't
// always the catalogue's ("Fontaines DC" / "Fontaines D.C."), or the read
// slips a letter. So each name is looked up loosely and, when nothing
// matches it exactly, corrected to the closest name Gigl has (closestMatch,
// the add-a-show form's "did you mean").
//
// Every show comes back, near or far. With lat/lng each carries its distance,
// and the flow filters by its own Near me control without asking again.

// supabase-js reads go in the Data Cache without this - see the search route.
export const fetchCache = 'default-no-store'
export const dynamic = 'force-dynamic'

const MAX_NAMES = 30
const CANDIDATES = 10

function isName(value: unknown): value is WrappedName {
  const entry = value as WrappedName
  return !!entry && typeof entry.name === 'string' && entry.name.trim().length > 0
    && (entry.from === 'artists' || entry.from === 'songs' || entry.from === 'typed')
}

// What to search on when the whole name finds nothing: the start of its first
// long word. A misread name usually starts right ("Fontains DC" still begins
// "Font"), and searching on half the word lets a slipped letter later in it
// through.
function searchWord(name: string): string | null {
  const word = name.split(/\s+/).find(w => nameKey(w).replace(/[^a-z0-9]/g, '').length >= 4)
  if (!word) return null
  // Half the word, so a slipped letter late in it still matches.
  return word.slice(0, Math.max(4, Math.ceil(word.length / 2)))
}

// Letters and digits only, so "Fontaines DC" and "Fontaines D.C." are one name.
const bare = (name: string) => nameKey(name).replace(/[^a-z0-9]/g, '')

// `fuzzy` is for names read off the Top Artists column, where a screenshot
// can be misread by a letter. Names that came from a song lookup
// (MusicBrainz or Deezer) are already spelled correctly, and correcting them
// does harm: "Adam Ten" is two letters from the start of "Adam Beyer", and
// "Rhye" one from "RAYE". Even when fuzzy, only a name one letter off the
// whole of a longer name is corrected (a short name is too easy to confuse).
async function resolve(read: string, fuzzy: boolean): Promise<{ name: string; corrected: boolean; imageUrl: string | null } | null> {
  // A failed search throws, so the whole lookup fails rather than reporting
  // every artist as "not in Gigl yet".
  const key = nameKey(read)
  const direct = await searchArtists(read, CANDIDATES)
  const exact = direct.find(c => nameKey(c.name) === key)
  if (exact) return { name: exact.name, corrected: false, imageUrl: exact.imageUrl }

  const word = searchWord(read)
  const loose: ArtistMatch[] = word ? await searchArtists(word, CANDIDATES * 2) : []
  const candidates = [...direct, ...loose]
  const looseExact = candidates.find(c => nameKey(c.name) === key)
  if (looseExact) return { name: looseExact.name, corrected: false, imageUrl: looseExact.imageUrl }

  // Same name, different punctuation ("Fontaines DC" / "Fontaines D.C.").
  const target = bare(read)
  const samePunctuation = candidates.find(c => bare(c.name) === target)
  if (samePunctuation) return { name: samePunctuation.name, corrected: true, imageUrl: samePunctuation.imageUrl }
  const samePunctuationKnown = KNOWN_ARTISTS.find(n => bare(n) === target)
  if (samePunctuationKnown) return { name: samePunctuationKnown, corrected: true, imageUrl: null }

  if (!fuzzy || target.length < 7) return null
  const near = (name: string) => editDistance(target, bare(name)) <= (target.length >= 12 ? 2 : 1)
  const byCatalogue = candidates.find(c => near(c.name))
  if (byCatalogue) return { name: byCatalogue.name, corrected: true, imageUrl: byCatalogue.imageUrl }
  const byList = KNOWN_ARTISTS.find(near)
  return byList ? { name: byList, corrected: true, imageUrl: null } : null
}

function toWrappedShow(show: Show, wrappedArtist: string): WrappedShow {
  return {
    id:            show.id,
    artist:        show.artist,
    support:       show.support,
    venue:         show.venue,
    city:          show.city,
    state:         show.state,
    isoDate:       show.isoDate ?? null,
    imageUrl:      show.imageUrl ?? null,
    distanceMiles: show.distanceMiles,
    wrappedArtist,
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { names?: unknown; lat?: unknown; lng?: unknown } | null
  const names = Array.isArray(body?.names) ? body!.names.filter(isName).slice(0, MAX_NAMES) : []
  if (names.length === 0) return NextResponse.json({ error: 'No artists to look up.' }, { status: 400 })

  const lat = typeof body?.lat === 'number' && Math.abs(body.lat) <= 90 ? body.lat : null
  const lng = typeof body?.lng === 'number' && Math.abs(body.lng) <= 180 ? body.lng : null
  const from = lat != null && lng != null ? { lat, lng } : null

  try {
    const resolved = await Promise.all(names.map(entry => resolve(entry.name.trim(), entry.from !== 'songs')))

    // Two reads can land on one Gigl artist (the same act on both cards, or
    // two spellings of it). The first, higher-ranked one keeps it and the
    // other is left out, rather than listed as "not in Gigl". Ranks count
    // what's left.
    const taken = new Set<string>()
    const artists: WrappedArtist[] = []
    names.forEach((entry, i) => {
      const match = resolved[i]
      const key = nameKey(match ? match.name : entry.name)
      if (taken.has(key)) return
      taken.add(key)
      artists.push({
        read:      entry.name.trim(),
        name:      match ? match.name : entry.name.trim(),
        from:      entry.from as WrappedCard,
        rank:      artists.length + 1,
        matched:   !!match,
        corrected: !!match && match.corrected,
        imageUrl:  match ? match.imageUrl : null,
      })
    })

    const matchedNames = artists.filter(a => a.matched).map(a => a.name)
    const shows = await showsForArtists(matchedNames, from)

    // One row per show. Ticketmaster often lists a show twice under two ids
    // (same act, room and night), and a show with two of their artists on
    // the bill turns up under both. It's credited to the headliner when the
    // headliner is one of their artists, otherwise to the higher-ranked one.
    const today = windowEndIso()
    const byShow = new Map<string, WrappedShow>()
    for (const name of matchedNames) {
      for (const show of shows.get(name) ?? []) {
        if (!show.isoDate) continue
        const key = `${nameKey(show.artist)}|${nameKey(show.venue)}|${show.isoDate}`
        const existing = byShow.get(key)
        if (!existing) byShow.set(key, toWrappedShow(show, name))
        else if (nameKey(existing.wrappedArtist) !== nameKey(existing.artist) && nameKey(show.artist) === nameKey(name)) {
          existing.wrappedArtist = name
        }
      }
    }
    const upcoming: WrappedShow[] = []
    const past: WrappedShow[] = []
    for (const row of Array.from(byShow.values())) {
      if (row.isoDate! > today) upcoming.push(row)
      else past.push(row)
    }
    upcoming.sort((a, b) => (a.isoDate ?? '').localeCompare(b.isoDate ?? '') || a.id.localeCompare(b.id))
    past.sort((a, b) => (b.isoDate ?? '').localeCompare(a.isoDate ?? '') || a.id.localeCompare(b.id))

    const result: MatchResult = { artists, upcoming, past }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[wrapped/match] failed:', err)
    return NextResponse.json({ error: "Couldn't look up those artists. Try again." }, { status: 500 })
  }
}
