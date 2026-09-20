'use client'

import { useRouter } from 'next/navigation'
import { Segmented } from '@/components/ui'

// The view switch that sits under the header on Feed and Rankings.
//
// Rankings used to be its own dock tab. It isn't a separate destination
// though - it's the same logged shows as the feed, read as an aggregate
// instead of as a stream - so it became a third view here when the dock
// dropped to three tabs. See components/BottomNav.tsx.
//
// The two filter options are local state on Feed while Rankings is a route,
// so this control spans a page boundary: picking Rankings navigates, and
// picking a filter from the Rankings page navigates back carrying the choice.
// That's what `?filter=` on /feed is for - without it, tapping "Following"
// from Rankings would land on "All activity" and the control would look
// broken.
export type FeedView = 'all' | 'following' | 'rankings'

const OPTIONS: { value: FeedView; label: string }[] = [
  { value: 'all',       label: 'All activity' },
  { value: 'following', label: 'Following' },
  { value: 'rankings',  label: 'Rankings' },
]

export function FeedTabs({ value, onFilterChange }: {
  value: FeedView
  // Given only on Feed, where the filter options are state rather than a
  // route. Omitted on Rankings, where every option is a navigation.
  onFilterChange?: (value: 'all' | 'following') => void
}) {
  const router = useRouter()

  return (
    <Segmented
      options={OPTIONS}
      value={value}
      onChange={next => {
        if (next === 'rankings') { router.push('/rankings'); return }
        if (onFilterChange) { onFilterChange(next); return }
        router.push(`/feed?filter=${next}`)
      }}
    />
  )
}
