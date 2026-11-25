'use client'

import { useEffect, useState } from 'react'
import { createClient } from './supabase/client'
import { localIso } from './dates'

// Notifications: the list on You (components/NotificationsSection.tsx) and
// the count on the dock's You tab (components/BottomNav.tsx).
//
// Nothing is stored per notification. Each load works the list out from the
// tables that already record what happened, the way saved-show reminders do
// (lib/savedShows.ts):
//
//   - a new follower                     follows
//   - likes on one of your logs          show_likes, grouped per log
//   - a comment on one of your logs      show_comments
//   - someone tagged you in their log    show_tags
//   - a show you saved is tomorrow, or tonight   saved_shows
//
// The one stored thing is when you last opened the list,
// profiles.notifications_seen_at. Anything newer is "new": it carries a dot
// on You and counts toward the badge. Until that column exists (end of
// supabase-schema.sql), the time is kept in this browser instead, and the
// later of the two wins either way.

// How far back the list reaches.
const WINDOW_DAYS = 30
// Rows read per kind. Likes are grouped afterwards, so they get more.
const ROW_LIMIT = 50

export interface NotificationPerson {
  id:           string
  username:     string
  display_name: string | null
  avatar_url:   string | null
}

export interface NotificationLog {
  id:         string
  artistId:   string
  artistName: string
}

export interface NotificationShow {
  id:        string
  artist:    string
  venue:     string
  city:      string
  state:     string
  show_date: string
  image_url: string | null
}

interface Base {
  key:    string
  at:     string
  unseen: boolean
}

export type Notification =
  | (Base & { kind: 'follow';  actor: NotificationPerson; followingBack: boolean })
  | (Base & { kind: 'like';    actors: NotificationPerson[]; total: number; log: NotificationLog })
  | (Base & { kind: 'comment'; actor: NotificationPerson; body: string; log: NotificationLog })
  | (Base & { kind: 'tag';     actor: NotificationPerson; log: NotificationLog })
  | (Base & { kind: 'show';    show: NotificationShow; when: 'tonight' | 'tomorrow' })

interface LogRow { id: string; user_id: string; artist_id: string; artist_name: string }

// supabase-js types a to-one embed loosely; it arrives as one object.
function embeddedLog(value: unknown): LogRow | null {
  const row = Array.isArray(value) ? value[0] : value
  return row && typeof row === 'object' ? (row as LogRow) : null
}

