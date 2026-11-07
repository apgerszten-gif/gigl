'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/lib/contact'
import { BackHeader, Card, EmptyState, ErrorNote, LoadingLabel, btnDanger, btnPrimary, btnQuiet } from '@/components/ui'

// Deleting your account from inside the app, which Apple requires of any app
// you can sign up in (guideline 5.1.1(v)). Linked from the bottom of the
// profile page, and a plain address of its own so the Privacy Policy and an
// App Store listing can point at it. /api/account/delete does the work.

// Everything this browser kept for the account: the feed cache, a pending
// log, the festival choice and so on. All of Gigl's keys start with "gigl".
function forgetThisBrowser() {
  for (const store of [localStorage, sessionStorage]) {
    try {
      Object.keys(store).filter(k => k.startsWith('gigl')).forEach(k => store.removeItem(k))
    } catch {
      // Private mode can refuse storage access; there's nothing kept then.
    }
  }
}

export default function DeleteAccountPage() {
  const supabase = createClient()
  const { user, loading } = useAuth()

  const [username, setUsername]     = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy]             = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [deleted, setDeleted]       = useState(false)

  useEffect(() => {
    if (!user) return
    supabase.from('profiles').select('username').eq('id', user.id).maybeSingle()
      .then(({ data }) => setUsername(data?.username ?? null))
  }, [user])

  async function deleteAccount() {
    if (busy) return
    setBusy(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? "Couldn't delete your account. Try again in a minute.")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach Gigl. Check your connection and try again.")
      setBusy(false)
      return
    }

    // The account is gone, so its session is too. Local scope: there's no
    // server-side session left to sign out of.
    await supabase.auth.signOut({ scope: 'local' }).catch(() => undefined)
    forgetThisBrowser()
    setDeleted(true)
    setBusy(false)
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BackHeader title="Delete account" href={deleted ? '/feed' : '/profile'} />

      <main className="px-5 pt-5 pb-20 max-w-md mx-auto space-y-4">
        {deleted ? (
          <Card className="p-5 space-y-3">
            <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
              Your account is deleted<span className="text-accent">.</span>
            </h1>
            <p className="text-[13px] leading-snug text-ink-muted">
              Everything you posted is gone from Gigl. Thanks for logging your shows with us.
            </p>
            <Link href="/feed" className={`${btnPrimary} w-full py-3.5 text-xs`}>Back to Gigl</Link>
          </Card>
        ) : loading ? (
          <LoadingLabel />
        ) : !user ? (
          <EmptyState>
            Sign in to delete your account.
            <div className="mt-4">
              <Link href="/auth" className={`${btnPrimary} px-5 py-2.5 text-[11px]`}>Sign in</Link>
            </div>
            <p className="mt-4">
              Can&apos;t sign in? Email{' '}
              <a href={SUPPORT_MAILTO} className="text-accent underline underline-offset-[3px]">{SUPPORT_EMAIL}</a>
              {' '}from your account&apos;s phone number or email and we&apos;ll delete it for you.
            </p>
          </EmptyState>
        ) : (
          <Card className="p-5 space-y-3">
            <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
              Delete your account<span className="text-accent">.</span>
            </h1>
            <p className="text-[13px] leading-snug">
              This deletes {username ? <strong>@{username}</strong> : 'your account'} and everything you&apos;ve posted on Gigl,
              straight away:
            </p>
            <ul className="pl-5 list-disc text-[13px] leading-snug space-y-1">
              <li>your profile, photo and phone number</li>
              <li>every show you&apos;ve logged, with its ratings, review, photos and videos</li>
              <li>your comments, reactions, follows and saved shows</li>
            </ul>
            <p className="text-[13px] leading-snug text-ink-muted">
              Shows you added to search stay there, without your name on them.
            </p>

            {error && <ErrorNote>{error}</ErrorNote>}

            {confirming ? (
              <div className="space-y-2.5 pt-1">
                <p className="text-[13px] font-semibold">Are you sure? There&apos;s no way to get it back.</p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setConfirming(false)} disabled={busy} className={`${btnQuiet} flex-1 py-3 text-xs`}>
                    Keep my account
                  </button>
                  <button type="button" onClick={deleteAccount} disabled={busy} className={`${btnDanger} flex-1 py-3 text-xs`}>
                    {busy ? 'Deleting…' : 'Yes, delete it'}
                  </button>
                </div>
              </div>
            ) : (
              <button type="button" onClick={() => setConfirming(true)} className={`${btnDanger} w-full py-3 text-xs`}>
                Delete my account
              </button>
            )}
          </Card>
        )}

        {!deleted && user && (
          <p className="text-center text-[11px] text-ink-faint">
            Questions first? Email{' '}
            <a href={SUPPORT_MAILTO} className="underline underline-offset-[3px]">{SUPPORT_EMAIL}</a>
          </p>
        )}
      </main>
    </div>
  )
}
