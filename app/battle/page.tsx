'use client'

import { useEffect, useState, Suspense, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ARTISTS } from '@/lib/artists'
import { createClient } from '@/lib/supabase/client'
import { newRatings } from '@/lib/elo'

interface LoggedArtist {
  artist_id: string
  elo: number
  emoji: string
}

// Map reaction → bucket label (matches ELO_SEEDS in log page)
const BUCKET_LABEL: Record<string, string> = {
  loved: 'loved',
  ok: 'ok',
  skip: 'skip',
}

function BattleInner() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const newArtistId = searchParams.get('newArtistId')

  const [logs, setLogs]                   = useState<LoggedArtist[]>([])
  const [bucketLogs, setBucketLogs]       = useState<LoggedArtist[]>([])
  const [pair, setPair]                   = useState<[LoggedArtist, LoggedArtist] | null>(null)
  const [loading, setLoading]             = useState(true)
  const [battles, setBattles]             = useState(0)
  const [sessionLimit, setSessionLimit]   = useState(4)
  const [picked, setPicked]               = useState<string | null>(null)

  const usedOpponents = useRef<Set<string>>(new Set())

  useEffect(() => { fetchLogs(true) }, [])

  async function fetchLogs(initial = false) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

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
      // Determine the bucket of the new artist
      const newArtist = data.find(a => a.artist_id === newArtistId)
      const bucket = newArtist?.emoji ?? null

      // Filter to only shows in the same bucket
      const sameBucket = bucket
        ? data.filter(a => a.emoji === bucket)
        : data

      setBucketLogs(sameBucket)

      if (sameBucket.length < 2) {
        // Only one show in this bucket — nothing to battle
        router.push('/feed')
        return
      }

      // Battle up to 4 other shows in the same bucket
      const possibleOpponents = sameBucket.filter(a => a.artist_id !== newArtistId).length
      const limit = Math.min(4, possibleOpponents)
      setSessionLimit(limit)
      pickPair(sameBucket, new Set(), newArtistId)
    }

    setLoading(false)
  }

  function pickPair(
    data: LoggedArtist[],
    used: Set<string>,
    anchorId?: string | null
  ) {
    const anchor = anchorId ?? newArtistId

    if (!anchor) {
      const shuffled = [...data].sort(() => Math.random() - 0.5)
      setPair([shuffled[0], shuffled[1]])
      return
    }

    const newArtist = data.find(a => a.artist_id === anchor)
    if (!newArtist) { router.push('/feed'); return }

    const available = data.filter(
      a => a.artist_id !== anchor && !used.has(a.artist_id)
    )

    if (available.length === 0) {
      router.push('/feed')
      return
    }

    const opponent = available[Math.floor(Math.random() * available.length)]
    setPair([newArtist, opponent])
  }

  async function handlePick(winnerId: string) {
    if (!pair || picked) return
    setPicked(winnerId)

    setTimeout(async () => {
      const [a, b] = pair
      const isAWinner = winnerId === a.artist_id
      const winner = isAWinner ? a : b
      const loser  = isAWinner ? b : a

      const opponentId = winner.artist_id === newArtistId ? loser.artist_id : winner.artist_id
      usedOpponents.current.add(opponentId)

      const { winner: newW, loser: newL } = newRatings(winner.elo, loser.elo)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await Promise.all([
        supabase.from('logged_shows')
          .update({ elo: newW })
          .match({ user_id: user.id, artist_id: winner.artist_id }),
        supabase.from('logged_shows')
          .update({ elo: newL })
          .match({ user_id: user.id, artist_id: loser.artist_id }),
      ])

      const newCount = battles + 1
      setBattles(newCount)
      setPicked(null)

      if (newCount >= sessionLimit) {
        router.push('/feed')
        return
      }

      // Refresh logs and pick next pair within same bucket
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) return
      const { data: freshLogs } = await supabase
        .from('logged_shows')
        .select('artist_id, elo, emoji')
        .eq('user_id', u.id)
        .order('elo', { ascending: false })

      if (freshLogs && freshLogs.length >= 2) {
        setLogs(freshLogs)
        // Re-filter to same bucket
        const newArtistEntry = freshLogs.find(a => a.artist_id === newArtistId)
        const bucket = newArtistEntry?.emoji ?? null
        const freshBucket = bucket
          ? freshLogs.filter(a => a.emoji === bucket)
          : freshLogs
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

      <div style={{ padding: '0 24px 40px' }}>
        {/* Progress dots */}
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 32 }}>
          {Array.from({ length: sessionLimit }).map((_, i) => (
            <div key={i} style={{
              width: 8, height: 8, borderRadius: '50%',
              background: i < battles ? '#D35400' : i === battles ? '#f5ebe3' : '#353534',
              transition: 'background 0.3s',
            }} />
          ))}
        </div>

        <div style={{
          fontSize: 10, color: '#D35400', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 8,
        }}>Battle {battles + 1} of {sessionLimit}</div>

        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 34, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 28,
        }}>
          Which set hit<br />
          <span style={{ color: '#D35400', fontStyle: 'italic' }}>harder?</span>
        </div>

        {pair && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
              {pair.map(log => {
                const artist = getArtist(log.artist_id)
                if (!artist) return null
                const isNew = log.artist_id === newArtistId
                const isWinner = picked === log.artist_id
                const isLoser = picked !== null && picked !== log.artist_id

                return (
                  <button
                    key={log.artist_id}
                    onClick={() => handlePick(log.artist_id)}
                    disabled={!!picked}
                    style={{
                      background: isWinner ? '#3a2200' : '#1a1a1a',
                      border: isWinner
                        ? '2px solid #D35400'
                        : isNew
                        ? '1.5px solid rgba(211,84,0,0.4)'
                        : '1.5px solid transparent',
                      borderRadius: 16, overflow: 'hidden',
                      cursor: picked ? 'default' : 'pointer',
                      textAlign: 'left',
                      opacity: isLoser ? 0.35 : 1,
                      transform: isWinner ? 'scale(1.03)' : 'scale(1)',
                      transition: 'all 0.25s ease',
                    }}
                  >
                    <div style={{
                      background: isWinner
                        ? '#4a2800'
                        : artist.day === 'friday' ? '#2a1f0f'
                        : artist.day === 'saturday' ? '#0f1a1a' : '#1a0f1a',
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
                          fontSize: 9, color: '#D35400', letterSpacing: '0.1em',
                          textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                          background: 'rgba(211,84,0,0.15)', padding: '3px 7px', borderRadius: 20,
                        }}>New</div>
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
                        }}>{artist.stage}</div>
                        <div style={{
                          fontSize: 9, color: '#594238', letterSpacing: '0.06em',
                          textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                        }}>
                          {artist.day === 'friday' ? 'Apr 17' : artist.day === 'saturday' ? 'Apr 18' : 'Apr 19'}
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{
                        background: isWinner ? '#D35400' : '#252220',
                        borderRadius: 8, padding: 8,
                        textAlign: 'center', fontSize: 11, fontWeight: 700,
                        color: isWinner ? '#fff' : '#594238',
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        fontFamily: "'Manrope', sans-serif",
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
                    fontSize: 11, color: '#353534', letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                  }}
                >
                  Skip this match
                </button>
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
