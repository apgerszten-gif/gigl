'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Lock, Plus, UserPlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getFestival, hasDayOccurred, formatSetTime, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { formatShowDate } from '@/lib/dates'
import { computeShowScore, deriveLegacyEmoji } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { FirstShowCelebration } from '@/components/FirstShowCelebration'
import { BattleModeUnlockedModal } from '@/components/BattleModeUnlockedModal'
import { TagFriendsModal, type TaggedFriend } from '@/components/TagFriendsModal'
import { useAuth } from '@/components/AuthProvider'
import { ArtistPhoto, Card, Chip, Label, PersonPhoto, Place, Stars, btnPrimary, headerClass, inputBox } from '@/components/ui'
import { SignUpSheet } from '@/components/SignUpSheet'
import {
  enqueuePendingLog, getPendingLogForArtist, flushPendingLogs,
  saveGuestDraft, getGuestDraftForArtist, clearGuestDraft, type GuestDraft,
} from '@/lib/pendingLogs'
import { timeQuery, timeMark } from '@/lib/queryTiming'
import { useArtistImages } from '@/lib/useArtistImages'

const MAX_VIDEOS = 1
const MAX_PHOTOS = 2

const PRESET_TAGS = [
  'Surprise guest', 'Crowd surf', 'Sing along', 'Unreleased music',
  'Cool lighting', 'Emotional', 'Packed crowd', 'Acoustic moment',
  'Pyro/effects', 'Dancey',
]

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

