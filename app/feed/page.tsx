'use client'

import { useEffect, useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { computeShowScore } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { MediaGrid } from '@/components/MediaGrid'
import { BattleModeCard } from '@/components/BattleModeCard'
import { ReactionBar } from '@/components/ReactionBar'
import { CommentsModal } from '@/components/CommentsModal'
import { AppHeader } from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import { FeedTabs } from '@/components/FeedTabs'
import { Logo } from '@/components/Logo'
import { CrssdMark } from '@/components/CrssdMark'
import { SignUpSheet } from '@/components/SignUpSheet'
import {
  ArtistPhoto, Card, Chip, DateTag, EmptyState, LoadingLabel, PersonPhoto, Place, PullQuote, Stars, btnPrimary,
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
  // Carried in the URL only when arriving from Rankings, which is a route
  // rather than state - see components/FeedTabs.tsx. Read once on mount;
  // every other change to this comes from the control itself.
  const searchParams = useSearchParams()
  const [filterMode, setFilterMode]       = useState<'all' | 'following'>(
    searchParams.get('filter') === 'following' ? 'following' : 'all',
  )
  const [followingIds, setFollowingIds]   = useState<Set<string>>(new Set())
  const [interactions, setInteractions]   = useState<Record<string, Interactions>>({})
  const [activeComments, setActiveComments] = useState<string | null>(null)
  // Signed-out visitors can read everything here. Reacting, commenting or
  // filtering to Following opens the sign-up sheet in this mode instead.
  const [signUpMode, setSignUpMode]       = useState<'signup' | 'signin' | null>(null)

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
    fetchFeed(user?.id ?? null)
  }, [authLoading, user])

  // `userId` is null for someone who hasn't signed up: the logs, names and
  // reaction counts are all public, and only the per-person lookups (your
  // profile flags, who you follow, what you've reacted to) are skipped.
  async function fetchFeed(userId: string | null) {
    const loadStart = Date.now()
    console.log(`[perf] feed:load start userId=${userId}`)

    const logsQuery = supabase
      .from('logged_shows')
      .select('id, artist_id, artist_name, performance_rating, venue_rating, crowd_rating, created_at, user_id, stage, day, venue, show_date, photo_url, media_urls, review, tags')
      .order('created_at', { ascending: false })
      .limit(200)

    // Stands in for the per-person queries when nobody is signed in.
    const nothing = Promise.resolve({ data: null, error: null })

    const [{ data: profileRow, error: tipError }, { data: logs }, { data: followRows }] = await Promise.all([
      userId
        ? timeQuery('feed:profiles', supabase.from('profiles').select('username_set, has_seen_log_tip, battle_mode_unlocked, battle_card_dismissed').eq('id', userId).single())
        : nothing,
      timeQuery('feed:logged_shows', logsQuery),
      userId
        ? timeQuery('feed:follows', supabase.from('follows').select('following_id').eq('follower_id', userId))
        : nothing,
    ])

    // An account that never picked a username does that first. This used to
    // happen on `/`, which is now a plain redirect here (next.config.js).
    if (profileRow && profileRow.username_set === false) {
      router.replace('/choose-username')
      return
    }

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

  async function loadInteractions(showIds: string[], userId: string | null): Promise<Record<string, Interactions>> {
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
    if (!user) { setSignUpMode('signup'); return }
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
    if (!user) { setSignUpMode('signup'); return }
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

  // Following means nothing without an account, even if ?filter= (from
  // Rankings) asked for it.
  const activeFilter = user ? filterMode : 'all'

  const visibleFeed = activeFilter === 'following'
    ? globalFeed.filter(item => item.user_id === user?.id || followingIds.has(item.user_id))
    : globalFeed

  const artistImage = useArtistImages(visibleFeed.map(item => item.artist_name ?? ''))

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <AppHeader>
        {/* Gigl × CRSSD for the festival weekend. Retire it with the CRSSD
            Log button (see BottomNav): put the bare Logo back and drop the
            sunset from the card below. */}
        <div className="flex items-center gap-2">
          <Logo href="/feed" />
          <span className="font-display text-[15px] font-bold text-ink-muted" aria-hidden>&times;</span>
          <CrssdMark className="h-[15px] w-auto text-ink" />
        </div>
      </AppHeader>

      <div className="px-5 pt-3 space-y-3">
        {/* The front door for someone who scanned a code: what this is, and
            that writing a log doesn't need an account until it's posted.
            "Log a show" goes straight to the CRSSD lineup; the small button
            in the bottom corner is the way out to every other show. In full
            ink throughout - ink-muted gets lost against the sunset's bands. */}
        {!authLoading && !user && (
          <div className="crssd-sunset rounded-card border-1.5 border-ink shadow-riso px-4 py-3.5">
            <h2 className="font-display text-xl font-bold tracking-tight leading-tight">
              At CRSSD? Rate the sets you saw
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-ink">
              See what everyone thought, then add your own. You only need an account when you post.
            </p>
            <div className="mt-3 flex items-center gap-4">
              <Link href="/crssd" className={`${btnPrimary} px-4 py-2.5 text-[11px]`}>
                <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />
                Log a show
              </Link>
              <button
                type="button"
                onClick={() => setSignUpMode('signin')}
                className="text-[12px] font-semibold text-ink underline underline-offset-[3px]"
              >
                I have an account
              </button>
            </div>
            <div className="mt-2 flex justify-end">
              <Link
                href="/select-festival"
                className="inline-flex items-center gap-1 rounded-card border-1.5 border-ink bg-cream px-2 py-1 text-[10px] leading-tight font-semibold text-ink hover:bg-accent/5"
              >
                <span>I&apos;m rating a show<br />from somewhere else</span>
                <ChevronRight className="w-3 h-3 flex-shrink-0" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        )}

        <FeedTabs
          value={activeFilter}
          onFilterChange={next => {
            if (next === 'following' && !user) { setSignUpMode('signup'); return }
            setFilterMode(next)
          }}
        />
      </div>

      <main className="px-5 pt-4 space-y-4">
        {loading && <LoadingLabel />}

        {battleModeUnlocked && !battleCardDismissed && (
          <BattleModeCard onDismiss={dismissBattleCard} onEnter={() => router.push('/battle')} />
        )}

        {!loading && visibleFeed.length === 0 && (
          <EmptyState>
            {activeFilter === 'following'
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
                  <MediaGrid urls={mediaUrls} maxHeight={170} />
                </div>
              )}

              <div className="px-3.5 pt-2.5 pb-2.5 space-y-1.5">
                <div className="flex items-center justify-between gap-2.5">
                  <Link href={isMe ? '/profile' : `/u/${username}`} className="flex items-center gap-2 min-w-0">
                    <PersonPhoto name={username} src={item.avatar_url} className="w-7 h-7 text-xs border border-ink/15" />
                    <div className="min-w-0">
                      <p className={`text-[10.7px] font-semibold truncate ${isMe ? 'text-accent' : 'text-ink'}`}>@{username}</p>
                      <p className="text-[9.4px] text-ink-muted">{timeAgo(item.created_at)}</p>
                    </div>
                  </Link>
                  {score !== null && <Stars score={score} size={13} />}
                </div>

                <div className="flex items-center gap-2.5">
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <Link href={`/artist/${item.artist_id}`} className="block font-display text-[17px] font-bold tracking-tight leading-tight">
                      {name}
                    </Link>
                    {place && (item.stage
                      ? <Link href={`/stage/${encodeURIComponent(item.stage)}`} className="block"><Place compact>{place}</Place></Link>
                      : <Place compact>{place}</Place>)}
                  </div>
                  <Link href={`/artist/${item.artist_id}`} aria-label={name} className="flex-shrink-0">
                    <ArtistPhoto name={name} src={artistImage(name)} className="w-[58px] h-[58px]" iconSize={20}>
                      <DateTag isoDate={item.show_date} />
                    </ArtistPhoto>
                  </Link>
                </div>

                {item.review && <PullQuote compact>{item.review}</PullQuote>}

                {hasTags && (
                  <div className="flex flex-wrap gap-1">
                    {item.tags!.map(tag => <Chip key={tag} compact>{tag}</Chip>)}
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
          onNeedAccount={() => setSignUpMode('signup')}
        />
      )}

      {/* Nothing to finish on sign-in: the feed refetches as the signed-in
          user on its own, which is enough to light up their reactions. */}
      {signUpMode && (
        <SignUpSheet
          title={signUpMode === 'signin' ? 'Good to have you back' : 'Join in'}
          blurb="Make an account to react, comment and follow people. It's also how you post your own logs."
          initialMode={signUpMode}
          onClose={() => setSignUpMode(null)}
          onSignedIn={() => setSignUpMode(null)}
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
