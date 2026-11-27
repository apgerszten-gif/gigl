import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { searchArtists, showsForArtists, showsOnDate } from '@/lib/shows/repository'
import { nameKey } from '@/lib/nameKey'
import { windowEndIso } from '@/lib/dates'
import type { Show } from '@/lib/ticketmaster'
import type { PhotoInput, PhotoRead, PhotoResult, PhotoShow } from '@/lib/photos/types'

// POST /api/photos/read - finds the shows someone has been to from their
// photos: tickets, confirmation emails, posters, marquees, a story with the
// artist tagged. Claude reads whatever is printed in each picture (artist,
// venue, date), and the catalogue turns that into shows to log. The camera's
// own date and (rounded) place, read on the phone from the photo's EXIF,
// narrow it down when the picture says little.
//
//   { photos: [{ data: <base64 JPEG>, takenOn?, lat?, lng? }] }
//   -> { reads, shows }
//
// Nobody has to be signed in, so each address gets a few reads in a short
// window. Pictures are held for the length of the request and never stored.
// Needs ANTHROPIC_API_KEY (503 without it).

// supabase-js reads go in the Data Cache without this - see the search route.
export const fetchCache = 'default-no-store'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MODEL = 'claude-opus-5-5'
const MAX_PHOTOS = 6
const MAX_IMAGE_CHARS = 1_200_000
const MAX_SHOWS = 30

const READS_PER_WINDOW = 6
const WINDOW_MS = 10 * 60 * 1000
const recentReads = new Map<string, number[]>()

function allowRead(address: string): boolean {
  const now = Date.now()
  const times = (recentReads.get(address) ?? []).filter(t => now - t < WINDOW_MS)
  if (times.length >= READS_PER_WINDOW) { recentReads.set(address, times); return false }
  times.push(now)
  recentReads.set(address, times)
  return true
}

const INSTRUCTIONS = `These are photos and screenshots from one person's phone, and they may be from live music shows they went to: a ticket or e-ticket, a confirmation email, a poster, a venue marquee, a screen or banner behind the stage, a wristband, a set list, a social post.

For each picture (numbered in order, starting at 0), read only what is actually printed or displayed in it:
- artists: the performers named, headliner first. Never guess who someone is from how they look, and don't list the venue or promoter. Empty if no performer is named.
- venue: the venue's name if shown, else null.
- city: the city if shown, else null.
- date: the show's date as YYYY-MM-DD if the full date including the year is shown, else null.
- month_day: MM-DD when a day and month are shown but not the year, else null.

A picture with nothing readable (a crowd, a stage with no names, a selfie) gets empty artists and nulls. Write names as they are properly written.`

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    photos: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index:     { type: 'integer' },
          artists:   { type: 'array', items: { type: 'string' } },
          venue:     { type: ['string', 'null'] },
          city:      { type: ['string', 'null'] },
          date:      { type: ['string', 'null'] },
          month_day: { type: ['string', 'null'] },
        },
        required: ['index', 'artists', 'venue', 'city', 'date', 'month_day'],
        additionalProperties: false,
      },
    },
  },
  required: ['photos'],
  additionalProperties: false,
}

const ISO = /^\d{4}-\d{2}-\d{2}$/

function isPhoto(value: unknown): value is PhotoInput {
  const photo = value as PhotoInput
  return !!photo
    && typeof photo.data === 'string'
    && photo.data.length > 0
    && photo.data.length <= MAX_IMAGE_CHARS
    && /^[A-Za-z0-9+/=]+$/.test(photo.data.slice(0, 200))
}

function cleanText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, 120) : null
}

