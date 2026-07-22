'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'

const ink    = '#4A3528'
const cream  = '#FAF3E2'
const paper  = '#EDE3D0'
const sienna = '#B85827'
const muted  = '#8B7560'
const faint  = '#B8A898'
const serif  = "'Space Grotesk', sans-serif"
const sans   = "'Inter', sans-serif"

export default function ChooseUsernamePage() {
  const router   = useRouter()
  const supabase = createClient()

  const [username, setUsername] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.replace('/'); return }
      supabase.from('profiles').select('username').eq('id', user.id).single().then(({ data }) => {
        if (data?.username) setUsername(data.username)
        setChecking(false)
      })
    })
  }, [])

  async function handleSubmit() {
    setError(null)
    const cleaned = username.trim().toLowerCase().replace(/\s+/g, '_')
    if (!cleaned) { setError('Pick a username to continue.'); return }
    setLoading(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.replace('/'); return }

    const { error: upsertError } = await supabase.from('profiles').upsert({
      id:           user.id,
      username:     cleaned,
      username_set: true,
    })
    if (upsertError) { setError(upsertError.message); setLoading(false); return }

    setLoading(false)
    const hasFestival = localStorage.getItem(LOCAL_STORAGE_KEY)
    router.push(hasFestival ? '/feed' : '/select-festival')
  }

  if (checking) return null

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
      <div style={{ paddingTop: 60, marginBottom: 48 }}>
        <div style={{
          fontFamily: serif, fontSize: 32, fontWeight: 700,
          color: ink, letterSpacing: '-0.5px', marginBottom: 8,
        }}>
          Gigl<span style={{ color: sienna }}>/</span>
        </div>
        <div style={{
          fontSize: 10, color: muted, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 600,
        }}>One last step</div>
      </div>

      {/* Headline */}
      <div style={{ marginBottom: 40 }}>
        <div style={{
          fontSize: 10, color: sienna, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 10,
        }}>Pick a username</div>
        <div style={{
          fontFamily: serif, fontSize: 34, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', color: ink,
        }}>
          How should we<br />bill you<span style={{ color: sienna }}>?</span>
        </div>
      </div>

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
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
            {loading ? 'Please wait...' : 'Continue'}
          </span>
        </button>
      </div>

      <div style={{ flex: 1 }} />
      <div style={{
        paddingBottom: 48, textAlign: 'center',
        fontSize: 10, color: faint, letterSpacing: '0.1em', textTransform: 'uppercase',
      }}>
        Rate every set<span style={{ color: sienna }}>.</span> Rank every moment<span style={{ color: sienna }}>.</span>
      </div>
    </div>
  )
}
