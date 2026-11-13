import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { computeShowScore } from '@/lib/rating'
import { getArtistImages } from '@/lib/artistImages'
import { formatShowDate } from '@/lib/dates'
import { resolveMediaUrls } from '@/lib/media'
import { Logo } from '@/components/Logo'
import { ContentMenu } from '@/components/ContentMenu'
import { SetlistPanel } from '@/components/SetlistPanel'
import { LogThisShow } from '@/components/LogThisShow'
import { ShowRatingsCard } from '@/components/ShowRatingsCard'
import {
  ArtistPhoto, BackHeader, Card, Chip, DateTag, EmptyState, Label, PersonPhoto, Place, PullQuote, Stars,
} from '@/components/ui'
import { markInvocation, timeQuery, timeMark } from '@/lib/queryTiming'
import { artistHref, venueHref } from '@/lib/showLinks'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'

function resolvePhotoUrl(url: string): string {
  if (url.startsWith('http')) return url
  return `${SUPABASE_STORAGE}/${url}`
}

function isVideoUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ['mp4', 'mov', 'webm', 'm4v', 'avi'].includes(ext ?? '')
}

function dayLabel(d: string) {
  if (d === 'friday')   return 'Fri Apr 17'
  if (d === 'saturday') return 'Sat Apr 18'
  return 'Sun Apr 19'
}

export default async function ArtistPage({ params }: { params: { artistId: string } }) {
  const pageStart = Date.now()
  const { cold } = markInvocation()
  console.log(`[perf] artist:page start cold=${cold} artistId=${params.artistId}`)

  const { data: logs } = await timeQuery(`artist:logged_shows(${params.artistId})`, supabase
    .from('logged_shows')
    .select('id, user_id, performance_rating, venue_rating, review, tags, photo_url, media_urls, artist_name, stage, day, venue, show_date')
    .eq('artist_id', params.artistId))

  if (!logs || logs.length === 0) notFound()

  const userIds = Array.from(new Set(logs.map(l => l.user_id)))
  const { data: profiles } = await timeQuery(`artist:profiles(${userIds.length} ids)`, supabase
    .from('profiles').select('id, username, avatar_url').in('id', userIds))

  const profileMap: Record<string, { username: string; avatar_url: string | null }> = {}
  profiles?.forEach(p => { profileMap[p.id] = p })

  const artistName = logs[0]?.artist_name ?? 'Unknown'
  const stage      = logs[0]?.stage ?? ''
  const day        = logs[0]?.day   ?? ''
  const venueName  = logs[0]?.venue ?? ''
  const showDate   = logs[0]?.show_date ?? null
  // The catalogue row, when it has this show, is what knows the venue's city:
  // a log keeps only the venue's name, and nine cities have a Fillmore.
  const [artistImage, { data: listing }] = await Promise.all([
    getArtistImages(supabase, [artistName]),
    venueName && !stage
      ? supabase.from('shows').select('venue, city, state').eq('id', params.artistId).maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  const rated = logs
    .filter(l => l.performance_rating != null && l.venue_rating != null)
    .map(l => ({ ...l, score: computeShowScore(l.performance_rating!, l.venue_rating!) }))
    .sort((a, b) => b.score - a.score)

  const avgScore = rated.length > 0 ? rated.reduce((a, l) => a + l.score, 0) / rated.length : 0
  const topScore = rated.length > 0 ? Math.max(...rated.map(l => l.score)) : 0

  const avgPerformance = rated.length > 0 ? rated.reduce((a, l) => a + l.performance_rating!, 0) / rated.length : 0
  const avgVenue       = rated.length > 0 ? rated.reduce((a, l) => a + l.venue_rating!,       0) / rated.length : 0
  const reviews = rated.filter(l => l.review)

  const photos = logs
    .flatMap(l => resolveMediaUrls(l).map(resolvePhotoUrl))
    .filter(u => !isVideoUrl(u))
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 3)

  const place = stage
    ? [stage, day ? dayLabel(day) : null].filter(Boolean).join(' · ')
    : [venueName, showDate ? formatShowDate(showDate) : null].filter(Boolean).join(' · ')

  timeMark(`artist:page total (${logs.length} logs)`, pageStart)

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BackHeader title={<Logo />} href="/feed" />

      <div className="px-5 pt-5 pb-24 space-y-5">
        <div className="flex items-center gap-4">
          <ArtistPhoto name={artistName} src={artistImage(artistName)} className="w-24 h-24" iconSize={34}>
            <DateTag isoDate={showDate} />
          </ArtistPhoto>
          <div className="flex-1 min-w-0 space-y-1.5">
            {/* The artist and the venue each open every show Gigl has for
                them, past and coming up (/artists, /venues). */}
            <h1 className="font-display text-[28px] font-bold tracking-tight leading-none">
              <Link href={artistHref(artistName)} className="hover:text-accent">{artistName}</Link>
            </h1>
            {place && (listing
              ? <Link href={venueHref({ name: listing.venue, city: listing.city, state: listing.state })} className="block hover:text-accent"><Place>{place}</Place></Link>
              : <Place>{place}</Place>)}
            {rated.length > 0 && <Stars score={avgScore} size={20} />}
          </div>
        </div>

        {photos.length > 0 && (
          <div className="flex gap-1.5">
            {photos.map((url, i) => (
              <div key={i} className="relative flex-1 h-28 rounded-card border-1.5 border-ink overflow-hidden">
                <Image src={url} alt="" fill sizes="140px" className="object-cover" />
              </div>
            ))}
          </div>
        )}

        <ShowRatingsCard
          count={rated.length}
          avgScore={avgScore}
          topScore={topScore}
          avgPerformance={avgPerformance}
          avgVenue={avgVenue}
        />

        {/* The setlist and logging your own, side by side above the reviews.
            A festival set logged from its lineup has a day, not a date, and
            is logged from that lineup, which knows the stage. */}
        {showDate && (
          <div className="flex gap-2.5">
            <div className="flex-1 min-w-0">
              <SetlistPanel artist={artistName} isoDate={showDate} venue={listing?.venue ?? venueName} city={listing?.city} />
            </div>
            {!stage && (
              <LogThisShow show={{
                id:       params.artistId,
                artist:   artistName,
                venue:    listing?.venue ?? venueName,
                city:     listing?.city ?? '',
                state:    listing?.state ?? '',
                isoDate:  showDate,
                imageUrl: artistImage(artistName),
              }} />
            )}
          </div>
        )}

        <section>
          <Label className="mb-2.5">What people are saying</Label>
          {reviews.length === 0 ? (
            <EmptyState>No written reviews yet</EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {reviews.map((log, i) => {
                const reviewer = profileMap[log.user_id]
                const username = reviewer?.username ?? 'anonymous'
                return (
                  <Card key={log.id ?? i} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <Link href={`/u/${username}`} className="flex items-center gap-2.5 min-w-0">
                        <PersonPhoto name={username} src={reviewer?.avatar_url} className="w-8 h-8 text-sm border border-ink/15" />
                        <span className="text-sm font-semibold truncate">@{username}</span>
                      </Link>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Stars score={log.score} size={15} />
                        <ContentMenu kind="log" targetId={log.id} ownerId={log.user_id} ownerName={reviewer?.username ?? null} />
                      </div>
                    </div>
                    <PullQuote>{log.review}</PullQuote>
                    {log.tags && log.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {log.tags.map((tag: string) => <Chip key={tag}>{tag}</Chip>)}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
