'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { recordBattleResult } from '@/lib/battleRecords'
import { useTheme } from '@/components/FestivalThemeProvider'

const MAX_SESSION = 10

interface LoggedArtist {
  artist_id:   string
  artist_name: string
  stage:       string
}

function pairKey(a: string, b: string): string {
  return [a, b].sort().join('|')
}

function BattleInner() {
  const router   = useRouter()
  const supabase = createClient()
  const T = useTheme()

  const [logs, setLogs]                 = useState<LoggedArtist[]>([])
  const [pair, setPair]                 = useState<[LoggedArtist, LoggedArtist] | null>(null)
  const [loading, setLoading]           = useState(true)
  const [battles, setBattles]           = useState(0)
  const [sessionLimit, setSessionLimit] = useState(MAX_SESSION)
  const [picked, setPicked]             = useState<string | null>(null)
  const [tossUp, setTossUp]             = useState(false)

  const usedPairKeys = useRef<Set<string>>(new Set())
  const userIdRef = useRef<string | null>(null)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    userIdRef.current = user.id

    const { data } = await supabase
      .from('logged_shows')
      .select('artist_id, artist_name, stage')
      .eq('user_id', user.id)

    if (!data || data.length < 2) {
      router.push('/feed')
      return
    }

    setLogs(data)
    const maxPossiblePairs = Math.floor((data.length * (data.length - 1)) / 2)
    setSessionLimit(Math.min(MAX_SESSION, maxPossiblePairs))
    pickPair(data)
    setLoading(false)
  }

  function pickPair(data: LoggedArtist[]) {
    const attempts = 30
    for (let i = 0; i < attempts; i++) {
      const shuffled = [...data].sort(() => Math.random() - 0.5)
      const [a, b] = shuffled
      if (!usedPairKeys.current.has(pairKey(a.artist_id, b.artist_id))) {
        setPair([a, b])
        return
      }
    }
    // Exhausted unique pairs for this session (small logged history) — repeat is fine.
    const shuffled = [...data].sort(() => Math.random() - 0.5)
    setPair([shuffled[0], shuffled[1]])
  }

  async function handlePick(winnerId: string) {
    if (!pair || picked || tossUp) return
    setPicked(winnerId)

    setTimeout(async () => {
      const [a, b]    = pair
      const isAWinner = winnerId === a.artist_id
      const winner    = isAWinner ? a : b
      const loser     = isAWinner ? b : a

      usedPairKeys.current.add(pairKey(winner.artist_id, loser.artist_id))

      const userId = userIdRef.current
      if (userId) {
        try {
          await recordBattleResult(supabase, userId, winner.artist_id, loser.artist_id)
        } catch (err) {
          console.error('recordBattleResult failed:', err)
        }
      }

      const newCount = battles + 1
      setBattles(newCount)
      setPicked(null)

      if (newCount >= sessionLimit) { router.push('/feed'); return }

      pickPair(logs)
    }, 700)
  }

  function handleTossUp() {
    if (!pair || picked || tossUp) return
    setTossUp(true)

    setTimeout(() => {
      const [a, b] = pair
      usedPairKeys.current.add(pairKey(a.artist_id, b.artist_id))

      const newCount = battles + 1
      setBattles(newCount)
      setTossUp(false)

      if (newCount >= sessionLimit) { router.push('/feed'); return }

      pickPair(logs)
    }, 700)
  }

  if (loading) return null

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

      <div style={{ padding: '24px 24px 40px' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          {Array.from({ length: sessionLimit }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i < battles ? T.accent : i === battles ? '#4A3528' : T.faint,
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
        }}>Battle {battles + 1} of {sessionLimit}</div>

        <div style={{
          fontFamily: T.serif, fontSize: 34, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 28, color: '#4A3528',
        }}>
          Which set hit<br />
          <span>harder</span><span style={{ color: T.accent }}>?</span>
        </div>

        {pair && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {pair.map(log => {
                const isWinner = picked === log.artist_id
                const isLoser  = picked !== null && picked !== log.artist_id
                const isTied   = tossUp

                return (
                  <button
                    key={log.artist_id}
                    onClick={() => handlePick(log.artist_id)}
                    disabled={!!picked || tossUp}
                    style={{
                      background: isWinner || isTied ? T.accentDim : T.card,
                      border: isWinner || isTied ? `2px solid ${T.accent}` : T.cardBorder,
                      boxShadow: isWinner || isTied ? T.cardShadow : 'none',
                      borderRadius: 5, overflow: 'hidden',
                      cursor: picked || tossUp ? 'default' : 'pointer',
                      textAlign: 'left',
                      opacity:   isLoser ? 0.4 : 1,
                      transform: isWinner ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div style={{
                      background: isWinner || isTied ? T.accentDim : T.cardInner,
                      height: 140, display: 'flex', alignItems: 'flex-end',
                      padding: 12, position: 'relative',
                      transition: 'background 0.25s ease',
                    }}>
                      {(isWinner || isTied) && (
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          fontSize: 20, lineHeight: 1,
                        }}>{isTied ? '=' : '✓'}</div>
                      )}
                      <div>
                        <div style={{
                          fontFamily: T.serif, fontSize: 15, fontWeight: 700,
                          color: '#4A3528', letterSpacing: '-0.3px',
                        }}>{log.artist_name}</div>
                        <div style={{
                          fontSize: 9, color: T.muted, letterSpacing: '0.06em',
                          textTransform: 'uppercase', fontFamily: T.sans,
                          marginTop: 2, fontWeight: 600,
                        }}>{log.stage}</div>
                      </div>
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{
                        background: isWinner || isTied ? T.accent : T.cardInner,
                        border: isWinner || isTied ? '1.5px solid #4A3528' : '1px solid rgba(74,53,40,0.15)',
                        borderRadius: 4, padding: 8,
                        textAlign: 'center', fontSize: 11, fontWeight: 700,
                        color: isWinner || isTied ? '#FAF3E2' : T.muted,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        fontFamily: T.sans,
                        transition: 'all 0.25s ease',
                      }}>
                        {isWinner ? '✓ Picked' : isTied ? "It's a toss up" : 'Pick this'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {!picked && !tossUp && (
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14, alignItems: 'center' }}>
                <button
                  onClick={handleTossUp}
                  style={{
                    background: 'none', border: `1px solid ${T.faint}`, borderRadius: 20,
                    cursor: 'pointer', padding: '8px 18px',
                    fontSize: 11, color: T.muted, letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700,
                  }}
                >It's a toss up</button>
                <button
                  onClick={() => pickPair(logs)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 11, color: T.faint, letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontFamily: T.sans,
                  }}
                >Skip this match</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function BattlePage() {
  return (
    <Suspense fallback={null}>
      <BattleInner />
    </Suspense>
  )
}
