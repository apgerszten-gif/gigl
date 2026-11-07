import { NextRequest, NextResponse } from 'next/server'
import { refuseUnlessAdmin } from '@/lib/adminAuth'
import { UUID, removeLog } from '@/lib/moderation'

// DELETE /api/admin/logs/:id — take a log down from the admin page, for
// anything that shouldn't be on the feed. Permanent. See lib/moderation.ts.
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const refused = await refuseUnlessAdmin(req)
  if (refused) return refused

  const id = params.id
  if (!UUID.test(id)) return NextResponse.json({ error: 'Not a log id.' }, { status: 400 })

  try {
    const removed = await removeLog(id)
    if (!removed) return NextResponse.json({ error: 'That log is already gone.' }, { status: 404 })
  } catch (err) {
    console.error('[admin/logs]', err)
    return NextResponse.json({ error: "Couldn't remove the log." }, { status: 500 })
  }
  return NextResponse.json({ removed: id })
}
