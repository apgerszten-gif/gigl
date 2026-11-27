'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useArtistImages } from '@/lib/useArtistImages'
import { flushPendingLogs, type GuestDraft } from '@/lib/pendingLogs'
import { computeShowScore } from '@/lib/rating'
import { markStashDone, queueLog, readStash, stashLog } from '@/lib/wrapped/stash'
import type { WrappedShow } from '@/lib/wrapped/types'
import { readPhotoMeta } from '@/lib/photos/exif'
import type { PhotoMatchResult, PhotoShow } from '@/lib/photos/types'
import { WrappedLogSheet } from '@/components/wrapped/WrappedLogSheet'
import { ArtistPhoto, BackHeader, DateTag, EmptyState, ErrorNote, Label, Place, Stars, btnPrimary, btnQuiet, btnSecondary } from '@/components/ui'
import { groupPhotos, type Cluster, type Grouped, type PhotoFile } from './cluster'

// Find the shows you've been to from where and when your photos were taken.
//
// Pick as many photos as you like (dozens at once is the point). Each one's
// date and location are read on the phone from its EXIF, grouped into nights
// (components/photos/cluster.ts), and only those groups go to
// /api/photos/match, which finds the shows on at that place on that date. No
// picture leaves the phone. Each match is logged right here with the Wrapped
// log sheet, so it works without an account too (what's logged waits on the
// phone until sign-up, lib/wrapped/stash.ts).

const MAX_CLUSTERS = 80
const THUMBS = 3
const READ_AT_ONCE = 6

type Stage = 'pick' | 'reading' | 'results'

interface Match {
  show:     PhotoShow
  // Every cluster that landed on this show, nearest first.
  clusters: Cluster[]
  photos:   number
}

