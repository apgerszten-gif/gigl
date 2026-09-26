import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/apiAuth'
import { nameKey } from '@/lib/nameKey'
import { windowEndIso } from '@/lib/dates'
import { insertUserShow, showsOnDate, suggestValues, type SuggestField } from '@/lib/shows/repository'

// POST /api/shows/submit — add a show the catalogue doesn't have.
//
// Ticketmaster covers ticketed rooms. House shows, local bills and DIY spaces
// aren't in it, aren't in DICE or Resident Advisor either, and aren't in any
// aggregator at any price - the person who was standing there is the only
// available source. This is that route.
//
// Signed-in only, and written with the service role like every other write to
// `shows`: the table has no client insert policy, so the checks below can't be
// skipped by posting at PostgREST directly.

// supabase-js reads go in the Data Cache without this - see the search route.
export const fetchCache = 'default-no-store'

const MAX_LEN = 120

// Nothing before recorded live music is plausibly being logged, and the bound
// mostly exists to catch a typo'd year rather than to police history.
const EARLIEST_DATE = '1950-01-01'

interface Body {
  artist?: unknown
  venue?:  unknown
  city?:   unknown
  date?:   unknown
}

function cleanText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : ''
}

// "Oakland, CA" -> { city: 'Oakland', state: 'CA' }. One field rather than
// two: people type the place the way they say it, and splitting it here is
// less friction than making them tab between boxes for it.
function splitCity(input: string): { city: string; state: string } {
  const [city, ...rest] = input.split(',')
  const tail = rest.join(',').trim()
  const state = /^[A-Za-z]{2}$/.test(tail) ? tail.toUpperCase() : ''
  // A tail that isn't a state code stays part of the city, so "Stoke-on-Trent,
  // Staffordshire" doesn't silently lose half of itself.
  return state
    ? { city: city.trim(), state }
    : { city: input.trim(), state: '' }
}

export async function POST(req: NextRequest) {
  // Checked before the auth call, which itself needs the service role to
  // verify a token. Without this the route throws a raw 500 and the form
  // shows "something went wrong" for what is really a deploy that hasn't
  // been configured - the same guard the sync route uses.
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[shows/submit] SUPABASE_SERVICE_ROLE_KEY is not set; refusing to run')
    return NextResponse.json({ error: 'Adding shows is not configured yet.' }, { status: 503 })
  }

  const userId = await getAuthenticatedUserId(req)
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to add a show.' }, { status: 401 })
  }

  let body: Body
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  const artist = cleanText(body.artist)
  const venue  = cleanText(body.venue)
  const date   = cleanText(body.date)
  const city   = cleanText(body.city)

  if (!artist) return NextResponse.json({ error: 'Who did you see?' }, { status: 400 })
  if (!venue)  return NextResponse.json({ error: 'Where was it?' }, { status: 400 })
  if (!date)   return NextResponse.json({ error: 'When was it?' }, { status: 400 })

  if (artist.length > MAX_LEN || venue.length > MAX_LEN || city.length > MAX_LEN) {
    return NextResponse.json({ error: 'That is longer than we can store.' }, { status: 400 })
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
    return NextResponse.json({ error: "That date doesn't look right." }, { status: 400 })
  }

  // Gigl is a record of shows you went to, so a future date is always a
  // mistake - usually the year. The same reasoning as the past-week search
  // window: you cannot rate a show that hasn't happened.
  if (date > windowEndIso()) {
    return NextResponse.json({ error: "That's in the future — you can only log shows you've been to." }, { status: 400 })
  }
  if (date < EARLIEST_DATE) {
    return NextResponse.json({ error: "That date doesn't look right." }, { status: 400 })
  }

  try {
    // Canonicalise the spelling of all three. If the catalogue already knows
    // this artist, venue or city, store its version so the submission joins
    // what's there rather than starting a near-duplicate beside it. Matching
    // is on the normalised key, so this only ever changes case, accents and
    // whitespace - a genuinely new value is stored exactly as typed.
    //
    // Done server-side as well as in the form because the form's suggestions
    // are a courtesy, not a gate: a slow lookup, a dismissed prompt or a
    // direct POST all land here.
    const canonicalise = async (field: SuggestField, value: string) => {
      if (!value) return value
      const known = await suggestValues(field, value, 25)
      return known.find(name => nameKey(name) === nameKey(value)) ?? value
    }

    const canonical = await canonicalise('artist', artist)
    const canonicalVenue = await canonicalise('venue', venue)
    // Canonicalised whole ("San Francisco, CA") and split afterwards, so the
    // state code comes from the catalogue's spelling rather than the typing.
    const place = splitCity(await canonicalise('city', city))

    // Already listed? A date is exact where names aren't, so it narrows
    // cheaply, and artist-on-a-date is a strong enough signal on its own -
    // the same act playing two venues in one city on one night is rare
    // enough not to design around, and the caller is shown the match either
    // way rather than being told no.
    const sameDay = await showsOnDate(date)
    const existing = sameDay.find(show => nameKey(show.artist) === nameKey(canonical))
    if (existing) {
      return NextResponse.json(
        { error: 'That show is already listed.', show: existing },
        { status: 409 },
      )
    }

    const show = await insertUserShow({
      artist:  canonical,
      venue:   canonicalVenue,
      city:    place.city,
      state:   place.state,
      isoDate: date,
      userId,
    })

    return NextResponse.json({ show }, { status: 201 })
  } catch (err) {
    console.error('shows/submit failed:', err)
    return NextResponse.json({ error: "Couldn't add that show right now." }, { status: 502 })
  }
}
