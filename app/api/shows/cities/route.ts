import { NextRequest, NextResponse } from 'next/server'
import { findCities } from '@/lib/shows/repository'

// GET /api/shows/cities?q=portl - the places the city picker on
// /select-festival offers, for someone filtering by a typed city instead of
// sharing their location. Each comes with coordinates, which the page hands
// to /api/shows/search as an ordinary lat/lng/radius.

// See the note on fetchCache in app/api/shows/search/route.ts.
export const fetchCache = 'default-no-store'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  try {
    return NextResponse.json({ cities: await findCities(q) })
  } catch (err) {
    console.error('shows/cities failed:', err)
    return NextResponse.json({ error: 'City search is temporarily unavailable.' }, { status: 502 })
  }
}
