'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, ChevronRight, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { BattleModeCard } from '@/components/BattleModeCard'
import { BattleRecordBadge } from '@/components/BattleRecordBadge'
import { AppHeader } from '@/components/AppHeader'
import { Logo } from '@/components/Logo'
import { RankingDetailSheet } from '@/components/RankingDetailSheet'
import BottomNav from '@/components/BottomNav'
import { FeedTabs, type RankingsView } from '@/components/FeedTabs'
import { ArtistPhoto, Card, Chip, EmptyState, Label, Place, Stars, inputBox } from '@/components/ui'
import { useAuth } from '@/components/AuthProvider'
import { nameKey } from '@/lib/nameKey'
import { timeQuery } from '@/lib/queryTiming'
import { useArtistImages } from '@/lib/useArtistImages'
import { artistHref, venueHref } from '@/lib/showLinks'
import {
  defaultRankMetric, loadRankings, rankMetricsFor, sortRankings,
  type ArtistRanking, type RankMetric, type RankScores, type VenueRanking,
} from '@/lib/rankings'

interface Rankings { artists: ArtistRanking[]; venues: VenueRanking[] }

function listOf(view: RankingsView): 'artists' | 'venues' {
  return view === 'venues' ? 'venues' : 'artists'
}

// The view and the ranking are kept in the URL (?view=venues, ?by=both), so
// a shared link or a reload opens the same list. A list's own default (see
// lib/rankings.ts) is left out.
function rankingsUrl(view: RankingsView, metric: RankMetric): string {
  const params = new URLSearchParams()
  if (view === 'venues') params.set('view', 'venues')
  if (metric !== defaultRankMetric(listOf(view))) params.set('by', metric)
  const qs = params.toString()
  return qs ? `/rankings?${qs}` : '/rankings'
}

