'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'

// The front door, and where the festival QR codes point. Everyone goes
// straight to the feed: people who haven't signed up can read it and write a
// log, and are only asked for an account when they post (see
// components/SignUpSheet).
//
// This used to play the intro tour and then send people to /auth.
// components/IntroDemo.tsx still holds the tour, unused, if it's wanted back.
export default function HomePage() {
  const router = useRouter()
  const { user, loading } = useAuth()

  useEffect(() => {
    if (loading) return
    // Carried through so a tagged link (?ref=, ?src=) still says where
    // someone came from once they're on the feed.
    const query = window.location.search
    if (!user) { router.replace(`/feed${query}`); return }

    // An account that never picked a username does that first.
    createClient()
      .from('profiles')
      .select('username_set')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        router.replace(!data || data.username_set === false ? '/choose-username' : `/feed${query}`)
      })
  }, [loading, user, router])

  return null
}
