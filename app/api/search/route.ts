import { NextRequest, NextResponse } from 'next/server'
import { searchArtists, searchStoredShows, searchVenues, upcomingShows } from '@/lib/shows/repository'
import { artistPhotos } from '@/lib/shows/artistImageSync'

// GET /api/search?q=fillmore - the Feed's search bar. One request answers
// every section it shows: artists and venues (each opening its own page of
// shows, /artists and /venues), shows that have happened (to log) and shows
// that haven't (to save), each a handful long. People are searched in the
// browser, the same way the You screen does it (components/UserSearch.tsx).
//
// Unlike the Log screen, nothing here is filtered by location: this is "find
// the thing I'm thinking of", wherever it is.

// See the note on fetchCache in app/api/shows/search/route.ts.
export const fetchCache = 'default-no-store'

const MIN_QUERY = 2
const ARTIST_LIMIT = 4
const VENUE_LIMIT = 4
const SHOW_LIMIT = 6

// Ticketmaster photo lookups per request for artists with none on file. Kept
// low: this answers as someone types.
const PHOTO_LOOKUPS = 2

export async function GET(req: NextRequest) {
  const q = (req.nextUrl.searchParams.get('q') ?? '').trim()
  if (q.length < MIN_QUERY) return NextResponse.json({ artists: [], venues: [], past: [], upcoming: [] })

  try {
    const [artists, venues, past, soon] = await Promise.all([
      searchArtists(q, ARTIST_LIMIT),
      searchVenues(q, VENUE_LIMIT),
      searchStoredShows(q, { limit: SHOW_LIMIT }),
      // Twice as many, because today's shows come back from both reads.
      upcomingShows(q, { limit: SHOW_LIMIT * 2 }).then(page => page.shows),
    ])

    // Tonight's show is on both lists, and goes under Past, where it can be
    // logged on the way home - the same side the artist and venue pages put
    // it on (lib/shows/history.ts).
    const pastIds = new Set(past.map(s => s.id))
    const upcoming = soon.filter(s => !pastIds.has(s.id)).slice(0, SHOW_LIMIT)

    const unphotographed = [
      ...artists.filter(a => !a.imageUrl).map(a => a.name),
      ...[...past, ...upcoming].filter(s => !s.imageUrl).map(s => s.artist),
    ]
    const photo = unphotographed.length > 0 ? await artistPhotos(unphotographed, PHOTO_LOOKUPS) : () => null

    return NextResponse.json({
      artists:  artists.map(a => (a.imageUrl ? a : { ...a, imageUrl: photo(a.name) })),
      venues,
      past:     past.map(s => (s.imageUrl ? s : { ...s, imageUrl: photo(s.artist) })),
      upcoming: upcoming.map(s => (s.imageUrl ? s : { ...s, imageUrl: photo(s.artist) })),
    })
  } catch (err) {
    console.error('search failed:', err)
    return NextResponse.json({ error: 'Search is temporarily unavailable.' }, { status: 502 })
  }
}