export function RankingsClient({ initial, initialView, initialMetric }: {
  initial:       Rankings
  initialView:   RankingsView
  initialMetric: RankMetric
}) {
  const router   = useRouter()
  const supabase = createClient()
  const { user } = useAuth()

  const [rankings, setRankings] = useState<Rankings>(initial)
  const [view, setView]         = useState<RankingsView>(initialView)
  const [metric, setMetric]     = useState<RankMetric>(initialMetric)
  const [query, setQuery]       = useState('')
  // The card whose "N shows" or "N ratings" is open, in a sheet over the list.
  const [detail, setDetail]     = useState<{ name: string; showIds: string[]; mode: 'shows' | 'ratings' } | null>(null)
  const closeDetail = useCallback(() => setDetail(null), [])
  const [battleModeUnlocked, setBattleModeUnlocked]   = useState(false)
  const [battleCardDismissed, setBattleCardDismissed] = useState(false)
  const [battleAggMap, setBattleAggMap] = useState<Record<string, { wins: number; losses: number }>>({})

  useEffect(() => {
    window.history.replaceState(null, '', rankingsUrl(view, metric))
  }, [view, metric])

  // Each list opens ranked on its own stars: artists on Performance, venues
  // on Venue.
  function changeView(next: RankingsView) {
    if (next === view) return
    setView(next)
    setMetric(defaultRankMetric(listOf(next)))
    setQuery('')
  }

  // Rankings has no built-in refresh — a visitor only ever saw a snapshot
  // from the moment they loaded the page. Subscribe to every insert/update/
  // delete on logged_shows and re-rank so a new rating anywhere shows up
  // here live, without the visitor needing to reload.
  useEffect(() => {
    const channel = supabase
      .channel('rankings-logged_shows')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logged_shows' }, async () => {
        setRankings(await loadRankings(supabase))
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  // Rankings is server-rendered and user-agnostic, so battle_mode_unlocked/
  // battle_card_dismissed (needed only for the entry-point card below) are
  // fetched client-side.
  useEffect(() => {
    if (!user) return
    timeQuery('rankings:profiles', supabase.from('profiles').select('battle_mode_unlocked, battle_card_dismissed').eq('id', user.id).single())
      .then(({ data }) => {
        setBattleModeUnlocked(!!data?.battle_mode_unlocked)
        // Ratchet, never downgrade: AuthProvider hands out a new `user`
        // object on every auth event (including background token refreshes),
        // re-running this fetch — it must never un-dismiss a card the user
        // already closed this session (same fix as the feed page's card).
        setBattleCardDismissed(prev => prev || !!data?.battle_card_dismissed)
      })
  }, [user])

  function dismissBattleCard() {
    setBattleCardDismissed(true)
    if (user) {
      void supabase.from('profiles').update({ battle_card_dismissed: true }).eq('id', user.id)
    }
  }

  // Each artist's all-time battle record across every user, summed over all
  // their shows - a public consensus view, never any one user's own record
  // (that's Profile's job). Battles are fought between shows, so records are
  // kept per show id.
  useEffect(() => {
    const artistOf = new Map<string, string>()
    rankings.artists.forEach(a => a.showIds.forEach(id => artistOf.set(id, a.key)))
    const showIds = Array.from(artistOf.keys())
    if (showIds.length === 0) return
    timeQuery(`rankings:battle_records(${showIds.length} shows)`, supabase.from('battle_records').select('artist_id, wins, losses').in('artist_id', showIds))
      .then(({ data }) => {
        const map: Record<string, { wins: number; losses: number }> = {}
        data?.forEach(r => {
          const key = artistOf.get(r.artist_id)
          if (!key) return
          const cur = map[key] ?? { wins: 0, losses: 0 }
          map[key] = { wins: cur.wins + r.wins, losses: cur.losses + r.losses }
        })
        setBattleAggMap(map)
      })
  }, [rankings.artists])

  // Ranks are taken before the search narrows the list, so a search shows
  // where something actually stands ("#12"), not its place among matches.
  const typed = nameKey(query)
  const artists = sortRankings(rankings.artists, metric)
    .map((row, i) => ({ row, rank: i + 1 }))
    .filter(({ row }) => !typed || nameKey(row.name).includes(typed))
  const venues = sortRankings(rankings.venues, metric)
    .map((row, i) => ({ row, rank: i + 1 }))
    .filter(({ row }) => !typed || nameKey(`${row.name} ${row.city}`).includes(typed))

  const artistImage = useArtistImages(view === 'rankings' ? artists.map(a => a.row.name) : [])
  const listLength = view === 'rankings' ? artists.length : venues.length
  const total = view === 'rankings' ? rankings.artists.length : rankings.venues.length

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      {/* The Feed's own header: the rankings are views on the Feed tab, and
          the bar below already says which one is showing. */}
      <AppHeader>
        <Logo href="/feed" />
      </AppHeader>
      <h1 className="sr-only">{view === 'rankings' ? 'Artist rankings' : 'Venue rankings'}</h1>

      {/* Same control as Feed, with a rankings option selected. From here
          the two filter options navigate back to Feed, and the two rankings
          switch in place. See components/FeedTabs.tsx. */}
      <div className="px-5 pt-3 space-y-2.5">
        <FeedTabs value={view} onRankingsChange={changeView} />

        <label className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/40`}>
          <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Escape') setQuery('') }}
            placeholder={view === 'rankings' ? 'Search artists' : 'Search venues or cities'}
            aria-label={view === 'rankings' ? 'Search artists' : 'Search venues or cities'}
            enterKeyHint="search"
            autoComplete="off"
            className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Clear search" className="-m-1 p-1 text-ink-muted">
              <X className="w-4 h-4" strokeWidth={2} />
            </button>
          )}
        </label>

        {/* What the stars rank on: Performance or Venue alone, or the two
            averaged. Artists lead with Performance, venues with Venue. */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Label className="mr-0.5">Rank by</Label>
          {rankMetricsFor(listOf(view)).map(option => (
            <button key={option.value} type="button" aria-pressed={metric === option.value} onClick={() => setMetric(option.value)}>
              <Chip active={metric === option.value}>{option.label}</Chip>
            </button>
          ))}
        </div>
      </div>

      <main className="px-5 pt-4 space-y-3">
        {battleModeUnlocked && !battleCardDismissed && (
          <BattleModeCard onDismiss={dismissBattleCard} onEnter={() => router.push('/battle')} />
        )}

        {total === 0 && <EmptyState>No ratings yet</EmptyState>}
        {total > 0 && listLength === 0 && (
          <EmptyState>No {view === 'rankings' ? 'artist' : 'venue'} with ratings matches &ldquo;{query.trim()}&rdquo;.</EmptyState>
        )}

        {view === 'rankings' && artists.map(({ row, rank }) => (
          <RowLink key={row.key} href={artistHref(row.name)}>
            <Card className="p-3 flex items-center gap-3">
              <RankNumber rank={rank} />
              <ArtistPhoto name={row.name} src={artistImage(row.name)} className="w-14 h-14" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold leading-tight truncate">{row.name}</h3>
                  <Stars score={row.scores[metric]} size={12} />
                </div>
                <Breakdown scores={row.scores} metric={metric} />
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <Counts shows={row.shows} ratings={row.count} onOpen={mode => setDetail({ name: row.name, showIds: row.showIds, mode })} />
                  {battleAggMap[row.key] && (
                    <BattleRecordBadge
                      wins={battleAggMap[row.key].wins}
                      losses={battleAggMap[row.key].losses}
                      unlocked={battleModeUnlocked}
                      context="aggregate"
                      artistName={row.name}
                    />
                  )}
                </div>
              </div>
            </Card>
          </RowLink>
        ))}

        {view === 'venues' && venues.map(({ row, rank }) => (
          <RowLink key={row.key} href={venueHref(row)}>
            <Card className="p-3 flex items-center gap-3">
              <RankNumber rank={rank} />
              <ArtistPhoto name={row.name} src={null} icon={Building2} className="w-14 h-14" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-bold leading-tight truncate">{row.name}</h3>
                  <Stars score={row.scores[metric]} size={12} />
                </div>
                {row.city && <Place className="mt-0.5">{[row.city, row.state].filter(Boolean).join(', ')}</Place>}
                <Breakdown scores={row.scores} metric={metric} />
                <div className="mt-1.5">
                  <Counts shows={row.shows} ratings={row.count} onOpen={mode => setDetail({ name: row.name, showIds: row.showIds, mode })} />
                </div>
              </div>
            </Card>
          </RowLink>
        ))}
      </main>

      <BottomNav />

      {detail && (
        <RankingDetailSheet
          list={view === 'venues' ? 'venues' : 'artists'}
          mode={detail.mode}
          name={detail.name}
          showIds={detail.showIds}
          metric={metric}
          onClose={closeDetail}
        />
      )}
    </div>
  )
}

// A whole card that opens a page. Not an <a>: the battle record inside an
// artist's card is a button of its own, and a button can't sit inside a link.
function RowLink({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter()
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={e => { if (e.key === 'Enter') router.push(href) }}
      className="block cursor-pointer"
    >
      {children}
    </div>
  )
}

function RankNumber({ rank }: { rank: number }) {
  return (
    <span className={`font-display font-bold leading-none w-7 flex-shrink-0 text-center text-accent ${rank > 99 ? 'text-xl' : 'text-3xl'}`}>
      {rank}
    </span>
  )
}

// Both averages, small, under the one the list is ranked on: the one in use
// reads in ink, the other stays faint.
function Breakdown({ scores, metric }: { scores: RankScores; metric: RankMetric }) {
  const part = (label: string, score: number, on: boolean) => (
    <span className="inline-flex items-center gap-1">
      <span className={`text-[9px] font-semibold uppercase tracking-label ${on ? 'text-ink-muted' : 'text-ink-faint'}`}>{label}</span>
      <Stars score={score} size={9} />
    </span>
  )
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {part('Performance', scores.performance, metric !== 'venue')}
      {part('Venue', scores.venue, metric !== 'performance')}
    </div>
  )
}

// "N shows" and "N ratings", each opening what's behind it in a sheet. They
// sit inside a card that opens the artist's or venue's page, so a tap here
// stops before it reaches the card.
function Counts({ shows, ratings, onOpen }: {
  shows: number; ratings: number; onOpen: (mode: 'shows' | 'ratings') => void
}) {
  const chip = (mode: 'shows' | 'ratings', label: string) => (
    <button
      type="button"
      onClick={e => { e.stopPropagation(); onOpen(mode) }}
      onKeyDown={e => e.stopPropagation()}
      aria-label={`See ${label.toLowerCase()}`}
    >
      <Chip>
        <span className="inline-flex items-center gap-0.5">
          {label}
          <ChevronRight className="w-2.5 h-2.5 -mr-0.5" strokeWidth={2.5} />
        </span>
      </Chip>
    </button>
  )
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {chip('shows', `${shows} ${shows === 1 ? 'show' : 'shows'}`)}
      {chip('ratings', `${ratings} ${ratings === 1 ? 'rating' : 'ratings'}`)}
    </span>
  )
}
