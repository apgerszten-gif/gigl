'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'
import { pathAfterSignIn } from '@/lib/afterSignIn'
import { formatPhoneForDisplay, isNorthAmericanNumber, normalizePhoneNumber } from '@/lib/phone'
import { Logo } from '@/components/Logo'
import {
  ArtistPhoto, Card, DateTag, ErrorNote, Field, Label, PersonPhoto, Place, PullQuote, Stars,
  btnPrimary, fieldInput,
} from '@/components/ui'

// You sign up with your phone number: we text a code, and the same flow
// signs a returning user back in. Supabase sends the text through its Send
// SMS hook (see CLAUDE.md). Email and password only remains so accounts
// made before phone sign-up can still get in.
type Step = 'phone' | 'code' | 'email'

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

export default function AuthPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step, setStep]             = useState<Step>('phone')
  const [phoneInput, setPhoneInput] = useState('')
  const [phone, setPhone]           = useState('') // the number the code went to
  const [code, setCode]             = useState('')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [cooldown, setCooldown]     = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  function switchStep(next: Step) {
    setStep(next)
    setError(null)
  }

  async function sendCode(to: string) {
    setError(null)
    setLoading(true)
    const { error: sendError } = await supabase.auth.signInWithOtp({ phone: to })
    setLoading(false)
    if (sendError) {
      console.error('[auth] sending code failed:', sendError)
      setError(withDetails(sendErrorText(sendError), sendError))
      return
    }
    setPhone(to)
    setCode('')
    setStep('code')
    setCooldown(RESEND_SECONDS)
  }

  function submitPhone(e: React.FormEvent) {
    e.preventDefault()
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
    // Stays loading while the next page opens.
    router.replace(await pathAfterSignIn(supabase, data.user.id))
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
    if (code.length !== CODE_LENGTH) { setError(`Enter the ${CODE_LENGTH}-digit code from the text.`); return }
    verifyCode(code)
  }

  async function signInWithEmail(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Sign-in failed. Please try again.')
      setLoading(false)
      return
    }
    router.replace(await pathAfterSignIn(supabase, data.user.id))
  }

  return (
    <div className="min-h-screen bg-paper text-ink px-5 pb-8 flex flex-col">
      <header className="pt-5 flex items-center justify-between">
        <Logo size="text-[28px]" />
        <Label>Live music, logged</Label>
      </header>

      {/* A cut-and-paste collage of the app's own cards. */}
      <div className="relative h-[168px] mt-5 mb-4" aria-hidden>
        <Card className="absolute left-0 right-8 top-0 -rotate-2 p-3 flex items-center gap-3">
          <ArtistPhoto name="Turnstile" className="w-14 h-14" iconSize={18}>
            <DateTag isoDate="2026-09-24" />
          </ArtistPhoto>
          <div className="min-w-0 space-y-1">
            <p className="font-display text-lg font-bold leading-none">Turnstile</p>
            <Place>Hollywood Palladium</Place>
            <Stars score={5} size={13} />
          </div>
        </Card>
        <Card className="absolute left-10 right-0 top-[92px] rotate-[1.5deg] p-3 space-y-2">
          <PullQuote>The pit never stopped moving.</PullQuote>
          <div className="flex items-center gap-1.5">
            <PersonPhoto name="sam_hears" className="w-5 h-5 text-[10px] border border-ink/15" />
            <span className="text-[11px] text-ink-muted">@sam_hears</span>
          </div>
        </Card>
      </div>

      <h1 className="font-display text-[32px] font-bold tracking-tight leading-[1.05] mb-4">
        {step === 'phone' && (
          <>Be the critic<span className="text-accent">.</span><br />Own the moment<span className="text-accent">.</span></>
        )}
        {step === 'code' && <>Check your<br />texts<span className="text-accent">.</span></>}
        {step === 'email' && <>Good to have<br />you back<span className="text-accent">.</span></>}
      </h1>

      {step === 'phone' && (
        <>
          <Card className="p-3.5">
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
          </Card>
          <button type="button" onClick={() => switchStep('email')} className="mt-4 self-center text-[12px] text-ink-muted">
            Made your account with email? <span className="font-semibold text-accent">Sign in with email</span>
          </button>
        </>
      )}

      {step === 'code' && (
        <Card className="p-3.5">
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
        </Card>
      )}

      {step === 'email' && (
        <>
          <Card className="p-3.5">
            <form onSubmit={signInWithEmail} className="flex flex-col gap-2.5">
              <Field label="Email">
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className={fieldInput}
                />
              </Field>

              <Field label="Password">
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={fieldInput}
                />
              </Field>

              {error && <ErrorNote>{error}</ErrorNote>}

              <button type="submit" disabled={loading} className={`${btnPrimary} w-full mt-1 py-4 text-xs`}>
                {loading ? 'Please wait…' : 'Sign in'}
              </button>
            </form>
          </Card>
          <button type="button" onClick={() => switchStep('phone')} className="mt-4 self-center text-[12px] font-semibold text-accent">
            Use your phone number instead
          </button>
        </>
      )}

      <div className="flex-1 min-h-6" />
      <footer className="pt-6 flex flex-col items-center gap-2 text-center">
        <p className="text-[10px] uppercase tracking-[0.1em] text-ink-faint">
          Rate every set<span className="text-accent">.</span> Rank every moment<span className="text-accent">.</span>
        </p>
        <p className="flex gap-3 text-[11px] text-ink-faint">
          <Link href="/privacy" className="underline underline-offset-[3px]">Privacy</Link>
          <Link href="/terms" className="underline underline-offset-[3px]">Terms</Link>
        </p>
      </footer>
    </div>
  )
}
