'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { useTheme } from '@/components/FestivalThemeProvider'

export function SmsScoringSection({
  phoneNumber, phoneVerified, onChange,
}: {
  phoneNumber: string | null
  phoneVerified: boolean
  onChange: (phoneNumber: string | null, phoneVerified: boolean) => void
}) {
  const supabase = createClient()
  const { user } = useAuth()
  const T = useTheme()

  const [step, setStep] = useState<'idle' | 'phone' | 'code'>('idle')
  const [phoneInput, setPhoneInput] = useState('')
  const [codeInput, setCodeInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function authHeaders(): Promise<Record<string, string>> {
    const { data: { session } } = await supabase.auth.getSession()
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` }
  }

  async function handleSendCode() {
    setError(null)
    if (!phoneInput.trim()) { setError('Enter a phone number.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/sms/send-code', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ phoneNumber: phoneInput }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not send code.'); return }
      setStep('code')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleVerifyCode() {
    setError(null)
    if (!codeInput.trim()) { setError('Enter the code.'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/sms/verify-code', {
        method: 'POST',
        headers: await authHeaders(),
        body: JSON.stringify({ phoneNumber: phoneInput, code: codeInput }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Could not verify code.'); return }
      onChange(phoneInput, true)
      setStep('idle')
      setPhoneInput('')
      setCodeInput('')
    } catch {
      setError('Could not reach the server. Check your connection and try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleUnlink() {
    if (!user) return
    setSaving(true)
    const { error: err } = await supabase
      .from('profiles')
      .update({ phone_number: null, phone_verified: false })
      .eq('id', user.id)
    setSaving(false)
    if (!err) onChange(null, false)
  }

  return (
    <div style={{ height: '100%' }}>
      <div style={{
        background: T.card, border: T.cardBorder, borderRadius: 5, padding: '12px 14px',
        height: '100%', boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: phoneVerified || step !== 'idle' ? 12 : 0 }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%', background: T.accentDim,
            border: `1px solid ${T.accentBorder}`, display: 'flex', alignItems: 'center',
            justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4A3528', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>SMS Scoring</div>
            <div style={{ fontSize: 9, color: T.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {phoneVerified ? `Linked: ${phoneNumber}` : 'Log by text'}
            </div>
          </div>
          {phoneVerified ? (
            <button onClick={handleUnlink} disabled={saving} style={{
              background: 'none', border: 'none', cursor: saving ? 'default' : 'pointer',
              fontSize: 10, color: T.muted, textDecoration: 'underline', textUnderlineOffset: 3,
              fontFamily: T.sans, flexShrink: 0, opacity: saving ? 0.6 : 1,
            }}>Unlink</button>
          ) : step === 'idle' && (
            <button onClick={() => setStep('phone')} style={{
              background: T.accent, border: '1.5px solid #4A3528', borderRadius: 5,
              padding: '6px 10px', color: '#FAF3E2', fontSize: 9, fontWeight: 700,
              cursor: 'pointer', fontFamily: T.sans, letterSpacing: '0.06em',
              textTransform: 'uppercase', flexShrink: 0,
            }}>Enable</button>
          )}
        </div>

        {step === 'phone' && (
          <div>
            <input
              type="tel"
              value={phoneInput}
              onChange={e => setPhoneInput(e.target.value)}
              placeholder="(555) 123-4567"
              style={{
                width: '100%', background: T.cardInner, border: T.cardBorder, borderRadius: 5,
                padding: '10px 12px', fontSize: 16, color: '#4A3528', fontFamily: T.sans,
                outline: 'none', marginBottom: 8, boxSizing: 'border-box',
              }}
            />
            {error && <div style={{ fontSize: 11, color: '#B03030', marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setStep('idle'); setError(null) }} style={{
                flex: 1, padding: '10px 0', borderRadius: 5,
                background: 'rgba(74,53,40,0.05)', border: '1px solid rgba(74,53,40,0.15)',
                color: T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans,
              }}>Cancel</button>
              <button onClick={handleSendCode} disabled={saving} style={{
                flex: 2, padding: '10px 0', borderRadius: 5,
                background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
                color: '#FAF3E2', fontSize: 11, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1, fontFamily: T.sans, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>{saving ? 'Sending...' : 'Send code'}</button>
            </div>
          </div>
        )}

        {step === 'code' && (
          <div>
            <div style={{ fontSize: 11, color: T.muted, marginBottom: 8 }}>
              We texted a 6-digit code to {phoneInput}.
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={codeInput}
              onChange={e => setCodeInput(e.target.value)}
              placeholder="123456"
              style={{
                width: '100%', background: T.cardInner, border: T.cardBorder, borderRadius: 5,
                padding: '10px 12px', fontSize: 16, color: '#4A3528', fontFamily: T.sans,
                outline: 'none', marginBottom: 8, boxSizing: 'border-box', letterSpacing: '0.2em',
              }}
            />
            {error && <div style={{ fontSize: 11, color: '#B03030', marginBottom: 8 }}>{error}</div>}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { setStep('idle'); setError(null) }} style={{
                flex: 1, padding: '10px 0', borderRadius: 5,
                background: 'rgba(74,53,40,0.05)', border: '1px solid rgba(74,53,40,0.15)',
                color: T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans,
              }}>Cancel</button>
              <button onClick={handleVerifyCode} disabled={saving} style={{
                flex: 2, padding: '10px 0', borderRadius: 5,
                background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
                color: '#FAF3E2', fontSize: 11, fontWeight: 700, cursor: saving ? 'default' : 'pointer',
                opacity: saving ? 0.7 : 1, fontFamily: T.sans, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>{saving ? 'Verifying...' : 'Verify'}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
