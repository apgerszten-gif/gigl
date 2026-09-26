// 'YYYY-MM-DD' -> 'Sep 12', or 'Oct 19, 2025' outside the current year -
// search reaches back a year, so a bare month and day can mean either.
// Parsed with an explicit local-midnight time so this doesn't shift a day
// when the runtime's timezone isn't UTC (a bare 'YYYY-MM-DD' otherwise
// parses as UTC midnight).
export function formatShowDate(isoDate: string | null | undefined): string {
  if (!isoDate) return 'TBA'
  const d = new Date(`${isoDate}T00:00:00`)
  if (isNaN(d.getTime())) return 'TBA'
  const thisYear = d.getFullYear() === new Date().getFullYear()
  return d.toLocaleDateString('en-US', thisYear
    ? { month: 'short', day: 'numeric' }
    : { month: 'short', day: 'numeric', year: 'numeric' })
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
// Search filters to this window. The nightly prune keeps far more (see
// RETAIN_DAYS below), so widening the window only ever reveals rows that
// are already there. Widening it is a one-line change in this file.
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

// How long a show is kept once it has happened, which is longer than search
// reaches: people want to look back on shows from months ago, and since
// Ticketmaster has no past events these rows are the only history of them we
// will ever have. Keeping a year costs roughly 150k rows (~400 shows a day).
export const RETAIN_DAYS = 366

// Inclusive lower bound of what the nightly prune keeps.
export function retainStartIso(): string {
  const start = new Date()
  start.setUTCDate(start.getUTCDate() - RETAIN_DAYS)
  return isoDay(start)
}
