'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'

export default function AuthPage() {
  const router = useRouter()
  const supabase = createClient()

  const [mode, setMode] = useState<'signup' | 'signin'>('signup')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)

    if (mode === 'signup') {
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
      if (signUpError) { setError(signUpError.message); setLoading(false); return }

      // Create profile with username
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: username.trim().toLowerCase().replace(/\s+/g, '_'),
        })
      }
    } else {
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
      background: '#000000',
      fontFamily: "'Manrope', sans-serif",
      color: '#ffffff',
      maxWidth: 430,
      margin: '0 auto',
      display: 'flex',
      flexDirection: 'column',
      padding: '0 24px',
    }}>

      {/* Top wordmark */}
      <div style={{ paddingTop: 60, marginBottom: 48 }}>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 32, fontWeight: 700, color: '#D35400',
          letterSpacing: '0.04em', marginBottom: 8,
        }}>Gigl</div>
        <div style={{
          fontSize: 10, color: '#A8A29E', letterSpacing: '0.14em',
          textTransform: 'uppercase',
        }}>Festival season · 2026</div>
      </div>

      {/* Headline */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          fontSize: 10, color: '#D35400', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>
          {mode === 'signup' ? 'Create your account' : 'Welcome back'}
        </div>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 34, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em',
        }}>
          {mode === 'signup' ? (
            <>Rate the sets.<br /><span style={{ color: '#D35400', fontStyle: 'italic' }}>Own the moment.</span></>
          ) : (
            <>Good to have<br /><span style={{ color: '#D35400', fontStyle: 'italic' }}>you back.</span></>
          )}
        </div>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 24 }}>
        {mode === 'signup' && (
          <div style={{ background: '#131313', borderRadius: 4, padding: '14px 16px' }}>
            <div style={{
              fontSize: 9, color: '#A8A29E', letterSpacing: '0.1em',
              textTransform: 'uppercase', marginBottom: 6,
            }}>Username</div>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="how you'll appear in the feed"
              style={{
                width: '100%', background: 'none', border: 'none', outline: 'none',
                color: '#ffffff', fontSize: 15, fontFamily: "'Manrope', sans-serif",
              }}
            />
          </div>
        )}

        <div style={{ background: '#131313', borderRadius: 4, padding: '14px 16px' }}>
          <div style={{
            fontSize: 9, color: '#A8A29E', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 6,
          }}>Email</div>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: '100%', background: 'none', border: 'none', outline: 'none',
              color: '#ffffff', fontSize: 15, fontFamily: "'Manrope', sans-serif",
            }}
          />
        </div>

        <div style={{ background: '#131313', borderRadius: 4, padding: '14px 16px' }}>
          <div style={{
            fontSize: 9, color: '#A8A29E', letterSpacing: '0.1em',
            textTransform: 'uppercase', marginBottom: 6,
          }}>Password</div>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            style={{
              width: '100%', background: 'none', border: 'none', outline: 'none',
              color: '#ffffff', fontSize: 15, fontFamily: "'Manrope', sans-serif",
            }}
          />
        </div>

        {error && (
          <div style={{
            fontSize: 12, color: '#e05555', fontFamily: "'Manrope', sans-serif",
            padding: '10px 14px', background: 'rgba(224,85,85,0.08)',
            borderRadius: 4, lineHeight: 1.5,
          }}>{error}</div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          style={{
            width: '100%', background: '#D35400',
            border: 'none', borderRadius: 4, padding: 16,
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.2s',
            marginTop: 4,
          }}
        >
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#fff',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'Manrope', sans-serif",
          }}>
            {loading ? 'Please wait...' : mode === 'signup' ? 'Create account' : 'Sign in'}
          </span>
        </button>
      </div>

      {/* Switch mode */}
      <div style={{
        textAlign: 'center',
        fontSize: 13, color: '#A8A29E',
        fontFamily: "'Manrope', sans-serif",
      }}>
        {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
        <span
          onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }}
          style={{ color: '#D35400', cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}
        >
          {mode === 'signup' ? 'Sign in' : 'Sign up'}
        </span>
      </div>

      {/* Bottom accent */}
      <div style={{ flex: 1 }} />
      <div style={{
        paddingBottom: 48, textAlign: 'center',
        fontSize: 10, color: '#2a1a10', letterSpacing: '0.1em',
        textTransform: 'uppercase',
      }}>
        Rate every set. Rank every moment.
      </div>
    </div>
  )
}
