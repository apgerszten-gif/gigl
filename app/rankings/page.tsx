import { supabase } from '@/lib/supabase'
import { aggregateArtistRows, RANKINGS_SELECT } from '@/lib/rankings'
import { RankingsClient } from '@/components/RankingsClient'
import { markInvocation, timeQuery, timeMark } from '@/lib/queryTiming'

// Server component: the leaderboard read has no per-user filter (RLS already
// allows public select on logged_shows), so it's fetched and aggregated here
// at request time instead of client-side behind a loading spinner. Filtering
// by day, sign-out, and navigation stay in RankingsClient since they need
// localStorage/interactivity that only exists in the browser.
//
// This route has no dynamic segment, so without this Next.js would prerender
// it once at build time and serve that frozen snapshot to every visitor
// until the next deploy — force per-request rendering since the underlying
// data changes as soon as anyone logs a show.
export const dynamic = 'force-dynamic'

export default async function RankingsPage() {
  const pageStart = Date.now()
  const { cold } = markInvocation()
  console.log(`[perf] rankings:page start cold=${cold}`)

  // TEMPORARY diagnostic - the server query is returning 0 rows against a
  // table that has 15 real rows via a direct REST call, despite identical
  // NEXT_PUBLIC_ env vars supposedly being baked into both client and server
  // bundles. Logging which key/URL this deployment actually resolved to,
  // masked, to rule in/out a stale env var. Remove once root-caused.
  const keyEnv = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  console.log(`[rankings][diag] url=${process.env.NEXT_PUBLIC_SUPABASE_URL} keyFormat=${keyEnv.startsWith('eyJ') ? 'legacy-jwt' : keyEnv.startsWith('sb_') ? 'new-format' : 'unknown'} keyLen=${keyEnv.length} keyTail=${keyEnv.slice(-8)}`)

  const { data: logs, error } = await timeQuery('rankings:logged_shows', supabase
    .from('logged_shows')
    .select(RANKINGS_SELECT))

  // Previously swallowed: a failed query (RLS, bad column, etc.) looked
  // identical to "no ratings yet" with nothing in the logs to tell them apart.
  if (error) console.error('[rankings] logged_shows query failed:', error.message)

  const rows = aggregateArtistRows(logs)

  timeMark('rankings:page total', pageStart)
  return <RankingsClient initialRows={rows} />
}
