// What GET /api/admin/stats returns to the admin page. Types only, so the
// page can import them without pulling in anything server-side.

export interface AdminLog {
  id: string
  username: string | null
  artistName: string
  // For placeOf (components/ui.tsx): a festival stage and day, or a venue.
  stage: string | null
  day: string | null
  venue: string | null
  score: number // 0 when a rating is missing
  review: string | null
  photos: number
  crssd: boolean
  createdAt: string
}

export interface AdminSignup {
  id: string
  username: string | null
  method: 'phone' | 'email'
  fromQr: boolean
  // A phone number that asked for a code and never typed it in.
  unfinished: boolean
  createdAt: string
}

export interface AdminStats {
  generatedAt: string
  // Today runs from midnight San Diego time, like analytics.funnel_by_day.
  today: {
    scans: number
    phonesScanned: number
    opens: number
    visitors: number
    visitorsFromQr: number
    signups: number
    signupsByPhone: number
    signupsByEmail: number
    signupsFromQr: number
    newNumbers: number
    unfinishedNumbers: number
    returningPhoneSignIns: number
    logs: number
    crssdLogs: number
    preludeEur: number
  }
  totals: {
    accounts: number
    logs: number
    // A floor: one code per phone account plus today's returning sign-ins;
    // resends and sign-ins on earlier days aren't knowable from here.
    preludeEurAtLeast: number
  }
  // null when app_settings doesn't exist yet.
  signupMethod: 'phone' | 'email' | null
  latestLogs: AdminLog[]
  latestSignups: AdminSignup[]
}
