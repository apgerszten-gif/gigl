'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users } from 'lucide-react'
import { contactsSupported, pickContacts } from '@/lib/contacts'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { AppHeader } from '@/components/AppHeader'
import { ErrorNote, Label, PersonPhoto, btnPrimary, btnQuiet, btnSecondary } from '@/components/ui'

interface Match {
  id: string
  username: string | null
  display_name: string | null
  avatar_url: string | null
  following: boolean
}

// Onboarding step: find people you already know.
//
// Deliberately skippable and deliberately last - a new account can reach the
// app without ever touching this. An empty feed is a weaker first impression
// than a populated one, but not weak enough to justify making contact access
// feel compulsory.
//
// Contact reading is Chrome-on-Android only (see lib/contacts.ts), so most
// visitors will see the unsupported state instead. That state says what the
// limitation is rather than hiding the button and leaving people wondering,
// and offers the thing that does work everywhere: your profile link.
export default function FindFriendsPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [supported, setSupported]   = useState<boolean | null>(null)
  const [matches, setMatches]       = useState<Match[] | null>(null)
  const [checked, setChecked]       = useState(0)
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [authLoading, user, router])

  // Read on mount rather than during render: it touches navigator, and the
  // server render has no such thing.
  useEffect(() => { setSupported(contactsSupported()) }, [])

  const done = () => router.push('/select-festival')

  async function findFriends() {
    setError(null)
    setBusy(true)
    try {
      const picked = await pickContacts()
      // Dismissed the picker. Not an error, and not worth a message.
      if (!picked) return

      setChecked(picked.picked)

      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/friends/match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ hashes: picked.hashes }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? "Couldn't check your contacts."); return }

      setMatches(data.matches as Match[])
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setBusy(false)
    }
  }

  async function follow(target: Match) {
    if (!user || target.following) return
    setMatches(list => list?.map(m => m.id === target.id ? { ...m, following: true } : m) ?? null)
    const { error } = await supabase.from('follows').insert({ follower_id: user.id, following_id: target.id })
    if (error) {
      setMatches(list => list?.map(m => m.id === target.id ? { ...m, following: false } : m) ?? null)
    }
  }

  async function followAll() {
    for (const m of matches ?? []) await follow(m)
  }

  return (
    <div className="min-h-screen bg-paper text-ink pb-16">
      <AppHeader>
        <div className="min-w-0">
          <Label>Getting started</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
            Find your friends
          </h1>
        </div>
      </AppHeader>

      <div className="px-5 pt-4 space-y-4">
        {matches === null && (
          <>
            <p className="text-[13px] leading-snug text-ink-muted">
              Gigl is better with people you know in it. Check your contacts for
              anyone already here.
            </p>

            {supported === true && (
              <>
                <button type="button" onClick={findFriends} disabled={busy} className={`${btnPrimary} w-full py-3.5 text-xs disabled:opacity-40`}>
                  {busy ? 'Checking…' : 'Check my contacts'}
                </button>
                <p className="text-[11px] leading-snug text-ink-faint">
                  You choose which contacts to share. Their numbers are scrambled
                  on your phone before anything is sent, so Gigl only ever learns
                  about the ones that already have an account — and stores none of it.
                </p>
              </>
            )}

            {supported === false && (
              <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso p-3.5 space-y-2">
                <p className="text-[13px] leading-snug">
                  <strong className="font-display">Not available on this device.</strong>{' '}
                  Reading contacts only works in Chrome on Android — iPhones and
                  desktop browsers don&apos;t allow it at all.
                </p>
                <p className="text-[11px] leading-snug text-ink-faint">
                  Share your profile link instead, or search for people by username
                  once you&apos;re in.
                </p>
              </div>
            )}

            {error && <ErrorNote>{error}</ErrorNote>}

            <button type="button" onClick={done} className={`${btnQuiet} w-full py-3 text-xs`}>
              Skip for now
            </button>
          </>
        )}

        {matches !== null && matches.length === 0 && (
          <>
            <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso p-3.5">
              <p className="text-[13px] leading-snug">
                <strong className="font-display">No one yet.</strong>{' '}
                None of the {checked} contact{checked === 1 ? '' : 's'} you shared is on
                Gigl — early days. Your profile link is the fastest way to change that.
              </p>
            </div>
            <button type="button" onClick={done} className={`${btnPrimary} w-full py-3.5 text-xs`}>Continue</button>
          </>
        )}

        {matches !== null && matches.length > 0 && (
          <>
            <Label>
              {matches.length} of your contact{matches.length === 1 ? ' is' : 's are'} here
            </Label>

            <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
              {matches.map((m, i) => (
                <div key={m.id} className={`flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}>
                  <PersonPhoto name={m.display_name ?? m.username ?? '?'} src={m.avatar_url} className="w-10 h-10" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[15px] font-bold leading-tight truncate">
                      {m.display_name ?? m.username}
                    </p>
                    {m.username && <p className="text-[11px] text-ink-faint truncate">@{m.username}</p>}
                  </div>
                  <button
                    type="button"
                    onClick={() => follow(m)}
                    disabled={m.following}
                    className={`${m.following ? btnQuiet : btnSecondary} flex-shrink-0 px-3 py-1.5 text-[10px]`}
                  >
                    {m.following ? 'Following' : 'Follow'}
                  </button>
                </div>
              ))}
            </div>

            {matches.some(m => !m.following) && (
              <button type="button" onClick={followAll} className={`${btnSecondary} w-full py-3 text-xs`}>
                <span className="inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" strokeWidth={2} />
                  Follow everyone
                </span>
              </button>
            )}

            <button type="button" onClick={done} className={`${btnPrimary} w-full py-3.5 text-xs`}>Continue</button>
          </>
        )}
      </div>
    </div>
  )
}
