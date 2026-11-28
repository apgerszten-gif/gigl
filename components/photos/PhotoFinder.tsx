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
import { readPhoto, type PhotoRead } from '@/lib/photos/exif'
import { PhotoTimer, acceptFor, photoTimingOn, spread } from '@/lib/photos/timing'
import { takeSharedPhotos, toFileList } from '@/lib/photos/sharedPhotos'
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
// Photos being read at once. Each read is a slice of the file and is waiting
// on the phone's storage, not on the processor, so a handful in flight keeps
// it busy without queueing hundreds of reads (or the memory they'd hold).
const READ_AT_ONCE = 8

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
  // These photos came from another app's Share, not the picker.
  const [viaShare, setViaShare] = useState(false)
  // Photos that couldn't be read (or took too long), so the person is told
  // rather than left wondering why a count is short.
  const [unreadable, setUnreadable] = useState(0)
  // The picker has handed the page back but no photos have arrived yet: the
  // phone is still preparing them, which is its work, not ours.
  const [waiting, setWaiting] = useState(false)
  const pickerOpen = useRef(false)
  const waitTimer = useRef<ReturnType<typeof setTimeout>>()

  // ?timing=1: measurements for finding out where the time goes on a real
  // phone (lib/photos/timing.ts). Read after mount so the server and the
  // first client render agree.
  const [timing, setTiming] = useState(false)
  const [accept, setAccept] = useState(acceptFor(false))
  const timer = useRef<PhotoTimer | null>(null)
  useEffect(() => {
    const on = photoTimingOn()
    setTiming(on)
    setAccept(acceptFor(on))
    if (on) timer.current = new PhotoTimer()
  }, [])

  // Closing the picker without choosing raises `cancel` on the input (not
  // every browser does; a React prop for it doesn't exist on inputs).
  useEffect(() => {
    const el = input.current
    if (!el) return
    const onCancel = () => { pickerOpen.current = false; clearTimeout(waitTimer.current); setWaiting(false); timer.current?.at('picker closed without photos') }
    el.addEventListener('cancel', onCancel)
    return () => el.removeEventListener('cancel', onCancel)
  }, [stage])  // the input only exists on the pick screen, so re-attach when it comes back

  // The picker is a separate screen: on Android the page is hidden while it is
  // open, on iOS it is a sheet over the page. Either way the page hears
  // nothing until the photos are ready, so these events (and the input's own
  // cancel) are the only signs of what the phone is doing in between.
  useEffect(() => {
    function back(event: Event) {
      timer.current?.at(event.type === 'visibilitychange' ? `page ${document.visibilityState}` : `page ${event.type}`)
      // Back on the page but still no photos a moment later: the phone is
      // preparing them. A moment, not at once, so a quick cancel never flashes it.
      if (pickerOpen.current && (event.type === 'focus' || document.visibilityState === 'visible')) {
        clearTimeout(waitTimer.current)
        waitTimer.current = setTimeout(() => { if (pickerOpen.current) setWaiting(true) }, 1200)
      }
    }
    window.addEventListener('focus', back)
    window.addEventListener('blur', back)
    document.addEventListener('visibilitychange', back)
    return () => {
      window.removeEventListener('focus', back)
      window.removeEventListener('blur', back)
      document.removeEventListener('visibilitychange', back)
    }
  }, [])

  function openPicker() {
    pickerOpen.current = true
    timer.current?.start('tapped Choose photos')
    input.current?.click()
  }

  // Runs inside the input's change event, so everything before the first
  // await happens before the browser can do anything else: the file list is
  // copied (the input is cleared right after) and the progress screen is
  // asked for. Nothing heavy sits ahead of that.
  async function start(files: FileList | null, handlerLagMs = 0) {
    pickerOpen.current = false
    clearTimeout(waitTimer.current)
    setWaiting(false)
    if (!files || files.length === 0) return
    const list = Array.from(files)
    setError(null)
    setUnreadable(0)
    setStage('reading')
    setProgress({ done: 0, total: list.length })

    const t = timing ? timer.current : null
    if (t) {
      t.at('photos arrived', `${list.length} files; our handler ran ${Math.round(handlerLagMs)}ms after the browser raised the event`)
      t.note(describeFiles(list))
      requestAnimationFrame(() => requestAnimationFrame(() => t.at('progress screen painted')))
    }

    try {
      // A moving window of reads, not batches of six that each wait for their
      // slowest file. A read that stalls is cut off by readPhoto itself.
      const reads: PhotoRead[] = new Array(list.length)
      let next = 0
      let done = 0
      let lastPaint = 0
      const worker = async () => {
        while (next < list.length) {
          const i = next++
          reads[i] = await readPhoto(list[i])
          done += 1
          // Painting is throttled: hundreds of state updates in a second is
          // work the screen can't show anyway.
          const now = performance.now()
          if (done === list.length || now - lastPaint > 100) { lastPaint = now; setProgress({ done, total: list.length }) }
        }
      }
      await Promise.all(Array.from({ length: Math.min(READ_AT_ONCE, list.length) }, worker))

      const photos: PhotoFile[] = list.map((file, i) => ({ file, meta: reads[i].meta }))
      const failed = reads.filter(r => r.failed).length
      setUnreadable(failed)
      if (t) {
        const ms = spread(reads.map(r => r.ms))
        const bytes = reads.reduce((sum, r) => sum + r.bytes, 0)
        t.at('all photos read', `median ${ms.median}ms, 95th ${ms.p95}ms, slowest ${ms.max}ms; read ${(bytes / 1024 / 1024).toFixed(1)} MB in all; ${failed} unreadable (${reads.filter(r => r.timedOut).length} timed out)`)
        const kinds = reads.reduce<Record<string, number>>((acc, r) => { acc[r.kind] = (acc[r.kind] ?? 0) + 1; return acc }, {})
        t.note(`formats read: ${Object.entries(kinds).map(([k, n]) => `${k} ${n}`).join(', ')}; with a date ${photos.filter(p => p.meta.takenOn).length}, with a place ${photos.filter(p => p.meta.lat != null).length}`)
      }

      const groups = groupPhotos(photos)
      t?.at('grouped into nights', `${groups.clusters.length} nights`)
      setGrouped(groups)
      if (groups.clusters.length === 0) { setMatches([]); setStage('results'); return }

      const sent = groups.clusters.slice(0, MAX_CLUSTERS)
      const sentAt = performance.now()
      const res = await fetch('/api/photos/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clusters: sent.map(c => ({ date: c.date, lat: Math.round(c.lat * 100) / 100, lng: Math.round(c.lng * 100) / 100, count: c.photos.length })) }),
      })
      const body = await res.json().catch(() => null) as (PhotoMatchResult & { error?: string }) | null
      t?.at('server answered', `${Math.round(performance.now() - sentAt)}ms for ${sent.length} nights`)
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

  // ── Photos shared to Gigl ─────────────────────────────────────────────────
  // On Android, with Gigl installed, someone can search their photos in
  // Google Photos, select, Share, and pick Gigl. public/sw.js catches that
  // share on the phone and sends them here as /photos?shared=<n>, and they
  // go through the same reading and matching as photos chosen in the picker.
  // `shared=0` means the share arrived but couldn't be kept (the worker wasn't
  // ready yet, or nothing came with it).
  const sharedHandled = useRef(false)
  useEffect(() => {
    if (sharedHandled.current) return
    const params = new URLSearchParams(window.location.search)
    const shared = params.get('shared')
    if (shared === null) return
    sharedHandled.current = true
    // Gone from the address, so a refresh doesn't try again.
    params.delete('shared')
    const rest = params.toString()
    window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : ''))

    void (async () => {
      const files = shared === '0' ? [] : await takeSharedPhotos()
      const list = files.length > 0 ? toFileList(files) : null
      if (!list) {
        setError("Those photos didn't make it to Gigl. Open Gigl again and share them once more, or tap Choose photos.")
        return
      }
      setViaShare(true)
      void start(list)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Results: what's already logged ───────────────────────────────────────

  useEffect(() => {
    if (stage === 'results') timer.current?.at('results shown')
  }, [stage])

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
    const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
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
          <div className="mx-auto mt-4 h-1.5 w-48 overflow-hidden rounded-full bg-ink/10" aria-hidden>
            <div className="h-full rounded-full bg-accent transition-[width] duration-150" style={{ width: `${progress.done < progress.total ? pct : 100}%` }} />
          </div>
        </div>
        {timing && <TimingPanel timer={timer.current} />}
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
                const pics = m.clusters.flatMap(c => c.photos).slice(0, THUMBS)
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
                          {pics.map((p, k) => <Thumb key={k} file={p.file} />)}
                          <span className="text-[11px] text-ink-faint truncate">{m.photos} photo{m.photos === 1 ? '' : 's'}{show.viaSetlistFm ? ' · via setlist.fm' : ''}</span>
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
              {viaShare
                ? 'None of the photos you shared had a location. Some apps remove it when they share a photo. Try choosing them with Choose photos, then Browse or Files.'
                : <>None of those photos had a location. Phones usually remove it when a website opens a photo. {LOCATION_HINT}</>}
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
          {unreadable > 0 && (
            <p className="text-[12px] leading-snug text-ink-faint">
              {unreadable} photo{unreadable === 1 ? '' : 's'} couldn&apos;t be read, so {unreadable === 1 ? 'it was' : 'they were'} left out. Try choosing {unreadable === 1 ? 'it' : 'them'} again.
            </p>
          )}
          {grouped.dateOnly + grouped.bare > 0 && grouped.located > 0 && (
            <p className="text-[12px] leading-snug text-ink-faint">
              {grouped.dateOnly + grouped.bare} photo{grouped.dateOnly + grouped.bare === 1 ? '' : 's'} had no location, so they weren&apos;t used. {LOCATION_HINT}
            </p>
          )}

          {matches.some(m => m.show.viaSetlistFm) && (
            <p className="text-[11px] leading-snug text-ink-faint">
              Some shows come from <a href="https://www.setlist.fm" target="_blank" rel="noopener noreferrer" className="underline underline-offset-[3px]">setlist.fm</a>.
            </p>
          )}

          <Link href="/select-festival" className="block text-center text-[12px] font-semibold text-ink-muted underline underline-offset-[3px]">
            Not here? Search for the show
          </Link>
          {timing && <TimingPanel timer={timer.current} />}
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
          accept={accept}
          multiple
          className="hidden"
          onChange={e => {
            // timeStamp is when the browser raised the event; the gap to now is
            // how long the page was too busy to hear it.
            const lag = performance.now() - e.timeStamp
            void start(e.target.files, lag)
            e.target.value = ''
          }}
        />

        <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso p-3.5">
          <Label tone="accent">Quickest way</Label>
          <ol className="mt-2.5 space-y-2">
            {[
              <>Tap <b>Choose photos</b></>,
              <>Tap the search button at the bottom right and type <span className="rounded-full border-1.5 border-ink bg-paper px-2 py-px text-[12px] font-bold">concert</span></>,
              <>Select your photos, then tap <b>Add</b></>,
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
        {timing && <TimingPanel timer={timer.current} />}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))] bg-gradient-to-t from-paper via-paper to-transparent">
        <div className="max-w-md mx-auto">
          <button type="button" onClick={openPicker} className={`${btnPrimary} w-full py-4 text-xs`}>
            Choose photos
          </button>
          {waiting && (
            <p className="mt-2 text-center text-[12px] leading-snug text-ink-muted" role="status">
              Your phone is getting your photos ready. With a lot of them that can take a minute.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// One of the person's own photos, small, beside a match. It is only decoded
// once it scrolls near the screen (loading="lazy", decoding="async"): these are
// full-size camera files shown at 28px, and decoding every one up front is
// real work on a phone. The object URL belongs to this component, so it is
// made and revoked with it. A browser that can't show the format (HEIC outside
// Safari) just leaves the slot out.
function Thumb({ file }: { file: File }) {
  const [src, setSrc] = useState<string | null>(null)
  const [broken, setBroken] = useState(false)
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])
  if (!src || broken) return null
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" loading="lazy" decoding="async" onError={() => setBroken(true)} className="w-7 h-7 rounded object-cover border border-ink/20" />
}

// ?timing=1 only: the measurements, on the screen because a phone has no
// console to read them in.
function TimingPanel({ timer }: { timer: PhotoTimer | null }) {
  const [lines, setLines] = useState<string[]>(() => timer?.snapshot() ?? [])
  useEffect(() => {
    if (!timer) return
    setLines(timer.snapshot().slice())
    return timer.subscribe(() => setLines(timer.snapshot().slice()))
  }, [timer])
  return (
    <div className="mt-6 rounded-card border-1.5 border-dashed border-ink/25 bg-cream-alt p-3 text-left">
      <p className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">Timing (screenshot this)</p>
      <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-ink-muted">
        {lines.length > 0 ? lines.join('\n') : 'Tap Choose photos, pick some, and the times show here.'}
      </pre>
    </div>
  )
}

// What the phone handed over: how many of each type, and how big. If photos
// taken as HEIC arrive as JPEG, the phone converted them while preparing the
// picker's answer, which is the likely cause of a long wait there.
function describeFiles(files: File[]): string {
  const types: Record<string, number> = {}
  let bytes = 0
  for (const f of files) {
    const ext = /\.([a-z0-9]+)$/i.exec(f.name)?.[1]?.toLowerCase() ?? '?'
    const key = `${f.type || 'no-type'} .${ext}`
    types[key] = (types[key] ?? 0) + 1
    bytes += f.size
  }
  const list = Object.entries(types).map(([k, n]) => `${k} x${n}`).join(', ')
  return `${(bytes / 1024 / 1024).toFixed(0)} MB across ${files.length} files: ${list}`
}

// Browsers hand over a photo without its location unless the person allows it.
const LOCATION_HINT = 'On iPhone, tap Options in the photo picker and turn Location on. On Android, choose Browse or Files instead of the photo picker.'