function toLog(row: LogRow): NotificationLog {
  return { id: row.id, artistId: row.artist_id, artistName: row.artist_name }
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

// ── When you last looked ─────────────────────────────────────────────────

const LOCAL_SEEN_KEY = 'gigl:notifications-seen:'

function readLocalSeen(userId: string): string | null {
  try { return window.localStorage.getItem(LOCAL_SEEN_KEY + userId) } catch { return null }
}

function writeLocalSeen(userId: string, iso: string) {
  try { window.localStorage.setItem(LOCAL_SEEN_KEY + userId, iso) } catch { /* private mode */ }
}

function later(a: string | null, b: string | null): string | null {
  if (!a) return b
  if (!b) return a
  return Date.parse(a) >= Date.parse(b) ? a : b
}

async function readSeenAt(userId: string): Promise<string | null> {
  const local = readLocalSeen(userId)
  const { data, error } = await createClient()
    .from('profiles').select('notifications_seen_at').eq('id', userId).maybeSingle()
  // An error here is most likely the column not existing yet.
  if (error) return local
  return later((data?.notifications_seen_at as string | null) ?? null, local)
}

// Called when the list on You has been shown. Clears the badge everywhere.
export async function markNotificationsSeen(userId: string): Promise<void> {
  const now = new Date().toISOString()
  writeLocalSeen(userId, now)
  publishNotificationCount(userId, 0)
  const { error } = await createClient().from('profiles').update({ notifications_seen_at: now }).eq('id', userId)
  if (error) console.warn('notifications_seen_at not saved (kept in this browser):', error.message)
}

// ── The list ─────────────────────────────────────────────────────────────

export async function loadNotifications(userId: string): Promise<Notification[]> {
  const supabase = createClient()
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString()
  const today = startOfToday()
  const todayIso = localIso(today)
  const tomorrowIso = localIso(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1))
  const logJoin = 'logged_shows!inner(id, user_id, artist_id, artist_name)'

  const [seenAt, blocks, follows, likes, comments, tags, saved] = await Promise.all([
    readSeenAt(userId),
    supabase.from('blocks').select('blocked_id').eq('blocker_id', userId),
    supabase.from('follows').select('follower_id, created_at')
      .eq('following_id', userId).neq('follower_id', userId).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(ROW_LIMIT),
    supabase.from('show_likes').select(`user_id, created_at, ${logJoin}`)
      .eq('logged_shows.user_id', userId).neq('user_id', userId).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(ROW_LIMIT * 2),
    supabase.from('show_comments').select(`id, user_id, body, created_at, ${logJoin}`)
      .eq('logged_shows.user_id', userId).neq('user_id', userId).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(ROW_LIMIT),
    supabase.from('show_tags').select(`logged_show_id, created_at, ${logJoin}`)
      .eq('tagged_user_id', userId).neq('logged_shows.user_id', userId).gte('created_at', since)
      .order('created_at', { ascending: false }).limit(ROW_LIMIT),
    supabase.from('saved_shows').select('id, artist, venue, city, state, show_date, image_url')
      .eq('user_id', userId).is('dismissed_at', null)
      .gte('show_date', todayIso).lte('show_date', tomorrowIso),
  ])

  // One kind failing costs only that kind.
  for (const [name, res] of Object.entries({ blocks, follows, likes, comments, tags, saved })) {
    if (res.error) console.error(`notifications: ${name} failed:`, res.error.message)
  }

  // Your own blocks. Comments are already hidden both ways by their read
  // policy; the rest are filtered here.
  const blocked = new Set((blocks.data ?? []).map(row => row.blocked_id as string))

  const followRows = (follows.data ?? []).filter(row => !blocked.has(row.follower_id))
  const likeRows = (likes.data ?? []).flatMap(row => {
    const log = embeddedLog(row.logged_shows)
    return log && !blocked.has(row.user_id) ? [{ user_id: row.user_id as string, created_at: row.created_at as string, log }] : []
  })
  const commentRows = (comments.data ?? []).flatMap(row => {
    const log = embeddedLog(row.logged_shows)
    return log && !blocked.has(row.user_id) ? [{ id: row.id as string, user_id: row.user_id as string, body: row.body as string, created_at: row.created_at as string, log }] : []
  })
  const tagRows = (tags.data ?? []).flatMap(row => {
    const log = embeddedLog(row.logged_shows)
    return log && !blocked.has(log.user_id) ? [{ created_at: row.created_at as string, log }] : []
  })

  const actorIds = Array.from(new Set([
    ...followRows.map(row => row.follower_id as string),
    ...likeRows.map(row => row.user_id),
    ...commentRows.map(row => row.user_id),
    ...tagRows.map(row => row.log.user_id),
  ]))
  const followerIds = followRows.map(row => row.follower_id as string)

  const [people, myFollows] = await Promise.all([
    actorIds.length > 0
      ? supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', actorIds)
      : Promise.resolve({ data: [], error: null }),
    followerIds.length > 0
      ? supabase.from('follows').select('following_id').eq('follower_id', userId).in('following_id', followerIds)
      : Promise.resolve({ data: [], error: null }),
  ])
  if (people.error) console.error('notifications: profiles failed:', people.error.message)
  const byId = new Map(((people.data ?? []) as NotificationPerson[]).filter(p => p.username).map(p => [p.id, p]))
  const followingBack = new Set((myFollows.data ?? []).map(row => row.following_id as string))

  const isNew = (at: string) => !seenAt || Date.parse(at) > Date.parse(seenAt)
  const items: Notification[] = []

  for (const row of followRows) {
    const actor = byId.get(row.follower_id)
    if (!actor) continue
    items.push({ kind: 'follow', key: `follow:${actor.id}`, at: row.created_at, unseen: isNew(row.created_at), actor, followingBack: followingBack.has(actor.id) })
  }

  // Likes on one log become one row: "@mo and 3 others liked…". Newest first,
  // so the first liker named is the latest.
  const likesByLog = new Map<string, typeof likeRows>()
  for (const row of likeRows) {
    const list = likesByLog.get(row.log.id) ?? []
    list.push(row)
    likesByLog.set(row.log.id, list)
  }
  likesByLog.forEach(rows => {
    const actors = rows.map(row => byId.get(row.user_id)).filter((p): p is NotificationPerson => !!p)
    if (actors.length === 0) return
    const at = rows[0].created_at
    items.push({ kind: 'like', key: `like:${rows[0].log.id}`, at, unseen: isNew(at), actors, total: actors.length, log: toLog(rows[0].log) })
  })

  for (const row of commentRows) {
    const actor = byId.get(row.user_id)
    if (!actor) continue
    items.push({ kind: 'comment', key: `comment:${row.id}`, at: row.created_at, unseen: isNew(row.created_at), actor, body: row.body, log: toLog(row.log) })
  }

  for (const row of tagRows) {
    const actor = byId.get(row.log.user_id)
    if (!actor) continue
    items.push({ kind: 'tag', key: `tag:${row.log.id}`, at: row.created_at, unseen: isNew(row.created_at), actor, log: toLog(row.log) })
  }

  // A saved show is a reminder from the start of the day before, and again
  // from the start of its own day, so each is new once.
  const reminders: Notification[] = ((saved.data ?? []) as NotificationShow[]).map(show => {
    const when = show.show_date === todayIso ? 'tonight' : 'tomorrow'
    const at = today.toISOString()
    return { kind: 'show', key: `show:${show.id}:${when}`, at, unseen: isNew(at), show, when }
  })
  reminders.sort((a, b) => (a.kind === 'show' && b.kind === 'show' ? a.show.show_date.localeCompare(b.show.show_date) : 0))

  items.sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
  // Reminders first: they're the only ones with a deadline.
  return [...reminders, ...items]
}

