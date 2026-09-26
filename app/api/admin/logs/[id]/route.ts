import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { refuseUnlessAdmin } from '@/lib/adminAuth'

// DELETE /api/admin/logs/:id — take a log down from the admin page, for
// anything that shouldn't be on the feed. Permanent.
//
// Likes, reactions, comments and highlight tags go with it (their foreign
// keys cascade). Battle matchups don't cascade, so any the log was part of
// are removed first, or the delete would fail on them.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = await refuseUnlessAdmin(req)
  if (refused) return refused

  const id = params.id
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not a log id.' }, { status: 400 })

  const admin = supabaseAdmin()
  const { error: matchupError } = await admin.from('matchups').delete().or(`winner_id.eq.${id},loser_id.eq.${id}`)
  if (matchupError) {
    console.error('[admin/logs] removing matchups failed:', matchupError)
    return NextResponse.json({ error: "Couldn't remove the log." }, { status: 500 })
  }

  const { data, error } = await admin.from('logged_shows').delete().eq('id', id).select('id')
  if (error) {
    console.error('[admin/logs] removing the log failed:', error)
    return NextResponse.json({ error: "Couldn't remove the log." }, { status: 500 })
  }
  if (!data || data.length === 0) return NextResponse.json({ error: 'That log is already gone.' }, { status: 404 })
  return NextResponse.json({ removed: id })
}
