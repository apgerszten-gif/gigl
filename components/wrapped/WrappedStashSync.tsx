'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { flushStash, hasStash } from '@/lib/wrapped/stash'

// Mounted once at the root (no UI). Whatever someone kept in the Wrapped
// flow before they had an account goes onto it as soon as they have one.
// Sign-up writes it itself on the way to You (lib/afterSignIn.ts, the
// username screen); this catches every other way of signing in, and retries
// anything that failed, on each move between screens.
export function WrappedStashSync() {
  const { user } = useAuth()
  const pathname = usePathname()

  useEffect(() => {
    // The username screen writes it once the username is saved.
    if (!user || pathname.startsWith('/choose-username') || !hasStash()) return
    void flushStash(user.id)
  }, [user, pathname])

  return null
}
