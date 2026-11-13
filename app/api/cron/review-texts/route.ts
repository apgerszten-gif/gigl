import { NextRequest, NextResponse } from 'next/server'
import { refuseUnlessAdmin } from '@/lib/adminAuth'
import { readReviewTextsMode, runReviewTexts, saveReviewTextsReport } from '@/lib/reviewTexts'

// GET /api/cron/review-texts - the morning-after "How was it?" texts for
// saved shows (lib/reviewTexts.ts). Daily at 17:00 UTC, mid-morning across
// the US. Callers: Vercel Cron (Bearer CRON_SECRET), or an admin's "Check
// now" on /admin, which never sends (?dry=1). Sends only when /admin's
// switch says Live and Prelude is configured.

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
    return NextResponse.json({ error: 'Review texts are not configured.' }, { status: 500 })
  }

  const dry = req.nextUrl.searchParams.get('dry') === '1'
  const send = !dry && (await readReviewTextsMode()) === 'live'
  const report = await runReviewTexts(send)
  await saveReviewTextsReport(report)
  console.log('[review-texts] complete', report)
  return NextResponse.json(report)
}
