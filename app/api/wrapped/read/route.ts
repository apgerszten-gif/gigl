import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { nameKey } from '@/lib/nameKey'
import { resolveSongs, type SongRead } from '@/lib/wrapped/songs'
import type { ReadResult, WrappedImage } from '@/lib/wrapped/types'

// POST /api/wrapped/read - reads the artists off someone's Spotify Wrapped
// screenshots (the Top artists and Top songs cards) with Claude.
//
//   { images: [{ card: 'artists' | 'songs', data: <base64 JPEG> }] }
//   -> { artists, songArtists, notWrapped }
//
// No account needed: the Wrapped popup is for people who haven't signed up
// yet too. That makes this an open door to a paid API, so each address gets
// a few reads in a short window (READS_PER_WINDOW). The pictures are only
// held for the length of the request; nothing is stored.
//
// Needs ANTHROPIC_API_KEY. Without it the route answers 503 and the upload
// sheet says reading isn't available.

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const MODEL = 'claude-opus-5-5'

// One picture, resized on the phone to well under this.
const MAX_IMAGES = 1
const MAX_IMAGE_CHARS = 3_000_000
const MAX_NAMES = 10

// Per address, in this instance's memory. Instances come and go, so this is
// a speed bump against a script, not an exact quota.
const READS_PER_WINDOW = 8
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

const INSTRUCTIONS = `This is a screenshot of someone's Spotify Wrapped, the yearly listening recap. Its summary card has a Top Artists column and a Top Songs column side by side.

Top Artists column: list the artists in the order shown, most played first. A name ending in "..." was cut off to fit; give the full name if you know who it is, otherwise what is printed without the dots.
Top Songs column: it lists song titles only, not who made them. Give each title exactly as printed, in order, and the artist you believe made it, or null if you aren't sure. A title may be printed without spaces or cut off with "...".

Copy artist names as they are properly written, with capitals, accents and punctuation. Leave out numbers, minutes, genres and anything that isn't an artist. Set is_wrapped to false only if the picture isn't a Spotify Wrapped card, and then leave both lists empty.`

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    is_wrapped:   { type: 'boolean' },
    top_artists:  { type: 'array', items: { type: 'string' } },
    songs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title:        { type: 'string' },
          artist_guess: { type: ['string', 'null'] },
        },
        required: ['title', 'artist_guess'],
        additionalProperties: false,
      },
    },
  },
  required: ['is_wrapped', 'top_artists', 'songs'],
  additionalProperties: false,
}

function isImage(value: unknown): value is WrappedImage {
  const image = value as WrappedImage
  return !!image
    && typeof image.data === 'string'
    && image.data.length > 0
    && image.data.length <= MAX_IMAGE_CHARS
    && /^[A-Za-z0-9+/=]+$/.test(image.data.slice(0, 200))
}

// Trimmed, de-duplicated (ignoring case and accents) and capped.
function cleanNames(values: unknown, exclude: Set<string> = new Set()): string[] {
  if (!Array.isArray(values)) return []
  const seen = new Set(exclude)
  const names: string[] = []
  for (const value of values) {
    if (typeof value !== 'string') continue
    const name = value.trim().slice(0, 120)
    const key = nameKey(name)
    if (!key || seen.has(key)) continue
    seen.add(key)
    names.push(name)
    if (names.length === MAX_NAMES) break
  }
  return names
}

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error('[wrapped/read] ANTHROPIC_API_KEY is not set')
    return NextResponse.json({ error: "Reading screenshots isn't switched on yet." }, { status: 503 })
  }

  const address = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (!allowRead(address)) {
    return NextResponse.json({ error: 'Too many tries in a row. Give it a few minutes.' }, { status: 429 })
  }

  const body = await req.json().catch(() => null) as { images?: unknown } | null
  const images = Array.isArray(body?.images) ? body!.images.filter(isImage).slice(0, MAX_IMAGES) : []
  if (images.length === 0) {
    return NextResponse.json({ error: 'Add a screenshot first.' }, { status: 400 })
  }

  const content: Anthropic.Beta.BetaContentBlockParam[] = []
  for (const image of images) {
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image.data } })
  }
  content.push({ type: 'text', text: INSTRUCTIONS })

  const client = new Anthropic({ timeout: 45_000, maxRetries: 1 })

  let response: Anthropic.Beta.BetaMessage
  try {
    response = await client.beta.messages.create({
      model:      MODEL,
      max_tokens: 4000,
      // Reading names off a picture doesn't need long thinking.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: OUTPUT_SCHEMA } },
      // If the request is ever declined, Anthropic re-runs it on its
      // recommended fallback model instead of returning nothing.
      betas:      ['server-side-fallback-2026-07-01'],
      fallbacks:  'default',
      messages:   [{ role: 'user', content }],
    })
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      console.error('[wrapped/read] rate limited:', err.message)
      return NextResponse.json({ error: 'Lots of people are adding their Wrapped right now. Try again in a minute.' }, { status: 503 })
    }
    if (err instanceof Anthropic.APIError) {
      console.error(`[wrapped/read] API error ${err.status}:`, err.message)
    } else {
      console.error('[wrapped/read] failed:', err)
    }
    return NextResponse.json({ error: "Couldn't read those screenshots. Try again." }, { status: 502 })
  }

  if (response.stop_reason === 'refusal') {
    console.error('[wrapped/read] declined:', response.stop_details?.category ?? 'no category')
    return NextResponse.json({ error: "Couldn't read those screenshots. Try different ones." }, { status: 422 })
  }

  const text = response.content.find((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')?.text
  let parsed: { is_wrapped?: unknown; top_artists?: unknown; songs?: unknown } | null = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    parsed = null
  }
  if (!parsed) {
    console.error('[wrapped/read] unreadable answer, stop_reason', response.stop_reason)
    return NextResponse.json({ error: "Couldn't read those screenshots. Try again." }, { status: 502 })
  }

  const artists = cleanNames(parsed.top_artists)

  // The Top Songs column names songs, not artists: look each one up
  // (lib/wrapped/songs.ts). At most five titles are on the card, and
  // MusicBrainz allows one request a second, so this takes a few seconds.
  const songs: SongRead[] = (Array.isArray(parsed.songs) ? parsed.songs : [])
    .map((s: { title?: unknown; artist_guess?: unknown }) => ({
      title: typeof s?.title === 'string' ? s.title.trim().slice(0, 120) : '',
      guess: typeof s?.artist_guess === 'string' && s.artist_guess.trim() ? s.artist_guess.trim().slice(0, 120) : null,
    }))
    .filter((s: SongRead) => s.title)
    .slice(0, 8)
  const fromSongs = songs.length > 0 ? await resolveSongs(songs, artists).catch(err => {
    console.error('[wrapped/read] song lookup failed:', err)
    return songs.flatMap(s => (s.guess ? [s.guess] : []))
  }) : []

  const result: ReadResult = {
    artists,
    songArtists: cleanNames(fromSongs, new Set(artists.map(nameKey))),
    notWrapped:  parsed.is_wrapped === false,
  }
  return NextResponse.json(result)
}
