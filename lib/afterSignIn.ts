'use client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { fetchAppSettings } from '@/lib/appSettings'
import { logHref } from '@/lib/siteMode'

// Where to send someone once they have a session: new accounts pick a
// username first; anyone who has picked a show goes to the feed; everyone
// else to where Log goes in the current site mode (the CRSSD lineup in
// CRSSD mode, show search otherwise).
export async function pathAfterSignIn(client: SupabaseClient, userId: string): Promise<string> {
  const [{ data: profile }, settings] = await Promise.all([
    client.from('profiles').select('username_set').eq('id', userId).single(),
    fetchAppSettings(),
  ])

  if (!profile || profile.username_set === false) return '/choose-username'
  return localStorage.getItem(LOCAL_STORAGE_KEY) ? '/feed' : logHref(settings.siteMode)
}
