'use client'

import { enqueuePendingLog, flushPendingLogs, type GuestDraft } from '@/lib/pendingLogs'
import { saveShow, type SavableShow } from '@/lib/savedShows'
import { followName } from '@/lib/followedNames'
import { computeShowScore, deriveLegacyEmoji } from '@/lib/rating'
import { recordWrappedStep } from '@/lib/visitor'

// What someone without an account does in the Wrapped flow, kept on this
// phone until they sign up: the upcoming shows they saved, the artists they
// followed, and the past shows they logged. Done in the flow sends them to
// sign-up, and flushStash() writes it all to the new account.
//
// The log screen's own guest draft (lib/pendingLogs.ts) holds one log at a
// time, for the one screen it's written on. The Wrapped flow logs several
// shows in a row, so it keeps its own list here. Like that draft, a log
// here has no photos: a File can't be written to localStorage.

const STASH_KEY = 'gigl_wrapped_stash'
const WELCOME_KEY = 'gigl_wrapped_welcome'
export const WELCOME_EVENT = 'gigl:wrapped-welcome'

export interface WrappedStash {
  saves:   SavableShow[]
  follows: string[]
  logs:    GuestDraft[]
  // Set when they pressed Done, which sends them to sign-up. Lets sign-up
  // treat them as coming from the flow even if they kept nothing.
  doneAt?: number
}

export interface WrappedCounts {
  logs:    number
  saves:   number
  follows: number
}

const EMPTY: WrappedStash = { saves: [], follows: [], logs: [] }

export function readStash(): WrappedStash {
  if (typeof window === 'undefined') return EMPTY
  try {
    const raw = localStorage.getItem(STASH_KEY)
    const parsed = raw ? JSON.parse(raw) as Partial<WrappedStash> : null
    return {
      saves:   Array.isArray(parsed?.saves) ? parsed!.saves : [],
      follows: Array.isArray(parsed?.follows) ? parsed!.follows : [],
      logs:    Array.isArray(parsed?.logs) ? parsed!.logs : [],
      doneAt:  typeof parsed?.doneAt === 'number' ? parsed.doneAt : undefined,
    }
  } catch {
    return EMPTY
  }
}

function writeStash(stash: WrappedStash): void {
  try {
    const empty = stash.saves.length === 0 && stash.follows.length === 0 && stash.logs.length === 0 && !stash.doneAt
    if (empty) localStorage.removeItem(STASH_KEY)
    else localStorage.setItem(STASH_KEY, JSON.stringify(stash))
  } catch {
    // Storage full or blocked: the choices only last as long as the page.
  }
}

export function countsOf(stash: WrappedStash): WrappedCounts {
  return { logs: stash.logs.length, saves: stash.saves.length, follows: stash.follows.length }
}

// Whether there's anything from the flow waiting for an account.
export function hasStash(): boolean {
  const stash = readStash()
  return !!stash.doneAt || stash.saves.length > 0 || stash.follows.length > 0 || stash.logs.length > 0
}

export function stashSave(show: SavableShow): void {
  const stash = readStash()
  writeStash({ ...stash, saves: [...stash.saves.filter(s => s.id !== show.id), show] })
}

export function stashUnsave(showId: string): void {
  const stash = readStash()
  writeStash({ ...stash, saves: stash.saves.filter(s => s.id !== showId) })
}

export function stashFollows(names: string[]): void {
  const stash = readStash()
  writeStash({ ...stash, follows: Array.from(new Set([...stash.follows, ...names])) })
}

export function stashLog(draft: GuestDraft): void {
  const stash = readStash()
  writeStash({ ...stash, logs: [...stash.logs.filter(l => l.artist_id !== draft.artist_id), draft] })
}

// Done in the flow, on the way to sign-up. Also notes that sign-up should
// finish on You, where the shows land, rather than the usual next screen.
export function markStashDone(): void {
  writeStash({ ...readStash(), doneAt: Date.now() })
  try {
    localStorage.setItem(NEXT_KEY, '/profile')
  } catch {
    // they land wherever sign-up normally goes
  }
}

const NEXT_KEY = 'gigl_wrapped_next'

// Where sign-up should finish for someone coming from the flow's Done, once:
// reading it clears it. Null for everyone else.
export function takeNextAfterSignIn(): string | null {
  try {
    const next = localStorage.getItem(NEXT_KEY)
    if (next) localStorage.removeItem(NEXT_KEY)
    return next === '/profile' ? next : null
  } catch {
    return null
  }
}

// A log in the shape the log screen queues it, under an account.
export function queueLog(userId: string, draft: GuestDraft): void {
  enqueuePendingLog({
    ...draft,
    user_id:    userId,
    photo_url:  null,
    media_urls: null,
    emoji:      deriveLegacyEmoji(computeShowScore(draft.performance_rating, draft.venue_rating)),
  })
}

let flushing: Promise<void> | null = null

// Writes everything waiting to the account that just signed in. Called by
// sign-up itself before it moves on (lib/afterSignIn.ts and the username
// screen), so their account opens with it all in place, and again on every
// screen change by WrappedStashSync in case they signed in some other way.
//
// Logs move into the log queue, which can't lose them and retries on its
// own. Saves and follows that fail (straight after sign-up the profile row
// may not exist yet) stay here for the next attempt.
export function flushStash(userId: string): Promise<void> {
  if (!flushing) {
    flushing = doFlush(userId).finally(() => { flushing = null })
  }
  return flushing
}

async function doFlush(userId: string): Promise<void> {
  const stash = readStash()
  if (!hasStash()) return

  for (const log of stash.logs) queueLog(userId, log)
  writeStash({ ...readStash(), logs: [] })
  await flushPendingLogs().catch(err => console.error('flushing Wrapped logs failed:', err))

  const failedSaves: SavableShow[] = []
  for (const show of stash.saves) {
    try {
      await saveShow(userId, show, false)
    } catch (err) {
      console.error('saving a Wrapped show failed:', err)
      failedSaves.push(show)
    }
  }

  const failedFollows: string[] = []
  for (const name of stash.follows) {
    try {
      await followName(userId, { kind: 'artist', name, city: '', state: '' })
    } catch (err) {
      console.error('following a Wrapped artist failed:', err)
      failedFollows.push(name)
    }
  }

  writeStash({ saves: failedSaves, follows: failedFollows, logs: readStash().logs })

  // The account's welcome card on You says what arrived. Added to anything
  // an earlier, partly failed attempt already reported and isn't shown yet.
  const written: WrappedCounts = {
    logs:    stash.logs.length,
    saves:   stash.saves.length - failedSaves.length,
    follows: stash.follows.length - failedFollows.length,
  }
  if (written.logs + written.saves + written.follows > 0) {
    try {
      const raw = localStorage.getItem(WELCOME_KEY)
      const earlier = raw ? JSON.parse(raw) as WrappedCounts : { logs: 0, saves: 0, follows: 0 }
      localStorage.setItem(WELCOME_KEY, JSON.stringify({
        logs:    earlier.logs + written.logs,
        saves:   earlier.saves + written.saves,
        follows: earlier.follows + written.follows,
      }))
    } catch {
      // no welcome card, nothing lost
    }
    window.dispatchEvent(new Event(WELCOME_EVENT))
  }
  recordWrappedStep('signed_up')
}

// The welcome card's counts, once: reading them clears them.
export function takeWelcome(): WrappedCounts | null {
  try {
    const raw = localStorage.getItem(WELCOME_KEY)
    if (!raw) return null
    localStorage.removeItem(WELCOME_KEY)
    return JSON.parse(raw) as WrappedCounts
  } catch {
    return null
  }
}
