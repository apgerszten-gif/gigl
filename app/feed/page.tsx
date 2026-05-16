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
  artist_id:   string
  artist_name: string
  emoji:       string
  elo:         number
  created_at:  string
  user_id:     string
  stage:       string
  day:         string
  username:    string | null
  photo_url:   string | null
  review:      string | null
  tags:        string[] | null
}

function FeedInner() {
  const router     = useRouter()
  const supabase   = createClient()
  const searchParams   = useSearchParams()
  const pendingArtistId = searchParams.get('pending')
  const T = useTheme()

  const [globalFeed, setGlobalFeed]       = useState<GlobalLog[]>([])
  const [loading, setLoading]             = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [userLogCounts, setUserLogCounts] = useState<Record<string, number>>({})
  const [festivalName, setFestivalName]   = useState<string | null>(null)

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
    if (!user) { router.push('/'); return }
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

    setGlobalFeed(logs.map(l => ({ ...l, username: usernameMap[l.user_id] ?? null })))
    setLoading(false)
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1)  return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hrs = Math.floor(mins / 60)
    if (hrs < 24)  return `${hrs}h ago`
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
      color: '#4A3528',
      maxWidth: 430,
      margin: '0 auto',
    }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '18px 24px 14px',
        position: 'sticky', top: 0, zIndex: 10,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(74,53,40,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {T.logoUrl ? (
          <img
            src={T.logoUrl}
            alt="Festival"
            style={{ height: 22, objectFit: 'contain', filter: T.logoFilter }}
          />
        ) : (
          <div style={{
            fontFamily: T.serif, fontSize: 22, fontWeight: 700,
            color: '#4A3528', letterSpacing: '-0.5px',
          }}>
            Gigl<span style={{ color: T.accent }}>/</span>
          </div>
        )}
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 8px', color: T.muted,
            fontSize: 11, fontFamily: T.sans, letterSpacing: '0.06em',
          }}
        >sign out</button>
      </div>

      {/* ── Feed header ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 8px' }}>
        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 4,
        }}>{festivalName ?? 'Festival Season 2026'}</div>

        <div style={{
          fontFamily: T.serif,
          fontSize: 28, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-1px', marginBottom: 16, color: '#4A3528',
        }}>
          What everyone&apos;s<br />
          <span>ranking</span><span style={{ color: T.accent }}>.</span>
        </div>

        {/* Activity / Rankings tab toggle — split pill */}
        <div style={{
          display: 'flex',
          border: '2px solid #4A3528',
          borderRadius: 5,
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          <button style={{
            flex: 1, padding: '8px 0',
            background: '#4A3528', border: 'none',
            color: '#FAF3E2', fontSize: 11, cursor: 'default',
            fontFamily: T.sans, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>Activity</button>
          <button
            onClick={() => router.push('/rankings')}
            style={{
              flex: 1, padding: '8px 0',
              background: T.card,
              border: 'none', borderLeft: '2px solid #4A3528',
              color: '#4A3528', fontSize: 11, cursor: 'pointer',
              fontFamily: T.sans, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >Rankings</button>
        </div>
      </div>

      {/* ── Feed list ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 100px' }}>
        {loading && (
          <div style={{
            textAlign: 'center', padding: 40,
            fontSize: 11, color: T.faint,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
          }}>Loading...</div>
        )}

        {!loading && globalFeed.length === 0 && (
          <div style={{
            background: T.card, borderRadius: 5,
            border: T.cardBorder, boxShadow: T.cardShadow,
            padding: 32, textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              No ratings yet — be the first to log a show
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {globalFeed.map((item, i) => {
            const artist    = ARTISTS.find(a => a.id === item.artist_id)
            const name      = artist?.name      ?? item.artist_name ?? 'Unknown'
            const stageName = artist?.stage     ?? item.stage       ?? ''
            const day       = artist?.day       ?? item.day         ?? ''
            const isPending = item.artist_id === pendingArtistId && item.user_id === currentUserId
            const isMe      = item.user_id === currentUserId
            const username  = item.username ?? 'anonymous'
            const userCount = userLogCounts[item.user_id] ?? 0
            const showScore = userCount >= SCORE_THRESHOLD && !isPending
            const isTop     = i === 0

            return (
              <div
                key={`${item.user_id}-${item.artist_id}-${i}`}
                style={{
                  background: T.card,
                  borderRadius: 5,
                  overflow: 'hidden',
                  border: isPending ? `1.5px solid ${T.accent}` : T.cardBorder,
                  boxShadow: isTop ? T.cardShadow : 'none',
                }}
              >
                {/* Photo / Video */}
                {resolvePhotoUrl(item.photo_url) && (
                  isVideoUrl(resolvePhotoUrl(item.photo_url)!) ? (
                    <VideoPlayer
                      src={resolvePhotoUrl(item.photo_url)!}
                      style={{ maxHeight: 220, objectFit: 'cover' }}
                    />
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

                  {/* Score badge */}
                  <div style={{
                    width: 48, height: 48, flexShrink: 0, borderRadius: 4,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isPending || !showScore ? T.cardInner : T.accent,
                    border: isPending || !showScore
                      ? '1px solid rgba(74,53,40,0.15)'
                      : '1.5px solid #4A3528',
                    boxShadow: isTop && showScore && !isPending ? T.cardShadow : 'none',
                  }}>
                    {isPending || !showScore ? (
                      <span style={{ fontSize: 16 }}>🔒</span>
                    ) : (
                      <span style={{
                        fontFamily: T.serif, fontSize: 17, fontWeight: 700,
                        color: '#FAF3E2', lineHeight: 1,
                      }}>
                        {eloToDisplay(item.elo)}
                      </span>
                    )}
                  </div>

                  {/* Text info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => router.push(`/artist/${item.artist_id}`)}
                      style={{
                        fontFamily: T.serif, fontSize: 15, fontWeight: 700,
                        color: '#4A3528', letterSpacing: '-0.3px',
                        marginBottom: 2,
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        cursor: 'pointer',
                      }}
                    >{name}</div>
                    <div style={{
                      fontSize: 10, color: T.muted,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      fontFamily: T.sans, fontWeight: 600, marginBottom: 2,
                    }}>
                      {stageName}{day ? ` · ${dayLabel(day)}` : ''}
                    </div>
                    <div
                      onClick={() => router.push(isMe ? '/profile' : `/u/${username}`)}
                      style={{
                        fontSize: 11, fontFamily: T.sans,
                        color: isMe ? T.accent : T.muted,
                        fontWeight: isMe ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >@{username}</div>
                  </div>

                  {/* Timestamp */}
                  <div style={{
                    fontSize: 10, color: T.faint, letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontFamily: T.sans, flexShrink: 0,
                  }}>
                    {timeAgo(item.created_at)}
                  </div>
                </div>

                {/* Review quote */}
                {item.review && (
                  <div style={{
                    padding: '0 16px 10px',
                    fontSize: 12, color: 'rgba(74,53,40,0.65)',
                    fontStyle: 'italic', lineHeight: 1.55, fontFamily: T.sans,
                  }}>
                    &ldquo;{item.review}&rdquo;
                  </div>
                )}

                {/* Vibe tags */}
                {item.tags && item.tags.length > 0 && (
                  <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {item.tags.map(tag => (
                      <span key={tag} style={{
                        fontSize: 10, padding: '3px 10px', borderRadius: 20,
                        background: T.accentDim, color: T.accent,
                        border: `1.5px solid ${T.accentBorder}`,
                        fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.04em',
                      }}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
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
        {/* Home */}
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
            textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700,
          }}>Home</span>
        </button>

        {/* Log FAB */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            onClick={() => router.push('/log')}
            style={{
              width: 42, height: 42,
              background: T.accent, borderRadius: '50%',
              border: '1.5px solid #4A3528',
              boxShadow: '2px 2px 0 #4A3528',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: -18, cursor: 'pointer',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#FAF3E2" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{
            fontSize: 9, color: T.muted, letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600,
          }}>Log</span>
        </div>

        {/* You */}
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
            textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600,
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
