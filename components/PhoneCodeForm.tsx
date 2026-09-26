'use client'

import { useEffect, useState } from 'react'
import type { AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { formatPhoneForDisplay, isNorthAmericanNumber, normalizePhoneNumber } from '@/lib/phone'
import { signupMetadata } from '@/lib/visitor'
import { ErrorNote, Field, btnPrimary, fieldInput } from '@/components/ui'

// Signing in by text, shared by /auth and the sign-up sheet: a phone number,
// then the code Supabase texts to it. The same two steps make a new account
// or sign a returning one back in. Supabase sends the text through its Send
// SMS hook, which points at Prelude (see CLAUDE.md).
export type PhoneStep = 'phone' | 'code'

const CODE_LENGTH = 6
// Supabase won't send the same number another code within 60 seconds.
const RESEND_SECONDS = 60

// Outside production, errors also show Supabase's own message, so a
// texting setup problem can be read straight off the preview.
const SHOW_ERROR_DETAILS = process.env.NEXT_PUBLIC_VERCEL_ENV !== 'production'

function withDetails(text: string, error: AuthError | null): string {
  return SHOW_ERROR_DETAILS && error ? `${text} (${error.message})` : text
}

const codeInput =
  'w-full bg-transparent font-display text-2xl font-bold tracking-[0.4em] text-ink placeholder:text-ink-faint focus:outline-none'
const textLink = 'text-[12px] font-semibold text-accent disabled:text-ink-faint'

function sendErrorText(error: AuthError): string {
  if (error.code === 'over_sms_send_rate_limit' || error.code === 'over_request_rate_limit') {
    return 'Too many codes sent. Wait a minute and try again.'
  }
  return "We couldn't send a text just now. Try again in a minute."
}

export function PhoneCodeForm({ onStepChange, onVerified }: {
  onStepChange?: (step: PhoneStep) => void
  // Called once the code checks out. The form stays in its loading state:
  // the caller moves on, to another page, the username step, or whatever
  // the visitor was doing before the sheet opened.
  onVerified: (userId: string) => void | Promise<void>
}) {
  const supabase = createClient()

  const [step, setStep]             = useState<PhoneStep>('phone')
  const [phoneInput, setPhoneInput] = useState('')
  const [phone, setPhone]           = useState('') // the number the code went to
  const [code, setCode]             = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [cooldown, setCooldown]     = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function switchStep(next: PhoneStep) {
    setStep(next)
    setError(null)
    onStepChange?.(next)
  }

  async function sendCode(to: string) {
    setError(null)
    setLoading(true)
    // The metadata only lands on a new account (Supabase ignores it when
    // signing an existing one in): which door they came in by, for the QR
    // funnel. See lib/visitor.ts.
    const { error: sendError } = await supabase.auth.signInWithOtp({
      phone: to, options: { data: signupMetadata() },
    })
    setLoading(false)
    if (sendError) {
      console.error('[auth] sending code failed:', sendError)
      setError(withDetails(sendErrorText(sendError), sendError))
      return
    }
    setPhone(to)
    setCode('')
    switchStep('code')
    setCooldown(RESEND_SECONDS)
  }

  function submitPhone(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    const normalized = normalizePhoneNumber(phoneInput)
    if (!normalized || !isNorthAmericanNumber(normalized)) {
      setError('Enter a US or Canadian mobile number.')
      return
    }
    sendCode(normalized)
  }

  async function verifyCode(token: string) {
    setError(null)
    setLoading(true)
    const { data, error: verifyError } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' })
    if (verifyError || !data.user) {
      setError(withDetails("That code didn't work or has expired. Check it, or send a new one.", verifyError))
      setLoading(false)
      return
    }
    await onVerified(data.user.id)
  }

  // A code autofilled from the text arrives all at once, so check it as
  // soon as it's complete. No maxLength on the input: it would cut a pasted
  // "123-456" down to "123-45" before the dash is stripped.
  function changeCode(value: string) {
    const digits = value.replace(/\D/g, '').slice(0, CODE_LENGTH)
    setCode(digits)
    if (digits.length === CODE_LENGTH && !loading) verifyCode(digits)
  }

  function submitCode(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    if (code.length !== CODE_LENGTH) { setError(`Enter the ${CODE_LENGTH}-digit code from the text.`); return }
    verifyCode(code)
  }

  if (step === 'phone') {
    return (
      <form onSubmit={submitPhone} className="flex flex-col gap-2.5">
        <Field label="Phone number">
          <input
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phoneInput}
            onChange={e => setPhoneInput(e.target.value)}
            placeholder="(555) 123-4567"
            className={fieldInput}
          />
        </Field>

        {error && <ErrorNote>{error}</ErrorNote>}

        <button type="submit" disabled={loading} className={`${btnPrimary} w-full mt-1 py-4 text-xs`}>
          {loading ? 'Sending…' : 'Text me a code'}
        </button>
        <p className="px-2 text-center text-[11px] leading-snug text-ink-faint">
          New or returning, we&apos;ll text you a code to get in. Message and data rates may apply.
        </p>
      </form>
    )
  }

  return (
    <form onSubmit={submitCode} className="flex flex-col gap-2.5">
      <div className="px-1 flex items-baseline justify-between gap-2">
        <p className="text-[13px] text-ink-muted">
          Sent to <span className="font-semibold text-ink">{formatPhoneForDisplay(phone)}</span>
        </p>
        <button type="button" onClick={() => switchStep('phone')} className={textLink}>Change</button>
      </div>

      <Field label={`${CODE_LENGTH}-digit code`}>
        <input
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          value={code}
          onChange={e => changeCode(e.target.value)}
          placeholder="••••••"
          className={codeInput}
        />
      </Field>

      {error && <ErrorNote>{error}</ErrorNote>}

      <button type="submit" disabled={loading} className={`${btnPrimary} w-full mt-1 py-4 text-xs`}>
        {loading ? 'Checking…' : 'Continue'}
      </button>
      <button
        type="button"
        onClick={() => sendCode(phone)}
        disabled={cooldown > 0 || loading}
        className={`${textLink} self-center py-1`}
      >
        {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
      </button>
    </form>
  )
}
