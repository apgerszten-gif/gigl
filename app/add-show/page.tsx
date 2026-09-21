'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { artistKey } from '@/lib/artistImages'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { setActiveShow } from '@/lib/activeShow'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { BackHeader, ErrorNote, Field, btnPrimary, btnSecondary, fieldInput } from '@/components/ui'

interface Show {
  id: string
  artist: string
  venue: string
  city: string
  state: string
  isoDate: string | null
  imageUrl: string | null
}

const SUGGEST_DEBOUNCE_MS = 300

// A typo won't substring-match the right spelling - "turnstyle" never finds
// "Turnstile" - so a query that comes back empty is retried on its first few
// characters, which usually still match. The near-miss check below then does
// the rest.
const FUZZY_PREFIX = 4

// Levenshtein, as in lib/smsMatching.ts. Duplicated rather than exported from
// there because that module is about matching SMS replies to a festival
// lineup, and this needs the distance alone.
function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0))
  for (let i = 0; i <= a.length; i++) dp[i][0] = i
  for (let j = 0; j <= b.length; j++) dp[0][j] = j
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1])
    }
  }
  return dp[a.length][b.length]
}

// Adding a show the catalogue doesn't have.
//
// Ticketmaster covers ticketed rooms, and every other aggregator worth having
// is either licence-locked or has no public API at all. House shows, local
// bills and DIY spaces are in none of them at any price - the person who was
// there is the only source there will ever be.
//
// The artist field is the part that matters. A show typed in under a
// misspelled name is invisible to everyone who spells it correctly later, so
// the form works hard to offer the spelling already in the catalogue before
// accepting a new one. It never blocks a new name: a band nobody has logged
// yet is exactly what this page is for.
export default function AddShowPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [artist, setArtist] = useState('')
  const [venue, setVenue]   = useState('')
  const [city, setCity]     = useState('')
  const [date, setDate]     = useState('')

  const [suggestions, setSuggestions] = useState<string[]>([])
  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [duplicate, setDuplicate]     = useState<Show | null>(null)

  // Set when a suggestion is tapped, so the "did you mean" hint doesn't come
  // straight back for the name the person just accepted.
  const acceptedRef = useRef<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [authLoading, user, router])

  // Today in UTC, matching the server's bound in /api/shows/submit. Anything
  // later is a mistake - almost always a mistyped year - because a show you
  // haven't been to yet isn't one you can log.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

  useEffect(() => {
    const trimmed = artist.trim()
    if (trimmed.length < 2) { setSuggestions([]); return }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const ask = async (q: string) => {
          const res = await fetch(`/api/artists/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
          if (!res.ok) return []
          return (await res.json()).artists as string[]
        }

        let found = await ask(trimmed)
        if (found.length === 0 && trimmed.length > FUZZY_PREFIX) {
          found = await ask(trimmed.slice(0, FUZZY_PREFIX))
        }
        setSuggestions(found)
      } catch (err) {
        // A failed lookup must not break the form - typing a brand new name
        // is a legitimate outcome and needs no suggestions at all.
        if ((err as Error).name !== 'AbortError') setSuggestions([])
      }
    }, SUGGEST_DEBOUNCE_MS)

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [artist])

  const typedKey = artistKey(artist.trim())
  const isKnown  = suggestions.some(name => artistKey(name) === typedKey)

  // The closest existing spelling, when the typed one isn't already it. The
  // threshold scales with length so short names don't collect false hits -
  // "Muse" and "Mura" are two apart and are not each other.
  const nearMiss = useMemo(() => {
    if (!typedKey || isKnown || acceptedRef.current === artist.trim()) return null
    const limit = Math.max(1, Math.floor(typedKey.length * 0.34))
    let best: { name: string; distance: number } | null = null
    for (const name of suggestions) {
      const distance = levenshtein(typedKey, artistKey(name))
      if (distance <= limit && (!best || distance < best.distance)) best = { name, distance }
    }
    return best?.name ?? null
  }, [suggestions, typedKey, isKnown, artist])

  function accept(name: string) {
    acceptedRef.current = name
    setArtist(name)
  }

  // Straight into logging rather than back to search: the show was just
  // created, and for any date older than the past week the search list
  // wouldn't show it anyway. Same handoff the picker uses - see
  // app/select-festival/page.tsx.
  function logIt(show: Show) {
    localStorage.setItem(LOCAL_STORAGE_KEY, show.id)
    setActiveShow({
      id: show.id, artist: show.artist, venue: show.venue,
      city: show.city, state: show.state, isoDate: show.isoDate, imageUrl: show.imageUrl,
    })
    router.push('/log')
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setDuplicate(null)
    setSubmitting(true)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/shows/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify({ artist, venue, city, date }),
      })
      const data = await res.json()

      if (res.status === 409 && data.show) { setDuplicate(data.show); return }
      if (!res.ok) { setError(data.error ?? "Couldn't add that show."); return }

      logIt(data.show)
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const ready = artist.trim() && venue.trim() && date

  return (
    <div className="min-h-screen bg-paper text-ink pb-16">
      <BackHeader title="Add a show" href="/select-festival" />

      <form onSubmit={submit} className="px-5 pt-4 space-y-3">
        <Field label="Artist" hint="who you saw">
          <input
            value={artist}
            onChange={e => setArtist(e.target.value)}
            placeholder="Turnstile"
            autoComplete="off"
            className={fieldInput}
          />
        </Field>

        {suggestions.length > 0 && !isKnown && (
          <div className="flex flex-wrap gap-1.5 -mt-1">
            {suggestions.slice(0, 5).map(name => (
              <button
                key={name}
                type="button"
                onClick={() => accept(name)}
                className="rounded-card border-1.5 border-ink/25 bg-cream px-2.5 py-1 text-[11px] text-ink-muted"
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {nearMiss && (
          <p className="-mt-1 text-[11px] leading-snug text-ink-muted">
            Did you mean{' '}
            <button type="button" onClick={() => accept(nearMiss)} className="font-bold text-accent underline">
              {nearMiss}
            </button>
            ? Using the spelling already listed keeps your log with everyone else&apos;s.
          </p>
        )}

        {isKnown && artist.trim() && (
          <p className="-mt-1 text-[11px] text-ink-faint">Matches an artist already in Gigl.</p>
        )}

        <Field label="Date" hint="when it happened">
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className={fieldInput}
          />
        </Field>

        <Field label="Venue" hint="where it was">
          <input
            value={venue}
            onChange={e => setVenue(e.target.value)}
            placeholder="Bottom of the Hill"
            autoComplete="off"
            className={fieldInput}
          />
        </Field>

        <Field label="City" hint="optional">
          <input
            value={city}
            onChange={e => setCity(e.target.value)}
            placeholder="San Francisco, CA"
            autoComplete="off"
            className={fieldInput}
          />
        </Field>

        {error && <ErrorNote>{error}</ErrorNote>}

        {duplicate && (
          <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso p-3.5 space-y-2.5">
            <p className="text-[13px] leading-snug">
              <strong className="font-display">Already listed.</strong>{' '}
              {duplicate.artist} at {duplicate.venue} on {duplicate.isoDate}.
            </p>
            <button type="button" onClick={() => logIt(duplicate)} className={`${btnSecondary} w-full py-2.5 text-xs`}>
              Log that one instead
            </button>
          </div>
        )}

        <button type="submit" disabled={!ready || submitting} className={`${btnPrimary} w-full py-3.5 text-xs disabled:opacity-40`}>
          {submitting ? 'Adding…' : 'Add show and log it'}
        </button>

        <p className="pt-1 text-[11px] leading-snug text-ink-faint">
          Added shows stay in Gigl for everyone, so the next person who was
          there can find it rather than typing it in again.
        </p>
      </form>
    </div>
  )
}
