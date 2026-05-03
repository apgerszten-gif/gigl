'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFestival, LOCAL_STORAGE_KEY, type Festival } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { eloToDisplay } from '@/lib/elo'
import { useTheme } from '@/components/FestivalThemeProvider'

interface ArtistRow {
  artist_id: string
  name: string
  stage: string
  day: string
  avgScore: number
  count: number
}

function scoreColor(n: number, accent: string) {
  if (n >= 9) return '#F5A623'
  if (n >= 7.5) return accent
  if (n >= 6) return '#e0a060'
  return 'rgba(255,255,255,0.3)'
}

export default function RankingsPage() {
  const router = useRouter()
  const supabase = createClient()
  const T = useTheme()

  const [rows, setRows] = useState<ArtistRow[]>([])
  const [loading, setLoading] = useState(true)
  const [festival, setFestival] = useState<Festival | null>(null)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    const id = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (id) {
      const f = getFestival(id)
      if (f) setFestival(f)
    }
  }, [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }

      const { data: logs } = await supabase
        .from('logged_shows')
        .select('artist_id, elo, artist_name, stage, day')

      if (!logs) { setLoading(false); return }

      const map: Record<string, { scores: number[]; name: string; stage: string; day: string }> = {}
      logs.forEach(l => {
        if (!map[l.artist_id]) {
          map[l.artist_id] = {
            scores: [],
            name: l.artist_name ?? 'Unknown',
            stage: l.stage ?? '',
            day: l.day ?? '',
          }
        }
        map[l.artist_id].scores.push(parseFloat(eloToDisplay(l.elo)))
      })

      const result: ArtistRow[] = Object.entries(map)
        .map(([artist_id, v]) => ({
          artist_id,
          name: v.name,
          stage: v.stage,
          day: v.day,
          avgScore: v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
          count: v.scores.length,
        }))
        .sort((a, b) => b.avgScore - a.avgScore)

      setRows(result)
      setLoading(false)
    }
    load()
  }, [])

  const days = festival ? ['all', ...festival.days] : ['all', 'friday', 'saturday', 'sunday']
  const visible = filter === 'all' ? rows : rows.filter(r => r.day === filter)

  function dayLabel(d: string) {
    if (festival?.dayDates[d]) return festival.dayDates[d]
    return d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)
  }

  const festivalLabel = festival ? `${festival.shortName} ${festival.dates.slice(-4)}` : 'Festival Season 2026'

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      fontFamily: T.sans, color: '#ffffff',
      maxWidth: 430, margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{
        padding: '20px 24px 16px',
        position: 'sticky', top: 0, background: T.bgRgba, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', zIndex: 10,
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        {T.logoUrl ? (
          <img src={T.logoUrl} alt="Festival" style={{ height: 22, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
        ) : (
          <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: T.accent, letterSpacing: '0.04em' }}>Gigl</div>
        )}
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/auth') }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px 8px', color: 'rgba(255,255,255,0.25)', fontSize: 11, fontFamily: T.sans, letterSpacing: '0.06em' }}
        >sign out</button>
      </div>

      {/* Header */}
      <div style={{ padding: '20px 24px 8px' }}>
        <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>
          {festivalLabel}
        </div>
        <div style={{
          fontFamily: T.serif,
          fontSize: 28, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 16,
        }}>
          Artist<br />
          <span style={{ color: T.accent, fontStyle: 'italic' }}>rankings.</span>
        </div>

        {/* Activity / Rankings tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          <button onClick={() => router.push('/feed')} style={{
            flex: 1, padding: '8px 0', borderRadius: 4,
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.35)', fontSize: 11, cursor: 'pointer',
            fontFamily: T.sans, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>Activity</button>
          <button style={{
            flex: 1, padding: '8px 0', borderRadius: 4,
            background: T.accent, border: 'none',
            color: '#fff', fontSize: 11, cursor: 'default',
            fontFamily: T.sans, fontWeight: 700,
            letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>Rankings</button>
        </div>

        {/* Day filter */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
          {days.map(d => (
            <button key={d} onClick={() => setFilter(d)} style={{
              flex: 1, padding: '6px 0', borderRadius: 4,
              background: filter === d ? T.accentDim : 'transparent',
              border: filter === d ? `1px solid ${T.accentBorder}` : '1px solid rgba(255,255,255,0.06)',
              color: filter === d ? T.accent : T.muted,
              fontSize: 9, cursor: 'pointer',
              fontFamily: T.sans, letterSpacing: '0.06em', textTransform: 'uppercase',
            }}>
              {d === 'all' ? 'All' : dayLabel(d)}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ padding: '0 24px 100px' }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 12, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Loading...
          </div>
        )}
        {!loading && visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 13, color: T.faint }}>
            No ratings yet
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visible.map((row, i) => (
            <div
              key={row.artist_id}
              onClick={() => router.push(`/artist/${row.artist_id}`)}
              style={{
                background: i % 2 === 0 ? T.card : T.cardAlt,
                borderRadius: i === 0 ? '4px 4px 2px 2px'
                  : i === visible.length - 1 ? '2px 2px 4px 4px' : 2,
                padding: '13px 16px',
                display: 'flex', alignItems: 'center', gap: 12,
                cursor: 'pointer',
              }}
            >
              {/* Rank */}
              <div style={{
                width: 24, flexShrink: 0, textAlign: 'center',
                fontFamily: T.serif,
                fontSize: i < 3 ? 18 : 12,
                color: i < 3 ? '#ffffff' : T.faint,
              }}>
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontFamily: T.serif,
                  fontSize: 14, fontWeight: 600, color: '#ffffff',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>{row.name}</div>
                <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>
                  {row.stage}{row.day ? ` · ${dayLabel(row.day)}` : ''} · {row.count} {row.count === 1 ? 'rating' : 'ratings'}
                </div>
              </div>

              {/* Score */}
              <div style={{
                width: 40, height: 40, background: T.cardInner, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
              }}>
                <span style={{
                  fontFamily: T.serif,
                  fontSize: 15, fontWeight: 700,
                  color: scoreColor(row.avgScore, T.accent), lineHeight: 1,
                }}>{row.avgScore.toFixed(1)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: T.bgRgba, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderTop: '1px solid rgba(255,255,255,0.07)', padding: '16px 32px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <button onClick={() => router.push('/feed')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill={T.accent} stroke="none">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 9, color: T.accent, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>Home</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div onClick={() => router.push('/log')} style={{
            width: 40, height: 40, background: T.accent, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -20, cursor: 'pointer', boxShadow: `0 4px 16px ${T.accentGlow}`,
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: 9, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>Log</span>
        </div>

        <button onClick={() => router.push('/profile')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{ fontSize: 9, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>You</span>
        </button>
      </div>
    </div>
  )
}
