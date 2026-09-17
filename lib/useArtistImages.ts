'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { artistKey, fetchArtistImagesByKey } from '@/lib/artistImages'

// Session-wide cache of artist photos (key -> url, or null when there isn't
// one), on globalThis so every route's copy of this module shares it (see
// lib/supabase/client.ts for why a module-level variable wouldn't).
declare global {
  // eslint-disable-next-line no-var
  var __giglArtistImages: Map<string, string | null> | undefined
}

function cache(): Map<string, string | null> {
  if (!globalThis.__giglArtistImages) globalThis.__giglArtistImages = new Map()
  return globalThis.__giglArtistImages
}

// Photo lookup for the artists on screen: returns name -> url (or null for
// the placeholder). Fetches only names this session hasn't asked about yet,
// and re-renders once they arrive.
export function useArtistImages(names: string[]): (name: string) => string | null {
  const [, setVersion] = useState(0)
  const signature = Array.from(new Set(names.map(artistKey).filter(Boolean))).sort().join('\n')

  useEffect(() => {
    const store = cache()
    const missing = signature.split('\n').filter(key => key && !store.has(key))
    if (missing.length === 0) return

    let cancelled = false
    fetchArtistImagesByKey(createClient(), missing).then(found => {
      missing.forEach(key => store.set(key, found[key] ?? null))
      if (!cancelled) setVersion(v => v + 1)
    })
    return () => { cancelled = true }
  }, [signature])

  return name => cache().get(artistKey(name)) ?? null
}
