'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getFestival, LOCAL_STORAGE_KEY, type Festival } from '@/lib/festivals'
import { createClient } from '@/lib/supabase/client'
import { StarDisplay } from '@/components/StarDisplay'
import { BattleModeCard } from '@/components/BattleModeCard'
import { BattleRecordBadge } from '@/components/BattleRecordBadge'
import { useTheme } from '@/components/FestivalThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import { timeQuery } from '@/lib/queryTiming'
import { aggregateArtistRows, RANKINGS_SELECT, type ArtistRow } from '@/lib/rankings'

export type { ArtistRow }

export function RankingsClient({ initialRows }: { initialRows: ArtistRow[] }) {
  const router   = useRouter()
  const supabase = createClient()
  const T = useTheme()
  const { user, loading: authLoading } = useAuth()

  const [rows, setRows]         = useState<ArtistRow[]>(initialRows)
  const [festival, setFestival] = useState<Festival | null>(null)
  const [filter, setFilter]     = useState<string>('all')
  const [battleModeUnlocked, setBattleModeUnlocked]   = useState(false)
  const [battleCardDismissed, setBattleCardDismissed] = useState(false)
  const [battleAggMap, setBattleAggMap] = useState<Record<string, { wins: number; losses: number }>>({})

  // Rankings has no built-in refresh — a visitor only ever saw a snapshot
  // from the moment they loaded the page. Subscribe to every insert/update/
  // delete on logged_shows and re-aggregate so a new rating anywhere shows
  // up here live, without the visitor needing to reload.
  useEffect(() => {
    const channel = supabase
      .channel('rankings-logged_shows')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'logged_shows' }, async () => {
        const { data, error } = await timeQuery('rankings:realtime-refetch', supabase
          .from('logged_shows')
          .select(RANKINGS_SELECT))
        if (!error) setRows(aggregateArtistRows(data))
      })
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    const id = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (id) {
      const f = getFestival(id)
      if (f) setFestival(f)
    }
  }, [])

  // Rankings is server-rendered and user-agnostic, so battle_mode_unlocked/
  // battle_card_dismissed (needed only for the entry-point card below) are
  // fetched client-side.
  useEffect(() => {
    if (!user) return
    timeQuery('rankings:profiles', supabase.from('profiles').select('battle_mode_unlocked, battle_card_dismissed').eq('id', user.id).single())
      .then(({ data }) => {
        setBattleModeUnlocked(!!data?.battle_mode_unlocked)
        // Ratchet, never downgrade: AuthProvider hands out a new `user`
        // object on every auth event (including background token refreshes),
        // re-running this fetch — it must never un-dismiss a card the user
        // already closed this session (same fix as the feed page's card).
        setBattleCardDismissed(prev => prev || !!data?.battle_card_dismissed)
      })
  }, [user])

  function dismissBattleCard() {
    setBattleCardDismissed(true)
    if (user) {
      void supabase.from('profiles').update({ battle_card_dismissed: true }).eq('id', user.id)
    }
  }

  // The rows already arrived pre-computed from the server component — this
  // check only exists to bounce unauthenticated visitors, it never gates
  // the data itself.
  useEffect(() => {
    if (!authLoading && !user) router.push('/')
  }, [authLoading, user, router])

  // All-time record per artist, aggregated across every user's battles - a
  // public consensus view, same treatment as Feed, never any one user's own
  // record (that's Profile's job).
  useEffect(() => {
    const artistIds = rows.map(r => r.artist_id)
    if (artistIds.length === 0) return
    timeQuery(`rankings:battle_records(${artistIds.length} artists)`, supabase.from('battle_records').select('artist_id, wins, losses').in('artist_id', artistIds))
      .then(({ data }) => {
        const map: Record<string, { wins: number; losses: number }> = {}
        data?.forEach(r => {
          const cur = map[r.artist_id] ?? { wins: 0, losses: 0 }
          map[r.artist_id] = { wins: cur.wins + r.wins, losses: cur.losses + r.losses }
        })
        setBattleAggMap(map)
      })
  }, [rows])

  // rows starts from the server-rendered snapshot and is kept current by the
  // realtime subscription above; scope it here to whichever festival is
  // currently selected (RankingsPage has no access to the client's
  // localStorage festival selection), same as the day filter below, so
  // ratings from one festival never bleed into another's leaderboard.
  const festivalArtistIds = festival ? new Set(festival.artists.map(a => a.id)) : null
  const scopedRows = festivalArtistIds ? rows.filter(r => festivalArtistIds.has(r.artist_id)) : rows

  const days    = festival ? ['all', ...festival.days] : ['all', 'friday', 'saturday', 'sunday']
  const visible = filter === 'all' ? scopedRows : scopedRows.filter(r => r.day === filter)

  function dayLabel(d: string) {
    if (festival?.dayDates[d]) return festival.dayDates[d]
    return d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3)
  }

  const festivalLabel = festival ? `${festival.emoji} ${festival.shortName} ${festival.dates.slice(-4)}` : 'Festival Season 2026'

  return (
    <div style={{
      minHeight: '100vh', background: T.bg,
      fontFamily: T.sans, color: '#4A3528',
      maxWidth: 430, margin: '0 auto',
    }}>

      {/* ── Top bar: logo · festival pill · switch/sign-out — one row ────────── */}
      <div style={{
        padding: '11px 20px',
        position: 'sticky', top: 0, zIndex: 10,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(74,53,40,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 11,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          {T.logoUrl ? (
            <img
              src={T.logoUrl}
              alt="Festival"
              style={{ height: 20, objectFit: 'contain', filter: T.logoFilter, flexShrink: 0 }}
            />
          ) : (
            <div style={{
              fontFamily: T.serif, fontSize: 19, fontWeight: 700,
              color: '#4A3528', letterSpacing: '-0.5px', flexShrink: 0,
            }}>
              Gigl<span style={{ color: T.accent }}>/</span>
            </div>
          )}

          <button
            onClick={() => router.push('/select-festival')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              display: 'flex', alignItems: 'center', gap: 3, minWidth: 0,
            }}
          >
            <span style={{
              fontSize: 11, color: T.accent, letterSpacing: '0.1em',
              textTransform: 'uppercase', fontWeight: 700,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>{festivalLabel}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="3" style={{ flexShrink: 0 }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexShrink: 0 }}>
          <button
            onClick={() => router.push('/select-festival')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: T.accent, fontSize: 10, fontFamily: T.sans, letterSpacing: '0.06em', fontWeight: 600,
            }}
          >switch fest</button>
          <span style={{ fontSize: 10, color: T.faint }}>·</span>
          <button
            onClick={async () => { await supabase.auth.signOut(); localStorage.removeItem(LOCAL_STORAGE_KEY); router.push('/') }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: T.muted, fontSize: 10, fontFamily: T.sans, letterSpacing: '0.06em',
            }}
          >sign out</button>
        </div>
      </div>

      {/* ── Activity / Rankings tab toggle — slim pill ────────────────────────── */}
      <div style={{ padding: '9px 20px 8px' }}>
        <div style={{
          display: 'flex',
          border: '2px solid #4A3528',
          borderRadius: 5,
          overflow: 'hidden',
          marginBottom: 8,
        }}>
          <button
            onClick={() => router.push('/feed')}
            style={{
              flex: 1, padding: '6px 0',
              background: T.card, border: 'none',
              borderRight: '2px solid #4A3528',
              color: '#4A3528', fontSize: 10, cursor: 'pointer',
              fontFamily: T.sans, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}
          >Activity</button>
          <button style={{
            flex: 1, padding: '6px 0',
            background: '#4A3528', border: 'none',
            color: '#FAF3E2', fontSize: 10, cursor: 'default',
            fontFamily: T.sans, fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>Rankings</button>
        </div>

        {/* Day filter — the dates, right below the header/tabs and above the list */}
        <div style={{ display: 'flex', gap: 6 }}>
          {days.map(d => (
            <button key={d} onClick={() => setFilter(d)} style={{
              flex: 1, padding: '6px 0', borderRadius: 4,
              background: filter === d ? T.accentDim : 'transparent',
              border: filter === d ? `1.5px solid ${T.accentBorder}` : '1.5px solid rgba(74,53,40,0.15)',
              color: filter === d ? T.accent : T.muted,
              fontSize: 9, cursor: 'pointer',
              fontFamily: T.sans, fontWeight: filter === d ? 700 : 500,
              letterSpacing: '0.08em', textTransform: 'uppercase',
            }}>
              {d === 'all' ? 'All' : dayLabel(d)}
            </button>
          ))}
        </div>
      </div>

      {/* ── List ────────────────────────────────────────────────────────────── */}
      <div style={{ padding: '0 24px 100px' }}>
        {battleModeUnlocked && !battleCardDismissed && (
          <BattleModeCard onDismiss={dismissBattleCard} onEnter={() => router.push('/battle')} />
        )}

        {visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, fontSize: 13, color: T.faint }}>
            No ratings yet
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {visible.map((row, i) => {
            const isTop = i === 0
            return (
              <div
                key={row.artist_id}
                onClick={() => router.push(`/artist/${row.artist_id}`)}
                style={{
                  background: i % 2 === 0 ? T.card : T.cardAlt,
                  border: T.cardBorder,
                  borderRadius: i === 0 ? '5px 5px 3px 3px'
                    : i === visible.length - 1 ? '3px 3px 5px 5px' : 3,
                  boxShadow: isTop ? T.cardShadow : 'none',
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
                    {battleAggMap[row.artist_id] && (
                      <BattleRecordBadge
                        wins={battleAggMap[row.artist_id].wins}
                        losses={battleAggMap[row.artist_id].losses}
                        unlocked={battleModeUnlocked}
                        context="aggregate"
                        artistName={row.name}
                      />
                    )}
                  </div>
                  <div style={{
                    fontSize: 9, color: T.muted, letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontWeight: 600,
                  }}>
                    {row.stage && (
                      <span
                        onClick={e => { e.stopPropagation(); router.push(`/stage/${encodeURIComponent(row.stage)}`) }}
                        style={{ cursor: 'pointer' }}
                      >{row.stage}</span>
                    )}
                    {row.day ? ` · ${dayLabel(row.day)}` : ''} · {row.count} {row.count === 1 ? 'rating' : 'ratings'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Bottom nav ───────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1.5px solid rgba(74,53,40,0.15)',
        padding: '12px 32px 16px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <button onClick={() => router.push('/feed')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill={T.accent} stroke="none">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 8, color: T.accent, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700 }}>Home</span>
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div onClick={() => router.push('/log')} style={{
            width: 38, height: 38, background: T.accent, borderRadius: '50%',
            border: '1.5px solid #4A3528', boxShadow: '2px 2px 0 #4A3528',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -16, cursor: 'pointer',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{ fontSize: 8, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>Log</span>
        </div>

        <button onClick={() => router.push('/profile')} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <span style={{ fontSize: 8, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>You</span>
        </button>
      </div>
    </div>
  )
}
