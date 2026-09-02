// Server-only wrapper around Ticketmaster's Discovery API (events search).
// TICKETMASTER_API_KEY must never reach the browser - only called from
// app/api/shows/search/route.ts.

import { formatShowDate } from './dates'

const TICKETMASTER_API_KEY = process.env.TICKETMASTER_API_KEY!

export interface Show {
  id: string
  artist: string
  support?: string[]
  venue: string
  city: string
  state: string
  date: string          // display-formatted, e.g. 'Sep 12'
  isoDate: string | null // 'YYYY-MM-DD', carried through so a picked show can be logged with a real show_date
  emoji: string
}

interface TMClassification {
  segment?: { name: string }
  genre?: { name: string }
}

interface TMAttraction {
  name: string
  classifications?: TMClassification[]
}

interface TMVenue {
  name?: string
  city?: { name?: string }
  state?: { stateCode?: string; name?: string }
}

interface TMEvent {
  id: string
  name: string
  dates?: { start?: { localDate?: string } }
  classifications?: TMClassification[]
  _embedded?: {
    venues?: TMVenue[]
    attractions?: TMAttraction[]
  }
}

interface TMEventSearchResponse {
  _embedded?: { events?: TMEvent[] }
}

// Coarse genre -> emoji mapping. Ticketmaster's data has no emoji/icon field
// of its own, so this is an approximation off classifications.genre/segment;
// anything unmatched falls back to a generic music note.
const GENRE_EMOJI: Record<string, string> = {
  rock:        '🎸',
  metal:       '🤘',
  alternative: '🎸',
  punk:        '🎸',
  pop:         '🎤',
  'hip-hop/rap': '🎤',
  rap:         '🎤',
  'r&b':       '🎶',
  soul:        '🎶',
  electronic:  '🎧',
  dance:       '🎧',
  edm:         '🎧',
  country:     '🤠',
  folk:        '🪕',
  jazz:        '🎷',
  blues:       '🎷',
  classical:   '🎻',
  latin:       '💃',
  reggae:      '🌴',
  comedy:      '🎤',
}
const DEFAULT_EMOJI = '🎵'

function emojiFor(event: TMEvent, headliner?: TMAttraction): string {
  const genreName =
    headliner?.classifications?.[0]?.genre?.name ??
    event.classifications?.[0]?.genre?.name ??
    event.classifications?.[0]?.segment?.name
  if (!genreName) return DEFAULT_EMOJI
  return GENRE_EMOJI[genreName.toLowerCase()] ?? DEFAULT_EMOJI
}

function toShow(event: TMEvent): Show {
  const venue = event._embedded?.venues?.[0]
  const attractions = event._embedded?.attractions ?? []
  // Ticketmaster doesn't mark a "headliner" - attraction order isn't
  // guaranteed, so this is a best guess (first attraction wins), not a
  // guarantee the support acts are billed correctly.
  const [headliner, ...supportActs] = attractions

  return {
    // Prefixed so a Ticketmaster-sourced id is distinguishable from a
    // lib/festivals.ts festival/artist id wherever localStorage's
    // gigl_festival_id or profiles.active_festival_id gets read later.
    id:      `tm-${event.id}`,
    artist:  headliner?.name ?? event.name,
    support: supportActs.length > 0 ? supportActs.map(a => a.name) : undefined,
    venue:   venue?.name ?? 'Venue TBA',
    city:    venue?.city?.name ?? '',
    state:   venue?.state?.stateCode ?? venue?.state?.name ?? '',
    date:    formatShowDate(event.dates?.start?.localDate),
    isoDate: event.dates?.start?.localDate ?? null,
    emoji:   emojiFor(event, headliner),
  }
}

// keyword omitted/blank -> browse mode (no filter beyond country + segment),
// used for the page's initial "nothing typed yet" trending list.
export async function searchShows(keyword: string): Promise<Show[]> {
  const params = new URLSearchParams({
    apikey:            TICKETMASTER_API_KEY,
    countryCode:       'US',
    classificationName: 'music',
    size:              '20',
    sort:              keyword.trim() ? 'relevance,desc' : 'date,asc',
  })
  if (keyword.trim()) params.set('keyword', keyword.trim())

  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, {
    // Next.js Data Cache - identical querystrings within the window reuse
    // the cached response instead of hitting Ticketmaster again, which is
    // what keeps repeated/overlapping searches (and the trending list,
    // fetched by every visitor) well under the 5000/day, 5/sec free-tier cap.
    next: { revalidate: keyword.trim() ? 300 : 600 },
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ticketmaster search failed (${res.status}): ${text}`)
  }

  const data: TMEventSearchResponse = await res.json()
  return (data._embedded?.events ?? []).map(toShow)
}
