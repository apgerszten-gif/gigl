// The venue-website sync: reads every venue in lib/venues/list.ts, turns its
// listings into `shows` rows, drops the ones the catalogue already has, and
// - in live mode only - writes the rest. Called by app/api/cron/sync-venues.
//
// Like the Ticketmaster sync, it captures shows while they are upcoming and
// lets them age in place (see "Search serves the past week" in CLAUDE.md).
// Unlike Ticketmaster, two of the formats also answer for the past, so a
// WordPress or Squarespace venue arrives with up to a year of history on its
// first run - the same year the catalogue keeps and search reaches back.

import { catalogueShowsAtVenue, upsertVenueShows, type VenueShowRow } from '../shows/repository'
import { RETAIN_DAYS } from '../dates'
import { nameKey } from '../nameKey'
import { FetchError, RobotsDisallowed, fetchIfAllowed, resetFetchState, type Fetched } from './fetch'
import {
  billFor, detectEventsCalendarApi, eventsFromIcs, eventsFromSquarespace, eventsFromTribe, extractJsonLdEvents,
  findCalendarLinks, findIcsLink, isMusic, looksLikeSquarespace, sameArtist, type VenueEvent,
} from './parse'
import { VENUES, type Venue } from './list'
import type { VenueMethod, VenueResult, VenueSyncMode, VenueSyncReport, VenueStatus } from './report'

// Sites fetched at once. Each site is still one request at a time
// (lib/venues/fetch.ts), so this only overlaps different venues' waiting.
const CONCURRENCY = 10

// Fetching stops here so the dedupe, the write and the report always happen
// inside the function's 300s. Venues not reached are reported as such, and
// the starting point rotates daily so the same ones aren't always last.
const FETCH_DEADLINE_MS = 190_000

// Shows further out than this are usually placeholders ("TBA 2028").
const FUTURE_DAYS = 548

// The Events Calendar pages at 50; 12 pages is a busy room's year and a half.
const TRIBE_PER_PAGE = 50
const TRIBE_MAX_PAGES = 12

const SAMPLE_SIZE = 3

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(days: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + days)
  return isoDay(d)
}

function slug(text: string, max = 60): string {
  return nameKey(text).replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, max).replace(/-$/, '')
}

// ── Reading one venue ────────────────────────────────────────────────────────

interface Found {
  method:  VenueMethod
  pageUrl: string
  events:  VenueEvent[]
}

function parseJson(text: string): unknown {
  try { return JSON.parse(text) } catch { return null }
}

async function fromEventsCalendar(apiBase: string, from: string, to: string): Promise<VenueEvent[]> {
  const events: VenueEvent[] = []
  for (let page = 1; page <= TRIBE_MAX_PAGES; page++) {
    const url = `${apiBase}events?start_date=${from}&end_date=${to}&per_page=${TRIBE_PER_PAGE}&page=${page}`
    const res = await fetchIfAllowed(url, 'application/json')
    if (res.status >= 400) break
    const payload = parseJson(res.body) as { total_pages?: number } | null
    if (!payload) break
    events.push(...eventsFromTribe(payload))
    if (!payload.total_pages || page >= payload.total_pages) break
  }
  return events
}

// Everything readable on one page, trying the formats that carry history
// first. Null when the page has no events in any format.
async function readPage(page: Fetched, venue: Venue, from: string, to: string): Promise<Found | null> {
  const html = page.body

  const tribeApi = detectEventsCalendarApi(html, page.url)
  if (tribeApi) {
    try {
      const events = await fromEventsCalendar(tribeApi, from, to)
      if (events.length > 0) return { method: 'wordpress', pageUrl: page.url, events }
    } catch {
      // The API is off or blocked on this site; the page may still have JSON-LD.
    }
  }

  if (looksLikeSquarespace(html)) {
    try {
      const jsonUrl = new URL(page.url)
      jsonUrl.search = '?format=json'
      const res = await fetchIfAllowed(jsonUrl.toString(), 'application/json')
      const events = res.status < 400 ? eventsFromSquarespace(parseJson(res.body), venue.tz) : null
      if (events && events.length > 0) return { method: 'squarespace', pageUrl: page.url, events }
    } catch {
      // fall through
    }
  }

  const jsonLd = extractJsonLdEvents(html, venue.tz)
  if (jsonLd.length > 0) return { method: 'jsonld', pageUrl: page.url, events: jsonLd }

  const ics = findIcsLink(html, page.url)
  if (ics) {
    try {
      const res = await fetchIfAllowed(ics, 'text/calendar')
      const events = res.status < 400 ? eventsFromIcs(res.body, venue.tz) : []
      if (events.length > 0) return { method: 'ical', pageUrl: ics, events }
    } catch {
      // fall through
    }
  }

  return null
}

class VenueFailure extends Error {
  constructor(readonly status: VenueStatus, message: string) {
    super(message)
  }
}

