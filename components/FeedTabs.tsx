'use client'

import { useRouter } from 'next/navigation'
import { Segmented } from '@/components/ui'

// The two bars that sit under the header on Feed and Rankings.
//
// Two tiers rather than one row of four, because they answer two different
// questions. The first is whose logs count: everyone's ("All activity") or
// yours and the people you follow ("Following"). The second is how to read
// them: as a stream (neither option lit), or as artist or venue rankings.
// Stacking also keeps the labels legible.
//
// Rankings used to be its own dock tab. It isn't a separate destination
// though - it's the same logged shows read as an aggregate instead of as a
// stream - so it became a view here when the dock dropped to three tabs. See
// components/BottomNav.tsx.
//
// The first bar applies on both pages: on Rankings, Following ranks only on
// ratings from you and the people you follow. Feed is state and Rankings is
// a route, so the choice crosses between them in the URL (`?filter=`), or a
// ranking opened from Following would quietly show everyone's.
//
// Tapping the ranking that's already lit turns it off, which is the way back
// to the stream from Rankings (the dock's Feed tab and the logo go there too).
export type FeedFilter = 'all' | 'following'
export type RankingsView = 'rankings' | 'venues'

const FILTERS: { value: FeedFilter; label: string }[] = [
  { value: 'all',       label: 'All activity' },
  { value: 'following', label: 'Following' },
]

// Typed as plain strings so a sentinel can be passed for "nothing selected":
// on Feed neither ranking is lit.
const RANKINGS: { value: string; label: string }[] = [
  { value: 'rankings', label: 'Artist rankings' },
  { value: 'venues',   label: 'Venue rankings' },
]

export function rankingsHref(view: RankingsView, filter: FeedFilter = 'all'): string {
  const params = new URLSearchParams()
  if (view === 'venues') params.set('view', 'venues')
  if (filter === 'following') params.set('filter', 'following')
  const qs = params.toString()
  return qs ? `/rankings?${qs}` : '/rankings'
}

export function feedHref(filter: FeedFilter): string {
  return filter === 'following' ? '/feed?filter=following' : '/feed'
}

const NONE = ''

export function FeedTabs({ filter, rankings = null, onFilterChange, onRankingsChange }: {
  filter:   FeedFilter
  // The ranking showing, on Rankings; null on Feed.
  rankings?: RankingsView | null
  // Both pages change the filter in place.
  onFilterChange: (value: FeedFilter) => void
  // Given only on Rankings, which switches between artists and venues in
  // place. From Feed, either one is a navigation.
  onRankingsChange?: (value: RankingsView) => void
}) {
  const router = useRouter()

  return (
    <div className="space-y-2">
      <Segmented options={FILTERS} value={filter} onChange={onFilterChange} />
      <Segmented
        options={RANKINGS}
        value={rankings ?? NONE}
        onChange={next => {
          const view = next as RankingsView
          if (view === rankings) { router.push(feedHref(filter)); return }
          if (onRankingsChange) { onRankingsChange(view); return }
          router.push(rankingsHref(view, filter))
        }}
      />
    </div>
  )
}
