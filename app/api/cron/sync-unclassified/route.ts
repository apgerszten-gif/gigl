import { NextRequest, NextResponse } from 'next/server'
import { SYNC_CITIES, type SyncCity } from '@/lib/shows/cities'
import { fetchCityShowsPage, TicketmasterError, type FetchOptions, type SyncShow } from '@/lib/ticketmaster'
import { knownMusicVenues, upsertShows } from '@/lib/shows/repository'
import { saveHeadlinerImages } from '@/lib/shows/artistImageSync'
import { createRateGate, pool } from '@/lib/shows/pacing'
import { nameKey } from '@/lib/nameKey'

// The second nightly Ticketmaster pass (09:30 UTC, after sync-shows): events
// Ticketmaster left without a category. sync-shows asks only for music, and
// a real share of concerts are filed under the "Undefined" segment instead,
// often ones Ticketmaster takes in from partner ticketing. Measured: four of
// nimino's late-2026 dates (Roseland, Showbox SODO, Mission Ballroom,
// Variety Playhouse) and Ninajirachi at The Fonda were invisible to Gigl for
// this reason alone. Its own run because sync-shows has no time to spare.
//
// The segment also holds comedy, screenings, stadium tours and parking, so
// an event is kept only at a venue that already has music-category shows in
// the catalogue, and not when its title reads as something else.

export const maxDuration = 300
export const dynamic     = 'force-dynamic'

// Same pacing as sync-shows: 3.3 requests a second, six in flight.
const REQUEST_SPACING_MS = 300
const CONCURRENCY = 6
const MAX_RETRIES = 3
const RETRY_BACKOFF_MS = 1000
const RADIUS_MILES = 25
// The segment is small outside New York (about 140 events in LA, 180 in
// Chicago), so two pages of 200 cover nearly every city; New York's 2,000
// are mostly one hotel's comedy room.
const MAX_PAGES = 2
const FETCH_DEADLINE_MS = 230_000

// Titles that are plainly not a concert, at a venue that also hosts them.
const NOT_A_SHOW = /\b(comedy|comedian|stand[- ]?up|improv|screening|drive-in|movie night|podcast|venue tours?|stadium tours?|arena tours?|parking|gift card|voucher|trivia|bingo|wrestling|boxing|ufc|magic show|lecture|book signing|conversation|touring|musical|ballet|nutcracker|prime minister|spoken word|closed for)\b/i
// Rooms that are something else first. Comedy clubs list the odd music
// night, so they pass the music-venue test, and then every set they host
// would too: measured, Hollywood Improv and Brea Improv were 140 of the 290
// events LA and Denver kept before this rule.
const NOT_A_ROOM = /\b(improv|comedy|laugh(s|ter)?|funny|punch ?line|stand ?up|playhouse|cinema|drive-in)\b/i

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Sync is not configured.' }, { status: 500 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const outOfTime = () => Date.now() - startedAt > FETCH_DEADLINE_MS
  const gate = createRateGate(REQUEST_SPACING_MS)
  const collected = new Map<string, SyncShow>()
  const cityErrors = new Set<string>()

  async function fetchPage(city: SyncCity, page: number, options: FetchOptions) {
    for (let attempt = 0; ; attempt++) {
      await gate()
      try {
        const result = await fetchCityShowsPage(city, page, { ...options, unclassified: true })
        for (const show of result.shows) collected.set(show.id, show)
        return result
      } catch (err) {
        const status = err instanceof TicketmasterError ? err.status : 0
        if (status !== 429 || attempt >= MAX_RETRIES) throw err
        await sleep(RETRY_BACKOFF_MS * (attempt + 1))
      }
    }
  }

  const probes = SYNC_CITIES.flatMap(city => [{ city }, { city, radiusMiles: RADIUS_MILES }])
  await pool(probes, CONCURRENCY, async probe => {
    for (let page = 0; page < MAX_PAGES; page++) {
      if (outOfTime()) return
      try {
        const result = await fetchPage(probe.city, page, { radiusMiles: probe.radiusMiles })
        if (page + 1 >= result.totalPages) return
      } catch (err) {
        console.error(`[sync-unclassified] ${probe.city.city} failed:`, err instanceof Error ? err.message : err)
        cityErrors.add(`${probe.city.city}, ${probe.city.stateCode}`)
        return
      }
    }
  }, outOfTime)

  const candidates = Array.from(collected.values())
  const titled = candidates.filter(s => !NOT_A_SHOW.test(s.artist) && !!s.isoDate)
  let known = new Set<string>()
  try {
    known = await knownMusicVenues(titled.map(s => ({ venue: s.venue, city: s.city, state: s.state })))
  } catch (err) {
    console.error('[sync-unclassified] venue lookup failed:', err instanceof Error ? err.message : err)
  }
  const kept = titled.filter(s => !NOT_A_ROOM.test(s.venue) && known.has(`${nameKey(s.venue)}|${nameKey(s.city)}|${s.state}`))

  const { upserted, failed } = await upsertShows(kept)
  let artistImagesSaved = 0
  try {
    artistImagesSaved = await saveHeadlinerImages(kept)
  } catch (err) {
    console.error('[sync-unclassified] artist images failed:', err instanceof Error ? err.message : err)
  }

  const summary = {
    fetched:      candidates.length,
    notAShow:     candidates.length - titled.length,
    notMusicRoom: titled.length - kept.length,
    kept:         kept.length,
    upserted,
    failed,
    artistImagesSaved,
    cityErrors:   cityErrors.size,
    deadlineHit:  outOfTime(),
    durationMs:   Date.now() - startedAt,
  }
  console.log('[sync-unclassified] complete', summary)
  return NextResponse.json(summary)
}
