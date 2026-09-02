import { NextRequest, NextResponse } from 'next/server'
import { searchShows } from '@/lib/ticketmaster'

// GET /api/shows/search?q=turnstile — proxies Ticketmaster's Discovery API
// server-side so TICKETMASTER_API_KEY never reaches the browser. `q` blank
// or omitted returns the trending/browse list (see searchShows).
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? ''

  try {
    const shows = await searchShows(q)
    return NextResponse.json({ shows })
  } catch (err) {
    console.error('shows/search failed:', err)
    return NextResponse.json({ error: 'Show search is temporarily unavailable.' }, { status: 502 })
  }
}
