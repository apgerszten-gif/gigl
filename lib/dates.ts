// 'YYYY-MM-DD' -> 'Sep 12'. Parsed with an explicit local-midnight time so
// this doesn't shift a day when the runtime's timezone isn't UTC (a bare
// 'YYYY-MM-DD' otherwise parses as UTC midnight).
export function formatShowDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'TBA'
  const d = new Date(`${isoDate}T00:00:00`)
  if (isNaN(d.getTime())) return 'TBA'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
