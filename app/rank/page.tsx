'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { eloToDisplay } from '@/lib/elo'
import { useTheme } from '@/components/FestivalThemeProvider'

const SCORE_THRESHOLD = 4

interface LoggedArtist {
  artist_id:   string
  elo:         number
  artist_name: string
  stage:       string
}

export default function RankPage() {
  const router   = useRouter()
  const supabase = createClient()
  const T = useTheme()

  const [logs, setLogs]       = useState<LoggedArtist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data } = await supabase
        .from('logged_shows')
        .select('artist_id, elo, artist_name, stage')
        .eq('user_id', user.id)
        .order('elo', { ascending: false })

      if (data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [])

  const hasEnoughForScores = logs.length >= SCORE_THRESHOLD

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      fontFamily: T.sans, color: '#4A3528',
      maxWidth: 430, margin: '0 auto',
    }}>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '18px 24px',
        borderBottom: '1px solid rgba(74,53,40,0.1)',
      }}>
        <button onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke={T.muted} strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        {T.logoUrl ? (
          <img src={T.logoUrl} alt="Festival" style={{ height: 18, objectFit: 'contain', filter: T.logoFilter }} />
        ) : (
          <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: '#4A3528', letterSpacing: '-0.3px' }}>
            Gigl<span style={{ color: T.accent }}>/</span>
          </span>
        )}
        <div style={{ width: 18 }} />
      </div>

      <div style={{ padding: '20px 24px 100px' }}>
        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
        }}>Your Rankings</div>

        <div style={{
          fontFamily: T.serif, fontSize: 34, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 6, color: '#4A3528',
        }}>
          Your<br />
          <span>Leaderboard</span><span style={{ color: T.accent }}>.</span>
        </div>

        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 28, fontWeight: 600,
        }}>
          {logs.length} shows ranked
          {!hasEnoughForScores && logs.length > 0 && ` · log ${SCORE_THRESHOLD - logs.length} more to unlock scores`}
        </div>

        {logs.length === 0 && !loading && (
          <div style={{
            background: T.card, borderRadius: 5,
            border: T.cardBorder, boxShadow: T.cardShadow,
            padding: 32, textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              Log some shows to build your rankings
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div style={{
            background: T.card, borderRadius: 5,
            border: T.cardBorder, boxShadow: T.cardShadow,
            overflow: 'hidden',
          }}>
            {logs.map((log, i) => {
              const isTop3 = i < 3
              return (
                <div key={log.artist_id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  borderBottom: i < logs.length - 1 ? '1px solid rgba(74,53,40,0.08)' : 'none',
                  background: isTop3 ? T.accentDim : 'transparent',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isTop3 ? T.accentBorder : 'rgba(74,53,40,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: T.serif, fontSize: 12, fontWeight: 700,
                      color: isTop3 ? T.accent : T.muted,
                    }}>{i + 1}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: T.serif, fontSize: 14, fontWeight: 700,
                      color: '#4A3528', letterSpacing: '-0.3px', marginBottom: 2,
                    }}>{log.artist_name}</div>
                    <div style={{
                      fontSize: 9, color: T.muted, letterSpacing: '0.06em',
                      textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600,
                    }}>{log.stage}</div>
                  </div>

                  <div style={{
                    fontFamily: T.serif, fontSize: 20, fontWeight: 700,
                    color: hasEnoughForScores ? T.accent : T.faint,
                    minWidth: 36, textAlign: 'right',
                  }}>
                    {hasEnoughForScores ? eloToDisplay(log.elo) : '—'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Bottom nav ───────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1.5px solid rgba(74,53,40,0.15)',
        padding: '12px 32px 16px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <button onClick={() => router.push('/feed')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 9, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>Home</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div onClick={() => router.push('/log')} style={{
            width: 42, height: 42, background: T.accent, borderRadius: '50%',
            border: '1.5px solid #4A3528', boxShadow: '2px 2px 0 #4A3528',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -18, cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: 9, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>Log</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{ fontSize: 9, color: T.accent, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700 }}>You</span>
        </div>
      </div>
    </div>
  )
}
