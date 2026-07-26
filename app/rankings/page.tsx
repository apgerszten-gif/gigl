import { supabase } from '@/lib/supabase'
import { computeShowScore } from '@/lib/rating'
import { RankingsClient, type ArtistRow } from '@/components/RankingsClient'

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
  const { data: logs } = await supabase
    .from('logged_shows')
    .select('artist_id, performance_rating, venue_rating, vibe_rating, artist_name, stage, day')

  const map: Record<string, { scores: number[]; name: string; stage: string; day: string }> = {}
  logs?.forEach(l => {
    if (l.performance_rating == null || l.venue_rating == null || l.vibe_rating == null) return
    if (!map[l.artist_id]) {
      map[l.artist_id] = { scores: [], name: l.artist_name ?? 'Unknown', stage: l.stage ?? '', day: l.day ?? '' }
    }
    map[l.artist_id].scores.push(computeShowScore(l.performance_rating, l.venue_rating, l.vibe_rating))
  })

  const rows: ArtistRow[] = Object.entries(map)
    .map(([artist_id, v]) => ({
      artist_id,
      name:     v.name,
      stage:    v.stage,
      day:      v.day,
      avgScore: v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
      count:    v.scores.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  return <RankingsClient initialRows={rows} />
}
