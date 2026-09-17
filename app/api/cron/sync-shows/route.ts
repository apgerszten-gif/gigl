import { NextRequest, NextResponse } from 'next/server'
import { SYNC_CITIES } from '@/lib/shows/cities'
import { fetchCityShowsPage, type SyncShow } from '@/lib/ticketmaster'
import { upsertShows, prunePastShows } from '@/lib/shows/repository'
import { saveHeadlinerImages, fillLoggedArtistImages } from '@/lib/shows/artistImageSync'

// Nightly catalogue refresh: walks SYNC_CITIES, pulls each metro's upcoming
// music listings from Ticketmaster, and upserts them into `shows` so that
// normal search traffic reads Postgres instead of costing an upstream API
// call per visitor. Scheduled from vercel.json.
//
// Runs long by design (tens of seconds of deliberately paced HTTP), so it
// needs the extended duration rather than the default.
export const maxDuration = 300
export const dynamic     = 'force-dynamic'

// Ticketmaster's free tier allows 5 requests/sec. 250ms between requests
// leaves headroom for the burst allowance rather than riding the exact limit,
// which in practice is what avoids the intermittent 429s.
const REQUEST_SPACING_MS = 250

// Deep paging is capped at 1000 results per query upstream, so this is the
// real ceiling per city, not a budget choice. Most cities return far fewer.
const MAX_PAGES_PER_CITY = 5

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

export async function GET(req: NextRequest) {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Without this the
  // endpoint is a public button that anyone can hold down to burn the daily
  // Ticketmaster quota.
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[sync-shows] CRON_SECRET is not set; refusing to run')
    return NextResponse.json({ error: 'Sync is not configured.' }, { status: 500 })
  }
  if (req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startedAt = Date.now()
  const collected  = new Map<string, SyncShow>()
  const cityErrors: string[] = []

  for (const city of SYNC_CITIES) {
    let page       = 0
    let totalPages = 1

    while (page < Math.min(totalPages, MAX_PAGES_PER_CITY)) {
      try {
        const result = await fetchCityShowsPage(city, page)
        totalPages = result.totalPages

        // Keyed by id so the same event returned under two overlapping metros
        // (New York and Brooklyn will genuinely both return some) collapses to
        // one row instead of racing itself in the upsert.
        for (const show of result.shows) collected.set(show.id, show)
      } catch (err) {
        // One city failing must not take the run down - the other 50 are
        // still worth syncing, and this city retries tomorrow.
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[sync-shows] ${city.city}, ${city.stateCode} p${page} failed:`, message)
        cityErrors.push(`${city.city}, ${city.stateCode}`)
        break
      }

      page += 1
      await sleep(REQUEST_SPACING_MS)
    }
  }

  // Array.from rather than spread: tsconfig targets below es2015, where
  // spreading a Map iterator needs --downlevelIteration.
  const shows = Array.from(collected.values())
  const { upserted, failed } = await upsertShows(shows)

  // Pruned after the upsert so a show that moved to a later date is refreshed
  // before the cutoff is applied, rather than being deleted and re-added.
  let pruned = 0
  try {
    pruned = await prunePastShows()
  } catch (err) {
    console.error('[sync-shows] prune failed:', err instanceof Error ? err.message : String(err))
  }

  // Artist photos: free ones from the events above first, then a capped
  // name lookup for logged artists still missing one. Neither is allowed to
  // fail the run - a missing photo only means the placeholder shows.
  let artistImagesSaved = 0
  let artistImageLookups = { looked: 0, found: 0 }
  try {
    artistImagesSaved = await saveHeadlinerImages(shows)
    artistImageLookups = await fillLoggedArtistImages()
  } catch (err) {
    console.error('[sync-shows] artist images failed:', err instanceof Error ? err.message : String(err))
  }

  const summary = {
    cities:      SYNC_CITIES.length,
    cityErrors:  cityErrors.length,
    fetched:     shows.length,
    upserted,
    failed,
    pruned,
    artistImagesSaved,
    artistImagesLookedUp: artistImageLookups.looked,
    artistImagesFound:    artistImageLookups.found,
    durationMs:  Date.now() - startedAt,
  }
  console.log('[sync-shows] complete', summary)

  return NextResponse.json(summary)
}
