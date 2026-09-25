import type { NearbyFilter } from './repository'

// The Near me filter as /api/shows/search and /api/shows/past read it from a
// query string: `lat`, `lng` and `radius` (miles), supplied by the browser
// from /select-festival and never stored.

// A radius the client didn't send, or sent as nonsense. The ceiling exists so
// a hand-typed `radius=100000` can't turn the bounding box into a table scan.
const DEFAULT_RADIUS_MILES = 50
const MAX_RADIUS_MILES     = 500

// Returns null unless there is a complete, in-range coordinate pair: a
// half-supplied or malformed location is treated as no location at all
// rather than as a point off the coast of Africa.
export function readNearby(params: URLSearchParams): NearbyFilter | null {
  const lat = Number(params.get('lat'))
  const lng = Number(params.get('lng'))
  if (!params.has('lat') || !params.has('lng')) return null
  if (!Number.isFinite(lat) || Math.abs(lat) > 90)  return null
  if (!Number.isFinite(lng) || Math.abs(lng) > 180) return null

  const requested = Number(params.get('radius'))
  const radiusMiles = Number.isFinite(requested) && requested > 0
    ? Math.min(requested, MAX_RADIUS_MILES)
    : DEFAULT_RADIUS_MILES

  return { centre: { lat, lng }, radiusMiles }
}
