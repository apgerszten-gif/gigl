'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTheme } from '@/components/FestivalThemeProvider'
import { createClient } from '@/lib/supabase/client'
import { getFestival, hasDayOccurred, formatSetTime, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { computeShowScore, deriveLegacyEmoji } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { FirstShowCelebration } from '@/components/FirstShowCelebration'
import { BattleModeUnlockedModal } from '@/components/BattleModeUnlockedModal'
import { TagFriendsModal, type TaggedFriend } from '@/components/TagFriendsModal'
import { Avatar } from '@/components/Avatar'
import { useAuth } from '@/components/AuthProvider'
import { enqueuePendingLog, getPendingLogForArtist, flushPendingLogs } from '@/lib/pendingLogs'
import { timeQuery, timeMark } from '@/lib/queryTiming'

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

function Star({ filled, size, accent }: { filled: boolean; size: number; accent: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? accent : 'none'} stroke={accent} strokeWidth="1.5">
      <polygon points={STAR_POINTS} />
    </svg>
  )
}

function StarRow({
  label, value, onChange, T,
}: {
  label: string; value: number; onChange: (n: number) => void; T: ReturnType<typeof useTheme>
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
      <div style={{
        fontFamily: T.serif, fontSize: 16, fontWeight: 700,
        color: '#4A3528', letterSpacing: '-0.2px',
      }}>
        {label}<span style={{ color: T.accent }}>*</span>
      </div>
      <div style={{ display: 'flex', gap: 4 }}>
        {[1, 2, 3, 4, 5].map(n => (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n} star${n === 1 ? '' : 's'}`}
            onClick={() => onChange(n)}
            style={{ background: 'none', border: 'none', padding: 2, cursor: 'pointer' }}
          >
            <Star filled={n <= value} size={30} accent={T.accent} />
          </button>
        ))}
      </div>
    </div>
  )
}

function AutoGrowTextarea({
  value, onChange, placeholder, T,
}: {
  value: string; onChange: (v: string) => void; placeholder: string; T: ReturnType<typeof useTheme>
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
      style={{
        width: '100%', background: 'none', border: 'none', outline: 'none',
        resize: 'none', overflow: 'hidden', display: 'block',
        fontFamily: T.sans, fontSize: 13, color: '#4A3528', lineHeight: 1.5,
      }}
    />
  )
}

function LogShowInner() {
  const router       = useRouter()
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const T = useTheme()
  const { user, loading: authLoading } = useAuth()

  const artistId    = searchParams.get('artistId') ?? ''
  const artistName  = searchParams.get('artistName') ?? 'Unknown artist'
  const stageParam  = searchParams.get('stage') ?? ''
  const dayParam    = searchParams.get('day') ?? ''

  const [stage, setStage] = useState(stageParam)
  const [day, setDay]     = useState(dayParam)

  // Shows can only be logged starting the calendar day they happen -
  // re-rating an already-logged show is exempt, since it can only exist if
  // the show already happened.
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
  const venueDate = [stage, day, setTime].filter(Boolean).join(' · ') || 'Venue & date unavailable'

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

  // Prefill from an existing log for this artist, if one exists.
  useEffect(() => {
    if (!artistId) { setLoadingExisting(false); return }
    if (authLoading) return
    if (!user) { router.push('/'); return }

    async function load(userId: string) {
      const loadStart = Date.now()
      const { data } = await timeQuery('log-show:logged_shows', supabase
        .from('logged_shows')
        .select('id, stage, day, performance_rating, venue_rating, crowd_rating, review, tags, photo_url, media_urls')
        .eq('user_id', userId)
        .eq('artist_id', artistId)
        .maybeSingle())

      if (data) {
        setExistingId(data.id)
        if (data.stage) setStage(data.stage)
        if (data.day) setDay(data.day)
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
          const profileMap = new Map<string, { username: string; display_name: string }>()
          if (confirmedIds.length > 0) {
            const { data: profs } = await supabase.from('profiles').select('id, username, display_name').in('id', confirmedIds)
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
      const pending = getPendingLogForArtist(userId, artistId)
      if (pending) {
        setPerformance(pending.performance_rating)
        setVenue(pending.venue_rating)
        setCrowd(pending.crowd_rating)
        setThoughts(pending.review ?? '')
        if (pending.tags && pending.tags.length > 0) {
          setSelectedTags(pending.tags)
          setTagOptions(prev => Array.from(new Set([...prev, ...pending.tags!])))
        }
      }

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

  async function handleSave() {
    if (!canSave || saving) return
    if (!user) { router.push('/'); return }
    setSaving(true)
    const saveStart = Date.now()
    console.log('[perf] log-show:save start')

    const score = computeShowScore(performance, venue, crowd)

    // Queue the rating locally before anything else touches the network.
    // From this line on, the rating itself can't be lost to a dropped
    // connection — everything below is best-effort.
    enqueuePendingLog({
      user_id:            user.id,
      artist_id:          artistId,
      artist_name:        artistName,
      stage,
      day,
      performance_rating: performance,
      venue_rating:        venue,
      crowd_rating:        crowd,
      review:              thoughts.trim() || null,
      tags:                selectedTags.length > 0 ? selectedTags : null,
      photo_url:           null,
      media_urls:          null,
      emoji:               deriveLegacyEmoji(score),
    })

    // Best-effort media upload — if this fails, the rating above is already
    // safe; the show just gets logged without its photo/video for now.
    const mediaUrls: string[] = []
    for (const item of media) {
      if (item.file) {
        try {
          const ext = item.file.name.split('.').pop()
          const path = `${user.id}/${artistId}-${Date.now()}-${mediaUrls.length}.${ext}`
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
        user_id:            user.id,
        artist_id:          artistId,
        artist_name:        artistName,
        stage,
        day,
        performance_rating: performance,
        venue_rating:        venue,
        crowd_rating:        crowd,
        review:              thoughts.trim() || null,
        tags:                selectedTags.length > 0 ? selectedTags : null,
        photo_url:           mediaUrls[0],
        media_urls:          mediaUrls,
        emoji:               deriveLegacyEmoji(score),
      })
    }

    let isFirstShow = false
    let wasUnlocked = true
    let priorCount = 0
    if (!existingId) {
      try {
        const [{ count }, { data: profileBefore }] = await Promise.all([
          timeQuery('log-show:count-logged_shows', supabase.from('logged_shows').select('id', { count: 'exact', head: true }).eq('user_id', user.id)),
          timeQuery('log-show:profiles', supabase.from('profiles').select('battle_mode_unlocked').eq('id', user.id).single()),
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
          .from('logged_shows').select('id').eq('user_id', user.id).eq('artist_id', artistId).single())
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
      const { data: profileRow } = await timeQuery('log-show:profiles-username', supabase.from('profiles').select('username').eq('id', user.id).single())
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
      <div style={{
        minHeight: '100vh', background: T.bg,
        fontFamily: T.sans, color: '#4A3528',
        maxWidth: 430, margin: '0 auto',
      }}>
        <div style={{
          padding: '18px 24px', position: 'sticky', top: 0, zIndex: 10,
          background: T.bgRgba,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(74,53,40,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 700, color: '#4A3528', letterSpacing: '-0.3px' }}>Log show</div>
          <button onClick={() => router.back()} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div style={{
          padding: '60px 32px', textAlign: 'center',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
        }}>
          <div style={{ fontSize: 36, marginBottom: 16 }}>🔒</div>
          <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: '#4A3528', marginBottom: 10, lineHeight: 1.3 }}>
            Not showtime yet<span style={{ color: T.accent }}>.</span>
          </div>
          <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, marginBottom: 28 }}>
            You can log {artistName} once {day ? day.charAt(0).toUpperCase() + day.slice(1) : 'its day'}{unlockDate ? ` (${unlockDate})` : ''} arrives.
          </div>
          <button onClick={() => router.back()} style={{
            background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
            borderRadius: 5, padding: '12px 28px', cursor: 'pointer',
          }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#FAF3E2', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>Back</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      fontFamily: T.sans, color: '#4A3528',
      maxWidth: 430, margin: '0 auto',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '18px 24px', position: 'sticky', top: 0, zIndex: 10,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(74,53,40,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          fontFamily: T.serif, fontSize: 17, fontWeight: 700,
          color: '#4A3528', letterSpacing: '-0.3px',
        }}>{existingId ? 'Update log' : 'Log show'}</div>
        <button
          onClick={() => router.back()}
          aria-label="Close"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <div style={{ padding: '20px 24px 40px', display: 'flex', flexDirection: 'column', gap: 26 }}>

        {/* ── Show context ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, flexShrink: 0, borderRadius: 5,
            background: T.cardInner, border: '1px solid rgba(74,53,40,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: T.faint }}>
              {artistName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{
              fontFamily: T.serif, fontSize: 15, fontWeight: 700,
              color: '#4A3528', letterSpacing: '-0.2px',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{artistName}</div>
            <div style={{
              fontSize: 10, color: T.muted, letterSpacing: '0.06em',
              textTransform: 'uppercase', fontWeight: 600, marginTop: 2,
            }}>{venueDate}</div>
          </div>
        </div>

        {/* ── Star ratings ────────────────────────────────────────────────────── */}
        <div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <StarRow label="Performance" value={performance} onChange={setPerformance} T={T} />
            <StarRow label="Venue"       value={venue}       onChange={setVenue}       T={T} />
            <StarRow label="Crowd"       value={crowd}       onChange={setCrowd}       T={T} />
          </div>
          <div style={{ fontSize: 11, color: T.faint, marginTop: 12, fontStyle: 'italic' }}>
            All three ratings are required
          </div>
        </div>

        {/* ── Thoughts ────────────────────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 9, color: T.muted, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
          }}>Your thoughts</div>
          <div style={{
            background: T.card, borderRadius: 5,
            border: T.cardBorder, padding: '12px 14px',
          }}>
            <AutoGrowTextarea
              value={thoughts}
              onChange={setThoughts}
              placeholder="What made this set stand out?"
              T={T}
            />
          </div>
        </div>

        {/* ── Tags ────────────────────────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 9, color: T.muted, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
          }}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'nowrap', gap: 8, overflowX: 'auto' }}>
            {tagOptions.map(tag => {
              const active = selectedTags.includes(tag)
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  style={{
                    flexShrink: 0,
                    fontSize: 11, padding: '6px 12px', borderRadius: 20,
                    background: active ? T.accent : 'none',
                    color: active ? '#FAF3E2' : T.muted,
                    border: active ? `1.5px solid #4A3528` : `1.5px solid rgba(74,53,40,0.25)`,
                    fontFamily: T.sans, fontWeight: 600, cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >{tag}</button>
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
                style={{
                  flexShrink: 0,
                  fontSize: 11, padding: '6px 12px', borderRadius: 20,
                  border: `1.5px solid ${T.accent}`, outline: 'none',
                  background: 'none', color: '#4A3528',
                  fontFamily: T.sans, fontWeight: 600, width: 100,
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => setAddingTag(true)}
                style={{
                  flexShrink: 0,
                  fontSize: 11, padding: '6px 12px', borderRadius: 20,
                  background: 'none', color: T.muted,
                  border: '1.5px dashed rgba(74,53,40,0.3)',
                  fontFamily: T.sans, fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >+ custom</button>
            )}
          </div>
        </div>

        {/* ── Tag friends ─────────────────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 9, color: T.muted, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
          }}>Tag friends</div>
          <button
            type="button"
            onClick={() => setTagModalOpen(true)}
            style={{
              width: '100%', background: T.card, border: T.cardBorder, borderRadius: 5,
              padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', textAlign: 'left',
            }}
          >
            {taggedFriends.length > 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
                {taggedFriends.slice(0, 3).map((f, i) => (
                  <div key={f.userId ?? f.inviteContact ?? i} style={{
                    marginLeft: i === 0 ? 0 : -10, borderRadius: '50%',
                    border: `2px solid ${T.card}`, lineHeight: 0,
                  }}>
                    <Avatar name={f.displayName} size={26} />
                  </div>
                ))}
              </div>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            )}
            <span style={{ flex: 1, fontSize: 13, color: '#4A3528', fontFamily: T.sans, fontWeight: 600, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {taggedFriends.length === 0
                ? 'Tag friends who were there'
                : taggedFriends.length <= 3
                ? taggedFriends.map(f => f.displayName).join(', ')
                : `${taggedFriends.slice(0, 2).map(f => f.displayName).join(', ')} +${taggedFriends.length - 2} more`}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* ── Media ───────────────────────────────────────────────────────────── */}
        <div>
          <div style={{
            fontSize: 9, color: T.muted, letterSpacing: '0.12em',
            textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
          }}>Media <span style={{ color: T.faint, fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>· up to 1 video + 2 photos</span></div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {media.map((item, i) => (
              <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                {item.isVideo ? (
                  <video
                    src={item.url} muted playsInline
                    style={{ width: 64, height: 64, borderRadius: 5, objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <img
                    src={item.url} alt=""
                    style={{ width: 64, height: 64, borderRadius: 5, objectFit: 'cover', display: 'block' }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeMedia(i)}
                  aria-label="Remove"
                  style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 18, height: 18, borderRadius: '50%',
                    background: 'rgba(74,53,40,0.85)', border: 'none',
                    color: '#FAF3E2', fontSize: 11, lineHeight: 1,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >×</button>
              </div>
            ))}

            <input
              ref={fileInputRef}
              type="file" accept="image/*,video/*" multiple
              style={{ display: 'none' }}
              onChange={handleMediaSelect}
            />
            {!mediaFull && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  width: 64, height: 64, flexShrink: 0, borderRadius: 5,
                  background: 'none', border: '1.5px dashed rgba(74,53,40,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: T.faint, fontSize: 20,
                }}
              >+</button>
            )}
          </div>
        </div>

        {/* ── Save ────────────────────────────────────────────────────────────── */}
        <button
          onClick={handleSave}
          disabled={!canSave || saving}
          style={{
            width: '100%', background: T.accent,
            border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
            borderRadius: 5, padding: 16,
            cursor: canSave && !saving ? 'pointer' : 'not-allowed',
            opacity: canSave ? (saving ? 0.7 : 1) : 0.45,
          }}
        >
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#FAF3E2',
            letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans,
          }}>{saving ? 'Saving...' : 'Save log'}</span>
        </button>
      </div>

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
