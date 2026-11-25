'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { flushStash, hasStash, takeNextAfterSignIn } from '@/lib/wrapped/stash'

// Where to send someone once they have a session: new accounts pick a
// username first, everyone else goes into the app.
//
// Someone arriving from Done in the Wrapped popup (lib/wrapped/stash.ts) has
// their saves, follows and logs written first and finishes on You, where
// those land. A new account does that after the username screen instead.
export async function pathAfterSignIn(client: SupabaseClient, userId: string): Promise<string> {
  const { data: profile } = await client
    .from('profiles')
    .select('username_set')
    .eq('id', userId)
    .single()

  if (!profile || profile.username_set === false) return '/choose-username'

  const fromWrapped = takeNextAfterSignIn()
  if (fromWrapped || hasStash()) {
    await flushStash(userId)
    if (fromWrapped) return fromWrapped
  }
  // Someone who hasn't picked a show yet goes to the picker, to log one.
  return localStorage.getItem(LOCAL_STORAGE_KEY) ? '/feed' : '/select-festival'
}
