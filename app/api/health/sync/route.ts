import { NextResponse } from 'next/server'
import { readSyncStatus, staleHours, type SyncJob } from '@/lib/shows/syncStatus'

// A page for a free uptime monitor (UptimeRobot, Better Stack, ...): 200 while
// the nightly Ticketmaster syncs are finishing, 503 when one hasn't finished
// in 36 hours (a missed or killed run, which CLAUDE.md calls a permanent hole)
// or has never recorded a run. It reveals only job names and ages.
//
// Reads app_settings, written by the jobs themselves (lib/shows/syncStatus.ts).
// Until the first nightly run after this deploys there is nothing to read and
// it answers 503 "never ran", which is accurate.
export const dynamic    = 'force-dynamic'
export const fetchCache = 'default-no-store'

const MAX_AGE_HOURS = 36
const JOBS: SyncJob[] = ['sync-shows', 'sync-unclassified', 'sync-sweep']

export async function GET() {
  try {
    const jobs: Record<string, { ageHours: number | null; ok: boolean; deadlineHit?: boolean }> = {}
    for (const job of JOBS) {
      const status = await readSyncStatus(job)
      const age = staleHours(status)
      jobs[job] = {
        ageHours: age === null ? null : Math.round(age * 10) / 10,
        ok: age !== null && age <= MAX_AGE_HOURS,
        deadlineHit: typeof status?.summary?.deadlineHit === 'boolean' ? status.summary.deadlineHit : undefined,
      }
    }
    const ok = Object.values(jobs).every(j => j.ok)
    return NextResponse.json({ ok, maxAgeHours: MAX_AGE_HOURS, jobs }, { status: ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ok: false, error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } })
  }
}
