// A show's score: its Performance and Venue stars, averaged.
//
// Crowd used to be a third rating. It came off the log screen, and it no
// longer counts anywhere, old logs included, so every score means the same
// thing. Older logs still carry a crowd_rating (and the SMS flow still
// records one); nothing reads it.
export function computeShowScore(performance: number, venue: number): number {
  return (performance + venue) / 2
}

interface RatedRow {
  performance_rating: number | null
  venue_rating:       number | null
}

// Whether a log has the two ratings a score needs.
export function isRated(row: RatedRow): boolean {
  return row.performance_rating != null && row.venue_rating != null
}

// Same as computeShowScore, but tolerant of rows that predate the rating
// columns (or are otherwise missing a value) — returns 0 for those.
export function showScore(row: RatedRow): number {
  if (!isRated(row)) return 0
  return computeShowScore(row.performance_rating!, row.venue_rating!)
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
