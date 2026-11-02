import { NextRequest, NextResponse } from 'next/server'
import { searchStoredShows, upcomingShows } from '@/lib/shows/repository'
import { readNearby } from '@/lib/shows/nearby'
import { artistPhotos } from '@/lib/shows/artistImageSync'

// Shows per page of the Upcoming list.
const UPCOMING_LIMIT = 50

// Ticketmaster photo lookups per request for rows with none (see below).
// Fewer than /api/shows/past allows: this is the list people wait on.
const PHOTO_LOOKUPS = 2

// GET /api/shows/search?q=turnstile — searches the `shows` catalogue table,
// which the nightly job at /api/cron/sync-shows keeps populated. `q` blank or
// omitted returns the most recent shows (the page's initial browse list).
//
// Everything this route can return already happened. Browsing (no `q`)
// covers the past week (PAST_WINDOW_DAYS in lib/dates.ts); a search reaches
// back as far as the catalogue keeps (RETAIN_DAYS). Gigl logs shows you went
// to, so an on-sale listing is not a thing anyone can rate, and showing one
// just buries the show they came here to log. Anything older than the
// catalogue comes from /api/shows/past instead.
//
// Optional `lat`, `lng` and `radius` (miles) narrow that to shows near a
// point, each result carrying its `distanceMiles`. The browser supplies the
// coordinates from the Near me control on /select-festival; they're read
// per-request and never stored.
//
// The one exception is `when=upcoming`, the list people save shows from on
// /select-festival. It returns shows that haven't happened, soonest first, a
// page at a time: pass the response's `next` back as `offset` for more. Nothing
// on that list can be logged until the date has passed.
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

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const nearby = readNearby(req.nextUrl.searchParams)
  const upcoming = req.nextUrl.searchParams.get('when') === 'upcoming'
  const requestedOffset = Number(req.nextUrl.searchParams.get('offset'))
  const offset = Number.isInteger(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0

  try {
    // An empty result is returned as-is, whether it means "no matches" or
    // "the catalogue hasn't captured a week yet". Nothing upstream can fill
    // that gap, so there is nothing to fall back to.
    const page = upcoming ? await upcomingShows(q, { nearby, offset, limit: UPCOMING_LIMIT }) : null
    const shows = page ? page.shows : await searchStoredShows(q, { nearby })
    const next = page ? { next: page.next } : {}

    // About one catalogue row in twelve came without a photo on its event.
    // The artist often has one from another listing, or on Ticketmaster.
    const unphotographed = shows.filter(s => !s.imageUrl).map(s => s.artist)
    if (unphotographed.length > 0) {
      const photo = await artistPhotos(unphotographed, PHOTO_LOOKUPS)
      return NextResponse.json({ shows: shows.map(s => (s.imageUrl ? s : { ...s, imageUrl: photo(s.artist) })), ...next })
    }
    return NextResponse.json({ shows, ...next })
  } catch (err) {
    console.error('shows/search failed:', err)
    return NextResponse.json({ error: 'Show search is temporarily unavailable.' }, { status: 502 })
  }
}
