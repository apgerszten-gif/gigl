// setlist.fm: where a show from before the catalogue began comes from.
//
// Ticketmaster has no past events, so the `shows` catalogue only holds what
// the nightly sync captured while a show was still upcoming (see
// lib/ticketmaster.ts) - it starts on the day that capture began. For
// anything older, search asks setlist.fm, whose users have logged most
// touring acts' shows for decades. Coverage is thin for residencies, tribute
// nights and small local bills; Add a show is the answer there.
//
// Its terms (setlist.fm/help/terms) shape this file:
//  - Non-commercial use only. Gigl is free; charging for it needs a licence
//    from setlist.fm first.
//  - Attribution wherever its data appears, with a followable link. See the
//    "via setlist.fm" label on /select-festival.
//  - No copies beyond short-term caching. Results are cached for
//    CACHE_SECONDS and never written to `shows`. A show only reaches the
//    database as part of someone's own log: the artist, venue and date they
//    would otherwise have typed into Add a show.
//  - A standard key allows 2 requests a second and 1,440 a day. Hence the
//    caching, the page cap, and giving up quietly when it says no.

import { nameKey } from './nameKey'
import { formatShowDate, retainStartIso, windowEndIso } from './dates'
import { distanceInMiles, type Coords } from './geo'
import type { Show } from './ticketmaster'

const API = 'https://api.setlist.fm/rest/1.0/search/setlists'

const MIN_QUERY_LENGTH = 3
const CACHE_SECONDS    = 6 * 60 * 60

// 20 setlists to a page, newest first, upcoming dates included. An act on a
// busy tour can fill a page with two months, so later pages are read while
// they are still inside the year - up to this many.
const MAX_PAGES = 3
// Paging one search stays under the 2-a-second limit on its own.
const PAGE_GAP_MS = 550

// Shown on every result. setlist.fm has no photo when the artist_images
// table doesn't either.
const EMOJI = '🎤'

interface Setlist {
  eventDate: string  // 'dd-MM-yyyy'
  artist: { mbid: string; name: string }
  venue: {
    id:   string
    name: string
    city: {
      name:       string
      stateCode?: string
      coords?:    { lat: number; long: number }
      country:    { code: string }
    }
  }
}

type SearchField = 'artistName' | 'venueName'

// Next's Data Cache only keeps 200s, so a search that matched nothing would
// otherwise cost a request every time someone typed it. Per instance, which
// is enough to stop one person's retyping from burning the daily quota.
const noMatch = new Map<string, number>()

function isoFromSetlistDate(date: string): string | null {
  const m = /^(\d{2})-(\d{2})-(\d{4})$/.exec(date)
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// One page, or null when setlist.fm couldn't answer (no key, a 429, an
// outage). null stops the paging; an empty page is a real "no more".
async function fetchPage(field: SearchField, value: string, page: number): Promise<Setlist[] | null> {
  const key = process.env.SETLISTFM_API_KEY
  if (!key) return null

  const cacheKey = `${field}:${value}:${page}`
  const missedAt = noMatch.get(cacheKey)
  if (missedAt && Date.now() - missedAt < CACHE_SECONDS * 1000) return []

  try {
    const res = await fetch(`${API}?${new URLSearchParams({ [field]: value, p: String(page) })}`, {
      headers: { 'x-api-key': key, Accept: 'application/json', 'Accept-Language': 'en' },
      next: { revalidate: CACHE_SECONDS },
    })
    // setlist.fm answers an empty search with a 404.
    if (res.status === 404) {
      noMatch.set(cacheKey, Date.now())
      return []
    }
    if (!res.ok) {
      console.error(`[setlistfm] ${field}="${value}" page ${page}: HTTP ${res.status}`)
      return null
    }
    const body = await res.json() as { setlist?: Setlist[] }
    return body.setlist ?? []
  } catch (err) {
    console.error(`[setlistfm] ${field}="${value}" page ${page} failed:`, err)
    return null
  }
}

// Every setlist inside [since, until], newest first, reading pages until
// they run past `since`, run out, or hit MAX_PAGES.
async function searchField(field: SearchField, value: string, since: string, until: string): Promise<Setlist[]> {
  const found: Setlist[] = []
  for (let page = 1; page <= MAX_PAGES; page++) {
    if (page > 1) await sleep(PAGE_GAP_MS)
    const setlists = await fetchPage(field, value, page)
    if (!setlists || setlists.length === 0) break

    for (const s of setlists) {
      const iso = isoFromSetlistDate(s.eventDate)
      if (iso && iso >= since && iso <= until) found.push(s)
    }

    const oldest = isoFromSetlistDate(setlists[setlists.length - 1].eventDate)
    if (setlists.length < 20 || !oldest || oldest < since) break
  }
  return found
}

// Stable across setlist.fm's own duplicates (two people can each post the
// same show), so everyone who logs a show shares one id and one ranking.
function showId(s: Setlist, isoDate: string): string {
  return `setlistfm-${s.artist.mbid || nameKey(s.artist.name)}-${s.venue.id}-${isoDate}`
}

export interface PastShowSearch {
  nearby?: { centre: Coords; radiusMiles: number } | null
}

// Past shows matching `query` from the last year, as the same Show shape the
// catalogue search returns. Tried as an artist first, and as a venue when no
// artist matches - "casbah" is as likely a search as a band. Empty on a
// short query, a missing key, or anything setlist.fm says no to: this only
// ever adds to what the catalogue found.
export async function searchPastShows(query: string, options: PastShowSearch = {}): Promise<Show[]> {
  const value = query.trim()
  if (value.length < MIN_QUERY_LENGTH) return []

  const since = retainStartIso()
  const until = windowEndIso()

  let setlists = await searchField('artistName', value, since, until)
  if (setlists.length === 0) setlists = await searchField('venueName', value, since, until)

  const seen = new Set<string>()
  const shows: Show[] = []
  for (const s of setlists) {
    const isoDate = isoFromSetlistDate(s.eventDate)!
    const id = showId(s, isoDate)
    if (seen.has(id)) continue
    seen.add(id)

    const coords = s.venue.city.coords
    const distanceMiles = options.nearby && coords
      ? distanceInMiles(options.nearby.centre, { lat: coords.lat, lng: coords.long })
      : undefined
    // Near me filters on the city's centre - setlist.fm places venues no
    // closer than that - and drops a show it can't place at all.
    if (options.nearby && (distanceMiles == null || distanceMiles > options.nearby.radiusMiles)) continue

    const country = s.venue.city.country.code
    shows.push({
      id,
      artist:   s.artist.name,
      venue:    s.venue.name,
      city:     s.venue.city.name,
      // A US or Canadian state code reads as a state; elsewhere the country
      // is the more useful half of the place line.
      state:    country === 'US' || country === 'CA' ? s.venue.city.stateCode ?? '' : country,
      date:     formatShowDate(isoDate),
      isoDate,
      emoji:    EMOJI,
      imageUrl: null,
      distanceMiles,
    })
  }
  return shows
}
