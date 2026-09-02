import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { DEFAULT_THEME as T } from '@/lib/theme'
import { computeShowScore } from '@/lib/rating'
import { StarDisplay } from '@/components/StarDisplay'

function dayLabel(d: string) {
  if (!d) return ''
  return d.charAt(0).toUpperCase() + d.slice(1)
}

export default async function StagePage({ params }: { params: { stageName: string } }) {
  const stageName = decodeURIComponent(params.stageName)

  const { data: logs } = await supabase
    .from('logged_shows')
    .select('artist_id, artist_name, performance_rating, venue_rating, crowd_rating, day')
    .eq('stage', stageName)

  if (!logs || logs.length === 0) notFound()

  const map: Record<string, { name: string; scores: number[]; day: string }> = {}
  logs.forEach(l => {
    if (l.performance_rating == null || l.venue_rating == null || l.crowd_rating == null) return
    if (!map[l.artist_id]) {
      map[l.artist_id] = { name: l.artist_name ?? 'Unknown', scores: [], day: l.day ?? '' }
    }
    map[l.artist_id].scores.push(computeShowScore(l.performance_rating, l.venue_rating, l.crowd_rating))
  })

  const rows = Object.entries(map)
    .map(([artist_id, v]) => ({
      artist_id,
      name:     v.name,
      day:      v.day,
      avgScore: v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
      count:    v.scores.length,
    }))
    .sort((a, b) => b.avgScore - a.avgScore)

  if (rows.length === 0) notFound()

  const totalRatings = rows.reduce((sum, r) => sum + r.count, 0)

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
          {rows.length} {rows.length === 1 ? 'artist' : 'artists'} · {totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'}
        </div>
        <div style={{
          fontFamily: T.serif, fontSize: 30, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 20, color: '#4A3528',
        }}>
          {stageName}<br />
          <span style={{ fontSize: 22 }}>on the ground</span><span style={{ color: T.accent, fontSize: 22 }}>.</span>
        </div>
      </div>

      {/* ── Artist list ──────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 100px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {rows.map((row, i) => (
            <a
              key={row.artist_id}
              href={`/artist/${row.artist_id}`}
              style={{
                background: i % 2 === 0 ? T.card : T.cardAlt,
                border: T.cardBorder,
                borderRadius: i === 0 ? '5px 5px 3px 3px'
                  : i === rows.length - 1 ? '3px 3px 5px 5px' : 3,
                boxShadow: i === 0 ? T.cardShadow : 'none',
                padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                textDecoration: 'none',
              }}
            >
              {/* Rank */}
              <div style={{
                width: 24, flexShrink: 0, textAlign: 'center',
                fontFamily: T.serif,
                fontSize: i < 3 ? 18 : 12,
                color: i < 3 ? T.accent : T.faint,
                fontWeight: 700,
              }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                  <span style={{
                    fontFamily: T.serif, fontSize: 14, fontWeight: 700,
                    color: '#4A3528', letterSpacing: '-0.3px',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    minWidth: 0,
                  }}>{row.name}</span>
                  <StarDisplay score={row.avgScore} size={17} accent={T.accent} />
                </div>
                <div style={{
                  fontSize: 9, color: T.muted, letterSpacing: '0.06em',
                  textTransform: 'uppercase', fontWeight: 600,
                }}>
                  {row.day ? dayLabel(row.day) + ' · ' : ''}{row.count} {row.count === 1 ? 'rating' : 'ratings'}
                </div>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}
