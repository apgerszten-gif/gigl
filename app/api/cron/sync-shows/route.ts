import { NextRequest, NextResponse } from 'next/server'
import { SYNC_CITIES, type SyncCity } from '@/lib/shows/cities'
import { fetchCityShowsPage, monthlyWindows, TicketmasterError, TM_RESULT_CAP, type DateWindow, type FetchOptions, type SyncShow } from '@/lib/ticketmaster'
import { upsertShows, prunePastShows } from '@/lib/shows/repository'
import { saveHeadlinerImages, fillLoggedArtistImages } from '@/lib/shows/artistImageSync'

// Nightly catalogue refresh: walks SYNC_CITIES, pulls each metro's upcoming
// music listings from Ticketmaster, and upserts them into `shows` so that
// normal search traffic reads Postgres instead of costing an upstream API
// call per visitor. Scheduled from vercel.json.
//
// Search serves the *past* week (PAST_WINDOW_DAYS in lib/dates.ts) while this
// job fetches what's upcoming, and that is not a contradiction: Ticketmaster
// drops an event from its index once it's over, so the only way to have last
// night's shows is to have banked them beforehand. Every run re-upserts the
// listings it can still see and prunes only what has aged a full week past;
// a row therefore ages in place from "upcoming" to "in the past week" to
// deleted, without ever being re-fetched. See the sync note in
// lib/ticketmaster.ts and prunePastShows() in lib/shows/repository.ts.
//
// Consequence worth remembering: a missed run is not just a stale day, it is
// a permanent hole. Any show that takes place while the job is broken and
// wasn't captured on an earlier night can never be logged.
//
// Runs long by design (minutes of deliberately paced HTTP), so it needs the
// extended duration rather than the default. 300 is the ceiling, not a
// comfortable margin: at 148 cities a strictly serial run measured 292s, four
// seconds inside it. That is why the fetching below is concurrent behind a
// shared rate gate (CONCURRENCY) and why it gives up at FETCH_DEADLINE_MS
// rather than risking the timeout. A full run measures 217s / 716 requests.
// Anything that adds cities, probes or windows should be re-timed against
// these numbers rather than assumed to fit.
export const maxDuration = 300
export const dynamic     = 'force-dynamic'

// Ticketmaster's free tier allows 5 requests/sec. 300ms between request
// *starts* is 3.3/sec - deliberately further under the limit than the 250ms
// tried first, because a measured run at 250ms still drew a 429. Since the run
// is rate-bound, this number sets the duration directly: ~716 requests at
// 300ms is the measured 217s.
const REQUEST_SPACING_MS = 300

// A 429 is transient, so a page gets a few more chances before its city is
// written off. Backoff is multiplied by the attempt number.
const MAX_RETRIES      = 3
const RETRY_BACKOFF_MS = 1000

// Requests in flight at once.
//
// This used to be strictly serial: send, await the response, sleep, repeat.
// That made the run latency-bound rather than rate-bound - Ticketmaster takes
// roughly 850ms to answer, so each request cost ~1.1s and 272 of them came to
// 292s, four seconds under the function's own ceiling. Overlapping the waiting
// makes the rate limiter the constraint instead of the round trip, which is
// the whole point of having one.
//
// The gate below is what keeps this safe: concurrency overlaps the *waiting*,
// it does not raise the request rate.
const CONCURRENCY = 6

// Deep paging is capped at 1000 results per query upstream, so this is the
// real ceiling per query, not a budget choice. Most cities return far fewer.
const MAX_PAGES_PER_CITY = 5

// Fetching stops here even with tasks left in the queue, so the run always
// reaches the upsert. This is not a performance tuning knob - it is what stops
// a slow night from losing everything. If the function hits maxDuration the
// whole collection is discarded before a single row is written, and because
// Ticketmaster drops events once they're over, a night thrown away is a
// permanent hole in the past week rather than a stale day that fixes itself.
// Measured at 217s for a full run, so this leaves real headroom while still
// landing well inside the 300s ceiling.
const FETCH_DEADLINE_MS = 240_000

// Radius for the geographic pass. 25 miles covers a metro and the towns just
// outside it without reaching so far that neighbouring cities in SYNC_CITIES
// mostly re-return each other's listings - the overlap is free to collect but
// not free to request.
const RADIUS_MILES = 25

