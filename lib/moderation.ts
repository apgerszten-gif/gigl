import { supabaseAdmin } from './supabaseAdmin'

// Taking a log down, from /admin's latest logs or from a report. Permanent.
//
// Likes, reactions, comments and highlight tags go with it (their foreign
// keys cascade). Battle matchups don't cascade, so any the log was part of
// are removed first, or the delete would fail on them.
//
// Returns false when the log was already gone.
export async function removeLog(id: string): Promise<boolean> {
  const admin = supabaseAdmin()
  const { error: matchupError } = await admin.from('matchups').delete().or(`winner_id.eq.${id},loser_id.eq.${id}`)
  if (matchupError) throw new Error(`removing matchups failed: ${matchupError.message}`)

  const { data, error } = await admin.from('logged_shows').delete().eq('id', id).select('id')
  if (error) throw new Error(`removing the log failed: ${error.message}`)
  return !!data && data.length > 0
}

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
