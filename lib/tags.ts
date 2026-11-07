import type { SupabaseClient } from '@supabase/supabase-js'

// Tagging who you went to a show with. A tag is a show_tags row (the log,
// the person tagged). There are two ways to make one on the log screen, and
// both end up in the same list (components/TagPeople.tsx):
//
//   - writing @username in the review. That tag lasts as long as the @ does:
//     take the @ out of the text and they're untagged on the next save.
//   - the "Did you go with another Gigl user?" bar under the photos, for
//     someone you don't mention.
//
// show_tags rows from the old invite flow can have no tagged_user_id
// (pending_invite); nothing here creates or touches those.

export interface TaggedPerson {
  id:           string
  username:     string
  display_name: string | null
  avatar_url:   string | null
}

// Usernames are [a-z0-9_] (lib/username.ts). The character before the @
// can't be part of a word, so an email address or "a@b" is never a mention.
const MENTION = /(^|[^a-z0-9_@])@([a-z0-9_]{1,30})/gi

// Every @username in a review, lower-cased, in order, without repeats.
export function mentionedUsernames(text: string | null | undefined): string[] {
  if (!text) return []
  const seen = new Set<string>()
  for (const match of Array.from(text.matchAll(MENTION))) seen.add(match[2].toLowerCase())
  return Array.from(seen)
}

// The @word the caret is at the end of, while someone is typing it: where
// its @ is and what's been typed after it (possibly nothing yet). Null when
// the caret isn't in a mention.
export function activeMention(text: string, caret: number): { start: number; query: string } | null {
  const match = /(^|[^a-z0-9_@])@([a-z0-9_]{0,30})$/i.exec(text.slice(0, caret))
  if (!match) return null
  return { start: caret - match[2].length - 1, query: match[2].toLowerCase() }
}

// Splits text into plain runs and @mentions, for drawing mentions in a
// different style (the review box's highlight, and links on the feed).
export function splitMentions(text: string): { text: string; username?: string }[] {
  const parts: { text: string; username?: string }[] = []
  let last = 0
  for (const match of Array.from(text.matchAll(MENTION))) {
    const at = (match.index ?? 0) + match[1].length
    if (at > last) parts.push({ text: text.slice(last, at) })
    parts.push({ text: `@${match[2]}`, username: match[2].toLowerCase() })
    last = at + match[2].length + 1
  }
  if (last < text.length) parts.push({ text: text.slice(last) })
  return parts
}

// Turns @username back into plain username in the text, for untagging
// someone from a chip without deleting the words around them.
export function unmention(text: string, username: string): string {
  const pattern = new RegExp(`(^|[^a-z0-9_@])@(${username})(?![a-z0-9_])`, 'gi')
  return text.replace(pattern, '$1$2')
}

// Makes a log's tags exactly `userIds`: adds the missing, removes the rest.
// Best-effort per person: a tag the database refuses (someone who has
// blocked you, say) is skipped rather than failing the others.
export async function syncShowTags(client: SupabaseClient, logId: string, userIds: string[]): Promise<void> {
  const { data: existing, error } = await client
    .from('show_tags').select('tagged_user_id').eq('logged_show_id', logId).not('tagged_user_id', 'is', null)
  if (error) throw error

  const have = new Set((existing ?? []).map(r => r.tagged_user_id as string))
  const want = new Set(userIds)
  const remove = Array.from(have).filter(id => !want.has(id))
  const add = Array.from(want).filter(id => !have.has(id))

  if (remove.length > 0) {
    const { error: removeError } = await client.from('show_tags').delete().eq('logged_show_id', logId).in('tagged_user_id', remove)
    if (removeError) console.error('show_tags delete failed:', removeError.message)
  }
  for (const id of add) {
    const { error: addError } = await client.from('show_tags').insert({ logged_show_id: logId, tagged_user_id: id })
    if (addError && addError.code !== '23505') console.error('show_tags insert failed:', addError.message)
  }
}

// The people tagged on each of these logs, for the feed's "with" line.
export async function loadTagsForLogs(client: SupabaseClient, logIds: string[]): Promise<Record<string, string[]>> {
  if (logIds.length === 0) return {}
  const { data, error } = await client
    .from('show_tags').select('logged_show_id, tagged_user_id').in('logged_show_id', logIds).not('tagged_user_id', 'is', null)
  if (error) { console.error('show_tags read failed:', error.message); return {} }
  const byLog: Record<string, string[]> = {}
  for (const row of data ?? []) (byLog[row.logged_show_id] ??= []).push(row.tagged_user_id)
  return byLog
}

// One log someone was tagged on, for "Tagged in" on their profile.
export interface TaggedInLog {
  logId:      string
  artistId:   string
  artistName: string
  venue:      string | null
  stage:      string | null
  day:        string | null
  showDate:   string | null
  by:         string | null
}

// The logs `userId` is tagged on, newest show first. With a signed-in
// client, logs by someone either of you blocked are left out by the
// logged_shows read policy.
export async function loadTaggedIn(client: SupabaseClient, userId: string, limit = 20): Promise<TaggedInLog[]> {
  const { data: tags, error } = await client
    .from('show_tags').select('logged_show_id').eq('tagged_user_id', userId)
    .order('created_at', { ascending: false }).limit(limit)
  if (error || !tags || tags.length === 0) return []

  const { data: logs } = await client
    .from('logged_shows').select('id, user_id, artist_id, artist_name, venue, stage, day, show_date')
    .in('id', tags.map(t => t.logged_show_id))
  if (!logs || logs.length === 0) return []

  const { data: owners } = await client
    .from('profiles').select('id, username').in('id', Array.from(new Set(logs.map(l => l.user_id))))
  const usernameOf = new Map((owners ?? []).map(p => [p.id, p.username as string]))

  return logs
    .map(l => ({
      logId:      l.id,
      artistId:   l.artist_id,
      artistName: l.artist_name,
      venue:      l.venue,
      stage:      l.stage,
      day:        l.day,
      showDate:   l.show_date,
      by:         usernameOf.get(l.user_id) ?? null,
    }))
    .sort((a, b) => (b.showDate ?? '').localeCompare(a.showDate ?? ''))
}
