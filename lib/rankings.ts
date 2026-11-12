import type { SupabaseClient } from '@supabase/supabase-js'
import { nameKey } from './nameKey'

// Everyone's ratings read as leaderboards (/rankings): artists as a whole,
// and venues, rather than one row per show. An artist's place comes from
// every show of theirs anyone has rated, and a venue's from every show there.
//
// Ranked on Performance and Venue stars, the two the user picks between on
// the page: either one alone, or their average ("both").

export type RankMetric = 'both' | 'performance' | 'venue'

const METRIC_LABELS: Record<RankMetric, string> = {
  performance: 'Performance',
  venue:       'Venue',
  both:        'Both',
}

// Each list leads with the stars that matter most to it, and opens ranked on
// those: artists by Performance, venues by Venue.
const METRIC_ORDER: Record<'artists' | 'venues', RankMetric[]> = {
  artists: ['performance', 'venue', 'both'],
  venues:  ['venue', 'performance', 'both'],
}

export function rankMetricsFor(list: 'artists' | 'venues'): { value: RankMetric; label: string }[] {
  return METRIC_ORDER[list].map(value => ({ value, label: METRIC_LABELS[value] }))
}

export function defaultRankMetric(list: 'artists' | 'venues'): RankMetric {
  return METRIC_ORDER[list][0]
}

export function isRankMetric(value: unknown): value is RankMetric {
  return value === 'both' || value === 'performance' || value === 'venue'
}

export interface RankScores {
  both:        number
  performance: number
  venue:       number
}

interface Ranked {
  key:     string
  name:    string
  // Distinct shows rated, and ratings across them.
  shows:   number
  count:   number
  scores:  RankScores
  // Every show id (logged_shows.artist_id) behind the row: what its "N shows"
  // and "N ratings" open (components/RankingDetailSheet.tsx), and for an
  // artist, what their battle records are summed over.
  showIds: string[]
}

export type ArtistRanking = Ranked

export interface VenueRanking extends Ranked {
  // Empty when none of the shows rated there are in the catalogue, which is
  // the only thing that knows a venue's city (a log keeps just its name).
  city:  string
  state: string
}

export interface LoggedShowForRanking {
  artist_id:          string
  artist_name:        string | null
  venue:              string | null
  stage:              string | null
  performance_rating: number | null
  venue_rating:       number | null
}

export const RANKINGS_SELECT = 'artist_id, artist_name, venue, stage, performance_rating, venue_rating'

class Tally {
  performance = 0
  venue = 0
  count = 0
  showIds = new Set<string>()

  add(log: LoggedShowForRanking) {
    this.performance += log.performance_rating!
    this.venue += log.venue_rating!
    this.count += 1
    this.showIds.add(log.artist_id)
  }

  merge(other: Tally) {
    this.performance += other.performance
    this.venue += other.venue
    this.count += other.count
    other.showIds.forEach(id => this.showIds.add(id))
  }

  scores(): RankScores {
    return {
      performance: this.performance / this.count,
      venue:       this.venue / this.count,
      both:        (this.performance + this.venue) / (2 * this.count),
    }
  }
}

function rated(log: LoggedShowForRanking): boolean {
  return log.performance_rating != null && log.venue_rating != null
}

// Highest first on the chosen stars; more ratings break a tie, since five
// people agreeing says more than one.
export function sortRankings<T extends Ranked>(rows: T[], metric: RankMetric): T[] {
  return [...rows].sort((a, b) =>
    b.scores[metric] - a.scores[metric] || b.count - a.count || a.name.localeCompare(b.name))
}

// One row per artist, however many shows of theirs were rated. Names are
// matched loosely (nameKey), so "Charli XCX" and "Charli xcx" are one artist.
export function rankArtists(logs: LoggedShowForRanking[]): ArtistRanking[] {
  const found = new Map<string, { name: string; tally: Tally }>()
  for (const log of logs) {
    if (!rated(log) || !log.artist_name) continue
    const key = nameKey(log.artist_name)
    if (!key) continue
    const artist = found.get(key) ?? { name: log.artist_name, tally: new Tally() }
    artist.tally.add(log)
    found.set(key, artist)
  }
  return Array.from(found.entries()).map(([key, { name, tally }]) => ({
    key, name,
    shows:   tally.showIds.size,
    count:   tally.count,
    scores:  tally.scores(),
    showIds: Array.from(tally.showIds),
  }))
}

export interface ListingPlace { venue: string; city: string; state: string }

// One row per venue. A venue is its name and its city, and the city comes
// from the catalogue (`places`, by show id). A rated show the catalogue
// doesn't have (a setlist.fm log) joins the one city that name is known in,
// or stays a row of its own when there are several, since nine cities have
// a Fillmore. Festival sets are left out: a stage isn't a venue.
export function rankVenues(logs: LoggedShowForRanking[], places: Record<string, ListingPlace>): VenueRanking[] {
  const byName = new Map<string, Map<string, { name: string; city: string; state: string; tally: Tally }>>()
  for (const log of logs) {
    if (!rated(log) || log.stage || !log.venue?.trim()) continue
    const place = places[log.artist_id]
    const nameK = nameKey(place?.venue ?? log.venue)
    const cityK = place ? `${nameKey(place.city)}|${place.state}` : ''
    const cities = byName.get(nameK) ?? new Map()
    const venue = cities.get(cityK) ?? { name: place?.venue ?? log.venue, city: place?.city ?? '', state: place?.state ?? '', tally: new Tally() }
    venue.tally.add(log)
    cities.set(cityK, venue)
    byName.set(nameK, cities)
  }

  const rows: VenueRanking[] = []
  byName.forEach((cities, nameK) => {
    const unplaced = cities.get('')
    const placed = Array.from(cities.entries()).filter(([cityK]) => cityK !== '')
    if (unplaced && placed.length === 1) {
      placed[0][1].tally.merge(unplaced.tally)
      cities.delete('')
    }
    cities.forEach((venue, cityK) => rows.push({
      key:    `${nameK}|${cityK}`,
      name:   venue.name,
      city:   venue.city,
      state:  venue.state,
      shows:   venue.tally.showIds.size,
      count:   venue.tally.count,
      scores:  venue.tally.scores(),
      showIds: Array.from(venue.tally.showIds),
    }))
  })
  return rows
}

// PostgREST puts `in` filters in the URL, so ids go up in chunks.
const ID_CHUNK = 100

// Everything the page needs, read the same way by the server render
// (app/rankings/page.tsx) and the live refresh (RankingsClient).
export async function loadRankings(client: SupabaseClient): Promise<{ artists: ArtistRanking[]; venues: VenueRanking[] }> {
  const { data, error } = await client.from('logged_shows').select(RANKINGS_SELECT)
  // A failed read must not look like "no ratings yet" with nothing logged.
  if (error) console.error('[rankings] logged_shows query failed:', error.message)
  const logs = (data ?? []) as LoggedShowForRanking[]

  const ids = Array.from(new Set(logs.filter(l => l.venue && !l.stage).map(l => l.artist_id)))
  const places: Record<string, ListingPlace> = {}
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const { data: listings, error: placeError } = await client
      .from('shows')
      .select('id, venue, city, state')
      .in('id', ids.slice(i, i + ID_CHUNK))
    if (placeError) {
      // Venues still rank without their cities; they just can't be told apart.
      console.error('[rankings] venue cities lookup failed:', placeError.message)
      break
    }
    for (const row of listings ?? []) places[row.id] = { venue: row.venue, city: row.city, state: row.state }
  }

  return { artists: rankArtists(logs), venues: rankVenues(logs, places) }
}
