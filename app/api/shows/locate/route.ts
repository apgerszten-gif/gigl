import { NextRequest, NextResponse } from 'next/server'
import { locateShow } from '@/lib/shows/locate'

// GET /api/shows/locate?id=tm-G5dIZ_4fT1TgR - the city (and its coordinates)
// a show happened in, from its id: see lib/shows/locate.ts. Asked once per
// log, right after it syncs (lib/pendingLogs.ts), which saves the answer
// onto the log for Near me on the Feed.
//
// { place: { city, lat, lng } }, { place: null } when the show can't be
// placed, and a 503 when setlist.fm couldn't answer for one of its shows.

// supabase-js reads go in Next's Data Cache without this - see the search
// route.
export const fetchCache = 'default-no-store'

export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id')?.trim() ?? ''
  if (!id || id.length > 300) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  try {
    const place = await locateShow(id)
    if (place === undefined) return NextResponse.json({ error: "Couldn't reach setlist.fm" }, { status: 503 })
    // Where a show was doesn't change.
    return NextResponse.json({ place }, { headers: { 'Cache-Control': 'public, s-maxage=86400' } })
  } catch (err) {
    console.error('shows/locate failed:', err)
    return NextResponse.json({ error: 'Lookup failed' }, { status: 502 })
  }
}
