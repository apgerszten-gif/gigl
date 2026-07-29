import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import Image from 'next/image'
import { DEFAULT_THEME as T } from '@/lib/theme'
import { computeShowScore } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { StarDisplay } from '@/components/StarDisplay'
import { markInvocation, timeQuery, timeMark } from '@/lib/queryTiming'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'

function resolvePhotoUrl(url: string): string {
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

export default async function ArtistPage({ params }: { params: { artistId: string } }) {
  const pageStart = Date.now()
  const { cold } = markInvocation()
  console.log(`[perf] artist:page start cold=${cold} artistId=${params.artistId}`)

  const { data: logs } = await timeQuery(`artist:logged_shows(${params.artistId})`, supabase
    .from('logged_shows')
    .select('user_id, performance_rating, venue_rating, vibe_rating, review, tags, photo_url, media_urls, artist_name, stage, day')
    .eq('artist_id', params.artistId))

  if (!logs || logs.length === 0) notFound()

  const userIds = Array.from(new Set(logs.map(l => l.user_id)))
  const { data: profiles } = await timeQuery(`artist:profiles(${userIds.length} ids)`, supabase
    .from('profiles').select('id, username').in('id', userIds))

  const usernameMap: Record<string, string> = {}
  profiles?.forEach(p => { usernameMap[p.id] = p.username })

  const artistName = logs[0]?.artist_name ?? 'Unknown'
  const stage      = logs[0]?.stage ?? ''
  const day        = logs[0]?.day   ?? ''

  const rated = logs
    .filter(l => l.performance_rating != null && l.venue_rating != null && l.vibe_rating != null)
    .map(l => ({ ...l, score: computeShowScore(l.performance_rating!, l.venue_rating!, l.vibe_rating!) }))
    .sort((a, b) => b.score - a.score)

  const avgScore  = rated.length > 0 ? rated.reduce((a, l) => a + l.score, 0) / rated.length : 0
  const highScore = rated.length > 0 ? Math.max(...rated.map(l => l.score)).toFixed(1) : '—'

  const loved   = rated.filter(l => l.score >= 4).length
  const ok      = rated.filter(l => l.score >= 2.5 && l.score < 4).length
  const skip    = rated.filter(l => l.score < 2.5).length
  const reviews = rated.filter(l => l.review)

  const photos = logs
    .flatMap(l => resolveMediaUrls(l).map(resolvePhotoUrl))
    .filter(u => !isVideoUrl(u))
    .filter((u, i, arr) => arr.indexOf(u) === i)
    .slice(0, 3)

  timeMark(`artist:page total (${logs.length} logs)`, pageStart)

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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <div style={{
            fontFamily: T.serif, fontSize: 30, fontWeight: 700,
            lineHeight: 1.1, letterSpacing: '-1px', color: '#4A3528',
          }}>
            {artistName}<br />
            <span style={{ fontSize: 22 }}>by the numbers</span><span style={{ color: T.accent, fontSize: 22 }}>.</span>
          </div>
          {rated.length > 0 && <StarDisplay score={avgScore} size={24} accent={T.accent} />}
        </div>
      </div>

      {/* ── Photo strip ─────────────────────────────────────────────────────── */}
      {photos.length > 0 && (
        <div style={{ display: 'flex', gap: 3, padding: '0 24px', marginBottom: 20, overflow: 'hidden' }}>
          {photos.map((url, i) => (
            <div key={i} style={{ position: 'relative', flex: 1, height: 110 }}>
              <Image src={url} alt="" fill sizes="140px" style={{
                objectFit: 'cover',
                borderRadius: i === 0 ? '10px 4px 4px 10px' : i === photos.length - 1 ? '4px 10px 10px 4px' : 4,
              }} />
            </div>
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
        <div style={{ padding: '14px 0', textAlign: 'center', borderRight: '1px solid rgba(74,53,40,0.1)' }}>
          <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: '#4A3528' }}>{rated.length}</div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginTop: 3, fontWeight: 600 }}>Ratings</div>
        </div>
        <div style={{ padding: '14px 0', textAlign: 'center', borderRight: '1px solid rgba(74,53,40,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          {rated.length > 0
            ? <StarDisplay score={avgScore} size={20} accent={T.accent} />
            : <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.accent }}>—</div>}
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginTop: 5, fontWeight: 600 }}>Avg score</div>
        </div>
        <div style={{ padding: '14px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: '#4A3528' }}>{highScore}</div>
          <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: T.muted, marginTop: 3, fontWeight: 600 }}>Top score</div>
        </div>
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
                  width: rated.length > 0 ? `${(row.count / rated.length) * 100}%` : '0%',
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
              const username = usernameMap[log.user_id] ?? 'anonymous'
              return (
                <div key={i} style={{
                  background: T.card, borderRadius: 5,
                  border: T.cardBorder,
                  boxShadow: i === 0 ? T.cardShadow : 'none',
                  padding: '14px 16px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <StarDisplay score={log.score} size={20} accent={T.accent} />
                    <a href={`/u/${username}`} style={{
                      fontSize: 12, fontWeight: 600, color: '#4A3528',
                      textDecoration: 'none', fontFamily: T.sans,
                    }}>@{username}</a>
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
