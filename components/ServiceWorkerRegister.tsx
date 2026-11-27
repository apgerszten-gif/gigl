'use client'

import { useEffect } from 'react'

// Mounted once at the root (no UI). Registers public/sw.js, whose only job is
// to receive photos shared to the installed Android app. Production only, so
// local development never has a worker caching or answering anything.
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch(err => {
      console.error('[sw] registration failed:', err)
    })
  }, [])
  return null
}
