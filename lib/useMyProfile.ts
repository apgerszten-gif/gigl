'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'

export interface MyProfile {
  username:     string | null
  display_name: string | null
  avatar_url:   string | null
}

// Cached on globalThis rather than in a module-level variable, since Next.js
// gives each route its own copy of this module (see lib/supabase/client.ts).
// Without it every page's header would refetch the same row on navigation.
declare global {
  // eslint-disable-next-line no-var
  var __giglMyProfile: { userId: string; profile: MyProfile } | undefined
}

const CHANGED_EVENT = 'gigl:my-profile-changed'

// Call after changing your own profile (e.g. a new photo) so every header
// already on screen picks it up without a refetch.
export function updateMyProfile(userId: string, patch: Partial<MyProfile>) {
  const current = globalThis.__giglMyProfile
  if (!current || current.userId !== userId) return
  globalThis.__giglMyProfile = { userId, profile: { ...current.profile, ...patch } }
  window.dispatchEvent(new Event(CHANGED_EVENT))
}

// The signed-in user's name and photo, for the header.
export function useMyProfile(): MyProfile | null {
  const { user } = useAuth()
  const cached = user && globalThis.__giglMyProfile?.userId === user.id ? globalThis.__giglMyProfile.profile : null
  const [profile, setProfile] = useState<MyProfile | null>(cached)

  useEffect(() => {
    if (!user) { setProfile(null); return }

    const onChange = () => {
      if (globalThis.__giglMyProfile?.userId === user.id) setProfile(globalThis.__giglMyProfile.profile)
    }
    window.addEventListener(CHANGED_EVENT, onChange)

    let cancelled = false
    if (globalThis.__giglMyProfile?.userId === user.id) {
      setProfile(globalThis.__giglMyProfile.profile)
    } else {
      createClient().from('profiles').select('username, display_name, avatar_url').eq('id', user.id).single()
        .then(({ data }) => {
          if (cancelled || !data) return
          globalThis.__giglMyProfile = { userId: user.id, profile: data }
          setProfile(data)
        })
    }

    return () => {
      cancelled = true
      window.removeEventListener(CHANGED_EVENT, onChange)
    }
  }, [user])

  return profile
}
