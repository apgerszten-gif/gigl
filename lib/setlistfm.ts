// setlist.fm: where a show from before the catalogue began comes from.
//
// Ticketmaster has no past events, so the `shows` catalogue only holds what
// the nightly sync captured while a show was still upcoming (see
// lib/ticketmaster.ts) - it starts on the day that capture began. For
// anything older, search asks setlist.fm, whose users have logged most
// touring acts' shows for decades. Coverage is thin for residencies, tribute
// nights and small local bills; Add a show is the answer there.
//
// Its terms (setlist.fm/help/terms) shape this file:
//  - Non-commercial use only. Gigl is free; charging for it needs a licence
//    from setlist.fm first.
//  - Attribution wherever its data appears, with a followable link. See the
//    "via setlist.fm" label on /select-festival.
//  - No copies beyond short-term caching. Results are cached for
//    CACHE_SECONDS and never written to `shows`. A show only reaches the
//    database as part of someone's own log: the artist, venue and date they
//    would otherwise have typed into Add a show.
//  - A standard key allows 2 requests a second and 1,440 a day. Hence the
//    caching, reading LOOKBACK_YEARS a load at a time rather than up front,
//    and giving up quietly when it says no.

import { nameKey } from './nameKey'
import { formatShowDate, windowEndIso } from './dates'
import { distanceInMiles, type Coords } from './geo'
import type { Show } from './ticketmaster'

const API = 'https://api.setlist.fm/rest/1.0'

const MIN_QUERY_LENGTH = 3
const CACHE_SECONDS    = 6 * 60 * 60

// How far back setlist.fm is searched. The catalogue itself only reaches
// back a year (RETAIN_DAYS), and only to when its capture began.
const LOOKBACK_YEARS = 5

// 20 setlists to a page, newest first, upcoming dates included. A touring
// act plays 50-100 shows a year, so five years can't be read up front
// without burning the daily quota: each load reads this many pages, and
// "Show earlier shows" on /select-festival asks for the next ones.
const PAGES_PER_LOAD = 2

// An artist with fewer shows than this in the whole window, and none left
// to page through, might not be what the query meant - see searchPastShows.
const FEW_SHOWS = 10
// setlist.fm allows 2 requests a second. Every request this instance makes
// takes the next slot at least this far after the last one - see call().
const REQUEST_GAP_MS = 550

// Two acts can share a name exactly ("Temples" is an English psych band and
// a Finnish doom one); both are searched, up to this many.
const MAX_ARTISTS = 2

// Shown on every result. setlist.fm has no photo when the artist_images
// table doesn't either.
const EMOJI = '🎤'

interface Setlist {
  eventDate: string  // 'dd-MM-yyyy'
  artist: { mbid: string; name: string }
  venue: {
    id:   string
    name: string
    city: {
      name:       string
      stateCode?: string
      coords?:    { lat: number; long: number }
      country:    { code: string }
    }
  }
}

interface Artist {
  mbid: string
  name: string
}

// Answers kept in memory for CACHE_SECONDS, checked before waiting for a
// request slot, so a search someone just made comes straight back rather
// than queueing behind the rate limit. Next's Data Cache sits behind this
// across instances, but only keeps 200s - an empty answer (setlist.fm's 404)
// is only ever remembered here. Bounded, oldest out first.
const MEMO_LIMIT = 500
const memo = new Map<string, { at: number; body: unknown }>()

function remember(url: string, body: unknown) {
  memo.delete(url)
  memo.set(url, { at: Date.now(), body })
  if (memo.size > MEMO_LIMIT) memo.delete(memo.keys().next().value!)
}

