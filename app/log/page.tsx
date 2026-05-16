'use client'

import { useState, Suspense, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFestival, getArtistsByDay, LOCAL_STORAGE_KEY, type Festival, type FestivalArtist } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { VideoPlayer } from '@/components/VideoPlayer'
import { useTheme } from '@/components/FestivalThemeProvider'

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

const REACTIONS = [
  { value: 'loved' as const, emoji: '👍', label: 'Loved it' },
  { value: 'ok'    as const, emoji: '🤷', label: 'It was ok' },
  { value: 'skip'  as const, emoji: '👎', label: 'Kinda Wack' },
]

const ELO_SEEDS = { loved: 1600, ok: 1500, skip: 1400 }

type Day = string

interface ExistingLog {
  emoji:     string
  photo_url: string | null
  review:    string | null
}

function LogInner() {
  const router       = useRouter()
  const supabase     = createClient()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const T = useTheme()

  const artistIdParam = searchParams.get('artistId')
  const isRerate      = searchParams.get('rerate') === '1'

  const [festival, setFestival]           = useState<Festival | null>(null)
  const [activeDay, setActiveDay]         = useState<Day>('friday')
  const [search, setSearch]               = useState('')
  const [selectedArtist, setSelectedArtist] = useState<FestivalArtist | null>(null)
  const [reaction, setReaction]           = useState<'loved' | 'ok' | 'skip' | null>(null)
  const [photo, setPhoto]                 = useState<File | null>(null)
  const [photoPreview, setPhotoPreview]   = useState<string | null>(null)
  const [review, setReview]               = useState('')
  const [saving, setSaving]               = useState(false)
  const [loggedMap, setLoggedMap]         = useState<Map<string, ExistingLog>>(new Map())
  const [loadingLogged, setLoadingLogged] = useState(true)

  useEffect(() => {
    const festivalId = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (!festivalId) { router.replace('/select-festival'); return }
    const f = getFestival(festivalId)
    if (f) {
      setFestival(f)
      setActiveDay(f.days[0])
      if (artistIdParam) {
        const found = f.artists.find(a => a.id === artistIdParam)
        if (found) setSelectedArtist(found)
      }
    }
  }, [])

  useEffect(() => {
    async function fetchLogged() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      const { data } = await supabase
        .from('logged_shows')
        .select('artist_id, emoji, photo_url, review')
        .eq('user_id', user.id)

      if (data) {
        const map = new Map<string, ExistingLog>()
        data.forEach(r => map.set(r.artist_id, { emoji: r.emoji, photo_url: r.photo_url, review: r.review }))
        setLoggedMap(map)

        if (isRerate && artistIdParam) {
          const existing = map.get(artistIdParam)
          if (existing) {
            setReaction(existing.emoji as 'loved' | 'ok' | 'skip')
            if (existing.photo_url) setPhotoPreview(existing.photo_url)
            if (existing.review) setReview(existing.review)
          }
        }
      }
      setLoadingLogged(false)
    }
    fetchLogged()
  }, [])

  const artist       = selectedArtist
  const loggedIds    = new Set(loggedMap.keys())
  const festivalArtists = festival?.artists ?? []

  const allArtists = (festival == null ? [] : search
    ? festivalArtists.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : getArtistsByDay(festival, activeDay)
  ).filter(a => isRerate ? loggedIds.has(a.id) : !loggedIds.has(a.id))

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('video/')) {
      const duration = await getVideoDuration(file)
      if (duration > 20) { alert('Video must be 20 seconds or less.'); e.target.value = ''; return }
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleLog() {
    if (!reaction || !artist) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/'); return }

    const initialElo = ELO_SEEDS[reaction]
    let photoUrl: string | null = loggedMap.get(artist.id)?.photo_url ?? null

    if (photo) {
      const ext = photo.name.split('.').pop()
      const path = `${user.id}/${artist.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('show-photos')
        .upload(path, photo, { upsert: true })

      if (uploadError) {
        alert('Photo upload error: ' + uploadError.message)
      } else {
        const { data: urlData } = supabase.storage.from('show-photos').getPublicUrl(path)
        photoUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('logged_shows').upsert({
      user_id:     user.id,
      artist_id:   artist.id,
      artist_name: artist.name,
      stage:       artist.stage,
      day:         artist.day,
      emoji:       reaction,
      elo:         initialElo,
      photo_url:   photoUrl,
      review:      review.trim() || null,
    }, { onConflict: 'user_id,artist_id' })

    if (error) { alert('Error saving: ' + error.message); setSaving(false); return }

    setSaving(false)
    router.push(`/battle?newArtistId=${artist.id}`)
  }

  // ── Artist picker ──────────────────────────────────────────────────────────
  if (!artist) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg,
        fontFamily: T.sans, color: '#4A3528',
        maxWidth: 430, margin: '0 auto',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '18px 24px 14px',
          position: 'sticky', top: 0,
          background: T.bgRgba,
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid rgba(74,53,40,0.12)', zIndex: 10,
        }}>
          <button onClick={() => router.push('/feed')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{
            fontFamily: T.serif, fontSize: 15, fontWeight: 700,
            color: '#4A3528', letterSpacing: '-0.3px',
          }}>
            {isRerate ? 'Re-rate a Show' : 'Log a Show'}
          </span>
          <div style={{ width: 18 }} />
        </div>

        <div style={{ padding: '16px 24px 100px' }}>
          {/* Search */}
          <div style={{
            background: T.card, borderRadius: 5,
            border: T.cardBorder,
            padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search artists..."
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#4A3528', fontSize: 14, fontFamily: T.sans, width: '100%',
              }}
            />
          </div>

          {/* Day tabs */}
          {!search && festival && (
            <div style={{
              display: 'flex',
              border: '2px solid #4A3528',
              borderRadius: 5, overflow: 'hidden',
              marginBottom: 16,
            }}>
              {festival.days.map((day, idx) => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  style={{
                    flex: 1,
                    background: activeDay === day ? '#4A3528' : T.card,
                    border: 'none',
                    borderLeft: idx > 0 ? '2px solid #4A3528' : 'none',
                    cursor: 'pointer',
                    padding: '8px 4px',
                  }}
                >
                  <div style={{
                    fontSize: 9, fontWeight: 700,
                    color: activeDay === day ? '#FAF3E2' : T.muted,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    fontFamily: T.sans, lineHeight: 1.4,
                  }}>
                    {[day.slice(0, 3).toUpperCase(), festival.dayDates[day]].map((w, i) => (
                      <span key={i} style={{ display: 'block' }}>{w}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          )}

          {loadingLogged ? (
            <div style={{
              textAlign: 'center', padding: 40,
              fontSize: 11, color: T.faint, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontWeight: 600,
            }}>Loading...</div>
          ) : allArtists.length === 0 ? (
            <div style={{
              background: T.card, borderRadius: 5,
              border: T.cardBorder, boxShadow: T.cardShadow,
              padding: 32, textAlign: 'center',
            }}>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6 }}>
                {search
                  ? 'No artists match your search'
                  : isRerate
                  ? 'No rated shows on this day yet'
                  : "You've reviewed everyone on this day!"}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {allArtists.map((a, i) => {
                const existing      = loggedMap.get(a.id)
                const reactionEmoji = existing?.emoji === 'loved' ? '👍'
                  : existing?.emoji === 'ok' ? '🤷'
                  : existing?.emoji === 'skip' ? '👎'
                  : null
                return (
                  <button
                    key={a.id}
                    onClick={() => {
                      setSelectedArtist(a)
                      if (existing) {
                        setReaction(existing.emoji as 'loved' | 'ok' | 'skip')
                        if (existing.photo_url) setPhotoPreview(existing.photo_url)
                      }
                    }}
                    style={{
                      background: i % 2 === 0 ? T.card : T.cardAlt,
                      border: T.cardBorder,
                      borderRadius: i === 0 ? '5px 5px 3px 3px'
                        : i === allArtists.length - 1 ? '3px 3px 5px 5px' : 3,
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', width: '100%', textAlign: 'left',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: T.serif, fontSize: 14, fontWeight: 700,
                        color: '#4A3528', letterSpacing: '-0.3px', marginBottom: 2,
                      }}>{a.name}</div>
                      <div style={{
                        fontSize: 9, color: T.muted, letterSpacing: '0.06em',
                        textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600,
                      }}>{a.stage}</div>
                    </div>
                    {reactionEmoji && <span style={{ fontSize: 16 }}>{reactionEmoji}</span>}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Reaction + photo view ──────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      fontFamily: T.sans, color: '#4A3528',
      maxWidth: 430, margin: '0 auto',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '18px 24px',
        borderBottom: '1px solid rgba(74,53,40,0.1)',
      }}>
        <button onClick={() => setSelectedArtist(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        {T.logoUrl ? (
          <img src={T.logoUrl} alt="Festival" style={{ height: 18, objectFit: 'contain', filter: T.logoFilter }} />
        ) : (
          <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: '#4A3528', letterSpacing: '-0.3px' }}>
            Gigl<span style={{ color: T.accent }}>/</span>
          </span>
        )}
        <div style={{ width: 18 }} />
      </div>

      <div style={{ padding: '20px 24px 40px' }}>
        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
        }}>{isRerate ? 'Re-rate' : 'Log a Show'}</div>

        <div style={{
          fontFamily: T.serif, fontSize: 34, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 6, color: '#4A3528',
        }}>
          How was<br />
          <span>{artist.name}</span><span style={{ color: T.accent }}>?</span>
        </div>

        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 36, fontWeight: 600,
        }}>
          {artist.stage} · {festival?.dayDates[artist.day] ?? artist.day}
        </div>

        {/* Reaction grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 36 }}>
          {REACTIONS.map(r => (
            <button key={r.value} onClick={() => setReaction(r.value)} style={{
              background: reaction === r.value ? T.accentDim : T.card,
              border: reaction === r.value ? `1.5px solid ${T.accent}` : T.cardBorder,
              boxShadow: reaction === r.value ? T.cardShadow : 'none',
              borderRadius: 5, padding: '20px 12px',
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s ease',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{r.emoji}</div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: reaction === r.value ? T.accent : T.muted,
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: T.sans,
              }}>{r.label}</div>
            </button>
          ))}
        </div>

        {/* Photo / video */}
        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 10, fontWeight: 600,
        }}>Add a photo <span style={{ color: T.faint }}>(optional)</span></div>

        <input ref={fileInputRef} type="file" accept="image/*,video/*"
          onChange={handleMediaChange} style={{ display: 'none' }} />

        {photoPreview ? (
          <div style={{ position: 'relative', marginBottom: 28 }}>
            {photo?.type.startsWith('video/') ? (
              <VideoPlayer src={photoPreview} style={{ borderRadius: 5, maxHeight: 220, objectFit: 'cover' }} />
            ) : (
              <img src={photoPreview} alt="Preview"
                style={{ width: '100%', borderRadius: 5, maxHeight: 220, objectFit: 'cover', display: 'block' }} />
            )}
            <button
              onClick={() => { setPhoto(null); setPhotoPreview(null) }}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,0.55)', border: 'none',
                borderRadius: '50%', width: 28, height: 28,
                color: '#FAF3E2', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', background: T.card,
              border: '1.5px dashed rgba(74,53,40,0.25)',
              borderRadius: 5, padding: '20px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, cursor: 'pointer', marginBottom: 28,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{
              fontSize: 12, color: T.faint, letterSpacing: '0.06em',
              textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600,
            }}>Photo or video (≤20s)</span>
          </button>
        )}

        {/* Review */}
        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 10, fontWeight: 600,
        }}>Your thoughts <span style={{ color: T.faint }}>(optional)</span></div>
        <textarea
          value={review}
          onChange={e => setReview(e.target.value)}
          maxLength={280}
          placeholder="What made this set special..."
          rows={3}
          style={{
            width: '100%', background: T.card,
            border: T.cardBorder,
            borderRadius: 5, padding: '12px 14px',
            color: '#4A3528', fontSize: 13,
            fontFamily: T.sans, resize: 'none', outline: 'none',
            boxSizing: 'border-box', marginBottom: 28,
          }}
        />

        <div style={{ height: 2, background: T.accent, borderRadius: 1, width: '60%', marginBottom: 28 }} />

        <button onClick={handleLog} disabled={!reaction || saving} style={{
          width: '100%',
          background: reaction ? T.accent : T.cardInner,
          border: reaction ? '1.5px solid #4A3528' : '1px solid rgba(74,53,40,0.15)',
          boxShadow: reaction ? T.cardShadow : 'none',
          borderRadius: 5, padding: 14,
          textAlign: 'center',
          cursor: reaction ? 'pointer' : 'not-allowed',
          transition: 'all 0.2s ease',
        }}>
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: reaction ? '#FAF3E2' : T.muted,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans,
          }}>{saving ? 'Saving...' : isRerate ? 'Update rating' : 'Log this show'}</span>
        </button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => setSelectedArtist(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: T.faint, letterSpacing: '0.06em',
            textTransform: 'uppercase', fontFamily: T.sans,
          }}>Cancel</button>
        </div>
      </div>
    </div>
  )
}

export default function LogShowPage() {
  return (
    <Suspense fallback={null}>
      <LogInner />
    </Suspense>
  )
}
