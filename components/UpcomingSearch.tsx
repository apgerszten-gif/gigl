'use client'

import { useEffect, useRef, useState } from 'react'
import { FEED_SEARCH_MIN, NameMatchSections, type ArtistMatch, type VenueMatch } from '@/components/FeedSearch'
import { ShimmerRows, UpcomingShowRows, type ListedShow } from '@/components/ShowRows'
import { EmptyState, Label, btnSecondary } from '@/components/ui'
import { artistHref } from '@/lib/showLinks'

// The Upcoming tab's search, laid out like the Feed's (components/FeedSearch.tsx):
// Artists and Venues first, each opening its page of shows (where Follow is),
// then every upcoming show whose artist or venue matches, soonest first, a
// page at a time. Like the Feed's, it looks everywhere: the place and date
// filters step aside while it's on, because a search is "when are they next
// playing", wherever that is.

const SEARCH_DEBOUNCE_MS = 300

interface Results {
  artists: ArtistMatch[]
  venues:  VenueMatch[]
  shows:   ListedShow[]
  next:    number | null
}

function showsUrl(query: string, offset = 0): string {
  const params = new URLSearchParams({ when: 'upcoming', q: query })
  if (offset) params.set('offset', String(offset))
  return `/api/shows/search?${params.toString()}`
}

export function UpcomingSearchResults({ query, savedIds, onToggleSave, onShare }: {
  query:        string
  savedIds:     Set<string>
  onToggleSave: (show: ListedShow) => void
  onShare:      (show: ListedShow) => void
}) {
  const trimmed = query.trim()
  const [results, setResults] = useState<Results | null>(null)
  // Which query `results` answers. A newer one keeps the older results on
  // screen until it lands, rather than flashing back to shimmer each key.
  const [answered, setAnswered]       = useState<string | null>(null)
  const [failed, setFailed]           = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const latest = useRef(trimmed)

  useEffect(() => {
    latest.current = trimmed
    setMoreLoading(false)
    if (trimmed.length < FEED_SEARCH_MIN) return

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const [namesRes, showsRes] = await Promise.all([
          fetch(`/api/search?${new URLSearchParams({ q: trimmed, only: 'names' }).toString()}`, { signal: controller.signal }),
          fetch(showsUrl(trimmed), { signal: controller.signal }),
        ])
        if (!namesRes.ok || !showsRes.ok) throw new Error(`search failed: ${namesRes.status} / ${showsRes.status}`)
        const [names, shows] = await Promise.all([namesRes.json(), showsRes.json()])
        if (latest.current !== trimmed) return
        setResults({
          artists: names.artists ?? [],
          venues:  names.venues ?? [],
          shows:   shows.shows ?? [],
          next:    shows.next ?? null,
        })
        setAnswered(trimmed)
        setFailed(false)
      } catch (err) {
        if ((err as Error).name === 'AbortError' || latest.current !== trimmed) return
        console.error('upcoming search failed:', err)
        setFailed(true)
        setAnswered(trimmed)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [trimmed])

  async function loadMore() {
    if (!results || results.next == null || moreLoading) return
    const forQuery = trimmed
    setMoreLoading(true)
    try {
      const res = await fetch(showsUrl(forQuery, results.next))
      const data = res.ok ? await res.json() : null
      if (latest.current !== forQuery || !data) return
      setResults(shown => {
        if (!shown) return shown
        const ids = new Set(shown.shows.map(s => s.id))
        return { ...shown, shows: [...shown.shows, ...(data.shows ?? []).filter((s: ListedShow) => !ids.has(s.id))], next: data.next ?? null }
      })
    } catch (err) {
      console.error('more upcoming search results failed:', err)
    } finally {
      if (latest.current === forQuery) setMoreLoading(false)
    }
  }

  const settled = answered === trimmed
  const empty = results != null && results.artists.length === 0 && results.venues.length === 0 && results.shows.length === 0

  return (
    <main className="px-5 pt-4 space-y-5">
      {failed && settled ? (
        <EmptyState>Couldn&apos;t search right now. Try again in a moment.</EmptyState>
      ) : results == null ? (
        <ShimmerRows count={4} />
      ) : empty && settled ? (
        <EmptyState>Nothing coming up on Gigl matches &ldquo;{trimmed}&rdquo;.</EmptyState>
      ) : (
        <div className={`space-y-5 transition-opacity ${settled ? '' : 'opacity-60'}`}>
          <NameMatchSections artists={results.artists} venues={results.venues} />

          {results.shows.length > 0 && (
            <section>
              <Label className="mb-2">Coming up</Label>
              <UpcomingShowRows
                shows={results.shows}
                savedIds={savedIds}
                onToggleSave={onToggleSave}
                onShare={onShare}
                hrefOf={show => artistHref(show.artist)}
              />
            </section>
          )}

          {settled && results.next != null && (
            <button
              type="button"
              onClick={loadMore}
              disabled={moreLoading}
              className={`${btnSecondary} w-full py-2.5 text-[11px]`}
            >
              {moreLoading ? 'Loading…' : 'Show more'}
            </button>
          )}
        </div>
      )}
    </main>
  )
}
