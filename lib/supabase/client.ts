import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { resilientFetch } from '../supabaseFetch'

let client: SupabaseClient | undefined

// Memoized on purpose: every 'use client' component calls this directly in
// its render body (not useMemo), so on every re-render (every keystroke,
// every state update) it was constructing a brand new GoTrueClient against
// the same localStorage auth key - the "Multiple GoTrueClient instances"
// console warning. Per PERF_INVESTIGATION, that showed up as a trivial
// 2-row query consistently taking 800-2300ms, not just occasionally - the
// competing clients were duplicating/racing session and token-refresh work
// in front of every real request. This file only ever runs in the browser,
// so one client per tab is exactly right - no per-request server state to
// leak between users.
export function createClient() {
  if (!client) {
    client = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { fetch: resilientFetch } }
    )
  }
  return client
}
