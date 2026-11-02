'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Bookmark, Building2, Check, MapPin, Plus, Search, X } from 'lucide-react'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { setActiveShow } from '@/lib/activeShow'
import { fetchSavedShowIds, saveShow, unsaveShow } from '@/lib/savedShows'
import { formatDistance } from '@/lib/geo'
import { useNearby, RADIUS_OPTIONS } from '@/lib/useNearby'
import { useSearchCity } from '@/lib/useSearchCity'
import { CityPicker, placeName } from '@/components/CityPicker'
import { SignUpSheet } from '@/components/SignUpSheet'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { AppHeader } from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import { ArtistPhoto, Chip, DateTag, EmptyState, ErrorNote, Label, Place, Segmented, btnPrimary, btnSecondary, inputBox } from '@/components/ui'

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

// setlist.fm allows 1,440 requests a day, so its half of a search waits
// longer for typing to settle, and doesn't start until a name is plausible.
// See lib/setlistfm.ts.
const PAST_DEBOUNCE_MS = 700
const PAST_MIN_QUERY   = 3

// Whether this device last agreed to text reminders. The saved row keeps the
// actual record of consent; this only saves ticking the box every time.
const TEXT_OPT_IN_KEY = 'gigl.text-reminders.v1'

type View = 'past' | 'upcoming'

// Two decimal places is about 1km, which is a fraction of even the tightest
// radius on offer - so the filter behaves identically, but a precise home
// address never lands in a URL or a server log.
const COORD_PRECISION = 2

