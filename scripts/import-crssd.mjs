// Imports the CRSSD Fest Fall '26 lineup into public.shows, one row per set.
//
// Why a hand-typed lineup rather than a feed: Ticketmaster carries CRSSD as
// two events ("CRSSD Fest - Friday/Saturday", ids Z7r9jZ1A70Mqd / ...MqA),
// each with a single attraction called "CRSSD Fest". It never has the
// lineup. The festival's own CMS does expose one at
// crssdfest.com/wp-json/wp/v2/fc_em_lineups, but it is grouped by stage with
// vc_ls_day blank on every entry, and it is missing Chris Lorenzo. The
// day-split poster is the only complete, day-accurate source, so it is
// transcribed below.
//
// Note the sync will never pick these up on its own: CRSSD is classified
// "Miscellaneous / Fairs & Festivals" upstream and app/api/cron/sync-shows
// asks for classificationName=music.
//
// Run:
//   node scripts/import-crssd.mjs --dry-run    (resolves photos, writes nothing)
//   node scripts/import-crssd.mjs              (upserts)
//
// Re-running is safe and is the intended way to correct the lineup: ids are
// derived from the artist name, so a second run updates rows in place. It
// does not delete rows for artists removed from the list - say so by hand if
// a set is cancelled.

import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'

// ── The lineup ───────────────────────────────────────────────────────────────
// Transcribed from the day-split poster, keeping each act's own styling
// ("ear", "beginagain", "horsegiirL", "Rossi." with its full stop).
//
// A b2b is one set and is stored under its billed name. Search is a trigram
// ILIKE over artist and venue (see lib/shows/repository.ts), so
// "Chris Lake b2b Disclosure" is found by typing either name, while splitting
// it into two rows would invent two sets that did not happen.
//
// Set types on the poster - horsegiirL (live), Chris Lake b2b Disclosure
// (dj set), Groove Armada (dj set) - have nowhere to live in `shows` and are
// left out rather than glued onto the artist name.

const SATURDAY = [
  'Adam Sellouk', 'Ahadadream', 'AYYBO', 'BB Shaine', 'beginagain', 'Ben UFO',
  'CHASEWEST', 'Dean Turnley', 'ear', 'Heminguey', 'horsegiirL', 'I Hate Models',
  'Jamback', 'Layton Giordani', 'Locklead', 'Marlon Hoffstadt', 'Mind Enterprises',
  'Mochakk', 'MPH', 'Notion', 'Pete Soul', 'Rafael', 'Rossi. b2b Carlita',
  'salute', 'Sonny Fodera', 'Torren Foot', 'VTSS',
]

const SUNDAY = [
  '999999999', 'ARODES', 'Balu Brigada', 'Big Wild', 'Boys Noize',
  'Chris Lake b2b Disclosure', 'Chris Lorenzo', 'DRAMA', 'GENESI', 'GREG 99',
  'Groove Armada', 'Helena Hauff', 'Jay de Lys', 'KAS:ST', 'KETTAMA',
  'Marco Strous', 'Mathame', 'oskar med k', 'Prospa', 'Punkybutter', 'Rivka M',
  // Unaccented, though the poster accents it, because the catalogue already
  // holds three Ticketmaster rows for him spelled "Sebastien Tellier" and
  // search is a raw ILIKE - an accented row would not answer "sebastien" and
  // would sit apart from his own tour dates.
  'ROYA', 'SAAND', 'Sam Alfred', 'Sebastien Tellier', 'Son of Son',
]

// Sep 26 2026 is a Saturday, Sep 27 a Sunday. (Ticketmaster's event titles say
// "Friday"/"Saturday" against these same dates; the dates are right there and
// the weekday words are not.)
const DAYS = [
  { isoDate: '2026-09-26', artists: SATURDAY },
  { isoDate: '2026-09-27', artists: SUNDAY },
]

const VENUE = 'CRSSD Festival'
const CITY  = 'San Diego'
const STATE = 'CA'

// Waterfront Park, as Ticketmaster geocodes it. Set explicitly because a row
// with no coordinates is invisible to the Near me filter (lib/geo.ts), which
// is exactly how somebody standing in the park would look for their set.
const LAT = 32.7253
const LNG = -117.172096

// GENRE_EMOJI in lib/ticketmaster.ts maps dance/edm to this.
const EMOJI = '🎧'

// prunePastShows() deletes everything whose show_date has fallen out of the
// catalogue window except source = 'user' - the one value it skips. These
// rows cannot be re-fetched from anywhere if they go, so they take that
// value. Changing it to something like 'festival' means widening the
// .neq('source', 'user') filter in lib/shows/repository.ts first.
const SOURCE = 'user'

const ID_PREFIX = 'crssd-fall-2026-'

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
// Two passes, cheapest first. public.artist_images is the library the nightly
// sync has already built from Ticketmaster, so most well-known acts are
// answered without a request. Only the misses go upstream, and whatever they
// find is written back so the next festival import gets it for free.

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
          discovered.push({ artist_key: nameKey(name), artist_name: name, image_url: url })
        }
      } catch (err) {
        // A lookup that fails is a missing photo, not a failed import.
        console.warn(`  ! ${name}: ${err.message}`)
      }
      await sleep(REQUEST_SPACING_MS)
    }
    console.log(`photos: ${discovered.length} found upstream, ${missing.length - discovered.length} left blank`)
  } else {
    console.log('photos: no TICKETMASTER_API_KEY, skipping the upstream pass')
  }

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
        venue:        VENUE,
        city:         CITY,
        state:        STATE,
        show_date:    isoDate,
        lat:          LAT,
        lng:          LNG,
        emoji:        EMOJI,
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
  console.log(`${names.length} sets (${SATURDAY.length} Sat ${DAYS[0].isoDate}, ${SUNDAY.length} Sun ${DAYS[1].isoDate})`)

  const { byKey, discovered } = await resolvePhotos(names)
  const rows = buildRows(byKey)

  const withPhoto = rows.filter(r => r.image_url).length
  console.log(`rows: ${rows.length}, ${withPhoto} with a photo, ${rows.length - withPhoto} without`)

  if (dryRun) {
    console.log('\n--dry-run, nothing written. Sample:')
    for (const row of [rows[0], rows[SATURDAY.length]]) {
      console.log('  ' + JSON.stringify({ ...row, image_url: row.image_url ? '<url>' : null }))
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
      .upsert(discovered.map(d => ({ ...d, source: 'ticketmaster', checked_at: new Date().toISOString() })),
        { onConflict: 'artist_key' })
    // The photos are already on the shows rows; failing to cache them is not
    // worth failing the import over.
    if (imagesError) console.warn(`artist_images upsert failed: ${imagesError.message}`)
    else console.log(`cached ${discovered.length} artist photos`)
  }
}

main().catch(err => { console.error(err); process.exit(1) })
