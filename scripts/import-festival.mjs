// Imports one festival's lineup into public.shows, one row per set.
//
// A template: fill in FESTIVAL, DAYS and (optionally) PRESS_PHOTOS below,
// then add the lineup to LINEUPS in app/api/shows/festival/route.ts if a
// screen needs to load it.
//
// Why a hand-typed lineup rather than a feed: Ticketmaster usually carries a
// festival as one event per day with a single attraction named after the
// festival, never the bill. And the nightly sync won't pick festival rows up
// on its own anyway - festivals are classified "Miscellaneous / Fairs &
// Festivals" upstream and app/api/cron/sync-shows asks for
// classificationName=music. The day-split poster is usually the only
// complete, day-accurate source, so transcribe it.
//
// Run:
//   node scripts/import-festival.mjs --dry-run    (resolves photos, writes nothing)
//   node scripts/import-festival.mjs              (upserts)
//
// Re-running is safe and is the intended way to correct the lineup: ids are
// derived from the artist name, so a second run updates rows in place. It
// does not delete rows for artists removed from the list - say so by hand if
// a set is cancelled.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ── The festival ─────────────────────────────────────────────────────────────

const FESTIVAL = {
  // A short slug for this edition, e.g. 'somefest-2027'. It prefixes every
  // show id this script writes and names the folder its photos go in.
  id:    '',
  venue: '',
  city:  '',
  state: '',
  // Set explicitly: a row with no coordinates is invisible to the Near me
  // filter (lib/geo.ts), which is exactly how somebody standing at the
  // festival would look for their set. Use Ticketmaster's geocode for the
  // site when it has one.
  lat:   null,
  lng:   null,
  // GENRE_EMOJI in lib/ticketmaster.ts has the per-genre choices; 🎧 is
  // dance/electronic.
  emoji: '🎶',
}

// ── The lineup ───────────────────────────────────────────────────────────────
// Transcribed from the day-split poster, keeping each act's own styling.
//
// A b2b is one set and is stored under its billed name. Search is a trigram
// ILIKE over artist and venue (see lib/shows/repository.ts), so
// "A b2b B" is found by typing either name, while splitting it into two rows
// would invent two sets that did not happen.
//
// Set types on a poster ("live", "dj set") have nowhere to live in `shows`
// and are left out rather than glued onto the artist name.
//
// Check spellings against the catalogue: search is a raw ILIKE, so an
// accented name won't answer an unaccented query and would sit apart from
// the artist's own tour dates.

const DAYS = [
  // { isoDate: '2027-04-10', artists: ['Artist One', 'Artist Two'] },
]

// ── Press photos ─────────────────────────────────────────────────────────────
// The last photo pass, for acts neither artist_images nor Ticketmaster has a
// photo of. Festivals usually publish a press photo per act on their own
// site; paste the image URLs here, keyed by the name as it appears in DAYS.
// Leave it empty to skip the pass.

const PRESS_PHOTOS = {
  // 'Artist One': 'https://example.com/artist-one.jpg',
}

// prunePastShows() deletes everything more than a year old except
// source = 'user' - the one value it skips. These
// rows cannot be re-fetched from anywhere if they go, so they take that
// value. Changing it to something like 'festival' means widening the
// .neq('source', 'user') filter in lib/shows/repository.ts first.
const SOURCE = 'user'

const ID_PREFIX = `${FESTIVAL.id}-`

// ── Env ──────────────────────────────────────────────────────────────────────

function readEnvLocal() {
  const file = path.join(process.cwd(), '.env.local')
  if (!fs.existsSync(file)) return {}
  return Object.fromEntries(
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter(line => line.includes('=') && !line.trimStart().startsWith('#'))
      .map(line => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]),
  )
}

const env    = { ...readEnvLocal(), ...process.env }
const dryRun = process.argv.includes('--dry-run')

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON_KEY     = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE_KEY  = env.SUPABASE_SERVICE_ROLE_KEY
const TM_KEY       = env.TICKETMASTER_API_KEY

const missingConfig = ['id', 'venue', 'city', 'state'].filter(key => !FESTIVAL[key])
if (missingConfig.length > 0 || DAYS.length === 0) {
  console.error(`Fill in FESTIVAL (${missingConfig.join(', ') || 'done'}) and DAYS at the top of this script first.`)
  process.exit(1)
}
if (!SUPABASE_URL || !ANON_KEY) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.')
  process.exit(1)
}
if (!dryRun && !SERVICE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required to write. Add it to .env.local, or pass --dry-run.')
  process.exit(1)
}

const read  = createClient(SUPABASE_URL, ANON_KEY)
const write = SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null

// ── Helpers (small copies of the app's, so this stays a standalone script) ───

