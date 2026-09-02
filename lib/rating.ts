export function computeShowScore(performance: number, venue: number, crowd: number): number {
  return (performance + venue + crowd) / 3
}

interface RatedRow {
  performance_rating: number | null
  venue_rating:       number | null
  crowd_rating:       number | null
}

// Same as computeShowScore, but tolerant of rows that predate the rating
// columns (or are otherwise missing a value) — returns 0 for those.
export function showScore(row: RatedRow): number {
  if (row.performance_rating == null || row.venue_rating == null || row.crowd_rating == null) return 0
  return computeShowScore(row.performance_rating, row.venue_rating, row.crowd_rating)
}

export function roundToEighth(score: number): number {
  return Math.round(score * 8) / 8
}

// Buckets the new average score into the old three-way reaction categories,
// so anything still reading `emoji` (e.g. app/battle) keeps working.
export function deriveLegacyEmoji(score: number): 'loved' | 'ok' | 'skip' {
  if (score >= 4) return 'loved'
  if (score >= 2.5) return 'ok'
  return 'skip'
}
