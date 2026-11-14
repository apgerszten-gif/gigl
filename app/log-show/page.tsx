'use client'

import { useCallback, useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Lock, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getFestival, hasDayOccurred, formatSetTime, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { formatShowDate } from '@/lib/dates'
import { computeShowScore, deriveLegacyEmoji } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { FirstShowCelebration } from '@/components/FirstShowCelebration'
import { useAuth } from '@/components/AuthProvider'
import { ArtistPhoto, Card, Label, Place, Stars, btnPrimary, btnSecondary, headerClass } from '@/components/ui'
import { SignUpSheet } from '@/components/SignUpSheet'
import { ShareReviewSheet } from '@/components/ShareReviewSheet'
import { Sheet } from '@/components/Sheet'
import { NotesWithMentions, WentWithField, usePeopleGraph } from '@/components/TagPeople'
import { mentionedUsernames, unmention, type TaggedPerson } from '@/lib/tags'
import {
  enqueuePendingLog, getPendingLogForArtist, getPendingTagsForArtist, flushPendingLogs,
  saveGuestDraft, getGuestDraftForArtist, clearGuestDraft, type GuestDraft,
} from '@/lib/pendingLogs'
import { timeQuery, timeMark } from '@/lib/queryTiming'
import { useArtistImages } from '@/lib/useArtistImages'

const MAX_VIDEOS = 1
const MAX_PHOTOS = 2

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

function getVideoDuration(file: File): Promise<number> {
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.onloadedmetadata = () => { URL.revokeObjectURL(video.src); resolve(video.duration) }
    video.onerror = () => resolve(0)
    video.src = URL.createObjectURL(file)
  })
}

function isVideoUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ['mp4', 'mov', 'webm', 'm4v', 'avi'].includes(ext ?? '')
}

interface MediaItem {
  url:      string
  isVideo:  boolean
  file?:    File   // present only for newly-added, not-yet-uploaded items
}

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
      <polygon points={STAR_POINTS} />
    </svg>
  )
}

