import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getAuthenticatedUserId } from '@/lib/apiAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// POST /api/friends/match — which of these contacts are already on Gigl?
//
// The body is hashes, never numbers. The client normalises each contact to
// E.164 and SHA-256s it (lib/contacts.ts); this route hashes its own users'
// numbers the same way and returns the intersection. Numbers belonging to
// people who aren't on Gigl are therefore never transmitted, never logged
// and never stored - the server cannot reverse a hash it has no user for.
//
// Nothing is persisted either way. This is a lookup, not an import: no
// "contacts" table, no social graph built from people who never signed up.

// supabase-js reads land in Next's Data Cache without this, which for a route
// keyed on request body would be actively wrong.
export const fetchCache = 'default-no-store'

// A big enough address book, and small enough that this can't be used to walk
// the phone-number space looking for accounts.
const MAX_HASHES = 1000

function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex')
}

export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[friends/match] SUPABASE_SERVICE_ROLE_KEY is not set; refusing to run')
    return NextResponse.json({ error: 'Finding friends is not configured yet.' }, { status: 503 })
  }

  const userId = await getAuthenticatedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  let hashes: unknown
  try {
    hashes = (await req.json())?.hashes
  } catch {
    return NextResponse.json({ error: 'Malformed request.' }, { status: 400 })
  }

  if (!Array.isArray(hashes)) {
    return NextResponse.json({ error: 'Expected an array of hashes.' }, { status: 400 })
  }

  const wanted = new Set(
    hashes
      .filter((h): h is string => typeof h === 'string' && /^[a-f0-9]{64}$/.test(h))
      .slice(0, MAX_HASHES),
  )
  if (wanted.size === 0) return NextResponse.json({ matches: [] })

  try {
    // Only people who verified a phone AND left themselves discoverable. The
    // number was originally collected for SMS show scoring, so being findable
    // by it is a separate thing to be able to say no to - see
    // profiles.discoverable_by_phone.
    const { data, error } = await supabaseAdmin()
      .from('profiles')
      .select('id, username, display_name, avatar_url, phone_number')
      .eq('phone_verified', true)
      .eq('discoverable_by_phone', true)
      .not('phone_number', 'is', null)
      .neq('id', userId)

    if (error) throw new Error(error.message)

    // Hashed here rather than stored as a column: it keeps the raw number as
    // the single source of truth, and at this size the cost is nothing. If
    // the user table ever grows past a few thousand this wants a phone_hash
    // column with an index instead of a full scan per request.
    const matches = (data ?? [])
      .filter(row => row.phone_number && wanted.has(sha256Hex(row.phone_number)))
      .map(({ id, username, display_name, avatar_url }) => ({ id, username, display_name, avatar_url }))

    // Who the viewer already follows, so the list can render the right state
    // rather than flashing "Follow" on people they follow already.
    const { data: existing } = await supabaseAdmin()
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)

    const following = new Set((existing ?? []).map(r => r.following_id))

    return NextResponse.json({
      matches: matches.map(m => ({ ...m, following: following.has(m.id) })),
    })
  } catch (err) {
    console.error('friends/match failed:', err)
    return NextResponse.json({ error: "Couldn't check your contacts right now." }, { status: 502 })
  }
}
