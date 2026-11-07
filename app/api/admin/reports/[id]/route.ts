import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { isAdminId, refuseUnlessAdmin } from '@/lib/adminAuth'
import { deleteAccount } from '@/lib/accountDeletion'
import { UUID, removeLog } from '@/lib/moderation'

// POST /api/admin/reports/:id — act on a report from /admin.
//
//   { action: 'remove' }   takes down what was reported: the log, the
//                          comment, or for a profile the whole account and
//                          everything it posted (lib/accountDeletion.ts)
//   { action: 'dismiss' }  leaves it up
//
// Either way every open report about the same thing is closed with it, so
// five people reporting one log is one decision.

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = await refuseUnlessAdmin(req)
  if (refused) return refused

  if (!UUID.test(params.id)) return NextResponse.json({ error: 'Not a report id.' }, { status: 400 })
  const body = await req.json().catch(() => null)
  const action = body?.action
  if (action !== 'remove' && action !== 'dismiss') {
    return NextResponse.json({ error: "Say 'remove' or 'dismiss'." }, { status: 400 })
  }

  const admin = supabaseAdmin()
  const { data: report, error: readError } = await admin
    .from('reports').select('id, kind, target_id').eq('id', params.id).maybeSingle()
  if (readError) {
    console.error('[admin/reports] read failed:', readError)
    return NextResponse.json({ error: "Couldn't read that report." }, { status: 500 })
  }
  if (!report) return NextResponse.json({ error: 'That report is gone.' }, { status: 404 })

  if (action === 'remove') {
    try {
      if (report.kind === 'log') {
        await removeLog(report.target_id)
      } else if (report.kind === 'comment') {
        const { error } = await admin.from('show_comments').delete().eq('id', report.target_id)
        if (error) throw new Error(`removing the comment failed: ${error.message}`)
      } else {
        if (isAdminId(report.target_id)) {
          return NextResponse.json({ error: "That's an admin account; it can't be removed from here." }, { status: 400 })
        }
        await deleteAccount(report.target_id)
      }
    } catch (err) {
      console.error('[admin/reports] remove failed:', err)
      return NextResponse.json({ error: "Couldn't remove it. Nothing was marked done." }, { status: 500 })
    }
  }

  const resolution = action === 'remove' ? 'removed' : 'dismissed'
  const { error: resolveError } = await admin
    .from('reports')
    .update({ resolved_at: new Date().toISOString(), resolution })
    .eq('kind', report.kind)
    .eq('target_id', report.target_id)
    .is('resolved_at', null)
  if (resolveError) {
    console.error('[admin/reports] resolve failed:', resolveError)
    return NextResponse.json({ error: `It was ${resolution}, but the report couldn't be closed.` }, { status: 500 })
  }

  return NextResponse.json({ resolved: report.id, kind: report.kind, targetId: report.target_id, resolution })
}
