'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ARTISTS, ARTISTS_BY_DAY, DAY_DATES, type Artist } from '@/lib/artists'
import { createClient } from '@/lib/supabase/client'

type DayTab = 'friday' | 'saturday' | 'sunday'
type LogMap = Record<string, { reaction: string; elo: number }>

const DAY_LABELS: Record<DayTab, string> = {
  friday: 'Fri Apr 17',
  saturday: 'Sat Apr 18',
  sunday: 'Sun Apr 19',
}

export default function FeedPage() {
  const router  = useRouter()
  const supabase = createClient()

  const [activeDay, setActiveDay] = useState<DayTab>('friday')
  const [logs, setLogs]           = useState<LogMap>({})
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    async function fetchLogs() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return setLoading(false)

      const { data } = await supabase
        .from('show_logs')
        .select('artist_id, reaction, elo')
        .eq('user_id', user.id)

      if (data) {
        const map: LogMap = {}
        data.forEach(row => { map[row.artist_id] = { reaction: row.reaction, elo: row.elo } })
        setLogs(map)
      }
      setLoading(false)
    }
    fetchLogs()
  }, [])

  const artists = ARTISTS_BY_DAY[activeDay]
  const loggedCount = Object.keys(logs).length

  return (
    <div style={{
      minHeight: '100vh',
      background: '#131313',
      fontFamily: "'Manrope', sans-serif",
      color: '#f5ebe3',
      maxWidth: 430,
      margin: '0 auto',
    }}>
      {/* Top bar */}
      <div style={{ padding: '20px 24px 0' }}>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 24,
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#e0c0b2" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span style={{
            fontFamily: "'Noto Serif', Georgia, serif",
            fontSize: 15, fontWeight: 700, color: '#D35400',
            letterSpacing: '0.08em', textTransform: 'uppercase',
          }}>Gigl</span>
          <div style={{
            width: 30, height: 30, background: '#1e1e1e',
            borderRadius: '50%', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="#e0c0b2" strokeWidth="2">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </div>
        </div>

        {/* Hero headline */}
        <div style={{
          fontSize: 10, color: '#D35400', letterSpacing: '0.12em',
          textTransform: 'uppercase', marginBottom: 10,
        }}>Daily Curator</div>
        <div style={{
          fontFamily: "'Noto Serif', Georgia, serif",
          fontSize: 36, fontWeight: 700, lineHeight: 1.1,
          letterSpacing: '-0.02em', marginBottom: 8,
        }}>
          Your<br />
          <span style={{ color: '#D35400', fontStyle: 'italic' }}>Archive.</span>
        </div>
        <div style={{
          fontSize: 10, color: '#594238', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: 24,
        }}>
          {loggedCount} shows logged · Coachella W2
        </div>

        {/* Day tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
          {(['friday', 'saturday', 'sunday'] as DayTab[]).map(day => (
            <button
              key={day}
              onClick={() => setActiveDay(day)}
              style={{
                flex: 1,
                background: activeDay === day ? '#D35400' : '#1a1a1a',
                border: 'none', borderRadius: 10, padding: '8px 4px',
                cursor: 'pointer', transition: 'background 0.15s',
              }}
            >
              <div style={{
                fontSize: 9, fontWeight: 700, color: activeDay === day ? '#fff' : '#594238',
                letterSpacing: '0.08em', textTransform: 'uppercase',
                fontFamily: "'Manrope', sans-serif",
                lineHeight: 1.4,
              }}>
                {DAY_LABELS[day].split(' ').map((w, i) => (
                  <span key={i} style={{ display: 'block' }}>{w}</span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Artist list */}
      <div style={{ padding: '0 24px 100px' }}>
        <div style={{
          fontSize: 10, color: '#594238', letterSpacing: '0.1em',
          textTransform: 'uppercase', marginBottom: 14,
        }}>
          {DAY_LABELS[activeDay]} · {artists.length} artists
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {artists.map((artist, i) => {
            const logged = logs[artist.id]
            const isFirst = i === 0
            const isLast  = i === artists.length - 1

            return (
              <button
                key={artist.id}
                onClick={() => router.push(`/log/${artist.id}`)}
                style={{
                  background: i % 2 === 0 ? '#1a1a1a' : '#1e1e1e',
                  border: 'none',
                  borderRadius: isFirst
                    ? '12px 12px 2px 2px'
                    : isLast
                    ? '2px 2px 12px 12px'
                    : 2,
                  padding: '14px 16px',
                  display: 'flex', gap: 14, alignItems: 'center',
                  cursor: 'pointer', width: '100%', textAlign: 'left',
                  transition: 'background 0.1s',
                }}
              >
                {/* Score / status tile */}
                <div style={{
                  width: 44, height: 44, background: '#252220',
                  flexShrink: 0, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', borderRadius: 8,
                }}>
                  {logged ? (
                    <span style={{
                      fontFamily: "'Noto Serif', Georgia, serif",
                      fontSize: 16, fontWeight: 700, color: '#D35400',
                    }}>
                      {(logged.elo / 400 * 9 / 4 + 5).toFixed(1)}
                    </span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                      stroke="#353534" strokeWidth="1.5">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </div>

                {/* Artist info */}
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontFamily: "'Noto Serif', Georgia, serif",
                    fontSize: 15, fontWeight: 600,
                    color: logged ? '#f5ebe3' : '#a89880',
                    marginBottom: 3,
                  }}>
                    {artist.name}
                    {artist.headliner && (
                      <span style={{
                        marginLeft: 6, fontSize: 9, color: '#D35400',
                        letterSpacing: '0.06em', textTransform: 'uppercase',
                        fontFamily: "'Manrope', sans-serif",
                        verticalAlign: 'middle',
                      }}>★</span>
                    )}
                  </div>
                  <div style={{
                    fontSize: 10, color: '#594238',
                    letterSpacing: '0.06em', textTransform: 'uppercase',
                    fontFamily: "'Manrope', sans-serif",
                  }}>
                    {artist.stage} · {artist.startTime}
                  </div>
                </div>

                {/* Right badge */}
                {logged ? (
                  <div style={{
                    fontSize: 9, color: '#D35400', letterSpacing: '0.06em',
                    textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
                  }}>
                    Logged
                  </div>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                    stroke="#353534" strokeWidth="2">
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Bottom nav */}
      <div style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 430,
        background: '#0e0e0e', padding: '16px 24px',
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <NavItem icon="home" label="Home" active />
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
          <div style={{
            width: 36, height: 36, background: '#D35400', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: -18, cursor: 'pointer',
          }}
            onClick={() => router.push('/schedule')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <span style={{
            fontSize: 9, color: '#e0c0b2', letterSpacing: '0.08em',
            textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
          }}>Log</span>
        </div>
        <NavItem icon="rankings" label="Rankings" onClick={() => router.push('/rankings')} />
      </div>
    </div>
  )
}

function NavItem({
  icon, label, active, onClick,
}: {
  icon: 'home' | 'rankings'
  label: string
  active?: boolean
  onClick?: () => void
}) {
  const color = active ? '#D35400' : '#594238'
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: 'none', cursor: 'pointer',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
      }}
    >
      {icon === 'home' ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill={color} stroke="none">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
          stroke={color} strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      )}
      <span style={{
        fontSize: 9, color, letterSpacing: '0.08em',
        textTransform: 'uppercase', fontFamily: "'Manrope', sans-serif",
      }}>{label}</span>
    </button>
  )
}
