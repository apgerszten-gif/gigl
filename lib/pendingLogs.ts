'use client'

import { createClient } from '@/lib/supabase/client'

const QUEUE_KEY = 'gigl_pending_logs'

export interface PendingLogPayload {
  user_id:            string
  artist_id:          string
  artist_name:        string
  stage:              string
  day:                string
  performance_rating: number
  venue_rating:       number
  vibe_rating:        number
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
