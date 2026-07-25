'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/FestivalThemeProvider'
import { StarDisplay } from '@/components/StarDisplay'

const DURATION_MS = 10000
const SCENE_COUNT = 4

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

// ── Mock data (fictional — this is the very first thing a new visitor sees,
// so we invent a lineup rather than borrowing real artists' names/likeness) ──

const RANKING_ROWS = [
  { medal: '🥇', name: 'Nova Wilder',    stage: 'Sunset Stage', day: 2, score: 4.9 },
  { medal: '🥈', name: 'The Salt Flats', stage: 'North Field',  day: 1, score: 4.7 },
  { medal: '🥉', name: 'Glass Coyote',   stage: 'Main Stage',   day: 3, score: 4.6 },
  { medal: '4',  name: 'Midnight Radio', stage: 'The Grove',    day: 2, score: 4.4 },
  { medal: '5',  name: 'Paper Static',   stage: 'East Tent',    day: 1, score: 4.2 },
  { medal: '6',  name: 'Halogen Youth',  stage: 'Sunset Stage', day: 3, score: 4.1 },
]

const LOG_ARTISTS = [
  { name: 'Nova Wilder',    stage: 'Sunset Stage' },
  { name: 'The Salt Flats', stage: 'North Field' },
  { name: 'Glass Coyote',   stage: 'Main Stage' },
  { name: 'Midnight Radio', stage: 'The Grove' },
  { name: 'Paper Static',   stage: 'East Tent' },
  { name: 'Halogen Youth',  stage: 'Sunset Stage' },
]

const REACTION_BARS = [
  { label: 'Loved it 👍',   pct: 68, keyframe: 'fillLoved' },
  { label: 'It was ok 🤷',  pct: 24, keyframe: 'fillOk' },
  { label: 'Kinda wack 👎', pct: 8,  keyframe: 'fillWack' },
]

const REVIEW_SNIPPETS = [
  { user: '@festivalrat', score: 5,   quote: 'peaked at the drop — room went completely sideways' },
  { user: '@nightowl22',  score: 4.5, quote: 'best surprise of the whole lineup, no notes' },
]

function SceneWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: `${100 / SCENE_COUNT}%`, width: '100%', overflow: 'hidden', position: 'relative' }}>
      {children}
    </div>
  )
}

// A brief tap indicator, absolutely positioned relative to its own
// `position: relative` parent, timed to a fixed point on the demo's clock.
function TapDot({ delay }: { delay: number }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%',
      width: 24, height: 24,
      borderRadius: '50%', background: 'rgba(74,53,40,0.35)',
      border: '2px solid rgba(74,53,40,0.55)',
      opacity: 0, pointerEvents: 'none', zIndex: 5,
      animation: `tapDotPulse 0.6s ease-out ${delay}s forwards`,
    }} />
  )
}

// Stars that pop in one at a time (as if being tapped in), rather than
// rendering fully-formed the way the static StarDisplay does.
function TapStars({ count, size, accent, delay, stagger = 0.12 }: {
  count: number; size: number; accent: string; delay: number; stagger?: number
}) {
  return (
    <div style={{ display: 'inline-flex', gap: 2 }}>
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} style={{ position: 'relative', width: size, height: size, display: 'inline-block', flexShrink: 0 }}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" style={{ display: 'block' }}>
            <polygon points={STAR_POINTS} />
          </svg>
          {i < count && (
            <span style={{
              position: 'absolute', top: 0, left: 0, width: size, height: size,
              opacity: 0, transform: 'scale(0.4)',
              animation: `starPop 0.25s ease-out ${delay + i * stagger}s forwards`,
            }}>
              <svg width={size} height={size} viewBox="0 0 24 24" fill={accent} stroke={accent} strokeWidth="1.5" style={{ display: 'block' }}>
                <polygon points={STAR_POINTS} />
              </svg>
            </span>
          )}
        </span>
      ))}
    </div>
  )
}

// ── Scene 1: Rankings ─────────────────────────────────────────────────────────

