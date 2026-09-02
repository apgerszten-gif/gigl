import type { SupabaseClient } from '@supabase/supabase-js'

// Purely additive gamification bookkeeping - never touches performance_rating/
// venue_rating/crowd_rating or anything computeShowScore() reads. Read-then-
// upsert (not a single atomic increment) since this runs through the anon
// client under RLS; a rare lost update from battling in two tabs at once
// is an acceptable tradeoff for a fun side leaderboard.
export async function recordBattleResult(
  supabase: SupabaseClient,
  userId: string,
  winnerArtistId: string,
  loserArtistId: string,
): Promise<void> {
  const [{ data: winnerRow }, { data: loserRow }] = await Promise.all([
    supabase.from('battle_records').select('wins, losses').eq('user_id', userId).eq('artist_id', winnerArtistId).maybeSingle(),
    supabase.from('battle_records').select('wins, losses').eq('user_id', userId).eq('artist_id', loserArtistId).maybeSingle(),
  ])

  await Promise.all([
    supabase.from('battle_records').upsert({
      user_id: userId,
      artist_id: winnerArtistId,
      wins: (winnerRow?.wins ?? 0) + 1,
      losses: winnerRow?.losses ?? 0,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,artist_id' }),
    supabase.from('battle_records').upsert({
      user_id: userId,
      artist_id: loserArtistId,
      wins: loserRow?.wins ?? 0,
      losses: (loserRow?.losses ?? 0) + 1,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,artist_id' }),
  ])
}
