import { NextRequest, NextResponse } from 'next/server'
import { nameKey } from '@/lib/nameKey'
import { artistPhotos } from '@/lib/shows/artistImageSync'
import { searchPastShows } from '@/lib/setlistfm'
import { searchStoredShows } from '@/lib/shows/repository'
import { readNearby } from '@/lib/shows/nearby'

// GET /api/shows/past?q=kelela - shows from the last five years that the
// catalogue never captured, from setlist.fm (see lib/setlistfm.ts), newest
// first, a load at a time. /select-festival asks for these alongside
// /api/shows/search and lists them underneath, so the catalogue's own
// results never wait on a slower outside service.
//
// Returns `next`, a cursor for the load after this one ("Show earlier
// shows"), passed back as `cursor`; null when there's nothing older.
// Takes the same optional `lat`, `lng` and `radius` as the search route.
//
// A show both sources know about is left to the catalogue's copy, which has
// Ticketmaster's photo and the id anyone who already logged it used.

// supabase-js reads go in the Data Cache without this - see the search
// route. setlist.fm's own requests opt into a short cache explicitly.
export const fetchCache = 'default-no-store'

// setlist.fm has no photos, and many of its artists never had a show in the
// catalogue to bring one. Up to this many are looked up on Ticketmaster per
// request, together (well under its 5-a-second limit) - an artist search
// needs one, a venue search's long tail fills in over a few visits.
const PHOTO_LOOKUPS = 4

// The two sources spell acts differently: "Melt Banana" and "Melt‐Banana"
// (a Unicode hyphen), "J. Roddy Walston & the Business" and "J Roddy
// Walston". Letters and digits only, a leading "the" dropped, and one name
// allowed to be the start of the other covers both. Only ever compared
// between shows on the same date, which keeps the looseness safe.
function looseAct(name: string): string {
  return nameKey(name).replace(/^the /, '').replace(/[^a-z0-9]/g, '')
}

function sameAct(a: string, b: string): boolean {
  if (!a || !b) return false
  return a.startsWith(b) || b.startsWith(a)
}

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''
  const nearby = readNearby(req.nextUrl.searchParams)
  const cursor = req.nextUrl.searchParams.get('cursor')

  try {
    const [past, stored] = await Promise.all([
      searchPastShows(q, { nearby, cursor }),
      searchStoredShows(q, { limit: 200 }),
    ])

    // Same date and the same act is the same show, whatever each source
    // calls the city.
    const actsOn = new Map<string, string[]>()
    stored.forEach(s => {
      if (s.isoDate) actsOn.set(s.isoDate, [...(actsOn.get(s.isoDate) ?? []), looseAct(s.artist)])
    })
    // No cap: a load is already bounded by the pages it reads, and trimming
    // it would lose shows between this load and the next.
    const shows = past.shows
      .filter(s => !(actsOn.get(s.isoDate!) ?? []).some(act => sameAct(act, looseAct(s.artist))))

    const photo = await artistPhotos(shows.map(s => s.artist), PHOTO_LOOKUPS)
    return NextResponse.json({ shows: shows.map(s => ({ ...s, imageUrl: photo(s.artist) })), next: past.next })
  } catch (err) {
    // Never an error the page has to show: these results only ever add to
    // the catalogue's.
    console.error('shows/past failed:', err)
    return NextResponse.json({ shows: [], next: null })
  }
}
