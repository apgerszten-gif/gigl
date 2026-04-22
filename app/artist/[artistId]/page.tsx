import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'
import { ARTISTS } from '@/lib/artists'
import { notFound } from 'next/navigation'

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

function dayLabel(d: string) {
  if (d === 'friday') return 'Fri Apr 17'
  if (d === 'saturday') return 'Sat Apr 18'
  return 'Sun Apr 19'
}

function scoreColor(score: string) {
  const n = parseFloat(score)
  if (n >= 9) return '#F5A623'
  if (n >= 7.5) return '#D35400'
  if (n >= 6) return '#e0a060'
  return 'rgba(245,235,227,0.3)'
}

export default async function ArtistPage({ params }: { params: { artistId: string } }) {
  const artist = ARTISTS.find(a => a.id === params.artistId)

  const { data: logs } = await supabase
    .from('logged_shows')
    .select('user_id, elo, review, tags, photo_url, artist_name, stage, day')
    .eq('artist_id', params.artistId)
    .order('elo', { ascending: false })

  if (!logs || logs.length === 0) notFound()

  const userIds = Array.from(new Set(logs.map(l => l.user_id)))
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, username')
    .in('id', userIds)

  const usernameMap: Record<string, string> = {}
  profiles?.forEach(p => { usernameMap[p.id] = p.username })

  const artistName = artist?.name ?? logs[0]?.artist_name ?? 'Unknown'
  const stage      = artist?.stage ?? logs[0]?.stage ?? ''
  const day        = artist?.day   ?? logs[0]?.day   ?? ''

  const scores  = logs.map(l => parseFloat(eloToDisplay(l.elo)))
  const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  const highScore = Math.max(...scores).toFixed(1)

  // Reaction breakdown
  const loved = logs.filter(l => l.elo >= 1550).length
  const ok    = logs.filter(l => l.elo >= 1450 && l.elo < 1550).length
  const skip  = logs.filter(l => l.elo < 1450).length

  // Reviews with text, best-ranked first
  const reviews = logs.filter(l => l.review)

  // Images only for strip (videos don't work well in a 3-up thumbnail)
  const photos = logs
    .map(l => resolvePhotoUrl(l.photo_url))
    .filter((u): u is string => !!u && !isVideoUrl(u))
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 3)

  return (
    <div style={{
      minHeight: '100vh', background: '#131313',
      fontFamily: "'Manrope', sans-serif", color: '#f5ebe3',
      maxWidth: 430, margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '20px 24px 16px',
        position: 'sticky', top: 0, background: '#131313', zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/feed" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
            stroke="#e0c0b2" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 22, fontWeight: 700, color: '#D35400', letterSpacing: '0.04em',
        }}>Gigl</div>
        <div style={{ width: 18 }} />
      </div>

      {/* Hero */}
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{ fontSize: 10, color: '#594238', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
          {stage}{day ? ` · ${dayLabel(day)}` : ''}
        </div>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 30, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 20,
        }}>
          {artistName}<br />
          <span style={{ color: '#D35400', fontStyle: 'italic', fontSize: 22 }}>by the numbers.</span>
        </div>
      </div>

      {/* Photos strip */}
      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 3, padding: '0 24px', marginBottom: 20, overflow: 'hidden' }}>
          {photos.map((url, i) => (
            <img key={i} src={url} alt="" style={{
              flex: 1, height: 110, objectFit: 'cover',
              borderRadius: i === 0 ? '10px 4px 4px 10px' : i === photos.length - 1 ? '4px 10px 10px 4px' : 4,
            }} />
          ))}
        </div>
      )}

      {/* Stats bar */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: '#0f0f11',
      }}>
        {[
          { label: 'Ratings', value: logs.length.toString() },
          { label: 'Avg score', value: avgScore },
          { label: 'Top score', value: highScore },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '14px 0', textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(255,255,255,0.04)' : 'none',
          }}>
            <div style={{
              fontFamily: "'Noto Serif', Georgia, serif",
              fontSize: 18, fontWeight: 700,
              color: i === 1 ? '#D35400' : '#f5ebe3',
            }}>{stat.value}</div>
            <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#594238', marginTop: 3 }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      {/* Reaction breakdown */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{ fontSize: 10, color: '#594238', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>
          Crowd reaction
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Loved it 👍', count: loved, color: '#D35400' },
            { label: 'It was ok 🤷', count: ok, color: '#594238' },
            { label: 'Kinda Wack 👎', count: skip, color: '#353534' },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 90, fontSize: 11, color: 'rgba(245,235,227,0.5)', flexShrink: 0 }}>{row.label}</div>
              <div style={{ flex: 1, height: 6, background: '#1a1a1a', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  background: row.color,
                  width: logs.length > 0 ? `${(row.count / logs.length) * 100}%` : '0%',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ width: 20, fontSize: 11, color: '#594238', textAlign: 'right', flexShrink: 0 }}>{row.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      {reviews.length > 0 && (
        <div style={{ padding: '20px 24px 100px' }}>
          <div style={{ fontSize: 10, color: '#594238', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>
            What people are saying
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reviews.map((log, i) => {
              const score = eloToDisplay(log.elo)
              const username = usernameMap[log.user_id] ?? 'anonymous'
              return (
                <div key={i} style={{ background: '#1a1a1a', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, background: '#252220', flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8,
                    }}>
                      <span style={{
                        fontFamily: "'Noto Serif', Georgia, serif",
                        fontSize: 14, fontWeight: 700,
                        color: scoreColor(score), lineHeight: 1,
                      }}>{score}</span>
                    </div>
                    <div>
                      <a href={`/u/${username}`} style={{
                        fontSize: 12, fontWeight: 600, color: '#f5ebe3',
                        textDecoration: 'none', fontFamily: "'Manrope', sans-serif",
                      }}>@{username}</a>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(245,235,227,0.65)', fontStyle: 'italic', lineHeight: 1.55 }}>
                    &ldquo;{log.review}&rdquo;
                  </div>
                  {log.tags && log.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {log.tags.map((tag: string) => (
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
        </div>
      )}

      {reviews.length === 0 && (
        <div style={{ padding: '24px 24px 100px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, color: '#353534' }}>No written reviews yet</div>
        </div>
      )}
    </div>
  )
}
