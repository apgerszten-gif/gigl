// 'YYYY-MM-DD' -> 'Sep 12'. Parsed with an explicit local-midnight time so
// this doesn't shift a day when the runtime's timezone isn't UTC (a bare
// 'YYYY-MM-DD' otherwise parses as UTC midnight).
export function formatShowDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'TBA'
  const d = new Date(`${isoDate}T00:00:00`)
  if (isNaN(d.getTime())) return 'TBA'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

// ── The catalogue window ─────────────────────────────────────────────────────
// Gigl is a record of shows you went to, so the `shows` catalogue holds shows
// that have already happened rather than ones on sale: a listing you couldn't
// have attended yet is nothing you can rate, and it crowds out the one you
// actually want to log. The window runs back PAST_WINDOW_DAYS from today and
// ends today - far enough back to catch the gig you didn't get round to
// logging, short enough that browsing still reads as "what happened around
// here recently" rather than an archive.
//
// Every layer measures the window from here: the nightly sync asks
// Ticketmaster for exactly this range, search filters to it, and the prune
// drops whatever falls outside. Widening it is a one-line change in this file.
export const PAST_WINDOW_DAYS = 7

// UTC, which is what the sync and the API routes run in on Vercel. Upstream
// dates a show by its *local* date, so near the boundary a row can sit a few
// hours either side of where a US-timezone user would put it. Both bounds are
// deliberately generous rather than exact, so that never hides a show someone
// is trying to log.
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// Inclusive upper bound. Today is inside the window, not after it: a show
// earlier this evening has happened, and being able to log it on the way home
// is the whole point.
export function windowEndIso(): string {
  return isoDay(new Date())
}

// Inclusive lower bound: PAST_WINDOW_DAYS before today.
export function windowStartIso(): string {
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - PAST_WINDOW_DAYS)
  return isoDay(start)
}
