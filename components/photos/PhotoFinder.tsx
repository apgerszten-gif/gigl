'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ImagePlus, Loader2, X } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useArtistImages } from '@/lib/useArtistImages'
import { flushPendingLogs, type GuestDraft } from '@/lib/pendingLogs'
import { computeShowScore } from '@/lib/rating'
import { prepareScreenshot } from '@/lib/wrapped/image'
import { markStashDone, queueLog, readStash, stashLog } from '@/lib/wrapped/stash'
import type { WrappedShow } from '@/lib/wrapped/types'
import { readPhotoMeta, type PhotoMeta } from '@/lib/photos/exif'
import type { PhotoInput, PhotoResult, PhotoShow } from '@/lib/photos/types'
import { WrappedLogSheet } from '@/components/wrapped/WrappedLogSheet'
import { ArtistPhoto, BackHeader, DateTag, EmptyState, ErrorNote, Label, Place, Stars, btnPrimary, btnQuiet, btnSecondary } from '@/components/ui'

// Find the shows you've been to from your photos: tickets, confirmation
// emails, posters, a story with the artist tagged, or just photos from the
// night. /api/photos/read reads what's in them and matches Gigl's shows, and
// each one is logged right here with the same sheet the Wrapped flow uses, so
// it works without an account too (what's logged waits on the phone until
// sign-up, lib/wrapped/stash.ts).

const MAX_PHOTOS = 6
const LONG_EDGE = 1280

interface Picked {
  id:      string
  preview: string
  data:    string
  meta:    PhotoMeta
}

type Stage = 'pick' | 'reading' | 'results'

