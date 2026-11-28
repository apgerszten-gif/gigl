import { NextRequest, NextResponse } from 'next/server'
import { EXTRA_CITIES, SWEEP_GROUPS, SWEEP_REGIONS, type SweepRegion, type SyncCity } from '@/lib/shows/cities'
import { fetchCityShowsPage, isRetryable, monthlyWindows, splitWindow, TM_RESULT_CAP, type FetchOptions, type SyncShow } from '@/lib/ticketmaster'
import { deleteShowsById, upsertShows } from '@/lib/shows/repository'
import { saveHeadlinerImages } from '@/lib/shows/artistImageSync'
import { createRateGate, pool } from '@/lib/shows/pacing'
import { recordSyncFinish, recordSyncStart } from '@/lib/shows/syncStatus'
import { readSweepMode, saveSweepReport, type SweepReport } from '@/lib/shows/sweepSettings'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// The third nightly Ticketmaster pass (10:30 UTC, after the venue sync): shows
// the 148 metros of sync-shows can't reach. See docs/show-coverage-audit.md,
// gap 4. It does two things, each of which sync-shows has no time for:
//
//  1. EXTRA_CITIES, every night: ~46 markets and destinations that have no
//     entry in SYNC_CITIES (Indio for Coachella, The Gorge, Bethel Woods,
//     Foxwoods, Myrtle Beach, Greensboro, Saskatoon...), each asked about by
//     name and by a 25-mile radius, exactly as sync-shows does.
//  2. The state sweep: "every music event whose venue is in this state or
//     province", with no city and no radius, so it catches any venue the
//     lists missed, including the ones Ticketmaster lists with no
//     coordinates. A third of the regions (SWEEP_GROUPS) are done each night.
//
// It writes only when app_settings says `state_sweep_mode` is "live" (see
// lib/shows/sweepSettings.ts for the SQL). Until then it fetches, counts how
// many of the events the catalogue does not already have, and saves that as a
// report, so the effect is known before a single row is written.
//
// Timing is NOT measured: this was written without Ticketmaster access. It
// is its own function with its own 300s because sync-shows' 217s fetch has no
// room, and it keeps the same rate gate (300ms between request starts) and
// a fetch deadline so the report and upsert always happen. Read durationMs
// and deadlineHit in `app_settings['sync_status_sync-sweep']` after the first
// runs, and re-time before adding regions or cities.

export const maxDuration = 300
export const dynamic     = 'force-dynamic'

