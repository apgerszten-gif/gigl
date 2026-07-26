'use client'

import { useEffect } from 'react'
import { flushPendingLogs } from '@/lib/pendingLogs'

// Mounted once at the root of the app (no UI). Retries any locally-queued,
// not-yet-synced ratings on mount, on reconnect, and whenever the app comes
// back to the foreground — so a rating queued while offline eventually
// reaches Supabase without the user having to do anything.
export function PendingLogsSync() {
  useEffect(() => {
    flushPendingLogs()

    function onOnline() { flushPendingLogs() }
    function onVisibility() { if (!document.hidden) flushPendingLogs() }

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  return null
}