async function fetchPage(url: string): Promise<Fetched> {
  let res: Fetched
  try {
    res = await fetchIfAllowed(url)
  } catch (err) {
    if (err instanceof RobotsDisallowed) throw new VenueFailure('robots', err.message)
    const message = err instanceof Error ? err.message : String(err)
    throw new VenueFailure('error', message)
  }
  if (res.status === 401 || res.status === 403 || res.status === 429) throw new VenueFailure('blocked', `HTTP ${res.status}`)
  if (res.status >= 400) throw new VenueFailure('error', `HTTP ${res.status}`)
  return res
}

// The venue's events: from the URL on file, or one hop away on a same-site
// link that looks like its calendar.
async function discover(venue: Venue, from: string, to: string): Promise<Found | null> {
  const home = await fetchPage(venue.url)
  const direct = await readPage(home, venue, from, to)
  if (direct) return direct

  for (const link of findCalendarLinks(home.body, home.url)) {
    try {
      const found = await readPage(await fetchPage(link), venue, from, to)
      if (found) return found
    } catch {
      // try the next candidate
    }
  }
  return null
}

// ── Listings to rows ─────────────────────────────────────────────────────────

// A room name with no venue in it ("Main Room", "Upstairs") says which room,
// not where; the venue's own name is the better label for search.
const ROOM_ONLY = /^(?:main ?room|main stage|the main stage|upstairs|downstairs|lounge|the lounge|patio|the patio|front room|back room|side room|showroom|stage|outdoor stage|indoor stage|the stage|ballroom|the ballroom|basement|the basement|rooftop|the rooftop|room \w+|stage \w+)$/i

function venueLabel(event: VenueEvent, venue: Venue): string {
  const name = event.locationName?.trim()
  if (!name || ROOM_ONLY.test(name) || name.length > 80) return venue.name
  // The site's own spelling of itself loses to ours, so one room isn't
  // filed under two names.
  const ours = nameKey(venue.name).replace(/^the /, '')
  const theirs = nameKey(name).replace(/^the /, '')
  if (theirs.indexOf(ours) >= 0 || ours.indexOf(theirs) >= 0) return venue.name
  return name
}

function toRow(event: VenueEvent, venue: Venue, artist: string, support: string[]): VenueShowRow {
  const elsewhere = !!event.state && event.state !== venue.state
  return {
    id:        `venue-${venue.id}-${event.isoDate}-${slug(artist)}`,
    artist,
    support:   support.length > 0 ? support : null,
    venue:     venueLabel(event, venue),
    city:      event.city ?? venue.city,
    state:     event.state ?? venue.state,
    show_date: event.isoDate,
    // The listing's own coordinates when it has them; otherwise the city
    // centroid, unless the listing is in another state altogether.
    lat:       event.lat ?? (elsewhere ? null : venue.lat),
    lng:       event.lng ?? (elsewhere ? null : venue.lng),
    metro:     venue.metro,
    image_url: event.imageUrl,
  }
}

// The most distinctive word in a venue's name, for finding the same room in
// the Ticketmaster rows: "Mercury Lounge" -> "mercury", "The Echo" -> "echo".
const GENERIC_WORDS = new Set([
  'the', 'club', 'bar', 'music', 'hall', 'lounge', 'theatre', 'theater', 'room', 'house', 'cafe', 'café',
  'ballroom', 'tavern', 'saloon', 'pub', 'live', 'venue', 'and', 'of', 'at', 'on', 'nightclub', 'records',
])

function distinctiveWord(name: string): string {
  const words = nameKey(name).split(/[^a-z0-9':.]+/).filter(w => w.length >= 3 && !GENERIC_WORDS.has(w))
  return words.sort((a, b) => b.length - a.length)[0] ?? nameKey(name)
}

// ── The run ──────────────────────────────────────────────────────────────────

function emptyResult(venue: Venue, status: VenueStatus): VenueResult {
  return {
    id: venue.id, name: venue.name, city: venue.city, state: venue.state, metro: venue.metro, url: venue.url,
    status, method: null, pageUrl: null, found: 0, kept: 0, past: 0, onCatalogue: 0, skipped: 0, sample: [], error: null,
  }
}

async function pool<T>(items: T[], workers: number, run: (item: T) => Promise<void>, stop: () => boolean): Promise<void> {
  let cursor = 0
  const next = async (): Promise<void> => {
    while (cursor < items.length) {
      if (stop()) return
      await run(items[cursor++])
    }
  }
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, next))
}