function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T12:00:00Z`)
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}

// A date with no year ("Oct 12"): the latest one that isn't in the future,
// unless the photo's own year says otherwise.
function resolveMonthDay(monthDay: string, takenOn: string | null, today: string): string | null {
  const m = /^(\d{2})-(\d{2})$/.exec(monthDay)
  if (!m) return null
  const year = takenOn ? Number(takenOn.slice(0, 4)) : Number(today.slice(0, 4))
  let iso = `${year}-${m[1]}-${m[2]}`
  if (!takenOn && iso > today) iso = `${year - 1}-${m[1]}-${m[2]}`
  return ISO.test(iso) && !Number.isNaN(Date.parse(iso)) ? iso : null
}

const sameName = (a: string, b: string) => {
  const x = nameKey(a), y = nameKey(b)
  return !!x && !!y && (x === y || (Math.min(x.length, y.length) >= 5 && (x.includes(y) || y.includes(x))))
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[photos/read] ANTHROPIC_API_KEY is not set')
    return NextResponse.json({ error: "Reading photos isn't switched on yet." }, { status: 503 })
  }

  const address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!allowRead(address)) {
    return NextResponse.json({ error: 'Too many tries in a row. Give it a few minutes.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null) as { photos?: unknown } | null
  const photos = Array.isArray(body?.photos) ? body!.photos.filter(isPhoto).slice(0, MAX_PHOTOS) : []
  if (photos.length === 0) return NextResponse.json({ error: 'Add a photo first.' }, { status: 400 })

  const content: Anthropic.Beta.BetaContentBlockParam[] = []
  photos.forEach((photo, i) => {
    content.push({ type: 'text', text: `Picture ${i}:` })
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: photo.data } })
  })
  content.push({ type: 'text', text: INSTRUCTIONS })

  const client = new Anthropic({ timeout: 50_000, maxRetries: 1 })
  let response: Anthropic.Beta.BetaMessage
  try {
    response = await client.beta.messages.create({
      model:      MODEL,
      max_tokens: 3000,
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      betas:      ['server-side-fallback-2026-07-01'],
      fallbacks:  'default',
      messages:   [{ role: 'user', content }],
    })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error('[photos/read] rate limited:', err.message)
      return NextResponse.json({ error: 'Lots of people are adding photos right now. Try again in a minute.' }, { status: 503 })
    }
    console.error('[photos/read] failed:', err instanceof Anthropic.APIError ? `API ${err.status}: ${err.message}` : err)
    return NextResponse.json({ error: "Couldn't read those photos. Try again." }, { status: 502 })
  }

  if (response.stop_reason === 'refusal') {
    console.error('[photos/read] declined:', response.stop_details?.category ?? 'no category')
    return NextResponse.json({ error: "Couldn't read those photos. Try different ones." }, { status: 422 })
  }

  const text = response.content.find((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')?.text
  let parsed: { photos?: unknown } | null = null
  try { parsed = text ? JSON.parse(text) : null } catch { parsed = null }
  if (!parsed || !Array.isArray(parsed.photos)) {
    console.error('[photos/read] unreadable answer, stop_reason', response.stop_reason)
    return NextResponse.json({ error: "Couldn't read those photos. Try again." }, { status: 502 })
  }

  const today = windowEndIso()
  const reads: PhotoRead[] = []
  const rawReads = parsed.photos as { index?: unknown; artists?: unknown; venue?: unknown; city?: unknown; date?: unknown; month_day?: unknown }[]
  for (const raw of rawReads) {
    const index = typeof raw?.index === 'number' ? raw.index : -1
    if (index < 0 || index >= photos.length) continue
    const takenOn = typeof photos[index].takenOn === 'string' && ISO.test(photos[index].takenOn!) ? photos[index].takenOn : null
    const printed = typeof raw.date === 'string' && ISO.test(raw.date) ? raw.date : null
    const monthDay = typeof raw.month_day === 'string' ? resolveMonthDay(raw.month_day, takenOn, today) : null
    reads.push({
      index,
      artists: (Array.isArray(raw.artists) ? raw.artists : []).map(cleanText).filter((n): n is string => !!n).slice(0, 4),
      venue:   cleanText(raw.venue),
      city:    cleanText(raw.city),
      date:    printed ?? monthDay,
    })
  }

  try {
    const shows = await matchShows(reads, photos, today)
    const result: PhotoResult = { reads, shows }
    return NextResponse.json(result)
  } catch (err) {
    console.error('[photos/read] matching failed:', err)
    return NextResponse.json({ error: "Couldn't look those up. Try again." }, { status: 500 })
  }
}

// Turn what each picture said into the catalogue's shows. A named artist is
// the strongest clue (with a date, it's nearly certain); with no artist, the
// day the photo was taken plus the venue named or the place it was taken
// finds the show that night.
async function matchShows(reads: PhotoRead[], photos: PhotoInput[], today: string): Promise<PhotoShow[]> {
  const found = new Map<string, PhotoShow>()
  const add = (show: Show, photo: number, why: PhotoShow['why']) => {
    if (!show.isoDate || show.isoDate > today) return
    const existing = found.get(show.id)
    if (existing) {
      if (!existing.photos.includes(photo)) existing.photos.push(photo)
      return
    }
    found.set(show.id, {
      id: show.id, artist: show.artist, support: show.support, venue: show.venue, city: show.city, state: show.state,
      isoDate: show.isoDate, imageUrl: show.imageUrl ?? null, photos: [photo], why,
    })
  }

  const yearAgo = addDays(today, -365)

  await Promise.all(reads.map(async read => {
    const meta = photos[read.index]
    const date = read.date ?? meta.takenOn
    const near = meta.lat != null && meta.lng != null ? { lat: meta.lat, lng: meta.lng } : null

    if (read.artists.length > 0) {
      // Settle each name to the catalogue's spelling first.
      const names: string[] = []
      for (const name of read.artists) {
        const candidates = await searchArtists(name, 6)
        const hit = candidates.find(c => nameKey(c.name) === nameKey(name)) ?? candidates.find(c => sameName(c.name, name))
        if (hit) names.push(hit.name)
      }
      const byArtist = await showsForArtists(names)
      for (const name of names) {
        const past = (byArtist.get(name) ?? []).filter(s => s.isoDate && s.isoDate <= today)
        if (date) {
          // A concert photo can be stamped after midnight.
          const day = past.filter(s => s.isoDate === date || s.isoDate === addDays(date, -1))
          day.forEach(s => add(s, read.index, 'artist and date'))
        } else {
          past.filter(s => s.isoDate! >= yearAgo)
            .sort((a, b) => b.isoDate!.localeCompare(a.isoDate!))
            .slice(0, 3)
            .forEach(s => add(s, read.index, 'artist'))
        }
      }
      return
    }

    // No performer named: the date and a place.
    if (!date || (!near && !read.venue)) return
    const nights = await Promise.all([showsOnDate(date, near), showsOnDate(addDays(date, -1), near)])
    const atPlace = nights.flat().filter(s => {
      if (read.venue && sameName(s.venue, read.venue)) return true
      return !!near && s.distanceMiles != null && s.distanceMiles <= 3
    })
    atPlace.slice(0, 5).forEach(s => add(s, read.index, 'date and place'))
  }))

  return Array.from(found.values())
    .sort((a, b) => (b.isoDate ?? '').localeCompare(a.isoDate ?? '') || a.id.localeCompare(b.id))
    .slice(0, MAX_SHOWS)
}
