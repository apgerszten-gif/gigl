import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { resilientFetch } from './supabaseFetch'

// Server-only client using the service role key, which bypasses RLS. Only
// ever import this from API routes (never from client components) — it's
// needed for sms_verification_codes (no RLS policies at all) and for
// reading/writing another user's row by phone number in the webhook, which
// the normal anon-key client can't do under the "own row only" update
// policy.
//
// Lazily constructed (not a module-scope const) so that Next's build-time
// page-data collection, which imports every route module, doesn't crash on
// deploys where SUPABASE_SERVICE_ROLE_KEY isn't set yet (e.g. SMS scoring
// paused/not configured) — it only throws once a route actually calls it.
let client: SupabaseClient | null = null

export function supabaseAdmin(): SupabaseClient {
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        global: { fetch: resilientFetch },
      }
    )
  }
  return client
}
