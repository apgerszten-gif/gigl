'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { normalizeUsername, isValidUsername, USERNAME_RULES_TEXT } from '@/lib/username'
import { normalizePhoneNumber } from '@/lib/phone'

const ink    = '#4A3528'
const cream  = '#FAF3E2'
const paper  = '#EDE3D0'
const sienna = '#B85827'
const muted  = '#8B7560'
const faint  = '#B8A898'
const serif  = 'var(--font-space-grotesk), sans-serif'
const sans   = 'var(--font-inter), sans-serif'

export default function AuthPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [mode, setMode]         = useState<'signup' | 'signin'>('signup')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  // Phone sign-in (Twilio Verify, configured as the SMS provider on
  // Supabase's Phone auth). Starts straight at 'phone' — the number input
  // is the first thing on the page, no extra click to get there. 'code'
  // collects the OTP Supabase/Twilio just texted them.
  const [phoneStep, setPhoneStep]     = useState<'phone' | 'code'>('phone')
  const [phoneInput, setPhoneInput]   = useState('')
  const [otpInput, setOtpInput]       = useState('')
  const [phoneError, setPhoneError]   = useState<string | null>(null)
  const [phoneLoading, setPhoneLoading] = useState(false)

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

  // Where to send someone once they have a session: straight into the app
  // if they've already picked a username, otherwise /choose-username first
  // (mirrors app/auth/callback/page.tsx).
  async function routeAfterSignIn(userId: string) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('username_set')
      .eq('id', userId)
      .single()

    if (!profile || profile.username_set === false) {
      router.push('/choose-username')
      return
    }
    const hasFestival = typeof window !== 'undefined' && localStorage.getItem(LOCAL_STORAGE_KEY)
    router.push(hasFestival ? '/feed' : '/select-festival')
  }

  async function handleSendPhoneCode() {
    setPhoneError(null)
    const normalized = normalizePhoneNumber(phoneInput)
    if (!normalized) { setPhoneError('Enter a valid phone number.'); return }

    setPhoneLoading(true)
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: normalized })
    setPhoneLoading(false)
    if (otpError) { setPhoneError(otpError.message); return }

    setPhoneInput(normalized)
    setPhoneStep('code')
  }

  async function handleVerifyPhoneCode() {
    setPhoneError(null)
    if (!otpInput.trim()) { setPhoneError('Enter the code.'); return }

    setPhoneLoading(true)
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: phoneInput,
      token: otpInput.trim(),
      type: 'sms',
    })
    if (verifyError || !data.user) {
      setPhoneError(verifyError?.message ?? 'Incorrect code.')
      setPhoneLoading(false)
      return
    }

    await routeAfterSignIn(data.user.id)
    setPhoneLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: paper,
      fontFamily: sans,
      color: ink,
      maxWidth: 430,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 24px',
    }}>

      {/* Wordmark */}
      <div style={{ paddingTop: 40, marginBottom: 28 }}>
        <div style={{
          fontFamily: serif, fontSize: 48, fontWeight: 700,
          color: ink, letterSpacing: '-1px',
        }}>
          Gigl<span style={{ color: sienna }}>/</span>
        </div>
      </div>

      {/* Headline */}
      <div style={{ marginBottom: 28 }}>
        <div style={{
          fontSize: 10, color: sienna, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 10,
        }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </div>
        <div style={{
          fontFamily: serif, fontSize: 34, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', color: ink,
        }}>
          {mode === 'signup' ? (
            <>Be the critic<span style={{ color: sienna }}>.</span><br />Own the moment<span style={{ color: sienna }}>.</span></>
          ) : (
            <>Good to have<br />you back<span style={{ color: sienna }}>.</span></>
          )}
        </div>
      </div>

      {/* Phone sign-in (Twilio Verify) — the featured, primary path, shown
          above the traditional email/password flow. The number input is
          front and center on load, no "continue with phone" click needed. */}
      {phoneStep === 'phone' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{
            background: cream, borderRadius: 5,
            border: `1.5px solid ${ink}`,
            padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 9, color: muted, letterSpacing: '0.12em',
              textTransform: 'uppercase', fontWeight: 700, marginBottom: 6,
            }}>Phone number</div>
            <input
              type="tel"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              placeholder="(555) 123-4567"
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: ink, fontSize: 16, fontFamily: sans,
              }}
            />
          </div>

          {phoneError && (
            <div style={{
              fontSize: 12, color: '#B03030', fontFamily: sans,
              padding: '10px 14px', background: 'rgba(160,40,40,0.08)',
              border: '1px solid rgba(160,40,40,0.2)',
              borderRadius: 5, lineHeight: 1.5,
            }}>{phoneError}</div>
          )}

          <button
            onClick={handleSendPhoneCode}
            disabled={phoneLoading}
            style={{
              width: '100%', padding: '12px 0', borderRadius: 5,
              background: sienna, border: `1.5px solid ${ink}`, boxShadow: '2px 2px 0 #4A3528',
              color: cream, fontSize: 11, fontWeight: 700,
              cursor: phoneLoading ? 'not-allowed' : 'pointer', opacity: phoneLoading ? 0.7 : 1,
              fontFamily: sans, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}
          >{phoneLoading ? 'Sending...' : 'Send code'}</button>
        </div>
      )}

      {phoneStep === 'code' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          <div style={{ fontSize: 12, color: muted, fontFamily: sans }}>
            We texted a 6-digit code to {phoneInput}.
          </div>

          <div style={{
            background: cream, borderRadius: 5,
            border: `1.5px solid ${ink}`,
            padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 9, color: muted, letterSpacing: '0.12em',
              textTransform: 'uppercase', fontWeight: 700, marginBottom: 6,
            }}>Code</div>
            <input
              type="text"
              inputMode="numeric"
              value={otpInput}
              onChange={e => setOtpInput(e.target.value)}
              placeholder="123456"
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: ink, fontSize: 16, fontFamily: sans, letterSpacing: '0.2em',
              }}
            />
          </div>

          {phoneError && (
            <div style={{
              fontSize: 12, color: '#B03030', fontFamily: sans,
              padding: '10px 14px', background: 'rgba(160,40,40,0.08)',
              border: '1px solid rgba(160,40,40,0.2)',
              borderRadius: 5, lineHeight: 1.5,
            }}>{phoneError}</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setPhoneStep('phone'); setPhoneError(null); setOtpInput('') }}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 5,
                background: 'none', border: '1px solid rgba(74,53,40,0.2)',
                color: muted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: sans, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >Back</button>
            <button
              onClick={handleVerifyPhoneCode}
              disabled={phoneLoading}
              style={{
                flex: 2, padding: '12px 0', borderRadius: 5,
                background: sienna, border: `1.5px solid ${ink}`, boxShadow: '2px 2px 0 #4A3528',
                color: cream, fontSize: 11, fontWeight: 700,
                cursor: phoneLoading ? 'not-allowed' : 'pointer', opacity: phoneLoading ? 0.7 : 1,
                fontFamily: sans, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >{phoneLoading ? 'Verifying...' : 'Verify'}</button>
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(74,53,40,0.15)' }} />
        <span style={{ fontSize: 10, color: faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(74,53,40,0.15)' }} />
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {mode === 'signup' && (
          <div style={{
            background: cream, borderRadius: 5,
            border: `1.5px solid ${ink}`,
            padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 9, color: muted, letterSpacing: '0.12em',
              textTransform: 'uppercase', fontWeight: 700, marginBottom: 6,
            }}>Username</div>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="how you'll appear in the feed"
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: ink, fontSize: 16, fontFamily: sans,
              }}
            />
          </div>
        )}

        <div style={{
          background: cream, borderRadius: 5,
          border: `1.5px solid ${ink}`,
          padding: '14px 16px',
        }}>
          <div style={{
            fontSize: 9, color: muted, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 6,
          }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: '100%', background: 'none', border: 'none', outline: 'none',
              color: ink, fontSize: 16, fontFamily: sans,
            }}
          />
        </div>

        <div style={{
          background: cream, borderRadius: 5,
          border: `1.5px solid ${ink}`,
          padding: '14px 16px',
        }}>
          <div style={{
            fontSize: 9, color: muted, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 6,
          }}>Password <span style={{ textTransform: 'none', letterSpacing: 0, fontWeight: 500, color: faint }}>(6 character min)</span></div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%', background: 'none', border: 'none', outline: 'none',
              color: ink, fontSize: 16, fontFamily: sans,
            }}
          />
        </div>

        {error && (
          <div style={{
            fontSize: 12, color: '#B03030', fontFamily: sans,
            padding: '10px 14px', background: 'rgba(160,40,40,0.08)',
            border: '1px solid rgba(160,40,40,0.2)',
            borderRadius: 5, lineHeight: 1.5,
          }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', background: sienna,
            border: `1.5px solid ${ink}`,
            boxShadow: '2px 2px 0 #4A3528',
            borderRadius: 5, padding: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            marginTop: 4,
          }}
        >
          <span style={{
            fontSize: 12, fontWeight: 700, color: cream,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: sans,
          }}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </span>
        </button>
      </div>

      {/* Toggle */}
      <div style={{ textAlign: 'center', fontSize: 13, color: muted, fontFamily: sans }}>
        {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
        <span
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }}
          style={{ color: sienna, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          {mode === 'signup' ? 'Sign in' : 'Sign up'}
        </span>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{
        paddingBottom: 32, textAlign: 'center',
        fontSize: 10, color: faint, letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        Rate every set<span style={{ color: sienna }}>.</span> Rank every moment<span style={{ color: sienna }}>.</span>
      </div>
    </div>
  )
}
