'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Lock, Search } from 'lucide-react'
import { CRSSD, hasHappened } from '@/lib/crssd'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { setActiveShow } from '@/lib/activeShow'
import { computeShowScore } from '@/lib/rating'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { AppHeader } from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import { ArtistPhoto, DjDecks, EmptyState, Label, Place, Segmented, Stars, inputBox } from '@/components/ui'

interface Show {
  id: string
  artist: string
  venue: string
  city: string
  state: string
  isoDate: string | null
  imageUrl: string | null
}

// The CRSSD lineup as its own screen: 53 sets across two days, which is more
// than the general search is built to hand back (it stops at 20 results) and
// more than anybody wants to find by typing. Reached from /log-menu.
//
// Every row here is an ordinary `shows` row, so picking one goes through
// exactly the same handoff as picking a search result - active show into
// localStorage, then /log, which forwards to /log-show. Nothing about the
// rating, the feed or the rankings knows this screen exists.
export default function CrssdPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [shows, setShows]     = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  const [day, setDay]       = useState<string>(CRSSD.days[0].isoDate)
  const [search, setSearch] = useState('')

  // artist_id -> score, so a set you've already rated shows its stars
  // instead of pretending to be unlogged.
  const [scores, setScores] = useState<Map<string, number>>(new Map())

  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [authLoading, user, router])

  // Open on the day that is actually happening, so somebody arriving on the
  // Sunday doesn't land on a tab of locked Saturday sets.
  useEffect(() => {
    const live = CRSSD.days.filter(d => hasHappened(d.isoDate)).pop()
    if (live) setDay(live.isoDate)
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch('/api/shows/festival?lineup=crssd', { signal: controller.signal })
        if (!res.ok) throw new Error(`lineup failed: ${res.status}`)
        const data = await res.json()
        setShows(data.shows ?? [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('crssd lineup failed:', err)
          setError(true)
          setShows([])
        }
      } finally {
        setLoading(false)
      }
    }

    load()
    return () => controller.abort()
  }, [retryToken])

  useEffect(() => {
    if (!user) return
    let cancelled = false

    async function loadScores(userId: string) {
      const { data } = await supabase
        .from('logged_shows')
        .select('artist_id, performance_rating, venue_rating, crowd_rating')
        .eq('user_id', userId)
      if (cancelled || !data) return

      const map = new Map<string, number>()
      data.forEach(r => {
        if (r.performance_rating && r.venue_rating && r.crowd_rating) {
          map.set(r.artist_id, computeShowScore(r.performance_rating, r.venue_rating, r.crowd_rating))
        }
      })
      setScores(map)
    }

    loadScores(user.id)
    return () => { cancelled = true }
  }, [user])

  // Searching looks across the whole weekend - you know who you saw, not
  // which day the schedule put them on.
  const trimmed = search.trim().toLowerCase()
  const visible = trimmed
    ? shows.filter(s => s.artist.toLowerCase().includes(trimmed))
    : shows.filter(s => s.isoDate === day)

  function select(show: Show) {
    localStorage.setItem(LOCAL_STORAGE_KEY, show.id)
    setActiveShow({
      id:       show.id,
      artist:   show.artist,
      venue:    show.venue,
      city:     show.city,
      state:    show.state,
      isoDate:  show.isoDate,
      imageUrl: show.imageUrl,
    })

    // Same fire-and-forget write /select-festival does, so an SMS reply can
    // be matched against whatever show this person last picked.
    if (user) {
      supabase.from('profiles').update({ active_festival_id: show.id }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('active_festival_id update failed:', error.message)
      })
    }

    router.push('/log')
  }

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <AppHeader>
        <div className="min-w-0">
          <Label>Waterfront Park, San Diego</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
            {CRSSD.name}<span className="text-accent">.</span>
          </h1>
        </div>
      </AppHeader>

      <div className="px-5 pt-3 space-y-2.5">
        <label className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5`}>
          <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search the lineup"
            className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </label>

        {!trimmed && (
          <Segmented
            options={CRSSD.days.map(d => ({ value: d.isoDate, label: d.label }))}
            value={day}
            onChange={setDay}
          />
        )}
      </div>

      <Label className="px-5 pt-4 pb-2">
        {trimmed
          ? <>Results for &ldquo;{search.trim()}&rdquo;</>
          : `${visible.length} ${visible.length === 1 ? 'set' : 'sets'}`}
      </Label>

      <main className="px-5">
        {loading && (
          <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-ink/10' : ''}`}>
                <div className="shimmer w-12 h-12 rounded-card flex-shrink-0" />
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="shimmer h-3.5 w-3/5 rounded" />
                  <div className="shimmer h-2.5 w-2/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && error && (
          <EmptyState>
            Couldn&apos;t load the lineup right now.
            <button
              type="button"
              onClick={() => setRetryToken(t => t + 1)}
              className="block mx-auto mt-2.5 text-xs font-bold uppercase tracking-label text-accent"
            >
              Try again
            </button>
          </EmptyState>
        )}

        {!loading && !error && visible.length === 0 && (
          <EmptyState>
            {trimmed
              ? <>Nobody on the CRSSD lineup matches &ldquo;{search.trim()}&rdquo;.</>
              : 'No sets on this day.'}
          </EmptyState>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
            {visible.map((s, i) => {
              const score  = scores.get(s.id)
              // Rating a set that hasn't started is the one thing this
              // screen must not allow. Already-rated sets stay open so a
              // rating can be corrected.
              const locked = score == null && !hasHappened(s.isoDate)
              const dayLabel = CRSSD.days.find(d => d.isoDate === s.isoDate)?.label ?? ''

              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => { if (!locked) select(s) }}
                  disabled={locked}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${
                    i > 0 ? 'border-t border-ink/10' : ''
                  } ${locked ? 'opacity-50 cursor-default' : 'hover:bg-accent/5'}`}
                >
                  <ArtistPhoto name={s.artist} src={s.imageUrl} className="w-12 h-12" iconSize={36} icon={DjDecks} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[15px] font-bold leading-tight truncate">{s.artist}</h3>
                    <Place className="mt-0.5">{dayLabel}</Place>
                  </div>
                  {score != null && <Stars score={score} size={12} />}
                  {locked ? (
                    <span className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-label text-ink-faint">
                      <Lock className="w-3 h-3" /> {dayLabel}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0 text-ink-faint" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  )
}
