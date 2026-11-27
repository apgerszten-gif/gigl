import { NextRequest, NextResponse } from 'next/server'
import { showsOnDate } from '@/lib/shows/repository'
import { windowEndIso } from '@/lib/dates'
import type { PhotoCluster, PhotoMatchResult, PhotoShow } from '@/lib/photos/types'

// POST /api/photos/match - which shows were on where and when someone's photos
// were taken.
//
//   { clusters: [{ date, lat, lng, count }] }  ->  { shows }
//
// The phone reads each photo's EXIF and groups them by night and place
// (components/photos/cluster.ts); only those groups arrive here, with the
// place already rounded to 2 decimals. No picture is ever uploaded, nothing
// is stored, and no account is needed. A show matches when it was on that
// date (or the one before, since a late show's photos carry the next day's
// date) within MATCH_MILES of where the photos were taken.

// supabase-js reads go in the Data Cache without this - see the search route.
export const fetchCache = 'default-no-store'
export const dynamic = 'force-dynamic'

const MAX_CLUSTERS = 80
const MATCH_MILES = 3
const PER_CLUSTER = 3
const AT_ONCE = 8

const ISO = /^\d{4}-\d{2}-\d{2}$/

function isCluster(value: unknown): value is PhotoCluster {
  const c = value as PhotoCluster
  return !!c && typeof c.date === 'string' && ISO.test(c.date) && !Number.isNaN(Date.parse(c.date))
    && typeof c.lat === 'number' && Math.abs(c.lat) <= 90
    && typeof c.lng === 'number' && Math.abs(c.lng) <= 180
}

function dayBefore(iso: string): string {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() - 1)
  return date.toISOString().slice(0, 10)
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { clusters?: unknown } | null
  const clusters = Array.isArray(body?.clusters) ? body!.clusters.filter(isCluster).slice(0, MAX_CLUSTERS) : []
  if (clusters.length === 0) return NextResponse.json({ error: 'No photos with a date and place.' }, { status: 400 })

  const today = windowEndIso()
  const shows: PhotoShow[] = []

  try {
    for (let start = 0; start < clusters.length; start += AT_ONCE) {
      const chunk = clusters.slice(start, start + AT_ONCE)
      const found = await Promise.all(chunk.map(async cluster => {
        const from = { lat: cluster.lat, lng: cluster.lng }
        const nights = await Promise.all([showsOnDate(cluster.date, from), showsOnDate(dayBefore(cluster.date), from)])
        return nights.flat()
          .filter(s => s.isoDate && s.isoDate <= today && s.distanceMiles != null && s.distanceMiles <= MATCH_MILES)
          .sort((a, b) => a.distanceMiles! - b.distanceMiles! || a.id.localeCompare(b.id))
          .slice(0, PER_CLUSTER)
      }))
      found.forEach((list, i) => {
        for (const s of list) {
          shows.push({
            id: s.id, artist: s.artist, support: s.support, venue: s.venue, city: s.city, state: s.state,
            isoDate: s.isoDate, imageUrl: s.imageUrl ?? null, cluster: start + i, distanceMiles: s.distanceMiles!,
          })
        }
      })
    }
  } catch (err) {
    console.error('[photos/match] failed:', err)
    return NextResponse.json({ error: "Couldn't look those up. Try again." }, { status: 500 })
  }

  const result: PhotoMatchResult = { shows }
  return NextResponse.json(result)
}
