import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getAuthenticatedUserId } from '@/lib/apiAuth'
import { normalizePhoneNumber } from '@/lib/phone'
import { sendSms } from '@/lib/twilio'

const CODE_TTL_MS = 10 * 60 * 1000

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const phoneNumber = normalizePhoneNumber(body?.phoneNumber ?? '')
  if (!phoneNumber) {
    return NextResponse.json({ error: 'Enter a valid phone number.' }, { status: 400 })
  }

  // If this number is already verified on a *different* account, don't
  // let it be re-linked out from under that user.
  const { data: existing } = await supabaseAdmin()
    .from('profiles')
    .select('id')
    .eq('phone_number', phoneNumber)
    .eq('phone_verified', true)
    .neq('id', userId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'This phone number is already linked to another account.' }, { status: 409 })
  }

  const code = String(Math.floor(100000 + Math.random() * 900000))
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString()

  const { error: insertError } = await supabaseAdmin()
    .from('sms_verification_codes')
    .insert({ phone_number: phoneNumber, code, expires_at: expiresAt })

  if (insertError) {
    console.error('sms_verification_codes insert failed:', insertError.message)
    return NextResponse.json({ error: 'Could not generate a code. Try again.' }, { status: 500 })
  }

  try {
    await sendSms(phoneNumber, `Your Gigl verification code is ${code}. Enter it in the app to finish linking this number.`)
  } catch (err) {
    console.error('Twilio send-code failed:', err)
    return NextResponse.json({ error: 'Could not send the code. Check the number and try again.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
