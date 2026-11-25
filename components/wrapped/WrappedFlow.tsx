'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useArtistImages } from '@/lib/useArtistImages'
import type { Nearby } from '@/lib/useNearby'
import { recordWrappedStep } from '@/lib/visitor'
import { fetchSavedShowIds, saveShow, unsaveShow, type SavableShow } from '@/lib/savedShows'
import { followName } from '@/lib/followedNames'
import { flushPendingLogs, type GuestDraft } from '@/lib/pendingLogs'
import { prepareScreenshot, type PreparedImage } from '@/lib/wrapped/image'
import { fetchWrappedPopup, markPopupSeen, popupIsLive, popupSeen } from '@/lib/wrapped/settings'
import { markStashDone, queueLog, readStash, stashFollows, stashLog, stashSave, stashUnsave } from '@/lib/wrapped/stash'
import type { MatchResult, ReadResult, WrappedCard, WrappedName, WrappedShow } from '@/lib/wrapped/types'
import { WrappedPopup } from './WrappedPopup'
import { WrappedUpload } from './WrappedUpload'
import { WrappedLogSheet } from './WrappedLogSheet'
import { CheckArtists, DoneButton, FlowScreen, WrappedResults, type ArtistCounts, type PlaceFilter, type ResultsTab } from './WrappedScreens'
import { btnPrimary } from '@/components/ui'

// "Your top artists, live": the Wrapped popup and everything behind it,
// mounted on the Feed (where gigl.space lands).
//
//   popup -> add screenshots -> check the artists -> results -> Done
//
// It opens once per person while it's switched on in /admin (lib/wrapped/
// settings.ts), for members and for people without an account. Someone
// without one goes all the way through: what they save, follow and log is
// kept on the phone (lib/wrapped/stash.ts), and Done takes them to phone
// sign-up, which writes it to the new account. A member's choices are
// written as they make them, and Done just closes it.
//
// ?wrapped=1 on the Feed opens it regardless of the switch, for trying it
// out on a preview before it's live.

type Stage = 'closed' | 'popup' | 'upload' | 'check' | 'results'

