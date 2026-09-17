// Fills public.artist_images during the nightly sync (app/api/cron/sync-shows).
// Two sources, cheapest first:
//   1. saveHeadlinerImages - photos that came back with the events the sync
//      already fetched, so they cost no extra Ticketmaster requests.
//   2. fillLoggedArtistImages - artists people have logged (festival sets,
//      mostly) that step 1 didn't cover, looked up by name. Capped per run so
//      the nightly Ticketmaster budget stays predictable.

import { supabaseAdmin } from '../supabaseAdmin'
import { artistKey } from '../artistImages'
import { lookupArtistImage, type SyncShow } from '../ticketmaster'

const UPSERT_BATCH_SIZE = 500
const KEY_CHUNK = 150

// ~40 extra requests a night against the 5000/day cap; a backlog of logged
// artists clears over a few nights.
const LOOKUPS_PER_RUN = 40

// A name that found nothing is tried again after this long, in case the
// artist has since been listed.
const RETRY_MISSES_AFTER_DAYS = 30

// Same pacing as the event sync, to stay under 5 requests/sec.
const REQUEST_SPACING_MS = 250

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

interface ArtistImageRow {
  artist_key:  string
  artist_name: string
  image_url:   string | null
  source:      string
  checked_at:  string
}

export async function saveHeadlinerImages(shows: SyncShow[]): Promise<number> {
  const now = new Date().toISOString()
  const rows = new Map<string, ArtistImageRow>()

  // Only real photos are written, so an event without one never blanks out
  // a photo found earlier. artistImage is only set when the event lists an
  // attraction, in which case show.artist is that attraction's name.
  for (const show of shows) {
    if (!show.artistImage) continue
    const key = artistKey(show.artist)
    if (!key || rows.has(key)) continue
    rows.set(key, { artist_key: key, artist_name: show.artist, image_url: show.artistImage, source: 'ticketmaster', checked_at: now })
  }

  const list = Array.from(rows.values())
  let saved = 0
  for (let i = 0; i < list.length; i += UPSERT_BATCH_SIZE) {
    const batch = list.slice(i, i + UPSERT_BATCH_SIZE)
    const { error } = await supabaseAdmin().from('artist_images').upsert(batch, { onConflict: 'artist_key' })
    if (error) {
      console.error(`[sync-shows] artist image batch ${i / UPSERT_BATCH_SIZE} failed:`, error.message)
    } else {
      saved += batch.length
    }
  }
  return saved
}

export async function fillLoggedArtistImages(): Promise<{ looked: number; found: number }> {
  const admin = supabaseAdmin()

  // Every logged artist name. Fine while logged_shows is small; switch to a
  // distinct query (an RPC) if this ever gets slow.
  const { data: logs, error } = await admin.from('logged_shows').select('artist_name')
  if (error) throw new Error(`logged artist names failed: ${error.message}`)

  const names = new Map<string, string>()
  logs?.forEach(row => {
    if (!row.artist_name) return
    const key = artistKey(row.artist_name)
    if (key && !names.has(key)) names.set(key, row.artist_name)
  })

  const keys = Array.from(names.keys())
  const known = new Map<string, { image_url: string | null; checked_at: string }>()
  for (let i = 0; i < keys.length; i += KEY_CHUNK) {
    const { data, error: knownError } = await admin
      .from('artist_images')
      .select('artist_key, image_url, checked_at')
      .in('artist_key', keys.slice(i, i + KEY_CHUNK))
    if (knownError) throw new Error(`artist image lookup failed: ${knownError.message}`)
    data?.forEach(row => known.set(row.artist_key, row))
  }

  const retryBefore = Date.now() - RETRY_MISSES_AFTER_DAYS * 24 * 60 * 60 * 1000
  const todo = keys
    .filter(key => {
      const row = known.get(key)
      return !row || (!row.image_url && new Date(row.checked_at).getTime() < retryBefore)
    })
    .slice(0, LOOKUPS_PER_RUN)

  let found = 0
  for (const key of todo) {
    const name = names.get(key)!
    try {
      const imageUrl = await lookupArtistImage(name)
      if (imageUrl) found += 1
      // A miss is saved too (image_url null), so it isn't looked up again
      // until RETRY_MISSES_AFTER_DAYS have passed.
      const { error: saveError } = await admin.from('artist_images').upsert(
        { artist_key: key, artist_name: name, image_url: imageUrl, source: 'ticketmaster', checked_at: new Date().toISOString() },
        { onConflict: 'artist_key' },
      )
      if (saveError) console.error(`[sync-shows] saving artist image for ${name} failed:`, saveError.message)
    } catch (err) {
      console.error(`[sync-shows] artist image lookup for ${name} failed:`, err instanceof Error ? err.message : String(err))
    }
    await sleep(REQUEST_SPACING_MS)
  }

  return { looked: todo.length, found }
}
