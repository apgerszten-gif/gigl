// Read/write access to the `shows` catalogue table (see supabase-schema.sql).
//
// Reads go through the anon-key client: `shows` is public-read by policy, and
// using the service-role client for a public read would mean the search path
// stops working the moment SUPABASE_SERVICE_ROLE_KEY isn't configured, for no
// benefit. Writes go through supabaseAdmin() because the table has no insert
// or update policy at all - only the service role can write here.

import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabaseAdmin'
import { formatShowDate, windowEndIso, windowStartIso } from '../dates'
import { nameKey } from '../nameKey'
import { boundingBox, distanceInMiles, type Coords } from '../geo'
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
export async function searchStoredShows(keyword: string, options: SearchOptions = {}): Promise<Show[]> {
  const { limit = DEFAULT_LIMIT, nearby } = options

  let query = supabase
    .from('shows')
    .select(SHOW_COLUMNS)
    // Rows outside the window are pruned nightly, but a row can fall out of it
    // during the day, so filter here too rather than trusting the sync's
    // timing. The upper bound matters as much as the lower one now: a show
    // that hasn't happened yet is not something anyone can have been to.
    .gte('show_date', windowStartIso())
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

  const trimmed = escapeForOrFilter(keyword)
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

// Drops shows that have fallen out the back of the catalogue window - only
// those, and this is the load-bearing part of the whole feature.
//
// A show is deleted PAST_WINDOW_DAYS after it happened, not the morning
// after. Ticketmaster has no past events (see the sync note in
// lib/ticketmaster.ts), so these rows are the *only* record that the show
// existed: once one is deleted nothing can fetch it back, and the past-week
// list would be empty of it for good. The old cutoff was `< today`, which
// threw away precisely the week that search now serves.
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
    .lt('show_date', windowStartIso())
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