function isoFromSetlistDate(date: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

// For telling whether a name is the one typed: letters and digits only, a
// leading "the" dropped - "the national" is The National.
function looseName(name: string): string {
  return nameKey(name).replace(/^the /, '').replace(/[^a-z0-9]/g, '')
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

let nextSlot = 0
async function waitForSlot() {
  const now = Date.now()
  const slot = Math.max(now, nextSlot)
  nextSlot = slot + REQUEST_GAP_MS
  if (slot > now) await sleep(slot - now)
}

// The slot gate only paces one server instance, and a busy moment runs
// several, so setlist.fm can still answer 429. It is a per-second limit:
// one retry, a second later, gets through.
const RETRY_AFTER_429_MS = 1100

// One request. 'empty' is setlist.fm's 404 for "no results"; null means it
// couldn't answer (no key, a 429 twice over, an outage).
async function call<T>(path: string, params: Record<string, string>): Promise<T | 'empty' | null> {
  const key = process.env.SETLISTFM_API_KEY
  if (!key) return null

  const url = `${API}${path}?${new URLSearchParams(params)}`
  const kept = memo.get(url)
  if (kept && Date.now() - kept.at < CACHE_SECONDS * 1000) return kept.body as T | 'empty'

  const request = async () => {
    await waitForSlot()
    return fetch(url, {
      headers: { 'x-api-key': key, Accept: 'application/json', 'Accept-Language': 'en' },
      next: { revalidate: CACHE_SECONDS },
    })
  }

  try {
    let res = await request()
    if (res.status === 429) {
      await sleep(RETRY_AFTER_429_MS)
      res = await request()
    }
    if (res.status === 404) {
      remember(url, 'empty')
      return 'empty'
    }
    if (!res.ok) {
      console.error(`[setlistfm] ${path} ${JSON.stringify(params)}: HTTP ${res.status}`)
      return null
    }
    const body = await res.json() as T
    remember(url, body)
    return body
  } catch (err) {
    console.error(`[setlistfm] ${path} ${JSON.stringify(params)} failed:`, err)
    return null
  }
}

// The artists a query names. setlist.fm's own setlist search matches names
// loosely - "the national" brings back The National Parks and a run of
// orchestras before any show by The National - so the artist is settled
// first: every exact match, or failing that the most relevant name that
// starts with what was typed, for someone who stopped at "justin bieb".
async function findArtists(query: string): Promise<Artist[]> {
  const body = await call<{ artist?: Artist[] }>('/search/artists', { artistName: query, sort: 'relevance', p: '1' })
  if (!body || body === 'empty') return []

  const typed = looseName(query)
  const artists = (body.artist ?? []).filter(a => a.mbid)
  const exact = artists.filter(a => looseName(a.name) === typed)
  if (exact.length > 0) return exact.slice(0, MAX_ARTISTS)
  const partial = artists.find(a => looseName(a.name).startsWith(typed))
  return partial ? [partial] : []
}

// Pages [from, from + PAGES_PER_LOAD) of `path`, keeping the setlists inside
// [since, until]. `more` says whether a later page could still hold some:
// false once a page comes back short or runs past `since`. A request that
// failed outright leaves `more` true, so asking again can still get there.
async function readPages(
  path: string, params: Record<string, string>, from: number, since: string, until: string,
): Promise<{ setlists: Setlist[]; more: boolean }> {
  const found: Setlist[] = []
  for (let page = from; page < from + PAGES_PER_LOAD; page++) {
    const body = await call<{ setlist?: Setlist[] }>(path, { ...params, p: String(page) })
    if (body === null) return { setlists: found, more: true }
    if (body === 'empty') return { setlists: found, more: false }
    const setlists = body.setlist ?? []

    for (const s of setlists) {
      const iso = isoFromSetlistDate(s.eventDate)
      if (iso && iso >= since && iso <= until) found.push(s)
    }

    const oldest = setlists.length > 0 ? isoFromSetlistDate(setlists[setlists.length - 1].eventDate) : null
    if (setlists.length < 20 || !oldest || oldest < since) return { setlists: found, more: false }
  }
  return { setlists: found, more: true }
}

function lookbackStartIso(): string {
  const start = new Date()
  start.setUTCFullYear(start.getUTCFullYear() - LOOKBACK_YEARS)
  return start.toISOString().slice(0, 10)
}

// Stable across setlist.fm's own duplicates (two people can each post the
// same show), so everyone who logs a show shares one id and one ranking.
function showId(s: Setlist, isoDate: string): string {
  return `setlistfm-${s.artist.mbid || nameKey(s.artist.name)}-${s.venue.id}-${isoDate}`
}

export interface PastShowSearch {
  nearby?: { centre: Coords; radiusMiles: number } | null
  // Where the last load stopped, as it returned it in `next`. Omitted for
  // the first load.
  cursor?: string | null
}

export interface PastShowPage {
  shows: Show[]
  // Pass back as `cursor` for older shows; null when there are none.
  next:  string | null
}

// 'a:3' is page 3 of the artist's setlists, 'v:3' page 3 of the venue
// search - the kind is fixed by the first load, so a later page never
// switches from one to the other.
function parseCursor(cursor: string | null | undefined): { kind: 'a' | 'v'; page: number } | null {
  const m = /^([av]):(\d{1,3})$/.exec(cursor ?? '')
  return m ? { kind: m[1] as 'a' | 'v', page: Number(m[2]) } : null
}

// Past shows matching `query` from the last LOOKBACK_YEARS, newest first, a
// load at a time, as the same Show shape the catalogue search returns.
// Tried as an artist first, and as a venue when no artist by that name has
// played in that time - "casbah" is as likely a search as a band. Empty on
// a short query, a missing key, or anything setlist.fm says no to: this
// only ever adds to what the catalogue found.
export async function searchPastShows(query: string, options: PastShowSearch = {}): Promise<PastShowPage> {
  const value = query.trim()
  if (value.length < MIN_QUERY_LENGTH) return { shows: [], next: null }

  const since = lookbackStartIso()
  const until = windowEndIso()
  const cursor = parseCursor(options.cursor)

  let setlists: Setlist[] = []
  let next: string | null = null

  if (!cursor || cursor.kind === 'a') {
    const from = cursor?.page ?? 1
    let more = false
    for (const artist of await findArtists(value)) {
      const read = await readPages(`/artist/${artist.mbid}/setlists`, {}, from, since, until)
      setlists.push(...read.setlists)
      more = more || read.more
    }
    if (more) next = `a:${from + PAGES_PER_LOAD}`
  }

  // Then as a venue, when the artist search came to a handful of shows and
  // no more: "casbah" names a band with three shows in five years and a San
  // Diego room with hundreds, and it's the room people mean. Both are kept,
  // by date, so neither reading is lost. setlist.fm's venue search is loose
  // too, but it sorts by date, so the busiest room leads; only rooms whose
  // name starts with what was typed are kept - "wiltern" is the Wiltern
  // Theatre, not everywhere with a similar word in it. From here on, pages
  // come from the venue search.
  const fewFromArtist = !cursor && !next && setlists.length < FEW_SHOWS
  if (cursor?.kind === 'v' || fewFromArtist) {
    const from = cursor?.page ?? 1
    const typed = looseName(value)
    const read = await readPages('/search/setlists', { venueName: value }, from, since, until)
    const atVenue = read.setlists.filter(s => looseName(s.venue.name).startsWith(typed))
    setlists = cursor ? atVenue : [...setlists, ...atVenue]
    next = read.more ? `v:${from + PAGES_PER_LOAD}` : null
  }

  // Two artists' shows arrive one after the other; the list reads by date.
  setlists.sort((a, b) => isoFromSetlistDate(b.eventDate)!.localeCompare(isoFromSetlistDate(a.eventDate)!))

  const seen = new Set<string>()
  const shows: Show[] = []
  for (const s of setlists) {
    const isoDate = isoFromSetlistDate(s.eventDate)!
    const id = showId(s, isoDate)
    if (seen.has(id)) continue
    seen.add(id)

    const coords = s.venue.city.coords
    const distanceMiles = options.nearby && coords
      ? distanceInMiles(options.nearby.centre, { lat: coords.lat, lng: coords.long })
      : undefined
    // Near me filters on the city's centre - setlist.fm places venues no
    // closer than that - and drops a show it can't place at all.
    if (options.nearby && (distanceMiles == null || distanceMiles > options.nearby.radiusMiles)) continue

    const country = s.venue.city.country.code
    shows.push({
      id,
      artist:   s.artist.name,
      venue:    s.venue.name,
      city:     s.venue.city.name,
      // A US or Canadian state code reads as a state; elsewhere the country
      // is the more useful half of the place line.
      state:    country === 'US' || country === 'CA' ? s.venue.city.stateCode ?? '' : country,
      date:     formatShowDate(isoDate),
      isoDate,
      emoji:    EMOJI,
      imageUrl: null,
      distanceMiles,
    })
  }
  return { shows, next }
}
