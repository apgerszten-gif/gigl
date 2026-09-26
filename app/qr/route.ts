import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isCountedHost } from '@/lib/visitor'

// GET /qr - where a QR code lands. Counts the scan, then sends the phone on
// to the feed tagged ?src=qr, so the visit it turns into is counted as well
// (components/VisitTracker.tsx).
//
// The codes already printed for CRSSD encode the bare gigl-review.vercel.app,
// which next.config.js rewrites to here. Anything printed from now on can
// encode gigl.space/qr directly.
//
// The scan is counted on the server before any page loads, so it includes
// people whose phone gave up on festival signal before the feed appeared -
// the gap between scans and visits is exactly them. Link-preview bots are
// left out. Each phone gets a random id in a cookie so a repeat scan can be
// told apart from a new person; nothing else about the phone is kept.

export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

const OLD_HOST = 'gigl-review.vercel.app'
const HOME     = 'https://www.gigl.space'
const COOKIE   = 'gigl_scanner'

const BOTS = /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|embedly|curl|wget/i
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  // Only the old address is sent across to the new one. Anywhere else the
  // redirect stays on the origin that answered, so /qr works in local dev
  // and on preview deployments.
  const origin = req.headers.get('host') === OLD_HOST ? HOME : req.nextUrl.origin
  const res = NextResponse.redirect(new URL('/feed?src=qr', origin), 307)

  if (BOTS.test(req.headers.get('user-agent') ?? '')) return res
  if (!isCountedHost(req.headers.get('host'))) return res
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[qr] SUPABASE_SERVICE_ROLE_KEY is not set; scan not recorded')
    return res
  }

  let scanner = req.cookies.get(COOKIE)?.value
  if (!scanner || !UUID.test(scanner)) {
    scanner = crypto.randomUUID()
    res.cookies.set(COOKIE, scanner, {
      maxAge: 60 * 60 * 24 * 365, httpOnly: true, secure: true, sameSite: 'lax', path: '/',
    })
  }

  // Awaited, because a function can be frozen as soon as it has responded -
  // but capped, so a slow database costs a scan at most a second and never
  // the redirect itself.
  const insert = supabaseAdmin()
    .from('site_events')
    .insert({ kind: 'scan', visitor_id: scanner, source: 'qr' })
    .then(({ error }) => { if (error) console.error('[qr] scan not recorded:', error.message) })
  await Promise.race([insert, new Promise(resolve => setTimeout(resolve, 1000))])

  return res
}
