'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { showScore } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { StarDisplay } from '@/components/StarDisplay'
import { MediaGrid } from '@/components/MediaGrid'
import { SmsScoringSection } from '@/components/SmsScoringSection'
import { BattleRecordBadge } from '@/components/BattleRecordBadge'
import { VideoPlayer } from '@/components/VideoPlayer'
import { getFestival, LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { useTheme } from '@/components/FestivalThemeProvider'
import { useAuth } from '@/components/AuthProvider'

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
  stage:               string
  day:                 string
  performance_rating:  number | null
  venue_rating:        number | null
  vibe_rating:         number | null
  review:              string | null
  tags:                string[] | null
  photo_url:           string | null
  media_urls:          string[] | null
}

interface Profile {
  username:            string
  display_name:        string
  phone_number:        string | null
  phone_verified:      boolean
  battle_mode_unlocked: boolean
}

export default function ProfilePage() {
  const router = useRouter()
  const T = useTheme()
  const { user, loading: authLoading } = useAuth()

  const [festivalLabel, setFestivalLabel]   = useState('Festival Season 2026')
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const id = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (id) {
      const f = getFestival(id)
      if (f) setFestivalLabel(`${f.emoji} ${f.shortName} ${f.dates.slice(-4)}`)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push('/'); return }

    async function load(userId: string) {
      const [{ data: prof }, { data: showData }] = await Promise.all([
        supabase.from('profiles').select('username, display_name, phone_number, phone_verified, battle_mode_unlocked').eq('id', userId).single(),
        supabase.from('logged_shows').select('*').eq('user_id', userId),
      ])
      setProfile(prof)
      setShows((showData || []).slice().sort((a, b) => showScore(b) - showScore(a)))

      // This viewer's own battle record per artist - never another user's,
      // and never blended into performance_rating/venue_rating/vibe_rating.
      const { data: battleRows } = await supabase
        .from('battle_records')
        .select('artist_id, wins, losses')
        .eq('user_id', userId)
      const map: Record<string, { wins: number; losses: number }> = {}
      battleRows?.forEach(r => { map[r.artist_id] = { wins: r.wins, losses: r.losses } })
      setBattleMap(map)

      setLoading(false)
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

  const ratedShows = shows.filter(s => s.performance_rating != null && s.venue_rating != null && s.vibe_rating != null)
  const avgScore = ratedShows.length > 0
    ? ratedShows.reduce((acc, s) => acc + showScore(s), 0) / ratedShows.length
    : 0

  if (loading) return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: `2px solid ${T.accent}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans, color: '#4A3528', maxWidth: 430, margin: '0 auto' }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '18px 24px 14px',
        position: 'sticky', top: 0, zIndex: 10,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(74,53,40,0.12)',
      }}>
        {T.logoUrl ? (
          <img src={T.logoUrl} alt="Festival" style={{ height: 22, objectFit: 'contain', filter: T.logoFilter }} />
        ) : (
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: '#4A3528', letterSpacing: '-0.5px' }}>
            Gigl<span style={{ color: T.accent }}>/</span>
          </div>
        )}
      </div>

      {/* ── Profile header ───────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 4,
        }}>{festivalLabel}</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
          <div style={{
            fontFamily: T.serif, fontSize: 28, fontWeight: 700,
            lineHeight: 1.1, letterSpacing: '-1px', color: '#4A3528',
          }}>
            {profile?.display_name}&apos;s<br />
            <span>rankings</span><span style={{ color: T.accent }}>.</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, paddingTop: 6, flexShrink: 0 }}>
            <button onClick={() => router.push('/select-festival')} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: T.accent, fontSize: 11, fontFamily: T.sans, letterSpacing: '0.06em', fontWeight: 600,
            }}>switch</button>
            <span style={{ fontSize: 10, color: T.faint }}>·</span>
            <button onClick={signOut} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              fontSize: 11, color: T.muted, fontFamily: T.sans, letterSpacing: '0.06em',
            }}>sign out</button>
          </div>
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 16 }}>@{profile?.username}</div>
      </div>

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: '1px solid rgba(74,53,40,0.1)',
        borderBottom: '1px solid rgba(74,53,40,0.1)',
        background: T.bg,
      }}>
        <div style={{ padding: '14px 0', textAlign: 'center', borderRight: '1px solid rgba(74,53,40,0.1)' }}>
          <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: '#4A3528' }}>{shows.length}</div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginTop: 3, fontWeight: 600 }}>Sets logged</div>
        </div>
        <div style={{ padding: '14px 0', textAlign: 'center', borderRight: '1px solid rgba(74,53,40,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {ratedShows.length > 0
            ? <StarDisplay score={avgScore} size={20} accent={T.accent} />
            : <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.accent }}>—</div>}
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginTop: 5, fontWeight: 600 }}>Avg score</div>
        </div>
        <div style={{ padding: '14px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: '#4A3528' }}>2026</div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginTop: 3, fontWeight: 600 }}>Festival</div>
        </div>
      </div>

      {/* ── Share + SMS Scoring — same row to save vertical space ───────────── */}
      <div style={{ padding: '16px 24px 8px', display: 'flex', gap: 10, alignItems: 'stretch' }}>
        <button onClick={copyLink} style={{
          flex: 1, minWidth: 0,
          background: copied ? T.accentDim : T.card,
          border: T.cardBorder,
          boxShadow: T.cardShadow,
          borderRadius: 5,
          padding: '12px 14px',
          display: 'flex', alignItems: 'center', gap: 8,
          cursor: 'pointer', fontFamily: T.sans,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: T.accentDim,
            border: `1px solid ${T.accentBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
              <path d="M8 1h5v5M13 1L6 8M5.5 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.5"
                stroke={T.accent} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#4A3528', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {copied ? 'Link copied!' : 'Share rankings'}
            </div>
          </div>
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <SmsScoringSection
            phoneNumber={profile?.phone_number ?? null}
            phoneVerified={profile?.phone_verified ?? false}
            onChange={(phoneNumber, phoneVerified) => {
              setProfile(prev => prev ? { ...prev, phone_number: phoneNumber, phone_verified: phoneVerified } : prev)
            }}
          />
        </div>
      </div>

      {/* ── Rankings list ────────────────────────────────────────────────────── */}
      <div style={{ padding: '8px 24px 24px' }}>
        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 12, fontWeight: 600,
        }}>My rankings</div>

        {shows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 13, color: T.faint, marginBottom: 16 }}>No sets logged yet</div>
            <button onClick={() => router.push('/log')} style={{
              background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
              borderRadius: 5, padding: '12px 24px',
              color: '#FAF3E2', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: T.sans,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>Log your first set →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shows.map((show, i) => {
              const score     = showScore(show)
              const hasScore  = show.performance_rating != null && show.venue_rating != null && show.vibe_rating != null
              const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
              const isEditing = editingId === show.id
              const isTop     = i === 0
              return (
                <div key={show.id} style={{
                  background: T.card, borderRadius: 5,
                  border: T.cardBorder,
                  boxShadow: isTop ? T.cardShadow : 'none',
                  overflow: 'hidden',
                }}>
                  <MediaGrid urls={resolveMediaUrls(show).map(u => resolvePhotoUrl(u)!)} maxHeight={220} />

                  {/* Info row */}
                  <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                        <span style={{
                          fontFamily: T.serif, fontSize: 15, fontWeight: 700,
                          color: '#4A3528', letterSpacing: '-0.3px',
                          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                          minWidth: 0,
                        }}>{show.artist_name}</span>
                        {hasScore && <StarDisplay score={score} size={18} accent={T.accent} />}
                        {battleMap[show.artist_id] && (
                          <BattleRecordBadge
                            wins={battleMap[show.artist_id].wins}
                            losses={battleMap[show.artist_id].losses}
                            unlocked={!!profile?.battle_mode_unlocked}
                            context="personal"
                            artistName={show.artist_name}
                          />
                        )}
                      </div>
                      <div style={{
                        fontSize: 10, color: T.muted, letterSpacing: '0.06em',
                        textTransform: 'uppercase', marginTop: 2, fontWeight: 600,
                      }}>{show.stage} · {show.day}</div>
                      <div style={{ fontSize: 10, color: T.accent, marginTop: 2, fontWeight: 600 }}>{rankLabel}</div>
                    </div>
                    <button onClick={() => isEditing ? setEditingId(null) : startEdit(show)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, opacity: isEditing ? 1 : 0.35 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke={isEditing ? T.accent : '#4A3528'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Edit form */}
                  {isEditing ? (
                    <div style={{ padding: '0 16px 16px' }}>
                      <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
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
                        <div style={{ position: 'relative', marginBottom: 12 }}>
                          {(editPhotoFile?.type.startsWith('video/') || isVideoUrl(editPhotoPreview)) ? (
                            <VideoPlayer src={editPhotoPreview} style={{ borderRadius: 5, maxHeight: 180, objectFit: 'cover' }} />
                          ) : (
                            <img src={editPhotoPreview} alt=""
                              style={{ width: '100%', borderRadius: 5, maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                          )}
                          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                            <button onClick={() => fileInputRef.current?.click()} style={{
                              background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: 20,
                              padding: '4px 10px', color: '#FAF3E2', fontSize: 10, cursor: 'pointer',
                              fontFamily: T.sans, letterSpacing: '0.04em',
                            }}>Replace</button>
                            <button onClick={() => { setEditPhotoPreview(null); setEditPhotoFile(null) }} style={{
                              background: 'rgba(0,0,0,0.55)', border: 'none', borderRadius: '50%',
                              width: 26, height: 26, color: '#FAF3E2', fontSize: 15, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>×</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} style={{
                          width: '100%', background: T.cardInner,
                          border: '1.5px dashed rgba(74,53,40,0.25)',
                          borderRadius: 5, padding: '14px 16px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 8, cursor: 'pointer', marginBottom: 12,
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <span style={{ fontSize: 11, color: T.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>Add a photo / video</span>
                        </button>
                      )}
                      <textarea
                        value={editReview}
                        onChange={e => setEditReview(e.target.value)}
                        maxLength={280}
                        placeholder="Add a review..."
                        rows={3}
                        style={{
                          width: '100%', background: T.cardInner,
                          border: T.cardBorder,
                          borderRadius: 5, padding: '10px 12px',
                          color: '#4A3528', fontSize: 13,
                          fontFamily: T.sans, resize: 'none', outline: 'none',
                          boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
                        {TAGS.map(tag => {
                          const active = editTags.includes(tag)
                          return (
                            <button key={tag} onClick={() => setEditTags(prev =>
                              active ? prev.filter(t => t !== tag) : [...prev, tag]
                            )} style={{
                              fontSize: 10, padding: '4px 10px', borderRadius: 20, cursor: 'pointer',
                              background: active ? T.accentDim : 'rgba(74,53,40,0.05)',
                              color: active ? T.accent : T.muted,
                              border: active ? `1.5px solid ${T.accentBorder}` : '1px solid rgba(74,53,40,0.15)',
                              fontFamily: T.sans, fontWeight: active ? 600 : 400,
                            }}>{tag}</button>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditingId(null)} style={{
                          flex: 1, padding: '10px 0', borderRadius: 5,
                          background: 'rgba(74,53,40,0.05)', border: '1px solid rgba(74,53,40,0.15)',
                          color: T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans,
                        }}>Cancel</button>
                        <button onClick={() => saveEdit(show.id, show.artist_id)} disabled={editSaving} style={{
                          flex: 2, padding: '10px 0', borderRadius: 5,
                          background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
                          color: '#FAF3E2', fontSize: 11, fontWeight: 700,
                          cursor: editSaving ? 'default' : 'pointer', opacity: editSaving ? 0.7 : 1,
                          fontFamily: T.sans, letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>{editSaving ? 'Saving...' : 'Save'}</button>
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => {
                          const params = new URLSearchParams({
                            artistId:   show.artist_id,
                            artistName: show.artist_name,
                            stage:      show.stage,
                            day:        show.day,
                          })
                          router.push(`/log-show?${params.toString()}`)
                        }} style={{
                          flex: 1, padding: '10px 0', borderRadius: 5,
                          background: 'rgba(74,53,40,0.05)', border: '1px solid rgba(74,53,40,0.15)',
                          color: T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans,
                        }}>↺ Update ratings</button>
                        {confirmDeleteId === show.id ? (
                          <>
                            <button onClick={() => setConfirmDeleteId(null)} style={{
                              flex: 1, padding: '10px 0', borderRadius: 5,
                              background: 'rgba(74,53,40,0.05)', border: '1px solid rgba(74,53,40,0.15)',
                              color: T.muted, fontSize: 11, cursor: 'pointer', fontFamily: T.sans,
                            }}>Keep it</button>
                            <button onClick={() => deleteShow(show.id)} style={{
                              flex: 1, padding: '10px 0', borderRadius: 5,
                              background: 'rgba(160,40,40,0.1)', border: '1px solid rgba(160,40,40,0.3)',
                              color: '#B03030', fontSize: 11, fontWeight: 700,
                              cursor: 'pointer', fontFamily: T.sans,
                            }}>Delete</button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(show.id)} style={{
                            flex: 1, padding: '10px 0', borderRadius: 5,
                            background: 'rgba(74,53,40,0.05)', border: '1px solid rgba(74,53,40,0.15)',
                            color: 'rgba(160,40,40,0.55)', fontSize: 11, cursor: 'pointer', fontFamily: T.sans,
                          }}>Remove rating</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {show.review && (
                        <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'rgba(74,53,40,0.65)', fontStyle: 'italic', lineHeight: 1.55 }}>
                          &ldquo;{show.review}&rdquo;
                        </div>
                      )}
                      {show.tags && show.tags.length > 0 && (
                        <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {show.tags.map(tag => (
                            <span key={tag} style={{
                              fontSize: 10, padding: '3px 10px', borderRadius: 20,
                              background: T.accentDim, color: T.accent,
                              border: `1.5px solid ${T.accentBorder}`, fontFamily: T.sans, fontWeight: 600,
                            }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Legal footer ─────────────────────────────────────────────────────── */}
      <div style={{
        padding: '16px 24px 120px', textAlign: 'center',
        display: 'flex', justifyContent: 'center', gap: 14,
      }}>
        <button onClick={() => router.push('/privacy')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: 11, color: T.faint, fontFamily: T.sans, textDecoration: 'underline', textUnderlineOffset: 3,
        }}>Privacy Policy</button>
        <button onClick={() => router.push('/terms')} style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: 11, color: T.faint, fontFamily: T.sans, textDecoration: 'underline', textUnderlineOffset: 3,
        }}>Terms of Service</button>
      </div>

      {/* ── Bottom nav ───────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1.5px solid rgba(74,53,40,0.15)',
        padding: '12px 32px calc(4px + env(safe-area-inset-bottom))',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <button onClick={() => router.push('/feed')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 9, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>Home</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div onClick={() => router.push('/log')} style={{
            width: 42, height: 42, background: T.accent, borderRadius: '50%',
            border: '1.5px solid #4A3528', boxShadow: '2px 2px 0 #4A3528',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -18, cursor: 'pointer',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: 9, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>Log</span>
        </div>

        <button onClick={() => router.push('/profile')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={T.accent} stroke="none">
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <span style={{ fontSize: 9, color: T.accent, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700 }}>You</span>
        </button>
      </div>
    </div>
  )
}
