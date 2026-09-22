'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { normalizeUsername, isValidUsername, USERNAME_RULES_TEXT } from '@/lib/username'
import { ErrorNote, Field, Label, Segmented, btnPrimary, fieldInput } from '@/components/ui'

type Mode = 'signup' | 'signin'
type Step = 'account' | 'username' | 'confirm-email'

// Asks for an account in place, over whatever the visitor was doing, rather
// than sending them off to /auth. Signed-out visitors can browse and write a
// whole log; this only opens when they try to post, react, comment or follow,
// and hands back the user id so the caller can finish what they started.
// Staying on the page is the point: the log screen holds attached photos in
// memory, and navigating away would drop them.
//
// Email and password for now, the same as /auth. When phone sign-up ships
// (the phone-signup branch) the account step becomes number, then code; the
// username step already covers accounts that arrive without a name.
export function SignUpSheet({
  title, blurb, initialMode = 'signup',
  signUpLabel = 'Create account', signInLabel = 'Sign in', finishLabel = 'Done',
  onClose, onSignedIn,
}: {
  // Rendered with the accent full stop, so pass it without one.
  title: string
  blurb: string
  initialMode?: Mode
  signUpLabel?: string
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

  const [mode, setMode]         = useState<Mode>(initialMode)
  const [step, setStep]         = useState<Step>('account')
  const [username, setUsername] = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  // Set once an account exists but still needs a username.
  const [userId, setUserId]     = useState<string | null>(null)
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  // Checked before the account is created, so a taken name doesn't leave
  // someone with an account and no handle. The unique constraint still has
  // the last word (see claimUsername).
  async function usernameTaken(name: string, exceptId?: string): Promise<boolean> {
    let query = supabase.from('profiles').select('id').eq('username', name)
    if (exceptId) query = query.neq('id', exceptId)
    const { data } = await query.limit(1)
    return !!data && data.length > 0
  }

  async function claimUsername(id: string, name: string): Promise<boolean> {
    const { error: upsertError } = await supabase.from('profiles').upsert({ id, username: name, username_set: true })
    if (upsertError) {
      setError(upsertError.code === '23505' ? 'That username was just taken. Try another.' : upsertError.message)
      return false
    }
    return true
  }

  function checkUsername(): string | null {
    const cleaned = normalizeUsername(username)
    if (!cleaned) { setError('Pick a username.'); return null }
    if (!isValidUsername(cleaned)) { setError(USERNAME_RULES_TEXT); return null }
    return cleaned
  }

  async function signUp() {
    const cleaned = checkUsername()
    if (!cleaned) return

    setLoading(true)
    if (await usernameTaken(cleaned)) {
      setError('That username is taken. Try another.')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError || !data.user) {
      setError(signUpError?.message ?? 'Could not create the account. Try again.')
      setLoading(false)
      return
    }
    // Only happens if Supabase is set to confirm emails before sign-in.
    if (!data.session) {
      setStep('confirm-email')
      setLoading(false)
      return
    }

    setUserId(data.user.id)
    const claimed = await claimUsername(data.user.id, cleaned)
    setLoading(false)
    if (!claimed) { setStep('username'); return }
    onSignedIn(data.user.id)
  }

  async function signIn() {
    setLoading(true)
    const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError || !data.user) {
      setError(signInError?.message ?? 'Could not sign in. Try again.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('username_set')
      .eq('id', data.user.id)
      .maybeSingle()
    setLoading(false)

    if (!profile || profile.username_set === false) {
      setUserId(data.user.id)
      setStep('username')
      return
    }
    onSignedIn(data.user.id)
  }

  async function finishUsername() {
    if (!userId) return
    const cleaned = checkUsername()
    if (!cleaned) return

    setLoading(true)
    if (await usernameTaken(cleaned, userId)) {
      setError('That username is taken. Try another.')
      setLoading(false)
      return
    }
    const claimed = await claimUsername(userId, cleaned)
    setLoading(false)
    if (claimed) onSignedIn(userId)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    setError(null)
    if (step === 'username') finishUsername()
    else if (mode === 'signup') signUp()
    else signIn()
  }

  function switchMode(next: Mode) {
    setMode(next)
    setStep('account')
    setError(null)
  }

  const buttonLabel = step === 'username' ? finishLabel : mode === 'signup' ? signUpLabel : signInLabel

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

        {step === 'confirm-email' ? (
          <div className="mt-4 space-y-3">
            <p className="text-[13px] leading-normal">
              Check <strong>{email}</strong> for a link to confirm your account, then sign in here.
            </p>
            <button type="button" onClick={() => switchMode('signin')} className={`${btnPrimary} w-full py-4 text-xs`}>
              Sign in
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2.5">
            {step === 'account' ? (
              <Segmented
                options={[{ value: 'signup', label: 'Sign up' }, { value: 'signin', label: 'Sign in' }]}
                value={mode}
                onChange={switchMode}
              />
            ) : (
              <Label tone="ink">One more thing: pick your username</Label>
            )}

            {(step === 'username' || mode === 'signup') && (
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
            )}

            {step === 'account' && (
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
                <Field label="Password" hint={mode === 'signup' ? '(6 character min)' : undefined}>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
              {loading ? 'Please wait…' : buttonLabel}
            </button>
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
