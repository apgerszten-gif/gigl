import { NextRequest, NextResponse } from 'next/server'
import { readStoredSettingsWithin } from '@/lib/appSettingsServer'
import { resolveSiteMode, visitorCoords } from '@/lib/siteMode'

// GET /api/settings — the admin page's switches as they apply to whoever is
// asking: the sign-up method, and the site mode already resolved for their
// location (lib/siteMode.ts). Read by every page through lib/appSettings.ts.
//
// Never cached anywhere: the answer depends on where the visitor is, and a
// flipped switch has to reach the next page load.

export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export async function GET(req: NextRequest) {
  const settings = await readStoredSettingsWithin(1500)
  return NextResponse.json(
    {
      signupMethod: settings.signupMethod,
      siteMode: resolveSiteMode(settings.siteMode, visitorCoords(req.headers)),
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
