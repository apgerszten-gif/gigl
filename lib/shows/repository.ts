// Read/write access to the `shows` catalogue table (see supabase-schema.sql).
//
// Reads go through the anon-key client: `shows` is public-read by policy, and
// using the service-role client for a public read would mean the search path
// stops working the moment SUPABASE_SERVICE_ROLE_KEY isn't configured, for no
// benefit. Writes go through supabaseAdmin() because the table has no insert
// or update policy at all - only the service role can write here.

import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabaseAdmin'
import { formatShowDate, retainStartIso, upcomingEndIso, windowEndIso, windowStartIso } from '../dates'
import { nameKey } from '../nameKey'
import { boundingBox, distanceInMiles, type Coords, type NamedPlace } from '../geo'
import { SYNC_CITIES } from './cities'
import type { Show, SyncShow } from '../ticketmaster'

// Matches the `shows` table's columns; the API layer maps this to the `Show`
// shape the client already consumes, so switching search from Ticketmaster to
// Postgres changed nothing above /api/shows/search.
interface ShowRow {
  id:        string
  artist:    string
  support:   string[] | null
  venue:     string
  city:      string
  state:     string
  show_date: string | null
  emoji:     string
  image_url: string | null
  // Null on any row Ticketmaster gave no venue coordinates for and whose
  // sync city couldn't supply a centroid either. Such a row can't be placed,
  // so it never appears in a nearby search - see searchStoredShows.
  lat:       number | null
  lng:       number | null
}

const SHOW_COLUMNS = 'id, artist, support, venue, city, state, show_date, emoji, image_url, lat, lng'

// Ticketmaster's own browse list returned 20; keeping the same ceiling so the
// results list doesn't suddenly grow a scroll region it was never designed for.
const DEFAULT_LIMIT = 20

function toShow(row: ShowRow, from?: Coords): Show {
  const distanceMiles = from && row.lat != null && row.lng != null
    ? distanceInMiles(from, { lat: row.lat, lng: row.lng })
    : undefined

  return {
    id:      row.id,
    artist:  row.artist,
    support: row.support && row.support.length > 0 ? row.support : undefined,
    venue:   row.venue,
    city:    row.city,
    state:   row.state,
    date:    formatShowDate(row.show_date ?? undefined),
    isoDate: row.show_date,
    emoji:   row.emoji,
    imageUrl: row.image_url,
    distanceMiles,
  }
}

// PostgREST's .or() takes a comma-separated filter string, so a raw comma or
// parenthesis in user input would be read as filter syntax rather than as
// text to match. Strip those, and the LIKE wildcards, before interpolating.
function escapeForOrFilter(input: string): string {
  return input.replace(/[,()\\%_]/g, ' ').trim()
}

export interface NearbyFilter {
  centre:      Coords
  radiusMiles: number
}

// The bounding box is a square around a circle, so up to ~21% of what the
// database returns gets trimmed by the exact distance check below. Ask for
// several pages' worth so a full list survives that, and so a dense metro
// doesn't come back short.
const NEARBY_OVERFETCH = 4

export interface SearchOptions {
  limit?:  number
  // When set, only shows within `radiusMiles` of `centre` come back, each
  // carrying its `distanceMiles`. Rows with no coordinates are excluded
  // rather than guessed at.
  nearby?: NearbyFilter | null
}

