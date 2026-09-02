'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { useTheme } from '@/components/FestivalThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'

interface Show {
  id: string
  artist: string
  support?: string[]
  venue: string
  city: string
  state: string
  date: string
  emoji: string
}

const SEARCH_DEBOUNCE_MS = 350

export default function SelectShowPage() {
  const router   = useRouter()
  const supabase = createClient()
  const T = useTheme()
  const { user, loading: authLoading } = useAuth()

  const [isSwitching, setIsSwitching] = useState(false)
  const [query, setQuery] = useState('')

  const [results, setResults] = useState<Show[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(false)
  const [retryToken, setRetryToken] = useState(0)

  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [authLoading, user, router])

  useEffect(() => {
    setIsSwitching(!!localStorage.getItem(LOCAL_STORAGE_KEY))
  }, [])

  // Debounced so typing doesn't fire a request per keystroke — a cleared or
  // empty query still fetches (the trending/browse list), but fires
  // immediately rather than waiting out the debounce, so first paint and
  // "backspaced to empty" don't sit on an artificial delay.
  useEffect(() => {
    const trimmed = query.trim()
    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      setLoading(true)
      setError(false)
      try {
        const res = await fetch(`/api/shows/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        if (!res.ok) throw new Error(`search failed: ${res.status}`)
        const data = await res.json()
        setResults(data.shows ?? [])
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('show search failed:', err)
          setError(true)
          setResults([])
        }
      } finally {
        setLoading(false)
      }
    }, trimmed ? SEARCH_DEBOUNCE_MS : 0)

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [query, retryToken])

  function select(show: Show) {
    localStorage.setItem(LOCAL_STORAGE_KEY, show.id)

    // Best-effort, fire-and-forget — this is only needed so the SMS webhook
    // (which has no access to a browser's localStorage) knows which show
    // to match artist names against. The in-app UI never depends on this
    // write completing.
    // NOTE: active_festival_id is a holdover column name from the
    // festival-only model — it's being repurposed here to hold whichever
    // show id the person picked. Renaming it is a backend follow-up.
    if (user) {
      supabase.from('profiles').update({ active_festival_id: show.id }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('active_festival_id update failed:', error.message)
      })
    }

    router.push('/feed')
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: '#4A3528',
      fontFamily: T.sans,
      maxWidth: 430,
      margin: '0 auto',
    }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{
        padding: '52px 24px 24px',
        borderBottom: '1px solid rgba(74,53,40,0.1)',
      }}>
        {isSwitching && (
          <button
            onClick={() => router.push('/feed')}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
        )}

        <div style={{
          fontFamily: T.serif, fontSize: 26, fontWeight: 700,
          color: '#4A3528', letterSpacing: '-0.5px', marginBottom: 20,
        }}>
          Gigl<span style={{ color: T.accent }}>/</span>
        </div>

        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.14em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 8,
        }}>Find your show</div>

        <div style={{
          fontFamily: T.serif, fontSize: 30, fontWeight: 700,
          lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 10, color: '#4A3528',
        }}>
          What are you<br />
          <span>seeing</span><span style={{ color: T.accent }}>?</span>
        </div>

        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.6, marginBottom: 20 }}>
          Any artist, venue, or city — we&apos;ll pull it up so you can start logging sets.
        </div>

        {/* ── Search ────────────────────────────────────────────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: T.card, border: T.cardBorder, borderRadius: 5,
          padding: '12px 14px',
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search artist, venue, or city"
            style={{
              flex: 1, border: 'none', outline: 'none', background: 'transparent',
              fontFamily: T.sans, fontSize: 14, color: '#4A3528',
            }}
          />
        </div>
      </div>

      {/* ── Show list ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: '20px 24px 100px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{
          fontSize: 10, color: T.muted, letterSpacing: '0.12em',
          textTransform: 'uppercase', fontWeight: 700, marginBottom: 2,
        }}>
          {query.trim() ? `Results for "${query.trim()}"` : 'Upcoming'}
        </div>

        {loading && (
          <>
            {[0, 1, 2, 3].map(i => (
              <div key={i} style={{
                background: T.card, border: T.cardBorder, borderRadius: 5,
                padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 16,
              }}>
                <div className="shimmer" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div className="shimmer" style={{ width: '55%', height: 16, borderRadius: 3 }} />
                  <div className="shimmer" style={{ width: '75%', height: 10, borderRadius: 3 }} />
                </div>
              </div>
            ))}
          </>
        )}

        {!loading && error && (
          <div style={{
            background: T.card, border: `1.5px dashed ${T.muted}`, borderRadius: 5,
            padding: '20px', textAlign: 'center', fontSize: 13, color: T.muted,
          }}>
            Couldn&apos;t load shows right now.
            <button
              onClick={() => setRetryToken(t => t + 1)}
              style={{
                display: 'block', margin: '10px auto 0', background: 'none', border: 'none',
                color: T.accent, fontFamily: T.sans, fontSize: 12, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.08em', cursor: 'pointer', padding: 0,
              }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <div style={{
            background: T.card, border: `1.5px dashed ${T.muted}`, borderRadius: 5,
            padding: '20px', textAlign: 'center', fontSize: 13, color: T.muted,
          }}>
            {query.trim()
              ? <>No shows matched &quot;{query.trim()}&quot; yet.</>
              : 'No upcoming shows to show right now.'}
          </div>
        )}

        {!loading && !error && results.map(s => (
          <button
            key={s.id}
            onClick={() => select(s)}
            style={{
              background: T.card,
              border: T.cardBorder,
              boxShadow: 'none',
              borderRadius: 5,
              padding: '18px 20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 16,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'box-shadow 0.15s ease',
            }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = T.cardShadow)}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
          >
            <div style={{ fontSize: 28, lineHeight: 1, marginTop: 2, flexShrink: 0 }}>{s.emoji}</div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.serif, fontSize: 18, fontWeight: 700,
                color: '#4A3528', letterSpacing: '-0.5px', marginBottom: 3, lineHeight: 1.2,
              }}>{s.artist}</div>

              <div style={{
                fontSize: 10, color: T.muted, letterSpacing: '0.08em',
                textTransform: 'uppercase', fontFamily: T.sans,
                fontWeight: 600, marginBottom: s.support ? 10 : 0,
              }}>
                {s.date} · {s.venue} · {s.city}, {s.state}
              </div>

              {s.support && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                  {s.support.map(h => (
                    <span key={h} style={{
                      fontSize: 10, padding: '3px 10px', borderRadius: 20,
                      background: T.accentDim,
                      color: T.accent,
                      border: `1.5px solid ${T.accentBorder}`,
                      fontFamily: T.sans, fontWeight: 600,
                    }}>{h}</span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ flexShrink: 0, marginTop: 4 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </div>
          </button>
        ))}

        {/* ── Can't find it — disabled / coming soon ─────────────────────────── */}
        <div
          aria-disabled="true"
          style={{
            background: T.card,
            border: `1.5px dashed ${T.muted}`,
            borderRadius: 5,
            padding: '18px 20px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
            textAlign: 'left',
            width: '100%',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(139,117,96,0.12)',
            border: '1px solid rgba(139,117,96,0.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0, marginTop: 2,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontFamily: T.serif, fontSize: 18, fontWeight: 700,
              color: T.muted, letterSpacing: '-0.5px', marginBottom: 3, lineHeight: 1.2,
            }}>Can&apos;t find your show?</div>

            <div style={{
              fontSize: 10, color: T.faint, letterSpacing: '0.08em',
              textTransform: 'uppercase', fontFamily: T.sans,
              fontWeight: 600,
            }}>
              Add it yourself — coming soon
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
