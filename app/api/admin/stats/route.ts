import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { refuseUnlessAdmin } from '@/lib/adminAuth'
import { CRSSD } from '@/lib/crssd'
import type { AdminLog, AdminSignup, AdminStats } from '@/lib/adminStats'

// GET /api/admin/stats — everything the admin page (app/admin) shows: today's
// QR funnel, sign-ups, texting and logs, plus the latest logs and sign-ups.
// Admin accounts only (lib/adminAuth.ts).

// supabase-js reads go in the Data Cache without this - see the search route.
export const fetchCache = 'default-no-store'
export const dynamic = 'force-dynamic'

// "Today" is San Diego's, the same day analytics.funnel_by_day uses.
const TIME_ZONE = 'America/Los_Angeles'

// Prelude's US price per code: €0.032 for the verification plus €0.0043 for
// the text itself.
const PRELUDE_EUR_PER_CODE = 0.0363

const LATEST = 25
const PAGE = 1000 // PostgREST's row cap per request

const dayOf = (at: string | Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(at))

// Midnight today in San Diego, as an instant.
function startOfToday(): Date {
  const now = new Date()
  const offset = new Intl.DateTimeFormat('en-US', { timeZone: TIME_ZONE, timeZoneName: 'longOffset' })
    .formatToParts(now).find(p => p.type === 'timeZoneName')?.value.replace('GMT', '')
  return new Date(`${dayOf(now)}T00:00:00${offset || '+00:00'}`)
}

async function allUsers(): Promise<User[]> {
  const users: User[] = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin().auth.admin.listUsers({ page, perPage: PAGE })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < PAGE) break
  }
  return users
}

interface EventRow { kind: string; visitor_id: string; source: string }

async function eventsSince(since: string): Promise<EventRow[]> {
  const rows: EventRow[] = []
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabaseAdmin()
      .from('site_events')
      .select('kind, visitor_id, source')
      .gte('created_at', since)
      .order('id')
      .range(from, from + PAGE - 1)
    if (error) throw error
    rows.push(...(data ?? []))
    if (!data || data.length < PAGE) return rows
  }
}

async function countLogs(since?: string, crssdOnly = false): Promise<number> {
  let query = supabaseAdmin().from('logged_shows').select('id', { count: 'exact', head: true })
  if (since) query = query.gte('created_at', since)
  if (crssdOnly) query = query.like('artist_id', `${CRSSD.idPrefix}%`)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

interface LogRow {
  id: string
  artist_id: string
  artist_name: string
  venue: string | null
  stage: string | null
  day: string | null
  performance_rating: number | null
  venue_rating: number | null
  crowd_rating: number | null
  review: string | null
  media_urls: string[] | null
  created_at: string
  profiles: { username: string | null } | { username: string | null }[] | null
}

async function latestLogs(): Promise<AdminLog[]> {
  const { data, error } = await supabaseAdmin()
    .from('logged_shows')
    .select('id, artist_id, artist_name, venue, stage, day, performance_rating, venue_rating, crowd_rating, review, media_urls, created_at, profiles(username)')
    .order('created_at', { ascending: false })
    .limit(LATEST)
  if (error) throw error
  return ((data ?? []) as unknown as LogRow[]).map(row => {
    const profile = Array.isArray(row.profiles) ? row.profiles[0] : row.profiles
    const rated = row.performance_rating != null && row.venue_rating != null && row.crowd_rating != null
    return {
      id: row.id,
      username: profile?.username ?? null,
      artistName: row.artist_name,
      stage: row.stage,
      day: row.day,
      venue: row.venue,
      score: rated ? (row.performance_rating! + row.venue_rating! + row.crowd_rating!) / 3 : 0,
      review: row.review?.trim() || null,
      photos: row.media_urls?.length ?? 0,
      crssd: row.artist_id.startsWith(CRSSD.idPrefix),
      createdAt: row.created_at,
    }
  })
}

async function signupMethod(): Promise<'phone' | 'email' | null> {
  const { data, error } = await supabaseAdmin()
    .from('app_settings')
    .select('value')
    .eq('key', 'signup_method')
    .maybeSingle()
  if (error) return null // most likely the table hasn't been created yet
  return data?.value === 'email' ? 'email' : 'phone'
}

export async function GET(req: NextRequest) {
  const refused = await refuseUnlessAdmin(req)
  if (refused) return refused

  const since = startOfToday().toISOString()
  const today = dayOf(new Date())

  try {
    const [users, events, logsToday, crssdLogsToday, logsTotal, logs, method] = await Promise.all([
      allUsers(),
      eventsSince(since),
      countLogs(since),
      countLogs(since, true),
      countLogs(),
      latestLogs(),
      signupMethod(),
    ])

    // A phone account exists from the moment its code is requested; it only
    // counts as signed up once the code was typed in.
    const finished = (u: User) => !u.phone || !!u.phone_confirmed_at
    const isToday = (at?: string | null) => !!at && dayOf(at) === today
    const createdToday = users.filter(u => isToday(u.created_at))
    const signedUpToday = createdToday.filter(finished)
    const newNumbers = createdToday.filter(u => !!u.phone)
    const returningPhoneSignIns = users.filter(u => !!u.phone && !isToday(u.created_at) && isToday(u.last_sign_in_at))

    const distinct = (rows: EventRow[]) => new Set(rows.map(r => r.visitor_id)).size
    const scans = events.filter(e => e.kind === 'scan')
    const visits = events.filter(e => e.kind === 'visit')

    const newest = [...users].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, LATEST)
    const { data: profiles } = await supabaseAdmin()
      .from('profiles')
      .select('id, username')
      .in('id', newest.map(u => u.id))
    const usernames = new Map((profiles ?? []).map(p => [p.id as string, p.username as string | null]))
    const latestSignups: AdminSignup[] = newest.map(u => ({
      id: u.id,
      username: usernames.get(u.id) ?? null,
      method: u.phone ? 'phone' : 'email',
      fromQr: u.user_metadata?.signup_source === 'qr',
      unfinished: !finished(u),
      createdAt: u.created_at,
    }))

    const stats: AdminStats = {
      generatedAt: new Date().toISOString(),
      today: {
        scans: scans.length,
        phonesScanned: distinct(scans),
        opens: visits.length,
        visitors: distinct(visits),
        visitorsFromQr: distinct(visits.filter(e => e.source === 'qr')),
        signups: signedUpToday.length,
        signupsByPhone: signedUpToday.filter(u => !!u.phone).length,
        signupsByEmail: signedUpToday.filter(u => !u.phone).length,
        signupsFromQr: signedUpToday.filter(u => u.user_metadata?.signup_source === 'qr').length,
        newNumbers: newNumbers.length,
        unfinishedNumbers: newNumbers.filter(u => !finished(u)).length,
        returningPhoneSignIns: returningPhoneSignIns.length,
        logs: logsToday,
        crssdLogs: crssdLogsToday,
        preludeEur: (newNumbers.length + returningPhoneSignIns.length) * PRELUDE_EUR_PER_CODE,
      },
      totals: {
        accounts: users.filter(finished).length,
        logs: logsTotal,
        preludeEurAtLeast: (users.filter(u => !!u.phone).length + returningPhoneSignIns.length) * PRELUDE_EUR_PER_CODE,
      },
      signupMethod: method,
      latestLogs: logs,
      latestSignups,
    }
    return NextResponse.json(stats)
  } catch (err) {
    console.error('[admin/stats] failed:', err)
    return NextResponse.json({ error: "Couldn't load the numbers." }, { status: 500 })
  }
}
