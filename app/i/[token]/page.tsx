import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { formatShowDate } from '@/lib/dates'
import type { ShowInvite } from '@/lib/invites'
import { InviteLanding } from '@/components/InviteLanding'

// /i/<token> - "Alex is going, you in?" for one upcoming show, from a link a
// friend sent (components/InviteSheet.tsx). The page itself is client-side,
// so it can save the show for whoever opens it; this server half only writes
// the link preview the group chat shows.

export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const { data } = await supabase.rpc('get_show_invite', { invite_token: params.token })
  const invite = ((data ?? []) as ShowInvite[])[0]
  if (!invite) return { title: 'Gigl invite' }

  const who = invite.owner_name ?? 'A friend'
  const title = `${who} is going to ${invite.artist}. You in?`
  const description = [invite.venue, invite.city, formatShowDate(invite.show_date)].filter(Boolean).join(' · ')
  const image = `/api/og/invite?t=${encodeURIComponent(invite.token)}`
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default function InvitePage({ params }: { params: { token: string } }) {
  return <InviteLanding token={params.token} />
}
