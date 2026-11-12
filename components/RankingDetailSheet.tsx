'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatShowDate } from '@/lib/dates'
import { isRated } from '@/lib/rating'
import { useArtistImages } from '@/lib/useArtistImages'
import type { RankMetric } from '@/lib/rankings'
import { ShimmerRows } from '@/components/ShowRows'
import { ArtistPhoto, DateTag, EmptyState, PersonPhoto, PullQuote, Stars, placeOf } from '@/components/ui'

// What's behind one card on Rankings: tapping its "N shows" chip lists those
// shows, each ranked on its own the way Rankings used to list every show, and
// "N ratings" lists every rating behind it. Either way a row opens that show's
// page of reviews (/artist/<id>). A sheet over the list, so closing it lands
// back where you were.

interface Props {
  list:    'artists' | 'venues'
  mode:    'shows' | 'ratings'
  // The artist or venue the card is for.
  name:    string
  showIds: string[]
  metric:  RankMetric
  onClose: () => void
}

interface Log {
  id:                 string
  user_id:            string
  artist_id:          string
  artist_name:        string | null
  venue:              string | null
  stage:              string | null
  day:                string | null
  show_date:          string | null
  performance_rating: number | null
  venue_rating:       number | null
  review:             string | null
  created_at:         string
}

interface Person { username: string; avatar_url: string | null }

interface RatedShow {
  id:       string
  artist:   string
  place:    string
  date:     string | null
  count:    number
  score:    number
}

const METRIC_NAMES: Record<RankMetric, string> = {
  performance: 'Performance',
  venue:       'Venue',
  both:        'Performance and Venue',
}

// PostgREST puts `in` filters in the URL, so ids go up in chunks.
const ID_CHUNK = 100

function scoreOf(log: Log, metric: RankMetric): number {
  if (metric === 'performance') return log.performance_rating!
  if (metric === 'venue') return log.venue_rating!
  return (log.performance_rating! + log.venue_rating!) / 2
}

