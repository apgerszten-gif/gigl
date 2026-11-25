import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { nameKey } from '@/lib/nameKey'
import type { ReadResult, WrappedCard, WrappedImage } from '@/lib/wrapped/types'

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

// Two cards at most, each resized on the phone to well under this.
const MAX_IMAGES = 2
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

const CARD_LABEL: Record<WrappedCard, string> = {
  artists: 'Top artists card',
  songs:   'Top songs card',
}

const INSTRUCTIONS = `These are screenshots from someone's Spotify Wrapped, the yearly listening recap.

From the Top artists card, list the artists in the order shown, most played first.
From the Top songs card, list every artist credited on the songs, in song order, without repeating anyone. Leave out the song titles.

Copy each artist name exactly as it is printed, including capitals, accents and punctuation. Leave out numbers, play counts, minutes and anything that isn't an artist's name. If a picture isn't a Wrapped card, or has no names you can read, give an empty list for it. Set is_wrapped to false only if none of the pictures is a Spotify Wrapped card.`

const OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    is_wrapped:   { type: 'boolean' },
    top_artists:  { type: 'array', items: { type: 'string' } },
    song_artists: { type: 'array', items: { type: 'string' } },
  },
  required: ['is_wrapped', 'top_artists', 'song_artists'],
  additionalProperties: false,
}

function isImage(value: unknown): value is WrappedImage {
  const image = value as WrappedImage
  return !!image
    && (image.card === 'artists' || image.card === 'songs')
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
    content.push({ type: 'text', text: `${CARD_LABEL[image.card]}:` })
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
  let parsed: { is_wrapped?: unknown; top_artists?: unknown; song_artists?: unknown } | null = null
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
  const result: ReadResult = {
    artists,
    songArtists: cleanNames(parsed.song_artists, new Set(artists.map(nameKey))),
    notWrapped:  parsed.is_wrapped === false,
  }
  return NextResponse.json(result)
}
