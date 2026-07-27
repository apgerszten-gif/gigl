import type { NextRequest } from 'next/server'
import { supabaseAdmin } from './supabaseAdmin'

// Sessions live in the browser's localStorage (see lib/supabase/client.ts),
// which API routes can't read directly — the client sends the access token
// in an Authorization header instead, verified here against Supabase.
export async function getAuthenticatedUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace(/^Bearer\s+/i, '')
  if (!token) return null

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token)
  if (error || !user) return null
  return user.id
}
