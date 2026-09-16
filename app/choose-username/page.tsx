'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { useAuth } from '@/components/AuthProvider'
import { normalizeUsername, isValidUsername, USERNAME_RULES_TEXT } from '@/lib/username'
import { Logo } from '@/components/Logo'
import { ErrorNote, Field, Label, btnPrimary, fieldInput } from '@/components/ui'

export default function ChooseUsernamePage() {
  const router   = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [username, setUsername] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/'); return }
    supabase.from('profiles').select('username').eq('id', user.id).single().then(({ data }) => {
      if (data?.username) setUsername(data.username)
      setChecking(false)
    })
  }, [authLoading, user, router])

  async function handleSubmit() {
    setError(null)
    const cleaned = normalizeUsername(username)
    if (!cleaned) { setError('Pick a username to continue.'); return }
    if (!isValidUsername(cleaned)) { setError(USERNAME_RULES_TEXT); return }
    if (!user) { router.replace('/'); return }
    setLoading(true)

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id:           user.id,
      username:     cleaned,
      username_set: true,
    })
    if (upsertError) { setError(upsertError.message); setLoading(false); return }

    setLoading(false)
    const hasFestival = localStorage.getItem(LOCAL_STORAGE_KEY)
    router.push(hasFestival ? '/feed' : '/select-festival')
  }

  if (checking) return null

  return (
    <div className="min-h-screen bg-paper text-ink px-6 flex flex-col">
      <div className="pt-14 mb-12">
        <Logo size="text-[32px]" />
        <Label className="mt-2">One last step</Label>
      </div>

      <div className="mb-10">
        <Label tone="accent" className="mb-2.5">Pick a username</Label>
        <h1 className="font-display text-[34px] font-bold tracking-tight leading-[1.05]">
          What&apos;s your<br />stage name<span className="text-accent">?</span>
        </h1>
      </div>

      <div className="flex flex-col gap-2.5 mb-5">
        <Field label="Username">
          <input
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="how you'll appear in the feed"
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
          {loading ? 'Please wait...' : 'Continue'}
        </button>
      </div>

      <div className="flex-1" />
      <p className="pb-12 text-center text-[10px] uppercase tracking-[0.1em] text-ink-faint">
        Rate every set<span className="text-accent">.</span> Rank every moment<span className="text-accent">.</span>
      </p>
    </div>
  )
}
