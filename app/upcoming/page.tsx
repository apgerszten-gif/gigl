'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { AppHeader } from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import { placeName } from '@/components/CityPicker'
import { PlaceFilter } from '@/components/PlaceFilter'
import { ShimmerRows, UpcomingShowRows, type ListedShow } from '@/components/ShowRows'
import { SignUpSheet } from '@/components/SignUpSheet'
import { Chip, EmptyState, ErrorNote, Label, Segmented, btnSecondary } from '@/components/ui'
import { localIso } from '@/lib/dates'
import { artistHref } from '@/lib/showLinks'
import { useFollowedNames } from '@/lib/useFollowedNames'
import { useNearby } from '@/lib/useNearby'
import { useSearchCity } from '@/lib/useSearchCity'
import { useShowSaving } from '@/lib/useShowSaving'
import { useShowSharing } from '@/lib/useShowSharing'

// The Upcoming tab: what's on, where you are, soon. The interviews' other
// half of the job - Gigl only looked backwards, so finding the next show
// meant Bandsintown, Songkick, venue Instagrams and the group chat, and shows
// still got missed. This reads the same catalogue as the Log screen's
// Upcoming list (/api/shows/search?when=upcoming), narrowed by:
//
//   - place: Near me or a typed city, the Log screen's chips (PlaceFilter)
//   - when: Tonight, This weekend, Next 7 days, Next 30 days, worked out on
//     this device, so "tonight" is the phone's tonight
//   - whose: Everything, or only the artists and venues you follow
//     (lib/followedNames.ts), which you follow from their pages
//
// Shows are grouped by day. Each row saves the show, shares it as an invite
// link that opens without the app, or opens the artist's page to follow them.

type RangeId = 'tonight' | 'weekend' | 'week' | 'month'
type Scope = 'all' | 'following'

const RANGES: { id: RangeId; label: string }[] = [
  { id: 'tonight', label: 'Tonight' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'week',    label: 'Next 7 days' },
  { id: 'month',   label: 'Next 30 days' },
]

// Two decimal places is about 1km: the filter behaves the same, but a precise
// home address never lands in a URL or a server log.
const COORD_PRECISION = 2

function addDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

// The date range a chip means, on this device's calendar. The weekend is
// Friday to Sunday; from Friday on it has started, so it runs from today.
function rangeDates(id: RangeId): { from: string; until: string } {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  switch (id) {
    case 'tonight':
      return { from: localIso(today), until: localIso(today) }
    case 'weekend': {
      const day = today.getDay() // 0 Sunday … 6 Saturday
      const start = day === 0 || day >= 5 ? today : addDays(today, 5 - day)
      const end = day === 0 ? today : addDays(today, 7 - day)
      return { from: localIso(start), until: localIso(end) }
    }
    case 'week':
      return { from: localIso(today), until: localIso(addDays(today, 6)) }
    case 'month':
      return { from: localIso(today), until: localIso(addDays(today, 29)) }
  }
}

