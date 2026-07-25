'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useTheme } from '@/components/FestivalThemeProvider'
import { StarDisplay } from '@/components/StarDisplay'

const DURATION_MS = 10000
const SCENE_COUNT = 5

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
  { name: 'Nova Wilder',    stage: 'Sunset Stage', tapped: false },
  { name: 'The Salt Flats', stage: 'North Field',  tapped: true },
  { name: 'Glass Coyote',   stage: 'Main Stage',   tapped: false },
  { name: 'Midnight Radio', stage: 'The Grove',    tapped: false },
  { name: 'Paper Static',   stage: 'East Tent',    tapped: false },
  { name: 'Halogen Youth',  stage: 'Sunset Stage', tapped: false },
]

const RATE_TAGS = [
  { label: 'Crowd surf',    active: true },
  { label: 'Sing along',    active: false },
  { label: 'Cool lighting', active: false },
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

// ── Scene 1: Rankings ─────────────────────────────────────────────────────────

function RankingsScene({ T }: { T: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ padding: '28px 24px', height: '100%', boxSizing: 'border-box', background: T.bg }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
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
          <div key={d} style={{
            flex: 1, padding: '6px 0', textAlign: 'center',
            background: i === 1 ? '#4A3528' : T.card,
            borderLeft: i > 0 ? '2px solid #4A3528' : 'none',
            color: i === 1 ? '#FAF3E2' : T.muted,
            fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', fontFamily: T.sans,
          }}>{d}</div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {LOG_ARTISTS.map((a, i) => (
          <div key={a.name} style={{
            background: a.tapped ? T.accentDim : (i % 2 === 0 ? T.card : T.cardAlt),
            border: a.tapped ? `1.5px solid ${T.accent}` : T.cardBorder,
            borderRadius: i === 0 ? '5px 5px 3px 3px' : i === LOG_ARTISTS.length - 1 ? '3px 3px 5px 5px' : 3,
            padding: '10px 12px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontFamily: T.serif, fontSize: 12, fontWeight: 700, color: '#4A3528' }}>{a.name}</div>
              <div style={{ fontSize: 8, color: T.muted, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600 }}>{a.stage}</div>
            </div>
            {a.tapped && (
              <div style={{
                width: 18, height: 18, borderRadius: '50%', background: T.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Scene 3: Rate the show ──────────────────────────────────────────────────────

function RateScene({ T }: { T: ReturnType<typeof useTheme> }) {
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
        {[{ label: 'Performance', score: 5 }, { label: 'Venue', score: 4 }, { label: 'Vibe', score: 5 }].map(row => (
          <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: '#4A3528' }}>{row.label}</div>
            <StarDisplay score={row.score} size={18} accent={T.accent} />
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {RATE_TAGS.map(tag => (
          <div key={tag.label} style={{
            fontSize: 10, padding: '5px 11px', borderRadius: 20,
            background: tag.active ? T.accent : 'none',
            color: tag.active ? '#FAF3E2' : T.muted,
            border: tag.active ? '1.5px solid #4A3528' : '1.5px solid rgba(74,53,40,0.25)',
            fontFamily: T.sans, fontWeight: 600,
          }}>{tag.label}</div>
        ))}
      </div>

      <div style={{
        background: T.card, borderRadius: 5, border: T.cardBorder,
        padding: '12px 14px', fontSize: 12, color: 'rgba(74,53,40,0.65)',
        fontStyle: 'italic', lineHeight: 1.5, fontFamily: T.sans,
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
                width: 0, animation: `${row.keyframe} 1s ease-out 5.4s forwards`,
              }} />
            </div>
            <div style={{ width: 22, fontSize: 10, color: T.muted, textAlign: 'right', flexShrink: 0 }}>{row.pct}%</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {REVIEW_SNIPPETS.map(rev => (
          <div key={rev.user} style={{ background: T.card, borderRadius: 5, border: T.cardBorder, padding: '9px 11px' }}>
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

// ── Scene 5: Sign up (mirrors the real /auth screen) ────────────────────────────

function SignupScene({ T }: { T: ReturnType<typeof useTheme> }) {
  return (
    <div style={{ padding: '28px 24px', height: '100%', boxSizing: 'border-box', background: T.bg }}>
      <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, color: '#4A3528', letterSpacing: '-0.5px', marginBottom: 4 }}>
        Gigl<span style={{ color: T.accent }}>/</span>
      </div>
      <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 16, fontWeight: 600 }}>
        Festival season · 2026
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.02em', marginBottom: 16, color: '#4A3528' }}>
        Rate the sets<span style={{ color: T.accent }}>.</span> Own the moment<span style={{ color: T.accent }}>.</span>
      </div>

      <div style={{
        width: '100%', background: T.card, border: T.cardBorder, borderRadius: 5,
        padding: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 12,
      }}>
        <svg width="13" height="13" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
          <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
          <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
          <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
        </svg>
        <span style={{ fontSize: 10, fontWeight: 700, color: '#4A3528', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>
          Continue with Google
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'rgba(74,53,40,0.15)' }} />
        <span style={{ fontSize: 9, color: T.faint, letterSpacing: '0.1em', textTransform: 'uppercase' }}>or</span>
        <div style={{ flex: 1, height: 1, background: 'rgba(74,53,40,0.15)' }} />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        {['Username', 'Email', 'Password'].map(label => (
          <div key={label} style={{ background: T.card, borderRadius: 5, border: T.cardBorder, padding: '9px 12px' }}>
            <div style={{ fontSize: 8, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{
        width: '100%', background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
        borderRadius: 5, padding: 13, textAlign: 'center', marginBottom: 12,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#FAF3E2', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>
          Create account
        </span>
      </div>

      <div style={{ textAlign: 'center', fontSize: 11, color: T.muted, fontFamily: T.sans }}>
        Already have an account? <span style={{ color: T.accent, textDecoration: 'underline', textUnderlineOffset: 3 }}>Sign in</span>
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
      {/* Track — one continuous camera pan through all 5 scenes */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        height: `${SCENE_COUNT * 100}%`,
        animation: `introPan ${DURATION_MS}ms linear forwards`,
      }}>
        <SceneWrapper><RankingsScene T={T} /></SceneWrapper>
        <SceneWrapper><LogScene T={T} /></SceneWrapper>
        <SceneWrapper><RateScene T={T} /></SceneWrapper>
        <SceneWrapper><ScoreScene T={T} /></SceneWrapper>
        <SceneWrapper><SignupScene T={T} /></SceneWrapper>
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
          14%  { transform: translateY(0); }
          18%  { transform: translateY(-20%); }
          32%  { transform: translateY(-20%); }
          36%  { transform: translateY(-40%); }
          50%  { transform: translateY(-40%); }
          54%  { transform: translateY(-60%); }
          68%  { transform: translateY(-60%); }
          72%  { transform: translateY(-80%); }
          100% { transform: translateY(-80%); }
        }
        @keyframes introHintPulse {
          0%, 100% { opacity: 0.55; transform: translateY(0); }
          50%       { opacity: 1;    transform: translateY(-4px); }
        }
        @keyframes fillLoved { from { width: 0%; } to { width: 68%; } }
        @keyframes fillOk    { from { width: 0%; } to { width: 24%; } }
        @keyframes fillWack  { from { width: 0%; } to { width: 8%; } }
      `}</style>
    </div>
  )
}
