'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { normalizeUsername, isValidUsername, USERNAME_RULES_TEXT } from '@/lib/username'
import { signupMetadata } from '@/lib/visitor'
import { Logo } from '@/components/Logo'
import { AuthCollage } from '@/components/AuthCollage'
import { Card, ErrorNote, Field, Label, Segmented, btnPrimary, fieldInput } from '@/components/ui'

type Mode = 'signup' | 'signin'

// /auth as it was before phone sign-up: email and password, with a Sign up /
// Sign in toggle. app/auth/page.tsx only shows it when the admin page's
// sign-up switch is set to email (app/admin), the fallback for texts not
// getting through.
export function EmailAuthPage() {
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
    router.push(hasFestival ? '/feed' : '/select-festival')
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

      <AuthCollage />

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
