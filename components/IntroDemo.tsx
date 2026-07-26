'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/FestivalThemeProvider'
import { StarDisplay } from '@/components/StarDisplay'

const DURATION_MS = 20000
const SCENE_COUNT = 5

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

// ── Mock data (fictional — this is the very first thing a new visitor sees,
// so we invent a lineup rather than borrowing real artists' names/likeness) ──

const FEED_PREVIEW = [
  { name: 'Nova Wilder',    stage: 'Sunset Stage', score: 4.9 },
  { name: 'The Salt Flats', stage: 'North Field',  score: 4.7 },
]

const RANKING_ROWS = [
  { medal: '🥇', name: 'Nova Wilder',    stage: 'Sunset Stage', day: 2, score: 4.9 },
  { medal: '🥈', name: 'The Salt Flats', stage: 'North Field',  day: 1, score: 4.7 },
  { medal: '🥉', name: 'Glass Coyote',   stage: 'Main Stage',   day: 3, score: 4.6 },
  { medal: '4',  name: 'Midnight Radio', stage: 'The Grove',    day: 2, score: 4.4 },
  { medal: '5',  name: 'Paper Static',   stage: 'East Tent',    day: 1, score: 4.2 },
]

const LOG_ARTISTS = [
  { name: 'Nova Wilder',    stage: 'Sunset Stage' },
  { name: 'The Salt Flats', stage: 'North Field' },
  { name: 'Glass Coyote',   stage: 'Main Stage' },
  { name: 'Midnight Radio', stage: 'The Grove' },
  { name: 'Paper Static',   stage: 'East Tent' },
]

const MY_RANKINGS = [
  { medal: '🥇', name: 'The Salt Flats', stage: 'North Field',  score: 5.0 },
  { medal: '🥈', name: 'Nova Wilder',    stage: 'Sunset Stage', score: 4.5 },
]

function SceneWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ height: `${100 / SCENE_COUNT}%`, width: '100%', overflow: 'hidden', position: 'relative' }}>
      {children}
    </div>
  )
}

// A little finger tapping down: a translucent contact ring plus a finger
// emoji, timed to a fixed point on the demo's clock. Positioned relative to
// whatever `position: relative` element it's dropped inside.
function FingerTap({ delay }: { delay: number }) {
  return (
    <div style={{
      position: 'absolute', top: '50%', left: '50%', zIndex: 6,
      pointerEvents: 'none', opacity: 0,
      animation: `fingerTap 1.8s ease-out ${delay}s forwards`,
    }}>
      <div style={{
        position: 'absolute', width: 26, height: 26, marginTop: -13, marginLeft: -13,
        borderRadius: '50%', background: 'rgba(74,53,40,0.3)', border: '2px solid rgba(74,53,40,0.5)',
      }} />
      <span style={{
        position: 'absolute', fontSize: 22, marginTop: -30, marginLeft: -6,
        transform: 'rotate(-14deg)', lineHeight: 1,
      }}>👆</span>
    </div>
  )
}

