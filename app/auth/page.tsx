'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { normalizeUsername, isValidUsername, USERNAME_RULES_TEXT } from '@/lib/username'
import { Logo } from '@/components/Logo'
import { ErrorNote, Field, Label, btnPrimary, fieldInput } from '@/components/ui'

export default function AuthPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode, setMode]         = useState<'signup' | 'signin'>('signup')
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
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
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

  return (
    <div className="min-h-screen bg-paper text-ink px-6 flex flex-col">
      <div className="pt-10 mb-7">
        <Logo size="text-5xl" />
      </div>

      <div className="mb-7">
        <Label tone="accent" className="mb-2.5">{mode === 'signup' ? 'Create your account' : 'Welcome back'}</Label>
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-[1.05]">
          {mode === 'signup' ? (
            <>Be the critic<span className="text-accent">.</span><br />Own the moment<span className="text-accent">.</span></>
          ) : (
            <>Good to have<br />you back<span className="text-accent">.</span></>
          )}
        </h1>
      </div>

      <div className="flex flex-col gap-2.5 mb-4">
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
      </div>

      <p className="text-center text-[13px] text-ink-muted">
        {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
        <button
          type="button"
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }}
          className="text-accent underline underline-offset-[3px]"
        >
          {mode === 'signup' ? 'Sign in' : 'Sign up'}
        </button>
      </p>

      <div className="flex-1" />
      <p className="pb-8 text-center text-[10px] uppercase tracking-[0.1em] text-ink-faint">
        Rate every set<span className="text-accent">.</span> Rank every moment<span className="text-accent">.</span>
      </p>
    </div>
  )
}