export function PhotoFinder() {
  const router = useRouter()
  const { user } = useAuth()
  const signedIn = !!user
  const input = useRef<HTMLInputElement | null>(null)

  const [stage, setStage] = useState<Stage>('pick')
  const [picked, setPicked] = useState<Picked[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<PhotoResult | null>(null)
  const [logs, setLogs] = useState<Record<string, GuestDraft>>({})
  const [logging, setLogging] = useState<WrappedShow | null>(null)

  // Only the pictures still on the page need their previews kept.
  useEffect(() => () => { picked.forEach(p => URL.revokeObjectURL(p.preview)) }, [picked])

  async function add(files: FileList | null) {
    if (!files || files.length === 0) return
    setError(null)
    setBusy(true)
    try {
      const room = MAX_PHOTOS - picked.length
      const next: Picked[] = []
      for (const file of Array.from(files).slice(0, Math.max(0, room))) {
        // EXIF first: resizing on a canvas drops it.
        const meta = await readPhotoMeta(file)
        try {
          const prepared = await prepareScreenshot(file, LONG_EDGE)
          next.push({ id: `${file.name}-${file.size}-${Math.random().toString(36).slice(2, 7)}`, preview: prepared.preview, data: prepared.data, meta })
        } catch {
          setError("Couldn't open one of those pictures. Photos saved as JPEG or PNG work best.")
        }
      }
      setPicked(prev => [...prev, ...next])
      if (files.length > room) setError(`Up to ${MAX_PHOTOS} photos at a time.`)
    } finally {
      setBusy(false)
    }
  }

  function remove(id: string) {
    setPicked(prev => prev.filter(p => p.id !== id))
  }

  async function find() {
    if (picked.length === 0) return
    setStage('reading')
    setError(null)
    try {
      const photos: PhotoInput[] = picked.map(p => ({ data: p.data, takenOn: p.meta.takenOn, lat: p.meta.lat, lng: p.meta.lng }))
      const res = await fetch('/api/photos/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos }),
      })
      const body = await res.json().catch(() => null) as (PhotoResult & { error?: string }) | null
      if (!res.ok || !body?.shows) throw new Error(body?.error ?? "Couldn't read those photos. Try again.")
      setResult(body)
      setStage('results')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read those photos. Try again.")
      setStage('pick')
    }
  }

  // ── Results: what's already logged ───────────────────────────────────────

  useEffect(() => {
    if (stage !== 'results' || !result) return
    if (!user) {
      const stash = readStash()
      setLogs(Object.fromEntries(stash.logs.map(l => [l.artist_id, l])))
      return
    }
    const ids = result.shows.map(s => s.id)
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
  }, [stage, result, user])

  const photo = useArtistImages(useMemo(() => (result?.shows ?? []).map(s => s.artist), [result]))

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
          <p className="mt-4 font-display text-[17px] font-bold">Reading your photos</p>
          <p className="mt-1 text-[13px] text-ink-muted">Looking for tickets, names and dates. This takes a few seconds.</p>
        </div>
      </div>
    )
  }

  if (stage === 'results' && result) {
    const shows = result.shows
    const loggedCount = shows.filter(s => logs[s.id]).length
    const unread = result.reads.filter(r => r.artists.length === 0 && !r.venue && !r.date).length
    return (
      <div className="min-h-screen bg-paper text-ink pb-32">
        <BackHeader title="Find shows in your photos" onBack={() => setStage('pick')} />
        <main className="px-5 pt-4 space-y-4">
          <div>
            <h2 className="font-display text-[24px] font-bold tracking-tight leading-tight">
              {shows.length > 0 ? 'Were you there' : 'No shows yet'}<span className="text-accent">{shows.length > 0 ? '?' : '.'}</span>
            </h2>
            {shows.length > 0 && (
              <p className="mt-1 text-[13px] leading-snug text-ink-muted">
                {shows.length} show{shows.length === 1 ? '' : 's'} that match your photos.
              </p>
            )}
          </div>

          {shows.length > 0 ? (
            <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
              {shows.map((show, i) => {
                const log = logs[show.id]
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
                        <p className="mt-0.5 text-[11px] text-ink-faint truncate">
                          {show.why === 'date and place' ? 'Matched where and when you took a photo' : `Photo ${show.photos.map(p => p + 1).join(', ')}`}
                        </p>
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
          ) : (
            <EmptyState>
              Nothing in Gigl matched those photos. A ticket or a confirmation email works best, since they name the artist and the date.
            </EmptyState>
          )}

          {unread > 0 && shows.length > 0 && (
            <p className="text-[12px] leading-snug text-ink-faint">
              {unread} photo{unread === 1 ? '' : 's'} had nothing we could read.
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
            <button type="button" onClick={() => setStage('pick')} className="w-full mt-2 py-1 text-[12px] font-semibold text-ink-muted">Add more photos</button>
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
            Tickets, confirmation emails, posters, or photos from the night. We&apos;ll find the shows.
          </p>
        </div>

        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={e => { void add(e.target.files); e.target.value = '' }}
        />

        {picked.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {picked.map(p => (
              <div key={p.id} className="relative aspect-square rounded-card border-1.5 border-ink overflow-hidden bg-cream">
                <img src={p.preview} alt="" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-ink text-cream flex items-center justify-center"
                >
                  <X className="w-3.5 h-3.5" strokeWidth={2.5} />
                </button>
              </div>
            ))}
          </div>
        )}

        {picked.length < MAX_PHOTOS && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            disabled={busy}
            className={`w-full ${picked.length === 0 ? 'h-52' : 'h-20'} rounded-card border-1.5 border-dashed border-accent bg-accent/5 flex flex-col items-center justify-center gap-2 px-6 text-center text-[13px] font-semibold`}
          >
            {busy ? <Loader2 className="w-6 h-6 text-accent animate-spin" strokeWidth={2} /> : <ImagePlus className="w-6 h-6 text-accent" strokeWidth={1.75} />}
            {picked.length === 0 ? 'Choose photos' : 'Add more'}
            {picked.length === 0 && <span className="text-[11px] font-normal text-ink-muted">Up to {MAX_PHOTOS} at a time</span>}
          </button>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}
        <Label>Works best with a ticket or a confirmation email</Label>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-20 px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))] bg-gradient-to-t from-paper via-paper to-transparent">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={picked.length > 0 ? find : () => input.current?.click()}
            disabled={busy}
            className={`${btnPrimary} w-full py-4 text-xs`}
          >
            {picked.length > 0 ? 'Find my shows' : 'Choose photos'}
          </button>
        </div>
      </div>
    </div>
  )
}
