// Server-only wrapper around Ticketmaster's Discovery API (events and
// attraction search). TICKETMASTER_API_KEY must never reach the browser -
// only called from app/api/shows/search and app/api/cron/sync-shows.

import { formatShowDate } from './dates'
import { artistKey } from './artistImages'

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
  imageUrl: string | null // Ticketmaster's photo for the headliner (or the event), see pickImage
  // Miles from the searcher, present only on a "near me" search of the
  // stored catalogue (see lib/shows/repository.ts). Live Ticketmaster
  // results never carry it, since that path has no location filter.
  distanceMiles?: number
}

interface TMClassification {
  segment?: { name: string }
  genre?: { name: string }
}

interface TMImage {
  url:       string
  ratio?:    string   // '16_9', '3_2', '4_3', ...
  width?:    number
  fallback?: boolean  // Ticketmaster's generic stand-in art, not a real photo
}

interface TMAttraction {
  name: string
  classifications?: TMClassification[]
  images?: TMImage[]
}

interface TMVenue {
  name?: string
  city?: { name?: string }
  state?: { stateCode?: string; name?: string }
  // Present on most but not all venues, and stringly-typed when it is -
  // the nightly sync falls back to the metro centroid when it's missing.
  location?: { latitude?: string; longitude?: string }
}

interface TMEvent {
  id: string
  name: string
  dates?: { start?: { localDate?: string } }
  classifications?: TMClassification[]
  images?: TMImage[]
  _embedded?: {
    venues?: TMVenue[]
    attractions?: TMAttraction[]
  }
}

interface TMEventSearchResponse {
  _embedded?: { events?: TMEvent[] }
  page?: { totalPages?: number; number?: number }
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

// Each artist/event carries ~10 crops of the same photo. Gigl shows them as
// small squares (object-cover), so prefer the less-wide 3:2 / 4:3 crops at
// roughly 600px, which stay sharp on retina without pulling the 2048px
// source. Ticketmaster's fallback images are generic stock art, never used.
const PREFERRED_RATIOS = ['3_2', '4_3', '1_1']

export function pickImage(images: TMImage[] | undefined): string | null {
  const real = (images ?? []).filter(img => img.url && !img.fallback)
  if (real.length === 0) return null
  const byWidth = (list: TMImage[]) => list.slice().sort((a, b) => (a.width ?? 0) - (b.width ?? 0))
  const preferred = byWidth(real.filter(img => img.ratio && PREFERRED_RATIOS.includes(img.ratio)))
  const pool = preferred.length > 0 ? preferred : byWidth(real)
  return (pool.find(img => (img.width ?? 0) >= 600) ?? pool.find(img => (img.width ?? 0) >= 300) ?? pool[pool.length - 1]).url
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
    imageUrl: pickImage(headliner?.images) ?? pickImage(event.images),
  }
}

// ─── Nightly sync path ──────────────────────────────────────────────────────
// Everything below feeds app/api/cron/sync-shows, which walks SYNC_CITIES and
// upserts into Postgres. It is the only path that talks to Ticketmaster:
// normal search traffic reads the `shows` table and never comes here.
//
// **Discovery has no past events, so the sync is a capture, not a lookup.**
// Gigl's catalogue serves the past week (lib/dates.ts), but an event drops
// out of Ticketmaster's index the moment it's over - an explicit past
// `startDateTime`/`endDateTime` returns zero results, verified against a
// range that returns 800 upcoming events for the same city. There is no
// archive to ask. So the sync keeps pulling *upcoming* listings, banking each
// show days or weeks before it happens, and the catalogue earns its past week
// by keeping those rows once their date passes rather than by fetching them
// back. The retention rule lives in prunePastShows(); breaking it would empty
// the search list with no way to refill it.
//
// This is also why the row for a show happening tonight must survive tomorrow
// even though nothing upstream mentions it any more.

import type { SyncCity } from './shows/cities'

