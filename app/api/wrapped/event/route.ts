import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isCountedHost } from '@/lib/visitor'
import { WRAPPED_STEPS, type WrappedStep } from '@/lib/wrapped/types'

// POST /api/wrapped/event - one step through the Wrapped popup (saw it,
// added screenshots, logged a show, signed up), for the funnel on the admin
// page. A site_events row of kind 'wrapped' with the step as its source, the
// same shape as a visit (app/api/visits). Production hosts only, like
// visits, and written with the service role because site_events has no
// client policies.
//
// Needs the 'wrapped' kind added to site_events' check (end of
// supabase-schema.sql). Until that's run, inserts fail and are only logged.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return new NextResponse(null, { status: 204 })
  if (!isCountedHost(req.headers.get('host'))) return new NextResponse(null, { status: 204 })

  const body = await req.json().catch(() => null) as { visitorId?: unknown; step?: unknown } | null
  const visitorId = typeof body?.visitorId === 'string' && UUID.test(body.visitorId) ? body.visitorId : null
  const step = WRAPPED_STEPS.includes(body?.step as WrappedStep) ? body!.step as WrappedStep : null
  if (!visitorId || !step) return NextResponse.json({ error: 'Bad step.' }, { status: 400 })

  const { error } = await supabaseAdmin()
    .from('site_events')
    .insert({ kind: 'wrapped', visitor_id: visitorId, source: step })
  if (error) console.error('[wrapped/event] not recorded:', error.message)

  return new NextResponse(null, { status: 204 })
}