export function PhotoFinder() {
  const router = useRouter()
  const { user } = useAuth()
  const signedIn = !!user
  const input = useRef<HTMLInputElement | null>(null)

  const [stage, setStage] = useState<Stage>('pick')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)
  const [grouped, setGrouped] = useState<Grouped | null>(null)
  const [matches, setMatches] = useState<Match[]>([])
  const [logs, setLogs] = useState<Record<string, GuestDraft>>({})
  const [logging, setLogging] = useState<WrappedShow | null>(null)

  async function start(files: FileList | null) {
    if (!files || files.length === 0) return
    const list = Array.from(files)
    setError(null)
    setStage('reading')
    setProgress({ done: 0, total: list.length })

    try {
      // A few at a time: each read is a slice of the file, not the whole picture.
      const photos: PhotoFile[] = new Array(list.length)
      let done = 0
      for (let i = 0; i < list.length; i += READ_AT_ONCE) {
        await Promise.all(list.slice(i, i + READ_AT_ONCE).map(async (file, j) => {
          photos[i + j] = { file, meta: await readPhotoMeta(file) }
          done += 1
        }))
        setProgress({ done, total: list.length })
      }

      const groups = groupPhotos(photos)
      setGrouped(groups)
      if (groups.clusters.length === 0) { setMatches([]); setStage('results'); return }

      const sent = groups.clusters.slice(0, MAX_CLUSTERS)
      const res = await fetch('/api/photos/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusters: sent.map(c => ({ date: c.date, lat: Math.round(c.lat * 100) / 100, lng: Math.round(c.lng * 100) / 100, count: c.photos.length })) }),
      })
      const body = await res.json().catch(() => null) as (PhotoMatchResult & { error?: string }) | null
      if (!res.ok || !body?.shows) throw new Error(body?.error ?? "Couldn't look those up. Try again.")

      // One show can be matched by more than one cluster (a festival's photos
      // from two stages): it appears once, with all of its photos.
      const byShow = new Map<string, Match>()
      for (const show of body.shows) {
        const cluster = sent[show.cluster]
        if (!cluster) continue
        const have = byShow.get(show.id)
        if (have) {
          if (!have.clusters.includes(cluster)) { have.clusters.push(cluster); have.photos += cluster.photos.length }
        } else {
          byShow.set(show.id, { show, clusters: [cluster], photos: cluster.photos.length })
        }
      }
      setMatches(Array.from(byShow.values()).sort((a, b) => (b.show.isoDate ?? '').localeCompare(a.show.isoDate ?? '') || a.show.distanceMiles - b.show.distanceMiles))
      setStage('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read those photos. Try again.")
      setStage('pick')
    }
  }

  // ── Results: what's already logged ───────────────────────────────────────

  useEffect(() => {
    if (stage !== 'results') return
    if (!user) {
      const stash = readStash()
      setLogs(Object.fromEntries(stash.logs.map(l => [l.artist_id, l])))
      return
    }
    const ids = matches.map(m => m.show.id)
    if (ids.length === 0) return
    createClient()
      .from('logged_shows')
      .select('artist_id, artist_name, venue, show_date, performance_rating, venue_rating, review')
      .eq('user_id', user.id)
      .in('artist_id', ids)
      .then(({ data, error: readError }) => {
        if (readError) { console.error('logged shows failed:', readError.message); return }
        setLogs(prev => {
          const next = { ...prev }
          for (const row of data ?? []) {
            if (!row.performance_rating || !row.venue_rating) continue
            next[row.artist_id] = {
              artist_id: row.artist_id, artist_name: row.artist_name, stage: null, day: null,
              venue: row.venue, show_date: row.show_date,
              performance_rating: row.performance_rating, venue_rating: row.venue_rating,
              review: row.review, tags: null,
            }
          }
          return next
        })
      })
  }, [stage, matches, user])

  // A few of the person's own photos beside each show they match.
  const thumbs = useMemo(() => {
    const out = new Map<string, string[]>()
    for (const m of matches) {
      const files = m.clusters.flatMap(c => c.photos).slice(0, THUMBS)
      out.set(m.show.id, files.map(p => URL.createObjectURL(p.file)))
    }
    return out
  }, [matches])
  useEffect(() => () => { thumbs.forEach(urls => urls.forEach(u => URL.revokeObjectURL(u))) }, [thumbs])

  const photo = useArtistImages(useMemo(() => matches.map(m => m.show.artist), [matches]))

  function saveLog(draft: GuestDraft) {
    setLogs(prev => ({ ...prev, [draft.artist_id]: draft }))
    setLogging(null)
    if (!user) { stashLog(draft); return }
    queueLog(user.id, draft)
    void flushPendingLogs()
  }

  function done() {
    if (user) { router.push('/profile'); return }
    markStashDone()
    router.push('/auth')
  }

  function toWrapped(show: PhotoShow): WrappedShow {
    return {
      id: show.id, artist: show.artist, support: show.support, venue: show.venue, city: show.city, state: show.state,
      isoDate: show.isoDate, imageUrl: show.imageUrl, wrappedArtist: show.artist,
    }
  }

  // ── Screens ──────────────────────────────────────────────────────────────

  if (stage === 'reading') {
    return (
      <div className="min-h-screen bg-paper text-ink">
        <BackHeader title="Find shows in your photos" />
        <div className="px-5 py-16 text-center" role="status" aria-live="polite">
          <Loader2 className="w-8 h-8 mx-auto text-accent animate-spin" strokeWidth={2} />
          <p className="mt-4 font-display text-[17px] font-bold">Checking where you were</p>
          <p className="mt-1 text-[13px] text-ink-muted">
            {progress.done < progress.total
              ? `Reading ${progress.done} of ${progress.total} photos`
              : 'Finding the shows'}
          </p>
        </div>
      </div>
    )
  }

  if (stage === 'results' && grouped) {
    const loggedCount = matches.filter(m => logs[m.show.id]).length
    const matchedClusters = new Set(matches.flatMap(m => m.clusters)).size
    const unmatched = Math.min(grouped.clusters.length, MAX_CLUSTERS) - matchedClusters
    const total = grouped.located + grouped.dateOnly + grouped.bare

    return (
      <div className="min-h-screen bg-paper text-ink pb-32">
        <BackHeader title="Find shows in your photos" onBack={() => setStage('pick')} />
        <main className="px-5 pt-4 space-y-4">
          <div>
            <h2 className="font-display text-[24px] font-bold tracking-tight leading-tight">
              {matches.length > 0 ? 'Were you there' : 'No shows found'}<span className="text-accent">{matches.length > 0 ? '?' : '.'}</span>
            </h2>
            <p className="mt-1 text-[13px] leading-snug text-ink-muted">
              {matches.length > 0
                ? `${matches.length} show${matches.length === 1 ? '' : 's'} on where and when your photos were taken.`
                : `We looked at ${total} photo${total === 1 ? '' : 's'}.`}
            </p>
          </div>

          {matches.length > 0 ? (
            <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
              {matches.map((m, i) => {
                const { show } = m
                const log = logs[show.id]
                const pics = thumbs.get(show.id) ?? []
                return (
                  <div key={show.id} className={`flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}>
                    <ArtistPhoto name={show.artist} src={show.imageUrl ?? photo(show.artist)} className="w-14 h-14" iconSize={18}>
                      <DateTag isoDate={show.isoDate} />
                    </ArtistPhoto>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[15px] font-bold leading-tight truncate">{show.artist}</h3>
                      <Place className="mt-0.5">{[show.venue, show.city, show.state].filter(Boolean).join(', ')}</Place>
                      {log ? (
                        <span className="mt-1 flex items-center gap-1.5">
                          <Stars score={computeShowScore(log.performance_rating, log.venue_rating)} size={11} />
                          <span className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">Yours</span>
                        </span>
                      ) : (
                        <span className="mt-1 flex items-center gap-1.5">
                          {pics.map(src => <img key={src} src={src} alt="" className="w-7 h-7 rounded object-cover border border-ink/20" />)}
                          <span className="text-[11px] text-ink-faint truncate">{m.photos} photo{m.photos === 1 ? '' : 's'}</span>
                        </span>
                      )}
                    </div>
                    {log ? (
                      <button type="button" onClick={() => setLogging(toWrapped(show))} className={`${btnQuiet} flex-shrink-0 gap-1 px-2.5 py-1 text-[10px] uppercase tracking-label`}>
                        <Check className="w-3 h-3" strokeWidth={2.5} />Logged
                      </button>
                    ) : (
                      <button type="button" onClick={() => setLogging(toWrapped(show))} className={`${btnSecondary} flex-shrink-0 px-2.5 py-1 text-[10px]`}>
                        I was there
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : grouped.located === 0 ? (
            <EmptyState>
              None of those photos had a location. Phones usually remove it when a website opens a photo. {LOCATION_HINT}
            </EmptyState>
          ) : (
            <EmptyState>
              Your photos were taken in {grouped.clusters.length} place{grouped.clusters.length === 1 ? '' : 's'}, but Gigl has no show at any of them on those dates.
            </EmptyState>
          )}

          {matches.length > 0 && unmatched > 0 && (
            <p className="text-[12px] leading-snug text-ink-faint">
              {unmatched} other night{unmatched === 1 ? '' : 's'} of photos didn&apos;t match a show in Gigl.
            </p>
          )}
          {grouped.dateOnly + grouped.bare > 0 && grouped.located > 0 && (
            <p className="text-[12px] leading-snug text-ink-faint">
              {grouped.dateOnly + grouped.bare} photo{grouped.dateOnly + grouped.bare === 1 ? '' : 's'} had no location, so they weren&apos;t used. {LOCATION_HINT}
            </p>
          )}

          <Link href="/select-festival" className="block text-center text-[12px] font-semibold text-ink-muted underline underline-offset-[3px]">
            Not here? Search for the show
          </Link>
        </main>

        <div className="fixed inset-x-0 bottom-0 z-20 px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))] bg-gradient-to-t from-paper via-paper to-transparent">
          <div className="max-w-md mx-auto">
            <button type="button" onClick={done} className={`${btnPrimary} w-full py-4 text-xs`}>
              {loggedCount === 0 ? 'Skip' : 'Done'}
            </button>
            <button type="button" onClick={() => setStage('pick')} className="w-full mt-2 py-1 text-[12px] font-semibold text-ink-muted">Try other photos</button>
            {!signedIn && loggedCount > 0 && (
              <p className="text-center text-[11px] text-ink-faint">Next, your phone number, to keep your logs.</p>
            )}
          </div>
        </div>

        {logging && (
          <WrappedLogSheet
            show={logging}
            photo={logging.imageUrl ?? photo(logging.artist)}
            signedIn={signedIn}
            existing={logs[logging.id] ?? null}
            onSave={saveLog}
            onClose={() => setLogging(null)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink pb-32">
      <BackHeader title="Find shows in your photos" href="/select-festival" />
      <main className="px-5 pt-4 space-y-4">
        <div>
          <h2 className="font-display text-[24px] font-bold tracking-tight leading-tight">Add your photos<span className="text-accent">.</span></h2>
          <p className="mt-1 text-[13px] leading-snug text-ink-muted">
            Your photos never leave your phone. We only use when and where they were taken.
          </p>
        </div>

        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { void start(e.target.files); e.target.value = '' }}
        />

        <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso p-3.5">
          <Label tone="accent">Quickest way</Label>
          <ol className="mt-2.5 space-y-2">
            {[
              <>Tap <b>Choose photos</b></>,
              <>Search <span className="rounded-full border-1.5 border-ink bg-paper px-2 py-px text-[12px] font-bold">concert</span> in the picker</>,
              <>Select all, then tap <b>Add</b></>,
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-2.5 text-[13px]">
                <span className="w-5 h-5 flex-shrink-0 rounded-full bg-accent text-cream text-[11px] font-bold flex items-center justify-center">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="rounded-card border-1.5 border-dashed border-ink/25 px-3 py-2.5 text-[12px] leading-snug text-ink-muted">
          <b className="text-ink">iPhone:</b> tap Options, then turn Location on.<br />
          <b className="text-ink">Android:</b> choose Browse or Files.
        </p>

        {error && <ErrorNote>{error}</ErrorNote>}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))] bg-gradient-to-t from-paper via-paper to-transparent">
        <div className="max-w-md mx-auto">
          <button type="button" onClick={() => input.current?.click()} className={`${btnPrimary} w-full py-4 text-xs`}>
            Choose photos
          </button>
        </div>
      </div>
    </div>
  )
}

// Browsers hand over a photo without its location unless the person allows it.
const LOCATION_HINT = 'On iPhone, tap Options in the photo picker and turn Location on. On Android, choose Browse or Files instead of the photo picker.'
