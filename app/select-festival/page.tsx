'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { FESTIVALS, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/FestivalThemeProvider'

export default function SelectFestivalPage() {
  const router   = useRouter()
  const supabase = createClient()
  const T = useTheme()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/')
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
      color: '#4A3528',
      fontFamily: T.sans,
      maxWidth: 430,
      margin: '0 auto',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '52px 24px 32px',
        borderBottom: '1px solid rgba(74,53,40,0.1)',
      }}>
        <div style={{
          fontFamily: T.serif, fontSize: 26, fontWeight: 700,
          color: '#4A3528', letterSpacing: '-0.5px', marginBottom: 20,
        }}>
          Gigl<span style={{ color: T.accent }}>/</span>
        </div>

        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
        }}>Choose your festival</div>

        <div style={{
          fontFamily: T.serif, fontSize: 30, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 10, color: '#4A3528',
        }}>
          Where are you<br />
          <span>headed</span><span style={{ color: T.accent }}>?</span>
        </div>

        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
          We&apos;ll load the full lineup so you can start logging sets.
        </div>
      </div>

      {/* ── Festival list ────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {FESTIVALS.map((f, i) => (
          <button
            key={f.id}
            onClick={() => select(f.id)}
            style={{
              background: T.card,
              border: T.cardBorder,
              boxShadow: i === 0 ? T.cardShadow : 'none',
              borderRadius: 5,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'box-shadow 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = T.cardShadow)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = i === 0 ? T.cardShadow : 'none')}
          >
            <div style={{ fontSize: 28, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>{f.emoji}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.serif, fontSize: 18, fontWeight: 700,
                color: '#4A3528', letterSpacing: '-0.5px', marginBottom: 3, lineHeight: 1.2,
              }}>{f.name}</div>

              <div style={{
                fontSize: 10, color: T.muted, letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: T.sans,
                fontWeight: 600, marginBottom: 10,
              }}>
                {f.dates} · {f.city}, {f.state}
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                {f.headliners.map(h => (
                  <span key={h} style={{
                    fontSize: 10, padding: '3px 10px', borderRadius: 20,
                    background: T.accentDim,
                    color: T.accent,
                    border: `1.5px solid ${T.accentBorder}`,
                    fontFamily: T.sans, fontWeight: 600,
                  }}>{h}</span>
                ))}
              </div>
            </div>

            <div style={{ flexShrink: 0, marginTop: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
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
