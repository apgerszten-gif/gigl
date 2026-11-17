import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { showScore } from '@/lib/rating'
import { getArtistImages } from '@/lib/artistImages'
import { resolveMediaUrls } from '@/lib/media'
import { FollowButton } from '@/components/FollowButton'
import { ContentMenu } from '@/components/ContentMenu'
import { TaggedInList } from '@/components/TagDisplay'
import { PublicShowHistory, type PublicLog } from '@/components/PublicShowHistory'
import type { HistoryPerson } from '@/components/ShowHistory'
import { loadTagsForLogs, loadTaggedIn } from '@/lib/tags'
import { Logo } from '@/components/Logo'
import { BackHeader, Card, PersonPhoto, Stars, Stat, btnPrimary } from '@/components/ui'

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

  const [{ data: showsRaw }, { count: followerCount }, { count: followingCount }, taggedIn] = await Promise.all([
    supabase.from('logged_shows').select('*').eq('user_id', profile.id),
    supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', profile.id),
    loadTaggedIn(supabase, profile.id),
  ])

  const shows = (showsRaw ?? []).slice().sort((a, b) => showScore(b) - showScore(a))
  const artistNames = [...shows.map(s => s.artist_name as string), ...taggedIn.map(t => t.artistName)]
  const [artistImage, tagged] = await Promise.all([
    getArtistImages(supabase, artistNames),
    loadTagsForLogs(supabase, shows.map(s => s.id)),
  ])

  // Who each log was with, by handle and photo.
  const taggedIds = Array.from(new Set(Object.values(tagged).flat()))
  const { data: people } = taggedIds.length > 0
    ? await supabase.from('profiles').select('id, username, avatar_url').in('id', taggedIds)
    : { data: [] as { id: string; username: string; avatar_url: string | null }[] }
  const personOf = new Map<string, HistoryPerson>((people ?? []).map(p => [p.id, { username: p.username, avatar_url: p.avatar_url }]))

  const logs: PublicLog[] = shows.map(s => ({
    id:                 s.id,
    artist_id:          s.artist_id,
    artist_name:        s.artist_name,
    stage:              s.stage,
    day:                s.day,
    venue:              s.venue,
    show_date:          s.show_date,
    performance_rating: s.performance_rating,
    venue_rating:       s.venue_rating,
    review:             s.review,
    tags:               s.tags,
    media:              resolveMediaUrls(s).map(resolvePhotoUrl),
    people:             (tagged[s.id] ?? []).flatMap(id => personOf.get(id) ?? []),
  }))
  const artistImages = Object.fromEntries(artistNames.map(name => [name, artistImage(name)]))

  const ratedShows = shows.filter(s => s.performance_rating != null && s.venue_rating != null)
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
            <ContentMenu kind="profile" targetId={profile.id} ownerId={profile.id} ownerName={profile.username} />
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

        <PublicShowHistory logs={logs} artistImages={artistImages} />

        <TaggedInList logs={taggedIn} artistImage={artistImage} />

        <div className="pt-4 text-center">
          <p className="text-[11px] text-ink-faint mb-3">Want to rank the shows you&apos;ve seen?</p>
          <Link href="/" className={`${btnPrimary} px-6 py-3 text-xs`}>Join Gigl →</Link>
        </div>
      </div>
    </div>
  )
}
