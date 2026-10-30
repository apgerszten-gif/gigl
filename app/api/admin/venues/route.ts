import { NextRequest, NextResponse } from 'next/server'
import { refuseUnlessAdmin } from '@/lib/adminAuth'
import { readVenueSyncMode, readVenueSyncReport } from '@/lib/venues/settings'

// GET /api/admin/venues - the last venue sync's full per-venue report, for
// /admin/venues. The dashboard itself only polls the totals
// (/api/admin/stats), since this list runs to hundreds of rows.
export const dynamic    = 'force-dynamic'
export const fetchCache = 'default-no-store'

export async function GET(req: NextRequest) {
  const refused = await refuseUnlessAdmin(req)
  if (refused) return refused
  const [mode, report] = await Promise.all([readVenueSyncMode(), readVenueSyncReport()])
  return NextResponse.json({ mode, report })
}
