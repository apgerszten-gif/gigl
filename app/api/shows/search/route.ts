import { NextRequest, NextResponse } from 'next/server'
import { searchShows } from '@/lib/ticketmaster'
import { searchStoredShows, storedShowCount } from '@/lib/shows/repository'

// GET /api/shows/search?q=turnstile — searches the `shows` catalogue table,
// which the nightly job at /api/cron/sync-shows keeps populated. `q` blank or
// omitted returns the soonest upcoming shows (the page's initial browse list).
//
// This used to proxy Ticketmaster on every request, which made each visitor
// cost an upstream call against a 5000/day cap. Reading Postgres makes that a
// fixed nightly cost instead, and lets search be fuzzy across artist *and*
// venue rather than whatever Ticketmaster's relevance sort returns.

// Next 14 puts any fetch without explicit cache options into the Data Cache
// with no expiry, and that includes supabase-js's requests. Without this the
// catalogue reads froze on whatever they first returned - an empty table
// before the first sync - so search kept falling back to Ticketmaster after
// the table had filled. The Ticketmaster fallback sets its own revalidate,
// so it stays cached.
export const fetchCache = 'default-no-store'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  try {
    const shows = await searchStoredShows(q)
    if (shows.length > 0) return NextResponse.json({ shows })

    // Empty result is usually a genuine "no matches" and should be returned
    // as-is. But before the first sync has ever run the table is empty, and
    // every search would look broken - so distinguish the two with a count,
    // and only fall back to a live Ticketmaster call for a cold catalogue.
    // Once the table has rows this branch stops being reachable, which is
    // what keeps the fallback from quietly reintroducing per-visitor API
    // calls.
    if (await storedShowCount() === 0) {
      console.warn('[shows/search] shows table is empty; falling back to live Ticketmaster. Has the sync run?')
      return NextResponse.json({ shows: await searchShows(q) })
    }

    return NextResponse.json({ shows })
  } catch (err) {
    console.error('shows/search failed:', err)
    return NextResponse.json({ error: 'Show search is temporarily unavailable.' }, { status: 502 })
  }
}
