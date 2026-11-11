'use client'

import { useRouter } from 'next/navigation'
import { Segmented } from '@/components/ui'

// The view switch that sits under the header on Feed and Rankings.
//
// Two tiers rather than one row of four. "All activity" and "Following" are
// the same question - whose logs am I looking at - while the rankings
// (artists, venues) are a different thing entirely, so they don't belong as
// peers in one control. Stacking also keeps the labels legible.
//
// Rankings used to be its own dock tab. It isn't a separate destination
// though - it's the same logged shows read as an aggregate instead of as a
// stream - so it became a view here when the dock dropped to three tabs. See
// components/BottomNav.tsx.
//
// The two filter options are local state on Feed while Rankings is a route,
// so this control spans a page boundary: picking rankings navigates, and
// picking a filter from the rankings page navigates back carrying the choice.
// That's what `?filter=` on /feed is for - without it, tapping "Following"
// from rankings would land on "All activity" and the control would look
// broken.
export type FeedView = 'all' | 'following' | 'rankings' | 'venues'
export type RankingsView = 'rankings' | 'venues'

// Typed as plain strings so a sentinel can be passed for "nothing selected
// here" - on the rankings page neither filter is active, and on Feed the
// rankings row isn't.
const FILTERS: { value: string; label: string }[] = [
  { value: 'all',       label: 'All activity' },
  { value: 'following', label: 'Following' },
]

const RANKINGS: { value: string; label: string }[] = [
  { value: 'rankings', label: 'Artist rankings' },
  { value: 'venues',   label: 'Venue rankings' },
]

export function rankingsHref(view: RankingsView): string {
  return view === 'venues' ? '/rankings?view=venues' : '/rankings'
}

const NONE = ''

export function FeedTabs({ value, onFilterChange, onRankingsChange }: {
  value: FeedView
  // Given only on Feed, where the filter options are state rather than a
  // route. Omitted on Rankings, where every option is a navigation.
  onFilterChange?: (value: 'all' | 'following') => void
  // Given only on Rankings, which switches between artists and venues in
  // place. From Feed, either one is a navigation.
  onRankingsChange?: (value: RankingsView) => void
}) {
  const router = useRouter()
  const onRankings = value === 'rankings' || value === 'venues'

  return (
    <div className="space-y-2">
      <Segmented
        options={FILTERS}
        value={onRankings ? NONE : value}
        onChange={next => {
          const filter = next as 'all' | 'following'
          if (onFilterChange) { onFilterChange(filter); return }
          router.push(`/feed?filter=${filter}`)
        }}
      />
      <Segmented
        options={RANKINGS}
        value={onRankings ? value : NONE}
        onChange={next => {
          const view = next as RankingsView
          if (onRankingsChange) { onRankingsChange(view); return }
          router.push(rankingsHref(view))
        }}
      />
    </div>
  )
}
