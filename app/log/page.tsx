'use client'

import { useState, Suspense, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFestival, getArtistsByDay, hasDayOccurred, formatSetTime, LOCAL_STORAGE_KEY, type Festival, type FestivalArtist } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/FestivalThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import { StarDisplay } from '@/components/StarDisplay'
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
  const T = useTheme()
  const { user, loading: authLoading } = useAuth()

  const isRerate = searchParams.get('rerate') === '1'

  const [festival, setFestival]           = useState<Festival | null>(null)
  const [activeDay, setActiveDay]         = useState<Day>('friday')
  const [search, setSearch]               = useState('')
  const [loggedMap, setLoggedMap]         = useState<Map<string, ExistingLog>>(new Map())
  const [loadingLogged, setLoadingLogged] = useState(true)

  useEffect(() => {
    const festivalId = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!festivalId) { router.replace('/select-festival'); return }
    const f = getFestival(festivalId)
    if (f) {
      setFestival(f)
      setActiveDay(f.days[0])
    }
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
    <div style={{
      minHeight: '100vh', background: T.bg,
      fontFamily: T.sans, color: '#4A3528',
      maxWidth: 430, margin: '0 auto',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '18px 24px 14px',
        position: 'sticky', top: 0,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(74,53,40,0.12)', zIndex: 10,
      }}>
        <button onClick={() => router.push('/feed')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{
          fontFamily: T.serif, fontSize: 15, fontWeight: 700,
          color: '#4A3528', letterSpacing: '-0.3px',
        }}>
          {isRerate ? 'Re-rate a Show' : 'Log a Show'}
        </span>
        <div style={{ width: 18 }} />
      </div>

      <div style={{ padding: '16px 24px 100px' }}>
        {/* Search */}
        <div style={{
          background: T.card, borderRadius: 5,
          border: T.cardBorder,
          padding: '12px 16px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search artists..."
            style={{
              background: 'none', border: 'none', outline: 'none',
              color: '#4A3528', fontSize: 16, fontFamily: T.sans, width: '100%',
            }}
          />
        </div>

        {/* Day tabs */}
        {!search && festival && (
          <div style={{
            display: 'flex',
            border: '2px solid #4A3528',
            borderRadius: 5, overflow: 'hidden',
            marginBottom: 16,
          }}>
            {festival.days.map((day, idx) => (
              <button
                key={day}
                onClick={() => setActiveDay(day)}
                style={{
                  flex: 1,
                  background: activeDay === day ? '#4A3528' : T.card,
                  border: 'none',
                  borderLeft: idx > 0 ? '2px solid #4A3528' : 'none',
                  cursor: 'pointer',
                  padding: '8px 4px',
                }}
              >
                <div style={{
                  fontSize: 9, fontWeight: 700,
                  color: activeDay === day ? '#FAF3E2' : T.muted,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  fontFamily: T.sans, lineHeight: 1.4,
                }}>
                  {[day.slice(0, 3).toUpperCase(), festival.dayDates[day]].map((w, i) => (
                    <span key={i} style={{ display: 'block' }}>{w}</span>
                  ))}
                </div>
              </button>
            ))}
          </div>
        )}

        {loadingLogged ? (
          <div style={{
            textAlign: 'center', padding: 40,
            fontSize: 11, color: T.faint, letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600,
          }}>Loading...</div>
        ) : allArtists.length === 0 ? (
          <div style={{
            background: T.card, borderRadius: 5,
            border: T.cardBorder, boxShadow: T.cardShadow,
            padding: 32, textAlign: 'center',
          }}>
            <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
              {search
                ? 'No artists match your search'
                : isRerate
                ? 'No rated shows on this day yet'
                : "You've reviewed everyone on this day!"}
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {allArtists.map((a, i) => {
              const existing = loggedMap.get(a.id)
              // Re-rating an already-logged show is always allowed - it can
              // only exist if the show already happened. Only gate the
              // first-time log.
              const locked = !isRerate && !!festival && !hasDayOccurred(festival, a.day)
              return (
                <button
                  key={a.id}
                  onClick={() => { if (!locked) openLogShow(a) }}
                  disabled={locked}
                  style={{
                    background: i % 2 === 0 ? T.card : T.cardAlt,
                    border: T.cardBorder,
                    borderRadius: i === 0 ? '5px 5px 3px 3px'
                      : i === allArtists.length - 1 ? '3px 3px 5px 5px' : 3,
                    padding: '14px 16px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: locked ? 'default' : 'pointer', width: '100%', textAlign: 'left',
                    opacity: locked ? 0.5 : 1,
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontFamily: T.serif, fontSize: 14, fontWeight: 700,
                      color: '#4A3528', letterSpacing: '-0.3px', marginBottom: 2,
                    }}>{a.name}</div>
                    <div style={{
                      fontSize: 9, color: T.muted, letterSpacing: '0.06em',
                      textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600,
                    }}>{a.stage}{formatSetTime(a) ? ` · ${formatSetTime(a)}` : ''}</div>
                  </div>
                  {existing && <StarDisplay score={existing.score} size={17} accent={T.accent} />}
                  {locked ? (
                    <span style={{
                      fontSize: 9, color: T.faint, fontFamily: T.sans, fontWeight: 600,
                      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
                    }}>🔒 {festival?.dayDates[a.day] ?? ''}</span>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
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
