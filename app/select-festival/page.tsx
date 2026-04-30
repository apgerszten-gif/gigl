'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FESTIVALS, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'

const T = {
  bg:           '#000000',
  card:         '#131313',
  accent:       '#D35400',
  accentDim:    'rgba(211,84,0,0.1)',
  accentBorder: 'rgba(211,84,0,0.25)',
  white:        '#ffffff',
  muted:        '#A8A29E',
  faint:        '#555555',
  serif:        "'Noto Serif', Georgia, serif",
  sans:         "'Manrope', sans-serif",
}

export default function SelectFestivalPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/auth')
    })
  }, [])

  function select(id: string) {
    localStorage.setItem(LOCAL_STORAGE_KEY, id)
    router.push('/feed')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.white,
      fontFamily: T.sans,
      maxWidth: 430,
      margin: '0 auto',
    }}>

      {/* Header */}
      <div style={{
        padding: '52px 24px 32px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{
          fontFamily: T.serif, fontSize: 26, fontWeight: 700,
          color: T.accent, letterSpacing: '0.04em', marginBottom: 20,
        }}>Gigl</div>

        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600,
          marginBottom: 8,
        }}>Choose your festival</div>

        <div style={{
          fontFamily: T.serif, fontSize: 30, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 10,
        }}>
          Where are you<br />
          <span style={{ color: T.accent, fontStyle: 'italic' }}>headed?</span>
        </div>

        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
          We'll load the full lineup so you can start logging sets.
        </div>
      </div>

      {/* Festival list */}
      <div style={{ padding: '16px 24px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FESTIVALS.map(f => (
          <button
            key={f.id}
            onClick={() => select(f.id)}
            style={{
              background: T.card,
              border: '1px solid rgba(255,255,255,0.04)',
              borderRadius: 4,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(211,84,0,0.35)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)')}
          >
            {/* Emoji */}
            <div style={{
              fontSize: 28, lineHeight: 1,
              marginTop: 2, flexShrink: 0,
            }}>{f.emoji}</div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.serif, fontSize: 18, fontWeight: 700,
                color: T.white, marginBottom: 3, lineHeight: 1.2,
              }}>{f.name}</div>

              <div style={{
                fontSize: 10, color: T.muted, letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 10,
              }}>
                {f.dates} · {f.city}, {f.state}
              </div>

              {/* Headliner pills */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {f.headliners.map(h => (
                  <span key={h} style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: 20,
                    background: T.accentDim,
                    color: T.accent,
                    border: `1px solid ${T.accentBorder}`,
                    fontFamily: T.sans, fontWeight: 600,
                  }}>{h}</span>
                ))}
              </div>
            </div>

            {/* Arrow */}
            <div style={{ flexShrink: 0, marginTop: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555555" strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        ))}

        <div style={{
          textAlign: 'center', marginTop: 16,
          fontSize: 11, color: T.faint, letterSpacing: '0.08em',
          fontFamily: T.sans, lineHeight: 1.6,
        }}>
          More festivals coming soon
        </div>
      </div>
    </div>
  )
}
