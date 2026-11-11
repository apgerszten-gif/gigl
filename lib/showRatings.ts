import type { SupabaseClient } from '@supabase/supabase-js'
import { computeShowScore } from './rating'

// What Gigl's own logs say about a show: the average of everyone's star
// rating (out of 5) and how many people gave one.
export interface ShowRating {
  score: number
  count: number
}

export interface RatedLog {
  artist_id:          string
  performance_rating: number | null
  venue_rating:       number | null
  crowd_rating:       number | null
}

// Show id (logged_shows.artist_id) -> its rating. Logs missing any of the
// three sub-ratings are left out, the same as everywhere a score is shown.
export function tallyRatings(logs: RatedLog[]): Record<string, ShowRating> {
  const sums: Record<string, { total: number; count: number }> = {}
  for (const log of logs) {
    if (log.performance_rating == null || log.venue_rating == null || log.crowd_rating == null) continue
    const entry = (sums[log.artist_id] ??= { total: 0, count: 0 })
    entry.total += computeShowScore(log.performance_rating, log.venue_rating, log.crowd_rating)
    entry.count += 1
  }
  const ratings: Record<string, ShowRating> = {}
  for (const [id, { total, count }] of Object.entries(sums)) ratings[id] = { score: total / count, count }
  return ratings
}

// Every log's score counts once, so a show ten people rated weighs ten times
// one that a single person did.
export function overallRating(ratings: Record<string, ShowRating>): ShowRating | null {
  let total = 0
  let count = 0
  for (const rating of Object.values(ratings)) {
    total += rating.score * rating.count
    count += rating.count
  }
  return count > 0 ? { score: total / count, count } : null
}

// PostgREST puts `in` filters in the URL, so ids go up in chunks.
const ID_CHUNK = 100

// Ratings for the given catalogue ids, read without a session: like the other
// server-rendered pages, these count every log, blocked or not.
export async function ratingsForShows(client: SupabaseClient, ids: string[]): Promise<Record<string, ShowRating>> {
  const unique = Array.from(new Set(ids))
  const logs: RatedLog[] = []
  for (let i = 0; i < unique.length; i += ID_CHUNK) {
    const { data, error } = await client
      .from('logged_shows')
      .select('artist_id, performance_rating, venue_rating, crowd_rating')
      .in('artist_id', unique.slice(i, i + ID_CHUNK))
    if (error) {
      // Ratings only decorate the list; it still works without them.
      console.error('show ratings lookup failed:', error.message)
      break
    }
    logs.push(...(data ?? []))
  }
  return tallyRatings(logs)
}
