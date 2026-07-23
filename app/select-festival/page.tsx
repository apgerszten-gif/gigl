'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { FESTIVALS, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/FestivalThemeProvider'

export default function SelectFestivalPage() {
  const router   = useRouter()
  const supabase = createClient()
  const T = useTheme()

  const [isSwitching, setIsSwitching] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace('/')
    })
    setIsSwitching(!!localStorage.getItem(LOCAL_STORAGE_KEY))
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
        {isSwitching && (
          <button
            onClick={() => router.push('/feed')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

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

        {/* ── Venues tile — disabled / coming soon ──────────────────────────── */}
        <div
          aria-disabled="true"
          style={{
            background: T.card,
            border: `1.5px dashed ${T.muted}`,
            borderRadius: 5,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(139,117,96,0.12)',
            border: '1px solid rgba(139,117,96,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
              <path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.serif, fontSize: 18, fontWeight: 700,
              color: T.muted, letterSpacing: '-0.5px', marginBottom: 3, lineHeight: 1.2,
            }}>Venues</div>

            <div style={{
              fontSize: 10, color: T.faint, letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: T.sans,
              fontWeight: 600,
            }}>
              Coming soon
            </div>
          </div>

          <div style={{ flexShrink: 0, marginTop: 4 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13a2 2 0 0 1 2 -2h10a2 2 0 0 1 2 2v6a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2z" />
              <path d="M11 16a1 1 0 1 0 2 0a1 1 0 0 0 -2 0" />
              <path d="M8 11v-4a4 4 0 1 1 8 0v4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  )
}