// Stars that pop in one at a time (as if being tapped in), rather than
// rendering fully-formed the way the static StarDisplay does.
function TapStars({ count, size, accent, delay, stagger = 0.24 }: {
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
              animation: `starPop 0.5s ease-out ${delay + i * stagger}s forwards`,
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

// ── Scene 1: Home — tap the Log button ─────────────────────────────────────────

function HomeScene({ T }: { T: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ height: '100%', boxSizing: 'border-box', background: T.bg, position: 'relative' }}>
      <div style={{ padding: '18px 16px 0' }}>
        <div style={{ fontSize: 9, color: T.accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10, fontFamily: T.sans }}>
          Activity
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FEED_PREVIEW.map((f, i) => (
            <div key={f.name} style={{
              background: T.card, borderRadius: 5, border: T.cardBorder,
              boxShadow: i === 0 ? T.cardShadow : 'none',
              padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 11, fontWeight: 700, color: '#4A3528' }}>{f.name}</div>
                <div style={{ fontSize: 7, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>{f.stage}</div>
              </div>
              <StarDisplay score={f.score} size={11} accent={T.accent} />
            </div>
          ))}
        </div>
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTop: '1.5px solid rgba(74,53,40,0.15)', background: T.bgRgba,
        padding: '8px 24px 10px', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
      }}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
          <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
        <div style={{ position: 'relative' }}>
          <div style={{
            width: 30, height: 30, borderRadius: '50%', background: T.accent,
            border: '1.5px solid #4A3528', boxShadow: '2px 2px 0 #4A3528',
            display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -12,
            animation: 'fabPress 0.5s ease-out 1.2s',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </div>
          <FingerTap delay={1.2} />
        </div>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      </div>
    </div>
  )
}

// ── Scene 2: Choose an artist ────────────────────────────────────────────────────

function LogScene({ T }: { T: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ padding: '18px 16px', height: '100%', boxSizing: 'border-box', background: T.bg }}>
      <div style={{ fontSize: 9, color: T.accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3, fontFamily: T.sans }}>
        Right after the set
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12, color: '#4A3528' }}>
        Log it in seconds<span style={{ color: T.accent }}>.</span>
      </div>
      <div style={{ display: 'flex', border: '2px solid #4A3528', borderRadius: 5, overflow: 'hidden', marginBottom: 10 }}>
        {['FRI', 'SAT', 'SUN'].map((d, i) => (
          <div key={d} style={{ position: 'relative', flex: 1, borderLeft: i > 0 ? '2px solid #4A3528' : 'none' }}>
            <div style={{
              padding: '5px 0', textAlign: 'center',
              background: T.card, color: T.muted,
              fontSize: 8, fontWeight: 700, letterSpacing: '0.08em', fontFamily: T.sans,
              ...(i === 1 ? { animation: 'dayTabActivate 0.4s ease-out 3.8s forwards' } : {}),
            }}>{d}</div>
            {i === 1 && <FingerTap delay={3.7} />}
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
              padding: '7px 10px',
              display: 'flex', alignItems: 'center', gap: 8,
              ...(isTapped ? { animation: 'rowTapActivate 0.6s ease-out 5.4s forwards' } : {}),
            }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: T.serif, fontSize: 11, fontWeight: 700, color: '#4A3528' }}>{a.name}</div>
                <div style={{ fontSize: 7, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>{a.stage}</div>
              </div>
              {isTapped && (
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: T.accent,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  opacity: 0, animation: 'fadeIn 0.5s ease-out 5.6s forwards',
                }}>
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              )}
              {isTapped && <FingerTap delay={5.3} />}
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
    { label: 'Performance', count: 5, dotDelay: 8.2,  starDelay: 8.4 },
    { label: 'Venue',       count: 4, dotDelay: 9.8,  starDelay: 10.0 },
    { label: 'Vibe',        count: 5, dotDelay: 11.2, starDelay: 11.4 },
  ]
  return (
    <div style={{ padding: '18px 16px', height: '100%', boxSizing: 'border-box', background: T.bg }}>
      <div style={{ fontSize: 9, color: T.accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3, fontFamily: T.sans }}>
        The Salt Flats
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 14, color: '#4A3528' }}>
        North Field · Sat
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
        {rows.map(row => (
          <div key={row.label} style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: T.serif, fontSize: 12, fontWeight: 700, color: '#4A3528' }}>{row.label}</div>
            <TapStars count={row.count} size={15} accent={T.accent} delay={row.starDelay} />
            <FingerTap delay={row.dotDelay} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 5, marginBottom: 12 }}>
        {[{ label: 'Crowd surf', active: true }, { label: 'Sing along', active: false }, { label: 'Cool lighting', active: false }].map(tag => (
          <div key={tag.label} style={{
            position: 'relative',
            fontSize: 9, padding: '4px 9px', borderRadius: 20,
            background: 'none', color: T.muted,
            border: '1.5px solid rgba(74,53,40,0.25)',
            fontFamily: T.sans, fontWeight: 600,
            ...(tag.active ? { animation: 'tagActivate 0.5s ease-out 12.5s forwards' } : {}),
          }}>
            {tag.label}
            {tag.active && <FingerTap delay={12.3} />}
          </div>
        ))}
      </div>

      <div style={{
        background: T.card, borderRadius: 5, border: T.cardBorder,
        padding: '9px 11px', fontSize: 10, color: 'rgba(74,53,40,0.65)',
        fontStyle: 'italic', lineHeight: 1.45, fontFamily: T.sans,
        opacity: 0, animation: 'fadeIn 0.8s ease-out 12.8s forwards',
      }}>
        &ldquo;best set of the whole weekend, never left the floor once&rdquo;
      </div>
    </div>
  )
}

