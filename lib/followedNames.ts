import { createClient } from './supabase/client'
import { nameKey } from './nameKey'

// Following an artist or a venue (artist_venue_follows at the end of
// supabase-schema.sql), so their shows land in the Upcoming tab's Following
// view. A follow is a name, matched ignoring case, the way /artists and
// /venues match; a venue is its name and its city. Owner-only under RLS.

export type FollowKind = 'artist' | 'venue'

export interface FollowedName {
  kind:  FollowKind
  name:  string
  // A venue's; empty for an artist.
  city:  string
  state: string
}

const TABLE = 'artist_venue_follows'

// One key per follow, for "is this followed?" checks.
export function followKey(follow: FollowedName): string {
  return [follow.kind, nameKey(follow.name), nameKey(follow.city), follow.state].join('|')
}

// For an exact, case-insensitive ILIKE: the name's own wildcards escaped.
function exactPattern(input: string): string {
  return input.trim().replace(/[\\%_]/g, ch => `\\${ch}`)
}

export async function fetchFollowedNames(userId: string): Promise<FollowedName[]> {
  const { data, error } = await createClient()
    .from(TABLE)
    .select('kind, name, city, state')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
  if (error) throw new Error(error.message)
  return (data ?? []) as FollowedName[]
}

export async function followName(userId: string, follow: FollowedName): Promise<void> {
  const { error } = await createClient().from(TABLE).insert({
    user_id: userId,
    kind:    follow.kind,
    name:    follow.name.trim(),
    city:    follow.kind === 'venue' ? follow.city.trim() : '',
    state:   follow.kind === 'venue' ? follow.state.trim() : '',
  })
  // Already following (the unique index): that's the state we wanted.
  if (error && error.code !== '23505') throw new Error(error.message)
}

export async function unfollowName(userId: string, follow: FollowedName): Promise<void> {
  let query = createClient().from(TABLE).delete()
    .eq('user_id', userId)
    .eq('kind', follow.kind)
    .ilike('name', exactPattern(follow.name))
  if (follow.kind === 'venue') {
    query = query.ilike('city', exactPattern(follow.city) || '').eq('state', follow.state)
  }
  const { error } = await query
  if (error) throw new Error(error.message)
}
