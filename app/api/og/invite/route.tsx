import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { formatShowDate } from '@/lib/dates'
import type { ShowInvite } from '@/lib/invites'
import { ogCard } from '@/lib/ogCard'

// GET /api/og/invite?t=<token> - the link preview for an invite (/i/<token>).
export const fetchCache = 'default-no-store'

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t') ?? ''
  const { data } = await supabase.rpc('get_show_invite', { invite_token: token })
  const invite = ((data ?? []) as ShowInvite[])[0]
  if (!invite) return ogCard({ title: 'This invite has ended' })

  return ogCard({
    chip:     `${invite.owner_name ?? 'A friend'} is going`,
    title:    invite.artist,
    place:    [invite.venue, invite.city, formatShowDate(invite.show_date)].filter(Boolean).join(' · '),
    imageUrl: invite.image_url,
    isoDate:  invite.show_date,
  })
}
