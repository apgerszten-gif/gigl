'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Share2 } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { FollowButton } from '@/components/FollowButton'
import { Logo } from '@/components/Logo'
import { MediaGrid } from '@/components/MediaGrid'
import { SetlistPanel } from '@/components/SetlistPanel'
import { ShareReviewSheet } from '@/components/ShareReviewSheet'
import {
  ArtistPhoto, Card, Chip, DateTag, EmptyState, Label, LoadingLabel, PersonPhoto, Place, PullQuote, Stars, TopBar,
  btnPrimary, btnSecondary, placeOf,
} from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { formatShowDate } from '@/lib/dates'
import { resolveMediaUrls } from '@/lib/media'
import { computeShowScore, isRated } from '@/lib/rating'
import { getPendingLogForArtist } from '@/lib/pendingLogs'
import { reviewPath } from '@/lib/share'
import { useArtistImages } from '@/lib/useArtistImages'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'
const resolvePhotoUrl = (url: string) => (url.startsWith('http') ? url : `${SUPABASE_STORAGE}/${url}`)

interface Log {
  id:                 string
  user_id:            string
  artist_id:          string
  artist_name:        string
  venue:              string | null
  stage:              string | null
  day:                string | null
  show_date:          string | null
  performance_rating: number | null
  venue_rating:       number | null
  review:             string | null
  tags:               string[] | null
  photo_url:          string | null
  media_urls:         string[] | null
}

interface Profile { id: string; username: string; display_name: string | null; avatar_url: string | null }

const LOG_COLUMNS = 'id, user_id, artist_id, artist_name, venue, stage, day, show_date, performance_rating, venue_rating, review, tags, photo_url, media_urls'

