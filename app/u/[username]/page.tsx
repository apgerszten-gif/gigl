import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'
import { notFound } from 'next/navigation'
import { VideoPlayer } from '@/components/VideoPlayer'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'

function resolvePhotoUrl(url: string | null): string | null {
  if (!url) return null
  if (url.startsWith('http')) return url
  return `${SUPABASE_STORAGE}/${url}`
}

function isVideoUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ['mp4', 'mov', 'webm', 'm4v', 'avi'].includes(ext ?? '')
}

function scoreColor(score: string) {
  const n = parseFloat(score)
  if (n >= 9) return '#F5A623'
  if (n >= 7.5) return '#D35400'
  if (n >= 6) return '#e0a060'
  return 'rgba(255,255,255,0.3)'
}

export default async function PublicProfile({ params }: { params: { username: string } }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', params.username)
    .single()

  if (!profile) notFound()

  const { data: shows } = await supabase
    .from('logged_shows')
    .select('*')
    .eq('user_id', profile.id)
    .order('elo', { ascending: false })

  const avgScore = shows && shows.length > 0
    ? (shows.reduce((acc, s) => acc + parseFloat(eloToDisplay(s.elo)), 0) / shows.length).toFixed(1)
    : '—'

  return (
    <div style={{
      minHeight: '100vh', background: '#000000',
      fontFamily: "'Manrope', sans-serif", color: '#ffffff',
      maxWidth: 430, margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '20px 24px 16px',
        position: 'sticky', top: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/feed" style={{
          background: 'none', border: 'none', cursor: 'pointer',
          padding: 0, display: 'flex', alignItems: 'center',
          textDecoration: 'none',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#A8A29E" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 22, fontWeight: 700, color: '#D35400',
          letterSpacing: '0.04em',
        }}>Gigl</div>
        <div style={{ width: 18 }} />
      </div>

      {/* Profile header */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{ fontSize: 10, color: '#A8A29E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
          Coachella 2026 · Weekend 2
        </div>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 28, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 8,
        }}>
          {profile.display_name}&apos;s<br />
          <span style={{ color: '#D35400', fontStyle: 'italic' }}>rankings.</span>
        </div>
        <div style={{ fontSize: 11, color: '#A8A29E', marginBottom: 16 }}>@{profile.username}</div>
      </div>

      {/* Stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: '#000000',
      }}>
        {[
          { label: 'Sets logged', value: (shows?.length || 0).toString() },
          { label: 'Avg score', value: avgScore },
          { label: 'Weekend', value: 'W2' },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '14px 0', textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div style={{
              fontFamily: "'Noto Serif', Georgia, serif",
              fontSize: 18, fontWeight: 700,
              color: i === 1 ? '#D35400' : '#ffffff',
            }}>{stat.value}</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#A8A29E', marginTop: 3 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Rankings */}
      <div style={{ padding: '16px 24px 100px' }}>
        <div style={{ fontSize: 10, color: '#A8A29E', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
          Their rankings
        </div>

        {(!shows || shows.length === 0) ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 13, color: '#555555' }}>No sets logged yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shows.map((show, i) => {
              const score = eloToDisplay(show.elo)
              const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
              const photoUrl = resolvePhotoUrl(show.photo_url)
              return (
                <div key={show.id} style={{ background: '#131313', borderRadius: 4, overflow: 'hidden' }}>
                  {photoUrl && (
                    isVideoUrl(photoUrl) ? (
                      <VideoPlayer src={photoUrl} style={{ maxHeight: 220, objectFit: 'cover' }} />
                    ) : (
                      <img src={photoUrl} alt={show.artist_name}
                        style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block' }} />
                    )
                  )}
                  <div style={{ padding: '14px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 44, height: 44, background: '#1a1a1a', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
                    }}>
                      <span style={{
                        fontFamily: "'Noto Serif', Georgia, serif",
                        fontSize: 16, fontWeight: 700,
                        color: scoreColor(score), lineHeight: 1,
                      }}>{score}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontFamily: "'Noto Serif', Georgia, serif",
                        fontSize: 15, fontWeight: 600, color: '#ffffff',
                        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>{show.artist_name}</div>
                      <div style={{ fontSize: 10, color: '#A8A29E', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
                        {show.stage} · {show.day}
                      </div>
                      <div style={{ fontSize: 10, color: '#D35400', marginTop: 2 }}>{rankLabel}</div>
                    </div>
                  </div>
                  {show.review && (
                    <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'rgba(255,255,255,0.45)', fontStyle: 'italic', lineHeight: 1.5 }}>
                      &ldquo;{show.review}&rdquo;
                    </div>
                  )}
                  {show.tags && show.tags.length > 0 && (
                    <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {show.tags.map((tag: string) => (
                        <span key={tag} style={{
                          fontSize: 10, padding: '3px 10px', borderRadius: 20,
                          background: 'rgba(211,84,0,0.12)', color: 'rgba(211,84,0,0.7)',
                          border: '1px solid rgba(211,84,0,0.2)',
                          fontFamily: "'Manrope', sans-serif",
                        }}>{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: '#555555', marginBottom: 12 }}>Want to rank your Coachella sets?</p>
          <a href="/auth" style={{
            display: 'inline-block', background: '#D35400',
            color: '#fff', borderRadius: 4, padding: '12px 24px',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', textDecoration: 'none',
            fontFamily: "'Manrope', sans-serif",
          }}>Join Gigl →</a>
        </div>
      </div>
    </div>
  )
}
