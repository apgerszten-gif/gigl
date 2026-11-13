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
}

// A logged show as a list row, from one of its logs. A log keeps the venue's
// name but not its city. A festival set's place is its stage and day, and it
// isn't offered for logging from a list: it's logged from its lineup, which
// knows the stage.
function listedFromLog(log: ArtistLog): ListedShow {
  const festival = log.stage ? festivalNameOf(log.artist_id) : null
  const day = log.day ? log.day.charAt(0).toUpperCase() + log.day.slice(1) : null
  return {
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
  }
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
      .select('artist_id, artist_name, venue, stage, day, show_date, performance_rating, venue_rating')
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
  const loggedOnly = new Map<string, ListedShow>()
  for (const log of logs) {
    if (catalogueIds.has(log.artist_id) || loggedOnly.has(log.artist_id)) continue
    loggedOnly.set(log.artist_id, listedFromLog(log))
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

// Logs read per Feed search before they're grouped into shows. Plenty for a
// name search; the newest come first, so a very common word loses only the
// oldest shows.
const REVIEWED_SCAN = 500

// The Feed search's first section: shows people have rated whose artist or
// venue matches what was typed, most-rated first, so the reviews (and the
// setlist) are a tap away before anything to log or save. Any show logged at
// all counts - catalogue, setlist.fm, user-added or a festival set - and the
// catalogue fills in the city and photo where it has the show.
export async function reviewedShows(query: string, limit: number): Promise<{ shows: ListedShow[]; ratings: Record<string, ShowRating> }> {
  // .or() reads commas and brackets as syntax; LIKE reads % and _.
  const term = query.replace(/[,()\\%_]/g, ' ').trim()
  if (!term) return { shows: [], ratings: {} }

  const { data, error } = await supabase
    .from('logged_shows')
    .select('artist_id, artist_name, venue, stage, day, show_date, performance_rating, venue_rating')
    .or(`artist_name.ilike.%${term}%,venue.ilike.%${term}%`)
    .order('show_date', { ascending: false, nullsFirst: false })
    .limit(REVIEWED_SCAN)
  if (error) {
    console.error('reviewed shows lookup failed:', error.message)
    return { shows: [], ratings: {} }
  }

  const logs = (data ?? []) as ArtistLog[]
  const ratings = tallyRatings(logs)
  const first = new Map<string, ArtistLog>()
  logs.forEach(log => { if (ratings[log.artist_id] && !first.has(log.artist_id)) first.set(log.artist_id, log) })

  const picked = Array.from(first.values())
    .sort((a, b) => ratings[b.artist_id].count - ratings[a.artist_id].count
      || (b.show_date ?? '').localeCompare(a.show_date ?? ''))
    .slice(0, limit)
  if (picked.length === 0) return { shows: [], ratings: {} }

  const { data: listings } = await supabase
    .from('shows').select('id, venue, city, state, image_url')
    .in('id', picked.map(log => log.artist_id))
  const listing = new Map((listings ?? []).map(row => [row.id as string, row]))

  const shows = picked.map(log => {
    const row = listing.get(log.artist_id)
    const show = listedFromLog(log)
    return row
      ? { ...show, venue: row.venue ?? show.venue, city: row.city ?? '', state: row.state ?? '', imageUrl: row.image_url ?? null }
      : show
  })
  return { shows, ratings: Object.fromEntries(shows.map(s => [s.id, ratings[s.id]])) }
}
