import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { VISIT_SOURCES, isCountedHost, type VisitSource } from '@/lib/visitor'

// POST /api/visits - one row per time somebody opens the site, sent by
// components/VisitTracker.tsx. With /qr's scans and the signup_source on
// each account, this is the middle of the funnel: scanned, opened, signed up.
// See the analytics block at the end of supabase-schema.sql.
//
// Written with the service role: site_events has no client policies at all,
// so the only way in is through the checks below.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[visits] SUPABASE_SERVICE_ROLE_KEY is not set; visit not recorded')
    return new NextResponse(null, { status: 204 })
  }

  const body = await req.json().catch(() => null) as { visitorId?: unknown; source?: unknown } | null
  const visitorId = typeof body?.visitorId === 'string' && UUID.test(body.visitorId) ? body.visitorId : null
  const source = VISIT_SOURCES.includes(body?.source as VisitSource) ? body!.source as VisitSource : null
  if (!visitorId || !source) return NextResponse.json({ error: 'Bad visit.' }, { status: 400 })
  if (!isCountedHost(req.headers.get('host'))) return new NextResponse(null, { status: 204 })

  const { error } = await supabaseAdmin()
    .from('site_events')
    .insert({ kind: 'visit', visitor_id: visitorId, source })
  if (error) console.error('[visits] visit not recorded:', error.message)

  return new NextResponse(null, { status: 204 })
}
