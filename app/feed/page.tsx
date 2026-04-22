'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ARTISTS } from '@/lib/artists'
import { createClient } from '@/lib/supabase/client'
import { eloToDisplay } from '@/lib/elo'

const SCORE_THRESHOLD = 4
const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'

function resolvePhotoUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${SUPABASE_STORAGE}/${url}`
}

interface GlobalLog {
  artist_id: string
  artist_name: string
  emoji: string
  elo: number
  created_at: string
  user_id: string
  stage: string
  day: string
  username: string | null
  photo_url: string | null
  review: string | null
  tags: string[] | null
}

function FeedInner() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const pendingArtistId = searchParams.get('pending')

  const [globalFeed, setGlobalFeed]         = useState<GlobalLog[]>([])
  const [loading, setLoading]               = useState(true)
  const [currentUserId, setCurrentUserId]   = useState<string | null>(null)
  // Map of user_id -> number of logs they have
  const [userLogCounts, setUserLogCounts]   = useState<Record<string, number>>({})

  useEffect(() => { fetchFeed() }, [])

  async function fetchFeed() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }
    setCurrentUserId(user.id)

    const { data: logs } = await supabase
      .from('logged_shows')
      .select('artist_id, artist_name, emoji, elo, created_at, user_id, stage, day, photo_url, review, tags')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!logs) { setLoading(false); return }

    // Count logs per user
    const counts: Record<string, number> = {}
    logs.forEach(l => { counts[l.user_id] = (counts[l.user_id] ?? 0) + 1 })
    setUserLogCounts(counts)

    const userIds = logs.map(l => l.user_id).filter((id, i, arr) => arr.indexOf(id) === i)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username')
      .in('id', userIds)

    const usernameMap: Record<string, string> = {}
    profiles?.forEach(p => { usernameMap[p.id] = p.username })

    const enriched: GlobalLog[] = logs.map(l => ({
      ...l,
      username: usernameMap[l.user_id] ?? null,
    }))

    setGlobalFeed(enriched)
    setLoading(false)
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24) return `${hrs}h ago`
    return `${Math.floor(hrs / 24)}d ago`
  }

  function dayLabel(day: string) {
    if (day === 'friday') return 'Apr 17'
    if (day === 'saturday') return 'Apr 18'
    return 'Apr 19'
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#131313',
      fontFamily: "'Manrope', sans-serif",
      color: '#f5ebe3',
      maxWidth: 430,
      margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '20px 24px 16px',
        position: 'sticky', top: 0, background: '#131313', zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 22, fontWeight: 700, color: '#D35400',
          letterSpacing: '0.04em',
        }}>Gigl</div>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'rgba(245,235,227,0.25)', fontSize: 11, fontFamily: "'Manrope', sans-serif", letterSpacing: '0.06em' }}
        >sign out</button>
      </div>

      {/* Feed header */}
      <div style={{ padding: '20px 24px 8px' }}>
        <div style={{
          fontSize: 10, color: '#594238', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 4,
        }}>Coachella 2026 · Weekend 2</div>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 28, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 20,
        }}>
          What everyone's<br />
          <span style={{ color: '#D35400', fontStyle: 'italic' }}>ranking.</span>
        </div>
      </div>

      {/* Feed list */}
      <div style={{ padding: '0 24px 100px' }}>
        {loading && (
          <div style={{
            textAlign: 'center', padding: 40,
            fontSize: 12, color: '#353534', letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>Loading...</div>
        )}

        {!loading && globalFeed.length === 0 && (
          <div style={{
            background: '#1a1a1a', borderRadius: 16, padding: 32,
            textAlign: 'center',
          }}>
            <div style={{
              fontSize: 13, color: '#594238',
              fontFamily: "'Manrope', sans-serif", lineHeight: 1.6,
            }}>
              No ratings yet — be the first to log a show
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {globalFeed.map((item, i) => {
            const artist = ARTISTS.find(a => a.id === item.artist_id)
            const name = artist?.name ?? item.artist_name ?? 'Unknown'
            const stageName = artist?.stage ?? item.stage ?? ''
            const day = artist?.day ?? item.day ?? ''
            const isPending = item.artist_id === pendingArtistId && item.user_id === currentUserId
            const isMe = item.user_id === currentUserId
            const username = item.username ?? 'anonymous'
            const userCount = userLogCounts[item.user_id] ?? 0
            const showScore = userCount >= SCORE_THRESHOLD && !isPending

            return (
              <div
                key={`${item.user_id}-${item.artist_id}-${i}`}
                style={{
                  background: '#1a1a1a',
                  borderRadius: 12,
                  overflow: 'hidden',
                  border: isPending ? '1.5px solid rgba(211,84,0,0.3)' : 'none',
                }}
              >
                {/* Photo */}
                {resolvePhotoUrl(item.photo_url) && (
                  <img
                    src={resolvePhotoUrl(item.photo_url)!}
                    alt={name}
                    style={{
                      width: '100%', maxHeight: 220,
                      objectFit: 'cover', display: 'block',
                    }}
                  />
                )}

                {/* Info row */}
                <div style={{
                  padding: '14px 16px',
                  display: 'flex', gap: 14, alignItems: 'center',
                }}>
                  {/* Score tile */}
                  <div style={{
                    width: 48, height: 48, background: '#252220',
                    flexShrink: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', borderRadius: 10,
                  }}>
                    {isPending ? (
                      <span style={{ fontSize: 18 }}>🔒</span>
                    ) : showScore ? (
                      <span style={{
                        fontFamily: "'Noto Serif', Georgia, serif",
                        fontSize: 18, fontWeight: 700, color: '#D35400',
                        lineHeight: 1,
                      }}>
                        {eloToDisplay(item.elo)}
                      </span>
                    ) : (
                      <span style={{ fontSize: 16 }}>🔒</span>
                    )}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: "'Noto Serif', Georgia, serif",
                      fontSize: 15, fontWeight: 600, color: '#f5ebe3',
                      marginBottom: 2,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>{name}</div>
                    <div style={{
                      fontSize: 10, color: '#594238',
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      fontFamily: "'Manrope', sans-serif", marginBottom: 2,
                    }}>
                      {stageName}{day ? ` · ${dayLabel(day)}` : ''}
                    </div>
                    <div
                      onClick={() => router.push(isMe ? '/profile' : `/u/${username}`)}
                      style={{
                        fontSize: 11,
                        color: isMe ? '#D35400' : '#6b5248',
                        fontFamily: "'Manrope', sans-serif",
                        fontWeight: isMe ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      @{username}
                    </div>
                  </div>

                  {/* Time */}
                  <div style={{
                    fontSize: 10, color: '#353534', letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                    flexShrink: 0,
                  }}>
                    {timeAgo(item.created_at)}
                  </div>
                </div>

                {/* Review */}
                {item.review && (
                  <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'rgba(245,235,227,0.45)', fontStyle: 'italic', lineHeight: 1.5 }}>
                    "{item.review}"
                  </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {item.tags.map(tag => (
                      <span key={tag} style={{
                        fontSize: 10, padding: '3px 10px', borderRadius: 20,
                        background: 'rgba(211,84,0,0.12)', color: 'rgba(211,84,0,0.7)',
                        border: '1px solid rgba(211,84,0,0.2)',
                        fontFamily: "'Manrope', sans-serif", letterSpacing: '0.04em',
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: '#0e0e0e', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#D35400" stroke="none">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{
            fontSize: 9, color: '#D35400', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
          }}>Home</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 40, height: 40, background: '#D35400', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -20, cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(211,84,0,0.4)',
          }} onClick={() => router.push('/log')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{
            fontSize: 9, color: '#e0c0b2', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
          }}>Log</span>
        </div>

        <button
          onClick={() => router.push('/profile')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#594238" strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{
            fontSize: 9, color: '#594238', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
          }}>You</span>
        </button>
      </div>
    </div>
  )
}

export default function FeedPage() {
  return (
    <Suspense fallback={null}>
      <FeedInner />
    </Suspense>
  )
}
