// Distance maths for the "near me" filter on show search.
//
// Deliberately no PostGIS and no RPC: `shows` already carries plain
// `lat`/`lng` doubles (venue coordinates where Ticketmaster gives them, the
// metro centroid otherwise - see lib/shows/cities.ts), and a bounding box on
// two indexed columns is something PostgREST can express directly. The box is
// a superset of the circle, so the repository trims the corners with the
// exact haversine distance below before returning rows.

const EARTH_RADIUS_MILES = 3958.8

// Degrees of latitude are the same length everywhere; degrees of longitude
// shrink towards the poles, hence the cos() term in boundingBox.
const MILES_PER_DEGREE_LAT = 69.0

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export interface Coords {
  lat: number
  lng: number
}

// Great-circle distance in miles. Accurate to well under a mile at the
// distances this app cares about, which is far finer than a metro centroid
// deserves anyway.
export function distanceInMiles(a: Coords, b: Coords): number {
  const dLat = toRadians(b.lat - a.lat)
  const dLng = toRadians(b.lng - a.lng)
  const lat1 = toRadians(a.lat)
  const lat2 = toRadians(b.lat)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2

  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.min(1, Math.sqrt(h)))
}

export interface BoundingBox {
  minLat: number
  maxLat: number
  minLng: number
  maxLng: number
}

// The smallest lat/lng rectangle containing every point within `radiusMiles`
// of `centre`. Its corners are ~1.41x the radius away, so callers must still
// check the real distance - this only narrows what Postgres has to scan.
export function boundingBox(centre: Coords, radiusMiles: number): BoundingBox {
  const latDelta = radiusMiles / MILES_PER_DEGREE_LAT

  // cos() approaches zero at the poles, which would blow the longitude span
  // up to infinity. Nothing in SYNC_CITIES is anywhere near that, but clamp
  // to a whole hemisphere rather than emit NaN/Infinity into a query.
  const cosLat = Math.cos(toRadians(centre.lat))
  const lngDelta = cosLat < 0.01 ? 180 : Math.min(180, latDelta / cosLat)

  return {
    minLat: centre.lat - latDelta,
    maxLat: centre.lat + latDelta,
    minLng: centre.lng - lngDelta,
    maxLng: centre.lng + lngDelta,
  }
}

// Short enough to sit beside a "+ Log" button: "0.8 mi", "4.2 mi", "37 mi".
export function formatDistance(miles: number): string {
  if (miles < 10) return `${miles.toFixed(1)} mi`
  return `${Math.round(miles)} mi`
}
