'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { pathAfterSignIn } from '@/lib/afterSignIn'
import { Logo } from '@/components/Logo'
import { PhoneCodeForm, type PhoneStep } from '@/components/PhoneCodeForm'
import { EmailAuthPage } from '@/components/EmailAuthPage'
import { useSignupMethod } from '@/lib/signupMethod'
import {
  ArtistPhoto, Card, DateTag, ErrorNote, Field, Label, PersonPhoto, Place, PullQuote, Stars,
  btnPrimary, fieldInput,
} from '@/components/ui'

// You sign up with your phone number: we text a code, and the same flow
// signs a returning user back in (components/PhoneCodeForm.tsx). Email and
// password only remains so accounts made before phone sign-up can still get in.
type Step = PhoneStep | 'email'

// The admin page's sign-up switch (app/admin) can put the older email page
// back if texts stop getting through.
export default function AuthPage() {
  return useSignupMethod() === 'email' ? <EmailAuthPage /> : <PhoneAuthPage />
}

function PhoneAuthPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step, setStep]         = useState<Step>('phone')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  function switchStep(next: Step) {
    setStep(next)
    setError(null)
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
            <PersonPhoto name="mauricio_pochettino" className="w-5 h-5 text-[10px] border border-ink/15" />
            <span className="text-[11px] text-ink-muted">@mauricio_pochettino</span>
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

      {step !== 'email' && (
        <>
          <Card className="p-3.5">
            <PhoneCodeForm
              onStepChange={switchStep}
              onVerified={async userId => router.replace(await pathAfterSignIn(supabase, userId))}
            />
          </Card>
          {step === 'phone' && (
            <button type="button" onClick={() => switchStep('email')} className="mt-4 self-center text-[12px] text-ink-muted">
              Made your account with email? <span className="font-semibold text-accent">Sign in with email</span>
            </button>
          )}
        </>
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
