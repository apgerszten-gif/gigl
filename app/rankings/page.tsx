import { supabase } from '@/lib/supabase'
import { defaultRankMetric, isRankMetric, loadRankings } from '@/lib/rankings'
import { RankingsClient } from '@/components/RankingsClient'
import { markInvocation, timeMark } from '@/lib/queryTiming'

// Server component: the leaderboard read has no per-user filter (RLS already
// allows public select on logged_shows), so it's fetched and ranked here at
// request time instead of client-side behind a loading spinner. Switching
// between artists and venues, the search, and what the stars rank on stay in
// RankingsClient, since they're interactive. So does Following (?filter=),
// which needs to know who's signed in: the client re-ranks on just their
// ratings and the ratings of people they follow.
//
// This route has no dynamic segment, so without this Next.js would prerender
// it once at build time and serve that frozen snapshot to every visitor
// until the next deploy — force per-request rendering since the underlying
// data changes as soon as anyone logs a show.
export const dynamic = 'force-dynamic'

interface Props { searchParams: { view?: string | string[]; by?: string | string[]; filter?: string | string[] } }

export default async function RankingsPage({ searchParams }: Props) {
  const pageStart = Date.now()
  const { cold } = markInvocation()
  console.log(`[perf] rankings:page start cold=${cold}`)

  const rankings = await loadRankings(supabase)
  timeMark('rankings:page total', pageStart)

  const by = Array.isArray(searchParams.by) ? searchParams.by[0] : searchParams.by
  const venues = searchParams.view === 'venues'
  return (
    <RankingsClient
      initial={rankings}
      initialView={venues ? 'venues' : 'rankings'}
      initialMetric={isRankMetric(by) ? by : defaultRankMetric(venues ? 'venues' : 'artists')}
      initialFilter={searchParams.filter === 'following' ? 'following' : 'all'}
    />
  )
}
