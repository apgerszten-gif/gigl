'use client'

import { createClient } from '@/lib/supabase/client'

const QUEUE_KEY = 'gigl_pending_logs'

export interface PendingLogPayload {
  user_id:            string
  artist_id:          string
  artist_name:        string
  stage:              string | null
  day:                string | null
  venue:              string | null
  show_date:          string | null
  performance_rating: number
  venue_rating:       number
  crowd_rating:       number
  review:             string | null
  tags:               string[] | null
  photo_url:          string | null
  media_urls:         string[] | null
  emoji:              string
}

interface QueuedLog {
  localId:   string
  createdAt: number
  payload:   PendingLogPayload
}

function readQueue(): QueuedLog[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(QUEUE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function writeQueue(queue: QueuedLog[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
}

// Called the instant the user hits "Save log" — persists the rating to
// localStorage before any network call, so a dropped connection can never
// lose it. Re-queuing for the same user/artist (e.g. once media finishes
// uploading a moment later) replaces the earlier entry rather than
// duplicating it.
export function enqueuePendingLog(payload: PendingLogPayload): void {
  const queue = readQueue().filter(q =>
    !(q.payload.user_id === payload.user_id && q.payload.artist_id === payload.artist_id)
  )
  queue.push({ localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, createdAt: Date.now(), payload })
  writeQueue(queue)
}

// Lets the log-show screen prefill from a not-yet-synced local rating if
// the user re-opens the same artist before the background sync completes.
export function getPendingLogForArtist(userId: string, artistId: string): PendingLogPayload | null {
  return readQueue().find(q => q.payload.user_id === userId && q.payload.artist_id === artistId)?.payload ?? null
}

let flushing = false

// Attempts to sync every queued rating to Supabase. Safe to call repeatedly
// (on save, app foreground, reconnect, mount) — no-ops if a flush is already
// in progress or the queue is empty. An entry that fails to sync just stays
// queued for the next trigger rather than being dropped; resilientFetch
// already retries transient network failures within a single attempt here.
export async function flushPendingLogs(): Promise<void> {
  if (flushing) return
  flushing = true
  try {
    const supabase = createClient()
    for (const entry of readQueue()) {
      const { error } = await supabase
        .from('logged_shows')
        .upsert(entry.payload, { onConflict: 'user_id,artist_id' })

      if (!error) {
        writeQueue(readQueue().filter(q => q.localId !== entry.localId))
      }
    }
  } finally {
    flushing = false
  }
}

// ── Guest drafts ─────────────────────────────────────────────────────────────
//
// Someone who hasn't signed up can still write a whole log; the account is
// only asked for when they hit Save. The draft is parked here the moment
// they do, before the sign-up sheet opens, so a page reload while they're
// off fetching a code (or a sheet they close and come back to) doesn't cost
// them what they wrote. There's no user yet, so it can't go in the queue
// above - once they're signed in, the log screen saves it the normal way
// and clears it.
//
// One draft at a time: it's whatever they last tried to post. Photos aren't
// kept - a File can't be written to localStorage - so they only survive as
// long as the log screen stays open, which the sheet is built around.

const GUEST_DRAFT_KEY = 'gigl_guest_draft'

export type GuestDraft = Omit<PendingLogPayload, 'user_id' | 'photo_url' | 'media_urls' | 'emoji'>

export function saveGuestDraft(draft: GuestDraft): void {
  try {
    localStorage.setItem(GUEST_DRAFT_KEY, JSON.stringify(draft))
  } catch {
    // Storage full or blocked: the draft still lives in the page's own state.
  }
}

export function getGuestDraftForArtist(artistId: string): GuestDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(GUEST_DRAFT_KEY)
    const draft: GuestDraft | null = raw ? JSON.parse(raw) : null
    return draft?.artist_id === artistId ? draft : null
  } catch {
    return null
  }
}

export function clearGuestDraft(): void {
  try {
    localStorage.removeItem(GUEST_DRAFT_KEY)
  } catch {
    // nothing to clear
  }
}