// ── The badge ────────────────────────────────────────────────────────────
// Shared through globalThis and a window event rather than module state,
// because Next gives each route its own copy of this module (see the note
// in lib/supabase/client.ts). Re-read at most every couple of minutes.

const COUNT_EVENT = 'gigl:notification-count'
const COUNT_TTL_MS = 2 * 60_000

declare global {
  // eslint-disable-next-line no-var
  var __giglNotificationCount: { userId: string; count: number; at: number } | undefined
  // eslint-disable-next-line no-var
  var __giglNotificationCountLoading: string | undefined
}

export function publishNotificationCount(userId: string, count: number) {
  globalThis.__giglNotificationCount = { userId, count, at: Date.now() }
  window.dispatchEvent(new CustomEvent(COUNT_EVENT, { detail: { userId, count } }))
}

function refreshCount(userId: string) {
  if (globalThis.__giglNotificationCountLoading === userId) return
  globalThis.__giglNotificationCountLoading = userId
  loadNotifications(userId)
    .then(items => publishNotificationCount(userId, items.filter(item => item.unseen).length))
    .catch(err => console.error('notification count failed:', err))
    .finally(() => { globalThis.__giglNotificationCountLoading = undefined })
}

// How many notifications are new, for the dock. 0 when signed out.
export function useNotificationCount(userId: string | null): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!userId) { setCount(0); return }
    const onChange = (event: Event) => {
      const detail = (event as CustomEvent<{ userId: string; count: number }>).detail
      if (detail.userId === userId) setCount(detail.count)
    }
    window.addEventListener(COUNT_EVENT, onChange)

    const cached = globalThis.__giglNotificationCount
    if (cached && cached.userId === userId) setCount(cached.count)
    if (!cached || cached.userId !== userId || Date.now() - cached.at > COUNT_TTL_MS) refreshCount(userId)

    return () => window.removeEventListener(COUNT_EVENT, onChange)
  }, [userId])

  return userId ? count : 0
}
