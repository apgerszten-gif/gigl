'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { normalizeUsername, isValidUsername, USERNAME_RULES_TEXT } from '@/lib/username'

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
