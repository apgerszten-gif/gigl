'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { normalizeUsername, isValidUsername, USERNAME_RULES_TEXT } from '@/lib/username'
import { PhoneCodeForm } from '@/components/PhoneCodeForm'
import { ErrorNote, Field, Label, btnPrimary, fieldInput } from '@/components/ui'

type Step = 'phone' | 'email' | 'username'

// Asks for an account in place, over whatever the visitor was doing, rather
// than sending them off to /auth. Signed-out visitors can browse and write a
// whole log; this only opens when they try to post, react, comment or follow,
// and hands back the user id so the caller can finish what they started.
// Staying on the page is the point: the log screen holds attached photos in
// memory, and navigating away would drop them.
//
// The same phone number and code as /auth, which makes a new account or
// signs a returning one in (components/PhoneCodeForm.tsx). A new account
// then picks its username here. Email and password is sign-in only, for
// accounts made before phone sign-up.
export function SignUpSheet({
  title, blurb, signInLabel = 'Sign in', finishLabel = 'Done',
  onClose, onSignedIn,
}: {
  // Rendered with the accent full stop, so pass it without one.
  title: string
  blurb: string
  signInLabel?: string
  finishLabel?: string
  onClose: () => void
  onSignedIn: (userId: string) => void
}) {
  const supabase = createClient()

  // Mounted at translateY(100%), flipped a tick after mount so the
  // transition actually animates (same as TagFriendsModal).
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10)
    return () => clearTimeout(t)
  }, [])

  const [step, setStep]         = useState<Step>('phone')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  // Set once an account exists but still needs a username.
  const [userId, setUserId]     = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  function switchStep(next: Step) {
    setStep(next)
    setError(null)
  }

  // A new account, from either door, has no username yet: ask for one before
  // handing back, so whatever they were posting goes up under a real name.
  async function finishSignIn(id: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username_set')
      .eq('id', id)
      .maybeSingle()

    if (!profile || profile.username_set === false) {
      setUserId(id)
      switchStep('username')
      return
    }
    onSignedIn(id)
  }

  async function signInWithEmail() {
    setLoading(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Could not sign in. Try again.')
      setLoading(false)
      return
    }
    await finishSignIn(data.user.id)
    setLoading(false)
  }

  async function finishUsername() {
    if (!userId) return
    const cleaned = normalizeUsername(username)
    if (!cleaned) { setError('Pick a username.'); return }
    if (!isValidUsername(cleaned)) { setError(USERNAME_RULES_TEXT); return }

    setLoading(true)
    // Checked first for a friendlier message; the unique constraint still
    // has the last word (23505 below).
    const { data: taken } = await supabase
      .from('profiles').select('id').eq('username', cleaned).neq('id', userId).limit(1)
    if (taken && taken.length > 0) {
      setError('That username is taken. Try another.')
      setLoading(false)
      return
    }
    const { error: upsertError } = await supabase.from('profiles').upsert({ id: userId, username: cleaned, username_set: true })
    setLoading(false)
    if (upsertError) {
      setError(upsertError.code === '23505' ? 'That username was just taken. Try another.' : upsertError.message)
      return
    }
    onSignedIn(userId)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    if (step === 'username') finishUsername()
    else signInWithEmail()
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/55 transition-opacity duration-[280ms] ${shown ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        role="dialog"
        aria-modal="true"
        className={`relative w-full max-w-md max-h-full overflow-y-auto rounded-t-card border-1.5 border-b-0 border-ink bg-paper text-ink px-5 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] transition-transform duration-[280ms] ease-out ${
          shown ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-bold tracking-tight leading-tight">
              {title}<span className="text-accent">.</span>
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-ink-muted">{blurb}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 p-1 text-ink-muted">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {step === 'phone' ? (
          <div className="mt-4 flex flex-col">
            <PhoneCodeForm onVerified={finishSignIn} />
            <button type="button" onClick={() => switchStep('email')} className="mt-3 self-center text-[12px] text-ink-muted">
              Made your account with email? <span className="font-semibold text-accent">Sign in with email</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5">
            {step === 'username' ? (
              <>
                <Label tone="ink">One more thing: pick your username</Label>
                <Field label="Username">
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="how you'll appear in the feed"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className={fieldInput}
                  />
                </Field>
              </>
            ) : (
              <>
                <Field label="Email">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    autoComplete="email"
                    className={fieldInput}
                  />
                </Field>
                <Field label="Password">
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    className={fieldInput}
                  />
                </Field>
              </>
            )}

            {error && <ErrorNote>{error}</ErrorNote>}

            <button
              type="submit"
              disabled={loading}
              className={`${btnPrimary} w-full mt-1 py-4 text-xs ${loading ? 'opacity-70' : ''}`}
            >
              {loading ? 'Please wait…' : step === 'username' ? finishLabel : signInLabel}
            </button>
            {step === 'email' && (
              <button type="button" onClick={() => switchStep('phone')} className="mt-1 self-center text-[12px] font-semibold text-accent">
                Use your phone number instead
              </button>
            )}
          </form>
        )}

        {/* New tabs, so reading them doesn't leave the page (and its photos) behind. */}
        <p className="mt-4 flex justify-center gap-3 text-[11px] text-ink-faint">
          <Link href="/privacy" target="_blank" className="underline underline-offset-[3px]">Privacy</Link>
          <Link href="/terms" target="_blank" className="underline underline-offset-[3px]">Terms</Link>
        </p>
      </div>
    </div>
  )
}
