import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { DEFAULT_THEME as T } from '@/lib/theme'
import { showScore } from '@/lib/rating'
import { resolveMediaUrls } from '@/lib/media'
import { StarDisplay } from '@/components/StarDisplay'
import { MediaGrid } from '@/components/MediaGrid'

const SUPABASE_STORAGE = 'https://djjqrjljgwnvwwzbbevp.supabase.co/storage/v1/object/public/show-photos'

function resolvePhotoUrl(url: string): string {
  if (url.startsWith('http')) return url
  return `${SUPABASE_STORAGE}/${url}`
}

export default async function PublicProfile({ params }: { params: { username: string } }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', params.username)
    .single()

  if (!profile) notFound()

  const { data: showsRaw } = await supabase
    .from('logged_shows')
    .select('*')
    .eq('user_id', profile.id)

  const shows = (showsRaw ?? []).slice().sort((a, b) => showScore(b) - showScore(a))
  const ratedShows = shows.filter(s => s.performance_rating != null && s.venue_rating != null && s.vibe_rating != null)
  const avgScore = ratedShows.length > 0
    ? ratedShows.reduce((acc, s) => acc + showScore(s), 0) / ratedShows.length
    : 0

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
        <a href="/feed" style={{
          display: 'flex', alignItems: 'center', textDecoration: 'none',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </a>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: '#4A3528', letterSpacing: '-0.5px' }}>
          Gigl<span style={{ color: T.accent }}>/</span>
        </div>
        <div style={{ width: 18 }} />
      </div>

      {/* ── Profile header ───────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 4,
        }}>Festival Season 2026</div>
        <div style={{
          fontFamily: T.serif, fontSize: 28, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 8, color: '#4A3528',
        }}>
          {profile.display_name}&apos;s<br />
          <span>rankings</span><span style={{ color: T.accent }}>.</span>
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 16 }}>@{profile.username}</div>
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

      {/* ── Rankings ────────────────────────────────────────────────────────── */}
      <div style={{ padding: '16px 24px 100px' }}>
        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 12, fontWeight: 600,
        }}>Their rankings</div>

        {shows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 13, color: T.faint }}>No sets logged yet</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shows.map((show, i) => {
              const score     = showScore(show)
              const hasScore  = show.performance_rating != null && show.venue_rating != null && show.vibe_rating != null
              const rankLabel = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
              const isTop     = i === 0
              return (
                <div key={show.id} style={{
                  background: T.card, borderRadius: 5,
                  border: T.cardBorder,
                  boxShadow: isTop ? T.cardShadow : 'none',
                  overflow: 'hidden',
                }}>
                  <MediaGrid urls={resolveMediaUrls(show).map(resolvePhotoUrl)} maxHeight={220} />
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
                      </div>
                      <div style={{
                        fontSize: 10, color: T.muted, letterSpacing: '0.06em',
                        textTransform: 'uppercase', marginTop: 2, fontWeight: 600,
                      }}>{show.stage} · {show.day}</div>
                      <div style={{ fontSize: 10, color: T.accent, marginTop: 2, fontWeight: 600 }}>{rankLabel}</div>
                    </div>
                  </div>
                  {show.review && (
                    <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'rgba(74,53,40,0.65)', fontStyle: 'italic', lineHeight: 1.55 }}>
                      &ldquo;{show.review}&rdquo;
                    </div>
                  )}
                  {show.tags && show.tags.length > 0 && (
                    <div style={{ padding: '0 16px 14px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {show.tags.map((tag: string) => (
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
        )}

        <div style={{ marginTop: 32, textAlign: 'center' }}>
          <p style={{ fontSize: 11, color: T.faint, marginBottom: 12 }}>Want to rank your festival sets?</p>
          <a href="/" style={{
            display: 'inline-block',
            background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
            color: '#FAF3E2', borderRadius: 5, padding: '12px 24px',
            fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
            textTransform: 'uppercase', textDecoration: 'none', fontFamily: T.sans,
          }}>Join Gigl →</a>
        </div>
      </div>
    </div>
  )
}
