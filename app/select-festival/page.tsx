'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MapPin, Plus, Search } from 'lucide-react'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { setActiveShow } from '@/lib/activeShow'
import { formatDistance } from '@/lib/geo'
import { useNearby, RADIUS_OPTIONS } from '@/lib/useNearby'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { AppHeader } from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import { ArtistPhoto, Chip, DateTag, EmptyState, Label, Place, btnSecondary, inputBox } from '@/components/ui'

interface Show {
  id: string
  artist: string
  support?: string[]
  venue: string
  city: string
  state: string
  date: string
  isoDate: string | null
  emoji: string
  imageUrl: string | null
  distanceMiles?: number
}

const SEARCH_DEBOUNCE_MS = 350

// Two decimal places is about 1km, which is a fraction of even the tightest
// radius on offer - so the filter behaves identically, but a precise home
// address never lands in a URL or a server log.
const COORD_PRECISION = 2

// Show search. The dock's Search tab opens it as "Find a show"; its Log tab
// opens it with ?mode=log, since logging always starts by picking a show.
function SelectShowInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()
  const { user, loading: authLoading } = useAuth()

  const isLogMode = searchParams.get('mode') === 'log'

  const [query, setQuery] = useState('')
  const nearby = useNearby()

  // Primitives, so the search effect below re-runs when the location
  // actually changes rather than on every render that makes a new object.
  const nearbyLat = nearby.active ? nearby.coords!.lat.toFixed(COORD_PRECISION) : null
  const nearbyLng = nearby.active ? nearby.coords!.lng.toFixed(COORD_PRECISION) : null
  const nearbyRadius = nearby.radiusMiles

  const [results, setResults] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [authLoading, user, router])

  // Debounced so typing doesn't fire a request per keystroke — a cleared or
  // empty query still fetches (the trending/browse list), but fires
  // immediately rather than waiting out the debounce, so first paint and
  // "backspaced to empty" don't sit on an artificial delay.
  useEffect(() => {
    // Hold the first request until the remembered Near me choice is back,
    // so a returning local user doesn't see a nationwide list flash past.
    if (!nearby.ready) return

    const trimmed = query.trim()
    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setLoading(true)
      setError(false)
      try {
        const params = new URLSearchParams({ q: trimmed })
        if (nearbyLat && nearbyLng) {
          params.set('lat', nearbyLat)
          params.set('lng', nearbyLng)
          params.set('radius', String(nearbyRadius))
        }
        const res = await fetch(`/api/shows/search?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`search failed: ${res.status}`)
        const data = await res.json()
        setResults(data.shows ?? [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('show search failed:', err)
          setError(true)
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, trimmed ? SEARCH_DEBOUNCE_MS : 0)

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [query, retryToken, nearby.ready, nearbyLat, nearbyLng, nearbyRadius])

  function select(show: Show) {
    localStorage.setItem(LOCAL_STORAGE_KEY, show.id)

    // Every result on this page comes from Ticketmaster search now (the
    // old two-festival picker is gone), so it's always a single
    // fully-specified show, never a bare festival id. Persisted separately
    // from LOCAL_STORAGE_KEY (which only holds the id) so /log can pull the
    // artist/venue/date back out without re-fetching - see lib/activeShow.
    setActiveShow({ id: show.id, artist: show.artist, venue: show.venue, city: show.city, state: show.state, isoDate: show.isoDate, imageUrl: show.imageUrl })

    // Best-effort, fire-and-forget — this is only needed so the SMS webhook
    // (which has no access to a browser's localStorage) knows which show
    // to match artist names against. The in-app UI never depends on this
    // write completing.
    // NOTE: active_festival_id is a holdover column name from the
    // festival-only model — it's being repurposed here to hold whichever
    // show id the person picked. Renaming it is a backend follow-up.
    if (user) {
      supabase.from('profiles').update({ active_festival_id: show.id }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('active_festival_id update failed:', error.message)
      })
    }

    // /log already knows how to take a Ticketmaster-sourced active show
    // (set above) straight into /log-show, skipping the festival lineup
    // picker entirely - see app/log/page.tsx.
    router.push('/log')
  }

  const trimmedQuery = query.trim()

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <AppHeader>
        <div className="min-w-0">
          <Label>{isLogMode ? 'Log a show' : 'Search'}</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
            {isLogMode ? <>What did you see<span className="text-accent">?</span></> : 'Find a show'}
          </h1>
        </div>
      </AppHeader>

      <div className="px-5 pt-3">
        <label className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5`}>
          <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Artist, venue or city"
            className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </label>

        {/* Location is requested on arrival, so this chip reports the
            filter rather than starting it. Turning it off is remembered and
            stops the asking; tapping it back on is also the retry after a
            refusal. See lib/useNearby.ts. */}
        <div className="pt-2.5 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            aria-pressed={nearby.active}
            disabled={nearby.status === 'locating'}
            onClick={() => (nearby.active ? nearby.disable() : nearby.enable())}
          >
            <Chip active={nearby.active}>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" strokeWidth={2.5} />
                {nearby.status === 'locating' ? 'Locating…' : 'Near me'}
              </span>
            </Chip>
          </button>

          {nearby.active && RADIUS_OPTIONS.map(miles => (
            <button
              key={miles}
              type="button"
              aria-pressed={nearby.radiusMiles === miles}
              onClick={() => nearby.setRadius(miles)}
            >
              <Chip active={nearby.radiusMiles === miles}>{miles} mi</Chip>
            </button>
          ))}
        </div>

        {(nearby.status === 'denied' || nearby.status === 'unavailable') && (
          <p className="pt-1.5 text-[11px] leading-snug text-ink-faint">
            {nearby.status === 'denied'
              ? 'Gigl can’t see your location. Allow it in your browser’s site settings to see shows near you.'
              : 'Couldn’t get your location. Check that location services are on, then tap Near me again.'}
          </p>
        )}
      </div>

      <Label className="px-5 pt-4 pb-2">
        {trimmedQuery
          ? <>Results for &ldquo;{trimmedQuery}&rdquo;{nearby.active ? ` · within ${nearby.radiusMiles} mi` : ''}</>
          : nearby.active ? `Coming up within ${nearby.radiusMiles} mi` : 'Coming up'}
      </Label>

      <main className="px-5 space-y-3">
        {loading && (
          <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-ink/10' : ''}`}>
                <div className="shimmer w-14 h-14 rounded-card flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="shimmer h-3.5 w-3/5 rounded" />
                  <div className="shimmer h-2.5 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <EmptyState>
            Couldn&apos;t load shows right now.
            <button
              type="button"
              onClick={() => setRetryToken(t => t + 1)}
              className="block mx-auto mt-2.5 text-xs font-bold uppercase tracking-label text-accent"
            >
              Try again
            </button>
          </EmptyState>
        )}

        {!loading && !error && results.length === 0 && (
          <EmptyState>
            {trimmedQuery
              ? <>No shows matched &ldquo;{trimmedQuery}&rdquo;{nearby.active ? ` within ${nearby.radiusMiles} miles` : ''} yet.</>
              : nearby.active
              ? `Nothing coming up within ${nearby.radiusMiles} miles. Try a wider radius.`
              : 'No upcoming shows to show right now.'}
          </EmptyState>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
            {results.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => select(s)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 hover:bg-accent/5 ${
                  i % 2 ? 'bg-cream-alt' : ''
                } ${i > 0 ? 'border-t border-ink/10' : ''}`}
              >
                <ArtistPhoto name={s.artist} src={s.imageUrl} className="w-14 h-14" iconSize={18}>
                  <DateTag isoDate={s.isoDate} />
                </ArtistPhoto>
                <div className="flex-1 min-w-0">
                  <h3 className="font-display text-[15px] font-bold leading-tight truncate">{s.artist}</h3>
                  <Place className="mt-0.5">{[s.venue, s.city, s.state].filter(Boolean).join(', ')}</Place>
                  {s.support && s.support.length > 0 && (
                    <p className="mt-0.5 text-[11px] text-ink-faint truncate">with {s.support.join(', ')}</p>
                  )}
                </div>
                <div className="flex-shrink-0 flex flex-col items-end gap-1">
                  {s.distanceMiles != null && (
                    <span className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">
                      {formatDistance(s.distanceMiles)}
                    </span>
                  )}
                  <span className={`${btnSecondary} px-2.5 py-1 text-[10px]`}>+ Log</span>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Can't find it - coming soon */}
        <div aria-disabled="true" className="flex items-center gap-3 rounded-card border-1.5 border-dashed border-ink/30 px-3.5 py-3">
          <span className="w-9 h-9 flex-shrink-0 rounded-full bg-ink-muted/10 border border-ink-muted/30 text-ink-muted flex items-center justify-center">
            <Plus className="w-4 h-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold text-ink-muted leading-tight">Can&apos;t find your show?</p>
            <p className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">Add it yourself · coming soon</p>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  )
}

export default function SelectShowPage() {
  return (
    <Suspense fallback={null}>
      <SelectShowInner />
    </Suspense>
  )
}
