import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { showScore } from '@/lib/rating'
import { getArtistImages } from '@/lib/artistImages'
import { resolveMediaUrls } from '@/lib/media'
import { MediaGrid } from '@/components/MediaGrid'
import { FollowButton } from '@/components/FollowButton'
import { Logo } from '@/components/Logo'
import {
  ArtistPhoto, BackHeader, Card, Chip, DateTag, EmptyState, Label, PersonPhoto, Place, PullQuote, Stars, Stat, placeOf, btnPrimary,
} from '@/components/ui'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'

function resolvePhotoUrl(url: string): string {
  if (url.startsWith('http')) return url
  return `${SUPABASE_STORAGE}/${url}`
}

export default async function PublicProfile({ params }: { params: { username: string } }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .eq('username', params.username)
    .single()

  if (!profile) notFound()

  const [{ data: showsRaw }, { count: followerCount }, { count: followingCount }] = await Promise.all([
    supabase.from('logged_shows').select('*').eq('user_id', profile.id),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ])

  const shows = (showsRaw ?? []).slice().sort((a, b) => showScore(b) - showScore(a))
  const artistImage = await getArtistImages(supabase, shows.map(s => s.artist_name))
  const ratedShows = shows.filter(s => s.performance_rating != null && s.venue_rating != null && s.crowd_rating != null)
  const avgScore = ratedShows.length > 0
    ? ratedShows.reduce((acc, s) => acc + showScore(s), 0) / ratedShows.length
    : 0

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BackHeader title={<Logo />} href="/feed" />

      <div className="px-5 pt-4 pb-24 space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <PersonPhoto name={profile.display_name || profile.username} src={profile.avatar_url} className="w-16 h-16 text-2xl border-1.5 border-ink shadow-riso" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold tracking-tight leading-tight truncate">{profile.display_name}</h1>
              <p className="text-xs text-ink-muted">@{profile.username}</p>
            </div>
            <FollowButton targetUserId={profile.id} />
          </div>

          <div className="flex border-t border-ink/10 pt-3">
            <div className="flex-1 flex">
              <Stat value={shows.length} label="Gigs" />
              <div className="flex-1 flex border-l border-ink/10">
                <Stat
                  value={ratedShows.length > 0 ? <Stars score={avgScore} size={11} /> : <span className="text-accent">—</span>}
                  label="Avg rating"
                />
              </div>
            </div>
            <div className="flex-1 flex border-l-1.5 border-ink">
              <Link href={`/u/${profile.username}/followers`} className="flex-1 flex">
                <Stat value={followerCount ?? 0} label="Followers" />
              </Link>
              <Link href={`/u/${profile.username}/following`} className="flex-1 flex border-l border-ink/10">
                <Stat value={followingCount ?? 0} label="Following" />
              </Link>
            </div>
          </div>
        </Card>

        <section>
          <Label className="mb-2.5">Their rankings</Label>

          {shows.length === 0 ? (
            <EmptyState>No shows logged yet</EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {shows.map((show, i) => {
                const score     = showScore(show)
                const hasScore  = show.performance_rating != null && show.venue_rating != null && show.crowd_rating != null
                const mediaUrls = resolveMediaUrls(show).map(resolvePhotoUrl)
                const place     = placeOf(show)
                return (
                  <Card key={show.id} className="overflow-hidden">
                    {mediaUrls.length > 0 && (
                      <div className="border-b-1.5 border-ink">
                        <MediaGrid urls={mediaUrls} maxHeight={220} />
                      </div>
                    )}
                    <Link href={`/artist/${show.artist_id}`} className="p-3 flex items-center gap-3">
                      <span className="font-display text-2xl font-bold leading-none w-7 flex-shrink-0 text-center text-accent">{i + 1}</span>
                      <ArtistPhoto name={show.artist_name} src={artistImage(show.artist_name)} className="w-12 h-12" iconSize={16}>
                        <DateTag isoDate={show.show_date} />
                      </ArtistPhoto>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display text-[15px] font-bold leading-tight truncate">{show.artist_name}</h3>
                          {hasScore && <Stars score={score} size={12} />}
                        </div>
                        {place && <Place className="mt-0.5">{place}</Place>}
                      </div>
                    </Link>
                    {(show.review || (show.tags && show.tags.length > 0)) && (
                      <div className="px-3 pb-3 space-y-2.5">
                        {show.review && <PullQuote>{show.review}</PullQuote>}
                        {show.tags && show.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {show.tags.map((tag: string) => <Chip key={tag}>{tag}</Chip>)}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <div className="pt-4 text-center">
          <p className="text-[11px] text-ink-faint mb-3">Want to rank the shows you&apos;ve seen?</p>
          <Link href="/" className={`${btnPrimary} px-6 py-3 text-xs`}>Join Gigl →</Link>
        </div>
      </div>
    </div>
  )
}