// Picking the show you went to - the first step of logging one, and the only
// thing the dock's Log button opens.
//
// This used to serve two dock tabs: Search, headed "Find a show", and Log
// with ?mode=log, headed "What did you see?". Same screen, same results,
// different sentence. Once search started returning only shows that have
// already happened there was no second idea left to express, so the Search
// tab and the mode flag both went.
export default function SelectShowPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { user } = useAuth()

  const [query, setQuery] = useState('')
  const [view, setView]   = useState<View>('past')
  const nearby = useNearby()

  // Saving, on the Upcoming list. `pendingSave` is the show someone tapped
  // while signed out, finished once the sign-up sheet hands back an account.
  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set())
  const [saveFailed, setSaveFailed]   = useState(false)
  const [pendingSave, setPendingSave] = useState<Show | null>(null)
  const [textOptIn, setTextOptIn]     = useState(false)

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('view') === 'upcoming') setView('upcoming')
    try { setTextOptIn(localStorage.getItem(TEXT_OPT_IN_KEY) === '1') } catch { /* blocked storage: stays unticked */ }
  }, [])

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return }
    fetchSavedShowIds(user.id).then(setSavedIds).catch(err => console.error('saved show ids failed:', err))
  }, [user?.id])

  function changeView(next: View) {
    if (next === view) return
    // Clear now, so a past row is never on screen wearing an Upcoming button.
    setResults([])
    setLoading(true)
    setView(next)
  }

  function changeTextOptIn(next: boolean) {
    setTextOptIn(next)
    try { localStorage.setItem(TEXT_OPT_IN_KEY, next ? '1' : '0') } catch { /* this session still has it */ }
  }

  async function storeSave(userId: string, show: Show) {
    setSaveFailed(false)
    setSavedIds(ids => new Set(ids).add(show.id))
    try {
      await saveShow(userId, show, textOptIn && !!user?.phone)
    } catch (err) {
      console.error('saving a show failed:', err)
      setSaveFailed(true)
      setSavedIds(ids => { const next = new Set(ids); next.delete(show.id); return next })
    }
  }

  async function toggleSave(show: Show) {
    if (!user) { setPendingSave(show); return }
    if (!savedIds.has(show.id)) { await storeSave(user.id, show); return }

    setSaveFailed(false)
    setSavedIds(ids => { const next = new Set(ids); next.delete(show.id); return next })
    try {
      await unsaveShow(user.id, show.id)
    } catch (err) {
      console.error('removing a saved show failed:', err)
      setSaveFailed(true)
      setSavedIds(ids => new Set(ids).add(show.id))
    }
  }

  // A typed city is the way to search by place without sharing a location.
  // It goes down the same lat/lng/radius path as Near me, and wins while set.
  const searchCity = useSearchCity()
  const [pickingCity, setPickingCity] = useState(false)
  const nearMeOn = nearby.active && !searchCity.city
  const centre = searchCity.city ?? (nearby.active ? nearby.coords : null)
  const area = centre
    ? `within ${nearby.radiusMiles} mi${searchCity.city ? ` of ${searchCity.city.city}` : ''}`
    : null

  // Primitives, so the search effect below re-runs when the location
  // actually changes rather than on every render that makes a new object.
  const nearbyLat = centre ? centre.lat.toFixed(COORD_PRECISION) : null
  const nearbyLng = centre ? centre.lng.toFixed(COORD_PRECISION) : null
  const nearbyRadius = nearby.radiusMiles

  const [results, setResults] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  // Where the next page of the Upcoming list starts, and which search the list
  // on screen belongs to, so a page that lands after the search has changed is
  // dropped rather than appended.
  const [upcomingNext, setUpcomingNext]       = useState<number | null>(null)
  const [upcomingMoreLoading, setUpcomingMoreLoading] = useState(false)
  const upcomingSearch = useRef('')

  // Debounced so typing doesn't fire a request per keystroke — a cleared or
  // empty query still fetches (the trending/browse list), but fires
  // immediately rather than waiting out the debounce, so first paint and
  // "backspaced to empty" don't sit on an artificial delay.
  useEffect(() => {
    // Hold the first request until the remembered Near me choice is back,
    // so a returning local user doesn't see a nationwide list flash past.
    if (!nearby.ready) return

    const trimmed = query.trim()
    upcomingSearch.current = `${view}|${trimmed}|${nearbyLat}|${nearbyLng}|${nearbyRadius}|${retryToken}`
    setUpcomingNext(null)
    setUpcomingMoreLoading(false)
    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setLoading(true)
      setError(false)
      try {
        const params = new URLSearchParams({ q: trimmed })
        if (view === 'upcoming') params.set('when', 'upcoming')
        if (nearbyLat && nearbyLng) {
          params.set('lat', nearbyLat)
          params.set('lng', nearbyLng)
          params.set('radius', String(nearbyRadius))
        }
        const res = await fetch(`/api/shows/search?${params.toString()}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`search failed: ${res.status}`)
        const data = await res.json()
        setResults(data.shows ?? [])
        setUpcomingNext(data.next ?? null)
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
  }, [query, view, retryToken, nearby.ready, nearbyLat, nearbyLng, nearbyRadius])

  async function loadMoreUpcoming() {
    if (upcomingNext == null || upcomingMoreLoading) return
    const search = upcomingSearch.current
    setUpcomingMoreLoading(true)
    try {
      const params = new URLSearchParams({ q: query.trim(), when: 'upcoming', offset: String(upcomingNext) })
      if (nearbyLat && nearbyLng) {
        params.set('lat', nearbyLat)
        params.set('lng', nearbyLng)
        params.set('radius', String(nearbyRadius))
      }
      const res = await fetch(`/api/shows/search?${params.toString()}`)
      const data = res.ok ? await res.json() : null
      if (upcomingSearch.current !== search) return
      if (data) {
        setResults(shown => {
          const ids = new Set(shown.map(s => s.id))
          return [...shown, ...(data.shows ?? []).filter((s: Show) => !ids.has(s.id))]
        })
        setUpcomingNext(data.next ?? null)
      }
    } catch (err) {
      console.error('more upcoming shows failed:', err)
    } finally {
      if (upcomingSearch.current === search) setUpcomingMoreLoading(false)
    }
  }

  // Shows from before the catalogue began, from setlist.fm. Fetched beside
  // the catalogue search rather than inside it, so the catalogue's results
  // never wait on an outside service; a failure just means none appear.
  //
  // Newest first, a load at a time over five years: `pastNext` is where the
  // last load stopped, and "Show earlier shows" picks up from there.
  const [past, setPast]               = useState<Show[]>([])
  const [pastLoading, setPastLoading] = useState(false)
  const [pastNext, setPastNext]       = useState<string | null>(null)
  const [moreLoading, setMoreLoading] = useState(false)

  // The search the list on screen belongs to, so an older load that lands
  // after the query has changed is dropped rather than appended.
  const pastSearch = useRef('')

  function pastUrl(q: string, cursor?: string) {
    const params = new URLSearchParams({ q })
    if (nearbyLat && nearbyLng) {
      params.set('lat', nearbyLat)
      params.set('lng', nearbyLng)
      params.set('radius', String(nearbyRadius))
    }
    if (cursor) params.set('cursor', cursor)
    return `/api/shows/past?${params.toString()}`
  }

  useEffect(() => {
    const trimmed = query.trim()
    pastSearch.current = `${trimmed}|${nearbyLat}|${nearbyLng}|${nearbyRadius}`
    setPast([])
    setPastNext(null)
    setMoreLoading(false)
    // setlist.fm only knows shows that already happened.
    if (view !== 'past' || !nearby.ready || trimmed.length < PAST_MIN_QUERY) { setPastLoading(false); return }

    setPastLoading(true)
    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(pastUrl(trimmed), { signal: controller.signal })
        const data = res.ok ? await res.json() : { shows: [], next: null }
        setPast(data.shows ?? [])
        setPastNext(data.next ?? null)
        setPastLoading(false)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('past show search failed:', err)
          setPastLoading(false)
        }
      }
    }, PAST_DEBOUNCE_MS)

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [query, view, nearby.ready, nearbyLat, nearbyLng, nearbyRadius])

  async function loadEarlier() {
    if (!pastNext || moreLoading) return
    const search = pastSearch.current
    setMoreLoading(true)
    try {
      const res = await fetch(pastUrl(query.trim(), pastNext))
      const data = res.ok ? await res.json() : null
      if (pastSearch.current !== search) return
      if (data) {
        setPast(shown => {
          const ids = new Set(shown.map(s => s.id))
          return [...shown, ...(data.shows ?? []).filter((s: Show) => !ids.has(s.id))]
        })
        setPastNext(data.next ?? null)
      }
    } catch (err) {
      console.error('earlier past shows failed:', err)
    } finally {
      if (pastSearch.current === search) setMoreLoading(false)
    }
  }

  function select(show: Show) {
    localStorage.setItem(LOCAL_STORAGE_KEY, show.id)

    // Every result on this page is a single fully-specified show, from the
    // catalogue or from setlist.fm, never a bare festival id. Persisted separately
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
  // `pastNext` alone keeps the section up too: a first load can be all
  // announced dates with older shows still to come.
  const showPast = view === 'past' && trimmedQuery.length >= PAST_MIN_QUERY && (pastLoading || past.length > 0 || pastNext != null)

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <AppHeader>
        <div className="min-w-0">
          <Label>{view === 'past' ? 'Log a show' : 'Save a show'}</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
            {view === 'past' ? 'What did you see' : 'What are you seeing'}<span className="text-accent">?</span>
          </h1>
        </div>
      </AppHeader>

      <div className="px-5 pt-3">
        <div className="pb-2.5">
          <Segmented
            options={[{ value: 'past', label: 'Been to' }, { value: 'upcoming', label: 'Upcoming' }]}
            value={view}
            onChange={changeView}
          />
        </div>

        <label className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5`}>
          <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Artist or venue"
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
            aria-pressed={nearMeOn}
            disabled={nearby.status === 'locating'}
            onClick={() => {
              if (nearMeOn) { nearby.disable(); return }
              searchCity.clear()
              setPickingCity(false)
              if (!nearby.active) nearby.enable()
            }}
          >
            <Chip active={nearMeOn}>
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3" strokeWidth={2.5} />
                {nearby.status === 'locating' ? 'Locating…' : 'Near me'}
              </span>
            </Chip>
          </button>

          {/* Picking a city also turns Near me off, which is remembered, so
              someone who chose this over sharing a location isn't asked
              again next time. */}
          <button
            type="button"
            aria-pressed={searchCity.city != null}
            onClick={() => {
              if (searchCity.city) searchCity.clear()
              else setPickingCity(open => !open)
            }}
          >
            <Chip active={searchCity.city != null}>
              <span className="inline-flex items-center gap-1">
                <Building2 className="w-3 h-3" strokeWidth={2.5} />
                {searchCity.city ? placeName(searchCity.city) : 'Search city'}
                {searchCity.city && <X className="w-3 h-3" strokeWidth={2.5} />}
              </span>
            </Chip>
          </button>

          {centre && RADIUS_OPTIONS.map(miles => (
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

        {pickingCity && !searchCity.city && (
          <CityPicker
            onPick={city => {
              searchCity.choose(city)
              setPickingCity(false)
              nearby.disable()
            }}
            onClose={() => setPickingCity(false)}
          />
        )}

        {!searchCity.city && !pickingCity && (nearby.status === 'denied' || nearby.status === 'unavailable') && (
          <p className="pt-1.5 text-[11px] leading-snug text-ink-faint">
            {nearby.status === 'denied'
              ? 'Gigl can’t see your location. Allow it in your browser’s site settings, or pick a city.'
              : 'Couldn’t get your location. Check that location services are on, then tap Near me again, or pick a city.'}
          </p>
        )}
      </div>

      {/* Only offered to accounts with a phone number. Unticked by default,
          and nothing is texted until the reminders are switched on. */}
      {view === 'upcoming' && user?.phone && (
        <label className="mx-5 mt-2.5 flex items-start gap-2 text-[11px] leading-snug text-ink-muted">
          <input
            type="checkbox"
            checked={textOptIn}
            onChange={e => changeTextOptIn(e.target.checked)}
            className="mt-0.5 flex-shrink-0 accent-accent"
          />
          <span>Also text me to review shows I save, once text reminders start. Message and data rates may apply. Reply STOP to opt out.</span>
        </label>
      )}

      {saveFailed && <div className="px-5 pt-2.5"><ErrorNote>Couldn&apos;t update your saved shows. Try again.</ErrorNote></div>}

      <Label className="px-5 pt-4 pb-2">
        {trimmedQuery
          ? <>Results for &ldquo;{trimmedQuery}&rdquo;{area ? ` · ${area}` : ''}</>
          : view === 'upcoming'
          ? (area ? `Coming up ${area}` : 'Coming up')
          : area ? `This past week ${area}` : 'This past week'}
      </Label>

      <main className="px-5 space-y-3">
        {loading && <ShimmerRows count={4} />}

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

        {/* Held back while setlist.fm is still looking or has found
            something, so "nothing matched" never sits above a list of
            matches. */}
        {!loading && !error && results.length === 0 && !showPast && (
          <EmptyState>
            {view === 'upcoming'
              ? (trimmedQuery
                ? <>Nothing coming up matched &ldquo;{trimmedQuery}&rdquo;{area ? ` ${area}` : ''}.</>
                : `No upcoming shows ${area ?? 'to show right now'}.`)
              : trimmedQuery
              ? <>Nothing from the past year matched &ldquo;{trimmedQuery}&rdquo;{area ? ` ${area}` : ''}.</>
              : area
              ? `No shows in the past week ${area}. Try a wider radius.`
              : 'No shows from the past week to show right now.'}
          </EmptyState>
        )}

        {!loading && !error && results.length > 0 && (
          view === 'upcoming'
            ? <UpcomingList shows={results} savedIds={savedIds} onToggle={toggleSave} />
            : <ShowList shows={results} onSelect={select} />
        )}

        {!loading && !error && view === 'upcoming' && upcomingNext != null && (
          <button
            type="button"
            onClick={loadMoreUpcoming}
            disabled={upcomingMoreLoading}
            className={`${btnSecondary} w-full py-2.5 text-[11px]`}
          >
            {upcomingMoreLoading ? 'Loading…' : 'Show more'}
          </button>
        )}

        {/* setlist.fm's terms ask for a credit wherever its data appears,
            with a link search engines can follow - so no rel="nofollow". */}
        {!loading && showPast && (
          <section>
            <div className="flex items-baseline justify-between gap-3 pt-1 pb-2">
              <Label>More shows</Label>
              <a
                href="https://www.setlist.fm"
                target="_blank"
                rel="noopener"
                className="text-[10px] font-semibold uppercase tracking-label text-ink-faint underline underline-offset-[3px] hover:text-accent"
              >
                via setlist.fm
              </a>
            </div>
            {pastLoading ? <ShimmerRows count={2} /> : past.length > 0 && <ShowList shows={past} onSelect={select} />}
            {!pastLoading && pastNext && (
              <button
                type="button"
                onClick={loadEarlier}
                disabled={moreLoading}
                className={`${btnSecondary} w-full mt-3 py-2.5 text-[11px]`}
              >
                {moreLoading ? 'Loading…' : 'Show earlier shows'}
              </button>
            )}
          </section>
        )}

        {/* The catalogue stops at ticketed rooms, so this is the only route
            a house show or a local bill has into Gigl at all. */}
        {view === 'past' && <Link href="/add-show" className="flex items-center gap-3 rounded-card border-1.5 border-dashed border-ink/30 px-3.5 py-3 hover:border-accent/50">
          <span className="w-9 h-9 flex-shrink-0 rounded-full bg-accent/10 border border-accent/40 text-accent flex items-center justify-center">
            <Plus className="w-4 h-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold leading-tight">Can&apos;t find your show?</p>
            <p className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">Add it yourself</p>
          </div>
        </Link>}
      </main>

      {pendingSave && (
        <SignUpSheet
          title="Save this show"
          blurb="Make an account to save shows. We'll remind you to review them once they've happened."
          onClose={() => setPendingSave(null)}
          onSignedIn={userId => {
            const show = pendingSave
            setPendingSave(null)
            storeSave(userId, show)
          }}
        />
      )}

      <BottomNav />
    </div>
  )
}

function ShowList({ shows, onSelect }: { shows: Show[]; onSelect: (show: Show) => void }) {
  return (
    <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
      {shows.map((s, i) => (
        <button
          key={s.id}
          type="button"
          onClick={() => onSelect(s)}
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
  )
}

// Like ShowList, but a row can't be logged yet, so only its Save button acts.
function UpcomingList({ shows, savedIds, onToggle }: {
  shows: Show[]; savedIds: Set<string>; onToggle: (show: Show) => void
}) {
  return (
    <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
      {shows.map((s, i) => {
        const saved = savedIds.has(s.id)
        return (
          <div
            key={s.id}
            className={`flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}
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
              <button
                type="button"
                aria-pressed={saved}
                onClick={() => onToggle(s)}
                className={`${saved ? btnPrimary : btnSecondary} gap-1 px-2.5 py-1 text-[10px]`}
              >
                {saved ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <Bookmark className="w-3 h-3" strokeWidth={2.5} />}
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function ShimmerRows({ count }: { count: number }) {
  return (
    <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-ink/10' : ''}`}>
          <div className="shimmer w-14 h-14 rounded-card flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="shimmer h-3.5 w-3/5 rounded" />
            <div className="shimmer h-2.5 w-4/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

