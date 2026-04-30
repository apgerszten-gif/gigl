'use client'

import { useState, Suspense, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getFestival, getArtistsByDay, LOCAL_STORAGE_KEY, type Festival, type FestivalArtist } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { VideoPlayer } from '@/components/VideoPlayer'

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
  emoji: string
  photo_url: string | null
  review: string | null
}

function LogInner() {
  const router = useRouter()
  const supabase = createClient()
  const searchParams = useSearchParams()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const artistIdParam = searchParams.get('artistId')
  const isRerate = searchParams.get('rerate') === '1'

  const [festival, setFestival]             = useState<Festival | null>(null)
  const [activeDay, setActiveDay]           = useState<Day>('friday')
  const [search, setSearch]                 = useState('')
  const [selectedArtist, setSelectedArtist] = useState<FestivalArtist | null>(null)
  const [reaction, setReaction]             = useState<'loved' | 'ok' | 'skip' | null>(null)
  const [photo, setPhoto]                   = useState<File | null>(null)
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null)
  const [review, setReview]                 = useState('')
  const [saving, setSaving]                 = useState(false)
  // Maps artist_id → existing log data (emoji + photo_url)
  const [loggedMap, setLoggedMap]           = useState<Map<string, ExistingLog>>(new Map())
  const [loadingLogged, setLoadingLogged]   = useState(true)

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
      if (!user) { router.push('/auth'); return }

      const { data } = await supabase
        .from('logged_shows')
        .select('artist_id, emoji, photo_url, review')
        .eq('user_id', user.id)

      if (data) {
        const map = new Map<string, ExistingLog>()
        data.forEach(r => map.set(r.artist_id, { emoji: r.emoji, photo_url: r.photo_url, review: r.review }))
        setLoggedMap(map)

        // If arriving via re-rate deep link, pre-select artist and seed its existing reaction
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

  const artist = selectedArtist
  const loggedIds = new Set(loggedMap.keys())
  const festivalArtists = festival?.artists ?? []

  const allArtists = (search
    ? festivalArtists.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : getArtistsByDay(festival!, activeDay)
  ).filter(a => isRerate ? loggedIds.has(a.id) : !loggedIds.has(a.id))

  async function handleMediaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.type.startsWith('video/')) {
      const duration = await getVideoDuration(file)
      if (duration > 20) {
        alert('Video must be 20 seconds or less.')
        e.target.value = ''
        return
      }
    }
    setPhoto(file)
    setPhotoPreview(URL.createObjectURL(file))
  }

  async function handleLog() {
    if (!reaction || !artist) return
    setSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth'); return }

    const initialElo = ELO_SEEDS[reaction]
    let photoUrl: string | null = loggedMap.get(artist.id)?.photo_url ?? null

    // Only upload if user selected a new photo file
    if (photo) {
      const ext = photo.name.split('.').pop()
      const path = `${user.id}/${artist.id}-${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('show-photos')
        .upload(path, photo, { upsert: true })

      if (uploadError) {
        alert('Photo upload error: ' + uploadError.message)
      } else {
        const { data: urlData } = supabase.storage
          .from('show-photos')
          .getPublicUrl(path)
        photoUrl = urlData.publicUrl
      }
    }

    const { error } = await supabase.from('logged_shows').upsert({
      user_id:      user.id,
      artist_id:    artist.id,
      artist_name:  artist.name,
      stage:        artist.stage,
      day:          artist.day,
      emoji:        reaction,
      elo:          initialElo,
      photo_url:    photoUrl,
      review:       review.trim() || null,
    }, { onConflict: 'user_id,artist_id' })

    if (error) {
      alert('Error saving: ' + error.message)
      setSaving(false)
      return
    }

    setSaving(false)
    // Send to battle with the new artist id regardless of new vs re-rate
    router.push(`/battle?newArtistId=${artist.id}`)
  }

  // ── Artist picker ─────────────────────────────────────────────────────────
  if (!artist) {
    return (
      <div style={{
        minHeight: '100vh', background: '#000000',
        fontFamily: "'Manrope', sans-serif", color: '#ffffff',
        maxWidth: 430, margin: '0 auto',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '20px 24px 16px',
          position: 'sticky', top: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 10,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <button onClick={() => router.push('/feed')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#A8A29E" strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <span style={{
            fontFamily: "'Noto Serif', Georgia, serif",
            fontSize: 15, fontWeight: 700, color: '#D35400',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>{isRerate ? 'Re-rate a Show' : 'Log a Show'}</span>
          <div style={{ width: 18 }} />
        </div>

        <div style={{ padding: '16px 24px 100px' }}>
          <div style={{
            background: '#131313', borderRadius: 4,
            padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#A8A29E" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search artists..."
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#ffffff', fontSize: 14, fontFamily: "'Manrope', sans-serif",
                width: '100%',
              }}
            />
          </div>

          {!search && festival && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {festival.days.map(day => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  style={{
                    flex: 1,
                    background: activeDay === day ? '#D35400' : '#131313',
                    border: 'none', borderRadius: 4, padding: '8px 4px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    fontSize: 9, fontWeight: 700,
                    color: activeDay === day ? '#fff' : '#A8A29E',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    fontFamily: "'Manrope', sans-serif", lineHeight: 1.4,
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
              fontSize: 12, color: '#555555', letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>Loading...</div>
          ) : allArtists.length === 0 ? (
            <div style={{
              background: '#131313', borderRadius: 4, padding: 32,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 13, color: '#A8A29E',
                fontFamily: "'Manrope', sans-serif", lineHeight: 1.6,
              }}>
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
                const existing = loggedMap.get(a.id)
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
                      background: i % 2 === 0 ? '#131313' : '#0d0d0d',
                      border: 'none',
                      borderRadius: i === 0 ? '4px 4px 2px 2px'
                        : i === allArtists.length - 1 ? '2px 2px 4px 4px' : 2,
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', width: '100%', textAlign: 'left',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: "'Noto Serif', Georgia, serif",
                        fontSize: 14, fontWeight: 600, color: '#ffffff', marginBottom: 2,
                      }}>{a.name}</div>
                      <div style={{
                        fontSize: 9, color: '#A8A29E', letterSpacing: '0.06em',
                        textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                      }}>{a.stage}</div>
                    </div>
                    {reactionEmoji && (
                      <span style={{ fontSize: 16 }}>{reactionEmoji}</span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#555555" strokeWidth="2">
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

  // ── Reaction + photo view ─────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh', background: '#000000',
      fontFamily: "'Manrope', sans-serif", color: '#ffffff',
      maxWidth: 430, margin: '0 auto',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '20px 24px',
      }}>
        <button onClick={() => setSelectedArtist(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#A8A29E" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 15, fontWeight: 700, color: '#D35400',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>Gigl</span>
        <div style={{ width: 18 }} />
      </div>

      <div style={{ padding: '0 24px 40px' }}>
        <div style={{
          fontSize: 10, color: '#D35400', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 8,
        }}>{isRerate ? 'Re-rate' : 'Log a Show'}</div>

        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 34, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 6,
        }}>
          How was<br />
          <span style={{ color: '#D35400', fontStyle: 'italic' }}>{artist.name}?</span>
        </div>

        <div style={{
          fontSize: 10, color: '#A8A29E', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 36,
        }}>
          {artist.stage} · {festival?.dayDates[artist.day] ?? artist.day}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10, marginBottom: 36,
        }}>
          {REACTIONS.map(r => (
            <button key={r.value} onClick={() => setReaction(r.value)} style={{
              background: reaction === r.value ? '#2a1a00' : '#131313',
              border: reaction === r.value ? '1.5px solid #D35400' : '1.5px solid transparent',
              borderRadius: 4, padding: '20px 12px',
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s ease',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{r.emoji}</div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: reaction === r.value ? '#D35400' : '#A8A29E',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: "'Manrope', sans-serif",
              }}>{r.label}</div>
            </button>
          ))}
        </div>

        {/* Photo section — visible, comments section removed */}
        <div style={{
          fontSize: 10, color: '#A8A29E', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>Add a photo <span style={{ color: '#555555' }}>(optional)</span></div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleMediaChange}
          style={{ display: 'none' }}
        />

        {photoPreview ? (
          <div style={{ position: 'relative', marginBottom: 28 }}>
            {photo?.type.startsWith('video/') ? (
              <VideoPlayer src={photoPreview!} style={{ borderRadius: 4, maxHeight: 220, objectFit: 'cover' }} />
            ) : (
              <img
                src={photoPreview}
                alt="Preview"
                style={{ width: '100%', borderRadius: 4, maxHeight: 220, objectFit: 'cover', display: 'block' }}
              />
            )}
            <button
              onClick={() => { setPhoto(null); setPhotoPreview(null) }}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,0.6)', border: 'none',
                borderRadius: '50%', width: 28, height: 28,
                color: '#ffffff', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', background: '#131313',
              border: '1.5px dashed rgba(255,255,255,0.08)',
              borderRadius: 4, padding: '20px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, cursor: 'pointer', marginBottom: 28,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#555555" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{
              fontSize: 12, color: '#555555', letterSpacing: '0.06em',
              textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
            }}>Photo or video (≤20s)</span>
          </button>
        )}

        {/* Review */}
        <div style={{
          fontSize: 10, color: '#A8A29E', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>Your thoughts <span style={{ color: '#555555' }}>(optional)</span></div>
        <textarea
          value={review}
          onChange={e => setReview(e.target.value)}
          maxLength={280}
          placeholder="What made this set special..."
          rows={3}
          style={{
            width: '100%', background: '#131313',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 4, padding: '12px 14px',
            color: '#ffffff', fontSize: 13,
            fontFamily: "'Manrope', sans-serif",
            resize: 'none', outline: 'none',
            boxSizing: 'border-box', marginBottom: 28,
          }}
        />

        <div style={{
          height: 2, background: '#D35400', borderRadius: 1,
          width: '60%', marginBottom: 28,
        }} />

        <button onClick={handleLog} disabled={!reaction || saving} style={{
          width: '100%', background: reaction ? '#D35400' : '#1a1a1a',
          border: 'none', borderRadius: 4, padding: 14,
          textAlign: 'center', cursor: reaction ? 'pointer' : 'not-allowed',
          transition: 'background 0.2s ease',
        }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: reaction ? '#fff' : '#A8A29E',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'Manrope', sans-serif",
          }}>{saving ? 'Saving...' : isRerate ? 'Update rating' : 'Log this show'}</span>
        </button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => setSelectedArtist(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#555555', letterSpacing: '0.06em',
            textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
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
