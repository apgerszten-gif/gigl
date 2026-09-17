'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Coords } from './geo'

// Browser geolocation for the "near me" filter on show search.
//
// Two rules shape this:
//
// 1. **Never ask on page load.** The permission prompt is a one-shot: a
//    person who dismisses it on arrival, before they know what it is for,
//    has to dig into site settings to undo that. So the prompt only fires
//    from a tap on the Near me control. (Safari on iOS also drops prompts
//    that aren't tied to a user gesture, so an on-load request would often
//    fail silently anyway.)
// 2. **Remember the choice, not just the position.** Once someone has opted
//    in, the filter should already be on next visit. Re-requesting a
//    position when permission is still granted doesn't re-prompt, so this
//    re-asks the browser on mount and only falls back to the cached fix for
//    the moment before it answers.

const STORAGE_KEY = 'gigl.nearby.v1'

// A remembered fix older than this is treated as "probably not where you are
// any more" and only used as a placeholder while a fresh one loads.
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Let the browser hand back its own recent fix rather than waking the GPS:
// a show 30 miles away doesn't move because you walked a block.
const POSITION_MAX_AGE_MS = 5 * 60 * 1000
const POSITION_TIMEOUT_MS = 10_000

export const RADIUS_OPTIONS = [25, 50, 100] as const
export type RadiusMiles = (typeof RADIUS_OPTIONS)[number]
export const DEFAULT_RADIUS: RadiusMiles = 50

export type NearbyStatus =
  | 'off'          // not asked for, or turned back off
  | 'locating'     // waiting on the browser (may be showing its prompt)
  | 'on'           // we have a position and the filter is live
  | 'denied'       // permission refused - only the person can undo this
  | 'unavailable'  // no geolocation API, insecure origin, or the fix failed

interface StoredState {
  enabled: boolean
  radiusMiles: RadiusMiles
  coords?: Coords
  savedAt?: number
}

function readStored(): StoredState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredState
    if (typeof parsed?.enabled !== 'boolean') return null
    return parsed
  } catch {
    // Private mode, corrupt JSON, a schema change - none of it is worth
    // breaking search over. Behave as if nothing was remembered.
    return null
  }
}

function writeStored(state: StoredState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage full or blocked; the filter still works for this session.
  }
}

function isRadius(value: unknown): value is RadiusMiles {
  return RADIUS_OPTIONS.includes(value as RadiusMiles)
}

export interface Nearby {
  status:      NearbyStatus
  coords:      Coords | null
  radiusMiles: RadiusMiles
  /**
   * False until the remembered choice has been read back. Callers that
   * fetch on mount should wait for it, or a returning near-me user sees an
   * unfiltered list flash past before the filter reapplies.
   */
  ready:       boolean
  /** True once there is a position to filter by. */
  active:      boolean
  enable:      () => void
  disable:     () => void
  setRadius:   (miles: RadiusMiles) => void
}

export function useNearby(): Nearby {
  const [status, setStatus]   = useState<NearbyStatus>('off')
  const [coords, setCoords]   = useState<Coords | null>(null)
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(DEFAULT_RADIUS)
  const [ready, setReady]     = useState(false)

  const request = useCallback((radius: RadiusMiles) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      return
    }

    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      position => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude }
        setCoords(next)
        setStatus('on')
        writeStored({ enabled: true, radiusMiles: radius, coords: next, savedAt: Date.now() })
      },
      error => {
        // PERMISSION_DENIED is the only one worth a different message: the
        // person has to change it in site settings, so telling them to
        // "try again" would be a lie. Position-unavailable and timeout are
        // both transient and retryable.
        setStatus(error.code === error.PERMISSION_DENIED ? 'denied' : 'unavailable')
        writeStored({ enabled: false, radiusMiles: radius })
      },
      { enableHighAccuracy: false, maximumAge: POSITION_MAX_AGE_MS, timeout: POSITION_TIMEOUT_MS },
    )
  }, [])

  // Restore a previous opt-in. The cached fix paints results immediately;
  // the request behind it replaces those coordinates a moment later, and
  // catches the case where permission was revoked since.
  useEffect(() => {
    const stored = readStored()
    // Set last: everything above it is what callers are waiting to see.
    if (!stored) { setReady(true); return }
    if (isRadius(stored.radiusMiles)) setRadiusMiles(stored.radiusMiles)
    if (!stored.enabled) { setReady(true); return }

    const radius = isRadius(stored.radiusMiles) ? stored.radiusMiles : DEFAULT_RADIUS
    const fresh = stored.coords && stored.savedAt && Date.now() - stored.savedAt < CACHE_MAX_AGE_MS
    if (fresh && stored.coords) {
      setCoords(stored.coords)
      setStatus('on')
    }
    setReady(true)
    // Fire-and-forget: the cached fix above (when there is one) already has
    // the list filtered; this just refreshes it and catches a revoked
    // permission.
    request(radius)
  }, [request])

  const enable = useCallback(() => {
    // Someone who was refused once can tap again after fixing it in site
    // settings; the browser answers straight away either way.
    request(radiusMiles)
  }, [request, radiusMiles])

  const disable = useCallback(() => {
    setStatus('off')
    setCoords(null)
    writeStored({ enabled: false, radiusMiles })
  }, [radiusMiles])

  const setRadius = useCallback((miles: RadiusMiles) => {
    setRadiusMiles(miles)
    // Radius is remembered even while the filter is off, so turning it back
    // on doesn't silently reset to the default.
    writeStored({
      enabled: coords != null,
      radiusMiles: miles,
      coords: coords ?? undefined,
      savedAt: coords ? Date.now() : undefined,
    })
  }, [coords])

  return {
    status,
    coords,
    radiusMiles,
    ready,
    active: status === 'on' && coords != null,
    enable,
    disable,
    setRadius,
  }
}
