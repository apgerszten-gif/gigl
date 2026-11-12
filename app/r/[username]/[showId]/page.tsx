import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import { formatShowDate } from '@/lib/dates'
import { ReviewLanding } from '@/components/ReviewLanding'

// /r/<handle>/<show id> - one person's review of one show, the link "Send
// your take" shares (components/ShareReviewSheet.tsx). The page is
// client-side so it reads with the viewer's session and blocks apply, as on
// Feed; this server half only writes the link preview. ?b=1 keeps the stars
// out of both until the viewer has rated the show too.

export const dynamic = 'force-dynamic'
export const fetchCache = 'default-no-store'

interface Props {
  params:       { username: string; showId: string }
  searchParams: { b?: string }
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const username = decodeURIComponent(params.username)
  const showId = decodeURIComponent(params.showId)
  const { data: profile } = await supabase.from('profiles').select('id, username, display_name').eq('username', username).maybeSingle()
  if (!profile) return { title: 'Gigl' }
  const { data: log } = await supabase
    .from('logged_shows')
    .select('artist_name, venue, stage, show_date, review')
    .eq('user_id', profile.id).eq('artist_id', showId).maybeSingle()
  if (!log) return { title: 'Gigl' }

  const who = (profile.display_name?.trim() || profile.username).split(/\s+/)[0]
  const blind = searchParams.b === '1'
  const title = blind ? `${who} rated ${log.artist_name}. What would you give it?` : `${who} on ${log.artist_name}`
  const description = log.review && !blind
    ? log.review.slice(0, 160)
    : [log.venue || log.stage, log.show_date ? formatShowDate(log.show_date) : null].filter(Boolean).join(' · ')
  const image = `/api/og/review?u=${encodeURIComponent(profile.username)}&s=${encodeURIComponent(showId)}${blind ? '&b=1' : ''}`
  return {
    title,
    description,
    openGraph: { title, description, images: [{ url: image, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default function ReviewPage({ params, searchParams }: Props) {
  return (
    <ReviewLanding
      username={decodeURIComponent(params.username)}
      showId={decodeURIComponent(params.showId)}
      blind={searchParams.b === '1'}
    />
  )
}
