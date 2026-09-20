'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Coords } from './geo'

// Browser geolocation for the "near me" filter on show search.
//
// The location is asked for on arrival, not on a tap: a list of shows is
// only useful once it's local, so the filter is the default rather than an
// opt-in. Three things keep that from being hostile:
//
// 1. **An explicit "off" is a standing answer.** Turning the Near me chip
//    off is remembered, and a later visit neither re-prompts nor re-filters.
//    Only tapping it back on asks again.
// 2. **A refusal is never re-asked either.** The Permissions API is checked
//    first, so a browser that has already been told no is not put through
//    another request it would only reject.
// 3. **The list doesn't wait on the dialog.** While the prompt is up, the
//    unfiltered "Coming up" list loads behind it, and re-filters once the
//    answer arrives. Only when permission is already granted (or a recent
//    fix is cached) does the first search hold for coordinates, because
//    then they're milliseconds away and the flash would be pointless.

const STORAGE_KEY = 'gigl.nearby.v1'

// A remembered fix older than this is treated as "probably not where you are
// any more" and only used as a placeholder while a fresh one loads.
const CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000

// Let the browser hand back its own recent fix rather than waking the GPS:
// a show 30 miles away doesn't move because you walked a block.
const POSITION_MAX_AGE_MS = 5 * 60 * 1000
const POSITION_TIMEOUT_MS = 10_000

export const RADIUS_OPTIONS = [10, 50, 100] as const
export type RadiusMiles = (typeof RADIUS_OPTIONS)[number]
export const DEFAULT_RADIUS: RadiusMiles = 50

export type NearbyStatus =
  | 'locating'     // waiting on the browser (its prompt may be up)
  | 'on'           // we have a position and the filter is live
  | 'off'          // turned off here, and remembered - we won't re-ask
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

// 'granted' | 'prompt' | 'denied', or null when the browser can't say -
// older Safari has no Permissions API, and some implementations throw on
// the 'geolocation' name rather than returning a state.
async function permissionState(): Promise<PermissionState | null> {
  try {
    if (!navigator.permissions?.query) return null
    const result = await navigator.permissions.query({ name: 'geolocation' as PermissionName })
    return result.state
  } catch {
    return null
  }
}

export interface Nearby {
  status:      NearbyStatus
  coords:      Coords | null
  radiusMiles: RadiusMiles
  /**
   * False while the first search should wait. It only stays false when
   * coordinates are imminent (permission already granted, or a recent fix
   * cached); a first-time prompt flips it straight to true so the list
   * loads behind the dialog.
   */
  ready:       boolean
  /** True once there is a position to filter by. */
  active:      boolean
  enable:      () => void
  disable:     () => void
  setRadius:   (miles: RadiusMiles) => void
}

export function useNearby(): Nearby {
  const [status, setStatus]   = useState<NearbyStatus>('locating')
  const [coords, setCoords]   = useState<Coords | null>(null)
  const [radiusMiles, setRadiusMiles] = useState<RadiusMiles>(DEFAULT_RADIUS)
  const [ready, setReady]     = useState(false)

  const request = useCallback((radius: RadiusMiles) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable')
      setReady(true)
      return
    }

    setStatus('locating')
    navigator.geolocation.getCurrentPosition(
      position => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude }
        setCoords(next)
        setStatus('on')
        setReady(true)
        writeStored({ enabled: true, radiusMiles: radius, coords: next, savedAt: Date.now() })
      },
      error => {
        const denied = error.code === error.PERMISSION_DENIED
        // PERMISSION_DENIED is the only one worth a different message: the
        // person has to change it in site settings, so telling them to
        // "try again" would be a lie. Position-unavailable and timeout are
        // both transient and retryable.
        setStatus(denied ? 'denied' : 'unavailable')
        setReady(true)
        // Only a refusal is worth remembering. Recording a timeout would
        // turn one bad fix into a permanently disabled filter.
        if (denied) writeStored({ enabled: false, radiusMiles: radius })
      },
      { enableHighAccuracy: false, maximumAge: POSITION_MAX_AGE_MS, timeout: POSITION_TIMEOUT_MS },
    )
  }, [])

  useEffect(() => {
    let cancelled = false

    const stored = readStored()
    if (stored && isRadius(stored.radiusMiles)) setRadiusMiles(stored.radiusMiles)
    const radius = stored && isRadius(stored.radiusMiles) ? stored.radiusMiles : DEFAULT_RADIUS

    // Turned off here on a previous visit. That's an answer, not an absence
    // of one, so don't quietly start asking again.
    if (stored && !stored.enabled) { setStatus('off'); setReady(true); return }

    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('unavailable'); setReady(true); return
    }

    // A recent fix filters the very first search, so nothing has to wait for
    // the live one that follows.
    const cached = stored?.coords && stored.savedAt && Date.now() - stored.savedAt < CACHE_MAX_AGE_MS
      ? stored.coords
      : null
    if (cached) {
      setCoords(cached)
      setStatus('on')
      setReady(true)
    }

    async function start() {
      const state = await permissionState()
      if (cancelled) return

      // Already refused. getCurrentPosition would only fail, and on some
      // browsers not immediately, so skip it and say so.
      if (state === 'denied') { setStatus('denied'); setReady(true); return }

      // The prompt is about to go up and may sit there for a while. Release
      // the list so there's something behind it. With permission already
      // granted there's no dialog and the fix is nearly instant, so holding
      // avoids an unfiltered flash instead of causing a wait.
      if (state !== 'granted' && !cached) setReady(true)

      request(radius)
    }
    start()

    return () => { cancelled = true }
  }, [request])

  const enable = useCallback(() => {
    // Also the retry after a refusal: someone who has since allowed Gigl in
    // site settings gets an answer straight away.
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
