'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Camera, Check, ImagePlus, Loader2, Pencil, Share2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { showScore } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { MediaGrid } from '@/components/MediaGrid'
import { BattleRecordBadge } from '@/components/BattleRecordBadge'
import { VideoPlayer } from '@/components/VideoPlayer'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { useAuth } from '@/components/AuthProvider'
import { AppHeader } from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import { Logo } from '@/components/Logo'
import {
  ArtistPhoto, Card, Chip, DateTag, EmptyState, ErrorNote, Label, PersonPhoto, Place, PullQuote, Stars, Stat, placeOf,
  btnPrimary, btnQuiet, iconBtn, inputBox,
} from '@/components/ui'
import { timeQuery, timeMark } from '@/lib/queryTiming'
import { uploadAvatar, removeAvatar } from '@/lib/avatar'
import { updateMyProfile } from '@/lib/useMyProfile'
import { useArtistImages } from '@/lib/useArtistImages'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'
const TAGS = ['transcendent', 'intimate', 'chaotic', 'nostalgic', 'epic', 'euphoric', 'sleeper hit', 'top 3', 'made me cry', 'peak performance']

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

function resolvePhotoUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${SUPABASE_STORAGE}/${url}`
}

interface Show {
  id:                  string
  artist_id:           string
  artist_name:         string
  stage:               string | null
  day:                 string | null
  venue:               string | null
  show_date:           string | null
  performance_rating:  number | null
  venue_rating:        number | null
  crowd_rating:        number | null
  review:              string | null
  tags:                string[] | null
  photo_url:           string | null
  media_urls:          string[] | null
}

interface Profile {
  username:            string
  display_name:        string
  avatar_url:          string | null
  battle_mode_unlocked: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const supabase = createClient()
  const { user, loading: authLoading } = useAuth()

  const [profile, setProfile]               = useState<Profile | null>(null)
  const [shows, setShows]                   = useState<Show[]>([])
  const [loading, setLoading]               = useState(true)
  const [copied, setCopied]                 = useState(false)
  const [editingId, setEditingId]           = useState<string | null>(null)
  const [editReview, setEditReview]         = useState('')
  const [editTags, setEditTags]             = useState<string[]>([])
  const [editSaving, setEditSaving]         = useState(false)
  const [editPhotoFile, setEditPhotoFile]   = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [battleMap, setBattleMap] = useState<Record<string, { wins: number; losses: number }>>({})
  const [followerCount, setFollowerCount]   = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [avatarBusy, setAvatarBusy]         = useState(false)
  const [avatarError, setAvatarError]       = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/auth'); return }

    async function load(userId: string) {
      const loadStart = Date.now()
      console.log(`[perf] profile:load start userId=${userId}`)

      const [{ data: prof }, { data: showData }] = await Promise.all([
        timeQuery('profile:profiles', supabase.from('profiles').select('username, display_name, avatar_url, battle_mode_unlocked').eq('id', userId).single()),
        timeQuery('profile:logged_shows', supabase.from('logged_shows').select('*').eq('user_id', userId)),
      ])
      setProfile(prof)
      setShows((showData || []).slice().sort((a, b) => showScore(b) - showScore(a)))

      // This viewer's own battle record per artist - never another user's,
      // and never blended into performance_rating/venue_rating/crowd_rating.
      const { data: battleRows } = await timeQuery('profile:battle_records', supabase
        .from('battle_records')
        .select('artist_id, wins, losses')
        .eq('user_id', userId))
      const map: Record<string, { wins: number; losses: number }> = {}
      battleRows?.forEach(r => { map[r.artist_id] = { wins: r.wins, losses: r.losses } })
      setBattleMap(map)

      const [{ count: followers }, { count: following }] = await Promise.all([
        timeQuery('profile:followers', supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', userId)),
        timeQuery('profile:following', supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', userId)),
      ])
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)

      setLoading(false)
      timeMark(`profile:load total (${(showData || []).length} shows)`, loadStart)
    }
    load(user.id)
  }, [authLoading, user, router])

  async function copyLink() {
    if (!profile) return
    const url = `${window.location.origin}/u/${profile.username}`

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gigl', text: 'Check out my rankings on Gigl', url })
      } catch {
        // user backed out of the native share sheet — nothing to do
      }
      return
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function signOut() {
    await supabase.auth.signOut()
    localStorage.removeItem(LOCAL_STORAGE_KEY)
    router.push('/')
  }

  function startEdit(show: Show) {
    setEditingId(show.id)
    setEditReview(show.review || '')
    setEditTags(show.tags || [])
    setEditPhotoFile(null)
    setEditPhotoPreview(resolvePhotoUrl(show.photo_url))
    setConfirmDeleteId(null)
  }

  async function saveEdit(showId: string, artistId: string) {
    setEditSaving(true)
    const review = editReview.trim() || null
    const tags   = editTags.length > 0 ? editTags : null
    let photoUrl: string | null | undefined = undefined

    if (editPhotoFile) {
      if (user) {
        const ext  = editPhotoFile.name.split('.').pop()
        const path = `${user.id}/${artistId}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('show-photos').upload(path, editPhotoFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('show-photos').getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }
    } else if (editPhotoPreview === null) {
      photoUrl = null
    }

    const update: Record<string, unknown> = { review, tags }
    if (photoUrl !== undefined) {
      // This editor only exposes a single photo/video slot, so replacing it
      // here replaces the whole media_urls array too — attaching more than
      // one item happens on the full log screen instead.
      update.photo_url  = photoUrl
      update.media_urls = photoUrl ? [photoUrl] : null
    }

    const { error } = await supabase.from('logged_shows').update(update).eq('id', showId)
    if (!error) {
      setShows(prev => prev.map(s =>
        s.id === showId
          ? { ...s, review, tags, ...(photoUrl !== undefined ? { photo_url: photoUrl as string | null, media_urls: photoUrl ? [photoUrl] : null } : {}) }
          : s
      ))
      setEditingId(null)
      setEditPhotoFile(null)
    }
    setEditSaving(false)
  }

  async function deleteShow(showId: string) {
    const { error } = await supabase.from('logged_shows').delete().eq('id', showId)
    if (!error) {
      setShows(prev => prev.filter(s => s.id !== showId))
      setEditingId(null)
      setConfirmDeleteId(null)
    }
  }

  const ratedShows = shows.filter(s => s.performance_rating != null && s.venue_rating != null && s.crowd_rating != null)
  const avgScore = ratedShows.length > 0
    ? ratedShows.reduce((acc, s) => acc + showScore(s), 0) / ratedShows.length
    : 0

  async function changeAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !user || !profile) return
    setAvatarBusy(true)
    setAvatarError(null)
    try {
      const url = await uploadAvatar(supabase, user.id, file, profile.avatar_url)
      setProfile(p => p ? { ...p, avatar_url: url } : p)
      updateMyProfile(user.id, { avatar_url: url })
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Upload failed.')
    } finally {
      setAvatarBusy(false)
    }
  }

  async function clearAvatar() {
    if (!user || !profile) return
    setAvatarBusy(true)
    setAvatarError(null)
    try {
      await removeAvatar(supabase, user.id, profile.avatar_url)
      setProfile(p => p ? { ...p, avatar_url: null } : p)
      updateMyProfile(user.id, { avatar_url: null })
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : 'Removing your photo failed.')
    } finally {
      setAvatarBusy(false)
    }
  }

  const artistImage = useArtistImages(shows.map(s => s.artist_name))

  if (loading) return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="w-7 h-7 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )

  const name = profile?.display_name || profile?.username || ''

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      {/* Your own profile, so the header carries a share button rather than your photo. */}
      <AppHeader showProfile={false}>
        <Logo href="/feed" />
        <button
          type="button"
          onClick={copyLink}
          aria-label={copied ? 'Link copied' : 'Share my rankings with friends'}
          className={`${iconBtn} ${copied ? 'text-accent' : ''}`}
        >
          {copied ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Share2 className="w-4 h-4" strokeWidth={1.75} />}
        </button>
      </AppHeader>

      <div className="px-5 pt-4 space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarBusy}
              aria-label={profile?.avatar_url ? 'Change profile photo' : 'Add a profile photo'}
              className="relative flex-shrink-0"
            >
              <PersonPhoto name={name} src={profile?.avatar_url} className="w-16 h-16 text-2xl border-1.5 border-ink shadow-riso" />
              <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-accent text-cream border-1.5 border-ink flex items-center justify-center">
                {avatarBusy
                  ? <Loader2 className="w-3 h-3 animate-spin" strokeWidth={2.5} />
                  : <Camera className="w-3 h-3" strokeWidth={2.5} />}
              </span>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={changeAvatar} />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold tracking-tight leading-tight truncate">{profile?.display_name}</h1>
              <p className="text-xs text-ink-muted">@{profile?.username}</p>
              {profile?.avatar_url ? (
                <button type="button" onClick={clearAvatar} disabled={avatarBusy} className="mt-1 text-[11px] text-ink-faint underline underline-offset-[3px]">
                  Remove photo
                </button>
              ) : (
                <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={avatarBusy} className="mt-1 text-[11px] font-semibold text-accent">
                  + Add a photo
                </button>
              )}
            </div>
          </div>

          {avatarError && <ErrorNote>{avatarError}</ErrorNote>}

          {/* Two pairs - your own numbers, then your social graph - split by a heavier rule. */}
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
              <Link href={profile ? `/u/${profile.username}/followers` : '#'} className="flex-1 flex">
                <Stat value={followerCount} label="Followers" />
              </Link>
              <Link href={profile ? `/u/${profile.username}/following` : '#'} className="flex-1 flex border-l border-ink/10">
                <Stat value={followingCount} label="Following" />
              </Link>
            </div>
          </div>
        </Card>

        <section>
          <Label className="mb-2.5">My rankings</Label>

          {shows.length === 0 ? (
            <EmptyState>
              <p className="mb-4">No shows logged yet</p>
              <Link href="/select-festival" className={`${btnPrimary} px-6 py-3 text-xs`}>Log your first show →</Link>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-3">
              {shows.map((show, i) => {
                const score     = showScore(show)
                const hasScore  = show.performance_rating != null && show.venue_rating != null && show.crowd_rating != null
                const isEditing = editingId === show.id
                const mediaUrls = resolveMediaUrls(show).map(u => resolvePhotoUrl(u)!)
                const place     = placeOf(show)
                return (
                  <Card key={show.id} className="overflow-hidden">
                    {mediaUrls.length > 0 && !isEditing && (
                      <div className="border-b-1.5 border-ink">
                        <MediaGrid urls={mediaUrls} maxHeight={220} />
                      </div>
                    )}

                    <div className="p-3 flex items-center gap-3">
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
                        {battleMap[show.artist_id] && (
                          <div className="mt-1">
                            <BattleRecordBadge
                              wins={battleMap[show.artist_id].wins}
                              losses={battleMap[show.artist_id].losses}
                              unlocked={!!profile?.battle_mode_unlocked}
                              context="personal"
                              artistName={show.artist_name}
                            />
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => isEditing ? setEditingId(null) : startEdit(show)}
                        aria-label={isEditing ? 'Close editor' : 'Edit this log'}
                        className={`p-1.5 flex-shrink-0 ${isEditing ? 'text-accent' : 'text-ink-faint'}`}
                      >
                        <Pencil className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>

                    {isEditing ? (
                      <div className="px-3 pb-3 space-y-2.5">
                        <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden"
                          onChange={async e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            if (file.type.startsWith('video/')) {
                              const dur = await getVideoDuration(file)
                              if (dur > 20) { alert('Video must be 20 seconds or less.'); e.target.value = ''; return }
                            }
                            setEditPhotoFile(file)
                            setEditPhotoPreview(URL.createObjectURL(file))
                          }}
                        />
                        {editPhotoPreview ? (
                          <div className="relative rounded-card border-1.5 border-ink overflow-hidden">
                            {(editPhotoFile?.type.startsWith('video/') || isVideoUrl(editPhotoPreview)) ? (
                              <VideoPlayer src={editPhotoPreview} style={{ maxHeight: 180, objectFit: 'cover' }} />
                            ) : (
                              <img src={editPhotoPreview} alt="" className="block w-full max-h-[180px] object-cover" />
                            )}
                            <div className="absolute top-2 right-2 flex gap-1.5">
                              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-full bg-ink/80 px-2.5 py-1 text-[10px] font-semibold text-cream">
                                Replace
                              </button>
                              <button
                                type="button"
                                onClick={() => { setEditPhotoPreview(null); setEditPhotoFile(null) }}
                                aria-label="Remove photo"
                                className="w-6 h-6 rounded-full bg-ink/80 text-cream text-sm leading-none"
                              >×</button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full flex items-center justify-center gap-2 rounded-card border-1.5 border-dashed border-ink/25 bg-paper px-4 py-3.5 text-[11px] font-semibold uppercase tracking-label text-ink-faint"
                          >
                            <ImagePlus className="w-4 h-4" strokeWidth={1.75} /> Add a photo / video
                          </button>
                        )}
                        <textarea
                          value={editReview}
                          onChange={e => setEditReview(e.target.value)}
                          maxLength={280}
                          placeholder="Add a review..."
                          rows={3}
                          className={`${inputBox} block w-full resize-none px-3 py-2.5 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40`}
                        />
                        <div className="flex flex-wrap gap-1.5">
                          {TAGS.map(tag => {
                            const active = editTags.includes(tag)
                            return (
                              <button key={tag} type="button" onClick={() => setEditTags(prev =>
                                active ? prev.filter(t => t !== tag) : [...prev, tag]
                              )}>
                                <Chip active={active}>{tag}</Chip>
                              </button>
                            )
                          })}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => setEditingId(null)} className={`${btnQuiet} flex-1 py-2.5 text-[11px]`}>Cancel</button>
                          <button
                            type="button"
                            onClick={() => saveEdit(show.id, show.artist_id)}
                            disabled={editSaving}
                            className={`${btnPrimary} flex-[2] py-2.5 text-[11px]`}
                          >{editSaving ? 'Saving...' : 'Save'}</button>
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => {
                            const params = new URLSearchParams({
                              artistId:   show.artist_id,
                              artistName: show.artist_name,
                              ...(show.stage ? { stage: show.stage } : {}),
                              ...(show.day ? { day: show.day } : {}),
                              ...(show.venue ? { venue: show.venue } : {}),
                              ...(show.show_date ? { showDate: show.show_date } : {}),
                            })
                            router.push(`/log-show?${params.toString()}`)
                          }} className={`${btnQuiet} flex-1 py-2.5 text-[11px]`}>↺ Update ratings</button>
                          {confirmDeleteId === show.id ? (
                            <>
                              <button type="button" onClick={() => setConfirmDeleteId(null)} className={`${btnQuiet} flex-1 py-2.5 text-[11px]`}>Keep it</button>
                              <button
                                type="button"
                                onClick={() => deleteShow(show.id)}
                                className="flex-1 rounded-card border-1.5 border-[#B03030]/30 bg-[#B03030]/10 py-2.5 text-[11px] font-bold text-[#B03030]"
                              >Delete</button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(show.id)}
                              className="flex-1 rounded-card border-1.5 border-ink/15 bg-cream py-2.5 text-[11px] font-semibold text-[#B03030]/60"
                            >Remove rating</button>
                          )}
                        </div>
                      </div>
                    ) : (
                      (show.review || (show.tags && show.tags.length > 0)) && (
                        <div className="px-3 pb-3 space-y-2.5">
                          {show.review && <PullQuote>{show.review}</PullQuote>}
                          {show.tags && show.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {show.tags.map(tag => <Chip key={tag}>{tag}</Chip>)}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </section>

        <footer className="pt-2 pb-4 flex justify-center gap-4 text-[11px] text-ink-faint">
          <button type="button" onClick={signOut} className="underline underline-offset-[3px]">Sign out</button>
          <Link href="/privacy" className="underline underline-offset-[3px]">Privacy Policy</Link>
          <Link href="/terms" className="underline underline-offset-[3px]">Terms of Service</Link>
        </footer>
      </div>

      <BottomNav />
    </div>
  )
}
