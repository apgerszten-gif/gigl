import { NextRequest, NextResponse } from 'next/server'
import { followedUpcoming, searchStoredShows, upcomingShows, type FollowedVenue } from '@/lib/shows/repository'
import { readNearby } from '@/lib/shows/nearby'
import { artistPhotos } from '@/lib/shows/artistImageSync'
import { retainStartIso, windowEndIso } from '@/lib/dates'

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

// The Log screen's "When was it?" chips: `year=2025` or `date=2025-10-11`,
// kept inside what the catalogue holds (a year back, up to today). Null when
// neither was sent; an empty range when the whole year is out of reach, which
// answers empty and leaves the older shows to setlist.fm.
function readPastRange(params: URLSearchParams): { from: string; to: string } | null {
  const year = params.get('year')
  const date = params.get('date')
  let from: string, to: string
  if (date && ISO_DATE.test(date)) { from = date; to = date }
  else if (year && /^\d{4}$/.test(year)) { from = `${year}-01-01`; to = `${year}-12-31` }
  else return null
  const floor = retainStartIso()
  const ceiling = windowEndIso()
  return { from: from < floor ? floor : from, to: to > ceiling ? ceiling : to }
}

// The Upcoming tab's date chips: `from` and `until`, inclusive. `from` may be
// a day behind the server's UTC today, because "Tonight" is worked out on the
// phone, and a US evening is already tomorrow in UTC.
function readUpcomingRange(params: URLSearchParams): { from?: string; until?: string } {
  const from = params.get('from')
  const until = params.get('until')
  return {
    from:  from && ISO_DATE.test(from) ? from : undefined,
    until: until && ISO_DATE.test(until) ? until : undefined,
  }
}

// Shows by the artists and venues someone follows, for the Upcoming tab's
// Following view: `artist=Lane 8`, and `venue=Knockdown Center|Maspeth|NY`
// (name, city, state), each repeatable. Capped so a long list can't fan out
// into hundreds of reads.
const MAX_FOLLOWED = 40

function readFollowed(params: URLSearchParams): { artists: string[]; venues: FollowedVenue[] } {
  const artists = params.getAll('artist').map(a => a.trim()).filter(Boolean).slice(0, MAX_FOLLOWED)
  const venues = params.getAll('venue').slice(0, MAX_FOLLOWED).flatMap(raw => {
    const [name = '', city = '', state = ''] = raw.split('|').map(part => part.trim())
    return name ? [{ name, city, state }] : []
  })
  return { artists, venues }
}

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
// Optional `year` or `date` (the Log screen's "When" chips) replace the
// window with that year or that day, still inside what the catalogue keeps.
//
// The one exception is `when=upcoming`, the list people save shows from on
// /select-festival and the Upcoming tab (/upcoming). It returns shows that
// haven't happened, soonest first, a page at a time: pass the response's
// `next` back as `offset` for more. Nothing on that list can be logged until
// the date has passed. `from` and `until` narrow it to the Upcoming tab's
// dates, and `following=1` with `artist` and `venue` params returns, unpaged,
// only shows by those artists or at those venues (its Following view).
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

  const following = upcoming && req.nextUrl.searchParams.get('following') === '1'
  const pastRange = upcoming ? null : readPastRange(req.nextUrl.searchParams)
  if (pastRange && pastRange.from > pastRange.to) return NextResponse.json({ shows: [] })

  try {
    // An empty result is returned as-is, whether it means "no matches" or
    // "the catalogue hasn't captured a week yet". Nothing upstream can fill
    // that gap, so there is nothing to fall back to.
    const upcomingRange = upcoming ? readUpcomingRange(req.nextUrl.searchParams) : {}
    const page = following
      ? { shows: await followedUpcoming({ ...readFollowed(req.nextUrl.searchParams), ...upcomingRange, nearby }), next: null }
      : upcoming ? await upcomingShows(q, { nearby, offset, limit: UPCOMING_LIMIT, ...upcomingRange }) : null
    const shows = page ? page.shows : await searchStoredShows(q, { nearby, range: pastRange })
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
