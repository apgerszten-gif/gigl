'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Building2 } from 'lucide-react'
import { nameKey } from '@/lib/nameKey'
import type { ShowRating } from '@/lib/showRatings'
import { useShowSaving } from '@/lib/useShowSaving'
import { useStartLogging } from '@/lib/useStartLogging'
import { Logo } from '@/components/Logo'
import { PastShowRows, ShimmerRows, UpcomingShowRows, type ListedShow, type RowText } from '@/components/ShowRows'
import { ArtistPhoto, BackHeader, Card, EmptyState, ErrorNote, Label, Place, Stars, Stat, btnSecondary } from '@/components/ui'

// The body of an artist's page (/artists) or a venue's (/venues): every show
// Gigl has for it, coming up and past, each one a tap from Save or Log. The
// server page reads the catalogue and the ratings; this adds the buttons, and
// shows older than the catalogue from setlist.fm.

interface Props {
  kind:     'artist' | 'venue'
  name:     string
  // A venue's city and state. Unused for an artist.
  city?:    string
  state?:   string
  photo?:   string | null
  upcoming: ListedShow[]
  past:     ListedShow[]
  ratings:  Record<string, ShowRating>
  overall:  ShowRating | null
}

// Rows on screen before "Show more", and how many each tap adds.
const FIRST_ROWS = 10
const MORE_ROWS = 25

// Fewer past shows than this and setlist.fm is asked straight away, so a page
// for a band the catalogue barely knows isn't nearly empty. Otherwise it waits
// for a tap: setlist.fm allows 1,440 requests a day (lib/setlistfm.ts).
const AUTO_EARLIER_BELOW = 5

// setlist.fm and Ticketmaster spell acts and cities differently ("Melt‐Banana"
// with a Unicode hyphen, "The National" and "National"). Letters and digits
// only, a leading "the" dropped. Same rule as /api/shows/past.
function loose(name: string): string {
  return nameKey(name).replace(/^the /, '').replace(/[^a-z0-9]/g, '')
}

// What a venue is called on setlist.fm, which matches rooms by the start of
// their name: Ticketmaster's "Fillmore Auditorium (Denver)" and "The Fillmore
// Minneapolis presented by Affinity Plus" are "Fillmore Auditorium" and "The
// Fillmore Minneapolis" there.
function setlistVenueName(venue: string): string {
  return venue.replace(/\s*\(.*\)\s*$/, '').replace(/\s+presented by .*$/i, '').trim()
}

