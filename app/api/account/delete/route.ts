import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUserId } from '@/lib/apiAuth'
import { deleteAccount } from '@/lib/accountDeletion'

// POST /api/account/delete - deletes the signed-in account and everything it
// posted (lib/accountDeletion.ts). The /delete-account page asks first; this
// route acts on the access token alone, so nobody can delete anyone else's.
export async function POST(req: NextRequest) {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[account/delete] SUPABASE_SERVICE_ROLE_KEY is not set')
    return NextResponse.json({ error: "Account deletion isn't available right now. Email us and we'll do it." }, { status: 503 })
  }

  const userId = await getAuthenticatedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })

  try {
    await deleteAccount(userId)
  } catch (err) {
    console.error(`[account/delete] ${userId}:`, err)
    return NextResponse.json({ error: "Couldn't delete your account. Try again in a minute, or email us and we'll do it." }, { status: 500 })
  }

  console.log(`[account/delete] deleted ${userId}`)
  return NextResponse.json({ deleted: true })
}
