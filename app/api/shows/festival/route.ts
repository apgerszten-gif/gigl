import { NextRequest, NextResponse } from 'next/server'
import { festivalShows } from '@/lib/shows/repository'
import { CRSSD } from '@/lib/crssd'

// GET /api/shows/festival?lineup=crssd — every set from one imported festival
// lineup, including days that haven't happened yet.
//
// Separate from /api/shows/search on purpose. That route must never return a
// show nobody can have been to; this one must return the whole lineup so the
// festival page can show the rest of the weekend locked rather than missing.
// Keeping them apart means neither has to carry an exception for the other.

// Next 14 caches any fetch without explicit options forever, supabase-js
// included, which would freeze this on whatever it first returned. Same
// reason as the search route.
export const fetchCache = 'default-no-store'

// The key picks a LIKE prefix, so it is whitelisted rather than passed
// through - this is not a general-purpose query endpoint.
const LINEUPS: Record<string, string> = {
  crssd: CRSSD.idPrefix,
}

export async function GET(req: NextRequest) {
  const lineup = req.nextUrl.searchParams.get('lineup') ?? ''
  const prefix = LINEUPS[lineup]
  if (!prefix) {
    return NextResponse.json({ error: 'Unknown lineup.' }, { status: 404 })
  }

  try {
    const shows = await festivalShows(prefix)
    // The same for everyone and fixed for the weekend, so Vercel's CDN can
    // answer it: a database round trip was ~1.7s on good wifi, and people
    // open this standing in a field. Five minutes fresh, then served stale
    // for up to a day while it refreshes, so a re-import (a late photo, a
    // cancelled set) shows within minutes.
    return NextResponse.json({ shows }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=86400' },
    })
  } catch (err) {
    console.error('shows/festival failed:', err)
    return NextResponse.json({ error: 'The lineup is temporarily unavailable.' }, { status: 502 })
  }
}
