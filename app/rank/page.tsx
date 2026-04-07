'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ARTISTS } from '@/lib/artists'
import { createClient } from '@/lib/supabase/client'
import { newRatings, eloToDisplay } from '@/lib/elo'

interface LoggedArtist {
  artist_id: string
  elo: number
  reaction: string
}

export default function RankingsPage() {
  const router   = useRouter()
  const supabase = createClient()

  const [logs, setLogs]           = useState<LoggedArtist[]>([])
  const [pair, setPair]           = useState<[LoggedArtist, LoggedArtist] | null>(null)
  const [loading, setLoading]     = useState(true)
  const [battlesLeft, setBattlesLeft] = useState(0)

  useEffect(() => { fetchLogs() }, [])

  async function fetchLogs() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data } = await supabase
      .from('show_logs')
      .select('artist_id, elo, reaction')
      .eq('user_id', user.id)
      .neq('reaction', 'skip')
      .order('elo', { ascending: false })

    if (data && data.length >= 2) {
      setLogs(data)
      setBattlesLeft(Math.max(0, 10 - data.length))
      pickPair(data)
    }
    setLoading(false)
  }

  function pickPair(data: LoggedArtist[]) {
    // Pick two random logged artists that are close in Elo
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    setPair([shuffled[0], shuffled[1]])
  }

  async function handlePick(winnerId: string) {
    if (!pair) return
    const [a, b] = pair
    const isAWinner = winnerId === a.artist_id
    const winner = isAWinner ? a : b
    const loser  = isAWinner ? b : a

    const { winner: newW, loser: newL } = newRatings(winner.elo, loser.elo)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await Promise.all([
      supabase.from('show_logs')
        .update({ elo: newW })
        .match({ user_id: user.id, artist_id: winner.artist_id }),
      supabase.from('show_logs')
        .update({ elo: newL })
        .match({ user_id: user.id, artist_id: loser.artist_id }),
    ])

    await fetchLogs()
  }

  function getArtist(id: string) {
    return ARTISTS.find(a => a.id === id)
  }

  const topFive = logs.slice(0, 5)

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
        }}>Head to Head</div>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 34, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 6,
        }}>
          Which set hit<br />
          <span style={{ color: '#D35400', fontStyle: 'italic' }}>harder?</span>
        </div>
        <div style={{
          fontSize: 10, color: '#594238', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 28,
        }}>
          {logs.length} logged · {battlesLeft > 0 ? `${battlesLeft} battles to unlock scores` : 'Scores unlocked'}
        </div>

        {/* Battle cards */}
        {pair && logs.length >= 2 ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {pair.map(log => {
                const artist = getArtist(log.artist_id)
                if (!artist) return null
                return (
                  <button
                    key={log.artist_id}
                    onClick={() => handlePick(log.artist_id)}
                    style={{
                      background: '#1a1a1a', border: 'none',
                      borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{
                      background: artist.day === 'friday' ? '#2a1f0f'
                        : artist.day === 'saturday' ? '#0f1a1a' : '#1a0f1a',
                      height: 130, display: 'flex', alignItems: 'flex-end',
                      padding: 12, position: 'relative',
                    }}>
                      {logs.length >= 5 && (
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          fontFamily: "'Noto Serif', Georgia, serif",
                          fontSize: 28, fontWeight: 700,
                          color: 'rgba(211,84,0,0.2)', lineHeight: 1,
                        }}>
                          {eloToDisplay(log.elo)}
                        </div>
                      )}
                      <div>
                        <div style={{
                          fontFamily: "'Noto Serif', Georgia, serif",
                          fontSize: 15, fontWeight: 600, color: '#f5ebe3',
                        }}>{artist.name}</div>
                        <div style={{
                          fontSize: 9, color: '#594238', letterSpacing: '0.06em',
                          textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                          marginTop: 2,
                        }}>{artist.day === 'friday' ? 'Apr 17' : artist.day === 'saturday' ? 'Apr 18' : 'Apr 19'}</div>
                      </div>
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{
                        background: '#D35400', borderRadius: 8, padding: 8,
                        textAlign: 'center',
                        fontSize: 11, fontWeight: 700, color: '#fff',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        fontFamily: "'Manrope', sans-serif",
                      }}>Pick this</div>
                    </div>
                  </button>
                )
              })}
            </div>

            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <button
                onClick={() => pickPair(logs)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 11, color: '#353534', letterSpacing: '0.06em',
                  textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                }}
              >
                Skip this match
              </button>
            </div>
          </>
        ) : (
          <div style={{
            background: '#1a1a1a', borderRadius: 16, padding: 24,
            textAlign: 'center', marginBottom: 28,
          }}>
            <div style={{
              fontSize: 13, color: '#594238', fontFamily: "'Manrope', sans-serif",
              lineHeight: 1.6,
            }}>
              Log at least 2 shows to start battling
            </div>
          </div>
        )}

        {/* Top 5 */}
        {topFive.length > 0 && (
          <div style={{ background: '#1a1a1a', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{
              fontSize: 10, color: '#594238', letterSpacing: '0.1em',
              textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
              marginBottom: 12,
            }}>Your current ranking</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {topFive.map((log, i) => {
                const artist = getArtist(log.artist_id)
                if (!artist) return null
                return (
                  <div key={log.artist_id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <span style={{
                      fontFamily: "'Noto Serif', Georgia, serif",
                      fontSize: 12, color: '#594238', width: 16,
                    }}>{i + 1}</span>
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontFamily: "'Noto Serif', Georgia, serif",
                        fontSize: 13, color: '#f5ebe3',
                      }}>{artist.name}</span>
                    </div>
                    <span style={{
                      fontFamily: "'Noto Serif', Georgia, serif",
                      fontSize: 14, fontWeight: 700,
                      color: logs.length >= 5 ? '#D35400' : '#353534',
                    }}>
                      {logs.length >= 5 ? eloToDisplay(log.elo) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: '#0e0e0e', padding: '16px 24px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <button onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#594238" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 9, color: '#594238', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>Home</span>
        </button>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 36, height: 36, background: '#D35400', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -18, cursor: 'pointer',
          }} onClick={() => router.push('/feed')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: 9, color: '#e0c0b2', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>Log</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#D35400" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{ fontSize: 9, color: '#D35400', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>Rankings</span>
        </div>
      </div>
    </div>
  )
}
