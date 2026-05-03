'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ARTISTS } from '@/lib/artists'
import { getFestival, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { eloToDisplay } from '@/lib/elo'
import { VideoPlayer } from '@/components/VideoPlayer'
import { useTheme } from '@/components/FestivalThemeProvider'

const SCORE_THRESHOLD = 4
const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'

function isVideoUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ['mp4', 'mov', 'webm', 'm4v', 'avi'].includes(ext ?? '')
}

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
  const T = useTheme()

  const [globalFeed, setGlobalFeed]         = useState<GlobalLog[]>([])
  const [loading, setLoading]               = useState(true)
  const [currentUserId, setCurrentUserId]   = useState<string | null>(null)
  const [userLogCounts, setUserLogCounts]   = useState<Record<string, number>>({})
  const [festivalName, setFestivalName]     = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (id) {
      const f = getFestival(id)
      if (f) setFestivalName(f.shortName + ' ' + f.dates.slice(-4))
    }
  }, [])

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
    return day.charAt(0).toUpperCase() + day.slice(1)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      fontFamily: T.sans,
      color: '#ffffff',
      maxWidth: 430,
      margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '20px 24px 16px',
        position: 'sticky', top: 0, background: T.bgRgba, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {T.logoUrl ? (
          <img src={T.logoUrl} alt="Festival" style={{ height: 22, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        ) : (
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: '0.04em' }}>Gigl</div>
        )}
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: T.sans, letterSpacing: '0.06em' }}
        >sign out</button>
      </div>

      {/* Feed header */}
      <div style={{ padding: '20px 24px 8px' }}>
        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 4,
        }}>{festivalName ?? 'Festival Season 2026'}</div>
        <div style={{
          fontFamily: T.serif,
          fontSize: 28, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 16,
        }}>
          What everyone&apos;s<br />
          <span style={{ color: T.accent, fontStyle: 'italic' }}>ranking.</span>
        </div>
        {/* Activity / Rankings tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          <button style={{
            flex: 1, padding: '8px 0', borderRadius: 4,
            background: T.accent, border: 'none',
            color: '#fff', fontSize: 11, cursor: 'default',
            fontFamily: T.sans, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>Activity</button>
          <button onClick={() => router.push('/rankings')} style={{
            flex: 1, padding: '8px 0', borderRadius: 4,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer',
            fontFamily: T.sans, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>Rankings</button>
        </div>
      </div>

      {/* Feed list */}
      <div style={{ padding: '0 24px 100px' }}>
        {loading && (
          <div style={{
            textAlign: 'center', padding: 40,
            fontSize: 12, color: T.faint, letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}>Loading...</div>
        )}

        {!loading && globalFeed.length === 0 && (
          <div style={{ background: T.card, borderRadius: 4, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: T.muted, fontFamily: T.sans, lineHeight: 1.6 }}>
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
                  background: T.card,
                  borderRadius: 4,
                  overflow: 'hidden',
                  border: isPending ? `1.5px solid ${T.accentBorder}` : 'none',
                }}
              >
                {/* Photo / Video */}
                {resolvePhotoUrl(item.photo_url) && (
                  isVideoUrl(resolvePhotoUrl(item.photo_url)!) ? (
                    <VideoPlayer src={resolvePhotoUrl(item.photo_url)!} style={{ maxHeight: 220, objectFit: 'cover' }} />
                  ) : (
                    <img
                      src={resolvePhotoUrl(item.photo_url)!}
                      alt={name}
                      style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }}
                    />
                  )
                )}

                {/* Info row */}
                <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
                  {/* Score tile */}
                  <div style={{
                    width: 48, height: 48, background: T.cardInner,
                    flexShrink: 0, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', borderRadius: 4,
                  }}>
                    {isPending ? (
                      <span style={{ fontSize: 18 }}>🔒</span>
                    ) : showScore ? (
                      <span style={{
                        fontFamily: T.serif,
                        fontSize: 18, fontWeight: 700, color: T.accent,
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
                    <div
                      onClick={() => router.push(`/artist/${item.artist_id}`)}
                      style={{
                        fontFamily: T.serif,
                        fontSize: 15, fontWeight: 600, color: '#ffffff',
                        marginBottom: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        cursor: 'pointer',
                      }}>{name}</div>
                    <div style={{
                      fontSize: 10, color: T.muted,
                      letterSpacing: '0.06em', textTransform: 'uppercase',
                      fontFamily: T.sans, marginBottom: 2,
                    }}>
                      {stageName}{day ? ` · ${dayLabel(day)}` : ''}
                    </div>
                    <div
                      onClick={() => router.push(isMe ? '/profile' : `/u/${username}`)}
                      style={{
                        fontSize: 11,
                        color: isMe ? T.accent : T.muted,
                        fontFamily: T.sans,
                        fontWeight: isMe ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >
                      @{username}
                    </div>
                  </div>

                  {/* Time */}
                  <div style={{
                    fontSize: 10, color: T.faint, letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontFamily: T.sans,
                    flexShrink: 0,
                  }}>
                    {timeAgo(item.created_at)}
                  </div>
                </div>

                {/* Review */}
                {item.review && (
                  <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.5 }}>
                    &ldquo;{item.review}&rdquo;
                  </div>
                )}

                {/* Tags */}
                {item.tags && item.tags.length > 0 && (
                  <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {item.tags.map(tag => (
                      <span key={tag} style={{
                        fontSize: 10, padding: '3px 10px', borderRadius: 20,
                        background: T.accentDim, color: T.accentMuted,
                        border: `1px solid ${T.accentBorder}`,
                        fontFamily: T.sans, letterSpacing: '0.04em',
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
        background: T.bgRgba, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={T.accent} stroke="none">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{
            fontSize: 9, color: T.accent, letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: T.sans,
          }}>Home</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div style={{
            width: 40, height: 40, background: T.accent, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -20, cursor: 'pointer',
            boxShadow: `0 4px 16px ${T.accentGlow}`,
          }} onClick={() => router.push('/log')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{
            fontSize: 9, color: T.muted, letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: T.sans,
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
            stroke={T.muted} strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{
            fontSize: 9, color: T.muted, letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: T.sans,
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
