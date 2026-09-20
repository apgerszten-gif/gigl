import { NextRequest, NextResponse } from 'next/server'
import { searchStoredShows, type NearbyFilter } from '@/lib/shows/repository'

// GET /api/shows/search?q=turnstile — searches the `shows` catalogue table,
// which the nightly job at /api/cron/sync-shows keeps populated. `q` blank or
// omitted returns the most recent shows (the page's initial browse list).
//
// Everything this route can return already happened: the catalogue only
// covers the past week (PAST_WINDOW_DAYS in lib/dates.ts). Gigl logs shows
// you went to, so an on-sale listing is not a thing anyone can rate, and
// showing one just buries the show they came here to log.
//
// Optional `lat`, `lng` and `radius` (miles) narrow that to shows near a
// point, each result carrying its `distanceMiles`. The browser supplies the
// coordinates from the Near me control on /select-festival; they're read
// per-request and never stored.
//
// This used to proxy Ticketmaster on every request, which made each visitor
// cost an upstream call against a 5000/day cap. Reading Postgres makes that a
// fixed nightly cost instead, and lets search be fuzzy across artist *and*
// venue rather than whatever Ticketmaster's relevance sort returns.
//
// There is no live-Ticketmaster fallback any more. It used to cover a cold
// catalogue, but Discovery only indexes upcoming events, so the one thing it
// could return is the one thing this route must not: shows that haven't
// happened. An empty table now answers empty, and the page says so.

// Next 14 puts any fetch without explicit cache options into the Data Cache
// with no expiry, and that includes supabase-js's requests. Without this the
// catalogue reads froze on whatever they first returned - an empty table
// before the first sync - and never noticed the table filling up.
export const fetchCache = 'default-no-store'

// A radius the client didn't send, or sent as nonsense. The ceiling exists so
// a hand-typed `radius=100000` can't turn the bounding box into a table scan.
const DEFAULT_RADIUS_MILES = 50
const MAX_RADIUS_MILES     = 500

// Returns null unless there is a complete, in-range coordinate pair: a
// half-supplied or malformed location is treated as no location at all
// rather than as a point off the coast of Africa.
function readNearby(params: URLSearchParams): NearbyFilter | null {
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  if (!params.has('lat') || !params.has('lng')) return null
  if (!Number.isFinite(lat) || Math.abs(lat) > 90)  return null
  if (!Number.isFinite(lng) || Math.abs(lng) > 180) return null

  const requested = Number(params.get('radius'))
  const radiusMiles = Number.isFinite(requested) && requested > 0
    ? Math.min(requested, MAX_RADIUS_MILES)
    : DEFAULT_RADIUS_MILES

  return { centre: { lat, lng }, radiusMiles }
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const nearby = readNearby(req.nextUrl.searchParams)

  try {
    // An empty result is returned as-is, whether it means "no matches" or
    // "the catalogue hasn't captured a week yet". Nothing upstream can fill
    // that gap, so there is nothing to fall back to.
    const shows = await searchStoredShows(q, { nearby })
    return NextResponse.json({ shows })
  } catch (err) {
    console.error('shows/search failed:', err)
    return NextResponse.json({ error: 'Show search is temporarily unavailable.' }, { status: 502 })
  }
}
