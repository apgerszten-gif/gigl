// Everything Gigl knows about one artist's or one venue's shows, for the
// /artists and /venues pages: the catalogue's rows (a year back, a year
// ahead), split into what's coming up and what's happened, with Gigl's own
// ratings attached. Server-only; reads without a session, like the other
// server-rendered pages.

import { supabase } from '../supabase'
import { windowEndIso } from '../dates'
import { getArtistImages } from '../artistImages'
import { nameKey } from '../nameKey'
import { ratingsForShows, tallyRatings, overallRating, type ShowRating } from '../showRatings'
import { festivalNameOf } from '../festivals'
import { showsAtVenue, showsByArtist } from './repository'
import type { ListedShow } from '@/components/ShowRows'
import type { Show } from '../ticketmaster'

export interface ShowHistory {
  upcoming: ListedShow[]
  past:     ListedShow[]
  ratings:  Record<string, ShowRating>
  overall:  ShowRating | null
}

function listed(show: Show): ListedShow {
  return {
    id:       show.id,
    artist:   show.artist,
    support:  show.support,
    venue:    show.venue,
    city:     show.city,
    state:    show.state,
    isoDate:  show.isoDate,
    imageUrl: show.imageUrl,
  }
}

// Today is on the past side, the way the Log screen counts it: a show earlier
// this evening can already be logged. See windowEndIso.
function split(shows: ListedShow[]): { upcoming: ListedShow[]; past: ListedShow[] } {
  const today = windowEndIso()
  const upcoming = shows.filter(s => s.isoDate != null && s.isoDate > today)
  const past = shows
    .filter(s => s.isoDate == null || s.isoDate <= today)
    .sort((a, b) => (b.isoDate ?? '').localeCompare(a.isoDate ?? ''))
  return { upcoming, past }
}

interface ArtistLog {
  artist_id:          string
  artist_name:        string
  venue:              string | null
  stage:              string | null
  day:                string | null
  show_date:          string | null
  performance_rating: number | null
  venue_rating:       number | null
  crowd_rating:       number | null
}

// An artist's page. Gigl's own logs count as shows too: the catalogue only
// keeps a year, and setlist.fm shows and festival sets are never stored in
// it, so a show someone logged may be the only record of it Gigl has.
export async function artistHistory(name: string): Promise<ShowHistory & { name: string; photo: string | null }> {
  const exact = name.trim().replace(/[\\%_]/g, ch => `\\${ch}`)
  const [catalogue, logs, photoOf] = await Promise.all([
    showsByArtist(name),
    supabase
      .from('logged_shows')
      .select('artist_id, artist_name, venue, stage, day, show_date, performance_rating, venue_rating, crowd_rating')
      .ilike('artist_name', exact)
      .limit(1000)
      .then(({ data, error }) => {
        if (error) console.error('artist logs lookup failed:', error.message)
        return (data ?? []) as ArtistLog[]
      }),
    getArtistImages(supabase, [name]),
  ])

  const catalogueIds = new Set(catalogue.map(s => s.id))
  const photo = photoOf(name) ?? catalogue.find(s => s.imageUrl)?.imageUrl ?? null

  // One row per logged show the catalogue doesn't have, from its first log.
  // A festival set's place is its stage and day, and it isn't offered for
  // logging here: it's logged from its lineup, which knows the stage.
  const loggedOnly = new Map<string, ListedShow>()
  for (const log of logs) {
    if (catalogueIds.has(log.artist_id) || loggedOnly.has(log.artist_id)) continue
    const festival = log.stage ? festivalNameOf(log.artist_id) : null
    const day = log.day ? log.day.charAt(0).toUpperCase() + log.day.slice(1) : null
    loggedOnly.set(log.artist_id, {
      id:       log.artist_id,
      artist:   log.artist_name,
      venue:    log.stage
        ? [log.stage, day].filter(Boolean).join(' · ') + (festival ? ` (${festival})` : '')
        : log.venue ?? '',
      city:     '',
      state:    '',
      isoDate:  log.show_date,
      imageUrl: null,
      canLog:   !log.stage,
    })
  }

  // Catalogue rows where this artist was support are rated under the
  // headliner's name, so those ratings come by id.
  const ratings = {
    ...tallyRatings(logs),
    ...(await ratingsForShows(supabase, catalogue.map(s => s.id))),
  }

  // A listing's own photo is of its headliner, so a show this artist
  // supported takes their photo instead.
  const shows = [...catalogue.map(listed), ...Array.from(loggedOnly.values())]
    .map(s => (s.imageUrl && nameKey(s.artist) === nameKey(name) ? s : { ...s, imageUrl: photo ?? s.imageUrl }))

  // The catalogue's spelling, where it has one, is the one people search by.
  const display = catalogue.find(s => nameKey(s.artist) === nameKey(name))?.artist ?? logs[0]?.artist_name ?? name.trim()

  return { name: display, photo, ...split(shows), ratings, overall: overallRating(ratings) }
}

// A venue's page. Only catalogue rows: a log carries a venue's name but not
// its city, and nine cities have a Fillmore.
export async function venueHistory(name: string, city: string | null, state: string | null): Promise<ShowHistory & { name: string; city: string; state: string }> {
  const catalogue = await showsAtVenue(name, city, state)

  const unphotographed = catalogue.filter(s => !s.imageUrl).map(s => s.artist)
  const [photoOf, ratings] = await Promise.all([
    unphotographed.length > 0 ? getArtistImages(supabase, unphotographed) : Promise.resolve(() => null),
    ratingsForShows(supabase, catalogue.map(s => s.id)),
  ])
  const shows = catalogue.map(s => listed(s.imageUrl ? s : { ...s, imageUrl: photoOf(s.artist) }))

  const first = catalogue[0]
  return {
    name:  first?.venue ?? name.trim(),
    city:  first?.city ?? city ?? '',
    state: first?.state ?? state ?? '',
    ...split(shows),
    ratings,
    overall: overallRating(ratings),
  }
}
