import type { Festival, FestivalArtist } from './festivals'

// "Artist Name Performance Venue Crowd" — the last three space-separated
// tokens must be integers 1-5; everything before that is the artist name.
export interface ParsedLog {
  artistNameRaw: string
  performance:   number
  venue:         number
  crowd:         number
}

export function parseLogMessage(body: string): ParsedLog | null {
  const tokens = body.trim().split(/\s+/).filter(Boolean)
  if (tokens.length < 4) return null

  const last3 = tokens.slice(-3)
  const nameTokens = tokens.slice(0, -3)
  if (nameTokens.length === 0) return null

  const nums = last3.map(t => Number(t))
  if (nums.some(n => !Number.isInteger(n) || n < 1 || n > 5)) return null

  return {
    artistNameRaw: nameTokens.join(' '),
    performance: nums[0],
    venue: nums[1],
    crowd: nums[2],
  }
}

// A festival's own local timezone matters here, not the server's — people
// are texting these in from the show itself, often in the evening, when
// UTC has already rolled over to "tomorrow".
const FESTIVAL_TIMEZONES: Record<string, string> = {
  'lollapalooza-2026':  'America/Chicago',
  'outside-lands-2026': 'America/Los_Angeles',
}

export function resolveFestivalDay(festival: Festival): string | null {
  const timeZone = FESTIVAL_TIMEZONES[festival.id] ?? 'America/Chicago'
  const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone })
  return festival.days.find(day => festival.dayDates[day] === today) ?? null
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

export type ArtistMatch =
  | { type: 'confident';  artist: FestivalArtist }
  | { type: 'ambiguous';  candidates: FestivalArtist[] }
  | { type: 'none' }

// Not fancy on purpose: exact match, then substring containment, then a
// Levenshtein fallback for typos — enough to handle "tate mcrae" vs "Tate
// McRae" and small misspellings without needing a real search index.
export function matchArtist(input: string, artists: FestivalArtist[]): ArtistMatch {
  const normInput = normalize(input)
  if (!normInput) return { type: 'none' }

  const exact = artists.find(a => normalize(a.name) === normInput)
  if (exact) return { type: 'confident', artist: exact }

  const substringMatches = artists.filter(a => {
    const normName = normalize(a.name)
    return normName.includes(normInput) || normInput.includes(normName)
  })
  if (substringMatches.length === 1) return { type: 'confident', artist: substringMatches[0] }
  if (substringMatches.length > 1) return { type: 'ambiguous', candidates: substringMatches.slice(0, 5) }

  const scored = artists
    .map(a => ({ artist: a, distance: levenshtein(normInput, normalize(a.name)) }))
    .sort((x, y) => x.distance - y.distance)

  const threshold = Math.max(2, Math.floor(normInput.length * 0.3))
  const close = scored.filter(s => s.distance <= threshold)

  if (close.length === 0) return { type: 'none' }
  if (close.length === 1 || close[0].distance < close[1].distance) {
    return { type: 'confident', artist: close[0].artist }
  }
  return { type: 'ambiguous', candidates: close.slice(0, 5).map(c => c.artist) }
}
