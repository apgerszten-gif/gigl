// Where an artist's and a venue's pages live. Query strings rather than path
// segments, because names carry slashes ("AC/DC", "Bar/Restaurant") that a
// path segment can't hold reliably.

export function artistHref(name: string): string {
  return `/artists?${new URLSearchParams({ name }).toString()}`
}

// A venue is its name and its city: nine cities have a Fillmore.
export function venueHref(venue: { name: string; city?: string | null; state?: string | null }): string {
  const params = new URLSearchParams({ name: venue.name })
  if (venue.city) params.set('city', venue.city)
  if (venue.state) params.set('state', venue.state)
  return `/venues?${params.toString()}`
}
