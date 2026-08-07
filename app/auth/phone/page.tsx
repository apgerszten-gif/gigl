'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { normalizePhoneNumber } from '@/lib/phone'

const ink    = '#4A3528'
const cream  = '#FAF3E2'
const paper  = '#EDE3D0'
const sienna = '#B85827'
const muted  = '#8B7560'
const faint  = '#B8A898'
const serif  = 'var(--font-space-grotesk), sans-serif'
const sans   = 'var(--font-inter), sans-serif'

const RESEND_COOLDOWN_SECONDS = 60

export default function PhoneAuthPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [step, setStep]             = useState<'phone' | 'code'>('phone')
  const [phoneInput, setPhoneInput] = useState('')
  const [otpInput, setOtpInput]     = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [loading, setLoading]       = useState(false)
  const [cooldown, setCooldown]     = useState(0)

  // Ticks the resend cooldown down once a second, matching Supabase's own
  // 60s minimum interval between OTP sends to the same number.
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function sendCode(phone: string) {
    setError(null)
    setLoading(true)
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone })
    setLoading(false)
    if (otpError) { setError(otpError.message); return }

    setStep('code')
    setCooldown(RESEND_COOLDOWN_SECONDS)
  }

  function handleSendCode() {
    const normalized = normalizePhoneNumber(phoneInput)
    if (!normalized) { setError('Enter a valid phone number.'); return }
    setPhoneInput(normalized)
    sendCode(normalized)
  }

  function handleResendCode() {
    if (cooldown > 0 || loading) return
    sendCode(phoneInput)
  }

  // Where to send someone once they have a session: straight into the app
  // if they've already picked a username, otherwise /choose-username first
  // (mirrors app/auth/callback/page.tsx — phone sign-in has no username on
  // first verify, same as a first-time OAuth sign-in).
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

  async function handleVerifyCode() {
    setError(null)
    if (!otpInput.trim()) { setError('Enter the code.'); return }

    setLoading(true)
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      phone: phoneInput,
      token: otpInput.trim(),
      type: 'sms',
    })
    if (verifyError || !data.user) {
      setError(verifyError?.message ?? 'Incorrect code.')
      setLoading(false)
      return
    }

    await routeAfterSignIn(data.user.id)
    setLoading(false)
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
          Sign in with phone
        </div>
        <div style={{
          fontFamily: serif, fontSize: 34, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', color: ink,
        }}>
          {step === 'phone' ? (
            <>We&apos;ll text you<br />a code<span style={{ color: sienna }}>.</span></>
          ) : (
            <>Enter your<br />code<span style={{ color: sienna }}>.</span></>
          )}
        </div>
      </div>

      {step === 'phone' && (
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

          {error && (
            <div style={{
              fontSize: 12, color: '#B03030', fontFamily: sans,
              padding: '10px 14px', background: 'rgba(160,40,40,0.08)',
              border: '1px solid rgba(160,40,40,0.2)',
              borderRadius: 5, lineHeight: 1.5,
            }}>{error}</div>
          )}

          <button
            onClick={handleSendCode}
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
            }}>{loading ? 'Sending...' : 'Send code'}</span>
          </button>
        </div>
      )}

      {step === 'code' && (
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

          {error && (
            <div style={{
              fontSize: 12, color: '#B03030', fontFamily: sans,
              padding: '10px 14px', background: 'rgba(160,40,40,0.08)',
              border: '1px solid rgba(160,40,40,0.2)',
              borderRadius: 5, lineHeight: 1.5,
            }}>{error}</div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => { setStep('phone'); setError(null); setOtpInput(''); setCooldown(0) }}
              style={{
                flex: 1, padding: '12px 0', borderRadius: 5,
                background: 'none', border: '1px solid rgba(74,53,40,0.2)',
                color: muted, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: sans, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >Back</button>
            <button
              onClick={handleVerifyCode}
              disabled={loading}
              style={{
                flex: 2, padding: '12px 0', borderRadius: 5,
                background: sienna, border: `1.5px solid ${ink}`, boxShadow: '2px 2px 0 #4A3528',
                color: cream, fontSize: 11, fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
                fontFamily: sans, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}
            >{loading ? 'Verifying...' : 'Verify'}</button>
          </div>

          <div style={{ textAlign: 'center' }}>
            <span
              onClick={handleResendCode}
              style={{
                fontSize: 11, fontFamily: sans, letterSpacing: '0.04em',
                color: cooldown > 0 || loading ? faint : sienna,
                cursor: cooldown > 0 || loading ? 'default' : 'pointer',
                textDecoration: cooldown > 0 || loading ? 'none' : 'underline',
                textUnderlineOffset: 3,
              }}
            >
              {cooldown > 0 ? `Resend code in ${cooldown}s` : 'Resend code'}
            </span>
          </div>
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 13, color: muted, fontFamily: sans }}>
        <span
          onClick={() => router.push('/auth')}
          style={{ color: sienna, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          Back to email sign in
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