// One tappable 1-5 star sub-rating.
function StarRow({
  label, value, onChange,
}: {
  label: string; value: number; onChange: (n: number) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-display text-base font-bold">
        {label}<span className="text-accent">*</span>
      </p>
      <div className="flex gap-0.5 text-star">
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n} star${n === 1 ? '' : 's'}`}
            onClick={() => onChange(n)}
            className="p-0.5"
          >
            <Star filled={n <= value} size={30} />
          </button>
        ))}
      </div>
    </div>
  )
}

// Title bar for the log flow: no profile photo, just a way out.
function FlowHeader({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <header className={headerClass}>
      <h1 className="flex-1 min-w-0 font-display text-[17px] font-bold tracking-tight truncate">{title}</h1>
      <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-ink-muted">
        <X className="w-5 h-5" strokeWidth={2} />
      </button>
    </header>
  )
}

function LogShowInner() {
  const router       = useRouter()
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const artistId       = searchParams.get('artistId') ?? ''
  const artistName     = searchParams.get('artistName') ?? 'Unknown artist'
  const stageParam     = searchParams.get('stage') ?? ''
  const dayParam       = searchParams.get('day') ?? ''
  const venueParam     = searchParams.get('venue') ?? ''
  const showDateParam  = searchParams.get('showDate') ?? ''
  // Where to go once saved: a shared review this person came from ("Were
  // you there? Rate it"), which then shows both ratings side by side. Only
  // a path on this site is followed.
  const returnToParam  = searchParams.get('returnTo')
  const returnTo       = returnToParam && returnToParam.startsWith('/r/') ? returnToParam : null
  // Ticketmaster's photo for a show picked in search; otherwise the artist's
  // photo from artist_images, if there is one.
  const imageParam     = searchParams.get('image')
  const artistImage    = useArtistImages([artistName])

  const [stage, setStage]         = useState(stageParam)
  const [day, setDay]             = useState(dayParam)
  const [showVenue, setShowVenue] = useState(venueParam)
  const [showDate, setShowDate]   = useState(showDateParam)

  // Shows can only be logged starting the calendar day they happen -
  // re-rating an already-logged show is exempt, since it can only exist if
  // the show already happened. Only applies to the festival-lineup path;
  // a Ticketmaster-sourced show has no `festival` and so is never locked.
  const [festival, setFestival] = useState<ReturnType<typeof getFestival>>(null)
  useEffect(() => {
    const id = localStorage.getItem(LOCAL_STORAGE_KEY)
    setFestival(id ? getFestival(id) : null)
  }, [])

  // Set time isn't stored on logged_shows (only stage/day are, via query
  // params / the prefill below) - looked up from the static schedule by
  // artistId instead, so it shows up on both the fresh-log and re-rate paths.
  const scheduledArtist = festival?.artists.find(a => a.id === artistId)
  const setTime = scheduledArtist ? formatSetTime(scheduledArtist) : null
  const dayName    = day ? day.charAt(0).toUpperCase() + day.slice(1) : null
  const dateLabel  = stage
    ? [dayName, setTime].filter(Boolean).join(' · ')
    : (showDate ? formatShowDate(showDate) : '')
  const placeLabel = stage || showVenue || 'Venue unavailable'

  const [loadingExisting, setLoadingExisting] = useState(true)
  const [existingId, setExistingId]           = useState<string | null>(null)

  const dayLocked = !existingId && !!festival && !!day && !hasDayOccurred(festival, day)

  const [performance, setPerformance] = useState(0)
  const [venue, setVenue]             = useState(0)

  const [thoughts, setThoughts] = useState('')

  // Highlight tags aren't on this screen any more, but a log re-rated here
  // keeps the ones it already has rather than being saved over with none.
  const [existingTags, setExistingTags] = useState<string[]>([])

  const [media, setMedia] = useState<MediaItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Who you went with (lib/tags.ts). @mentions in the review are tags for as
  // long as the @ stays in the text; `wentWith` is everyone tagged from the
  // bar instead, plus anyone already tagged on this log whom the review
  // doesn't mention. `known` maps a username to its person, for the
  // mentions. `tagsReady` is false while an existing log's tags are loading
  // (or if they couldn't be), and saving then leaves its tags alone.
  const graph = usePeopleGraph()
  const [wentWith, setWentWith]   = useState<TaggedPerson[]>([])
  const [known, setKnown]         = useState<Record<string, TaggedPerson>>({})
  const [tagsReady, setTagsReady] = useState(true)
  const lookedUp = useRef(new Set<string>())

  function remember(people: TaggedPerson[]) {
    if (people.length === 0) return
    setKnown(prev => ({ ...prev, ...Object.fromEntries(people.map(p => [p.username, p])) }))
  }

  const mentioned = mentionedUsernames(thoughts)
  const tagged: TaggedPerson[] = []
  for (const person of [...mentioned.map(u => known[u]), ...wentWith]) {
    if (!person || person.id === user?.id || graph.blocked.has(person.id)) continue
    if (!tagged.some(p => p.id === person.id)) tagged.push(person)
  }

  // An @username typed out by hand, rather than picked from the list: look
  // it up once it has sat still for a moment. One that isn't anyone stays
  // plain text.
  useEffect(() => {
    const unknown = mentioned.filter(u => !known[u] && !lookedUp.current.has(u))
    if (unknown.length === 0) return
    const timer = setTimeout(async () => {
      unknown.forEach(u => lookedUp.current.add(u))
      const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('username', unknown)
      remember(data ?? [])
    }, 500)
    return () => clearTimeout(timer)
  }, [thoughts, known])

  function addWentWith(person: TaggedPerson) {
    remember([person])
    setWentWith(prev => prev.some(p => p.id === person.id) ? prev : [...prev, person])
  }

  // Untagging from a chip also takes the @ off their name in the review,
  // which would otherwise tag them again.
  function untag(person: TaggedPerson) {
    setWentWith(prev => prev.filter(p => p.id !== person.id))
    if (mentioned.includes(person.username)) setThoughts(text => unmention(text, person.username))
  }

  const [saving, setSaving] = useState(false)
  const [celebration, setCelebration] = useState<{ username: string | null } | null>(null)
  // After a save: "Logged." with "Send to friends", then the share sheet.
  const [logged, setLogged]           = useState<{ username: string | null; score: number } | null>(null)
  const [sharing, setSharing]         = useState(false)
  const leave = useCallback(() => router.push('/feed'), [router])
  const [signUpOpen, setSignUpOpen]     = useState(false)

  // Ratings, review and tags from a log that hasn't reached the server yet:
  // a queued save, or a draft written before signing up.
  function applyDraft(draft: GuestDraft | null) {
    if (!draft) return
    setPerformance(draft.performance_rating)
    setVenue(draft.venue_rating)
    setThoughts(draft.review ?? '')
    if (draft.tags && draft.tags.length > 0) setExistingTags(draft.tags)
  }

  // Prefill from an existing log for this artist, if one exists.
  useEffect(() => {
    if (!artistId) { setLoadingExisting(false); return }
    if (authLoading) return

    // Signed out, nothing on the server is theirs. The only thing to bring
    // back is a draft they already tried to post, e.g. before the page
    // reloaded while they were signing up.
    if (!user) {
      applyDraft(getGuestDraftForArtist(artistId))
      setLoadingExisting(false)
      return
    }

    async function load(userId: string) {
      const loadStart = Date.now()
      const { data } = await timeQuery('log-show:logged_shows', supabase
        .from('logged_shows')
        .select('id, stage, day, venue, show_date, performance_rating, venue_rating, review, tags, photo_url, media_urls')
        .eq('user_id', userId)
        .eq('artist_id', artistId)
        .maybeSingle())

      if (data) {
        setExistingId(data.id)
        if (data.stage) setStage(data.stage)
        if (data.day) setDay(data.day)
        if (data.venue) setShowVenue(data.venue)
        if (data.show_date) setShowDate(data.show_date)
        if (data.performance_rating) setPerformance(data.performance_rating)
        if (data.venue_rating) setVenue(data.venue_rating)
        if (data.review) setThoughts(data.review)
        if (data.tags && data.tags.length > 0) setExistingTags(data.tags)
        const existingUrls = resolveMediaUrls(data)
        if (existingUrls.length > 0) {
          setMedia(existingUrls.map(url => ({ url, isVideo: isVideoUrl(url) })))
        }
      }

      // A rating logged moments ago may still be queued locally, not yet
      // synced (e.g. the connection dropped right after saving) — prefer it
      // over the server row above since it reflects the user's most recent
      // intent.
      const pending = getPendingLogForArtist(userId, artistId)
      applyDraft(pending)
      // Newer still: a draft written while signed out that never got posted
      // (they signed in some other way, or the page reloaded mid sign-up).
      const guest = getGuestDraftForArtist(artistId)
      applyDraft(guest)

      setLoadingExisting(false)
      timeMark('log-show:prefill total', loadStart)

      // Who's tagged: a queued save's list if there is one, since it's newer,
      // or else the log's own tags. Loaded after the screen is up; until it
      // arrives, saving leaves the tags as they are.
      const review = guest ? guest.review : pending ? pending.review : data?.review
      let tagIds = getPendingTagsForArtist(userId, artistId)
      if (!tagIds && data) {
        setTagsReady(false)
        const { data: rows, error } = await supabase
          .from('show_tags').select('tagged_user_id').eq('logged_show_id', data.id).not('tagged_user_id', 'is', null)
        if (error) { console.error('show_tags prefill failed:', error.message); return }
        tagIds = (rows ?? []).map(r => r.tagged_user_id as string)
      }
      if (!tagIds || tagIds.length === 0) { setTagsReady(true); return }

      const { data: people, error: peopleError } = await supabase
        .from('profiles').select('id, username, display_name, avatar_url').in('id', tagIds)
      if (peopleError) { console.error('tagged profiles prefill failed:', peopleError.message); return }
      remember(people ?? [])
      const inReview = new Set(mentionedUsernames(review))
      setWentWith((people ?? []).filter(p => !inReview.has(p.username)))
      setTagsReady(true)
    }
    load(user.id)
  }, [artistId, authLoading, user, router])

  async function handleMediaSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    let videoCount = media.filter(m => m.isVideo).length
    let photoCount = media.filter(m => !m.isVideo).length

    const items: MediaItem[] = []
    for (const file of Array.from(files)) {
      const isVideo = file.type.startsWith('video/')
      if (isVideo) {
        if (videoCount >= MAX_VIDEOS) { alert(`You can only attach ${MAX_VIDEOS} video.`); continue }
        const duration = await getVideoDuration(file)
        if (duration > 20) { alert('Videos must be 20 seconds or less.'); continue }
        videoCount++
      } else {
        if (photoCount >= MAX_PHOTOS) { alert(`You can only attach ${MAX_PHOTOS} photos.`); continue }
        photoCount++
      }
      items.push({ url: URL.createObjectURL(file), isVideo, file })
    }
    setMedia(prev => [...prev, ...items])
    e.target.value = ''
  }

  function removeMedia(index: number) {
    setMedia(prev => prev.filter((_, i) => i !== index))
  }

  const canSave = performance > 0 && venue > 0
  const mediaVideoCount = media.filter(m => m.isVideo).length
  const mediaPhotoCount = media.filter(m => !m.isVideo).length
  const mediaFull = mediaVideoCount >= MAX_VIDEOS && mediaPhotoCount >= MAX_PHOTOS

  // The log as it stands on screen, minus who wrote it and any media.
  function currentDraft(): GuestDraft {
    return {
      artist_id:          artistId,
      artist_name:        artistName,
      stage:              stage || null,
      day:                day || null,
      venue:              showVenue || null,
      show_date:          showDate || null,
      performance_rating: performance,
      venue_rating:        venue,
      review:              thoughts.trim() || null,
      tags:                existingTags.length > 0 ? existingTags : null,
    }
  }

  function handleSave() {
    if (!canSave || saving) return

    // Signed out: park the log on this phone, then ask for an account. The
    // sheet opens over this screen rather than navigating away, so attached
    // photos are still here to upload once it hands back a user id.
    if (!user) {
      saveGuestDraft(currentDraft())
      setSignUpOpen(true)
      return
    }
    void save(user.id)
  }

  async function save(userId: string) {
    setSaving(true)
    const saveStart = Date.now()
    console.log('[perf] log-show:save start')

    const draft = currentDraft()
    const score = computeShowScore(performance, venue)
    // Undefined leaves the log's tags as they are (see tagsReady).
    let tagIds: string[] | undefined = tagsReady ? tagged.filter(p => p.id !== userId).map(p => p.id) : undefined

    // Queue the rating locally before anything else touches the network.
    // From this line on, the rating itself can't be lost to a dropped
    // connection — everything below is best-effort.
    enqueuePendingLog({
      ...draft,
      user_id:    userId,
      photo_url:  null,
      media_urls: null,
      emoji:      deriveLegacyEmoji(score),
    }, tagIds)
    // Safely queued under a real account now, so a signed-out draft of it
    // has nothing left to do.
    clearGuestDraft()

    // An @username typed just before saving may not have been looked up yet.
    const unresolved = mentioned.filter(u => !known[u])
    if (tagIds && unresolved.length > 0) {
      try {
        const { data: found } = await supabase.from('profiles').select('id').in('username', unresolved)
        const extra = (found ?? []).map(p => p.id as string).filter(id => id !== userId && !graph.blocked.has(id) && !tagIds!.includes(id))
        if (extra.length > 0) tagIds = [...tagIds, ...extra]
      } catch {
        // tagged without them
      }
    }

    // Best-effort media upload — if this fails, the rating above is already
    // safe; the show just gets logged without its photo/video for now.
    const mediaUrls: string[] = []
    for (const item of media) {
      if (item.file) {
        try {
          const ext = item.file.name.split('.').pop()
          const path = `${userId}/${artistId}-${Date.now()}-${mediaUrls.length}.${ext}`
          const { error: uploadError } = await timeQuery(`log-show:media-upload(${item.file.size}b)`, supabase.storage
            .from('show-photos')
            .upload(path, item.file, { upsert: true }))
          if (uploadError) throw uploadError
          const { data: urlData } = supabase.storage.from('show-photos').getPublicUrl(path)
          mediaUrls.push(urlData.publicUrl)
        } catch {
          // skip this item — logged without it, user can re-attach later
        }
      } else {
        mediaUrls.push(item.url)
      }
    }
    enqueuePendingLog({
      ...draft,
      user_id:    userId,
      photo_url:  mediaUrls[0] ?? null,
      media_urls: mediaUrls.length > 0 ? mediaUrls : null,
      emoji:      deriveLegacyEmoji(score),
    }, tagIds)

    let isFirstShow = false
    if (!existingId) {
      try {
        const { count } = await timeQuery('log-show:count-logged_shows', supabase.from('logged_shows').select('id', { count: 'exact', head: true }).eq('user_id', userId))
        isFirstShow = (count ?? 0) === 0
      } catch {
        isFirstShow = false
      }
    }

    // Fire-and-forget — PendingLogsSync retries this in the background
    // regardless (on foreground/reconnect) if it fails here. Never await
    // this on the critical path; festival wifi is exactly the case this
    // queue exists for.
    void flushPendingLogs()

    // The tenth log unlocks Battle Mode (a trigger flips
    // profiles.battle_mode_unlocked), and nothing marks it here: a pop-up
    // over the log people just saved read as a gate they had to deal with.
    // The invitation is the card on Feed and Rankings
    // (components/BattleModeCard.tsx), there when they next look.

    // Came from a friend's shared review: straight back to it, where both
    // ratings now sit side by side. Before any celebration, since a first
    // log is exactly the friend this link was meant to bring in.
    if (returnTo) {
      timeMark('log-show:save total (return to review)', saveStart)
      router.push(returnTo)
      return
    }

    if (isFirstShow) {
      const { data: profileRow } = await timeQuery('log-show:profiles-username', supabase.from('profiles').select('username').eq('id', userId).single())
      setCelebration({ username: profileRow?.username ?? null })
      setSaving(false)
      timeMark('log-show:save total (first show)', saveStart)
      return
    }

    timeMark('log-show:save total', saveStart)
    const { data: me } = await supabase.from('profiles').select('username').eq('id', userId).single()
    setLogged({ username: me?.username ?? null, score })
    setSaving(false)
  }

  if (loadingExisting) return null

  if (dayLocked) {
    const unlockDate = festival?.dayDates[day]
    return (
      <div className="min-h-screen bg-paper text-ink">
        <FlowHeader title="Log a show" onClose={() => router.back()} />

        <div className="px-8 py-16 flex flex-col items-center text-center">
          <span className="mb-4 w-12 h-12 rounded-full bg-accent/10 border-1.5 border-accent/30 text-accent flex items-center justify-center">
            <Lock className="w-5 h-5" strokeWidth={2} />
          </span>
          <h2 className="font-display text-xl font-bold leading-snug mb-2.5">
            Not showtime yet<span className="text-accent">.</span>
          </h2>
          <p className="text-[13px] text-ink-muted leading-normal mb-7">
            You can log {artistName} once {dayName ?? 'its day'}{unlockDate ? ` (${unlockDate})` : ''} arrives.
          </p>
          <button type="button" onClick={() => router.back()} className={`${btnPrimary} px-7 py-3 text-xs`}>Back</button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <FlowHeader title={existingId ? 'Update log' : 'Log a show'} onClose={() => router.back()} />

      <div className="px-5 pt-4 pb-10 space-y-5">
        <Card className="p-3 flex items-center gap-3">
          <ArtistPhoto name={artistName} src={imageParam || artistImage(artistName)} className="w-14 h-14" />
          <div className="flex-1 min-w-0">
            {dateLabel && <Label tone="accent">{dateLabel}</Label>}
            <h2 className="font-display text-base font-bold leading-tight truncate">{artistName}</h2>
            <Place className="mt-0.5">{placeLabel}</Place>
          </div>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Label tone="ink">Your rating</Label>
            {canSave
              ? <Stars score={computeShowScore(performance, venue)} size={16} />
              : <span className="text-[11px] italic text-ink-faint">Both required</span>}
          </div>
          <StarRow label="Performance" value={performance} onChange={setPerformance} />
          <StarRow label="Venue"       value={venue}       onChange={setVenue} />
        </Card>

        <section className="space-y-1.5">
          <Label tone="ink">Field notes</Label>
          <NotesWithMentions
            value={thoughts}
            onChange={setThoughts}
            placeholder="What made this set stand out?"
            graph={graph}
            exclude={new Set(tagged.map(p => p.id))}
            onPicked={person => remember([person])}
          />
        </section>

        <section className="space-y-1.5">
          <Label tone="ink">
            Photos &amp; video{' '}
            <span className="normal-case tracking-normal font-medium text-ink-faint">· up to 1 video + 2 photos</span>
          </Label>
          <div className="flex gap-2.5 overflow-x-auto pt-1.5 pr-1.5">
            {media.map((item, i) => (
              <div key={i} className="relative flex-shrink-0">
                {item.isVideo ? (
                  <video src={item.url} muted playsInline className="block w-16 h-16 rounded-card border-1.5 border-ink object-cover" />
                ) : (
                  <img src={item.url} alt="" className="block w-16 h-16 rounded-card border-1.5 border-ink object-cover" />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(i)}
                  aria-label="Remove"
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ink text-cream flex items-center justify-center"
                >
                  <X className="w-3 h-3" strokeWidth={3} />
                </button>
              </div>
            ))}

            <input
              ref={fileInputRef}
              type="file" accept="image/*,video/*" multiple
              className="hidden"
              onChange={handleMediaSelect}
            />
            {!mediaFull && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                aria-label="Add a photo or video"
                className="w-16 h-16 flex-shrink-0 rounded-card border-1.5 border-dashed border-ink/30 flex items-center justify-center text-ink-faint"
              >
                <Plus className="w-5 h-5" strokeWidth={2} />
              </button>
            )}
          </div>
        </section>

        <WentWithField tagged={tagged} graph={graph} onAdd={addWentWith} onRemove={untag} />

        <button
          type="button"
          onClick={handleSave}
          disabled={!canSave || saving}
          className={`${btnPrimary} w-full py-4 text-xs ${saving ? 'opacity-70' : ''}`}
        >
          {saving ? 'Saving...' : 'Save log'}
        </button>
        {!user && (
          <p className="-mt-2 text-center text-[11px] text-ink-faint">
            Posting asks you to make an account. What you&apos;ve written is kept.
          </p>
        )}
      </div>

      {signUpOpen && (
        <SignUpSheet
          title="Post your log"
          blurb="It's saved on this phone. Make an account and it goes up on the feed."
          signInLabel="Sign in & post"
          finishLabel="Post"
          onClose={() => setSignUpOpen(false)}
          onSignedIn={userId => { setSignUpOpen(false); void save(userId) }}
        />
      )}

      {celebration && (
        <FirstShowCelebration
          username={celebration.username}
          onShareReview={celebration.username ? () => {
            setLogged({ username: celebration.username, score: computeShowScore(performance, venue) })
            setCelebration(null)
            setSharing(true)
          } : undefined}
        />
      )}

      {logged && !sharing && (
        <Sheet title="Logged" blurb={`${artistName} is on your profile and the feed.`} onClose={leave}>
          <div className="space-y-2.5">
            {logged.username && (
              <button type="button" onClick={() => setSharing(true)} className={`${btnPrimary} w-full py-3.5 text-xs`}>
                Send to friends
              </button>
            )}
            <button type="button" onClick={leave} className={`${btnSecondary} w-full py-3 text-[11px]`}>Back to feed</button>
          </div>
        </Sheet>
      )}

      {logged?.username && sharing && (
        <ShareReviewSheet
          review={{
            username: logged.username, showId: artistId, artist: artistName,
            place: stage || showVenue || null, isoDate: showDate || null,
            imageUrl: imageParam || artistImage(artistName), score: logged.score, review: thoughts.trim() || null,
          }}
          onClose={leave}
        />
      )}
    </div>
  )
}

export default function LogShowPage() {
  return (
    <Suspense fallback={null}>
      <LogShowInner />
    </Suspense>
  )
}
