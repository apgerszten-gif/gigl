'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { useArtistImages } from '@/lib/useArtistImages'
import { nameKey } from '@/lib/nameKey'
import type { NamedPlace } from '@/lib/geo'
import type { Nearby } from '@/lib/useNearby'
import { recordWrappedStep } from '@/lib/visitor'
import { fetchSavedShowIds, saveShow, unsaveShow, type SavableShow } from '@/lib/savedShows'
import { followName } from '@/lib/followedNames'
import { flushPendingLogs, type GuestDraft } from '@/lib/pendingLogs'
import { prepareScreenshot, type PreparedImage } from '@/lib/wrapped/image'
import { fetchWrappedPopup, markPopupSeen, popupIsLive, popupSeen } from '@/lib/wrapped/settings'
import { markStashDone, queueLog, readStash, stashFollows, stashLog, stashSave, stashUnsave } from '@/lib/wrapped/stash'
import type { MatchResult, ReadResult, WrappedName, WrappedShow } from '@/lib/wrapped/types'
import { WrappedPopup } from './WrappedPopup'
import { WrappedUpload } from './WrappedUpload'
import { WrappedLogSheet } from './WrappedLogSheet'
import { CheckArtists, FlowScreen, ResultsFooter, WrappedResults, type ArtistCounts, type PlaceFilter, type ResultsTab } from './WrappedScreens'
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
  const [image, setImage] = useState<PreparedImage | null>(null)
  const [reading, setReading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [names, setNames] = useState<WrappedName[]>([])
  const [match, setMatch] = useState<MatchResult | null>(null)
  // Where the distances in `match` were measured from, as originKey() below.
  const [matchedFor, setMatchedFor] = useState('')
  // A city typed in instead of the phone's location: the show may have been
  // somewhere they aren't now.
  const [city, setCity] = useState<NamedPlace | null>(null)
  const [adding, setAdding] = useState(false)
  const [addNote, setAddNote] = useState<string | null>(null)
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

  // Each result step starts at the top of its list.
  useEffect(() => {
    document.querySelector('[data-wrapped-screen]')?.scrollTo(0, 0)
  }, [tab])

  // ── Screenshots ──────────────────────────────────────────────────────────

  async function pick(file: File) {
    setError(null)
    try {
      const prepared = await prepareScreenshot(file)
      setImage(prev => {
        if (prev) URL.revokeObjectURL(prev.preview)
        return prepared
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open that picture.")
    }
  }

  // Distances are measured from the city they picked, else their location.
  const origin = city ? { lat: city.lat, lng: city.lng } : nearby.coords
  const originKey = origin ? `${origin.lat.toFixed(2)},${origin.lng.toFixed(2)}` : ''

  const postMatch = useCallback(async (list: WrappedName[], from: { lat: number; lng: number } | null): Promise<MatchResult> => {
    const res = await fetch('/api/wrapped/match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ names: list, ...(from ? { lat: from.lat, lng: from.lng } : {}) }),
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.artists) throw new Error(body?.error ?? "Couldn't look up those artists. Try again.")
    return body as MatchResult
  }, [])

  // New artists (another screenshot, or typed) join the list already made:
  // their shows are added, nothing already there is looked up again.
  function mergeMatch(prev: MatchResult, add: MatchResult): MatchResult {
    const have = new Set(prev.artists.map(a => nameKey(a.name)))
    const fresh = add.artists.filter(a => !have.has(nameKey(a.name))).map((a, i) => ({ ...a, rank: prev.artists.length + i + 1 }))
    const merge = (a: WrappedShow[], b: WrappedShow[]) => {
      const ids = new Set(a.map(s => s.id))
      return [...a, ...b.filter(s => !ids.has(s.id))]
    }
    return {
      artists:  [...prev.artists, ...fresh],
      upcoming: merge(prev.upcoming, add.upcoming).sort((x, y) => (x.isoDate ?? '').localeCompare(y.isoDate ?? '') || x.id.localeCompare(y.id)),
      past:     merge(prev.past, add.past).sort((x, y) => (y.isoDate ?? '').localeCompare(x.isoDate ?? '') || x.id.localeCompare(y.id)),
    }
  }

  async function addNames(list: WrappedName[]) {
    const known = new Set((match?.artists ?? []).map(a => nameKey(a.name)))
    const fresh = list.filter(n => !known.has(nameKey(n.name)))
    if (fresh.length === 0) return
    const add = await postMatch(fresh, origin)
    setMatch(prev => (prev ? mergeMatch(prev, add) : add))
    setNames(prev => [...prev, ...fresh])
    setTicked(prev => new Set([...Array.from(prev), ...add.artists.filter(a => a.matched).map(a => a.name)]))
  }

  // An artist the reading missed, typed in by the person.
  async function addTyped(name: string) {
    setAdding(true)
    setAddNote(null)
    try {
      const add = await postMatch([{ name, from: 'typed' }], origin)
      const found = add.artists[0]
      if (!found?.matched) {
        setAddNote(`Couldn't find "${name}" in Gigl. Check the spelling?`)
        return
      }
      if ((match?.artists ?? []).some(a => nameKey(a.name) === nameKey(found.name))) {
        setTicked(prev => new Set(prev).add(found.name))
        setAddNote(`${found.name} is already on your list.`)
        return
      }
      setMatch(prev => (prev ? mergeMatch(prev, add) : add))
      setNames(prev => [...prev, { name, from: 'typed' }])
      setTicked(prev => new Set(prev).add(found.name))
      setAddNote(`Added ${found.name}${found.corrected ? ` (we read "${name}" as that)` : ''}.`)
    } catch (err) {
      setAddNote(err instanceof Error ? err.message : "Couldn't look that up. Try again.")
    } finally {
      setAdding(false)
    }
  }

  async function read() {
    if (!image) return
    setReading(true)
    setError(null)
    try {
      const res = await fetch('/api/wrapped/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: [{ data: image.data }] }),
      })
      const body = await res.json().catch(() => null) as (ReadResult & { error?: string }) | null
      if (!res.ok || !body) throw new Error(body?.error ?? "Couldn't read those screenshots. Try again.")

      const list: WrappedName[] = [
        ...body.artists.map(name => ({ name, from: 'artists' as const })),
        ...body.songArtists.map(name => ({ name, from: 'songs' as const })),
      ]
      if (list.length === 0) {
        throw new Error(body.notWrapped
          ? "That doesn't look like a Wrapped card. Screenshot the card that lists your Top Artists and Top Songs, then add it here."
          : "Couldn't find any artists' names in those. Try a clearer screenshot.")
      }

      recordWrappedStep('added')
      if (match) {
        // Another screenshot, added to the list already made.
        await addNames(list)
        setImage(null)
        setStage('check')
        return
      }
      const result = await postMatch(list, origin)
      setMatch(result)
      setMatchedFor(originKey)
      setNames(list)
      setTicked(new Set(result.artists.filter(a => a.matched).map(a => a.name)))
      setPlace(origin ? 'near' : 'anywhere')
      setStage('check')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read those screenshots. Try again.")
    } finally {
      setReading(false)
    }
  }

  // The place the distances are measured from has changed since the lists
  // were made (a city picked, or the browser's location prompt answered):
  // look again, so Near me has distances to go on.
  useEffect(() => {
    if (!match || names.length === 0 || !origin || matchedFor === originKey) return
    let live = true
    postMatch(names, origin)
      .then(result => {
        if (!live) return
        setMatch(result)
        setMatchedFor(originKey)
        setPlace('near')
      })
      .catch(() => { /* keep the lists we have */ })
    return () => { live = false }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [originKey, match, names, matchedFor])

  // ── What's shown ─────────────────────────────────────────────────────────

  const canFilterNearby = !!origin && matchedFor === originKey
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
    // With a list already made, this is "add another screenshot": closing it
    // goes back to the list rather than ending everything.
    return (
      <WrappedUpload
        image={image}
        another={!!match}
        reading={reading}
        error={error}
        onPick={pick}
        onRead={read}
        onClose={match ? () => { setImage(null); setError(null); setStage('check') } : close}
      />
    )
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
          onAddTyped={addTyped}
          onAnother={() => { setImage(null); setError(null); setStage('upload') }}
          adding={adding}
          addNote={addNote}
        />
      </FlowScreen>
    )
  }

  if (stage === 'results' && match) {
    return (
      <>
        <FlowScreen
          title="Your Wrapped, live"
          onClose={close}
          footer={
            <ResultsFooter
              tab={tab}
              signedIn={signedIn}
              loggedCount={past.filter(s => logs[s.id]).length}
              pastCount={past.length}
              onNext={() => setTab('past')}
              onBack={() => setTab('upcoming')}
              onDone={done}
            />
          }
        >
          <WrappedResults
            tab={tab}
            onTab={setTab}
            place={place}
            onPlace={setPlace}
            radiusMiles={nearby.radiusMiles}
            canFilterNearby={canFilterNearby}
            city={city}
            onPickCity={setCity}
            // Back to the phone's own location, asking for it if it's off.
            onClearCity={() => { setCity(null); if (!nearby.active) nearby.enable() }}
            hasDeviceLocation={!!nearby.coords}
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
