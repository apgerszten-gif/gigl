'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { getFestival, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { computeShowScore } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { StarDisplay } from '@/components/StarDisplay'
import { MediaGrid } from '@/components/MediaGrid'
import { BattleModeCard } from '@/components/BattleModeCard'
import { ReactionBar } from '@/components/ReactionBar'
import { CommentsModal } from '@/components/CommentsModal'
import { useTheme } from '@/components/FestivalThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import { readCache, writeCache } from '@/lib/staleCache'
import { timeQuery, timeMark } from '@/lib/queryTiming'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'
const FEED_CACHE_KEY = 'gigl_feed_cache'

function resolvePhotoUrl(url: string): string {
  if (url.startsWith('http')) return url
  return `${SUPABASE_STORAGE}/${url}`
}

interface Interactions {
  likeCount:      number
  likedByMe:      boolean
  reactionCounts: Record<string, number>
  myReactions:    string[]
  commentCount:   number
}

const EMPTY_INTERACTIONS: Interactions = { likeCount: 0, likedByMe: false, reactionCounts: {}, myReactions: [], commentCount: 0 }

interface GlobalLog {
  id:                 string
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
  media_urls:  string[] | null
  review:      string | null
  tags:        string[] | null
}

function FeedInner() {
  const router     = useRouter()
  const supabase   = createClient()
  const T = useTheme()
  const { user, loading: authLoading } = useAuth()

  const [globalFeed, setGlobalFeed]       = useState<GlobalLog[]>([])
  const [loading, setLoading]             = useState(true)
  const [festivalName, setFestivalName]   = useState<string | null>(null)
  const [showLogTip, setShowLogTip]       = useState(false)
  const [battleModeUnlocked, setBattleModeUnlocked]   = useState(false)
  const [battleCardDismissed, setBattleCardDismissed] = useState(false)
  const [filterMode, setFilterMode]       = useState<'all' | 'following'>('all')
  const [followingIds, setFollowingIds]   = useState<Set<string>>(new Set())
  const [interactions, setInteractions]   = useState<Record<string, Interactions>>({})
  const [activeComments, setActiveComments] = useState<string | null>(null)

  useEffect(() => {
    const id = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (id) {
      const f = getFestival(id)
      if (f) setFestivalName(f.emoji + ' ' + f.shortName + ' ' + f.dates.slice(-4))
    }
  }, [])

  // Stale-while-revalidate: show whatever we last fetched immediately, so a
  // repeat visit never has to sit on a blank spinner while the real fetch
  // (below) is still in flight on a slow connection.
  useEffect(() => {
    const cached = readCache<GlobalLog[]>(FEED_CACHE_KEY)
    if (cached) {
      setGlobalFeed(cached)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/'); return }
    fetchFeed(user.id)
  }, [authLoading, user])

  async function fetchFeed(userId: string) {
    const loadStart = Date.now()
    console.log(`[perf] feed:load start userId=${userId}`)

    // Scope to whichever festival is currently selected (artist_id is
    // festival-specific, e.g. 'lolla-...' vs 'osl-...') so activity from one
    // festival never bleeds into another's feed. No filter is applied if no
    // festival is selected yet, matching this page's existing lenient
    // fallback for that edge case.
    const festivalId = localStorage.getItem(LOCAL_STORAGE_KEY)
    const festival    = festivalId ? getFestival(festivalId) : null

    let logsQuery = supabase
      .from('logged_shows')
      .select('id, artist_id, artist_name, performance_rating, venue_rating, vibe_rating, created_at, user_id, stage, day, photo_url, media_urls, review, tags')
      .order('created_at', { ascending: false })
      .limit(200)
    if (festival) logsQuery = logsQuery.in('artist_id', festival.artists.map(a => a.id))

    const [{ data: profileRow, error: tipError }, { data: logs }, { data: followRows }] = await Promise.all([
      timeQuery('feed:profiles', supabase.from('profiles').select('has_seen_log_tip, battle_mode_unlocked, battle_card_dismissed').eq('id', userId).single()),
      timeQuery('feed:logged_shows', logsQuery),
      timeQuery('feed:follows', supabase.from('follows').select('following_id').eq('follower_id', userId)),
    ])

    setFollowingIds(new Set((followRows ?? []).map(r => r.following_id)))

    if (tipError) {
      console.error('has_seen_log_tip lookup failed:', tipError.message)
    } else if (profileRow && !profileRow.has_seen_log_tip) {
      setShowLogTip(true)
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ has_seen_log_tip: true })
        .eq('id', userId)
      if (updateError) console.error('has_seen_log_tip update failed:', updateError.message)
    }
    if (profileRow) {
      setBattleModeUnlocked(!!profileRow.battle_mode_unlocked)
      // Ratchet, never downgrade: AuthProvider hands out a new `user` object
      // on every auth event (including background token refreshes), which
      // re-runs this fetch. A refetch racing ahead of the dismiss button's
      // own (fire-and-forget) write must never un-dismiss a card the user
      // already closed this session.
      setBattleCardDismissed(prev => prev || !!profileRow.battle_card_dismissed)
    }

    if (!logs) { setLoading(false); timeMark('feed:load total (no logs)', loadStart); return }

    const userIds = logs.map(l => l.user_id).filter((id, i, arr) => arr.indexOf(id) === i)
    const { data: profiles } = await timeQuery(`feed:profiles-by-id(${userIds.length} ids)`, supabase.from('profiles').select('id, username').in('id', userIds))

    const usernameMap: Record<string, string> = {}
    profiles?.forEach(p => { usernameMap[p.id] = p.username })

    const withUsernames = logs.map(l => ({ ...l, username: usernameMap[l.user_id] ?? null }))
    setGlobalFeed(withUsernames)
    writeCache(FEED_CACHE_KEY, withUsernames)
    setLoading(false)
    timeMark(`feed:load total (${logs.length} logs)`, loadStart)

    const interactionMap = await loadInteractions(logs.map(l => l.id), userId)
    setInteractions(interactionMap)
  }

  async function loadInteractions(showIds: string[], userId: string): Promise<Record<string, Interactions>> {
    if (showIds.length === 0) return {}

    const [{ data: likeRows }, { data: reactionRows }, { data: commentRows }] = await Promise.all([
      timeQuery('feed:show_likes', supabase.from('show_likes').select('logged_show_id, user_id').in('logged_show_id', showIds)),
      timeQuery('feed:show_reactions', supabase.from('show_reactions').select('logged_show_id, user_id, emoji').in('logged_show_id', showIds)),
      timeQuery('feed:show_comments-count', supabase.from('show_comments').select('logged_show_id').in('logged_show_id', showIds)),
    ])

    const map: Record<string, Interactions> = {}
    const ensure = (id: string) => (map[id] ??= { likeCount: 0, likedByMe: false, reactionCounts: {}, myReactions: [], commentCount: 0 })

    likeRows?.forEach(r => {
      const entry = ensure(r.logged_show_id)
      entry.likeCount++
      if (r.user_id === userId) entry.likedByMe = true
    })
    reactionRows?.forEach(r => {
      const entry = ensure(r.logged_show_id)
      entry.reactionCounts[r.emoji] = (entry.reactionCounts[r.emoji] ?? 0) + 1
      if (r.user_id === userId) entry.myReactions.push(r.emoji)
    })
    commentRows?.forEach(r => { ensure(r.logged_show_id).commentCount++ })

    return map
  }

  async function toggleLike(showId: string) {
    if (!user) return
    const current = interactions[showId] ?? EMPTY_INTERACTIONS
    const next = !current.likedByMe

    setInteractions(prev => {
      const entry = prev[showId] ?? EMPTY_INTERACTIONS
      return { ...prev, [showId]: { ...entry, likedByMe: next, likeCount: entry.likeCount + (next ? 1 : -1) } }
    })

    const { error } = next
      ? await supabase.from('show_likes').insert({ logged_show_id: showId, user_id: user.id })
      : await supabase.from('show_likes').delete().eq('logged_show_id', showId).eq('user_id', user.id)

    if (error) {
      console.error('show_likes toggle failed:', error.message)
      setInteractions(prev => {
        const entry = prev[showId] ?? EMPTY_INTERACTIONS
        return { ...prev, [showId]: { ...entry, likedByMe: !next, likeCount: entry.likeCount + (next ? -1 : 1) } }
      })
    }
  }

  async function toggleReaction(showId: string, emoji: string) {
    if (!user) return
    const current = interactions[showId] ?? EMPTY_INTERACTIONS
    const alreadyReacted = current.myReactions.includes(emoji)

    function applyDelta(delta: 1 | -1, reacted: boolean) {
      setInteractions(prev => {
        const entry = prev[showId] ?? EMPTY_INTERACTIONS
        const myReactions = reacted ? [...entry.myReactions, emoji] : entry.myReactions.filter(e => e !== emoji)
        const count = (entry.reactionCounts[emoji] ?? 0) + delta
        return { ...prev, [showId]: { ...entry, myReactions, reactionCounts: { ...entry.reactionCounts, [emoji]: count } } }
      })
    }

    applyDelta(alreadyReacted ? -1 : 1, !alreadyReacted)

    const { error } = alreadyReacted
      ? await supabase.from('show_reactions').delete().eq('logged_show_id', showId).eq('user_id', user.id).eq('emoji', emoji)
      : await supabase.from('show_reactions').insert({ logged_show_id: showId, user_id: user.id, emoji })

    if (error) {
      console.error('show_reactions toggle failed:', error.message)
      applyDelta(alreadyReacted ? 1 : -1, alreadyReacted)
    }
  }

  function bumpCommentCount(showId: string, delta: number) {
    setInteractions(prev => {
      const entry = prev[showId] ?? EMPTY_INTERACTIONS
      return { ...prev, [showId]: { ...entry, commentCount: entry.commentCount + delta } }
    })
  }

  function dismissBattleCard() {
    setBattleCardDismissed(true)
    if (user) {
      void supabase.from('profiles').update({ battle_card_dismissed: true }).eq('id', user.id)
    }
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

  const visibleFeed = filterMode === 'following'
    ? globalFeed.filter(item => item.user_id === user?.id || followingIds.has(item.user_id))
    : globalFeed

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
          padding: '11px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 11,
          borderBottom: '1px solid rgba(74,53,40,0.12)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
            {T.logoUrl ? (
              <img
                src={T.logoUrl}
                alt="Festival"
                style={{ height: 20, objectFit: 'contain', filter: T.logoFilter, flexShrink: 0 }}
              />
            ) : (
              <div style={{
                fontFamily: T.serif, fontSize: 19, fontWeight: 700,
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
                fontSize: 11, color: T.accent, letterSpacing: '0.1em',
                textTransform: 'uppercase', fontWeight: 700,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{festivalName ?? 'Festival Season 2026'}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="3" style={{ flexShrink: 0 }}>
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
            <button
              onClick={() => router.push('/select-festival')}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: T.accent, fontSize: 10, fontFamily: T.sans, letterSpacing: '0.06em', fontWeight: 600,
              }}
            >switch</button>
            <span style={{ fontSize: 10, color: T.faint }}>·</span>
            <button
              onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem(LOCAL_STORAGE_KEY); router.push('/') }}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                color: T.muted, fontSize: 10, fontFamily: T.sans, letterSpacing: '0.06em',
              }}
            >sign out</button>
          </div>
        </div>

        {/* Activity / Rankings tab toggle — slim pill */}
        <div style={{ padding: '9px 20px' }}>
          <div style={{
            display: 'flex',
            border: '2px solid #4A3528',
            borderRadius: 5,
            overflow: 'hidden',
            marginBottom: 8,
          }}>
            <button style={{
              flex: 1, padding: '6px 0',
              background: '#4A3528', border: 'none',
              color: '#FAF3E2', fontSize: 10, cursor: 'default',
              fontFamily: T.sans, fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Activity</button>
            <button
              onClick={() => router.push('/rankings')}
              style={{
                flex: 1, padding: '6px 0',
                background: T.card,
                border: 'none', borderLeft: '2px solid #4A3528',
                color: '#4A3528', fontSize: 10, cursor: 'pointer',
                fontFamily: T.sans, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}
            >Rankings</button>
          </div>

          {/* All / Following filter — same pill treatment as Rankings' day filter */}
          <div style={{ display: 'flex', gap: 6 }}>
            {(['all', 'following'] as const).map(mode => (
              <button key={mode} onClick={() => setFilterMode(mode)} style={{
                flex: 1, padding: '6px 0', borderRadius: 4,
                background: filterMode === mode ? T.accentDim : 'transparent',
                border: filterMode === mode ? `1.5px solid ${T.accentBorder}` : '1.5px solid rgba(74,53,40,0.15)',
                color: filterMode === mode ? T.accent : T.muted,
                fontSize: 9, cursor: 'pointer',
                fontFamily: T.sans, fontWeight: filterMode === mode ? 700 : 500,
                letterSpacing: '0.08em', textTransform: 'uppercase',
              }}>{mode === 'all' ? 'All' : 'Following'}</button>
            ))}
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

        {battleModeUnlocked && !battleCardDismissed && (
          <BattleModeCard onDismiss={dismissBattleCard} onEnter={() => router.push('/battle')} />
        )}

        {!loading && visibleFeed.length === 0 && (
          <div style={{
            background: T.card, borderRadius: 5,
            border: T.cardBorder, boxShadow: T.cardShadow,
            padding: 32, textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              {filterMode === 'following'
                ? "No activity yet from people you follow at this festival"
                : 'No ratings yet — be the first to log a show'}
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {visibleFeed.map((item, i) => {
            const name      = item.artist_name ?? 'Unknown'
            const stageName = item.stage       ?? ''
            const day       = item.day         ?? ''
            const isMe      = item.user_id === user?.id
            const username  = item.username ?? 'anonymous'
            const isTop     = i === 0
            const hasScore  = item.performance_rating != null && item.venue_rating != null && item.vibe_rating != null
            const score     = hasScore
              ? computeShowScore(item.performance_rating!, item.venue_rating!, item.vibe_rating!)
              : null
            const hasTags    = !!item.tags && item.tags.length > 0
            const isFeatured = hasScore || hasTags || !!item.review
            const infoPadding = isFeatured ? '12px 14px' : '8px 14px'

            const itemInteractions = interactions[item.id] ?? EMPTY_INTERACTIONS

            return (
              <div
                key={item.id || `${item.user_id}-${item.artist_id}-${i}`}
                style={{
                  background: T.card,
                  borderRadius: 5,
                  overflow: 'hidden',
                  border: T.cardBorder,
                  boxShadow: isFeatured && isTop ? T.cardShadow : 'none',
                }}
              >
                {/* Photo / Video */}
                <MediaGrid urls={resolveMediaUrls(item).map(resolvePhotoUrl)} maxHeight={200} />

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

                <ReactionBar
                  likeCount={itemInteractions.likeCount}
                  likedByMe={itemInteractions.likedByMe}
                  reactionCounts={itemInteractions.reactionCounts}
                  myReactions={itemInteractions.myReactions}
                  commentCount={itemInteractions.commentCount}
                  onToggleLike={() => toggleLike(item.id)}
                  onToggleReaction={emoji => toggleReaction(item.id, emoji)}
                  onOpenComments={() => setActiveComments(item.id)}
                />
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
        padding: '16px 32px calc(4px + env(safe-area-inset-bottom))',
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
        <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          {showLogTip && (
            <div style={{
              position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
              marginBottom: 18, width: 'min(340px, calc(100vw - 24px))', zIndex: 30,
            }}>
              <div style={{
                position: 'relative', background: T.card, border: T.cardBorder,
                boxShadow: T.cardShadow, borderRadius: 10, padding: '20px 34px 20px 22px',
              }}>
                <button
                  onClick={() => setShowLogTip(false)}
                  aria-label="Dismiss"
                  style={{
                    position: 'absolute', top: 6, right: 8, background: 'none', border: 'none',
                    cursor: 'pointer', color: T.faint, fontSize: 26, lineHeight: 1, padding: 6,
                  }}
                >×</button>
                <div style={{ fontSize: 24, color: '#4A3528', lineHeight: 1.4, fontFamily: T.sans }}>
                  <strong>Hey!</strong> Welcome to Gigl. Log and rate your first show here.
                </div>
                <div style={{
                  position: 'absolute', bottom: -18, left: '50%', transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '18px solid transparent', borderRight: '18px solid transparent',
                  borderTop: '18px solid #4A3528',
                }} />
                <div style={{
                  position: 'absolute', bottom: -12.5, left: '50%', transform: 'translateX(-50%)',
                  width: 0, height: 0,
                  borderLeft: '15px solid transparent', borderRight: '15px solid transparent',
                  borderTop: `15px solid ${T.card}`,
                }} />
              </div>
            </div>
          )}
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

      {activeComments && (
        <CommentsModal
          loggedShowId={activeComments}
          onClose={() => setActiveComments(null)}
          onCountChange={delta => bumpCommentCount(activeComments, delta)}
        />
      )}
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
