import { NextRequest, NextResponse } from 'next/server'
import { placesNear, showsOnDate, venueCoords } from '@/lib/shows/repository'
import { showsOnDateInCity } from '@/lib/setlistfm'
import { distanceInMiles } from '@/lib/geo'
import { nameKey } from '@/lib/nameKey'
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
export const maxDuration = 60

const MAX_CLUSTERS = 80
const MATCH_MILES = 3
const PER_CLUSTER = 5
const AT_ONCE = 8

// A catalogue show this close is taken to be the one; further than this, the
// right show may be missing from the catalogue, so setlist.fm is asked too.
const SURE_MILES = 1
// setlist.fm is a live request per city and a daily quota shared by the whole
// app, so a visit asks about only a few nights, and an address only so often.
const LOOKUPS_PER_REQUEST = 5
const LOOKUPS_PER_WINDOW = 15
const WINDOW_MS = 10 * 60 * 1000
const recentLookups = new Map<string, number[]>()

function lookupsLeft(address: string): number {
  const now = Date.now()
  const times = (recentLookups.get(address) ?? []).filter(t => now - t < WINDOW_MS)
  recentLookups.set(address, times)
  return Math.max(0, LOOKUPS_PER_WINDOW - times.length)
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

function isCluster(value: unknown): value is PhotoCluster {
  const c = value as PhotoCluster
  return !!c && typeof c.date === 'string' && ISO.test(c.date) && !Number.isNaN(Date.parse(c.date))
    && typeof c.lat === 'number' && Math.abs(c.lat) <= 90
    && typeof c.lng === 'number' && Math.abs(c.lng) <= 180
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { clusters?: unknown } | null
  const clusters = Array.isArray(body?.clusters) ? body!.clusters.filter(isCluster).slice(0, MAX_CLUSTERS) : []
  if (clusters.length === 0) return NextResponse.json({ error: 'No photos with a date and place.' }, { status: 400 })

  const address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  const today = windowEndIso()
  const shows: PhotoShow[] = []
  const lookups: number[] = []

  try {
    // The catalogue, a few nights at a time.
    const sure: boolean[] = new Array(clusters.length).fill(false)
    for (let start = 0; start < clusters.length; start += AT_ONCE) {
      const chunk = clusters.slice(start, start + AT_ONCE)
      const found = await Promise.all(chunk.map(async cluster => {
        const from = { lat: cluster.lat, lng: cluster.lng }
        const night = await showsOnDate(cluster.date, from)
        return night
          .filter(s => s.isoDate && s.isoDate <= today && s.distanceMiles != null && s.distanceMiles <= MATCH_MILES)
          .sort((a, b) => a.distanceMiles! - b.distanceMiles! || a.id.localeCompare(b.id))
          .slice(0, PER_CLUSTER)
      }))
      found.forEach((list, i) => {
        sure[start + i] = list.some(s => s.distanceMiles! <= SURE_MILES)
        for (const s of list) {
          shows.push({
            id: s.id, artist: s.artist, support: s.support, venue: s.venue, city: s.city, state: s.state,
            isoDate: s.isoDate, imageUrl: s.imageUrl ?? null, cluster: start + i, distanceMiles: s.distanceMiles!,
          })
        }
      })
    }

    // setlist.fm, for the nights the catalogue couldn't place. Newest nights
    // first (they're sorted that way), one at a time: its request gate is
    // shared, so going wider wouldn't be faster.
    let budget = Math.min(LOOKUPS_PER_REQUEST, lookupsLeft(address))
    for (let i = 0; i < clusters.length && budget > 0; i++) {
      if (sure[i]) continue
      budget -= 1
      lookups.push(Date.now())
      const cluster = clusters[i]
      const centre = { lat: cluster.lat, lng: cluster.lng }
      const known = new Set(shows.filter(s => s.cluster === i).map(s => nameKey(s.artist)))

      const found: PhotoShow[] = []
      for (const place of await placesNear(centre, 8, 3)) {
        for (const s of await showsOnDateInCity(cluster.date, place.city, place.state)) {
          if (known.has(nameKey(s.artist))) continue
          // setlist.fm only places a venue at its city, so a room the
          // catalogue knows is measured from its own coordinates; one it
          // doesn't is kept only when its city is right where the photos are.
          const at = await venueCoords(s.venue, s.city, s.state)
          const distanceMiles = at ? distanceInMiles(centre, at) : place.distanceMiles
          if (at ? distanceMiles > SURE_MILES * 2 : place.distanceMiles > 5) continue
          found.push({
            id: s.id, artist: s.artist, venue: s.venue, city: s.city, state: s.state,
            isoDate: s.isoDate, imageUrl: null, cluster: i, distanceMiles, viaSetlistFm: true,
          })
        }
      }
      found.sort((a, b) => a.distanceMiles - b.distanceMiles || a.id.localeCompare(b.id))
      shows.push(...found.slice(0, 3))
    }
  } catch (err) {
    console.error('[photos/match] failed:', err)
    return NextResponse.json({ error: "Couldn't look those up. Try again." }, { status: 500 })
  }

  if (lookups.length > 0) recentLookups.set(address, [...(recentLookups.get(address) ?? []), ...lookups])
  const result: PhotoMatchResult = { shows }
  return NextResponse.json(result)
}
