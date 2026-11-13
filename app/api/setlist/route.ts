import { NextRequest, NextResponse } from 'next/server'
import { findSetlist } from '@/lib/setlistfm'

// GET /api/setlist?artist=Billy%20Strings&date=2026-09-26&venue=Kia%20Forum&city=Inglewood
// - what the artist played that night, from setlist.fm (findSetlist in
// lib/setlistfm.ts), for the Setlist panel. `venue` and `city` are optional
// and only choose between two setlists on one date.
//
// { setlist } when there's one with songs, { setlist: null } when there
// isn't (yet), and a 503 when setlist.fm couldn't answer. Never stored:
// setlist.fm's terms allow short-term caching only.

// Next 14 would otherwise keep the first answer in its Data Cache forever.
// setlist.fm's own requests opt into a short cache explicitly.
export const fetchCache = 'default-no-store'

const CDN_SECONDS = 60 * 60

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams
  const artist = params.get('artist')?.trim() ?? ''
  const isoDate = params.get('date') ?? ''
  if (!artist || artist.length > 200 || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
    return NextResponse.json({ error: 'artist and date (YYYY-MM-DD) are required' }, { status: 400 })
  }

  const setlist = await findSetlist({
    artist,
    isoDate,
    venue: params.get('venue')?.slice(0, 200),
    city:  params.get('city')?.slice(0, 100),
  })
  if (setlist === undefined) {
    return NextResponse.json({ error: "Couldn't reach setlist.fm" }, { status: 503 })
  }
  // Vercel's CDN keeps the answer an hour across every instance, "none"
  // included, which the in-memory cache behind findSetlist can't: the same
  // show asked about from two instances costs one request, not two.
  return NextResponse.json({ setlist }, { headers: { 'Cache-Control': `public, s-maxage=${CDN_SECONDS}` } })
}
