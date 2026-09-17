'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { computeShowScore } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { MediaGrid } from '@/components/MediaGrid'
import { BattleModeCard } from '@/components/BattleModeCard'
import { ReactionBar } from '@/components/ReactionBar'
import { CommentsModal } from '@/components/CommentsModal'
import { AppHeader } from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import { Logo } from '@/components/Logo'
import {
  ArtistPhoto, Card, Chip, DateTag, EmptyState, LoadingLabel, PersonPhoto, Place, PullQuote, Segmented, Stars,
} from '@/components/ui'
import { useAuth } from '@/components/AuthProvider'
import { readCache, writeCache } from '@/lib/staleCache'
import { timeQuery, timeMark } from '@/lib/queryTiming'
import { useArtistImages } from '@/lib/useArtistImages'

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
  crowd_rating:         number | null
  created_at:  string
  user_id:     string
  stage:       string | null
  day:         string | null
  venue:       string | null
  show_date:   string | null
  username:    string | null
  avatar_url?: string | null
  photo_url:   string | null
  media_urls:  string[] | null
  review:      string | null
  tags:        string[] | null
}

function FeedInner() {
  const router     = useRouter()
  const supabase   = createClient()
  const { user, loading: authLoading } = useAuth()

  const [globalFeed, setGlobalFeed]       = useState<GlobalLog[]>([])
  const [loading, setLoading]             = useState(true)
  const [showLogTip, setShowLogTip]       = useState(false)
  const [battleModeUnlocked, setBattleModeUnlocked]   = useState(false)
  const [battleCardDismissed, setBattleCardDismissed] = useState(false)
  const [filterMode, setFilterMode]       = useState<'all' | 'following'>('all')
  const [followingIds, setFollowingIds]   = useState<Set<string>>(new Set())
  const [interactions, setInteractions]   = useState<Record<string, Interactions>>({})
  const [activeComments, setActiveComments] = useState<string | null>(null)

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

    const logsQuery = supabase
      .from('logged_shows')
      .select('id, artist_id, artist_name, performance_rating, venue_rating, crowd_rating, created_at, user_id, stage, day, venue, show_date, photo_url, media_urls, review, tags')
      .order('created_at', { ascending: false })
      .limit(200)

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
    const { data: profiles } = await timeQuery(`feed:profiles-by-id(${userIds.length} ids)`, supabase.from('profiles').select('id, username, avatar_url').in('id', userIds))

    const profileMap: Record<string, { username: string; avatar_url: string | null }> = {}
    profiles?.forEach(p => { profileMap[p.id] = p })

    const withUsernames = logs.map(l => ({
      ...l,
      username:   profileMap[l.user_id]?.username ?? null,
      avatar_url: profileMap[l.user_id]?.avatar_url ?? null,
    }))
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

  const artistImage = useArtistImages(visibleFeed.map(item => item.artist_name ?? ''))

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <AppHeader>
        <Logo />
      </AppHeader>

      <div className="px-5 pt-3">
        <Segmented
          options={[{ value: 'all', label: 'All activity' }, { value: 'following', label: 'Following' }]}
          value={filterMode}
          onChange={setFilterMode}
        />
      </div>

      <main className="px-5 pt-4 space-y-4">
        {loading && <LoadingLabel />}

        {battleModeUnlocked && !battleCardDismissed && (
          <BattleModeCard onDismiss={dismissBattleCard} onEnter={() => router.push('/battle')} />
        )}

        {!loading && visibleFeed.length === 0 && (
          <EmptyState>
            {filterMode === 'following'
              ? 'No activity yet from people you follow.'
              : 'No ratings yet. Be the first to log a show.'}
          </EmptyState>
        )}

        {visibleFeed.map((item, i) => {
          const name      = item.artist_name ?? 'Unknown'
          const isMe      = item.user_id === user?.id
          const username  = item.username ?? 'anonymous'
          const hasScore  = item.performance_rating != null && item.venue_rating != null && item.crowd_rating != null
          const score     = hasScore
            ? computeShowScore(item.performance_rating!, item.venue_rating!, item.crowd_rating!)
            : null
          const hasTags   = !!item.tags && item.tags.length > 0
          const mediaUrls = resolveMediaUrls(item).map(resolvePhotoUrl)
          const place     = item.stage
            ? [item.stage, item.day ? dayLabel(item.day) : null].filter(Boolean).join(' · ')
            : item.venue

          const itemInteractions = interactions[item.id] ?? EMPTY_INTERACTIONS

          return (
            <Card key={item.id || `${item.user_id}-${item.artist_id}-${i}`} className="overflow-hidden">
              {mediaUrls.length > 0 && (
                <div className="border-b-1.5 border-ink">
                  <MediaGrid urls={mediaUrls} maxHeight={200} />
                </div>
              )}

              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Link href={isMe ? '/profile' : `/u/${username}`} className="flex items-center gap-2.5 min-w-0">
                    <PersonPhoto name={username} src={item.avatar_url} className="w-8 h-8 text-sm border border-ink/15" />
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${isMe ? 'text-accent' : 'text-ink'}`}>@{username}</p>
                      <p className="text-[11px] text-ink-muted">{timeAgo(item.created_at)}</p>
                    </div>
                  </Link>
                  {score !== null && <Stars score={score} size={15} />}
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0 space-y-1">
                    <Link href={`/artist/${item.artist_id}`} className="block font-display text-xl font-bold tracking-tight leading-tight">
                      {name}
                    </Link>
                    {place && (item.stage
                      ? <Link href={`/stage/${encodeURIComponent(item.stage)}`} className="block"><Place>{place}</Place></Link>
                      : <Place>{place}</Place>)}
                  </div>
                  <Link href={`/artist/${item.artist_id}`} aria-label={name} className="flex-shrink-0">
                    <ArtistPhoto name={name} src={artistImage(name)} className="w-[76px] h-[76px]" iconSize={26}>
                      <DateTag isoDate={item.show_date} />
                    </ArtistPhoto>
                  </Link>
                </div>

                {item.review && <PullQuote>{item.review}</PullQuote>}

                {hasTags && (
                  <div className="flex flex-wrap gap-1.5">
                    {item.tags!.map(tag => <Chip key={tag}>{tag}</Chip>)}
                  </div>
                )}
              </div>

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
            </Card>
          )
        })}
      </main>

      <BottomNav showLogTip={showLogTip} onDismissLogTip={() => setShowLogTip(false)} />

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