// lib/nameKey.ts
function nameKey(name) {
  return name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function slugify(name) {
  return nameKey(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

// lib/ticketmaster.ts pickImage: ~10 crops of one photo come back; prefer the
// less-wide ones around 600px, and never Ticketmaster's generic fallback art.
const PREFERRED_RATIOS = ['3_2', '4_3', '1_1']

function pickImage(images) {
  const real = (images ?? []).filter(img => img.url && !img.fallback)
  if (real.length === 0) return null
  const scored = real.map(img => ({
    url: img.url,
    rank: PREFERRED_RATIOS.indexOf(img.ratio ?? ''),
    delta: Math.abs((img.width ?? 0) - 600),
  }))
  scored.sort((a, b) =>
    (a.rank < 0 ? 99 : a.rank) - (b.rank < 0 ? 99 : b.rank) || a.delta - b.delta)
  return scored[0].url
}

// lib/ticketmaster.ts lookupArtistImage. Exact name match only - the top
// result for a short name is often a different act, and a wrong photo is
// worse than the placeholder.
async function lookupArtistImage(name) {
  const params = new URLSearchParams({
    apikey: TM_KEY, keyword: name, classificationName: 'music', size: '10',
  })
  const res = await fetch(`https://app.ticketmaster.com/discovery/v2/attractions.json?${params}`)
  if (!res.ok) throw new Error(`attraction search for ${name} failed (${res.status})`)
  const data = await res.json()
  const key = nameKey(name)
  const match = (data._embedded?.attractions ?? []).find(a => nameKey(a.name) === key && pickImage(a.images))
  return match ? pickImage(match.images) : null
}

// A b2b is billed as one act and no attraction is named that way, so the
// exact match above can never hit. Fall back to the artists either side of
// the "b2b" - it is the same photo either way, and it is one of the two
// people who actually played.
function lookupNames(name) {
  const parts = name.split(/\s+b2b\s+/i)
  return parts.length > 1 ? [name, ...parts] : [name]
}

async function lookupSetImage(name) {
  for (const candidate of lookupNames(name)) {
    const url = await lookupArtistImage(candidate)
    if (url) return url
    await sleep(REQUEST_SPACING_MS)
  }
  return null
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

// The nightly sync's own spacing, so this can't contribute to a rate limit.
const REQUEST_SPACING_MS = 250

// ── Photos ───────────────────────────────────────────────────────────────────
// Three passes, cheapest first. public.artist_images is the library the
// nightly sync has already built from Ticketmaster, so most well-known acts
// are answered without a request. The misses go to Ticketmaster's attraction
// search, and whatever is still blank after that comes from PRESS_PHOTOS.
// Everything found upstream is written back to artist_images, so the next
// festival import - and every screen that shows a logged set - gets it for
// free.

// Press photos are copied into our own storage rather than hotlinked, so a
// set's photo doesn't depend on the festival's server, or on it keeping a
// past edition's uploads. Public read; only the service role writes, the
// same arrangement as public.artist_images itself.
const PHOTO_BUCKET = 'artist-photos'
const PHOTO_FOLDER = FESTIVAL.id
const PHOTO_EXTENSIONS = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }

async function ensurePhotoBucket() {
  const { error } = await write.storage.getBucket(PHOTO_BUCKET)
  if (!error) return
  const { error: createError } = await write.storage.createBucket(PHOTO_BUCKET, {
    public: true,
    fileSizeLimit: '2MB',
    allowedMimeTypes: Object.keys(PHOTO_EXTENSIONS),
  })
  if (createError) throw new Error(`creating the ${PHOTO_BUCKET} bucket failed: ${createError.message}`)
}

async function copyPhoto(name, sourceUrl) {
  const res = await fetch(sourceUrl)
  if (!res.ok) throw new Error(`downloading ${sourceUrl} failed (${res.status})`)
  const contentType = (res.headers.get('content-type') ?? '').split(';')[0].trim()
  const extension = PHOTO_EXTENSIONS[contentType]
  if (!extension) throw new Error(`${sourceUrl} is ${contentType || 'untyped'}, not a photo`)

  const objectPath = `${PHOTO_FOLDER}/${slugify(name)}.${extension}`
  const { error } = await write.storage.from(PHOTO_BUCKET)
    .upload(objectPath, Buffer.from(await res.arrayBuffer()), { contentType, upsert: true })
  if (error) throw new Error(`uploading ${objectPath} failed: ${error.message}`)
  return write.storage.from(PHOTO_BUCKET).getPublicUrl(objectPath).data.publicUrl
}

// On --dry-run this only lists the photos; nothing is copied.
async function pressPhotoPass(names, byKey) {
  const photos = new Map(Object.entries(PRESS_PHOTOS).map(([name, url]) => [nameKey(name), url]))
  if (photos.size === 0) return []
  if (!dryRun) await ensurePhotoBucket()

  const found = []
  for (const name of names) {
    const sourceUrl = lookupNames(name).map(n => photos.get(nameKey(n))).find(Boolean)
    if (!sourceUrl) continue
    try {
      const url = dryRun ? sourceUrl : await copyPhoto(name, sourceUrl)
      byKey.set(nameKey(name), url)
      found.push({ artist_key: nameKey(name), artist_name: name, image_url: url, source: 'festival' })
    } catch (err) {
      console.warn(`  ! ${name}: ${err.message}`)
    }
    await sleep(REQUEST_SPACING_MS)
  }
  console.log(`photos: ${found.length} from PRESS_PHOTOS${dryRun ? ' (found, not copied)' : ', copied to storage'}`)
  return found
}

async function resolvePhotos(names) {
  const keys = Array.from(new Set(names.map(nameKey)))

  const { data, error } = await read
    .from('artist_images')
    .select('artist_key, image_url')
    .in('artist_key', keys)
    .not('image_url', 'is', null)
  if (error) throw new Error(`artist_images lookup failed: ${error.message}`)

  const byKey = new Map((data ?? []).map(row => [row.artist_key, row.image_url]))
  const fromLibrary = byKey.size
  const missing = names.filter(name => !byKey.has(nameKey(name)))

  console.log(`photos: ${fromLibrary} already in artist_images, ${missing.length} to look up`)

  const discovered = []
  if (TM_KEY) {
    for (const name of missing) {
      try {
        const url = await lookupSetImage(name)
        if (url) {
          byKey.set(nameKey(name), url)
          discovered.push({ artist_key: nameKey(name), artist_name: name, image_url: url, source: 'ticketmaster' })
        }
      } catch (err) {
        // A lookup that fails is a missing photo, not a failed import.
        console.warn(`  ! ${name}: ${err.message}`)
      }
      await sleep(REQUEST_SPACING_MS)
    }
    console.log(`photos: ${discovered.length} found on Ticketmaster`)
  } else {
    console.log('photos: no TICKETMASTER_API_KEY, skipping the Ticketmaster pass')
  }

  const blank = missing.filter(name => !byKey.has(nameKey(name)))
  if (blank.length > 0) discovered.push(...await pressPhotoPass(blank, byKey))
  console.log(`photos: ${missing.length - discovered.length} left blank`)

  return { byKey, discovered }
}

// ── Rows ─────────────────────────────────────────────────────────────────────

function buildRows(byKey) {
  const now = new Date().toISOString()
  const rows = []

  for (const { isoDate, artists } of DAYS) {
    for (const artist of artists) {
      rows.push({
        id:           ID_PREFIX + slugify(artist),
        source:       SOURCE,
        artist,
        support:      null,
        venue:        FESTIVAL.venue,
        city:         FESTIVAL.city,
        state:        FESTIVAL.state,
        show_date:    isoDate,
        lat:          FESTIVAL.lat,
        lng:          FESTIVAL.lng,
        emoji:        FESTIVAL.emoji,
        // Nothing synced these, so there is no SYNC_CITIES entry to name.
        metro:        null,
        image_url:    byKey.get(nameKey(artist)) ?? null,
        last_seen_at: now,
      })
    }
  }

  const ids = new Set()
  for (const row of rows) {
    if (ids.has(row.id)) throw new Error(`two sets slugify to ${row.id}; give one a distinct id`)
    ids.add(row.id)
  }

  return rows
}

// ── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  const names = DAYS.flatMap(d => d.artists)
  console.log(`${names.length} sets: ${DAYS.map(d => `${d.artists.length} on ${d.isoDate}`).join(', ')}`)

  const { byKey, discovered } = await resolvePhotos(names)
  const rows = buildRows(byKey)

  const withPhoto = rows.filter(r => r.image_url).length
  console.log(`rows: ${rows.length}, ${withPhoto} with a photo, ${rows.length - withPhoto} without`)

  if (dryRun) {
    console.log('\n--dry-run, nothing written. Sample, the first set of each day:')
    for (const { isoDate } of DAYS) {
      const row = rows.find(r => r.show_date === isoDate)
      if (row) console.log('  ' + JSON.stringify({ ...row, image_url: row.image_url ? '<url>' : null }))
    }
    console.log('\nWithout a photo: ' + rows.filter(r => !r.image_url).map(r => r.artist).join(', '))
    return
  }

  const { error: showsError } = await write.from('shows').upsert(rows, { onConflict: 'id' })
  if (showsError) throw new Error(`shows upsert failed: ${showsError.message}`)
  console.log(`upserted ${rows.length} shows`)

  if (discovered.length > 0) {
    const { error: imagesError } = await write
      .from('artist_images')
      .upsert(discovered.map(d => ({ ...d, checked_at: new Date().toISOString() })),
        { onConflict: 'artist_key' })
    // The photos are already on the shows rows; failing to cache them is not
    // worth failing the import over.
    if (imagesError) console.warn(`artist_images upsert failed: ${imagesError.message}`)
    else console.log(`cached ${discovered.length} artist photos`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
