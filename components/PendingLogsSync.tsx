'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { flushPendingLogs, queueGuestDraft } from '@/lib/pendingLogs'
import { useAuth } from '@/components/AuthProvider'

// Mounted once at the root of the app (no UI). Retries any locally-queued,
// not-yet-synced ratings on mount, on reconnect, whenever the app comes
// back to the foreground, and on every move between screens — so a rating
// queued while offline eventually reaches Supabase without the user having
// to do anything.
export function PendingLogsSync() {
  const { user } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    function onOnline() { flushPendingLogs() }
    function onVisibility() { if (!document.hidden) flushPendingLogs() }

    window.addEventListener('online', onOnline)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('online', onOnline)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // A log written before signing up posts once there is an account,
  // wherever that account was made. The log screen saves its own draft,
  // with any photos still attached, so it's left to do that there.
  //
  // Also the retry on each screen change: straight after sign-up the new
  // profile row may not exist yet, so the first attempt can fail and wait
  // in the queue for the next screen.
  useEffect(() => {
    if (user && !pathname.startsWith('/log-show')) queueGuestDraft(user.id)
    flushPendingLogs()
  }, [user, pathname])

  return null
}