export function WrappedFlow({ nearby }: { nearby: Nearby }) {
  const router = useRouter()
  const { user } = useAuth()
  const signedIn = !!user

  const [stage, setStage] = useState<Stage>('closed')
  const [images, setImages] = useState<Partial<Record<WrappedCard, PreparedImage>>>({})
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [names, setNames] = useState<WrappedName[]>([])
  const [match, setMatch] = useState<MatchResult | null>(null)
  const [matchedNear, setMatchedNear] = useState(false)
  const [ticked, setTicked] = useState<Set<string>>(new Set())
  const [tab, setTab] = useState<ResultsTab>('upcoming')
  const [place, setPlace] = useState<PlaceFilter>('near')
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [logs, setLogs] = useState<Record<string, GuestDraft>>({})
  const [following, setFollowing] = useState(false)
  const [logging, setLogging] = useState<WrappedShow | null>(null)

  // Open once, if it's live and this phone hasn't seen it this season.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('wrapped') === '1') {
      setStage('popup')
      return
    }
    let live = true
    fetchWrappedPopup().then(setting => {
      if (!live || !popupIsLive(setting) || popupSeen(setting)) return
      markPopupSeen(setting)
      recordWrappedStep('seen')
      setStage('popup')
    })
    return () => { live = false }
  }, [])

  // Nothing behind the flow scrolls while it's open.
  useEffect(() => {
    if (stage === 'closed') return
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = previous }
  }, [stage])

  const close = useCallback(() => setStage('closed'), [])

  // ── Screenshots ──────────────────────────────────────────────────────────

  async function pick(card: WrappedCard, file: File) {
    setError(null)
    try {
      const prepared = await prepareScreenshot(file)
      setImages(prev => {
        const old = prev[card]
        if (old) URL.revokeObjectURL(old.preview)
        return { ...prev, [card]: prepared }
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open that picture.")
    }
  }

  const coords = nearby.coords

  const lookUp = useCallback(async (list: WrappedName[], withCoords: boolean) => {
    const res = await fetch('/api/wrapped/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: list, ...(withCoords && coords ? { lat: coords.lat, lng: coords.lng } : {}) }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.artists) throw new Error(body?.error ?? "Couldn't look up those artists. Try again.")
    setMatch(body as MatchResult)
    setMatchedNear(withCoords && !!coords)
    return body as MatchResult
  }, [coords])

  async function read() {
    const sent = (['artists', 'songs'] as WrappedCard[])
      .filter(card => images[card])
      .map(card => ({ card, data: images[card]!.data }))
    if (sent.length === 0) return
    setReading(true)
    setError(null)
    try {
      const res = await fetch('/api/wrapped/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: sent }),
      })
      const body = await res.json().catch(() => null) as (ReadResult & { error?: string }) | null
      if (!res.ok || !body) throw new Error(body?.error ?? "Couldn't read those screenshots. Try again.")

      const list: WrappedName[] = [
        ...body.artists.map(name => ({ name, from: 'artists' as const })),
        ...body.songArtists.map(name => ({ name, from: 'songs' as const })),
      ]
      if (list.length === 0) {
        throw new Error(body.notWrapped
          ? "Those don't look like Wrapped cards. Screenshot Top artists and Top songs in your Wrapped, then add them here."
          : "Couldn't find any artists' names in those. Try a clearer screenshot.")
      }

      recordWrappedStep('added')
      const result = await lookUp(list, true)
      setNames(list)
      setTicked(new Set(result.artists.filter(a => a.matched).map(a => a.name)))
      setPlace(coords ? 'near' : 'anywhere')
      setStage('check')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read those screenshots. Try again.")
    } finally {
      setReading(false)
    }
  }

  // Location turned up after the lists were made (the browser's prompt was
  // still up): look again, so Near me has distances to go on.
  useEffect(() => {
    if (!match || matchedNear || !coords || names.length === 0) return
    lookUp(names, true).then(() => setPlace('near')).catch(() => { /* keep the lists we have */ })
  }, [coords, match, matchedNear, names, lookUp])

  // ── What's shown ─────────────────────────────────────────────────────────

  const canFilterNearby = matchedNear && !!coords
  const inPlace = useCallback((show: WrappedShow) => (
    place === 'anywhere' || !canFilterNearby
    || (show.distanceMiles != null && show.distanceMiles <= nearby.radiusMiles)
  ), [place, canFilterNearby, nearby.radiusMiles])

  const counts = useMemo(() => {
    const out: Record<string, ArtistCounts> = {}
    for (const show of match?.upcoming ?? []) {
      if (!inPlace(show)) continue
      out[show.wrappedArtist] ??= { upcoming: 0, past: 0 }
      out[show.wrappedArtist].upcoming += 1
    }
    for (const show of match?.past ?? []) {
      if (!inPlace(show)) continue
      out[show.wrappedArtist] ??= { upcoming: 0, past: 0 }
      out[show.wrappedArtist].past += 1
    }
    return out
  }, [match, inPlace])

  const upcoming = useMemo(() => (match?.upcoming ?? []).filter(s => ticked.has(s.wrappedArtist) && inPlace(s)), [match, ticked, inPlace])
  const past = useMemo(() => (match?.past ?? []).filter(s => ticked.has(s.wrappedArtist) && inPlace(s)), [match, ticked, inPlace])
  const tickedArtists = useMemo(() => (match?.artists ?? []).filter(a => a.matched && ticked.has(a.name)), [match, ticked])

  const photo = useArtistImages(useMemo(() => [
    ...(match?.artists ?? []).map(a => a.name),
    ...(match?.past ?? []).map(s => s.artist),
  ], [match]))

  const rankOf = useCallback((name: string) => match?.artists.find(a => a.name === name)?.rank ?? null, [match])

  function toggleArtist(name: string) {
    setTicked(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  // ── Results: what's already saved and logged ─────────────────────────────

  useEffect(() => {
    if (stage !== 'results' || !match) return
    if (!user) {
      const stash = readStash()
      setSavedIds(new Set(stash.saves.map(s => s.id)))
      setLogs(Object.fromEntries(stash.logs.map(l => [l.artist_id, l])))
      return
    }
    fetchSavedShowIds(user.id).then(setSavedIds).catch(err => console.error('saved show ids failed:', err))
    const pastIds = match.past.map(s => s.id)
    if (pastIds.length === 0) return
    createClient()
      .from('logged_shows')
      .select('artist_id, artist_name, venue, show_date, performance_rating, venue_rating, review')
      .eq('user_id', user.id)
      .in('artist_id', pastIds)
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
  }, [stage, match, user])

  // ── Saving, following, logging ───────────────────────────────────────────

  function toggleSave(show: WrappedShow) {
    const savable: SavableShow = {
      id: show.id, artist: show.artist, venue: show.venue, city: show.city, state: show.state,
      isoDate: show.isoDate, imageUrl: show.imageUrl,
    }
    const saved = savedIds.has(show.id)
    setSavedIds(prev => {
      const next = new Set(prev)
      if (saved) next.delete(show.id)
      else next.add(show.id)
      return next
    })
    if (!user) {
      if (saved) stashUnsave(show.id)
      else stashSave(savable)
      return
    }
    const write = saved ? unsaveShow(user.id, show.id) : saveShow(user.id, savable, false)
    write.catch(err => {
      console.error('saving a Wrapped show failed:', err)
      setSavedIds(prev => {
        const next = new Set(prev)
        if (saved) next.add(show.id)
        else next.delete(show.id)
        return next
      })
    })
  }

  function followAll() {
    const artistNames = tickedArtists.map(a => a.name)
    setFollowing(true)
    if (!user) { stashFollows(artistNames); return }
    Promise.all(artistNames.map(name => followName(user.id, { kind: 'artist', name, city: '', state: '' })))
      .catch(err => {
        console.error('following Wrapped artists failed:', err)
        setFollowing(false)
      })
  }

  function saveLog(draft: GuestDraft) {
    setLogs(prev => ({ ...prev, [draft.artist_id]: draft }))
    setLogging(null)
    recordWrappedStep('logged')
    if (!user) { stashLog(draft); return }
    queueLog(user.id, draft)
    void flushPendingLogs()
  }

  function done() {
    if (user) { close(); return }
    markStashDone()
    setStage('closed')
    router.push('/auth')
  }

  // ── Screens ──────────────────────────────────────────────────────────────

  if (stage === 'closed') return null

  if (stage === 'popup') {
    return <WrappedPopup signedIn={signedIn} onStart={() => setStage('upload')} onDismiss={close} />
  }

  if (stage === 'upload') {
    return <WrappedUpload images={images} reading={reading} error={error} onPick={pick} onRead={read} onClose={close} />
  }

  if (stage === 'check' && match) {
    const showCount = upcoming.length + past.length
    return (
      <FlowScreen
        title="Your Wrapped"
        onClose={close}
        footer={
          <button type="button" onClick={() => setStage('results')} className={`${btnPrimary} w-full py-4 text-xs`}>
            {showCount > 0 ? `Show me ${showCount} show${showCount === 1 ? '' : 's'}` : 'Continue'}
          </button>
        }
      >
        <CheckArtists
          artists={match.artists}
          counts={counts}
          ticked={ticked}
          photo={photo}
          nearby={canFilterNearby && place === 'near'}
          onToggle={toggleArtist}
        />
      </FlowScreen>
    )
  }

  if (stage === 'results' && match) {
    return (
      <>
        <FlowScreen title="Your Wrapped, live" onClose={close} footer={<DoneButton signedIn={signedIn} onDone={done} />}>
          <WrappedResults
            tab={tab}
            onTab={setTab}
            place={place}
            onPlace={next => {
              if (next === 'near' && !nearby.active) nearby.enable()
              setPlace(next)
            }}
            radiusMiles={nearby.radiusMiles}
            canFilterNearby={canFilterNearby}
            artistCount={tickedArtists.length}
            upcoming={upcoming}
            past={past}
            rankOf={rankOf}
            photo={photo}
            savedIds={savedIds}
            onToggleSave={toggleSave}
            logs={logs}
            onLog={setLogging}
            following={following}
            onFollowAll={followAll}
          />
        </FlowScreen>
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
      </>
    )
  }

  return null
}
