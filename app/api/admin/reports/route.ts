import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { refuseUnlessAdmin } from '@/lib/adminAuth'
import { resolveMediaUrls } from '@/lib/media'
import type { AdminReport, ReportKind } from '@/lib/reports'

// GET /api/admin/reports — open reports, newest first, each with the log,
// comment or profile it's about as it stands now (null once it's gone), for
// the Reports card on /admin. Admin accounts only (lib/adminAuth.ts).
//
// Answers { reports: null } when public.reports doesn't exist yet, so the
// card can say to run the SQL rather than fail.

export const fetchCache = 'default-no-store'
export const dynamic = 'force-dynamic'

const LIMIT = 50

export async function GET(req: NextRequest) {
  const refused = await refuseUnlessAdmin(req)
  if (refused) return refused

  const admin = supabaseAdmin()
  const { data: rows, error, count } = await admin
    .from('reports')
    .select('id, created_at, reporter_id, kind, target_id, reason, details', { count: 'exact' })
    .is('resolved_at', null)
    .order('created_at', { ascending: false })
    .limit(LIMIT)

  if (error) {
    // 42P01: undefined table, i.e. the reports SQL hasn't been run.
    if (error.code === '42P01' || /does not exist|schema cache/i.test(error.message)) {
      return NextResponse.json({ reports: null, open: 0 })
    }
    console.error('[admin/reports]', error)
    return NextResponse.json({ error: "Couldn't load reports." }, { status: 500 })
  }

  const idsOf = (kind: ReportKind) => rows.filter(r => r.kind === kind).map(r => r.target_id)
  const logIds = idsOf('log')
  const commentIds = idsOf('comment')

  const [{ data: logs }, { data: comments }] = await Promise.all([
    logIds.length
      ? admin.from('logged_shows').select('id, user_id, artist_name, review, photo_url, media_urls').in('id', logIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string; artist_name: string; review: string | null; photo_url: string | null; media_urls: string[] | null }[] }),
    commentIds.length
      ? admin.from('show_comments').select('id, user_id, body').in('id', commentIds)
      : Promise.resolve({ data: [] as { id: string; user_id: string; body: string }[] }),
  ])

  const peopleIds = new Set<string>()
  rows.forEach(r => {
    if (r.reporter_id) peopleIds.add(r.reporter_id)
    if (r.kind === 'profile') peopleIds.add(r.target_id)
  })
  logs?.forEach(l => peopleIds.add(l.user_id))
  comments?.forEach(c => peopleIds.add(c.user_id))

  const { data: people } = peopleIds.size
    ? await admin.from('profiles').select('id, username, display_name').in('id', Array.from(peopleIds))
    : { data: [] as { id: string; username: string | null; display_name: string | null }[] }
  const person = new Map((people ?? []).map(p => [p.id, p]))

  const logById = new Map((logs ?? []).map(l => [l.id, l]))
  const commentById = new Map((comments ?? []).map(c => [c.id, c]))

  const reports: AdminReport[] = rows.map(r => {
    let target: AdminReport['target'] = null
    if (r.kind === 'log') {
      const log = logById.get(r.target_id)
      if (log) target = {
        ownerId: log.user_id,
        owner:   person.get(log.user_id)?.username ?? null,
        title:   log.artist_name,
        body:    log.review,
        photos:  resolveMediaUrls(log).length,
      }
    } else if (r.kind === 'comment') {
      const comment = commentById.get(r.target_id)
      if (comment) target = {
        ownerId: comment.user_id,
        owner:   person.get(comment.user_id)?.username ?? null,
        title:   'Comment',
        body:    comment.body,
        photos:  0,
      }
    } else {
      const profile = person.get(r.target_id)
      if (profile) target = {
        ownerId: profile.id,
        owner:   profile.username,
        title:   profile.display_name || (profile.username ? `@${profile.username}` : 'Profile'),
        body:    null,
        photos:  0,
      }
    }
    return {
      id:        r.id,
      createdAt: r.created_at,
      kind:      r.kind,
      targetId:  r.target_id,
      reason:    r.reason,
      details:   r.details,
      reporter:  r.reporter_id ? person.get(r.reporter_id)?.username ?? null : null,
      target,
    }
  })

  return NextResponse.json({ reports, open: count ?? reports.length })
}