function dayLabel(iso: string, today: string, tomorrow: string): string {
  const date = new Date(`${iso}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (iso === today) return `Tonight · ${date}`
  if (iso === tomorrow) return `Tomorrow · ${date}`
  return date
}

export default function UpcomingPage() {
  const { user } = useAuth()
  const nearby = useNearby()
  const searchCity = useSearchCity()
  const { savedIds, saveFailed, toggleSave, signUpSheet } = useShowSaving()
  const { share, shareSheet } = useShowSharing()
  const followed = useFollowedNames()

  const [scope, setScope] = useState<Scope>('all')
  const [range, setRange] = useState<RangeId>('week')
  const [askingSignUp, setAskingSignUp] = useState(false)

  const centre = searchCity.city ?? (nearby.active ? nearby.coords : null)
  const lat = centre ? centre.lat.toFixed(COORD_PRECISION) : null
  const lng = centre ? centre.lng.toFixed(COORD_PRECISION) : null
  const radius = nearby.radiusMiles
  const where = searchCity.city ? placeName(searchCity.city) : centre ? 'Near you' : 'Everywhere'

  // A primitive the effect below can depend on, so a re-render with the same
  // follows doesn't refetch.
  const followKey = followed.follows.map(f => `${f.kind}:${f.name}|${f.city}|${f.state}`).join('~')

  const [shows, setShows]             = useState<ListedShow[]>([])
  const [next, setNext]               = useState<number | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(false)
  const [moreLoading, setMoreLoading] = useState(false)
  const [retryToken, setRetryToken]   = useState(0)
  // Which search the list on screen belongs to, so a "Show more" page that
  // lands after the filters changed is dropped rather than appended.
  const current = useRef('')

  function params(offset = 0): URLSearchParams {
    const { from, until } = rangeDates(range)
    const p = new URLSearchParams({ when: 'upcoming', from, until })
    if (lat && lng) {
      p.set('lat', lat)
      p.set('lng', lng)
      p.set('radius', String(radius))
    }
    if (scope === 'following') {
      p.set('following', '1')
      for (const f of followed.follows) {
        if (f.kind === 'artist') p.append('artist', f.name)
        else p.append('venue', [f.name, f.city, f.state].join('|'))
      }
    }
    if (offset) p.set('offset', String(offset))
    return p
  }

  useEffect(() => {
    // Hold the first request until the remembered Near me choice is back, so
    // a local list doesn't flash up as a nationwide one first.
    if (!nearby.ready) return
    if (scope === 'following' && !followed.loaded) return

    const key = `${scope}|${range}|${lat}|${lng}|${radius}|${followKey}|${retryToken}`
    current.current = key
    setNext(null)
    setMoreLoading(false)

    if (scope === 'following' && followed.follows.length === 0) {
      setShows([])
      setLoading(false)
      setError(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    setError(false)
    fetch(`/api/shows/search?${params().toString()}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) throw new Error(`upcoming failed: ${res.status}`)
        return res.json()
      })
      .then(data => {
        if (current.current !== key) return
        setShows(data.shows ?? [])
        setNext(data.next ?? null)
        setLoading(false)
      })
      .catch(err => {
        if ((err as Error).name === 'AbortError') return
        console.error('upcoming shows failed:', err)
        setShows([])
        setError(true)
        setLoading(false)
      })
    return () => controller.abort()
    // params() reads exactly the values listed here.
  }, [scope, range, lat, lng, radius, followKey, followed.loaded, nearby.ready, retryToken])

  async function loadMore() {
    if (next == null || moreLoading) return
    const key = current.current
    setMoreLoading(true)
    try {
      const res = await fetch(`/api/shows/search?${params(next).toString()}`)
      const data = res.ok ? await res.json() : null
      if (current.current !== key) return
      if (data) {
        setShows(shown => {
          const ids = new Set(shown.map(s => s.id))
          return [...shown, ...(data.shows ?? []).filter((s: ListedShow) => !ids.has(s.id))]
        })
        setNext(data.next ?? null)
      }
    } catch (err) {
      console.error('more upcoming shows failed:', err)
    } finally {
      if (current.current === key) setMoreLoading(false)
    }
  }

  const days = useMemo(() => {
    const byDay = new Map<string, ListedShow[]>()
    for (const show of shows) {
      if (!show.isoDate) continue
      const list = byDay.get(show.isoDate) ?? []
      list.push(show)
      byDay.set(show.isoDate, list)
    }
    return Array.from(byDay.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [shows])

  const today = localIso(new Date())
  const tomorrow = localIso(addDays(new Date(), 1))
  const rangeLabel = RANGES.find(r => r.id === range)!.label.toLowerCase()
  const placeWords = searchCity.city ? `in ${where}` : centre ? 'near you' : ''
  const whenWords = range === 'tonight' ? 'tonight' : range === 'weekend' ? 'this weekend' : `in the ${rangeLabel}`

  function changeScope(nextScope: Scope) {
    if (nextScope === scope) return
    if (nextScope === 'following' && !user) { setAskingSignUp(true); return }
    setShows([])
    setLoading(true)
    setScope(nextScope)
  }

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <AppHeader>
        <div className="min-w-0">
          <Label>{where}</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
            What&apos;s on<span className="text-accent">?</span>
          </h1>
        </div>
      </AppHeader>

      <div className="px-5 pt-3 space-y-2.5">
        <Segmented
          options={[{ value: 'all', label: 'Everything' }, { value: 'following', label: 'Following' }]}
          value={scope}
          onChange={changeScope}
        />

        <div>
          <PlaceFilter nearby={nearby} searchCity={searchCity} />
          {!centre && nearby.status !== 'denied' && nearby.status !== 'unavailable' && nearby.status !== 'locating' && (
            <p className="pt-1.5 text-[11px] leading-snug text-ink-faint">
              Showing every city. Turn on Near me or pick a city to see what&apos;s on around you.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-label text-ink-muted mr-0.5">When</span>
          {RANGES.map(r => (
            <button key={r.id} type="button" aria-pressed={range === r.id} onClick={() => setRange(r.id)}>
              <Chip active={range === r.id}>{r.label}</Chip>
            </button>
          ))}
        </div>
      </div>

      {saveFailed && <div className="px-5 pt-2.5"><ErrorNote>Couldn&apos;t update your saved shows. Try again.</ErrorNote></div>}

      <main className="px-5 pt-4 space-y-5">
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

        {!loading && !error && scope === 'following' && followed.follows.length === 0 && (
          <EmptyState>
            You&apos;re not following any artists or venues yet. Search one on the Feed, open their page and tap Follow: their shows will collect here.
            <Link href="/feed" className="block mx-auto mt-2.5 text-xs font-bold uppercase tracking-label text-accent">
              Go to search
            </Link>
          </EmptyState>
        )}

        {!loading && !error && days.length === 0 && !(scope === 'following' && followed.follows.length === 0) && (
          <EmptyState>
            {scope === 'following'
              ? `${['Nobody you follow is playing', placeWords, whenWords].filter(Boolean).join(' ')}.`
              : `${['Nothing listed', placeWords, whenWords].filter(Boolean).join(' ')}. ${centre ? 'Try a wider radius or a longer stretch.' : 'Try a longer stretch.'}`}
          </EmptyState>
        )}

        {!loading && !error && days.map(([iso, dayShows]) => (
          <section key={iso}>
            <Label tone={iso === today ? 'accent' : 'ink'} className="mb-2">{dayLabel(iso, today, tomorrow)}</Label>
            <UpcomingShowRows
              shows={dayShows}
              savedIds={savedIds}
              onToggleSave={toggleSave}
              onShare={share}
              hrefOf={show => artistHref(show.artist)}
            />
          </section>
        ))}

        {!loading && !error && scope === 'all' && next != null && (
          <button
            type="button"
            onClick={loadMore}
            disabled={moreLoading}
            className={`${btnSecondary} w-full py-2.5 text-[11px]`}
          >
            {moreLoading ? 'Loading…' : 'Show more'}
          </button>
        )}
      </main>

      {askingSignUp && (
        <SignUpSheet
          title="Follow artists and venues"
          blurb="Make an account to follow artists and venues. Their shows near you collect here."
          onClose={() => setAskingSignUp(false)}
          onSignedIn={() => {
            setAskingSignUp(false)
            setScope('following')
          }}
        />
      )}
      {signUpSheet}
      {shareSheet}
      {followed.signUpSheet}

      <BottomNav />
    </div>
  )
}
