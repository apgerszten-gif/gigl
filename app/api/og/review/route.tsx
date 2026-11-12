import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getArtistImages } from '@/lib/artistImages'
import { computeShowScore, isRated } from '@/lib/rating'
import { placeOf } from '@/components/ui'
import { ogCard } from '@/lib/ogCard'

// GET /api/og/review?u=<handle>&s=<show id>[&b=1] - the link preview for a
// shared review (/r/<handle>/<show id>). b=1 hides the stars and the review.
export const fetchCache = 'default-no-store'

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get('u') ?? ''
  const showId = req.nextUrl.searchParams.get('s') ?? ''
  const blind = req.nextUrl.searchParams.get('b') === '1'

  const { data: profile } = await supabase.from('profiles').select('id, username, display_name').eq('username', username).maybeSingle()
  const { data: log } = profile
    ? await supabase
      .from('logged_shows')
      .select('artist_id, artist_name, venue, stage, day, show_date, performance_rating, venue_rating, review')
      .eq('user_id', profile.id).eq('artist_id', showId).maybeSingle()
    : { data: null }
  if (!profile || !log) return ogCard({ title: 'Gigl' })

  const photo = await getArtistImages(supabase, [log.artist_name])
  const who = (profile.display_name?.trim() || profile.username).split(/\s+/)[0]
  return ogCard({
    chip:     blind ? `${who} rated it` : `${who}'s take`,
    title:    log.artist_name,
    place:    placeOf(log),
    imageUrl: photo(log.artist_name),
    isoDate:  log.show_date,
    stars:    blind ? 'hidden' : isRated(log) ? computeShowScore(log.performance_rating!, log.venue_rating!) : null,
    quote:    blind ? null : log.review,
  })
}