function RankingsScene({ T }: { T: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ padding: '28px 24px', height: '100%', boxSizing: 'border-box', background: T.bg, overflow: 'hidden' }}>
      <div style={{
        fontSize: 10, color: T.accent, letterSpacing: '0.14em',
        textTransform: 'uppercase', fontWeight: 700, marginBottom: 4, fontFamily: T.sans,
      }}>Live leaderboard</div>
      <div style={{
        fontFamily: T.serif, fontSize: 24, fontWeight: 700,
        letterSpacing: '-0.02em', marginBottom: 16, color: '#4A3528',
      }}>
        The crowd decides<span style={{ color: T.accent }}>.</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, animation: 'scene1Scroll 1.6s ease-in-out 0.2s forwards' }}>
        {RANKING_ROWS.map((r, i) => (
          <div key={r.name} style={{
            background: i % 2 === 0 ? T.card : T.cardAlt,
            border: T.cardBorder,
            borderRadius: i === 0 ? '5px 5px 3px 3px' : i === RANKING_ROWS.length - 1 ? '3px 3px 5px 5px' : 3,
            boxShadow: i === 0 ? T.cardShadow : 'none',
            padding: '9px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 18, textAlign: 'center', flexShrink: 0, fontFamily: T.serif,
              fontSize: i < 3 ? 14 : 11, color: i < 3 ? T.accent : T.faint, fontWeight: 700,
            }}>{r.medal}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: T.serif, fontSize: 12, fontWeight: 700, color: '#4A3528',
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>{r.name}</div>
              <div style={{ fontSize: 8, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>
                {r.stage} · Day {r.day}
              </div>
            </div>
            <StarDisplay score={r.score} size={12} accent={T.accent} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Scene 2: Log a show (artist picker) ────────────────────────────────────────

function LogScene({ T }: { T: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ padding: '28px 24px', height: '100%', boxSizing: 'border-box', background: T.bg }}>
      <div style={{
        fontSize: 10, color: T.accent, letterSpacing: '0.14em',
        textTransform: 'uppercase', fontWeight: 700, marginBottom: 4, fontFamily: T.sans,
      }}>Right after the set</div>
      <div style={{
        fontFamily: T.serif, fontSize: 24, fontWeight: 700,
        letterSpacing: '-0.02em', marginBottom: 16, color: '#4A3528',
      }}>
        Log it in seconds<span style={{ color: T.accent }}>.</span>
      </div>
      <div style={{ display: 'flex', border: '2px solid #4A3528', borderRadius: 5, overflow: 'hidden', marginBottom: 14 }}>
        {['FRI', 'SAT', 'SUN'].map((d, i) => (
          <div key={d} style={{ position: 'relative', flex: 1, borderLeft: i > 0 ? '2px solid #4A3528' : 'none' }}>
            <div style={{
              padding: '6px 0', textAlign: 'center',
              background: T.card, color: T.muted,
              fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: T.sans,
              ...(i === 1 ? { animation: 'dayTabActivate 0.2s ease-out 2.7s forwards' } : {}),
            }}>{d}</div>
            {i === 1 && <TapDot delay={2.6} />}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {LOG_ARTISTS.map((a, i) => {
          const isTapped = i === 1
          return (
            <div key={a.name} style={{
              position: 'relative',
              background: i % 2 === 0 ? T.card : T.cardAlt,
              borderWidth: 1.5, borderStyle: 'solid', borderColor: '#4A3528',
              borderRadius: i === 0 ? '5px 5px 3px 3px' : i === LOG_ARTISTS.length - 1 ? '3px 3px 5px 5px' : 3,
              padding: '10px 12px',
              display: 'flex', alignItems: 'center', gap: 10,
              ...(isTapped ? { animation: 'rowTapActivate 0.3s ease-out 3.7s forwards' } : {}),
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 12, fontWeight: 700, color: '#4A3528' }}>{a.name}</div>
                <div style={{ fontSize: 8, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>{a.stage}</div>
              </div>
              {isTapped && (
                <div style={{
                  width: 18, height: 18, borderRadius: '50%', background: T.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  opacity: 0, animation: 'fadeIn 0.25s ease-out 3.8s forwards',
                }}>
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              {isTapped && <TapDot delay={3.6} />}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Scene 3: Rate the show ──────────────────────────────────────────────────────

function RateScene({ T }: { T: ReturnType<typeof useTheme> }) {
  const rows = [
    { label: 'Performance', count: 5, dotDelay: 5.4, starDelay: 5.5 },
    { label: 'Venue',       count: 4, dotDelay: 6.15, starDelay: 6.25 },
    { label: 'Vibe',        count: 5, dotDelay: 6.85, starDelay: 6.95 },
  ]
  return (
    <div style={{ padding: '28px 24px', height: '100%', boxSizing: 'border-box', background: T.bg }}>
      <div style={{
        fontSize: 10, color: T.accent, letterSpacing: '0.14em',
        textTransform: 'uppercase', fontWeight: 700, marginBottom: 4, fontFamily: T.sans,
      }}>The Salt Flats</div>
      <div style={{
        fontFamily: T.serif, fontSize: 20, fontWeight: 700,
        letterSpacing: '-0.02em', marginBottom: 18, color: '#4A3528',
      }}>North Field · Sat</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {rows.map(row => (
          <div key={row.label} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: '#4A3528' }}>{row.label}</div>
            <TapStars count={row.count} size={18} accent={T.accent} delay={row.starDelay} />
            <TapDot delay={row.dotDelay} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {[{ label: 'Crowd surf', active: true }, { label: 'Sing along', active: false }, { label: 'Cool lighting', active: false }].map(tag => (
          <div key={tag.label} style={{
            position: 'relative',
            fontSize: 10, padding: '5px 11px', borderRadius: 20,
            background: 'none', color: T.muted,
            border: '1.5px solid rgba(74,53,40,0.25)',
            fontFamily: T.sans, fontWeight: 600,
            ...(tag.active ? { animation: 'tagActivate 0.25s ease-out 7.65s forwards' } : {}),
          }}>
            {tag.label}
            {tag.active && <TapDot delay={7.55} />}
          </div>
        ))}
      </div>

      <div style={{
        background: T.card, borderRadius: 5, border: T.cardBorder,
        padding: '12px 14px', fontSize: 12, color: 'rgba(74,53,40,0.65)',
        fontStyle: 'italic', lineHeight: 1.5, fontFamily: T.sans,
        opacity: 0, animation: 'fadeIn 0.4s ease-out 7.8s forwards',
      }}>
        &ldquo;best set of the whole weekend, never left the floor once&rdquo;
      </div>
    </div>
  )
}

// ── Scene 4: Score reveal ───────────────────────────────────────────────────────

function ScoreScene({ T }: { T: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ padding: '28px 24px', height: '100%', boxSizing: 'border-box', background: T.bg }}>
      <div style={{
        fontSize: 10, color: T.accent, letterSpacing: '0.14em',
        textTransform: 'uppercase', fontWeight: 700, marginBottom: 4, fontFamily: T.sans,
      }}>The Salt Flats</div>
      <div style={{
        fontFamily: T.serif, fontSize: 20, fontWeight: 700,
        letterSpacing: '-0.02em', marginBottom: 16, color: '#4A3528',
      }}>By the numbers<span style={{ color: T.accent }}>.</span></div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: '1px solid rgba(74,53,40,0.1)', borderBottom: '1px solid rgba(74,53,40,0.1)',
        marginBottom: 16,
      }}>
        <div style={{ padding: '10px 0', textAlign: 'center', borderRight: '1px solid rgba(74,53,40,0.1)' }}>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: '#4A3528' }}>142</div>
          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginTop: 2, fontWeight: 600 }}>Ratings</div>
        </div>
        <div style={{ padding: '10px 0', textAlign: 'center', borderRight: '1px solid rgba(74,53,40,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <StarDisplay score={4.7} size={13} accent={T.accent} />
          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginTop: 4, fontWeight: 600 }}>Avg score</div>
        </div>
        <div style={{ padding: '10px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: '#4A3528' }}>5.0</div>
          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em', color: T.muted, marginTop: 2, fontWeight: 600 }}>Top score</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
        {REACTION_BARS.map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 78, fontSize: 10, color: 'rgba(74,53,40,0.55)', flexShrink: 0 }}>{row.label}</div>
            <div style={{ flex: 1, height: 5, background: T.cardInner, borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(74,53,40,0.1)' }}>
              <div style={{
                height: '100%', borderRadius: 3, background: T.accent,
                width: 0, animation: `${row.keyframe} 0.8s ease-out 8.5s forwards`,
              }} />
            </div>
            <div style={{ width: 22, fontSize: 10, color: T.muted, textAlign: 'right', flexShrink: 0 }}>{row.pct}%</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {REVIEW_SNIPPETS.map((rev, i) => (
          <div key={rev.user} style={{
            background: T.card, borderRadius: 5, border: T.cardBorder, padding: '9px 11px',
            opacity: 0, animation: `fadeIn 0.4s ease-out ${8.6 + i * 0.4}s forwards`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <StarDisplay score={rev.score} size={11} accent={T.accent} />
              <span style={{ fontSize: 10, fontWeight: 600, color: '#4A3528', fontFamily: T.sans }}>{rev.user}</span>
            </div>
            <div style={{ fontSize: 10, color: 'rgba(74,53,40,0.65)', fontStyle: 'italic', fontFamily: T.sans, lineHeight: 1.4 }}>
              &ldquo;{rev.quote}&rdquo;
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Intro demo shell ─────────────────────────────────────────────────────────

export default function IntroDemo() {
  const router   = useRouter()
  const supabase = createClient()
  const T = useTheme()

  const [ready, setReady] = useState(false)
  const navigatedRef = useRef(false)

  function goToAuth() {
    if (navigatedRef.current) return
    navigatedRef.current = true
    router.push('/auth')
  }

  useEffect(() => {
    let cancelled = false

    async function boot() {
      const { data: { session } } = await supabase.auth.getSession()
      if (cancelled) return

      if (session) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username_set')
          .eq('id', session.user.id)
          .single()
        if (cancelled) return
        if (!profile || profile.username_set === false) {
          router.replace('/choose-username')
        } else {
          router.replace('/feed')
        }
        return
      }

      const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (prefersReduced) {
        router.replace('/auth')
        return
      }

      setReady(true)
    }

    boot()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(goToAuth, DURATION_MS)
    return () => clearTimeout(t)
  }, [ready])

  const touchStartY = useRef<number | null>(null)
  function onTouchStart(e: React.TouchEvent) { touchStartY.current = e.touches[0].clientY }
  function onTouchEnd() { touchStartY.current = null; goToAuth() }

  if (!ready) {
    return <div style={{ height: '100dvh', background: T.bg }} />
  }

  return (
    <div
      onClick={goToAuth}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{
        position: 'relative', height: '100dvh', maxWidth: 430, margin: '0 auto',
        overflow: 'hidden', background: T.bg, fontFamily: T.sans, cursor: 'pointer',
        touchAction: 'none',
      }}
    >
      {/* Track — one continuous camera pan through all 4 scenes */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: `${SCENE_COUNT * 100}%`,
        animation: `introPan ${DURATION_MS}ms linear forwards`,
      }}>
        <SceneWrapper><RankingsScene T={T} /></SceneWrapper>
        <SceneWrapper><LogScene T={T} /></SceneWrapper>
        <SceneWrapper><RateScene T={T} /></SceneWrapper>
        <SceneWrapper><ScoreScene T={T} /></SceneWrapper>
      </div>

      {/* Skip pill — always visible, above the track */}
      <button
        onClick={e => { e.stopPropagation(); goToAuth() }}
        style={{
          position: 'absolute', top: 16, right: 16, zIndex: 20,
          background: 'rgba(74,53,40,0.6)', border: 'none', borderRadius: 20,
          padding: '6px 14px', color: '#FAF3E2', fontSize: 11, fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans,
          cursor: 'pointer',
        }}
      >skip →</button>

      {/* Swipe-up hint — always visible, above the track */}
      <div style={{
        position: 'absolute', bottom: 24, left: 0, right: 0, zIndex: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        pointerEvents: 'none', animation: 'introHintPulse 1.6s ease-in-out infinite',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="3">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <div style={{
          background: 'rgba(74,53,40,0.6)', borderRadius: 20, padding: '4px 12px',
          color: '#FAF3E2', fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase',
          fontFamily: T.sans, fontWeight: 700,
        }}>Swipe up to sign up</div>
      </div>

      <style>{`
        @keyframes introPan {
          0%   { transform: translateY(0); }
          20%  { transform: translateY(0); }
          24%  { transform: translateY(-25%); }
          48%  { transform: translateY(-25%); }
          52%  { transform: translateY(-50%); }
          80%  { transform: translateY(-50%); }
          84%  { transform: translateY(-75%); }
          100% { transform: translateY(-75%); }
        }
        @keyframes introHintPulse {
          0%, 100% { opacity: 0.55; transform: translateY(0); }
          50%       { opacity: 1;    transform: translateY(-4px); }
        }
        @keyframes tapDotPulse {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(1.5); }
          30%  { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(0.85); }
        }
        @keyframes starPop {
          0%   { opacity: 0; transform: scale(0.4); }
          60%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes scene1Scroll {
          from { transform: translateY(0); }
          to   { transform: translateY(-16px); }
        }
        @keyframes dayTabActivate {
          from { background-color: ${T.card}; color: ${T.muted}; }
          to   { background-color: #4A3528; color: #FAF3E2; }
        }
        @keyframes rowTapActivate {
          from { background-color: ${T.card}; border-color: #4A3528; }
          to   { background-color: ${T.accentDim}; border-color: ${T.accent}; }
        }
        @keyframes tagActivate {
          from { background-color: transparent; color: ${T.muted}; border-color: rgba(74,53,40,0.25); }
          to   { background-color: ${T.accent}; color: #FAF3E2; border-color: #4A3528; }
        }
        @keyframes fillLoved { from { width: 0%; } to { width: 68%; } }
        @keyframes fillOk    { from { width: 0%; } to { width: 24%; } }
        @keyframes fillWack  { from { width: 0%; } to { width: 8%; } }
      `}</style>
    </div>
  )
}
