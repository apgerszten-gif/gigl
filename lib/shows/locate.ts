// Where a logged show happened, at city level, so the Feed can show what was
// logged near you (Near me on /feed). A log keeps only the venue's name, so
// this works it out from the show's id, the same id logged_shows.artist_id
// carries:
//
//  - a catalogue row (Ticketmaster, a venue's own site, an imported festival
//    like CRSSD, or one someone added): its own coordinates, or for an added
//    show that has none, its city's (findCities - no geocoder);
//  - a set from a festival lineup in lib/festivals.ts: the festival's city;
//  - a setlist.fm show ('setlistfm-<artist>-<venue id>-<date>'): the city
//    setlist.fm files that venue under.
//
// Server-only. The answer is saved onto the log (logged_shows.city/lat/lng)
// by lib/pendingLogs.ts once a log syncs, and by
// scripts/backfill-log-places.mjs for logs made before that.

import { supabase } from '../supabase'
import { festivalOfArtist } from '../festivals'
import { findVenueCity } from '../setlistfm'
import { findCities } from './repository'

export interface ShowPlace {
  city: string
  lat:  number
  lng:  number
}

// Three decimal places is about 100m: enough for "near me", no more precise
// than a venue's own address.
const round = (n: number) => Math.round(n * 1000) / 1000

function place(city: string, lat: number, lng: number): ShowPlace {
  return { city, lat: round(lat), lng: round(lng) }
}

// A city's coordinates from the catalogue's own rows (or SYNC_CITIES), only
// when the name matches exactly: "Portland" must not land in Portland, ME
// for a show in Portland, OR, so the state narrows it when there is one.
async function cityPlace(city: string, state: string): Promise<ShowPlace | null> {
  const name = city.trim()
  if (name.length < 2) return null
  const region = state.trim().length === 2 ? state.trim() : ''
  const matches = await findCities(region ? `${name}, ${region}` : name)
  const exact = matches.find(m => m.city.toLowerCase() === name.toLowerCase()
    && (!region || m.state.toUpperCase() === region.toUpperCase()))
  return exact ? place(exact.city, exact.lat, exact.lng) : null
}

// setlistfm-<artist mbid or name>-<venue id>-<yyyy-mm-dd>; the venue id is
// hex with no dashes, the segment just before the date.
function setlistVenueId(showId: string): string | null {
  const m = /^setlistfm-.+-([0-9a-f]{4,12})-\d{4}-\d{2}-\d{2}$/i.exec(showId)
  return m ? m[1] : null
}

// Null when the show can't be placed, undefined when the answer depends on
// setlist.fm and it couldn't be reached (worth asking again later).
export async function locateShow(showId: string): Promise<ShowPlace | null | undefined> {
  const id = showId.trim()
  if (!id) return null

  const { data: row } = await supabase
    .from('shows').select('city, state, lat, lng').eq('id', id).maybeSingle()
  if (row?.lat != null && row?.lng != null) return place(row.city ?? '', row.lat, row.lng)
  if (row?.city) return cityPlace(row.city, row.state ?? '')

  const festival = festivalOfArtist(id)
  if (festival) return cityPlace(festival.city, festival.state)

  const venueId = setlistVenueId(id)
  if (venueId) {
    const venue = await findVenueCity(venueId)
    return venue ? place(venue.city, venue.lat, venue.lng) : venue
  }
  return null
}