export function RankingDetailSheet({ list, mode, name, showIds, metric, onClose }: Props) {
  const [shown, setShown]   = useState(false)
  const [logs, setLogs]     = useState<Log[] | null>(null)
  const [people, setPeople] = useState<Record<string, Person>>({})
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  // Read with the viewer's session, so anyone they've blocked stays out of
  // these lists the way they do on Feed.
  useEffect(() => {
    let cancelled = false
    async function load() {
      const supabase = createClient()
      const found: Log[] = []
      for (let i = 0; i < showIds.length; i += ID_CHUNK) {
        const { data, error } = await supabase
          .from('logged_shows')
          .select('id, user_id, artist_id, artist_name, venue, stage, day, show_date, performance_rating, venue_rating, review, created_at')
          .in('artist_id', showIds.slice(i, i + ID_CHUNK))
        if (error) { console.error('ranking detail failed:', error.message); if (!cancelled) setFailed(true); return }
        found.push(...((data ?? []) as Log[]))
      }
      const rated = found.filter(isRated)

      const userIds = Array.from(new Set(rated.map(l => l.user_id)))
      const map: Record<string, Person> = {}
      if (mode === 'ratings' && userIds.length > 0) {
        const { data } = await supabase.from('profiles').select('id, username, avatar_url').in('id', userIds)
        data?.forEach(p => { map[p.id] = { username: p.username, avatar_url: p.avatar_url } })
      }
      if (cancelled) return
      setPeople(map)
      setLogs(rated)
    }
    load()
    return () => { cancelled = true }
  }, [showIds, mode])

  // One row per show, ranked on the stars Rankings is set to.
  const shows: RatedShow[] = []
  if (logs && mode === 'shows') {
    const byShow = new Map<string, { first: Log; total: number; count: number }>()
    for (const log of logs) {
      const entry = byShow.get(log.artist_id) ?? { first: log, total: 0, count: 0 }
      entry.total += scoreOf(log, metric)
      entry.count += 1
      byShow.set(log.artist_id, entry)
    }
    byShow.forEach(({ first, total, count }, id) => shows.push({
      id,
      artist: first.artist_name ?? 'Unknown',
      place:  placeOf(first) ?? '',
      date:   first.show_date,
      count,
      score:  total / count,
    }))
    shows.sort((a, b) => b.score - a.score || b.count - a.count || (b.date ?? '').localeCompare(a.date ?? ''))
  }

  const ratings = logs && mode === 'ratings'
    ? [...logs].sort((a, b) => scoreOf(b, metric) - scoreOf(a, metric) || b.created_at.localeCompare(a.created_at))
    : []

  const artistImage = useArtistImages((logs ?? []).map(l => l.artist_name ?? ''))
  const count = mode === 'shows' ? shows.length : ratings.length
  const blurb = logs == null
    ? `Ranked by ${METRIC_NAMES[metric]}`
    : `${count} ${mode === 'shows' ? (count === 1 ? 'show' : 'shows') : (count === 1 ? 'rating' : 'ratings')}, ranked by ${METRIC_NAMES[metric]}`

  // On an artist's card every show is theirs, so a show is named by where it
  // was; on a venue's card, by who played.
  const showTitle = (artist: string, place: string) => (list === 'artists' ? place || artist : artist)

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/55 transition-opacity duration-[280ms] ${shown ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`${name}: ${mode}`}
        className={`relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-card border-1.5 border-b-0 border-ink bg-paper text-ink px-5 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] transition-transform duration-[280ms] ease-out ${
          shown ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-bold tracking-tight leading-tight break-words">
              {name}<span className="text-accent">.</span>
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-ink-muted">{blurb}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 p-1 text-ink-muted">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        <div className="mt-4">
          {failed ? (
            <EmptyState>Couldn&apos;t load these right now. Try again in a moment.</EmptyState>
          ) : logs == null ? (
            <ShimmerRows count={3} />
          ) : count === 0 ? (
            <EmptyState>Nothing to show yet.</EmptyState>
          ) : mode === 'shows' ? (
            <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
              {shows.map((show, i) => (
                <Link
                  key={show.id}
                  href={`/artist/${encodeURIComponent(show.id)}`}
                  className={`flex items-center gap-3 px-3 py-2.5 hover:bg-accent/5 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}
                >
                  <span className="font-display text-xl font-bold leading-none w-6 flex-shrink-0 text-center text-accent">{i + 1}</span>
                  <ArtistPhoto name={show.artist} src={artistImage(show.artist)} className="w-12 h-12" iconSize={16}>
                    <DateTag isoDate={show.date} />
                  </ArtistPhoto>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-[15px] font-bold leading-tight truncate">{showTitle(show.artist, show.place)}</h3>
                    {list === 'venues' && show.date && (
                      <p className="mt-0.5 text-[11px] text-ink-faint">{formatShowDate(show.date)}</p>
                    )}
                    <span className="mt-1 flex items-center gap-1.5">
                      <Stars score={show.score} size={11} />
                      <span className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">
                        {show.count} {show.count === 1 ? 'rating' : 'ratings'}
                      </span>
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {ratings.map(log => {
                const person = people[log.user_id]
                const username = person?.username ?? 'anonymous'
                const show = showTitle(log.artist_name ?? 'Unknown', placeOf(log) ?? '')
                return (
                  <Link key={log.id} href={`/artist/${encodeURIComponent(log.artist_id)}`} className="block">
                    <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso px-3.5 py-3 space-y-1.5 hover:bg-accent/5">
                      <div className="flex items-center justify-between gap-2.5">
                        <span className="flex items-center gap-2 min-w-0">
                          <PersonPhoto name={username} src={person?.avatar_url} className="w-7 h-7 text-xs border border-ink/15" />
                          <span className="text-[12px] font-semibold truncate">@{username}</span>
                        </span>
                        <Stars score={scoreOf(log, metric)} size={12} />
                      </div>
                      <p className="text-[11px] text-ink-muted truncate">
                        {[show, log.show_date ? formatShowDate(log.show_date) : null].filter(Boolean).join(' · ')}
                      </p>
                      {log.review && <PullQuote compact>{log.review}</PullQuote>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