export function ShowsPage({ kind, name, city, state, photo, upcoming, past, ratings, overall }: Props) {
  const router = useRouter()
  const startLogging = useStartLogging()
  const { savedIds, saveFailed, toggleSave, signUpSheet } = useShowSaving()

  const [upcomingShown, setUpcomingShown] = useState(FIRST_ROWS)
  const [pastShown, setPastShown] = useState(FIRST_ROWS)

  // Arriving from the Feed's search, back should land on those results,
  // which the Feed keeps in its URL. A shared link has nothing to go back to.
  function goBack() {
    if (window.history.length > 1) router.back()
    else router.push('/feed')
  }

  // On an artist's page every row is theirs, so a row names the venue; on a
  // venue's page, the act.
  const describe = (show: ListedShow): RowText => {
    const support = show.support && show.support.length > 0 ? show.support : null
    if (kind === 'venue') {
      return { title: show.artist, place: '', note: support ? `with ${support.join(', ')}` : null }
    }
    const supporting = nameKey(show.artist) !== nameKey(name)
    return {
      title: show.venue,
      place: [show.city, show.state].filter(Boolean).join(', '),
      note:  supporting ? `Supporting ${show.artist}` : support ? `with ${support.join(', ')}` : null,
    }
  }

  // ── Earlier shows, from setlist.fm ──────────────────────────────────────
  // `a:1` and `v:1` tell /api/shows/past to read the name only as an artist,
  // or only as a venue. Each load hands back where the next one starts.
  const [earlier, setEarlier]               = useState<ListedShow[]>([])
  const [earlierNext, setEarlierNext]       = useState<string | null>(kind === 'artist' ? 'a:1' : 'v:1')
  const [earlierLoading, setEarlierLoading] = useState(false)
  const [earlierAsked, setEarlierAsked]     = useState(false)
  const loadingRef = useRef(false)

  async function loadEarlier() {
    if (!earlierNext || loadingRef.current) return
    loadingRef.current = true
    setEarlierLoading(true)
    setEarlierAsked(true)
    try {
      const params = new URLSearchParams({ q: kind === 'artist' ? name : setlistVenueName(name), cursor: earlierNext })
      if (kind === 'venue' && city) params.set('city', city)
      const res = await fetch(`/api/shows/past?${params.toString()}`)
      const data = res.ok ? await res.json() : { shows: [], next: null }
      setEarlier(shown => {
        const known = new Set([...past, ...shown].map(s => s.id))
        // A night the page already lists is the same show: setlist.fm files
        // each act's set separately, so the openers of a show the catalogue
        // has under its headliner would otherwise turn up again here.
        const listedNights = new Set(past.map(s => s.isoDate))
        // The artist search can bring back a second act with a similar name,
        // and the venue search other cities' rooms of the same name.
        const fits = (s: ListedShow) => kind === 'artist'
          ? loose(s.artist) === loose(name)
          : !city || loose(s.city) === loose(city)
        const fresh = (data.shows ?? []).filter((s: ListedShow) => !known.has(s.id) && !listedNights.has(s.isoDate) && fits(s))
        return [...shown, ...fresh]
      })
      setEarlierNext(data.next ?? null)
    } catch (err) {
      console.error('earlier shows failed:', err)
    } finally {
      loadingRef.current = false
      setEarlierLoading(false)
    }
  }

  useEffect(() => {
    if (past.length < AUTO_EARLIER_BELOW) loadEarlier()
    // Once, on arrival; later loads are the button's.
  }, [])

  const showEarlier = !earlierAsked || earlierLoading || earlier.length > 0 || earlierNext != null
  const ratingCount = overall?.count ?? 0
  const place = [city, state].filter(Boolean).join(', ')

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BackHeader title={<Logo />} onBack={goBack} />

      <div className="px-5 pt-5 pb-24 space-y-5">
        <div className="flex items-center gap-4">
          {kind === 'artist'
            ? <ArtistPhoto name={name} src={photo} className="w-24 h-24" iconSize={34} />
            : <ArtistPhoto name={name} src={null} icon={Building2} className="w-24 h-24" iconSize={34} />}
          <div className="flex-1 min-w-0 space-y-1.5">
            <Label>{kind === 'artist' ? 'Artist' : 'Venue'}</Label>
            <h1 className="font-display text-[28px] font-bold tracking-tight leading-none break-words">{name}</h1>
            {kind === 'venue' && place && <Place>{place}</Place>}
            {kind === 'artist' && overall && <Stars score={overall.score} size={20} />}
          </div>
        </div>

        <Card className="flex py-3">
          <Stat value={upcoming.length} label="Coming up" />
          <div className="flex-1 flex border-l border-ink/10">
            <Stat value={past.length} label={kind === 'artist' ? 'Past shows' : 'Past year'} />
          </div>
          <div className="flex-1 flex border-l border-ink/10">
            <Stat value={ratingCount} label="Ratings" />
          </div>
        </Card>

        {saveFailed && <ErrorNote>Couldn&apos;t update your saved shows. Try again.</ErrorNote>}

        <section>
          <Label className="mb-2">Coming up</Label>
          {upcoming.length === 0 ? (
            <EmptyState>No upcoming shows listed{kind === 'artist' ? ' for them' : ' here'} yet.</EmptyState>
          ) : (
            <div className="space-y-3">
              <UpcomingShowRows shows={upcoming.slice(0, upcomingShown)} savedIds={savedIds} onToggleSave={toggleSave} describe={describe} />
              {upcoming.length > upcomingShown && (
                <button type="button" onClick={() => setUpcomingShown(n => n + MORE_ROWS)} className={`${btnSecondary} w-full py-2.5 text-[11px]`}>
                  Show more
                </button>
              )}
            </div>
          )}
        </section>

        <section>
          <Label className="mb-2">{kind === 'artist' ? 'Past shows' : 'Past shows · last 12 months'}</Label>
          {past.length === 0 ? (
            <EmptyState>
              {kind === 'artist' ? 'Gigl hasn’t listed a past show for them yet.' : 'Gigl hasn’t listed a show here in the last year.'}
            </EmptyState>
          ) : (
            <div className="space-y-3">
              <PastShowRows shows={past.slice(0, pastShown)} onLog={startLogging} ratings={ratings} describe={describe} />
              {past.length > pastShown && (
                <button type="button" onClick={() => setPastShown(n => n + MORE_ROWS)} className={`${btnSecondary} w-full py-2.5 text-[11px]`}>
                  Show more
                </button>
              )}
            </div>
          )}
        </section>

        {/* setlist.fm's terms ask for a credit wherever its data appears,
            with a link search engines can follow - so no rel="nofollow". */}
        {showEarlier && (
          <section>
            <div className="flex items-baseline justify-between gap-3 pb-2">
              <Label>More past shows</Label>
              <a
                href="https://www.setlist.fm"
                target="_blank"
                rel="noopener"
                className="text-[10px] font-semibold uppercase tracking-label text-ink-faint underline underline-offset-[3px] hover:text-accent"
              >
                via setlist.fm
              </a>
            </div>
            <div className="space-y-3">
              {earlier.length > 0 && <PastShowRows shows={earlier} onLog={startLogging} describe={describe} />}
              {earlierLoading && <ShimmerRows count={2} />}
              {!earlierLoading && earlierNext && (
                <button type="button" onClick={loadEarlier} className={`${btnSecondary} w-full py-2.5 text-[11px]`}>
                  {earlierAsked ? 'Show earlier shows' : 'Look for older shows'}
                </button>
              )}
            </div>
          </section>
        )}
      </div>

      {signUpSheet}
    </div>
  )
}