// ── Scene 4: Rankings ────────────────────────────────────────────────────────────

function RankingsScene({ T }: { T: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ padding: '18px 16px', height: '100%', boxSizing: 'border-box', background: T.bg, overflow: 'hidden' }}>
      <div style={{ fontSize: 9, color: T.accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3, fontFamily: T.sans }}>
        Live leaderboard
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 12, color: '#4A3528' }}>
        The crowd decides<span style={{ color: T.accent }}>.</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, animation: 'sceneScroll 2s ease-in-out 13.8s forwards' }}>
        {RANKING_ROWS.map((r, i) => (
          <div key={r.name} style={{
            background: i % 2 === 0 ? T.card : T.cardAlt,
            border: T.cardBorder,
            borderRadius: i === 0 ? '5px 5px 3px 3px' : i === RANKING_ROWS.length - 1 ? '3px 3px 5px 5px' : 3,
            boxShadow: i === 0 ? T.cardShadow : 'none',
            padding: '7px 10px',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 16, textAlign: 'center', flexShrink: 0, fontFamily: T.serif, fontSize: i < 3 ? 12 : 10, color: i < 3 ? T.accent : T.faint, fontWeight: 700 }}>{r.medal}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 11, fontWeight: 700, color: '#4A3528', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              <div style={{ fontSize: 7, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>{r.stage} · Day {r.day}</div>
            </div>
            <StarDisplay score={r.score} size={11} accent={T.accent} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Scene 5: Your profile ────────────────────────────────────────────────────────

function ProfileScene({ T }: { T: ReturnType<typeof useTheme> }) {
  return (
    <div style={{
      padding: '18px 16px', height: '100%', boxSizing: 'border-box', background: T.bg,
      opacity: 0, animation: 'fadeIn 0.8s ease-out 16.8s forwards',
    }}>
      <div style={{ fontSize: 9, color: T.accent, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 3, fontFamily: T.sans }}>
        Festival season · 2026
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 2, color: '#4A3528' }}>
        Your rankings<span style={{ color: T.accent }}>.</span>
      </div>
      <div style={{ fontSize: 10, color: T.muted, marginBottom: 12, fontFamily: T.sans }}>@you</div>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
        borderTop: '1px solid rgba(74,53,40,0.1)', borderBottom: '1px solid rgba(74,53,40,0.1)',
        marginBottom: 14,
      }}>
        <div style={{ padding: '8px 0', textAlign: 'center', borderRight: '1px solid rgba(74,53,40,0.1)' }}>
          <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: '#4A3528' }}>9</div>
          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted, marginTop: 2, fontWeight: 600 }}>Sets logged</div>
        </div>
        <div style={{ padding: '8px 0', textAlign: 'center', borderRight: '1px solid rgba(74,53,40,0.1)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <StarDisplay score={4.4} size={11} accent={T.accent} />
          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted, marginTop: 3, fontWeight: 600 }}>Avg score</div>
        </div>
        <div style={{ padding: '8px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: '#4A3528' }}>2026</div>
          <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.06em', color: T.muted, marginTop: 2, fontWeight: 600 }}>Festival</div>
        </div>
      </div>

      <div style={{ fontSize: 8, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8, fontWeight: 600, fontFamily: T.sans }}>
        My rankings
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {MY_RANKINGS.map((r, i) => (
          <div key={r.name} style={{
            background: i % 2 === 0 ? T.card : T.cardAlt, border: T.cardBorder,
            borderRadius: i === 0 ? '5px 5px 3px 3px' : '3px 3px 5px 5px',
            boxShadow: i === 0 ? T.cardShadow : 'none',
            padding: '7px 10px', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{ width: 16, textAlign: 'center', flexShrink: 0, fontFamily: T.serif, fontSize: 12, color: T.accent, fontWeight: 700 }}>{r.medal}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 11, fontWeight: 700, color: '#4A3528' }}>{r.name}</div>
              <div style={{ fontSize: 7, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>{r.stage}</div>
            </div>
            <StarDisplay score={r.score} size={11} accent={T.accent} />
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
        position: 'relative', height: '100dvh', width: '100%', maxWidth: 430, margin: '0 auto',
        overflow: 'hidden', background: T.bg, fontFamily: T.sans, cursor: 'pointer',
        touchAction: 'none', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '10px 10px', boxSizing: 'border-box',
      }}
    >
      <div style={{
        fontSize: 10, color: T.accent, letterSpacing: '0.14em', textTransform: 'uppercase',
        fontWeight: 700, marginBottom: 8, fontFamily: T.sans,
      }}>Here&apos;s how it works</div>

      {/* Phone-within-a-phone frame — makes clear this is a demo, not the real app chrome */}
      <div style={{
        position: 'relative', width: 'min(80vw, 380px)', height: 'min(80dvh, 720px)',
        background: '#4A3528', borderRadius: 40, padding: 10,
        boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 4px 14px rgba(0,0,0,0.25)',
        flexShrink: 0,
      }}>
        {/* Notch */}
        <div style={{
          position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
          width: 70, height: 16, borderRadius: 10, background: '#4A3528', zIndex: 15,
        }} />

        {/* Screen */}
        <div style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 30, overflow: 'hidden', background: T.bg }}>
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0,
            height: `${SCENE_COUNT * 100}%`,
            animation: `introPan ${DURATION_MS}ms linear forwards`,
          }}>
            <SceneWrapper><HomeScene T={T} /></SceneWrapper>
            <SceneWrapper><LogScene T={T} /></SceneWrapper>
            <SceneWrapper><RateScene T={T} /></SceneWrapper>
            <SceneWrapper><RankingsScene T={T} /></SceneWrapper>
            <SceneWrapper><ProfileScene T={T} /></SceneWrapper>
          </div>
        </div>
      </div>

      {/* Skip pill — real control, deliberately outside the fake phone */}
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

      {/* Swipe-up hint — real control, deliberately outside the fake phone */}
      <div style={{
        position: 'absolute', bottom: 20, left: 0, right: 0, zIndex: 20,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        pointerEvents: 'none', animation: 'introHintPulse 1.6s ease-in-out infinite',
      }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="3">
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
          13%  { transform: translateY(0); }
          16%  { transform: translateY(-20%); }
          36%  { transform: translateY(-20%); }
          39%  { transform: translateY(-40%); }
          65%  { transform: translateY(-40%); }
          68%  { transform: translateY(-60%); }
          81%  { transform: translateY(-60%); }
          84%  { transform: translateY(-80%); }
          100% { transform: translateY(-80%); }
        }
        @keyframes introHintPulse {
          0%, 100% { opacity: 0.55; transform: translateY(0); }
          50%       { opacity: 1;    transform: translateY(-4px); }
        }
        @keyframes fingerTap {
          0%   { opacity: 0; transform: scale(0.7); }
          25%  { opacity: 1; transform: scale(1); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        @keyframes fabPress {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.86); }
          100% { transform: scale(1); }
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
        @keyframes sceneScroll {
          from { transform: translateY(0); }
          to   { transform: translateY(-12px); }
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
      `}</style>
    </div>
  )
}
