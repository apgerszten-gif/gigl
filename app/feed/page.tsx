'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { getFestival, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { computeShowScore } from '@/lib/rating'
import { StarDisplay } from '@/components/StarDisplay'
import { VideoPlayer } from '@/components/VideoPlayer'
import { useTheme } from '@/components/FestivalThemeProvider'

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
  artist_id:          string
  artist_name:        string
  performance_rating: number | null
  venue_rating:        number | null
  vibe_rating:          number | null
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
  const T = useTheme()

  const [globalFeed, setGlobalFeed]       = useState<GlobalLog[]>([])
  const [loading, setLoading]             = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [festivalName, setFestivalName]   = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (id) {
      const f = getFestival(id)
      if (f) setFestivalName(f.emoji + ' ' + f.shortName + ' ' + f.dates.slice(-4))
    }
  }, [])

  useEffect(() => { fetchFeed() }, [])

  async function fetchFeed() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }
    setCurrentUserId(user.id)

    const { data: logs } = await supabase
      .from('logged_shows')
      .select('artist_id, artist_name, performance_rating, venue_rating, vibe_rating, created_at, user_id, stage, day, photo_url, review, tags')
      .order('created_at', { ascending: false })
      .limit(200)

    if (!logs) { setLoading(false); return }

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
      height: '100dvh',
      display: 'flex', flexDirection: 'column',
      background: T.bg,
      fontFamily: T.sans,
      color: '#4A3528',
      maxWidth: 430,
      margin: '0 auto',
      overflow: 'hidden',
    }}>

      {/* ── Top: combined identity row + tab toggle ─────────────────────────── */}
      <div style={{ flex: '0 0 auto' }}>

        {/* Logo · festival pill · switch/sign-out — one row */}
        <div style={{
          padding: '10px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
          borderBottom: '1px solid rgba(74,53,40,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            {T.logoUrl ? (
              <img
                src={T.logoUrl}
                alt="Festival"
                style={{ height: 18, objectFit: 'contain', filter: T.logoFilter, flexShrink: 0 }}
              />
            ) : (
              <div style={{
                fontFamily: T.serif, fontSize: 17, fontWeight: 700,
                color: '#4A3528', letterSpacing: '-0.5px', flexShrink: 0,
              }}>
                Gigl<span style={{ color: T.accent }}>/</span>
              </div>
            )}

            <button
              onClick={() => router.push('/select-festival')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                display: 'flex', alignItems: 'center', gap: 3, minWidth: 0,
              }}
            >
              <span style={{
                fontSize: 10, color: T.accent, letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 700,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{festivalName ?? 'Festival Season 2026'}</span>
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="3" style={{ flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <button
              onClick={() => router.push('/select-festival')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: T.accent, fontSize: 9, fontFamily: T.sans, letterSpacing: '0.06em', fontWeight: 600,
              }}
            >switch</button>
            <span style={{ fontSize: 9, color: T.faint }}>·</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem(LOCAL_STORAGE_KEY); router.push('/') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: T.muted, fontSize: 9, fontFamily: T.sans, letterSpacing: '0.06em',
              }}
            >sign out</button>
          </div>
        </div>

        {/* Activity / Rankings tab toggle — slim pill */}
        <div style={{ padding: '8px 20px' }}>
          <div style={{
            display: 'flex',
            border: '2px solid #4A3528',
            borderRadius: 5,
            overflow: 'hidden',
          }}>
            <button style={{
              flex: 1, padding: '5px 0',
              background: '#4A3528', border: 'none',
              color: '#FAF3E2', fontSize: 9, cursor: 'default',
              fontFamily: T.sans, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Activity</button>
            <button
              onClick={() => router.push('/rankings')}
              style={{
                flex: 1, padding: '5px 0',
                background: T.card,
                border: 'none', borderLeft: '2px solid #4A3528',
                color: '#4A3528', fontSize: 9, cursor: 'pointer',
                fontFamily: T.sans, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}
            >Rankings</button>
          </div>
        </div>
      </div>

      {/* ── Feed list — fills all remaining space, scrolls independently ────── */}
      <div style={{ flex: '1 1 auto', overflowY: 'auto', padding: '0 20px 12px' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {globalFeed.map((item, i) => {
            const name      = item.artist_name ?? 'Unknown'
            const stageName = item.stage       ?? ''
            const day       = item.day         ?? ''
            const isMe      = item.user_id === currentUserId
            const username  = item.username ?? 'anonymous'
            const isTop     = i === 0
            const hasScore  = item.performance_rating != null && item.venue_rating != null && item.vibe_rating != null
            const score     = hasScore
              ? computeShowScore(item.performance_rating!, item.venue_rating!, item.vibe_rating!)
              : null
            const hasTags    = !!item.tags && item.tags.length > 0
            const isFeatured = hasScore || hasTags || !!item.review
            const infoPadding = isFeatured ? '12px 14px' : '8px 14px'

            return (
              <div
                key={`${item.user_id}-${item.artist_id}-${i}`}
                style={{
                  background: T.card,
                  borderRadius: 5,
                  overflow: 'hidden',
                  border: T.cardBorder,
                  boxShadow: isFeatured && isTop ? T.cardShadow : 'none',
                }}
              >
                {/* Photo / Video */}
                {resolvePhotoUrl(item.photo_url) && (
                  isVideoUrl(resolvePhotoUrl(item.photo_url)!) ? (
                    <VideoPlayer
                      src={resolvePhotoUrl(item.photo_url)!}
                      style={{ maxHeight: 200, objectFit: 'cover' }}
                    />
                  ) : (
                    <img
                      src={resolvePhotoUrl(item.photo_url)!}
                      alt={name}
                      style={{ width: '100%', maxHeight: 200, objectFit: 'cover', display: 'block' }}
                    />
                  )
                )}

                {/* Info row */}
                <div style={{ padding: infoPadding, display: 'flex', gap: 12, alignItems: 'center' }}>

                  {/* Text info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      onClick={() => router.push(`/artist/${item.artist_id}`)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 8,
                        marginBottom: 2, cursor: 'pointer',
                      }}
                    >
                      <span style={{
                        fontFamily: T.serif, fontSize: 14, fontWeight: 700,
                        color: '#4A3528', letterSpacing: '-0.3px',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                        minWidth: 0,
                      }}>{name}</span>
                      {score !== null && <StarDisplay score={score} size={16} accent={T.accent} />}
                    </div>
                    <div
                      onClick={() => stageName && router.push(`/stage/${encodeURIComponent(stageName)}`)}
                      style={{
                        fontSize: 9, color: T.muted,
                        letterSpacing: '0.08em', textTransform: 'uppercase',
                        fontFamily: T.sans, fontWeight: 600, marginBottom: 2,
                        cursor: stageName ? 'pointer' : 'default',
                      }}
                    >
                      {stageName}{day ? ` · ${dayLabel(day)}` : ''}
                    </div>
                    <div
                      onClick={() => router.push(isMe ? '/profile' : `/u/${username}`)}
                      style={{
                        fontSize: 10, fontFamily: T.sans,
                        color: isMe ? T.accent : T.muted,
                        fontWeight: isMe ? 600 : 400,
                        cursor: 'pointer',
                      }}
                    >@{username}</div>
                  </div>

                  {/* Timestamp */}
                  <div style={{
                    fontSize: 9, color: T.faint, letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontFamily: T.sans, flexShrink: 0,
                  }}>
                    {timeAgo(item.created_at)}
                  </div>
                </div>

                {/* Review quote */}
                {item.review && (
                  <div style={{
                    padding: '0 14px 8px',
                    fontSize: 11, color: 'rgba(74,53,40,0.65)',
                    fontStyle: 'italic', lineHeight: 1.5, fontFamily: T.sans,
                  }}>
                    &ldquo;{item.review}&rdquo;
                  </div>
                )}

                {/* Vibe tags */}
                {hasTags && (
                  <div style={{ padding: '0 14px 10px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {item.tags!.map(tag => (
                      <span key={tag} style={{
                        fontSize: 9, padding: '2px 9px', borderRadius: 20,
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
        flex: '0 0 auto',
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1.5px solid rgba(74,53,40,0.15)',
        padding: '12px 32px calc(10px + env(safe-area-inset-bottom))',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        {/* Home */}
        <button style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={T.accent} stroke="none">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{
            fontSize: 8, color: T.accent, letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700,
          }}>Home</span>
        </button>

        {/* Log FAB */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            onClick={() => router.push('/log')}
            style={{
              width: 38, height: 38,
              background: T.accent, borderRadius: '50%',
              border: '1.5px solid #4A3528',
              boxShadow: '2px 2px 0 #4A3528',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginTop: -16, cursor: 'pointer',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#FAF3E2" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{
            fontSize: 8, color: T.muted, letterSpacing: '0.08em',
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
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={T.muted} strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{
            fontSize: 8, color: T.muted, letterSpacing: '0.08em',
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
