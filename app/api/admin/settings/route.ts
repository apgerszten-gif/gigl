import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { refuseUnlessAdmin } from '@/lib/adminAuth'

// POST /api/admin/settings — the admin page's switches, one per request:
//   { signupMethod: 'phone' | 'email' }   who signs up how
//   { siteMode: 'auto' | 'normal' | 'crssd' }
//                                         the front door, see lib/siteMode.ts
// app_settings has no client write policy, so this route, under the service
// role, is the only way to change them. The screens read them each time they
// open (/api/settings via lib/appSettings.ts) and the QR redirect on every
// scan (app/qr), so a switch takes effect without a deploy.

const SWITCHES = {
  signupMethod: { key: 'signup_method', values: ['phone', 'email'] },
  siteMode:     { key: 'site_mode',     values: ['auto', 'normal', 'crssd'] },
} as const

export async function POST(req: NextRequest) {
  const refused = await refuseUnlessAdmin(req)
  if (refused) return refused

  const body = await req.json().catch(() => null)
  const name = (Object.keys(SWITCHES) as (keyof typeof SWITCHES)[]).find(n => body?.[n] !== undefined)
  const value = name ? body[name] : undefined
  if (!name || !(SWITCHES[name].values as readonly string[]).includes(value)) {
    return NextResponse.json(
      { error: "Send one of signupMethod ('phone' or 'email') or siteMode ('auto', 'normal' or 'crssd')." },
      { status: 400 },
    )
  }

  const { error } = await supabaseAdmin()
    .from('app_settings')
    .upsert({ key: SWITCHES[name].key, value, updated_at: new Date().toISOString() })
  if (error) {
    console.error('[admin/settings] saving failed:', error)
    return NextResponse.json({ error: "Couldn't save the switch." }, { status: 500 })
  }
  return NextResponse.json({ [name]: value })
}
