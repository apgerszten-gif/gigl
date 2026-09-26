import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { refuseUnlessAdmin } from '@/lib/adminAuth'

// POST /api/admin/settings { signupMethod: 'phone' | 'email' } — the admin
// page's sign-up switch. app_settings has no client write policy, so this
// route, under the service role, is the only way to change it. The sign-up
// screens read it on each open (lib/signupMethod.ts), so it takes effect
// without a deploy.

export async function POST(req: NextRequest) {
  const refused = await refuseUnlessAdmin(req)
  if (refused) return refused

  const body = await req.json().catch(() => null)
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
