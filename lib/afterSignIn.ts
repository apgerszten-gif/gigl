'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'

// Where to send someone once they have a session: new accounts pick a
// username first, everyone else goes into the app.
export async function pathAfterSignIn(client: SupabaseClient, userId: string): Promise<string> {
  const { data: profile } = await client
    .from('profiles')
    .select('username_set')
    .eq('id', userId)
    .single()

  if (!profile || profile.username_set === false) return '/choose-username'
  return localStorage.getItem(LOCAL_STORAGE_KEY) ? '/feed' : '/select-festival'
}
