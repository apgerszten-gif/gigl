import { NextRequest, NextResponse } from 'next/server'
import { refuseUnlessAdmin } from '@/lib/adminAuth'
import { syncVenues } from '@/lib/venues/sync'
import { readVenueSyncMode, saveVenueSyncReport } from '@/lib/venues/settings'

// Nightly read of independent venues' own websites (lib/venues/list.ts),
// adding the shows Ticketmaster doesn't carry. Scheduled from vercel.json an
// hour after the Ticketmaster sync, so its dedupe sees that night's rows.
//
// Kept apart from /api/cron/sync-shows on purpose: that run is already close
// to its own time limit (see CLAUDE.md), and a slow venue site must never be
// able to cost the Ticketmaster catalogue a night.
//
// It writes only when the switch on /admin says "live" (app_settings
// venue_sync_mode, dry by default). Either way it saves a per-venue report
// there, so a dry run is how a new venue list gets checked.
//
// Callers: Vercel Cron (Bearer CRON_SECRET), or an admin's "Run now" on
// /admin, which can add ?dry=1 to force a dry run whatever the switch says.
export const maxDuration = 300
export const dynamic     = 'force-dynamic'
export const fetchCache  = 'default-no-store'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const fromCron = !!secret && req.headers.get('authorization') === `Bearer ${secret}`
  if (!fromCron) {
    const refused = await refuseUnlessAdmin(req)
    if (refused) return refused
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[sync-venues] SUPABASE_SERVICE_ROLE_KEY is not set; refusing to run')
    return NextResponse.json({ error: 'Sync is not configured.' }, { status: 500 })
  }

  const forceDry = req.nextUrl.searchParams.get('dry') === '1'
  const mode = forceDry ? 'dry' : await readVenueSyncMode()

  const report = await syncVenues(mode)
  await saveVenueSyncReport(report)
  console.log('[sync-venues] complete', { mode: report.mode, durationMs: report.durationMs, deadlineHit: report.deadlineHit, ...report.totals })

  return NextResponse.json({ ranAt: report.ranAt, mode: report.mode, durationMs: report.durationMs, totals: report.totals })
}
