import { supabase } from '@/lib/supabase'
import { eloToDisplay } from '@/lib/elo'
import { ARTISTS } from '@/lib/artists'
import { notFound } from 'next/navigation'
import { DEFAULT_THEME as T } from '@/lib/theme'

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
  if (d === 'friday')   return 'Fri Apr 17'
  if (d === 'saturday') return 'Sat Apr 18'
  return 'Sun Apr 19'
}

function scoreColor(score: string) {
  const n = parseFloat(score)
  if (n >= 7.5) return T.accent
  if (n >= 6)   return '#D4845A'
  return T.faint
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
    .from('profiles').select('id, username').in('id', userIds)

  const usernameMap: Record<string, string> = {}
  profiles?.forEach(p => { usernameMap[p.id] = p.username })

  const artistName = artist?.name ?? logs[0]?.artist_name ?? 'Unknown'
  const stage      = artist?.stage ?? logs[0]?.stage ?? ''
  const day        = artist?.day   ?? logs[0]?.day   ?? ''

  const scores   = logs.map(l => parseFloat(eloToDisplay(l.elo)))
  const avgScore = (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
  const highScore = Math.max(...scores).toFixed(1)

  const loved   = logs.filter(l => l.elo >= 1550).length
  const ok      = logs.filter(l => l.elo >= 1450 && l.elo < 1550).length
  const skip    = logs.filter(l => l.elo < 1450).length
  const reviews = logs.filter(l => l.review)

  const photos = logs
    .map(l => resolvePhotoUrl(l.photo_url))
    .filter((u): u is string => !!u && !isVideoUrl(u))
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 3)

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      fontFamily: T.sans, color: '#4A3528',
      maxWidth: 430, margin: '0 auto',
    }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '18px 24px 14px',
        position: 'sticky', top: 0, zIndex: 10,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(74,53,40,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <a href="/feed" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: '#4A3528', letterSpacing: '-0.5px' }}>
          Gigl<span style={{ color: T.accent }}>/</span>
        </div>
        <div style={{ width: 18 }} />
      </div>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <div style={{ padding: '24px 24px 0' }}>
        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 4, fontWeight: 600,
        }}>
          {stage}{day ? ` · ${dayLabel(day)}` : ''}
        </div>
        <div style={{
          fontFamily: T.serif, fontSize: 30, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 20, color: '#4A3528',
        }}>
          {artistName}<br />
          <span style={{ fontSize: 22 }}>by the numbers</span><span style={{ color: T.accent, fontSize: 22 }}>.</span>
        </div>
      </div>

      {/* ── Photo strip ─────────────────────────────────────────────────────── */}
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

      {/* ── Stats bar ────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: '1px solid rgba(74,53,40,0.1)',
        borderBottom: '1px solid rgba(74,53,40,0.1)',
        background: T.bg,
      }}>
        {[
          { label: 'Ratings',   value: logs.length.toString() },
          { label: 'Avg score', value: avgScore },
          { label: 'Top score', value: highScore },
        ].map((stat, i) => (
          <div key={i} style={{
            padding: '14px 0', textAlign: 'center',
            borderRight: i < 2 ? '1px solid rgba(74,53,40,0.1)' : 'none',
          }}>
            <div style={{
              fontFamily: T.serif, fontSize: 18, fontWeight: 700,
              color: i === 1 ? T.accent : '#4A3528',
            }}>{stat.value}</div>
            <div style={{
              fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em',
              color: T.muted, marginTop: 3, fontWeight: 600,
            }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ── Reaction breakdown ───────────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px 0' }}>
        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 10, fontWeight: 600,
        }}>Crowd reaction</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            { label: 'Loved it 👍',   count: loved, color: T.accent },
            { label: 'It was ok 🤷',  count: ok,    color: T.muted },
            { label: 'Kinda Wack 👎', count: skip,  color: T.faint },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 90, fontSize: 11, color: 'rgba(74,53,40,0.55)', flexShrink: 0 }}>{row.label}</div>
              <div style={{ flex: 1, height: 6, background: T.cardInner, borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(74,53,40,0.1)' }}>
                <div style={{
                  height: '100%', borderRadius: 3, background: row.color,
                  width: logs.length > 0 ? `${(row.count / logs.length) * 100}%` : '0%',
                  transition: 'width 0.4s ease',
                }} />
              </div>
              <div style={{ width: 20, fontSize: 11, color: T.muted, textAlign: 'right', flexShrink: 0 }}>{row.count}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Reviews ─────────────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <div style={{ padding: '20px 24px 100px' }}>
          <div style={{
            fontSize: 10, color: T.muted, letterSpacing: '0.12em',
            textTransform: 'uppercase', marginBottom: 12, fontWeight: 600,
          }}>What people are saying</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {reviews.map((log, i) => {
              const score    = eloToDisplay(log.elo)
              const username = usernameMap[log.user_id] ?? 'anonymous'
              return (
                <div key={i} style={{
                  background: T.card, borderRadius: 5,
                  border: T.cardBorder,
                  boxShadow: i === 0 ? T.cardShadow : 'none',
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{
                      width: 36, height: 36, flexShrink: 0, borderRadius: 4,
                      background: T.accent, border: '1.5px solid #4A3528',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{
                        fontFamily: T.serif, fontSize: 14, fontWeight: 700,
                        color: '#FAF3E2', lineHeight: 1,
                      }}>{score}</span>
                    </div>
                    <div>
                      <a href={`/u/${username}`} style={{
                        fontSize: 12, fontWeight: 600, color: '#4A3528',
                        textDecoration: 'none', fontFamily: T.sans,
                      }}>@{username}</a>
                    </div>
                  </div>
                  <div style={{ fontSize: 13, color: 'rgba(74,53,40,0.7)', fontStyle: 'italic', lineHeight: 1.55 }}>
                    &ldquo;{log.review}&rdquo;
                  </div>
                  {log.tags && log.tags.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
                      {log.tags.map((tag: string) => (
                        <span key={tag} style={{
                          fontSize: 10, padding: '3px 10px', borderRadius: 20,
                          background: T.accentDim, color: T.accent,
                          border: `1.5px solid ${T.accentBorder}`,
                          fontFamily: T.sans, fontWeight: 600,
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
          <div style={{ fontSize: 13, color: T.faint }}>No written reviews yet</div>
        </div>
      )}
    </div>
  )
}
