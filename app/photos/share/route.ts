import { NextRequest, NextResponse } from 'next/server'

// The Web Share Target's action (public/manifest.json). When Gigl is
// installed on Android and someone shares photos to it, the browser POSTs
// them here, and the service worker (public/sw.js) answers that POST on the
// phone so the photos never leave it. This route is only reached when the
// worker isn't in control yet, for instance the first time the installed app
// is opened. It deliberately never reads the body: nothing is saved or
// inspected, and the person is sent back to the finder with a note to try
// again.
//
// (The browser may still have sent the photos to get here. They are dropped
// unread, and an over-large request is refused by the host before reaching
// this code, which shows the person an error page instead of the note.)
export const dynamic = 'force-dynamic'

export function POST(req: NextRequest) {
  return NextResponse.redirect(new URL('/photos?shared=0', req.nextUrl.origin), 303)
}

export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/photos', req.nextUrl.origin), 303)
}
