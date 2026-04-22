'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'
const TAGS = ['transcendent', 'intimate', 'chaotic', 'nostalgic', 'epic', 'euphoric', 'sleeper hit', 'top 3', 'made me cry', 'peak performance']

function resolvePhotoUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${SUPABASE_STORAGE}/${url}`
}

function scoreColor(score: string) {
  const n = parseFloat(score)
  if (n >= 9) return '#F5A623'
  if (n >= 7.5) return '#D35400'
  if (n >= 6) return '#e0a060'
  return 'rgba(245,235,227,0.3)'
}

interface Show {
  id: string
  artist_id: string
  artist_name: string
  stage: string
  day: string
  emoji: string
  elo: number
  review: string | null
  tags: string[] | null
  photo_url: string | null
}

interface Profile {
  username: string
  display_name: string
}

export default function ProfilePage() {
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [shows, setShows] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editReview, setEditReview] = useState('')
  const [editTags, setEditTags] = useState<string[]>([])
  const [editSaving, setEditSaving] = useState(false)
  const [editPhotoFile, setEditPhotoFile] = useState<File | null>(null)
  const [editPhotoPreview, setEditPhotoPreview] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      const [{ data: prof }, { data: showData }] = await Promise.all([
        supabase.from('profiles').select('username, display_name').eq('id', user.id).single(),
        supabase.from('logged_shows').select('*').eq('user_id', user.id).order('elo', { ascending: false }),
      ])
      setProfile(prof)
      setShows(showData || [])
      setLoading(false)
    }
    load()
  }, [router])

  async function copyLink() {
    if (!profile) return
    await navigator.clipboard.writeText(`${window.location.origin}/u/${profile.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/auth')
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
    const tags = editTags.length > 0 ? editTags : null

    let photoUrl: string | null | undefined = undefined // undefined = no change

    if (editPhotoFile) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const ext = editPhotoFile.name.split('.').pop()
        const path = `${user.id}/${artistId}-${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('show-photos')
          .upload(path, editPhotoFile, { upsert: true })
        if (!uploadError) {
          const { data: urlData } = supabase.storage.from('show-photos').getPublicUrl(path)
          photoUrl = urlData.publicUrl
        }
      }
    } else if (editPhotoPreview === null) {
      // user explicitly removed the photo
      photoUrl = null
    }

    const update: Record<string, unknown> = { review, tags }
    if (photoUrl !== undefined) update.photo_url = photoUrl

    const { error } = await supabase.from('logged_shows').update(update).eq('id', showId)
    if (!error) {
      setShows(prev => prev.map(s =>
        s.id === showId
          ? { ...s, review, tags, ...(photoUrl !== undefined ? { photo_url: photoUrl as string | null } : {}) }
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

  const avgScore = shows.length > 0
    ? (shows.reduce((acc, s) => acc + parseFloat(eloToDisplay(s.elo)), 0) / shows.length).toFixed(1)
    : '—'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#131313', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid #D35400', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#131313', fontFamily: "'Manrope', sans-serif", color: '#f5ebe3', maxWidth: 430, margin: '0 auto' }}>

      {/* Top bar */}
      <div style={{ padding: '20px 24px 16px', position: 'sticky', top: 0, background: '#131313', zIndex: 10, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ fontFamily: "'Noto Serif', Georgia, serif", fontSize: 22, fontWeight: 700, color: '#D35400', letterSpacing: '0.04em' }}>Gigl</div>
      </div>

      {/* Profile header */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ fontSize: 10, color: '#594238', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>Coachella 2026 · Weekend 2</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ fontFamily: "'Noto Serif', Georgia, serif", fontSize: 28, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {profile?.display_name}&apos;s<br />
            <span style={{ color: '#D35400', fontStyle: 'italic' }}>rankings.</span>
          </div>
          <button onClick={signOut} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: 'rgba(245,235,227,0.25)', fontFamily: "'Manrope', sans-serif", paddingTop: 6, letterSpacing: '0.06em' }}>sign out</button>
        </div>
        <div style={{ fontSize: 11, color: '#594238', marginBottom: 16 }}>@{profile?.username}</div>
      </div>

      {/* Stats bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)', background: '#0f0f11' }}>
        {[
          { label: 'Sets logged', value: shows.length.toString() },
          { label: 'Avg score', value: avgScore },
          { label: 'Weekend', value: 'W2' },
        ].map((stat, i) => (
          <div key={i} style={{ padding: '14px 0', textAlign: 'center', borderRight: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
            <div style={{ fontFamily: "'Noto Serif', Georgia, serif", fontSize: 18, fontWeight: 700, color: i === 1 ? '#D35400' : '#f5ebe3' }}>{stat.value}</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#594238', marginTop: 3 }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Share button */}
      <div style={{ padding: '16px 24px 8px' }}>
        <button onClick={copyLink} style={{
          width: '100%', background: copied ? 'rgba(211,84,0,0.12)' : '#1a1a1a',
          border: '1px solid rgba(211,84,0,0.2)', borderRadius: 12,
          padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12,
          cursor: 'pointer', fontFamily: "'Manrope', sans-serif",
        }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(211,84,0,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M8 1h5v5M13 1L6 8M5.5 3H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V8.5" stroke="#D35400" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div style={{ flex: 1, textAlign: 'left' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f5ebe3' }}>{copied ? 'Link copied!' : 'Share my rankings'}</div>
            <div style={{ fontSize: 10, color: '#594238', marginTop: 2 }}>gigl.app/u/{profile?.username}</div>
          </div>
        </button>
      </div>

      {/* Rankings */}
      <div style={{ padding: '8px 24px 120px' }}>
        <div style={{ fontSize: 10, color: '#594238', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>My rankings</div>

        {shows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 13, color: '#353534', marginBottom: 16 }}>No sets logged yet</div>
            <button onClick={() => router.push('/log')} style={{
              background: '#D35400', border: 'none', borderRadius: 12,
              padding: '12px 24px', color: '#fff', fontSize: 12, fontWeight: 700,
              cursor: 'pointer', fontFamily: "'Manrope', sans-serif",
              letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>Log your first set →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shows.map((show, i) => {
              const score = eloToDisplay(show.elo)
              const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
              const isEditing = editingId === show.id
              return (
                <div key={show.id} style={{ background: '#1a1a1a', borderRadius: 12, overflow: 'hidden' }}>
                  {resolvePhotoUrl(show.photo_url) && (
                    <img src={resolvePhotoUrl(show.photo_url)!} alt={show.artist_name}
                      style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                  )}

                  {/* Info row */}
                  <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* Score tile */}
                    <div style={{ width: 44, height: 44, background: '#252220', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
                      <span style={{ fontFamily: "'Noto Serif', Georgia, serif", fontSize: 16, fontWeight: 700, color: scoreColor(score), lineHeight: 1 }}>{score}</span>
                    </div>
                    {/* Artist info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "'Noto Serif', Georgia, serif", fontSize: 15, fontWeight: 600, color: '#f5ebe3', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{show.artist_name}</div>
                      <div style={{ fontSize: 10, color: '#594238', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>{show.stage} · {show.day}</div>
                      <div style={{ fontSize: 10, color: '#D35400', marginTop: 2 }}>{rankLabel}</div>
                    </div>
                    {/* Edit button */}
                    <button onClick={() => isEditing ? setEditingId(null) : startEdit(show)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px', flexShrink: 0, opacity: isEditing ? 1 : 0.35 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={isEditing ? '#D35400' : '#f5ebe3'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>

                  {/* Edit form */}
                  {isEditing ? (
                    <div style={{ padding: '0 16px 16px' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          setEditPhotoFile(file)
                          setEditPhotoPreview(URL.createObjectURL(file))
                        }}
                      />
                      {editPhotoPreview ? (
                        <div style={{ position: 'relative', marginBottom: 12 }}>
                          <img src={editPhotoPreview} alt=""
                            style={{ width: '100%', borderRadius: 10, maxHeight: 180, objectFit: 'cover', display: 'block' }} />
                          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
                            <button onClick={() => fileInputRef.current?.click()} style={{
                              background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: 20,
                              padding: '4px 10px', color: '#f5ebe3', fontSize: 10, cursor: 'pointer',
                              fontFamily: "'Manrope', sans-serif", letterSpacing: '0.04em',
                            }}>Replace</button>
                            <button onClick={() => { setEditPhotoPreview(null); setEditPhotoFile(null) }} style={{
                              background: 'rgba(0,0,0,0.6)', border: 'none', borderRadius: '50%',
                              width: 26, height: 26, color: '#f5ebe3', fontSize: 15, cursor: 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>×</button>
                          </div>
                        </div>
                      ) : (
                        <button onClick={() => fileInputRef.current?.click()} style={{
                          width: '100%', background: '#252220',
                          border: '1.5px dashed rgba(255,255,255,0.08)',
                          borderRadius: 10, padding: '14px 16px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          gap: 8, cursor: 'pointer', marginBottom: 12,
                        }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#353534" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2" />
                            <circle cx="8.5" cy="8.5" r="1.5" />
                            <polyline points="21 15 16 10 5 21" />
                          </svg>
                          <span style={{ fontSize: 11, color: '#353534', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>Add a photo</span>
                        </button>
                      )}
                      <textarea
                        value={editReview}
                        onChange={e => setEditReview(e.target.value)}
                        maxLength={280}
                        placeholder="Add a review..."
                        rows={3}
                        style={{
                          width: '100%', background: '#252220', border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 10, padding: '10px 12px', color: '#f5ebe3', fontSize: 13,
                          fontFamily: "'Manrope', sans-serif", resize: 'none', outline: 'none',
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
                              background: active ? 'rgba(211,84,0,0.2)' : 'rgba(255,255,255,0.04)',
                              color: active ? '#D35400' : 'rgba(245,235,227,0.35)',
                              border: active ? '1px solid rgba(211,84,0,0.35)' : '1px solid rgba(255,255,255,0.06)',
                              fontFamily: "'Manrope', sans-serif",
                            }}>{tag}</button>
                          )
                        })}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => setEditingId(null)} style={{
                          flex: 1, padding: '10px 0', borderRadius: 10,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                          color: 'rgba(245,235,227,0.35)', fontSize: 11, cursor: 'pointer',
                          fontFamily: "'Manrope', sans-serif",
                        }}>Cancel</button>
                        <button onClick={() => saveEdit(show.id, show.artist_id)} disabled={editSaving} style={{
                          flex: 2, padding: '10px 0', borderRadius: 10, background: '#D35400',
                          border: 'none', color: '#fff', fontSize: 11, fontWeight: 700,
                          cursor: editSaving ? 'default' : 'pointer', opacity: editSaving ? 0.7 : 1,
                          fontFamily: "'Manrope', sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase',
                        }}>{editSaving ? 'Saving...' : 'Save'}</button>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <button onClick={() => router.push(`/battle?newArtistId=${show.artist_id}`)} style={{
                          flex: 1, padding: '10px 0', borderRadius: 10,
                          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                          color: 'rgba(245,235,227,0.45)', fontSize: 11, cursor: 'pointer',
                          fontFamily: "'Manrope', sans-serif",
                        }}>↺ Rerun battles</button>
                        {confirmDeleteId === show.id ? (
                          <>
                            <button onClick={() => setConfirmDeleteId(null)} style={{
                              flex: 1, padding: '10px 0', borderRadius: 10,
                              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                              color: 'rgba(245,235,227,0.35)', fontSize: 11, cursor: 'pointer',
                              fontFamily: "'Manrope', sans-serif",
                            }}>Keep it</button>
                            <button onClick={() => deleteShow(show.id)} style={{
                              flex: 1, padding: '10px 0', borderRadius: 10,
                              background: 'rgba(180,30,30,0.2)', border: '1px solid rgba(180,30,30,0.35)',
                              color: '#e05050', fontSize: 11, fontWeight: 700, cursor: 'pointer',
                              fontFamily: "'Manrope', sans-serif",
                            }}>Delete</button>
                          </>
                        ) : (
                          <button onClick={() => setConfirmDeleteId(show.id)} style={{
                            flex: 1, padding: '10px 0', borderRadius: 10,
                            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
                            color: 'rgba(224,80,80,0.5)', fontSize: 11, cursor: 'pointer',
                            fontFamily: "'Manrope', sans-serif",
                          }}>Remove rating</button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <>
                      {show.review && (
                        <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'rgba(245,235,227,0.45)', fontStyle: 'italic', lineHeight: 1.5 }}>
                          &ldquo;{show.review}&rdquo;
                        </div>
                      )}
                      {show.tags && show.tags.length > 0 && (
                        <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {show.tags.map(tag => (
                            <span key={tag} style={{
                              fontSize: 10, padding: '3px 10px', borderRadius: 20,
                              background: 'rgba(211,84,0,0.12)', color: 'rgba(211,84,0,0.7)',
                              border: '1px solid rgba(211,84,0,0.2)', fontFamily: "'Manrope', sans-serif",
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

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430, background: '#0e0e0e',
        padding: '16px 32px', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#594238" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 9, color: '#594238', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>Home</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div onClick={() => router.push('/log')} style={{
            width: 40, height: 40, background: '#D35400', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -20, cursor: 'pointer', boxShadow: '0 4px 16px rgba(211,84,0,0.4)',
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: 9, color: '#e0c0b2', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>Log</span>
        </div>

        <button onClick={() => router.push('/profile')} style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#D35400" stroke="none">
            <circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
          </svg>
          <span style={{ fontSize: 9, color: '#D35400', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif" }}>You</span>
        </button>
      </div>
    </div>
  )
}