// How many month-sized slices a city over TM_RESULT_CAP is split into before
// the open-ended tail window. Twelve covers a year of listings at a few
// hundred events per slice for even the densest metro, which keeps every
// slice comfortably under the ceiling it exists to dodge.
const SPLIT_MONTHS = 12

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// One global gate for the whole run: it hands out start times spaced
// REQUEST_SPACING_MS apart, so no matter how many workers are in flight the
// aggregate rate stays under Ticketmaster's limit. Reserving the slot before
// awaiting is what makes it safe under concurrency - two callers can never be
// handed the same slot.
function createRateGate(intervalMs: number) {
  let nextSlot = 0
  return async function gate(): Promise<void> {
    const now = Date.now()
    const slot = Math.max(now, nextSlot)
    nextSlot = slot + intervalMs
    const wait = slot - now
    if (wait > 0) await sleep(wait)
  }
}

// Fixed-size worker pool. Each worker pulls the next index until the queue is
// drained or `shouldStop` says to give up, so one slow item can't stall the
// others behind it.
async function pool<T>(
  items: T[],
  workers: number,
  run: (item: T) => Promise<void>,
  shouldStop?: () => boolean,
): Promise<void> {
  let cursor = 0
  const next = async (): Promise<void> => {
    while (cursor < items.length) {
      if (shouldStop?.()) return
      const item = items[cursor++]
      await run(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, next))
}

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without this the
  // endpoint is a public button that anyone can hold down to burn the daily
  // Ticketmaster quota.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[sync-shows] CRON_SECRET is not set; refusing to run')
    return NextResponse.json({ error: 'Sync is not configured.' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const collected  = new Map<string, SyncShow>()
  const cityErrors: string[] = []

  const gate = createRateGate(REQUEST_SPACING_MS)
  const label = (city: SyncCity) => `${city.city}, ${city.stateCode}`

  // One city failing must not take the run down - the other 147 are still
  // worth syncing, and this city retries tomorrow.
  function recordError(city: SyncCity, err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error(`[sync-shows] ${label(city)} failed:`, message)
    if (!cityErrors.includes(label(city))) cityErrors.push(label(city))
  }

  // Collected by id, so the same event returned under two overlapping metros
  // (New York and Brooklyn will genuinely both return some) collapses to one
  // row instead of racing itself in the upsert. A Map write is atomic between
  // awaits, so concurrent workers can share it safely.
  async function fetchPage(city: SyncCity, page: number, options: FetchOptions = {}) {
    for (let attempt = 0; ; attempt++) {
      // Re-acquired on every attempt, so a retry queues behind the gate like
      // any other request rather than adding to the burst that caused the 429.
      await gate()
      try {
        const result = await fetchCityShowsPage(city, page, options)
        for (const show of result.shows) collected.set(show.id, show)
        return result
      } catch (err) {
        const status = err instanceof TicketmasterError ? err.status : 0

        // 429 means the limiter, not a broken query - the identical request
        // succeeds a moment later. Measured: one 429 across 259 requests at
        // 250ms spacing, and because a failed page aborts the rest of its
        // city, that single blip silently cost San Francisco 401 events.
        // Everything else (a bad city name, a revoked key) will fail again.
        if (status !== 429 || attempt >= MAX_RETRIES) throw err
        await sleep(RETRY_BACKOFF_MS * (attempt + 1))
      }
    }
  }

  // Each city is queried two ways - by name and by radius - because measured
  // against the live API neither finds what the other does. See FetchOptions
  // in lib/ticketmaster.ts for the numbers. Everything below treats a probe,
  // not a city, as the unit of work, so the two scopes share all the paging,
  // splitting and retry machinery.
  interface Probe { city: SyncCity; radiusMiles?: number }
  const probes: Probe[] = SYNC_CITIES.flatMap(city => [
    { city },
    { city, radiusMiles: RADIUS_MILES },
  ])
  const probeKey = (p: Probe) => `${label(p.city)}${p.radiusMiles ? ` r${p.radiusMiles}` : ''}`

  // ── Phase 1: the first page of every probe ─────────────────────────────────
  // Does double duty. It collects, and its totalElements is what tells us
  // whether this probe is being truncated - which is why the check costs no
  // request of its own.
  const firstPages = new Map<string, { totalPages: number; totalElements: number }>()

  const outOfTime = () => Date.now() - startedAt > FETCH_DEADLINE_MS

  await pool(probes, CONCURRENCY, async probe => {
    try {
      const result = await fetchPage(probe.city, 0, { radiusMiles: probe.radiusMiles })
      firstPages.set(probeKey(probe), result)
    } catch (err) {
      recordError(probe.city, err)
    }
  }, outOfTime)

  // ── Phase 2: everything the first page revealed ────────────────────────────
  // A task is "walk these pages", so the queue is flat and the pool can keep
  // all its workers busy rather than finishing one probe before starting the
  // next.
  interface Task { city: SyncCity; radiusMiles?: number; window?: DateWindow; pages: number[] }
  const tasks: Task[] = []

  for (const probe of probes) {
    const { city, radiusMiles } = probe
    const first = firstPages.get(probeKey(probe))
    if (!first) continue // its first page failed; already recorded

    if (first.totalElements > TM_RESULT_CAP) {
      // Over the ceiling, so phase 1 saw only the first 1000 of this city's
      // listings and the rest are unreachable by that query at any page
      // number. Re-ask in month-sized slices, each of which gets its own
      // 1000-result budget. The page already collected isn't wasted - the
      // slices re-return it and the map collapses the duplicate.
      //
      // Only a handful of probes need this (Las Vegas 2,806, New York 1,937,
      // Chicago 1,208 by name, plus the denser radius queries), which is why
      // it's driven by the observed total rather than run for everyone: the
      // rest would pay a dozen extra requests to learn nothing.
      console.log(`[sync-shows] ${probeKey(probe)} has ${first.totalElements} events (> ${TM_RESULT_CAP}); splitting by month`)
      for (const window of monthlyWindows(SPLIT_MONTHS)) {
        tasks.push({ city, radiusMiles, window, pages: Array.from({ length: MAX_PAGES_PER_CITY }, (_, i) => i) })
      }
    } else {
      const remaining = Math.min(first.totalPages, MAX_PAGES_PER_CITY) - 1
      if (remaining > 0) {
        tasks.push({ city, radiusMiles, pages: Array.from({ length: remaining }, (_, i) => i + 1) })
      }
    }
  }

  await pool(tasks, CONCURRENCY, async task => {
    for (const page of task.pages) {
      if (outOfTime()) return
      try {
        const result = await fetchPage(task.city, page, { window: task.window, radiusMiles: task.radiusMiles })
        // A windowed slice doesn't know its own length until its first page
        // comes back; stop rather than request empty pages to the cap.
        if (page + 1 >= result.totalPages) break
      } catch (err) {
        recordError(task.city, err)
        break
      }
    }
  })

  // Array.from rather than spread: tsconfig targets below es2015, where
  // spreading a Map iterator needs --downlevelIteration.
  const shows = Array.from(collected.values())
  const { upserted, failed } = await upsertShows(shows)

  // Pruned after the upsert so a show whose date moved is refreshed before
  // the window is applied, rather than being deleted and re-added.
  let pruned = 0
  try {
    pruned = await prunePastShows()
  } catch (err) {
    console.error('[sync-shows] prune failed:', err instanceof Error ? err.message : String(err))
  }

  // Artist photos: free ones from the events above first, then a capped
  // name lookup for logged artists still missing one. Neither is allowed to
  // fail the run - a missing photo only means the placeholder shows.
  let artistImagesSaved = 0
  let artistImageLookups = { looked: 0, found: 0 }
  try {
    artistImagesSaved = await saveHeadlinerImages(shows)
    artistImageLookups = await fillLoggedArtistImages()
  } catch (err) {
    console.error('[sync-shows] artist images failed:', err instanceof Error ? err.message : String(err))
  }

  const summary = {
    cities:      SYNC_CITIES.length,
    // True when fetching was cut short to guarantee the upsert ran. An
    // occasional one is the guard working; a run of them means the job has
    // outgrown its window and needs splitting across more than one cron.
    deadlineHit: Date.now() - startedAt > FETCH_DEADLINE_MS,
    cityErrors:  cityErrors.length,
    fetched:     shows.length,
    upserted,
    failed,
    pruned,
    artistImagesSaved,
    artistImagesLookedUp: artistImageLookups.looked,
    artistImagesFound:    artistImageLookups.found,
    durationMs:  Date.now() - startedAt,
  }
  console.log('[sync-shows] complete', summary)

  return NextResponse.json(summary)
}
