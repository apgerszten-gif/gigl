// The morning-after review text: "How was Katseye last night? Rate it on
// Gigl". Run daily by /api/cron/review-texts. Server-only (service role).
//
// Who gets one: a saved show from the last two days (one missed run still
// catches up) that its owner saved with a phone account, so with consent
// recorded in text_opt_in_at; that hasn't been texted, logged, dismissed or
// probably cancelled; whose owner hasn't turned review texts off. One text
// per person per run, naming the show, or the first and "+N more".
//
//   review_texts_mode    app_settings, "off" | "live"; missing means off, so a
//                        deploy never texts anyone until /admin says Live
//   review_texts_report  the last run, for /admin

import { supabaseAdmin } from './supabaseAdmin'
import { preludeConfigured, sendNotify } from './prelude'

export type ReviewTextsMode = 'off' | 'live'

export interface ReviewTextsReport {
  ranAt:      string
  mode:       ReviewTextsMode
  configured: boolean
  people:     number
  shows:      number
  sent:       number
  failed:     number
  noPhone:    number
  turnedOff:  number
  errors:     string[]
}

const MODE_KEY   = 'review_texts_mode'
const REPORT_KEY = 'review_texts_report'

// Where the text sends people: the Feed, where "How was it?" cards for every
// show that's due sit at the top (components/ReviewReminders.tsx).
const REVIEW_LINK = 'https://www.gigl.space/feed'

// Same rule as lib/savedShows.ts: a Ticketmaster listing the sync stopped
// seeing this long before its date was probably cancelled.
const CANCELLED_AFTER_DAYS = 3

export async function readReviewTextsMode(): Promise<ReviewTextsMode> {
  const { data, error } = await supabaseAdmin().from('app_settings').select('value').eq('key', MODE_KEY).maybeSingle()
  return !error && data?.value === 'live' ? 'live' : 'off'
}

export async function saveReviewTextsMode(mode: ReviewTextsMode): Promise<void> {
  const { error } = await supabaseAdmin().from('app_settings').upsert({ key: MODE_KEY, value: mode, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function readReviewTextsReport(): Promise<ReviewTextsReport | null> {
  const { data, error } = await supabaseAdmin().from('app_settings').select('value').eq('key', REPORT_KEY).maybeSingle()
  if (error || !data?.value || typeof data.value !== 'object') return null
  return data.value as ReviewTextsReport
}

function isoDay(offsetDays: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function daysBetween(fromIso: string, toIso: string): number {
  return (Date.parse(toIso.slice(0, 10)) - Date.parse(fromIso.slice(0, 10))) / 86_400_000
}

interface DueShow { id: string; user_id: string; show_id: string; artist: string; show_date: string }

// `send` false (mode off, or forced dry from /admin) works out and reports
// who would get a text without sending anything.
export async function runReviewTexts(send: boolean): Promise<ReviewTextsReport> {
  const db = supabaseAdmin()
  const configured = preludeConfigured()
  const report: ReviewTextsReport = {
    ranAt: new Date().toISOString(), mode: send ? 'live' : 'off', configured,
    people: 0, shows: 0, sent: 0, failed: 0, noPhone: 0, turnedOff: 0, errors: [],
  }

  const { data: saved, error } = await db
    .from('saved_shows')
    .select('id, user_id, show_id, artist, show_date')
    .is('review_texted_at', null)
    .is('dismissed_at', null)
    .not('text_opt_in_at', 'is', null)
    .gte('show_date', isoDay(-2))
    .lte('show_date', isoDay(-1))
    .order('show_date', { ascending: false })
  if (error) { report.errors.push(`saved_shows: ${error.message}`); return report }
  let due = (saved ?? []) as DueShow[]
  if (due.length === 0) return report

  const showIds = Array.from(new Set(due.map(s => s.show_id)))
  const userIds = Array.from(new Set(due.map(s => s.user_id)))
  const [{ data: logged }, { data: listings }, { data: people }] = await Promise.all([
    db.from('logged_shows').select('user_id, artist_id').in('artist_id', showIds).in('user_id', userIds),
    db.from('shows').select('id, last_seen_at').in('id', showIds),
    db.from('profiles').select('id, review_texts_off_at').in('id', userIds),
  ])
  const loggedPairs = new Set((logged ?? []).map(l => `${l.user_id}|${l.artist_id}`))
  const lastSeen = new Map((listings ?? []).map(l => [l.id as string, l.last_seen_at as string | null]))
  const off = new Set((people ?? []).filter(p => p.review_texts_off_at).map(p => p.id as string))

  due = due.filter(s => {
    if (loggedPairs.has(`${s.user_id}|${s.show_id}`)) return false
    if (off.has(s.user_id)) return false
    const seen = lastSeen.get(s.show_id)
    if (s.show_id.startsWith('tm-') && seen && daysBetween(seen, s.show_date) > CANCELLED_AFTER_DAYS) return false
    return true
  })

  const byUser = new Map<string, DueShow[]>()
  for (const s of due) byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s])
  report.people = byUser.size
  report.shows = due.length
  if (!send || !configured) return report

  const templateId = process.env.PRELUDE_REVIEW_TEMPLATE_ID!
  for (const [userId, shows] of Array.from(byUser.entries())) {
    const { data: found } = await db.auth.admin.getUserById(userId)
    const phone = found?.user?.phone
    if (!phone) { report.noPhone += 1; continue }

    const artist = shows.length > 1 ? `${shows[0].artist} (+${shows.length - 1} more)` : shows[0].artist
    const result = await sendNotify(phone.startsWith('+') ? phone : `+${phone}`, templateId, { artist, link: REVIEW_LINK }, `review-${userId}-${shows[0].show_date}`)

    if (result.ok) {
      report.sent += 1
      await db.from('saved_shows').update({ review_texted_at: new Date().toISOString() }).in('id', shows.map(s => s.id))
    } else if (result.code === 'unsubscribed') {
      // They replied STOP: no more of these, ever, until they turn them on.
      report.turnedOff += 1
      await db.from('profiles').update({ review_texts_off_at: new Date().toISOString() }).eq('id', userId)
    } else {
      report.failed += 1
      if (report.errors.length < 5) report.errors.push(`${result.code}: ${result.message}`)
    }
  }
  return report
}

export async function saveReviewTextsReport(report: ReviewTextsReport): Promise<void> {
  const { error } = await supabaseAdmin().from('app_settings').upsert({ key: REPORT_KEY, value: report, updated_at: new Date().toISOString() })
  if (error) console.error('[review-texts] saving the report failed:', error.message)
}