const REQUEST_SPACING_MS = 300
const CONCURRENCY        = 6
const MAX_RETRIES        = 3
const RETRY_BACKOFF_MS   = 1000
const MAX_PAGES          = 5
const RADIUS_MILES       = 25
const SPLIT_MONTHS       = 12
// Leaves room after fetching for the new-event count (dry run) or the upsert.
const FETCH_DEADLINE_MS  = 200_000
const SAMPLE_SIZE        = 15

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: 'Sync is not configured.' }, { status: 500 })
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  await recordSyncStart('sync-sweep', startedAt)
  const mode = await readSweepMode()
  const outOfTime = () => Date.now() - startedAt > FETCH_DEADLINE_MS
  const gate = createRateGate(REQUEST_SPACING_MS)

  const collected    = new Map<string, SyncShow>()
  const errors       = new Set<string>()
  const emptyProbes  = new Set<string>()
  const cappedProbes = new Set<string>()

  async function fetchPage(city: SyncCity, page: number, options: FetchOptions) {
    for (let attempt = 0; ; attempt++) {
      await gate()
      try {
        const result = await fetchCityShowsPage(city, page, options)
        for (const show of result.shows) collected.set(show.id, show)
        return result
      } catch (err) {
        if (!isRetryable(err) || attempt >= MAX_RETRIES) throw err
        await sleep(RETRY_BACKOFF_MS * (attempt + 1))
      }
    }
  }

  // One question, and everything it takes to answer it in full: a first page
  // whose totalElements says whether this query is being truncated at 1,000;
  // if so, month slices; a slice still over the cap is halved by days (the
  // same rule as sync-shows), down to a single day, which is only counted.
  async function walk(city: SyncCity, options: FetchOptions, label: string): Promise<void> {
    if (outOfTime()) return
    let first: Awaited<ReturnType<typeof fetchPage>>
    try {
      first = await fetchPage(city, 0, options)
    } catch (err) {
      console.error(`[sync-sweep] ${label} failed:`, err instanceof Error ? err.message : err)
      if (errors.size < 30) errors.add(label)
      return
    }
    if (first.totalElements === 0 && !options.window) emptyProbes.add(label)

    if (first.totalElements > TM_RESULT_CAP) {
      if (!options.window) {
        await Promise.all(monthlyWindows(SPLIT_MONTHS).map(window => walk(city, { ...options, window }, label)))
        return
      }
      const halves = splitWindow(options.window)
      if (halves) {
        for (const half of halves) await walk(city, { ...options, window: half }, label)
        return
      }
      cappedProbes.add(`${label} ${options.window.from}`)
    }

    for (let page = 1; page < Math.min(first.totalPages, MAX_PAGES); page++) {
      if (outOfTime()) return
      try {
        await fetchPage(city, page, options)
      } catch (err) {
        console.error(`[sync-sweep] ${label} p${page} failed:`, err instanceof Error ? err.message : err)
        if (errors.size < 30) errors.add(label)
        return
      }
    }
  }

  // Tonight's third of the regions. The day number, not the date, so the
  // groups rotate without a gap at month ends.
  const group = Math.floor(startedAt / 86_400_000) % SWEEP_GROUPS
  const regions: SweepRegion[] = SWEEP_REGIONS.filter((_, i) => i % SWEEP_GROUPS === group)

  type Probe = { city: SyncCity; options: FetchOptions; label: string }
  const probes: Probe[] = [
    // The regions first: they are the bigger questions and the point of the job.
    ...regions.map<Probe>(r => ({
      city: { city: r.stateCode, stateCode: r.stateCode, countryCode: r.countryCode, lat: 0, lng: 0 },
      options: { region: true },
      label: `state ${r.countryCode === 'CA' ? 'CA-' : ''}${r.stateCode}`,
    })),
    ...EXTRA_CITIES.flatMap<Probe>(city => [
      { city, options: {}, label: `${city.city}, ${city.stateCode}` },
      { city, options: { radiusMiles: RADIUS_MILES }, label: `${city.city}, ${city.stateCode} r${RADIUS_MILES}` },
    ]),
  ]

  await pool(probes, CONCURRENCY, probe => walk(probe.city, probe.options, probe.label), outOfTime)
  const deadlineHit = outOfTime()

  const everything = Array.from(collected.values())
  const cancelledIds = everything.filter(s => s.cancelled).map(s => s.id)
  const shows = everything.filter(s => !s.cancelled)

  // What does the catalogue already hold of these? sync-shows stores most of
  // what this job finds again, with a metro centre standing in for a venue
  // that has no coordinates. Writing the sweep's version over it would put
  // null coordinates and a different metro on those rows until the next
  // 09:00 run, every day, so a row the catalogue already has from another
  // job is left alone (sync-shows refreshes it nightly anyway). The sweep
  // writes events nothing else has seen, and refreshes its own earlier rows.
  const ownMetros = new Set(EXTRA_CITIES.map(c => `${c.city}, ${c.stateCode}`))
  const isOwn = (metro: string | null) => !!metro && (metro.startsWith('State sweep') || ownMetros.has(metro))

  let newToCatalogue: number | null = null
  let sample: string[] = []
  let upserted = 0
  let failed = 0
  let toWrite: SyncShow[] = []

  try {
    const known = new Map<string, string | null>()
    const chunks: string[][] = []
    for (let i = 0; i < shows.length; i += 100) chunks.push(shows.slice(i, i + 100).map(s => s.id))
    await pool(chunks, 5, async ids => {
      const { data, error } = await supabaseAdmin().from('shows').select('id, metro').in('id', ids)
      if (error) throw new Error(error.message)
      for (const row of data ?? []) known.set(row.id as string, (row.metro as string | null) ?? null)
    })
    const fresh = shows.filter(s => !known.has(s.id))
    newToCatalogue = fresh.length
    sample = fresh.slice(0, SAMPLE_SIZE).map(s => `${s.artist} · ${s.venue} · ${s.city}, ${s.state} · ${s.isoDate ?? 'no date'}`)
    toWrite = shows.filter(s => !known.has(s.id) || isOwn(known.get(s.id) ?? null))
  } catch (err) {
    // Without knowing what is already there, write nothing: better a night
    // without the sweep than overwriting rows it should leave alone.
    console.error('[sync-sweep] reading the catalogue failed:', err instanceof Error ? err.message : err)
    errors.add('reading the catalogue')
  }

  if (mode === 'live' && toWrite.length > 0) {
    ;({ upserted, failed } = await upsertShows(toWrite))
    try {
      await deleteShowsById(cancelledIds, 'ticketmaster')
      await saveHeadlinerImages(toWrite)
    } catch (err) {
      console.error('[sync-sweep] clean-up failed:', err instanceof Error ? err.message : err)
    }
  }

  const report: SweepReport = {
    ranAt: new Date(startedAt).toISOString(),
    mode,
    group,
    regions: regions.map(r => `${r.countryCode === 'CA' ? 'CA-' : ''}${r.stateCode}`),
    extraCities: EXTRA_CITIES.length,
    fetched: shows.length,
    newToCatalogue,
    cancelled: cancelledIds.length,
    upserted,
    failed,
    errors: Array.from(errors),
    emptyProbes: Array.from(emptyProbes),
    cappedProbes: Array.from(cappedProbes),
    deadlineHit,
    durationMs: Date.now() - startedAt,
    sample,
  }
  console.log('[sync-sweep] complete', { ...report, sample: undefined })
  await saveSweepReport(report)
  await recordSyncFinish('sync-sweep', startedAt, { ...report, sample: undefined })
  return NextResponse.json(report)
}
