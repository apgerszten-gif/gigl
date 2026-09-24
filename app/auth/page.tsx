'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { normalizeUsername, isValidUsername, USERNAME_RULES_TEXT } from '@/lib/username'
import { signupMetadata } from '@/lib/visitor'
import { Logo } from '@/components/Logo'
import {
  ArtistPhoto, Card, DateTag, ErrorNote, Field, Label, PersonPhoto, Place, PullQuote, Segmented, Stars,
  btnPrimary, fieldInput,
} from '@/components/ui'

type Mode = 'signup' | 'signin'

export default function AuthPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode, setMode]         = useState<Mode>('signup')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit() {
    setError(null)

    if (mode === 'signup') {
      const cleaned = normalizeUsername(username)
      if (!isValidUsername(cleaned)) { setError(USERNAME_RULES_TEXT); return }

      setLoading(true)
      const { data, error: signUpError } = await supabase.auth.signUp({
        email, password, options: { data: signupMetadata() },
      })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').upsert({
          id:           data.user.id,
          username:     cleaned,
          username_set: true,
        })
      }
    } else {
      setLoading(true)
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) { setError(signInError.message); setLoading(false); return }
    }

    setLoading(false)
    const hasFestival = typeof window !== 'undefined' && localStorage.getItem(LOCAL_STORAGE_KEY)
    // A brand new account lands on the CRSSD lineup rather than in search:
    // this weekend most of them are signing up at the festival. See app/crssd.
    router.push(hasFestival ? '/feed' : '/crssd')
  }

  function switchMode(next: Mode) {
    setMode(next)
    setError(null)
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
        {mode === 'signup' ? (
          <>Be the critic<span className="text-accent">.</span><br />Own the moment<span className="text-accent">.</span></>
        ) : (
          <>Good to have<br />you back<span className="text-accent">.</span></>
        )}
      </h1>

      <Segmented
        options={[{ value: 'signup', label: 'Sign up' }, { value: 'signin', label: 'Sign in' }]}
        value={mode}
        onChange={switchMode}
      />

      <Card className="mt-3 p-3.5 flex flex-col gap-2.5">
        {mode === 'signup' && (
          <Field label="Username">
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="how you'll appear in the feed"
              className={fieldInput}
            />
          </Field>
        )}

        <Field label="Email">
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            className={fieldInput}
          />
        </Field>

        <Field label="Password" hint="(6 character min)">
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            className={fieldInput}
          />
        </Field>

        {error && <ErrorNote>{error}</ErrorNote>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className={`${btnPrimary} w-full mt-1 py-4 text-xs ${loading ? 'opacity-70' : ''}`}
        >
          {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
        </button>
      </Card>

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