// Blank keyword -> browse mode: the past week's shows, most recent first,
// which is what the page renders before anything is typed. Ordering is by
// date either way, including with a nearby filter: "what happened around me"
// reads as a date list that happens to be local, not as a proximity ranking
// that jumps between last night and last Tuesday.
//
// Newest first, unlike the old upcoming list's ascending order: the show
// someone is most likely to be logging is the one they went to last night,
// so it belongs at the top rather than seven days down.
//
// A search reaches back further than browsing: as far as the catalogue keeps
// shows (RETAIN_DAYS), because someone typing a name is looking for one
// particular show, however long ago. Browsing stays on the past week, where
// "what happened around here recently" is still the right reading.
export async function searchStoredShows(keyword: string, options: SearchOptions = {}): Promise<Show[]> {
  const { limit = DEFAULT_LIMIT, nearby } = options
  const trimmed = escapeForOrFilter(keyword)

  let query = supabase
    .from('shows')
    .select(SHOW_COLUMNS)
    // The upper bound matters as much as the lower one: a show that hasn't
    // happened yet is not something anyone can have been to.
    .gte('show_date', trimmed ? retainStartIso() : windowStartIso())
    .lte('show_date', windowEndIso())
    .order('show_date', { ascending: false })
    .limit(nearby ? limit * NEARBY_OVERFETCH : limit)

  if (nearby) {
    // A box on two indexed columns, not PostGIS: see lib/geo.ts. These
    // comparisons are never true for a NULL, which is exactly the wanted
    // behaviour for a row with no coordinates.
    //
    // No antimeridian wraparound: a box spanning +/-180 would need to be
    // split into two, and SYNC_CITIES is US and Canada only. Revisit if
    // coverage ever crosses the Pacific.
    const box = boundingBox(nearby.centre, nearby.radiusMiles)
    query = query
      .gte('lat', box.minLat).lte('lat', box.maxLat)
      .gte('lng', box.minLng).lte('lng', box.maxLng)
  }

  if (trimmed) {
    // Matches artist or venue - "bowery ballroom" is as plausible a search as
    // an artist name, and the trigram indexes cover both columns.
    query = query.or(`artist.ilike.%${trimmed}%,venue.ilike.%${trimmed}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(`shows search failed: ${error.message}`)

  const rows = (data ?? []).map(row => toShow(row, nearby?.centre))
  if (!nearby) return rows

  return rows
    .filter(show => show.distanceMiles != null && show.distanceMiles <= nearby.radiusMiles)
    .slice(0, limit)
}

export interface UpcomingPage {
  shows: Show[]
  // Pass back as `offset` for the next page; null when there's nothing left.
  next:  number | null
}

// One page of shows that haven't happened yet, soonest first, for saving.
//
// `offset` counts database rows, not shows returned: a nearby search trims the
// bounding box's corners after the read, so the two drift apart, and paging by
// shows returned would skip or repeat rows. `next` is therefore the row after
// the last one this page used. Ordered by id as well as date because hundreds
// of shows can share a date, and without a fixed order among them a row could
// land on two pages or none.
export async function upcomingShows(
  keyword: string,
  options: { limit: number; offset?: number; nearby?: NearbyFilter | null },
): Promise<UpcomingPage> {
  const { limit, offset = 0, nearby } = options
  const trimmed = escapeForOrFilter(keyword)
  const rowsToRead = nearby ? limit * NEARBY_OVERFETCH : limit

  let query = supabase
    .from('shows')
    .select(SHOW_COLUMNS)
    // Today counts: tonight's show is both loggable and still worth saving.
    .gte('show_date', windowEndIso())
    .lte('show_date', upcomingEndIso())
    .order('show_date', { ascending: true })
    .order('id', { ascending: true })
    .range(offset, offset + rowsToRead - 1)

  if (nearby) {
    const box = boundingBox(nearby.centre, nearby.radiusMiles)
    query = query
      .gte('lat', box.minLat).lte('lat', box.maxLat)
      .gte('lng', box.minLng).lte('lng', box.maxLng)
  }
  if (trimmed) query = query.or(`artist.ilike.%${trimmed}%,venue.ilike.%${trimmed}%`)

  const { data, error } = await query
  if (error) throw new Error(`upcoming shows failed: ${error.message}`)
  const rows = data ?? []

  const shows: Show[] = []
  let used = 0
  for (const row of rows) {
    if (shows.length === limit) break
    used += 1
    const show = toShow(row, nearby?.centre)
    if (nearby && (show.distanceMiles == null || show.distanceMiles > nearby.radiusMiles)) continue
    shows.push(show)
  }

  // A read that came back short has reached the end. One that came back full
  // may have more beyond it, even if this page used every row it was given.
  const more = used < rows.length || rows.length === rowsToRead
  return { shows, next: more ? offset + used : null }
}

// -- Global search, and the artist and venue pages --------------------------
// The Feed's search bar (/api/search) names artists and venues as well as
// shows, and each of those opens a page of everything the catalogue has for
// it, past and upcoming (/artists, /venues).

// How far a row has to be from today to belong on those pages: everything the
// catalogue keeps behind it, everything the Upcoming list reaches ahead.
function pageWindow<T extends { gte: (c: string, v: string) => T; lte: (c: string, v: string) => T }>(query: T): T {
  return query.gte('show_date', retainStartIso()).lte('show_date', upcomingEndIso())
}

// For an exact, case-insensitive match through ILIKE: the pattern's own
// wildcards are escaped so "Sunn O)))" or "100%" match only themselves.
function exactPattern(input: string): string {
  return input.trim().replace(/[\\%_]/g, ch => `\\${ch}`)
}

// How well a name answers what was typed: the whole name, then its start,
// then the start of any word in it, then anywhere. Lower is better.
function matchRank(name: string, typed: string): number {
  const n = nameKey(name)
  const t = nameKey(typed)
  if (n === t) return 0
  if (n.startsWith(t) || n.replace(/^the /, '').startsWith(t)) return 1
  if (n.split(/[^a-z0-9]+/).some(word => word.startsWith(t))) return 2
  return 3
}

// Supabase answers at most 1,000 rows a request, and PostgREST has no
// DISTINCT, so artists and venues are counted from a sample. A broad term
// ("the") can crowd a sample; a name anyone is actually looking for can't.
const NAME_SAMPLE_ROWS = 1000

export interface ArtistMatch {
  name:     string
  // Distinct shows across the catalogue and Gigl's own logs.
  shows:    number
  imageUrl: string | null
}

// Artists whose name contains `keyword`, best match first. The catalogue only
// reaches back a year, and setlist.fm shows and festival sets are never stored
// in it, so artists people have logged are searched as well - otherwise
// someone who's only on Gigl through a setlist.fm log could never be found.
export async function searchArtists(keyword: string, limit: number): Promise<ArtistMatch[]> {
  const trimmed = escapeForOrFilter(keyword)
  if (trimmed.length < 2) return []

  const [catalogue, logged] = await Promise.all([
    pageWindow(supabase.from('shows').select('id, artist, image_url').ilike('artist', `%${trimmed}%`)).limit(NAME_SAMPLE_ROWS),
    supabase.from('logged_shows').select('artist_id, artist_name').ilike('artist_name', `%${trimmed}%`).limit(NAME_SAMPLE_ROWS),
  ])
  if (catalogue.error) throw new Error(`artist search failed: ${catalogue.error.message}`)
  if (logged.error) console.error('artist search (logs) failed:', logged.error.message)

  const found = new Map<string, { name: string; ids: Set<string>; imageUrl: string | null }>()
  const add = (name: string, id: string, imageUrl: string | null) => {
    const key = nameKey(name)
    if (!key) return
    const artist = found.get(key) ?? { name, ids: new Set<string>(), imageUrl: null }
    artist.ids.add(id)
    artist.imageUrl ??= imageUrl
    found.set(key, artist)
  }
  for (const row of catalogue.data ?? []) add(row.artist, row.id, row.image_url)
  for (const row of logged.data ?? []) add(row.artist_name, row.artist_id, null)

  return Array.from(found.values())
    .map(artist => ({ name: artist.name, shows: artist.ids.size, imageUrl: artist.imageUrl, rank: matchRank(artist.name, keyword) }))
    .sort((a, b) => a.rank - b.rank || b.shows - a.shows || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ rank: _rank, ...artist }) => artist)
}

export interface VenueMatch {
  name:  string
  city:  string
  state: string
  shows: number
}

// Venues whose name contains `keyword`, best match first. A venue is its name
// *and* its city: there are Fillmores in nine cities, and each is its own room.
export async function searchVenues(keyword: string, limit: number): Promise<VenueMatch[]> {
  const trimmed = escapeForOrFilter(keyword)
  if (trimmed.length < 2) return []

  const { data, error } = await pageWindow(
    supabase.from('shows').select('venue, city, state').ilike('venue', `%${trimmed}%`),
  ).limit(NAME_SAMPLE_ROWS)
  if (error) throw new Error(`venue search failed: ${error.message}`)

  const found = new Map<string, VenueMatch>()
  for (const row of data ?? []) {
    const key = `${nameKey(row.venue)}|${nameKey(row.city)}|${row.state}`
    const venue = found.get(key) ?? { name: row.venue, city: row.city, state: row.state, shows: 0 }
    venue.shows += 1
    found.set(key, venue)
  }

  return Array.from(found.values())
    .map(venue => ({ ...venue, rank: matchRank(venue.name, keyword) }))
    .sort((a, b) => a.rank - b.rank || b.shows - a.shows || a.name.length - b.name.length)
    .slice(0, limit)
    .map(({ rank: _rank, ...venue }) => venue)
}

// Every show the catalogue has for one artist, soonest first: headlining, and
// on the bill as support. The name match is exact (ignoring case), because
// "Turnstile" and "Turnstile Tribute Band" are different pages.
export async function showsByArtist(name: string): Promise<Show[]> {
  const exact = exactPattern(name)
  if (!exact) return []

  // `support` is matched as an array literal, which a comma, brace or quote
  // in the name would break apart ("Tyler, the Creator" would become two
  // names), so those names only match as headliners.
  const supportable = !/[,{}"\\]/.test(name)

  const [headlining, supporting] = await Promise.all([
    pageWindow(supabase.from('shows').select(SHOW_COLUMNS).ilike('artist', exact))
      .order('show_date', { ascending: true }).order('id', { ascending: true }).limit(NAME_SAMPLE_ROWS),
    supportable
      ? pageWindow(supabase.from('shows').select(SHOW_COLUMNS).contains('support', [name.trim()])).limit(200)
      : Promise.resolve({ data: [] as ShowRow[], error: null }),
  ])
  if (headlining.error) throw new Error(`artist shows failed: ${headlining.error.message}`)
  if (supporting.error) console.error('artist shows (support) failed:', supporting.error.message)

  const byId = new Map<string, ShowRow>()
  for (const row of [...(headlining.data ?? []), ...(supporting.data ?? [])]) byId.set(row.id, row)
  return Array.from(byId.values())
    .sort((a, b) => (a.show_date ?? '').localeCompare(b.show_date ?? ''))
    .map(row => toShow(row))
}

// Every show the catalogue has at one venue, soonest first. `city` and
// `state` narrow it to one room when the name is shared; without them every
// venue of that name is included.
export async function showsAtVenue(venue: string, city?: string | null, state?: string | null): Promise<Show[]> {
  const exact = exactPattern(venue)
  if (!exact) return []

  let query = pageWindow(supabase.from('shows').select(SHOW_COLUMNS).ilike('venue', exact))
  if (city) query = query.ilike('city', exactPattern(city))
  if (state) query = query.eq('state', state)

  // A busy room over two years (one behind, one ahead) is a few hundred
  // shows, well inside one request.
  const { data, error } = await query
    .order('show_date', { ascending: true }).order('id', { ascending: true }).limit(NAME_SAMPLE_ROWS)
  if (error) throw new Error(`venue shows failed: ${error.message}`)
  return (data ?? []).map(row => toShow(row))
}

const CITY_MATCH_LIMIT = 6

// One read is plenty to tell which cities a prefix can mean, and Supabase
// answers at most 1,000 rows a request anyway. SYNC_CITIES covers whatever
// the cap crowds out, so "san" always offers every big San.
const CITY_SAMPLE_ROWS = 1000

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.floor(sorted.length / 2)]
}

// The places a typed city could mean, busiest first. There's no geocoder
// behind this: the catalogue already knows where its shows are, and a town
// with no shows has nothing to search anyway. SYNC_CITIES supplies the
// measured coordinates for the big metros; anywhere else gets the median of
// its own rows, which one badly placed venue can't drag out of town.
//
// "Portland, OR" narrows by state. "Portland, Oregon" doesn't try to, because
// `state` holds codes, so it offers every Portland to choose from.
export async function findCities(input: string): Promise<NamedPlace[]> {
  const [namePart, statePart = ''] = input.split(',').map(part => part.trim())
  const name = namePart.replace(/[%_\\]/g, '')
  if (name.length < 2) return []
  const state = statePart.length <= 2 ? statePart.toUpperCase().replace(/[%_\\]/g, '') : ''

  let query = supabase
    .from('shows')
    .select('city, state, lat, lng')
    .ilike('city', `${name}%`)
    .not('lat', 'is', null)
    .not('lng', 'is', null)
    .limit(CITY_SAMPLE_ROWS)
  if (state) query = query.ilike('state', `${state}%`)

  const { data, error } = await query
  if (error) throw new Error(`city lookup failed: ${error.message}`)

  const keyOf = (city: string, region: string) => `${city.toLowerCase()}|${region.toUpperCase()}`
  const found = new Map<string, { city: string; state: string; lats: number[]; lngs: number[] }>()
  for (const row of (data ?? []) as { city: string; state: string; lat: number; lng: number }[]) {
    const key = keyOf(row.city, row.state)
    const place = found.get(key) ?? { city: row.city, state: row.state, lats: [], lngs: [] }
    place.lats.push(row.lat)
    place.lngs.push(row.lng)
    found.set(key, place)
  }

  const metros = new Map(SYNC_CITIES.map(metro => [keyOf(metro.city, metro.stateCode), metro]))
  const places = Array.from(found.entries()).map(([key, place]) => {
    const metro = metros.get(key)
    return {
      city:  metro?.city ?? place.city,
      state: metro?.stateCode ?? place.state,
      lat:   metro?.lat ?? median(place.lats),
      lng:   metro?.lng ?? median(place.lngs),
      shows: place.lats.length,
    }
  })

  const lowerName = name.toLowerCase()
  for (const metro of SYNC_CITIES) {
    if (!metro.city.toLowerCase().startsWith(lowerName)) continue
    if (state && !metro.stateCode.startsWith(state)) continue
    if (found.has(keyOf(metro.city, metro.stateCode))) continue
    places.push({ city: metro.city, state: metro.stateCode, lat: metro.lat, lng: metro.lng, shows: 0 })
  }

  return places
    .sort((a, b) => b.shows - a.shows)
    .slice(0, CITY_MATCH_LIMIT)
    .map(({ city, state: region, lat, lng }) => ({ city, state: region, lat, lng }))
}

// Every set from one imported festival lineup, whichever day it falls on.
//
// Deliberately *not* windowed the way searchStoredShows is. That filter
// exists so nobody is offered a show they cannot have been to yet, and it is
// right for a search over the whole catalogue. A festival page is the other
// case: on the Saturday of a two-day weekend the Sunday sets still belong on
// screen, or the lineup looks half-missing. A festival page should show
// those sets locked instead, so the same rule is enforced, just visibly
// rather than by omission.
//
// `idPrefix` reaches a LIKE pattern, so callers must pass a known constant
// rather than anything a visitor typed. /api/shows/festival whitelists it.
export async function festivalShows(idPrefix: string): Promise<Show[]> {
  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_COLUMNS)
    .like('id', `${idPrefix}%`)
    .order('show_date', { ascending: true })
    .order('artist', { ascending: true })
    // A lineup is tens of rows, not thousands; the cap is a guard, not paging.
    .limit(500)

  if (error) throw new Error(`festival lineup failed: ${error.message}`)
  return (data ?? []).map(row => toShow(row))
}

// Supabase rejects very large payloads, and a 50-city sync can produce well
// over 10k rows, so upserts go up in batches rather than one request.
const UPSERT_BATCH_SIZE = 500

export interface UpsertResult {
  upserted: number
  failed:   number
}

export async function upsertShows(shows: SyncShow[]): Promise<UpsertResult> {
  if (shows.length === 0) return { upserted: 0, failed: 0 }

  const now = new Date().toISOString()
  const rows = shows.map(s => ({
    id:           s.id,
    source:       'ticketmaster',
    artist:       s.artist,
    support:      s.support ?? null,
    venue:        s.venue,
    city:         s.city,
    state:        s.state,
    show_date:    s.isoDate,
    lat:          s.lat,
    lng:          s.lng,
    emoji:        s.emoji,
    metro:        s.metro,
    image_url:    s.imageUrl,
    last_seen_at: now,
  }))

  let upserted = 0
  let failed   = 0

  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await supabaseAdmin()
      .from('shows')
      .upsert(batch, { onConflict: 'id' })

    // A failed batch is logged and skipped rather than aborting the run: a
    // partial catalogue refresh beats none, and the next night's sync will
    // pick up whatever this batch missed.
    if (error) {
      console.error(`[sync-shows] upsert batch ${i / UPSERT_BATCH_SIZE} failed:`, error.message)
      failed += batch.length
    } else {
      upserted += batch.length
    }
  }

  return { upserted, failed }
}

// -- Venue-website shows -----------------------------------------------------
// Rows the venue sync (app/api/cron/sync-venues) reads off venues' own sites.
// source = 'venue', and the id carries the venue: venue-<venue id>-<date>-<act>,
// so a re-run updates the same row rather than adding another.

export interface VenueShowRow {
  id:        string
  artist:    string
  support:   string[] | null
  venue:     string
  city:      string
  state:     string
  show_date: string
  lat:       number | null
  lng:       number | null
  metro:     string
  image_url: string | null
}

export async function upsertVenueShows(rows: VenueShowRow[]): Promise<UpsertResult> {
  const now = new Date().toISOString()
  let upserted = 0
  let failed   = 0

  for (let i = 0; i < rows.length; i += UPSERT_BATCH_SIZE) {
    const batch = rows.slice(i, i + UPSERT_BATCH_SIZE).map(row => ({
      ...row,
      source:       'venue',
      emoji:        '🎵',
      last_seen_at: now,
    }))
    const { error } = await supabaseAdmin().from('shows').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`[sync-venues] upsert batch ${i / UPSERT_BATCH_SIZE} failed:`, error.message)
      failed += batch.length
    } else {
      upserted += batch.length
    }
  }
  return { upserted, failed }
}

// Shows the catalogue already has at one venue, from any source but the
// venue sync itself, so the sync can leave out the ones Ticketmaster or a
// user got to first. Matched on one distinctive word of the venue's name
// ("Mercury" for Mercury Lounge) because the two sources rarely spell a room
// the same way; the artist and date comparison afterwards is what decides.
export async function catalogueShowsAtVenue(
  state: string, venueWord: string, fromIso: string, toIso: string,
): Promise<{ artist: string; show_date: string }[]> {
  const word = venueWord.replace(/[%_\\]/g, '')
  if (!word) return []
  const { data, error } = await supabase
    .from('shows')
    .select('artist, show_date')
    .eq('state', state)
    .neq('source', 'venue')
    .ilike('venue', `%${word}%`)
    .gte('show_date', fromIso)
    .lte('show_date', toIso)
    // Supabase answers at most 1,000 rows a request; one room over two and a
    // half years stays well under that.
    .limit(1000)
  if (error) throw new Error(`catalogue lookup failed: ${error.message}`)
  return (data ?? []) as { artist: string; show_date: string }[]
}

// Drops shows more than a year old - only those, and this is the
// load-bearing part of the whole feature.
//
// A show is deleted RETAIN_DAYS after it happened: well after it leaves the
// search window, never the morning after. Ticketmaster has no past events
// (see the sync note in lib/ticketmaster.ts), so these rows are the *only*
// record that the show existed: once one is deleted nothing can fetch it
// back. The old cutoffs were `< today`, which threw away the week search
// served, and then the search window itself, which threw away the history
// people come back to look up.
//
// Future-dated rows are still never deleted, for two reasons that now stack.
// The original one: an event missing from one night's API results is at
// least as likely to be a partial upstream failure as a real cancellation,
// and dropping a valid show is worse than briefly keeping a cancelled one.
// The new one: a future-dated row is the catalogue's advance capture of a
// show that will enter the past week in a few days' time. Deleting it would
// mean the show is never logged by anyone.
//
// Rows with a null show_date are matched by neither this nor the search
// filter, so they linger while staying invisible. Ticketmaster rarely omits
// a date; worth its own sweep if user-submitted rows ever land without one.
export async function prunePastShows(): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from('shows')
    .delete({ count: 'exact' })
    .lt('show_date', retainStartIso())
    // Never a user submission. A Ticketmaster row can always be re-fetched
    // while it is still upcoming; a row somebody typed in by hand cannot be
    // recovered from anywhere, and it is very likely the only record of a gig
    // no aggregator carries. Keeping them is the entire point of having them.
    .neq('source', 'user')

  if (error) throw new Error(`shows prune failed: ${error.message}`)
  return count ?? 0
}

// -- User-submitted shows ----------------------------------------------------
// "Can't find your show? Add it yourself." The aggregators miss house shows,
// local bills and DIY spaces entirely, and no amount of extra API coverage
// reaches them - the person who was there is the only available source.

// Distinct values already in the catalogue, for the suggestion lists on the
// add-a-show form. Its job is spelling, not discovery: a show typed in under
// a name nobody else will reproduce is invisible to everyone who spells it
// correctly later, and offering the existing spelling is the cheapest moment
// to prevent that.
//
// Read through the anon client - this is public data, and the form has to
// keep working whether or not the service role key is configured.
export type SuggestField = 'artist' | 'venue' | 'city'

// Whitelisted rather than interpolated: the value picks a column name, and a
// column name cannot be parameterised.
const SUGGEST_COLUMNS: Record<SuggestField, string> = {
  artist: 'artist',
  venue:  'venue',
  city:   'city, state',
}

export async function suggestValues(field: SuggestField, keyword: string, limit = 8): Promise<string[]> {
  const trimmed = escapeForOrFilter(keyword)
  if (trimmed.length < 2) return []

  // Cities are stored split but typed whole ("San Francisco, CA"), so the
  // match runs against the city alone and the state is re-attached below.
  const matchColumn = field === 'city' ? 'city' : field

  // Over-fetched because one artist or venue appears on many rows and the
  // distinct-ing happens here - PostgREST has no DISTINCT.
  const { data, error } = await supabase
    .from('shows')
    .select(SUGGEST_COLUMNS[field])
    .ilike(matchColumn, `%${trimmed}%`)
    .limit(limit * 25)

  if (error) throw new Error(`${field} suggestions failed: ${error.message}`)

  const seen = new Map<string, string>()
  // Cast through unknown: the select list is chosen at runtime, so
  // supabase-js can't infer the row shape and widens it to its error type.
  for (const row of (data ?? []) as unknown as Record<string, string | null>[]) {
    const value = field === 'city'
      ? [row.city, row.state].filter(Boolean).join(', ')
      : row[field]
    if (!value) continue
    const key = nameKey(value)
    if (!seen.has(key)) seen.set(key, value)
  }

  // Shortest first: "Turnstile" should beat "Turnstile and Friends" when both
  // match, since the bare name is what someone typing it usually means.
  return Array.from(seen.values()).sort((a, b) => a.length - b.length).slice(0, limit)
}

// Every show already on a given date, for duplicate detection at submit time.
// The date is exact where names are not, so it is the cheap way to narrow
// before comparing artist and venue in JS.
export async function showsOnDate(isoDate: string): Promise<Show[]> {
  const { data, error } = await supabase
    .from('shows')
    .select(SHOW_COLUMNS)
    .eq('show_date', isoDate)
    .limit(500)

  if (error) throw new Error(`shows-on-date lookup failed: ${error.message}`)
  return (data ?? []).map(row => toShow(row))
}

export interface UserShowInput {
  artist:  string
  venue:   string
  city:    string
  state:   string
  isoDate: string
  userId:  string
}

// Inserted through the service role, like every other write to this table.
// `shows` has no client write grants at all, so a submission cannot skip the
// checks in /api/shows/submit by talking to PostgREST directly.
//
// The id carries its origin the way 'tm-' does, so a user row stays legible
// as one wherever an id turns up later.
export async function insertUserShow(input: UserShowInput): Promise<Show> {
  const row = {
    id:           `user-${crypto.randomUUID()}`,
    source:       'user',
    artist:       input.artist,
    venue:        input.venue,
    city:         input.city,
    state:        input.state,
    show_date:    input.isoDate,
    emoji:        '🎵',
    // No coordinates: nothing here has been geocoded, and inventing a point
    // would put the show into nearby searches it has no business being in.
    // A null lat/lng already drops it from those - see lib/geo.ts.
    lat:          null,
    lng:          null,
    metro:        null,
    image_url:    null,
    submitted_by: input.userId,
    last_seen_at: new Date().toISOString(),
  }

  const { data, error } = await supabaseAdmin()
    .from('shows')
    .insert(row)
    .select(SHOW_COLUMNS)
    .single()

  if (error) throw new Error(`user show insert failed: ${error.message}`)
  return toShow(data as ShowRow)
}
