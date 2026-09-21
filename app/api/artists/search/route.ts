import { NextRequest, NextResponse } from 'next/server'
import { searchArtistNames } from '@/lib/shows/repository'

// GET /api/artists/search?q=turn — artist names already in the catalogue.
//
// Feeds the suggestion list on the add-a-show form. Its job is spelling, not
// discovery: if someone types "turnstyle" for a band the catalogue already
// knows as "Turnstile", every future search for that show has to match a
// typo that only one person will ever reproduce. Offering the existing name
// is the cheapest moment to prevent that.
//
// Public data through the anon key, so it keeps working without the service
// role key configured - which matters because the form itself is useless if
// the suggestions are down.

// Next 14 puts any fetch without explicit cache options into the Data Cache
// with no expiry, supabase-js requests included, so this would otherwise
// serve one visitor's first query to everybody forever.
export const fetchCache = 'default-no-store'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  try {
    const artists = await searchArtistNames(q)
    return NextResponse.json({ artists })
  } catch (err) {
    console.error('artists/search failed:', err)
    // Empty rather than an error status: the form must stay usable with no
    // suggestions, since typing a name nobody has logged yet is the whole
    // reason this page exists.
    return NextResponse.json({ artists: [] })
  }
}
