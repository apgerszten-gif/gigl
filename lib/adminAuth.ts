import { NextResponse, type NextRequest } from 'next/server'
import { getAuthenticatedUserId } from './apiAuth'

// Who can use /admin and the /api/admin routes: the owner's two accounts,
// @gertrude (phone) and @a_p_gerszten (email). Ids aren't secrets; what keeps
// everyone else out is the signed access token getAuthenticatedUserId checks.
const ADMIN_USER_IDS = new Set([
  '0bfa6054-b790-401b-b65f-0e1873bae335',
  '6913da75-a093-4887-bfad-56fcb275c656',
])

// null when the caller is an admin; otherwise the response to send back.
export async function refuseUnlessAdmin(req: NextRequest): Promise<NextResponse | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[admin] SUPABASE_SERVICE_ROLE_KEY is not set; refusing to run')
    return NextResponse.json({ error: 'The admin page is not configured.' }, { status: 503 })
  }
  const userId = await getAuthenticatedUserId(req)
  if (!userId) return NextResponse.json({ error: 'Sign in first.' }, { status: 401 })
  if (!ADMIN_USER_IDS.has(userId)) return NextResponse.json({ error: 'Not an admin account.' }, { status: 403 })
  return null
}
