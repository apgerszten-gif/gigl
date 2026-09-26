// Fills public.artist_images, two ways:
//  - during the nightly sync (app/api/cron/sync-shows):
//     1. saveHeadlinerImages - photos that came back with the events the
//        sync already fetched, so they cost no extra Ticketmaster requests.
//     2. fillLoggedArtistImages - artists people have logged that step 1
//        didn't cover, looked up by name. Capped per run so the nightly
//        Ticketmaster budget stays predictable.
//  - while a request is being answered (artistPhotos), for a show list with
//    artists the table has never seen: setlist.fm's older shows, and the
//    catalogue rows whose event came without a photo.

import { supabase } from '../supabase'
import { supabaseAdmin } from '../supabaseAdmin'
import { artistKey, fetchArtistImagesByKey } from '../artistImages'
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

// Looks up by name the artists in `names` that artist_images has no photo
// for - skipping any that came up empty within RETRY_MISSES_AFTER_DAYS - at
// most `limit` of them, `concurrency` at a time. Every answer is saved, a
// miss included, so no artist is looked up twice in a month. A failed
// request is not saved, and is tried again next time.
export async function fillArtistImages(
  names: string[],
  { limit, concurrency = 1 }: { limit: number; concurrency?: number },
): Promise<{ looked: number; found: Map<string, string> }> {
  const admin = supabaseAdmin()

  const byKey = new Map<string, string>()
  names.forEach(name => {
    const key = artistKey(name)
    if (key && !byKey.has(key)) byKey.set(key, name)
  })

  const keys = Array.from(byKey.keys())
  const known = new Map<string, { image_url: string | null; checked_at: string }>()
  for (let i = 0; i < keys.length; i += KEY_CHUNK) {
    const { data, error } = await admin
      .from('artist_images')
      .select('artist_key, image_url, checked_at')
      .in('artist_key', keys.slice(i, i + KEY_CHUNK))
    if (error) throw new Error(`artist image lookup failed: ${error.message}`)
    data?.forEach(row => known.set(row.artist_key, row))
  }

  const retryBefore = Date.now() - RETRY_MISSES_AFTER_DAYS * 24 * 60 * 60 * 1000
  const todo = keys
    .filter(key => {
      const row = known.get(key)
      return !row || (!row.image_url && new Date(row.checked_at).getTime() < retryBefore)
    })
    .slice(0, limit)

  const found = new Map<string, string>()
  for (let i = 0; i < todo.length; i += concurrency) {
    if (i > 0) await sleep(REQUEST_SPACING_MS * concurrency)
    await Promise.all(todo.slice(i, i + concurrency).map(async key => {
      const name = byKey.get(key)!
      try {
        const imageUrl = await lookupArtistImage(name)
        if (imageUrl) found.set(key, imageUrl)
        const { error } = await admin.from('artist_images').upsert(
          { artist_key: key, artist_name: name, image_url: imageUrl, source: 'ticketmaster', checked_at: new Date().toISOString() },
          { onConflict: 'artist_key' },
        )
        if (error) console.error(`[artist-images] saving the photo for ${name} failed:`, error.message)
      } catch (err) {
        console.error(`[artist-images] lookup for ${name} failed:`, err instanceof Error ? err.message : String(err))
      }
    }))
  }

  return { looked: todo.length, found }
}

export async function fillLoggedArtistImages(): Promise<{ looked: number; found: number }> {
  // Every logged artist name. Fine while logged_shows is small; switch to a
  // distinct query (an RPC) if this ever gets slow.
  const { data: logs, error } = await supabaseAdmin().from('logged_shows').select('artist_name')
  if (error) throw new Error(`logged artist names failed: ${error.message}`)

  const names = (logs ?? []).map(row => row.artist_name).filter(Boolean) as string[]
  const { looked, found } = await fillArtistImages(names, { limit: LOOKUPS_PER_RUN })
  return { looked, found: found.size }
}

// name -> photo for a show list being sent right now. artist_images first;
// then, for artists it has never seen, up to `lookUp` Ticketmaster lookups
// at once, saved for everyone after. Anything past the cap shows the
// placeholder this time and is looked up on a later request.
export async function artistPhotos(names: string[], lookUp: number): Promise<(name: string) => string | null> {
  const found = await fetchArtistImagesByKey(supabase, names.map(artistKey))

  const missing = names.filter(name => !found[artistKey(name)])
  if (missing.length > 0 && lookUp > 0 && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const fresh = await fillArtistImages(missing, { limit: lookUp, concurrency: lookUp })
      fresh.found.forEach((url, key) => { found[key] = url })
    } catch (err) {
      console.error('[artist-images] request-time fill failed:', err instanceof Error ? err.message : String(err))
    }
  }

  return name => found[artistKey(name)] ?? null
}
