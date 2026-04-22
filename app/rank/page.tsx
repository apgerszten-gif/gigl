'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ARTISTS } from '@/lib/artists'
import { createClient } from '@/lib/supabase/client'
import { eloToDisplay } from '@/lib/elo'

const SCORE_THRESHOLD = 4

interface LoggedArtist {
  artist_id: string
  elo: number
}

export default function RankPage() {
  const router = useRouter()
  const supabase = createClient()

  const [logs, setLogs]       = useState<LoggedArtist[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data } = await supabase
        .from('logged_shows')
        .select('artist_id, elo')
        .eq('user_id', user.id)
        .order('elo', { ascending: false })

      if (data) setLogs(data)
      setLoading(false)
    }
    fetchLogs()
  }, [])

  function getArtist(id: string) {
    return ARTISTS.find(a => a.id === id)
  }

  const hasEnoughForScores = logs.length >= SCORE_THRESHOLD

  return (
    <div style={{
      minHeight: '100vh', background: '#131313',
      fontFamily: "'Manrope', sans-serif", color: '#f5ebe3',
      maxWidth: 430, margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '20px 24px',
      }}>
        <button onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#e0c0b2" strokeWidth="2"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
        <span style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 15, fontWeight: 700, color: '#D35400',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>Gigl</span>
        <div style={{ width: 18 }} />
      </div>

      <div style={{ padding: '0 24px 100px' }}>
        <div style={{
          fontSize: 10, color: '#D35400', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 8,
        }}>Your Rankings</div>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 34, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 6,
        }}>
          Your<br />
          <span style={{ color: '#D35400', fontStyle: 'italic' }}>Leaderboard.</span>
        </div>
        <div style={{
          fontSize: 10, color: '#594238', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 28,
        }}>
          {logs.length} shows ranked
          {!hasEnoughForScores && logs.length > 0 && ` · log ${SCORE_THRESHOLD - logs.length} more to unlock scores`}
        </div>

        {logs.length === 0 && !loading && (
          <div style={{
            background: '#1a1a1a', borderRadius: 16, padding: 32,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 13, color: '#594238', fontFamily: "'Manrope', sans-serif",
              lineHeight: 1.6,
            }}>
              Log some shows to build your rankings
            </div>
          </div>
        )}

        {logs.length > 0 && (
          <div style={{ background: '#1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
            {logs.map((log, i) => {
              const artist = getArtist(log.artist_id)
              if (!artist) return null
              const isTop3 = i < 3
              return (
                <div key={log.artist_id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 16px',
                  borderBottom: i < logs.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  background: isTop3 ? 'rgba(211,84,0,0.04)' : 'transparent',
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: isTop3 ? 'rgba(211,84,0,0.15)' : '#252220',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <span style={{
                      fontFamily: "'Noto Serif', Georgia, serif",
                      fontSize: 12, fontWeight: 700,
                      color: isTop3 ? '#D35400' : '#594238',
                    }}>{i + 1}</span>
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: "'Noto Serif', Georgia, serif",
                      fontSize: 14, fontWeight: 600, color: '#f5ebe3', marginBottom: 2,
                    }}>{artist.name}</div>
                    <div style={{
                      fontSize: 9, color: '#594238', letterSpacing: '0.06em',
                      textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                    }}>
                      {artist.stage} · {artist.day === 'friday' ? 'Apr 17' : artist.day === 'saturday' ? 'Apr 18' : 'Apr 19'}
                    </div>
                  </div>

                  <div style={{
                    fontFamily: "'Noto Serif', Georgia, serif",
                    fontSize: 20, fontWeight: 700,
                    color: hasEnoughForScores ? '#D35400' : '#353534',
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

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: '#0e0e0e', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <button onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#594238" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 9, color: '#594238', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>Home</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 40, height: 40, background: '#D35400', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -20, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(211,84,0,0.4)',
          }} onClick={() => router.push('/log')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: 9, color: '#e0c0b2', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>Log</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{ fontSize: 9, color: '#D35400', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>You</span>
        </div>
      </div>
    </div>
  )
}
