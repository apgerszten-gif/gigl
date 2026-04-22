'use client'

import { useState, Suspense, useRef, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ARTISTS, ARTISTS_BY_DAY } from '@/lib/artists'
import { createClient } from '@/lib/supabase/client'

const REACTIONS = [
  { value: 'loved' as const, emoji: '👍', label: 'Loved it' },
  { value: 'ok'    as const, emoji: '🤷', label: 'It was ok' },
  { value: 'skip'  as const, emoji: '👎', label: 'Kinda Wack' },
]

const ELO_SEEDS = { loved: 1600, ok: 1500, skip: 1400 }

type Day = 'friday' | 'saturday' | 'sunday'

const DAY_LABELS: Record<Day, string> = {
  friday: 'Fri Apr 17',
  saturday: 'Sat Apr 18',
  sunday: 'Sun Apr 19',
}

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
  // rerate=1 signals we're re-rating an already-logged show
  const isRerate = searchParams.get('rerate') === '1'
  const artistFromParam = artistIdParam ? ARTISTS.find(a => a.id === artistIdParam) : null

  const [activeDay, setActiveDay]           = useState<Day>('friday')
  const [search, setSearch]                 = useState('')
  const [selectedArtist, setSelectedArtist] = useState(artistFromParam ?? null)
  const [reaction, setReaction]             = useState<'loved' | 'ok' | 'skip' | null>(null)
  const [photo, setPhoto]                   = useState<File | null>(null)
  const [photoPreview, setPhotoPreview]     = useState<string | null>(null)
  const [review, setReview]                 = useState('')
  const [saving, setSaving]                 = useState(false)
  // Maps artist_id → existing log data (emoji + photo_url)
  const [loggedMap, setLoggedMap]           = useState<Map<string, ExistingLog>>(new Map())
  const [loadingLogged, setLoadingLogged]   = useState(true)

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

  // In normal log mode: hide already-logged artists.
  // In re-rate mode (arriving from feed): show all so user can pick (but
  // typically they arrive with artistId pre-set so the picker is skipped).
  const loggedIds = new Set(loggedMap.keys())

  const allArtists = (search
    ? ARTISTS.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : ARTISTS_BY_DAY[activeDay]
  ).filter(a => isRerate ? loggedIds.has(a.id) : !loggedIds.has(a.id))

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
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
        minHeight: '100vh', background: '#131313',
        fontFamily: "'Manrope', sans-serif", color: '#f5ebe3',
        maxWidth: 430, margin: '0 auto',
      }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', padding: '20px 24px 16px',
          position: 'sticky', top: 0, background: '#131313', zIndex: 10,
          borderBottom: '1px solid rgba(255,255,255,0.04)',
        }}>
          <button onClick={() => router.push('/feed')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#e0c0b2" strokeWidth="2">
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
            background: '#1a1a1a', borderRadius: 12,
            padding: '12px 16px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#594238" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search artists..."
              style={{
                background: 'none', border: 'none', outline: 'none',
                color: '#f5ebe3', fontSize: 14, fontFamily: "'Manrope', sans-serif",
                width: '100%',
              }}
            />
          </div>

          {!search && (
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {(['friday', 'saturday', 'sunday'] as Day[]).map(day => (
                <button
                  key={day}
                  onClick={() => setActiveDay(day)}
                  style={{
                    flex: 1,
                    background: activeDay === day ? '#D35400' : '#1a1a1a',
                    border: 'none', borderRadius: 10, padding: '8px 4px',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{
                    fontSize: 9, fontWeight: 700,
                    color: activeDay === day ? '#fff' : '#594238',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    fontFamily: "'Manrope', sans-serif", lineHeight: 1.4,
                  }}>
                    {DAY_LABELS[day].split(' ').map((w, i) => (
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
              fontSize: 12, color: '#353534', letterSpacing: '0.08em',
              textTransform: 'uppercase',
            }}>Loading...</div>
          ) : allArtists.length === 0 ? (
            <div style={{
              background: '#1a1a1a', borderRadius: 16, padding: 32,
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 13, color: '#594238',
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
                      background: i % 2 === 0 ? '#1a1a1a' : '#1e1e1e',
                      border: 'none',
                      borderRadius: i === 0 ? '12px 12px 2px 2px'
                        : i === allArtists.length - 1 ? '2px 2px 12px 12px' : 2,
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      cursor: 'pointer', width: '100%', textAlign: 'left',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontFamily: "'Noto Serif', Georgia, serif",
                        fontSize: 14, fontWeight: 600, color: '#f5ebe3', marginBottom: 2,
                      }}>{a.name}</div>
                      <div style={{
                        fontSize: 9, color: '#594238', letterSpacing: '0.06em',
                        textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                      }}>{a.stage}</div>
                    </div>
                    {reactionEmoji && (
                      <span style={{ fontSize: 16 }}>{reactionEmoji}</span>
                    )}
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      stroke="#353534" strokeWidth="2">
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
      minHeight: '100vh', background: '#131313',
      fontFamily: "'Manrope', sans-serif", color: '#f5ebe3',
      maxWidth: 430, margin: '0 auto',
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', padding: '20px 24px',
      }}>
        <button onClick={() => setSelectedArtist(null)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#e0c0b2" strokeWidth="2">
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
          fontSize: 10, color: '#594238', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 36,
        }}>
          {artist.stage} · {artist.day === 'friday' ? 'Apr 17' : artist.day === 'saturday' ? 'Apr 18' : 'Apr 19'}
        </div>

        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 10, marginBottom: 36,
        }}>
          {REACTIONS.map(r => (
            <button key={r.value} onClick={() => setReaction(r.value)} style={{
              background: reaction === r.value ? '#2a1a00' : '#1a1a1a',
              border: reaction === r.value ? '1.5px solid #D35400' : '1.5px solid transparent',
              borderRadius: 16, padding: '20px 12px',
              textAlign: 'center', cursor: 'pointer', transition: 'all 0.15s ease',
            }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>{r.emoji}</div>
              <div style={{
                fontSize: 11, fontWeight: 700,
                color: reaction === r.value ? '#D35400' : '#e0c0b2',
                letterSpacing: '0.06em', textTransform: 'uppercase',
                fontFamily: "'Manrope', sans-serif",
              }}>{r.label}</div>
            </button>
          ))}
        </div>

        {/* Photo section — visible, comments section removed */}
        <div style={{
          fontSize: 10, color: '#594238', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>Add a photo <span style={{ color: '#353534' }}>(optional)</span></div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          style={{ display: 'none' }}
        />

        {photoPreview ? (
          <div style={{ position: 'relative', marginBottom: 28 }}>
            <img
              src={photoPreview}
              alt="Preview"
              style={{
                width: '100%', borderRadius: 12,
                maxHeight: 220, objectFit: 'cover', display: 'block',
              }}
            />
            <button
              onClick={() => { setPhoto(null); setPhotoPreview(null) }}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'rgba(0,0,0,0.6)', border: 'none',
                borderRadius: '50%', width: 28, height: 28,
                color: '#f5ebe3', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, lineHeight: 1,
              }}
            >×</button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              width: '100%', background: '#1a1a1a',
              border: '1.5px dashed rgba(255,255,255,0.08)',
              borderRadius: 12, padding: '20px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, cursor: 'pointer', marginBottom: 28,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="#353534" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span style={{
              fontSize: 12, color: '#353534', letterSpacing: '0.06em',
              textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
            }}>Upload a photo</span>
          </button>
        )}

        {/* Review */}
        <div style={{
          fontSize: 10, color: '#594238', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>Your thoughts <span style={{ color: '#353534' }}>(optional)</span></div>
        <textarea
          value={review}
          onChange={e => setReview(e.target.value)}
          maxLength={280}
          placeholder="What made this set special..."
          rows={3}
          style={{
            width: '100%', background: '#1a1a1a',
            border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 12, padding: '12px 14px',
            color: '#f5ebe3', fontSize: 13,
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
          width: '100%', background: reaction ? '#D35400' : '#252220',
          border: 'none', borderRadius: 12, padding: 14,
          textAlign: 'center', cursor: reaction ? 'pointer' : 'not-allowed',
          transition: 'background 0.2s ease',
        }}>
          <span style={{
            fontSize: 12, fontWeight: 700, color: reaction ? '#fff' : '#594238',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            fontFamily: "'Manrope', sans-serif",
          }}>{saving ? 'Saving...' : isRerate ? 'Update rating' : 'Log this show'}</span>
        </button>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <button onClick={() => setSelectedArtist(null)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 11, color: '#353534', letterSpacing: '0.06em',
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
