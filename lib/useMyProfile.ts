'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'

export interface MyProfile {
  username:     string | null
  display_name: string | null
}

// Cached on globalThis rather than in a module-level variable, since Next.js
// gives each route its own copy of this module (see lib/supabase/client.ts).
// Without it every page's header would refetch the same row on navigation.
declare global {
  // eslint-disable-next-line no-var
  var __giglMyProfile: { userId: string; profile: MyProfile } | undefined
}

// The signed-in user's name, for the header's profile photo. Gigl has no
// profile photo column yet, so the name's initial is all there is to show.
export function useMyProfile(): MyProfile | null {
  const { user } = useAuth()
  const cached = user && globalThis.__giglMyProfile?.userId === user.id ? globalThis.__giglMyProfile.profile : null
  const [profile, setProfile] = useState<MyProfile | null>(cached)

  useEffect(() => {
    if (!user) { setProfile(null); return }
    if (globalThis.__giglMyProfile?.userId === user.id) { setProfile(globalThis.__giglMyProfile.profile); return }

    let cancelled = false
    createClient().from('profiles').select('username, display_name').eq('id', user.id).single()
      .then(({ data }) => {
        if (cancelled || !data) return
        globalThis.__giglMyProfile = { userId: user.id, profile: data }
        setProfile(data)
      })
    return () => { cancelled = true }
  }, [user])

  return profile
}
