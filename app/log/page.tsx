'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Lock, Search } from 'lucide-react'
import { getFestival, getArtistsByDay, hasDayOccurred, formatSetTime, LOCAL_STORAGE_KEY, type Festival, type FestivalArtist } from '@/lib/festivals'
import { getActiveShow } from '@/lib/activeShow'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { ArtistPhoto, BackHeader, EmptyState, LoadingLabel, Place, Segmented, Stars, inputBox } from '@/components/ui'
import { computeShowScore } from '@/lib/rating'
import { timeQuery, timeMark } from '@/lib/queryTiming'

type Day = string

interface ExistingLog {
  score: number
}

function LogInner() {
  const router       = useRouter()
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const isRerate = searchParams.get('rerate') === '1'

  const [festival, setFestival]           = useState<Festival | null>(null)
  const [activeDay, setActiveDay]         = useState<Day>('friday')
  const [search, setSearch]               = useState('')
  const [loggedMap, setLoggedMap]         = useState<Map<string, ExistingLog>>(new Map())
  const [loadingLogged, setLoadingLogged] = useState(true)

  useEffect(() => {
    const activeId = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!activeId) { router.replace('/select-festival'); return }

    const f = getFestival(activeId)
    if (f) { setFestival(f); setActiveDay(f.days[0]); return }

    // Not a real festival id - the active selection is a single
    // fully-specified Ticketmaster show, which has no lineup to pick an
    // artist from. Skip this screen entirely and go straight to logging it.
    const activeShow = getActiveShow()
    if (activeShow && activeShow.id === activeId) {
      const params = new URLSearchParams({
        artistId:   activeShow.id,
        artistName: activeShow.artist,
        venue:      activeShow.venue,
      })
      if (activeShow.isoDate) params.set('showDate', activeShow.isoDate)
      router.replace(`/log-show?${params.toString()}`)
      return
    }

    // Stale or unrecognized id with no matching show details - nothing to log.
    router.replace('/select-festival')
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/'); return }

    async function fetchLogged(userId: string) {
      const loadStart = Date.now()
      const { data } = await timeQuery('log:logged_shows', supabase
        .from('logged_shows')
        .select('artist_id, performance_rating, venue_rating, crowd_rating')
        .eq('user_id', userId))

      if (data) {
        const map = new Map<string, ExistingLog>()
        data.forEach(r => {
          if (r.performance_rating && r.venue_rating && r.crowd_rating) {
            map.set(r.artist_id, {
              score: computeShowScore(r.performance_rating, r.venue_rating, r.crowd_rating),
            })
          }
        })
        setLoggedMap(map)
      }
      setLoadingLogged(false)
      timeMark(`log:load total (${data?.length ?? 0} logs)`, loadStart)
    }
    fetchLogged(user.id)
  }, [authLoading, user, router])

  const loggedIds       = new Set(loggedMap.keys())
  const festivalArtists = festival?.artists ?? []

  const allArtists = (festival == null ? [] : search
    ? festivalArtists.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : getArtistsByDay(festival, activeDay)
  ).filter(a => isRerate ? loggedIds.has(a.id) : !loggedIds.has(a.id))

  function openLogShow(a: FestivalArtist) {
    const params = new URLSearchParams({
      artistId:   a.id,
      artistName: a.name,
      stage:      a.stage,
      day:        a.day,
    })
    router.push(`/log-show?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BackHeader title={isRerate ? 'Re-rate a show' : 'Log a show'} onBack={() => router.push('/feed')} />

      <div className="px-5 pt-4 pb-24 space-y-4">
        <label className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5`}>
          <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search artists..."
            className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </label>

        {!search && festival && (
          <Segmented
            options={festival.days.map(day => ({ value: day, label: `${day.slice(0, 3)} ${festival.dayDates[day] ?? ''}`.trim() }))}
            value={activeDay}
            onChange={setActiveDay}
          />
        )}

        {loadingLogged ? (
          <LoadingLabel />
        ) : allArtists.length === 0 ? (
          <EmptyState>
            {search
              ? 'No artists match your search'
              : isRerate
              ? 'No rated shows on this day yet'
              : "You've reviewed everyone on this day!"}
          </EmptyState>
        ) : (
          <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
            {allArtists.map((a, i) => {
              const existing = loggedMap.get(a.id)
              // Re-rating an already-logged show is always allowed - it can
              // only exist if the show already happened. Only gate the
              // first-time log.
              const locked = !isRerate && !!festival && !hasDayOccurred(festival, a.day)
              const setTime = formatSetTime(a)
              return (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => { if (!locked) openLogShow(a) }}
                  disabled={locked}
                  className={`w-full text-left flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${
                    i > 0 ? 'border-t border-ink/10' : ''
                  } ${locked ? 'opacity-50 cursor-default' : 'hover:bg-accent/5'}`}
                >
                  <ArtistPhoto name={a.name} className="w-12 h-12" iconSize={16} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[15px] font-bold leading-tight truncate">{a.name}</h3>
                    <Place className="mt-0.5">{a.stage}{setTime ? ` · ${setTime}` : ''}</Place>
                  </div>
                  {existing && <Stars score={existing.score} size={12} />}
                  {locked ? (
                    <span className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap text-[10px] font-semibold uppercase tracking-label text-ink-faint">
                      <Lock className="w-3 h-3" /> {festival?.dayDates[a.day] ?? ''}
                    </span>
                  ) : (
                    <ChevronRight className="w-4 h-4 flex-shrink-0 text-ink-faint" />
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default function LogPage() {
  return (
    <Suspense fallback={null}>
      <LogInner />
    </Suspense>
  )
}
