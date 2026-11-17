'use client'

import { useRouter } from 'next/navigation'
import { Segmented } from '@/components/ui'

// The bars that sit under the header on Feed and Rankings.
//
// The first is whose logs count: everyone's ("All activity") or yours and
// the people you follow ("Following"). It's on both pages: on Rankings,
// Following ranks only on ratings from you and the people you follow. Feed
// is state and Rankings is a route, so the choice crosses between them in
// the URL (`?filter=`), or a ranking opened from Following would quietly
// show everyone's.
//
// The second, Artist rankings / Venue rankings, is only on Rankings. It used
// to sit on Feed as well, when Rankings was a view on Feed rather than a
// dock tab; with Rankings back in the dock (components/BottomNav.tsx), Feed
// is just the stream.
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

const NONE = ''

export function FeedTabs({ filter, rankings = null, onFilterChange, onRankingsChange }: {
  filter:   FeedFilter
  // The ranking showing, on Rankings; null on Feed, which has no second bar.
  rankings?: RankingsView | null
  // Both pages change the filter in place.
  onFilterChange: (value: FeedFilter) => void
  // Rankings switches between artists and venues in place.
  onRankingsChange?: (value: RankingsView) => void
}) {
  const router = useRouter()

  return (
    <div className="space-y-2">
      <Segmented options={FILTERS} value={filter} onChange={onFilterChange} />
      {rankings && (
        <Segmented
          options={RANKINGS}
          value={rankings ?? NONE}
          onChange={next => {
            const view = next as RankingsView
            if (view === rankings) return
            if (onRankingsChange) { onRankingsChange(view); return }
            router.push(rankingsHref(view, filter))
          }}
        />
      )}
    </div>
  )
}