export interface SyncShow extends Show {
  lat: number | null
  lng: number | null
  // The SYNC_CITIES entry this row was pulled under, which is not always the
  // venue's own city - a metro query legitimately returns shows in
  // surrounding towns. Stored so a city's rows can be re-synced or purged as
  // a unit without guessing at venue city spellings.
  metro: string
  // The headliner's own photo, for public.artist_images. Unlike imageUrl it
  // never falls back to the event's image, since that may not show the
  // artist, and it's null when the event lists no attraction at all.
  artistImage: string | null
}

// Ticketmaster caps `size` at 200 and refuses to page beyond 1000 results
// for a single query, so 5 pages is the real ceiling per city, not a
// self-imposed one.
export const TM_MAX_PAGE_SIZE = 200

function toSyncShow(event: TMEvent, city: SyncCity): SyncShow {
  const base  = toShow(event)
  const venue = event._embedded?.venues?.[0]
  const rawLat = venue?.location?.latitude
  const rawLng = venue?.location?.longitude

  // Ticketmaster sends coordinates as strings and occasionally as empty
  // strings, which Number() would happily turn into 0 - a valid-looking
  // coordinate off the coast of Africa. Parse explicitly and fall back to
  // the metro centroid rather than letting that through.
  const lat = rawLat !== undefined && rawLat !== '' ? Number(rawLat) : NaN
  const lng = rawLng !== undefined && rawLng !== '' ? Number(rawLng) : NaN

  return {
    ...base,
    lat: Number.isFinite(lat) ? lat : city.lat,
    lng: Number.isFinite(lng) ? lng : city.lng,
    metro: `${city.city}, ${city.stateCode}`,
    artistImage: pickImage(event._embedded?.attractions?.[0]?.images),
  }
}

export interface CityPageResult {
  shows:      SyncShow[]
  totalPages: number
}

// One page of one city's upcoming music listings. Deliberately a single
// page rather than a loop: the caller owns pacing, because Ticketmaster's
// free tier allows 5 requests/sec and a loop in here would have no view of
// the requests the other cities are making.
export async function fetchCityShowsPage(city: SyncCity, page: number): Promise<CityPageResult> {
  const params = new URLSearchParams({
    apikey:             TICKETMASTER_API_KEY,
    countryCode:        'US',
    classificationName: 'music',
    city:               city.city,
    stateCode:          city.stateCode,
    size:               String(TM_MAX_PAGE_SIZE),
    page:               String(page),
    // Soonest first. A metro busy enough to hit the 1000-result deep paging
    // ceiling keeps the shows about to happen, which are the ones due to
    // enter the catalogue's past week within days; a listing nine months out
    // has many more nights to be captured on.
    sort:               'date,asc',
  })

  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/events.json?${params}`, {
    // Explicitly uncached: this runs once a night and exists precisely to
    // observe what changed. A cache hit here would defeat the whole job.
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ticketmaster city sync failed for ${city.city} p${page} (${res.status}): ${text}`)
  }

  const data: TMEventSearchResponse = await res.json()
  return {
    shows:      (data._embedded?.events ?? []).map(e => toSyncShow(e, city)),
    totalPages: data.page?.totalPages ?? 1,
  }
}

interface TMAttractionSearchResponse {
  _embedded?: { attractions?: TMAttraction[] }
}

// A photo for an artist we only know by name (a festival set, say), found
// through attraction search. Only an exact name match counts - the top
// result for a short name is often a different act, and a wrong photo is
// worse than the placeholder. Returns null when nothing usable turns up.
export async function lookupArtistImage(name: string): Promise<string | null> {
  const params = new URLSearchParams({
    apikey:             TICKETMASTER_API_KEY,
    keyword:            name,
    classificationName: 'music',
    size:               '10',
  })

  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/attractions.json?${params}`, { cache: 'no-store' })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Ticketmaster attraction search failed for ${name} (${res.status}): ${text}`)
  }

  const data: TMAttractionSearchResponse = await res.json()
  const key = artistKey(name)
  const match = (data._embedded?.attractions ?? []).find(a => artistKey(a.name) === key && pickImage(a.images))
  return match ? pickImage(match.images) : null
}
