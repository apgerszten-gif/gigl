import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { refuseUnlessAdmin } from '@/lib/adminAuth'
import { saveVenueSyncMode } from '@/lib/venues/settings'
import { parseWrappedPopup } from '@/lib/wrapped/popup'

// POST /api/admin/settings — the admin page's switches. app_settings has no
// client write policy, so this route, under the service role, is the only
// way to change them.
//
//   { signupMethod: 'phone' | 'email' }  the sign-up screens read it on each
//                                        open (lib/signupMethod.ts), so it
//                                        takes effect without a deploy
//   { venueSyncMode: 'dry' | 'live' }    whether the nightly venue sync
//                                        writes (lib/venues/settings.ts)
//   { theme: 'light' | 'dark' }          the look of the whole app, applied on
//                                        each load (lib/theme-setting.ts)
//   { wrappedPopup: true | false }       the Wrapped popup on the Feed
//                                        (lib/wrapped/popup.ts)

export async function POST(req: NextRequest) {
  const refused = await refuseUnlessAdmin(req)
  if (refused) return refused

  const body = await req.json().catch(() => null)

  if (body?.wrappedPopup !== undefined) {
    if (typeof body.wrappedPopup !== 'boolean') {
      return NextResponse.json({ error: 'wrappedPopup must be true or false.' }, { status: 400 })
    }
    // Switching on starts the season now; it runs to the end of this
    // December (lib/wrapped/popup.ts). Switching off keeps the date, so the
    // admin page can still show the numbers from the run.
    const { data: current } = await supabaseAdmin()
      .from('app_settings').select('value').eq('key', 'wrapped_popup').maybeSingle()
    const previous = parseWrappedPopup(current?.value)
    const value = body.wrappedPopup
      ? { on: true, since: new Date().toISOString() }
      : { on: false, since: previous.since }
    const { error } = await supabaseAdmin()
      .from('app_settings')
      .upsert({ key: 'wrapped_popup', value, updated_at: new Date().toISOString() })
    if (error) {
      console.error('[admin/settings] saving the Wrapped switch failed:', error)
      return NextResponse.json({ error: "Couldn't save the switch." }, { status: 500 })
    }
    return NextResponse.json({ wrappedPopup: value })
  }

  if (body?.theme !== undefined) {
    if (body.theme !== 'light' && body.theme !== 'dark') {
      return NextResponse.json({ error: "theme must be 'light' or 'dark'." }, { status: 400 })
    }
    const { error } = await supabaseAdmin()
      .from('app_settings')
      .upsert({ key: 'theme', value: body.theme, updated_at: new Date().toISOString() })
    if (error) {
      console.error('[admin/settings] saving the theme failed:', error)
      return NextResponse.json({ error: "Couldn't save the switch." }, { status: 500 })
    }
    return NextResponse.json({ theme: body.theme })
  }

  if (body?.venueSyncMode !== undefined) {
    const mode = body.venueSyncMode
    if (mode !== 'dry' && mode !== 'live') {
      return NextResponse.json({ error: "venueSyncMode must be 'dry' or 'live'." }, { status: 400 })
    }
    try {
      await saveVenueSyncMode(mode)
    } catch (err) {
      console.error('[admin/settings] saving venue sync mode failed:', err)
      return NextResponse.json({ error: "Couldn't save the switch." }, { status: 500 })
    }
    return NextResponse.json({ venueSyncMode: mode })
  }

  const method = body?.signupMethod
  if (method !== 'phone' && method !== 'email') {
    return NextResponse.json({ error: "signupMethod must be 'phone' or 'email'." }, { status: 400 })
  }

  const { error } = await supabaseAdmin()
    .from('app_settings')
    .upsert({ key: 'signup_method', value: method, updated_at: new Date().toISOString() })
  if (error) {
    console.error('[admin/settings] saving failed:', error)
    return NextResponse.json({ error: "Couldn't save the switch. Has the app_settings table been created?" }, { status: 500 })
  }
  return NextResponse.json({ signupMethod: method })
}