export async function syncVenues(mode: VenueSyncMode, venues: Venue[] = VENUES): Promise<VenueSyncReport> {
  resetFetchState()
  const startedAt = Date.now()
  const today = isoDay(new Date())
  const from  = addDays(-RETAIN_DAYS)
  const to    = addDays(FUTURE_DAYS)

  // Rotate the starting venue daily, so a run cut short by the deadline
  // misses different venues each night rather than the same tail forever.
  const day = Math.floor(Date.now() / 86_400_000)
  const offset = venues.length > 0 ? (day * 37) % venues.length : 0
  const order = venues.slice(offset).concat(venues.slice(0, offset))

  const results = new Map<string, VenueResult>()
  const rowsByVenue = new Map<string, VenueShowRow[]>()
  const outOfTime = () => Date.now() - startedAt > FETCH_DEADLINE_MS

  await pool(order, CONCURRENCY, async venue => {
    const result = emptyResult(venue, 'no-events')
    results.set(venue.id, result)
    try {
      const found = await discover(venue, from, to)
      if (!found) return
      result.status  = 'ok'
      result.method  = found.method
      result.pageUrl = found.pageUrl === venue.url ? null : found.pageUrl
      result.found   = found.events.length

      const rows: VenueShowRow[] = []
      const seen = new Set<string>()
      for (const event of found.events) {
        const bill = !event.cancelled && isMusic(event) && event.isoDate >= from && event.isoDate <= to
          ? billFor(event, venue.name)
          : null
        if (!bill) { result.skipped++; continue }
        const row = toRow(event, venue, bill.artist, bill.support)
        // The same show listed twice on one site (early and late listings,
        // a calendar page that repeats its featured events).
        if (seen.has(row.id)) { result.skipped++; continue }
        seen.add(row.id)
        rows.push(row)
      }
      rowsByVenue.set(venue.id, rows)
    } catch (err) {
      result.status = err instanceof VenueFailure ? err.status : 'error'
      result.error  = (err instanceof Error ? err.message : String(err)).slice(0, 160)
    }
  }, outOfTime)

  const deadlineHit = results.size < venues.length
  for (const venue of venues) {
    if (!results.has(venue.id)) results.set(venue.id, emptyResult(venue, 'not-reached'))
  }

  // ── Dedupe ────────────────────────────────────────────────────────────────
  // Against the catalogue first: a show Ticketmaster or a user already has
  // stays theirs, so it is logged under one id rather than split across two.
  // Then across venues: two sites listing the same night (a promoter's
  // calendar and the room's own) keep the first.
  const byVenue = new Map(venues.map(v => [v.id, v] as [string, Venue]))
  const venueIds = Array.from(rowsByVenue.keys())
  await pool(venueIds, 6, async id => {
    const venue = byVenue.get(id)!
    const rows = rowsByVenue.get(id)!
    if (rows.length === 0) return
    const dates = rows.map(r => r.show_date).sort()
    let existing: { artist: string; show_date: string }[] = []
    try {
      existing = await catalogueShowsAtVenue(venue.state, distinctiveWord(venue.name), dates[0], dates[dates.length - 1])
    } catch (err) {
      console.error(`[sync-venues] catalogue lookup for ${venue.name} failed:`, err instanceof Error ? err.message : err)
    }
    if (existing.length === 0) return
    const kept = rows.filter(row => !existing.some(e => e.show_date === row.show_date && sameArtist(e.artist, row.artist)))
    results.get(id)!.onCatalogue += rows.length - kept.length
    rowsByVenue.set(id, kept)
  }, () => false)

  const claimed = new Set<string>()
  const allRows: VenueShowRow[] = []
  for (const venue of venues) {
    const rows = rowsByVenue.get(venue.id) ?? []
    const result = results.get(venue.id)!
    for (const row of rows) {
      const key = `${row.show_date}|${row.state}|${nameKey(row.artist).replace(/^the /, '')}`
      if (claimed.has(key)) { result.skipped++; continue }
      claimed.add(key)
      allRows.push(row)
      result.kept++
      if (row.show_date < today) result.past++
      if (result.sample.length < SAMPLE_SIZE) result.sample.push(`${row.artist} · ${row.show_date}`)
    }
  }

  // ── Write ─────────────────────────────────────────────────────────────────
  let written = 0
  if (mode === 'live' && allRows.length > 0) {
    const { upserted } = await upsertVenueShows(allRows)
    written = upserted
  }

  const list = venues.map(v => results.get(v.id)!)
  const count = (...statuses: VenueStatus[]) => list.filter(r => statuses.indexOf(r.status) >= 0).length
  const report: VenueSyncReport = {
    ranAt: new Date().toISOString(),
    mode,
    durationMs: Date.now() - startedAt,
    deadlineHit,
    totals: {
      venues:      list.length,
      ok:          count('ok'),
      noEvents:    count('no-events'),
      failed:      count('blocked', 'robots', 'error'),
      notReached:  count('not-reached'),
      shows:       allRows.length,
      past:        allRows.filter(r => r.show_date < today).length,
      onCatalogue: list.reduce((n, r) => n + r.onCatalogue, 0),
      written,
    },
    venues: list,
  }
  return report
}
