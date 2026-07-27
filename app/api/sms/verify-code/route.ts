import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { getAuthenticatedUserId } from '@/lib/apiAuth'
import { normalizePhoneNumber } from '@/lib/phone'
import { sendSms } from '@/lib/twilio'

const WELCOME_MESSAGE = [
  'Welcome to Gigl SMS scoring! 🎪',
  'Text: Artist Performance Venue Vibe (1-5 each)',
  'e.g. Tate McRae 5 4 5',
  "We'll log it and text back a confirmation. Reply STOP to opt out anytime.",
].join('\n')

export async function POST(req: NextRequest) {
  const userId = await getAuthenticatedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json().catch(() => null)
  const phoneNumber = normalizePhoneNumber(body?.phoneNumber ?? '')
  const code = typeof body?.code === 'string' ? body.code.trim() : ''
  if (!phoneNumber || !code) {
    return NextResponse.json({ error: 'Missing phone number or code.' }, { status: 400 })
  }

  const { data: codeRow } = await supabaseAdmin
    .from('sms_verification_codes')
    .select('*')
    .eq('phone_number', phoneNumber)
    .eq('code', code)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!codeRow) {
    return NextResponse.json({ error: 'Incorrect code.' }, { status: 400 })
  }
  if (new Date(codeRow.expires_at).getTime() < Date.now()) {
    return NextResponse.json({ error: 'That code expired — request a new one.' }, { status: 400 })
  }

  const { error: updateError } = await supabaseAdmin
    .from('profiles')
    .update({ phone_number: phoneNumber, phone_verified: true })
    .eq('id', userId)

  if (updateError) {
    // Most likely the unique constraint on phone_number — someone else
    // verified this exact number in the moments between send-code and here.
    console.error('profiles phone update failed:', updateError.message)
    return NextResponse.json({ error: 'This phone number is already linked to another account.' }, { status: 409 })
  }

  await supabaseAdmin.from('sms_verification_codes').delete().eq('phone_number', phoneNumber)

  try {
    await sendSms(phoneNumber, WELCOME_MESSAGE)
  } catch (err) {
    console.error('Twilio welcome message failed:', err)
    // Don't fail verification just because the welcome text didn't send.
  }

  return NextResponse.json({ ok: true })
}
