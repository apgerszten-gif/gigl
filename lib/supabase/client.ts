import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'
import { resilientFetch } from '../supabaseFetch'

// Cached on globalThis, not a module-level `let` - Next.js code-splits this
// module into each route's own JS chunk, so a plain module-scope variable
// only dedupes calls within a single chunk. Navigating from /feed to
// /profile loads a *different* chunk with its own copy of that variable,
// still spinning up a second GoTrueClient against the same localStorage
// auth key ("Multiple GoTrueClient instances" persisted even after the
// first memoization attempt - see PERF_INVESTIGATION). globalThis is the
// one thing every chunk actually shares within a tab.
declare global {
  // eslint-disable-next-line no-var
  var __giglSupabaseClient: SupabaseClient | undefined
}

export function createClient() {
  if (!globalThis.__giglSupabaseClient) {
    globalThis.__giglSupabaseClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { fetch: resilientFetch } }
    )
  }
  return globalThis.__giglSupabaseClient
}