function AutoGrowTextarea({
  value, onChange, placeholder,
}: {
  value: string; onChange: (v: string) => void; placeholder: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={1}
      className="block w-full resize-none overflow-hidden bg-transparent text-sm leading-normal text-ink placeholder:text-ink-faint focus:outline-none"
    />
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
  const [crowd, setCrowd]             = useState(0)

  const [thoughts, setThoughts] = useState('')

  const [tagOptions, setTagOptions]     = useState<string[]>(PRESET_TAGS)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [addingTag, setAddingTag]       = useState(false)
  const [customTagValue, setCustomTagValue] = useState('')
  const customTagInputRef = useRef<HTMLInputElement>(null)

  const [media, setMedia] = useState<MediaItem[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [taggedFriends, setTaggedFriends] = useState<TaggedFriend[]>([])
  const [tagModalOpen, setTagModalOpen]   = useState(false)

  const [saving, setSaving] = useState(false)
  const [celebration, setCelebration] = useState<{ username: string | null } | null>(null)
  const [battleUnlock, setBattleUnlock] = useState(false)
  const [signUpOpen, setSignUpOpen]     = useState(false)

  // Ratings, review and tags from a log that hasn't reached the server yet:
  // a queued save, or a draft written before signing up.
  function applyDraft(draft: GuestDraft | null) {
    if (!draft) return
    setPerformance(draft.performance_rating)
    setVenue(draft.venue_rating)
    setCrowd(draft.crowd_rating)
    setThoughts(draft.review ?? '')
    if (draft.tags && draft.tags.length > 0) {
      setSelectedTags(draft.tags)
      setTagOptions(prev => Array.from(new Set([...prev, ...draft.tags!])))
    }
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
        .select('id, stage, day, venue, show_date, performance_rating, venue_rating, crowd_rating, review, tags, photo_url, media_urls')
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
        if (data.crowd_rating) setCrowd(data.crowd_rating)
        if (data.review) setThoughts(data.review)
        if (data.tags && data.tags.length > 0) {
          setSelectedTags(data.tags)
          setTagOptions(prev => Array.from(new Set([...prev, ...data.tags])))
        }
        const existingUrls = resolveMediaUrls(data)
        if (existingUrls.length > 0) {
          setMedia(existingUrls.map(url => ({ url, isVideo: isVideoUrl(url) })))
        }

        const { data: tagRows } = await timeQuery('log-show:show_tags', supabase
          .from('show_tags')
          .select('tagged_user_id, pending_invite, invite_contact')
          .eq('logged_show_id', data.id))

        if (tagRows && tagRows.length > 0) {
          const confirmedIds = tagRows.filter(r => !r.pending_invite && r.tagged_user_id).map(r => r.tagged_user_id as string)
          const profileMap = new Map<string, { username: string; display_name: string; avatar_url: string | null }>()
          if (confirmedIds.length > 0) {
            const { data: profs } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', confirmedIds)
            profs?.forEach(p => profileMap.set(p.id, p))
          }
          setTaggedFriends(tagRows.map(r => {
            if (r.pending_invite) {
              return { userId: null, username: null, displayName: r.invite_contact ?? 'Invited', pendingInvite: true, inviteContact: r.invite_contact }
            }
            const prof = r.tagged_user_id ? profileMap.get(r.tagged_user_id) : undefined
            return {
              userId: r.tagged_user_id,
              username: prof?.username ?? null,
              displayName: prof?.display_name ?? prof?.username ?? 'Friend',
              avatarUrl: prof?.avatar_url ?? null,
              pendingInvite: false,
              inviteContact: null,
            }
          }))
        }
      }

      // A rating logged moments ago may still be queued locally, not yet
      // synced (e.g. the connection dropped right after saving) — prefer it
      // over the server row above since it reflects the user's most recent
      // intent.
      applyDraft(getPendingLogForArtist(userId, artistId))
      // Newer still: a draft written while signed out that never got posted
      // (they signed in some other way, or the page reloaded mid sign-up).
      applyDraft(getGuestDraftForArtist(artistId))

      setLoadingExisting(false)
      timeMark('log-show:prefill total', loadStart)
    }
    load(user.id)
  }, [artistId, authLoading, user, router])

  useEffect(() => {
    if (addingTag) customTagInputRef.current?.focus()
  }, [addingTag])

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  function commitCustomTag() {
    const cleaned = customTagValue.trim()
    if (cleaned) {
      setTagOptions(prev => prev.includes(cleaned) ? prev : [...prev, cleaned])
      setSelectedTags(prev => prev.includes(cleaned) ? prev : [...prev, cleaned])
    }
    setCustomTagValue('')
    setAddingTag(false)
  }

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

  // Deletes and re-inserts every show_tags row for this show — simpler than
  // diffing against what's already there, and cheap since a show is tagged
  // with at most a handful of friends. Best-effort: the rating itself is
  // already safely queued by the time this runs, so a failure here just
  // means tags can be re-added later from the edit screen.
  async function persistShowTags(loggedShowId: string) {
    try {
      await supabase.from('show_tags').delete().eq('logged_show_id', loggedShowId)
      if (taggedFriends.length > 0) {
        await supabase.from('show_tags').insert(taggedFriends.map(f => ({
          logged_show_id: loggedShowId,
          tagged_user_id: f.userId,
          pending_invite: f.pendingInvite,
          invite_contact: f.inviteContact,
        })))
      }
    } catch {
      // best-effort, see comment above
    }
  }

  const canSave = performance > 0 && venue > 0 && crowd > 0
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
      crowd_rating:        crowd,
      review:              thoughts.trim() || null,
      tags:                selectedTags.length > 0 ? selectedTags : null,
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
    const score = computeShowScore(performance, venue, crowd)

    // Queue the rating locally before anything else touches the network.
    // From this line on, the rating itself can't be lost to a dropped
    // connection — everything below is best-effort.
    enqueuePendingLog({
      ...draft,
      user_id:    userId,
      photo_url:  null,
      media_urls: null,
      emoji:      deriveLegacyEmoji(score),
    })
    // Safely queued under a real account now, so a signed-out draft of it
    // has nothing left to do.
    clearGuestDraft()

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
    if (mediaUrls.length > 0) {
      enqueuePendingLog({
        ...draft,
        user_id:    userId,
        photo_url:  mediaUrls[0],
        media_urls: mediaUrls,
        emoji:      deriveLegacyEmoji(score),
      })
    }

    let isFirstShow = false
    let wasUnlocked = true
    let priorCount = 0
    if (!existingId) {
      try {
        const [{ count }, { data: profileBefore }] = await Promise.all([
          timeQuery('log-show:count-logged_shows', supabase.from('logged_shows').select('id', { count: 'exact', head: true }).eq('user_id', userId)),
          timeQuery('log-show:profiles', supabase.from('profiles').select('battle_mode_unlocked').eq('id', userId).single()),
        ])
        priorCount = count ?? 0
        isFirstShow = priorCount === 0
        wasUnlocked = profileBefore?.battle_mode_unlocked ?? true
      } catch {
        isFirstShow = false
      }
    }

    if (existingId) {
      // Fire-and-forget — PendingLogsSync retries this in the background
      // regardless (on foreground/reconnect) if it fails here. Never await
      // this on the critical path; festival wifi is exactly the case this
      // queue exists for.
      void flushPendingLogs()
      void persistShowTags(existingId)
    } else if (taggedFriends.length > 0) {
      // Unlike the rating itself, tags can't ride along in the pending-log
      // queue entry above — they need the row's real id, which only exists
      // once it's actually synced. Only take this slower, awaited path when
      // there's something to tag; the untagged case stays fully
      // fire-and-forget like before.
      try {
        await flushPendingLogs()
        const { data: row } = await timeQuery('log-show:show_tags-lookup', supabase
          .from('logged_shows').select('id').eq('user_id', userId).eq('artist_id', artistId).single())
        if (row) await persistShowTags(row.id)
      } catch {
        // best-effort — the rating itself is already safely queued regardless
      }
    } else {
      void flushPendingLogs()
    }

    // Optimistic: this save is about to push shows_logged_count past the
    // trigger's threshold, so we celebrate immediately from data already in
    // hand rather than a round trip to confirm the server-side flip.
    // Everywhere the feature actually gates on (Feed/Rankings cards) always
    // reads the live battle_mode_unlocked value, so a rare desync here just
    // means the celebration and the real unlock land a beat apart, not that
    // the feature opens before it should.
    const battleModeJustUnlocked = !existingId && !wasUnlocked && (priorCount + 1) >= 10

    if (isFirstShow) {
      const { data: profileRow } = await timeQuery('log-show:profiles-username', supabase.from('profiles').select('username').eq('id', userId).single())
      setCelebration({ username: profileRow?.username ?? null })
      setSaving(false)
      timeMark('log-show:save total (first show)', saveStart)
      return
    }

    if (battleModeJustUnlocked) {
      setBattleUnlock(true)
      setSaving(false)
      timeMark('log-show:save total (battle unlock)', saveStart)
      return
    }

    timeMark('log-show:save total', saveStart)
    router.push('/feed')
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
              ? <Stars score={computeShowScore(performance, venue, crowd)} size={16} />
              : <span className="text-[11px] italic text-ink-faint">All three required</span>}
          </div>
          <StarRow label="Performance" value={performance} onChange={setPerformance} />
          <StarRow label="Venue"       value={venue}       onChange={setVenue} />
          <StarRow label="Crowd"       value={crowd}       onChange={setCrowd} />
        </Card>

        <section className="space-y-1.5">
          <Label tone="ink">Field notes</Label>
          <div className={`${inputBox} px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/40`}>
            <AutoGrowTextarea
              value={thoughts}
              onChange={setThoughts}
              placeholder="What made this set stand out?"
            />
          </div>
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label tone="ink">Highlights</Label>
            {selectedTags.length > 0 && (
              <span className="text-[10px] font-semibold text-accent">{selectedTags.length} selected</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {tagOptions.map(tag => {
              const active = selectedTags.includes(tag)
              return (
                <button key={tag} type="button" onClick={() => toggleTag(tag)}>
                  <Chip active={active}>{active ? `${tag} ✓` : `+ ${tag}`}</Chip>
                </button>
              )
            })}

            {addingTag ? (
              <input
                ref={customTagInputRef}
                value={customTagValue}
                onChange={e => setCustomTagValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); commitCustomTag() }
                  if (e.key === 'Escape') { setCustomTagValue(''); setAddingTag(false) }
                }}
                onBlur={commitCustomTag}
                placeholder="Tag name"
                className="w-28 rounded border-1.5 border-accent bg-transparent px-2 py-0.5 text-base text-ink focus:outline-none"
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingTag(true)}
                className="rounded border-1.5 border-dashed border-ink/30 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-label text-ink-muted"
              >
                + Custom
              </button>
            )}
          </div>
        </section>

        {/* Tagging searches the people you follow, so it needs an account.
            Someone posting their first log can tag friends afterwards. */}
        {user && <section className="space-y-1.5">
          <Label tone="ink">Went with</Label>
          <button type="button" onClick={() => setTagModalOpen(true)} className="block w-full text-left">
            <Card flat className="flex items-center gap-2.5 px-3 py-2.5">
              {taggedFriends.length > 0 ? (
                <div className="flex items-center flex-shrink-0">
                  {taggedFriends.slice(0, 3).map((f, i) => (
                    <PersonPhoto
                      key={f.userId ?? f.inviteContact ?? i}
                      name={f.displayName}
                      src={f.avatarUrl}
                      className={`w-7 h-7 text-[11px] border-2 border-cream ${i > 0 ? '-ml-2.5' : ''}`}
                    />
                  ))}
                </div>
              ) : (
                <UserPlus className="w-4 h-4 flex-shrink-0 text-accent" strokeWidth={2} />
              )}
              <span className="flex-1 min-w-0 truncate text-[13px] font-semibold">
                {taggedFriends.length === 0
                  ? 'Tag friends who were there'
                  : taggedFriends.length <= 3
                  ? taggedFriends.map(f => f.displayName).join(', ')
                  : `${taggedFriends.slice(0, 2).map(f => f.displayName).join(', ')} +${taggedFriends.length - 2} more`}
              </span>
              <ChevronRight className="w-4 h-4 flex-shrink-0 text-ink-faint" />
            </Card>
          </button>
        </section>}

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
          signUpLabel="Create account & post"
          signInLabel="Sign in & post"
          finishLabel="Post"
          onClose={() => setSignUpOpen(false)}
          onSignedIn={userId => { setSignUpOpen(false); void save(userId) }}
        />
      )}

      {tagModalOpen && (
        <TagFriendsModal
          initialSelected={taggedFriends}
          onClose={() => setTagModalOpen(false)}
          onDone={friends => { setTaggedFriends(friends); setTagModalOpen(false) }}
        />
      )}

      {celebration && <FirstShowCelebration username={celebration.username} />}
      {battleUnlock && (
        <BattleModeUnlockedModal onDismiss={() => { setBattleUnlock(false); router.push('/feed') }} />
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
