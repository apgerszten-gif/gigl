'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ARTISTS } from '@/lib/artists'
import { createClient } from '@/lib/supabase/client'
import { newRatings } from '@/lib/elo'
import { useTheme } from '@/components/FestivalThemeProvider'

interface LoggedArtist {
  artist_id: string
  elo:       number
  emoji:     string
}

const BUCKET_LABEL: Record<string, string> = {
  loved: 'loved',
  ok:    'ok',
  skip:  'skip',
}

function BattleInner() {
  const router       = useRouter()
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const newArtistId  = searchParams.get('newArtistId')
  const T = useTheme()

  const [logs, setLogs]                 = useState<LoggedArtist[]>([])
  const [bucketLogs, setBucketLogs]     = useState<LoggedArtist[]>([])
  const [pair, setPair]                 = useState<[LoggedArtist, LoggedArtist] | null>(null)
  const [loading, setLoading]           = useState(true)
  const [battles, setBattles]           = useState(0)
  const [sessionLimit, setSessionLimit] = useState(4)
  const [picked, setPicked]             = useState<string | null>(null)

  const usedOpponents = useRef<Set<string>>(new Set())

  useEffect(() => { fetchLogs(true) }, [])

  async function fetchLogs(initial = false) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const { data } = await supabase
      .from('logged_shows')
      .select('artist_id, elo, emoji')
      .eq('user_id', user.id)
      .order('elo', { ascending: false })

    if (!data || data.length < 2) {
      router.push('/feed')
      setLoading(false)
      return
    }

    setLogs(data)

    if (initial) {
      const newArtist = data.find(a => a.artist_id === newArtistId)
      const bucket    = newArtist?.emoji ?? null
      const sameBucket = bucket ? data.filter(a => a.emoji === bucket) : data
      setBucketLogs(sameBucket)

      if (sameBucket.length < 2) { router.push('/feed'); return }

      const possibleOpponents = sameBucket.filter(a => a.artist_id !== newArtistId).length
      setSessionLimit(Math.min(4, possibleOpponents))
      pickPair(sameBucket, new Set(), newArtistId)
    }

    setLoading(false)
  }

  function pickPair(data: LoggedArtist[], used: Set<string>, anchorId?: string | null) {
    const anchor = anchorId ?? newArtistId

    if (!anchor) {
      const shuffled = [...data].sort(() => Math.random() - 0.5)
      setPair([shuffled[0], shuffled[1]])
      return
    }

    const newArtist = data.find(a => a.artist_id === anchor)
    if (!newArtist) { router.push('/feed'); return }

    const available = data.filter(a => a.artist_id !== anchor && !used.has(a.artist_id))
    if (available.length === 0) { router.push('/feed'); return }

    const opponent = available[Math.floor(Math.random() * available.length)]
    setPair([newArtist, opponent])
  }

  async function handlePick(winnerId: string) {
    if (!pair || picked) return
    setPicked(winnerId)

    setTimeout(async () => {
      const [a, b]    = pair
      const isAWinner = winnerId === a.artist_id
      const winner    = isAWinner ? a : b
      const loser     = isAWinner ? b : a

      const opponentId = winner.artist_id === newArtistId ? loser.artist_id : winner.artist_id
      usedOpponents.current.add(opponentId)

      const { winner: newW, loser: newL } = newRatings(winner.elo, loser.elo)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await Promise.all([
        supabase.from('logged_shows').update({ elo: newW }).match({ user_id: user.id, artist_id: winner.artist_id }),
        supabase.from('logged_shows').update({ elo: newL }).match({ user_id: user.id, artist_id: loser.artist_id }),
      ])

      const newCount = battles + 1
      setBattles(newCount)
      setPicked(null)

      if (newCount >= sessionLimit) { router.push('/feed'); return }

      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const { data: freshLogs } = await supabase
        .from('logged_shows')
        .select('artist_id, elo, emoji')
        .eq('user_id', u.id)
        .order('elo', { ascending: false })

      if (freshLogs && freshLogs.length >= 2) {
        setLogs(freshLogs)
        const newEntry  = freshLogs.find(a => a.artist_id === newArtistId)
        const bucket    = newEntry?.emoji ?? null
        const freshBucket = bucket ? freshLogs.filter(a => a.emoji === bucket) : freshLogs
        setBucketLogs(freshBucket)
        pickPair(freshBucket, usedOpponents.current)
      }
    }, 700)
  }

  function getArtist(id: string) {
    return ARTISTS.find(a => a.id === id)
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
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
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
                const artist   = getArtist(log.artist_id)
                if (!artist) return null
                const isNew    = log.artist_id === newArtistId
                const isWinner = picked === log.artist_id
                const isLoser  = picked !== null && picked !== log.artist_id

                return (
                  <button
                    key={log.artist_id}
                    onClick={() => handlePick(log.artist_id)}
                    disabled={!!picked}
                    style={{
                      background: isWinner ? T.accentDim : T.card,
                      border: isWinner
                        ? `2px solid ${T.accent}`
                        : isNew
                        ? `1.5px solid ${T.accentBorder}`
                        : T.cardBorder,
                      boxShadow: isWinner ? T.cardShadow : 'none',
                      borderRadius: 5, overflow: 'hidden',
                      cursor: picked ? 'default' : 'pointer',
                      textAlign: 'left',
                      opacity:   isLoser ? 0.4 : 1,
                      transform: isWinner ? 'scale(1.02)' : 'scale(1)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div style={{
                      background: isWinner ? T.accentDim : T.cardInner,
                      height: 140, display: 'flex', alignItems: 'flex-end',
                      padding: 12, position: 'relative',
                      transition: 'background 0.25s ease',
                    }}>
                      {isWinner && (
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          fontSize: 20, lineHeight: 1,
                        }}>✓</div>
                      )}
                      {isNew && !isWinner && (
                        <div style={{
                          position: 'absolute', top: 10, right: 10,
                          fontSize: 9, color: T.accent, letterSpacing: '0.1em',
                          textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700,
                          background: T.accentDim, padding: '3px 7px', borderRadius: 20,
                          border: `1px solid ${T.accentBorder}`,
                        }}>New</div>
                      )}
                      <div>
                        <div style={{
                          fontFamily: T.serif, fontSize: 15, fontWeight: 700,
                          color: '#4A3528', letterSpacing: '-0.3px',
                        }}>{artist.name}</div>
                        <div style={{
                          fontSize: 9, color: T.muted, letterSpacing: '0.06em',
                          textTransform: 'uppercase', fontFamily: T.sans,
                          marginTop: 2, fontWeight: 600,
                        }}>{artist.stage}</div>
                      </div>
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{
                        background: isWinner ? T.accent : T.cardInner,
                        border: isWinner ? '1.5px solid #4A3528' : '1px solid rgba(74,53,40,0.15)',
                        borderRadius: 4, padding: 8,
                        textAlign: 'center', fontSize: 11, fontWeight: 700,
                        color: isWinner ? '#FAF3E2' : T.muted,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        fontFamily: T.sans,
                        transition: 'all 0.25s ease',
                      }}>
                        {isWinner ? '✓ Picked' : 'Pick this'}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>

            {!picked && (
              <div style={{ textAlign: 'center' }}>
                <button
                  onClick={() => pickPair(bucketLogs, usedOpponents.current)}
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
