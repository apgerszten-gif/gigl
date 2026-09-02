import { computeShowScore } from './rating'

export interface ArtistRow {
  artist_id: string
  name:      string
  stage:     string
  day:       string
  avgScore:  number
  count:     number
}

export interface LoggedShowForRanking {
  artist_id:          string
  artist_name:        string | null
  stage:              string | null
  day:                string | null
  performance_rating: number | null
  venue_rating:       number | null
  crowd_rating:       number | null
}

// Shared by the server-rendered initial load (app/rankings/page.tsx) and the
// client-side realtime refetch (RankingsClient) so both ever compute the
// leaderboard the same way.
export function aggregateArtistRows(logs: LoggedShowForRanking[] | null | undefined): ArtistRow[] {
  const map: Record<string, { scores: number[]; name: string; stage: string; day: string }> = {}
  logs?.forEach(l => {
    if (l.performance_rating == null || l.venue_rating == null || l.crowd_rating == null) return
    if (!map[l.artist_id]) {
      map[l.artist_id] = { scores: [], name: l.artist_name ?? 'Unknown', stage: l.stage ?? '', day: l.day ?? '' }
    }
    map[l.artist_id].scores.push(computeShowScore(l.performance_rating, l.venue_rating, l.crowd_rating))
  })

  return Object.entries(map)
    .map(([artist_id, v]) => ({
      artist_id,
      name:     v.name,
      stage:    v.stage,
      day:      v.day,
      avgScore: v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
      count:    v.scores.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
}

export const RANKINGS_SELECT = 'artist_id, performance_rating, venue_rating, crowd_rating, artist_name, stage, day'
