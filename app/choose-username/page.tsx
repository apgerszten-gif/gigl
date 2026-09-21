'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { useAuth } from '@/components/AuthProvider'
import { normalizeUsername, isValidUsername, USERNAME_RULES_TEXT } from '@/lib/username'
import { Logo } from '@/components/Logo'
import {
  ArtistPhoto, Card, ErrorNote, Field, Label, PersonPhoto, Place, Stars, btnPrimary, fieldInput,
} from '@/components/ui'

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

    // Straight on to finding people you know, unless this is a returning
    // account that already picked a show - then the feed is what they came
    // back for. /find-friends is skippable and leads to the same place.
    const hasFestival = localStorage.getItem(LOCAL_STORAGE_KEY)
    router.push(hasFestival ? '/feed' : '/find-friends')
  }

  if (checking) return null

  const handle = normalizeUsername(username) || 'yourname'

  return (
    <div className="min-h-screen bg-paper text-ink px-5 pb-8 flex flex-col">
      <header className="pt-5 flex items-center justify-between">
        <Logo size="text-[28px]" />
        <Label>One last step</Label>
      </header>

      {/* Live preview of how the name will read on a feed card. */}
      <Card className="mt-6 mb-5 -rotate-1 p-3.5 space-y-2.5" aria-hidden>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <PersonPhoto name={handle} className="w-8 h-8 text-sm border border-ink/15" />
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate text-accent">@{handle}</p>
              <p className="text-[10px] text-ink-muted">just now</p>
            </div>
          </div>
          <Stars score={5} size={13} />
        </div>
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="font-display text-lg font-bold leading-tight">Your first show</p>
            <Place>Somewhere loud</Place>
          </div>
          <ArtistPhoto name="Your first show" className="w-12 h-12" iconSize={16} />
        </div>
      </Card>

      <Label tone="accent" className="mb-1.5">Pick a username</Label>
      <h1 className="font-display text-[32px] font-bold tracking-tight leading-[1.05] mb-4">
        What&apos;s your<br />stage name<span className="text-accent">?</span>
      </h1>

      <Card className="p-3.5 flex flex-col gap-2.5">
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
      </Card>

      <div className="flex-1 min-h-6" />
      <p className="pt-6 text-center text-[10px] uppercase tracking-[0.1em] text-ink-faint">
        Rate every set<span className="text-accent">.</span> Rank every moment<span className="text-accent">.</span>
      </p>
    </div>
  )
}
