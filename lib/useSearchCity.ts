'use client'

import { useCallback, useEffect, useState } from 'react'
import type { NamedPlace } from './geo'

// The city someone typed into show search instead of sharing their location.
// Kept on this device only, like everything else about where a person is, so
// they don't have to pick it again on the next show they log.

const STORAGE_KEY = 'gigl.search-city.v1'

function readStored(): NamedPlace | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as NamedPlace
    if (typeof parsed?.city !== 'string' || typeof parsed.state !== 'string') return null
    if (typeof parsed.lat !== 'number' || typeof parsed.lng !== 'number') return null
    return parsed
  } catch {
    return null
  }
}

function writeStored(city: NamedPlace | null) {
  try {
    if (city) localStorage.setItem(STORAGE_KEY, JSON.stringify(city))
    else localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage full or blocked; the filter still works for this session.
  }
}

export function useSearchCity() {
  const [city, setCity] = useState<NamedPlace | null>(null)

  useEffect(() => { setCity(readStored()) }, [])

  const choose = useCallback((next: NamedPlace) => {
    setCity(next)
    writeStored(next)
  }, [])

  const clear = useCallback(() => {
    setCity(null)
    writeStored(null)
  }, [])

  return { city, choose, clear }
}
