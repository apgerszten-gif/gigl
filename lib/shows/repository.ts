// Read/write access to the `shows` catalogue table (see supabase-schema.sql).
//
// Reads go through the anon-key client: `shows` is public-read by policy, and
// using the service-role client for a public read would mean the search path
// stops working the moment SUPABASE_SERVICE_ROLE_KEY isn't configured, for no
// benefit. Writes go through supabaseAdmin() because the table has no insert
// or update policy at all - only the service role can write here.

import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabaseAdmin'
import { formatShowDate } from '../dates'
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
}

const SHOW_COLUMNS = 'id, artist, support, venue, city, state, show_date, emoji, image_url'

// Ticketmaster's own browse list returned 20; keeping the same ceiling so the
// results list doesn't suddenly grow a scroll region it was never designed for.
const DEFAULT_LIMIT = 20

function toShow(row: ShowRow): Show {
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
  }
}

// PostgREST's .or() takes a comma-separated filter string, so a raw comma or
// parenthesis in user input would be read as filter syntax rather than as
// text to match. Strip those, and the LIKE wildcards, before interpolating.
function escapeForOrFilter(input: string): string {
  return input.replace(/[,()\\%_]/g, ' ').trim()
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// Blank keyword -> browse mode: the soonest upcoming shows, which is what the
// page renders before anything is typed.
export async function searchStoredShows(keyword: string, limit = DEFAULT_LIMIT): Promise<Show[]> {
  let query = supabase
    .from('shows')
    .select(SHOW_COLUMNS)
    // Past shows are pruned nightly, but a row can still go stale during the
    // day, so filter here too rather than trusting the sync's timing.
    .gte('show_date', todayIso())
    .order('show_date', { ascending: true })
    .limit(limit)

  const trimmed = escapeForOrFilter(keyword)
  if (trimmed) {
    // Matches artist or venue - "bowery ballroom" is as plausible a search as
    // an artist name, and the trigram indexes cover both columns.
    query = query.or(`artist.ilike.%${trimmed}%,venue.ilike.%${trimmed}%`)
  }

  const { data, error } = await query
  if (error) throw new Error(`shows search failed: ${error.message}`)

  return (data ?? []).map(toShow)
}

// Whether the catalogue has been populated at all. Used only to decide
// whether to fall back to a live Ticketmaster call - see the search route.
export async function storedShowCount(): Promise<number> {
  const { count, error } = await supabase
    .from('shows')
    .select('id', { count: 'exact', head: true })
    .gte('show_date', todayIso())

  if (error) throw new Error(`shows count failed: ${error.message}`)
  return count ?? 0
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

// Drops shows whose date has passed. Only past-dated rows - see the pruning
// rationale in supabase-schema.sql for why a future show that stopped
// appearing upstream is deliberately left alone.
export async function prunePastShows(): Promise<number> {
  const { data, error } = await supabaseAdmin()
    .from('shows')
    .delete()
    .lt('show_date', todayIso())
    .select('id')

  if (error) throw new Error(`shows prune failed: ${error.message}`)
  return data?.length ?? 0
}