// One person's review of one show, opened from a link they sent. Readable
// signed out; the big button asks "Were you there? Rate it" and opens the log
// screen filled in with the show, coming back here after. Once the viewer has
// rated it too, both ratings sit side by side, which is also when a link sent
// with hidden stars (?b=1) shows them.
export function ReviewLanding({ username, showId, blind }: { username: string; showId: string; blind: boolean }) {
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()
  const [author, setAuthor]   = useState<Profile | null | undefined>(undefined)
  const [log, setLog]         = useState<Log | null | undefined>(undefined)
  const [mine, setMine]       = useState<Log | null>(null)
  const [sharing, setSharing] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: profile } = await supabase.from('profiles').select('id, username, display_name, avatar_url').eq('username', username).maybeSingle()
      if (cancelled) return
      setAuthor(profile ?? null)
      if (!profile) { setLog(null); return }
      // With the viewer's session, so a block hides it here as on Feed.
      const { data } = await supabase.from('logged_shows').select(LOG_COLUMNS).eq('user_id', profile.id).eq('artist_id', showId).maybeSingle()
      if (!cancelled) setLog((data as Log | null) ?? null)
    }
    load()
    return () => { cancelled = true }
  }, [username, showId])

  useEffect(() => {
    if (!user || !author || user.id === author.id) { setMine(null); return }
    // A log saved a moment ago may still be in this phone's queue
    // (lib/pendingLogs.ts) rather than on the server; it counts the same.
    const queued = getPendingLogForArtist(user.id, showId)
    if (queued) setMine({ ...queued, id: 'pending', tags: queued.tags ?? null } as Log)
    supabase.from('logged_shows').select(LOG_COLUMNS).eq('user_id', user.id).eq('artist_id', showId).maybeSingle()
      .then(({ data }) => { if (data) setMine(data as Log); else if (!queued) setMine(null) })
  }, [user?.id, author?.id, showId])

  const artistImage = useArtistImages(log ? [log.artist_name] : [])

  if (author === undefined || log === undefined || authLoading) {
    return <Shell><LoadingLabel /></Shell>
  }
  if (!author || !log) {
    return (
      <Shell>
        <div className="space-y-4">
          <EmptyState>This review isn&apos;t here any more.</EmptyState>
          <Link href="/feed" className={`${btnPrimary} w-full py-3.5 text-xs`}>See what people are rating</Link>
        </div>
      </Shell>
    )
  }

  const isOwner = user?.id === author.id
  const who = (author.display_name?.trim() || author.username).split(/\s+/)[0]
  const score = isRated(log) ? computeShowScore(log.performance_rating!, log.venue_rating!) : null
  const hidden = blind && !isOwner && !mine
  const place = placeOf(log)
  const media = resolveMediaUrls(log).map(resolvePhotoUrl)
  const here = reviewPath(author.username, showId, blind)

  const rateParams = new URLSearchParams({ artistId: log.artist_id, artistName: log.artist_name, returnTo: here })
  if (log.venue) rateParams.set('venue', log.venue)
  if (log.stage) rateParams.set('stage', log.stage)
  if (log.day) rateParams.set('day', log.day)
  if (log.show_date) rateParams.set('showDate', log.show_date)

  return (
    <Shell>
      <div className="space-y-4">
        <Card className="overflow-hidden">
          {media.length > 0 && !hidden && (
            <div className="border-b-1.5 border-ink"><MediaGrid urls={media} maxHeight={220} /></div>
          )}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Link href={isOwner ? '/profile' : `/u/${author.username}`} className="flex items-center gap-2 min-w-0">
                <PersonPhoto name={author.username} src={author.avatar_url} className="w-8 h-8 text-sm border border-ink/15" />
                <span className="text-[13px] font-semibold truncate">@{author.username}</span>
              </Link>
              {hidden
                ? <span className="font-display text-[15px] font-bold tracking-[0.3em] text-accent" aria-label="Rating hidden until you rate">?????</span>
                : score != null && <Stars score={score} size={16} />}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <h1 className="font-display text-[24px] font-bold tracking-tight leading-tight">
                  <Link href={`/artist/${encodeURIComponent(log.artist_id)}`} className="hover:text-accent">{log.artist_name}</Link>
                </h1>
                {place && <Place className="mt-1">{place}</Place>}
                {log.show_date && <p className="mt-0.5 text-[12px] text-ink-muted">{formatShowDate(log.show_date)}</p>}
              </div>
              <ArtistPhoto name={log.artist_name} src={artistImage(log.artist_name)} className="w-16 h-16" iconSize={20}>
                <DateTag isoDate={log.show_date} />
              </ArtistPhoto>
            </div>

            {!hidden && log.review && <PullQuote>{log.review}</PullQuote>}
            {hidden && <p className="text-[13px] text-ink-muted leading-snug">{who} is keeping their stars and review hidden until you&apos;ve rated it too.</p>}
            {!hidden && log.tags && log.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">{log.tags.map(tag => <Chip key={tag}>{tag}</Chip>)}</div>
            )}
          </div>
        </Card>

        {mine && isRated(mine) && isRated(log) && (
          <section>
            <Label className="mb-2">You and {who}</Label>
            <div className="grid grid-cols-2 gap-2.5">
              <SideBySide name="You" log={mine} />
              <SideBySide name={who} log={log} />
            </div>
            <p className="mt-2 text-[12px] text-ink-muted">{verdict(mine, log, who)}</p>
          </section>
        )}

        {isOwner ? (
          <button type="button" onClick={() => setSharing(true)} className={`${btnPrimary} w-full py-3.5 text-xs`}>
            <Share2 className="w-4 h-4" strokeWidth={2.25} /> Send to friends
          </button>
        ) : mine ? (
          <Link href={`/artist/${encodeURIComponent(log.artist_id)}`} className={`${btnSecondary} w-full py-3 text-[11px]`}>See everyone&apos;s reviews</Link>
        ) : (
          <div className="space-y-2.5">
            <Link href={`/log-show?${rateParams.toString()}`} className={`${btnPrimary} w-full py-3.5 text-xs`}>Were you there? Rate it</Link>
            <Link href={`/artist/${encodeURIComponent(log.artist_id)}`} className="block text-center text-[12px] text-ink-muted underline underline-offset-[3px]">
              Just reading? See everyone&apos;s reviews
            </Link>
          </div>
        )}

        {log.show_date && <SetlistPanel artist={log.artist_name} isoDate={log.show_date} venue={log.venue} />}

        {!isOwner && user && (
          <div className="flex items-center justify-between gap-3 rounded-card border-1.5 border-ink/15 bg-cream px-3 py-2.5">
            <span className="text-[13px]">Follow {who} on Gigl</span>
            <FollowButton targetUserId={author.id} />
          </div>
        )}
      </div>

      {sharing && (
        <ShareReviewSheet
          review={{
            username: author.username, showId, artist: log.artist_name, place, isoDate: log.show_date,
            imageUrl: artistImage(log.artist_name), score, review: log.review,
          }}
          onClose={() => setSharing(false)}
        />
      )}
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <TopBar><Logo href="/feed" /></TopBar>
      <main className="px-5 pt-5 pb-16 max-w-md mx-auto">{children}</main>
    </div>
  )
}

function SideBySide({ name, log }: { name: string; log: Log }) {
  return (
    <Card flat className="p-3 space-y-2">
      <p className="font-display text-sm font-bold truncate">{name}</p>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-label text-ink-muted">Performance</p>
        <Stars score={log.performance_rating!} size={12} />
      </div>
      <div>
        <p className="text-[9px] font-semibold uppercase tracking-label text-ink-muted">Venue</p>
        <Stars score={log.venue_rating!} size={12} />
      </div>
    </Card>
  )
}

// One plain line on where the two of you differ most.
function verdict(mine: Log, theirs: Log, who: string): string {
  const perf = mine.performance_rating! - theirs.performance_rating!
  const venue = mine.venue_rating! - theirs.venue_rating!
  if (perf === 0 && venue === 0) return 'You two agree exactly.'
  if (Math.abs(perf) >= Math.abs(venue)) return perf > 0 ? 'You rated the performance higher.' : `${who} rated the performance higher.`
  return venue > 0 ? 'You rated the venue higher.' : `${who} rated the venue higher.`
}
