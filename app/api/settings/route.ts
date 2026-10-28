import { NextResponse } from 'next/server'
import { readStoredSettingsWithin } from '@/lib/appSettingsServer'

// GET /api/settings — the admin page's switches: the sign-up method. Read by
// every page through lib/appSettings.ts.
//
// Never cached anywhere: a flipped switch has to reach the next page load.

export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export async function GET() {
  const settings = await readStoredSettingsWithin(1500)
  return NextResponse.json(
    {
      signupMethod: settings.signupMethod,
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
