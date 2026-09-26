'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { setActiveShow } from '@/lib/activeShow'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { SuggestField } from '@/components/SuggestField'
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

// Adding a show the catalogue doesn't have.
//
// Ticketmaster covers ticketed rooms, and every other aggregator worth having
// is either licence-locked or has no public API at all. House shows, local
// bills and DIY spaces are in none of them at any price - the person who was
// there is the only source there will ever be.
//
// Artist, venue and city all fragment on spelling the same way - a show
// typed in as "fillmore sf" is a different room from "The Fillmore" as far as
// every future search is concerned, and the person typing has no way to know
// that. So all three offer the spelling already in the catalogue before
// accepting a new one; see components/SuggestField.tsx. None of them ever
// blocks a new value, because a band or a basement nobody has logged yet is
// exactly what this page is for.
export default function AddShowPage() {
  const router   = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [artist, setArtist] = useState('')
  const [venue, setVenue]   = useState('')
  const [city, setCity]     = useState('')
  const [date, setDate]     = useState('')

  const [submitting, setSubmitting]   = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [duplicate, setDuplicate]     = useState<Show | null>(null)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/auth')
  }, [authLoading, user, router])

  // Today in UTC, matching the server's bound in /api/shows/submit. Anything
  // later is a mistake - almost always a mistyped year - because a show you
  // haven't been to yet isn't one you can log.
  const today = useMemo(() => new Date().toISOString().slice(0, 10), [])

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
        <SuggestField
          field="artist"
          label="Artist"
          hint="who you saw"
          placeholder="Turnstile"
          value={artist}
          onChange={setArtist}
        />

        <Field label="Date" hint="when it happened">
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            className={fieldInput}
          />
        </Field>

        <SuggestField
          field="venue"
          label="Venue"
          hint="where it was"
          placeholder="Bottom of the Hill"
          value={venue}
          onChange={setVenue}
        />

        <SuggestField
          field="city"
          label="City"
          hint="optional"
          placeholder="San Francisco, CA"
          value={city}
          onChange={setCity}
        />

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
