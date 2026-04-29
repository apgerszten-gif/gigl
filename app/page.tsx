'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const T = {
  bg:           '#000000',
  card:         '#131313',
  cardInner:    '#1a1a1a',
  accent:       '#D35400',
  accentDim:    'rgba(211,84,0,0.12)',
  accentBorder: 'rgba(211,84,0,0.2)',
  accentMuted:  'rgba(211,84,0,0.65)',
  white:        '#ffffff',
  muted:        '#A8A29E',
  faint:        '#555555',
  serif:        "'Noto Serif', Georgia, serif",
  sans:         "'Manrope', sans-serif",
}

function useInView(threshold = 0.2) {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setInView(true)
    }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return [ref, inView] as const
}

function SectionLabel({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 10, color: T.accent, letterSpacing: '0.16em',
      textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600,
      marginBottom: 10,
    }}>{children}</div>
  )
}

function SectionHeading({ line1, line2 }: { line1: string; line2: string }) {
  return (
    <div style={{
      fontFamily: T.serif, fontSize: 32, fontWeight: 700,
      lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 10,
    }}>
      {line1}<br />
      <span style={{ color: T.accent, fontStyle: 'italic' }}>{line2}</span>
    </div>
  )
}

function SectionSub({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: 14, color: T.muted, fontFamily: T.sans,
      lineHeight: 1.65, marginBottom: 28,
    }}>{children}</div>
  )
}

// ── Mock: Log a show ─────────────────────────────────────────────────────────

function LogMock() {
  return (
    <div style={{ background: T.card, borderRadius: 4, overflow: 'hidden' }}>
      {/* Fake photo area */}
      <div style={{
        height: 110,
        background: 'linear-gradient(135deg, #1a0800 0%, #2d1100 60%, #1a0800 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative',
      }}>
        <span style={{ fontSize: 44, filter: 'drop-shadow(0 0 20px rgba(211,84,0,0.5))' }}>⚡</span>
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          fontSize: 9, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.08em',
          textTransform: 'uppercase', fontFamily: T.sans,
        }}>📷 Add photo</div>
      </div>

      {/* Info row */}
      <div style={{ padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{
          width: 48, height: 48, background: T.cardInner, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
        }}>
          <span style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.accent, lineHeight: 1 }}>9.2</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, color: T.white, marginBottom: 2 }}>Charli XCX</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.sans }}>
            Sahara Stage · Apr 18
          </div>
        </div>
      </div>

      {/* Review */}
      <div style={{ padding: '0 16px 10px', fontSize: 12, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontFamily: T.sans, lineHeight: 1.5 }}>
        "absolute supernova. never left the floor once."
      </div>

      {/* Tags */}
      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 6 }}>
        {['#transcendent', '#crowd-energy', '#set-of-the-weekend'].map(tag => (
          <span key={tag} style={{
            fontSize: 9, padding: '3px 9px', borderRadius: 20,
            background: T.accentDim, color: T.accentMuted, border: `1px solid ${T.accentBorder}`,
            fontFamily: T.sans, letterSpacing: '0.03em',
          }}>{tag}</span>
        ))}
      </div>
    </div>
  )
}

// ── Mock: Activity feed ──────────────────────────────────────────────────────

function FeedMock() {
  const items = [
    {
      name: 'Jungle',
      score: '8.7',
      stage: 'Gobi Stage · Apr 17',
      user: '@festivalrat',
      review: '"peaked at Keep Moving — room went sideways"',
      tags: ['#peak-energy'],
      time: '4m ago',
    },
    {
      name: 'Magdalena Bay',
      score: '9.4',
      stage: 'Mojave · Apr 19',
      user: '@nachtfalke',
      review: '"best set of the weekend, no contest"',
      tags: ['#unexpected-setlist', '#top-5-ever'],
      time: '12m ago',
    },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {items.map((item, i) => (
        <div key={i} style={{ background: T.card, borderRadius: 4, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <div style={{
            width: 46, height: 46, background: T.cardInner, flexShrink: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 4, marginTop: 2,
          }}>
            <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: T.accent }}>{item.score}</span>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 2 }}>
              <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 600, color: T.white }}>{item.name}</div>
              <div style={{ fontSize: 9, color: T.faint, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.sans, flexShrink: 0 }}>{item.time}</div>
            </div>
            <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 3 }}>{item.stage}</div>
            <div style={{ fontSize: 11, color: T.accent, fontFamily: T.sans, marginBottom: 6 }}>{item.user}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontFamily: T.sans, lineHeight: 1.5, marginBottom: 8 }}>{item.review}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {item.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: 9, padding: '2px 8px', borderRadius: 20,
                  background: T.accentDim, color: T.accentMuted, border: `1px solid ${T.accentBorder}`,
                  fontFamily: T.sans,
                }}>{tag}</span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Mock: Rankings leaderboard ───────────────────────────────────────────────

function RankingsMock() {
  const items = [
    { rank: 1, name: 'Charli XCX',    score: '9.1', emoji: '⚡', logs: 38 },
    { rank: 2, name: 'Magdalena Bay', score: '8.9', emoji: '🌙', logs: 27 },
    { rank: 3, name: 'Jungle',        score: '8.7', emoji: '🌿', logs: 24 },
    { rank: 4, name: 'Bad Bunny',     score: '8.4', emoji: '🐰', logs: 42 },
    { rank: 5, name: 'Tyla',          score: '8.1', emoji: '🌸', logs: 19 },
  ]

  return (
    <div style={{ background: T.card, borderRadius: 4, overflow: 'hidden' }}>
      {/* Filter bar */}
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
        display: 'flex', gap: 6,
      }}>
        {['All Days', 'Apr 17', 'Apr 18', 'Apr 19'].map((d, i) => (
          <button key={d} style={{
            padding: '5px 10px', borderRadius: 4, fontSize: 9,
            border: 'none', cursor: 'default',
            background: i === 0 ? T.accent : 'rgba(255,255,255,0.04)',
            color: i === 0 ? '#fff' : 'rgba(255,255,255,0.3)',
            fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{d}</button>
        ))}
      </div>

      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '11px 16px',
          borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
          background: i === 0 ? 'rgba(211,84,0,0.04)' : 'transparent',
        }}>
          <div style={{
            width: 20, textAlign: 'right', flexShrink: 0,
            fontFamily: T.sans, fontSize: 11,
            color: i === 0 ? T.accent : T.faint, fontWeight: 700,
          }}>{item.rank}</div>
          <span style={{ fontSize: 16 }}>{item.emoji}</span>
          <div style={{ flex: 1, fontFamily: T.serif, fontSize: 14, fontWeight: 600, color: T.white }}>{item.name}</div>
          <div style={{ fontSize: 10, color: T.faint, fontFamily: T.sans, marginRight: 8 }}>{item.logs} logs</div>
          <div style={{
            fontFamily: T.serif, fontSize: 16, fontWeight: 700,
            color: i === 0 ? T.accent : T.white,
          }}>{item.score}</div>
        </div>
      ))}
    </div>
  )
}

// ── Mock: Artist page ────────────────────────────────────────────────────────

function ArtistMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Header card */}
      <div style={{
        background: T.card, borderRadius: 4, padding: '20px 18px',
        display: 'flex', alignItems: 'center', gap: 16,
      }}>
        <div style={{ fontSize: 36 }}>🌙</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.serif, fontSize: 20, fontWeight: 700, color: T.white, marginBottom: 2 }}>Magdalena Bay</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>
            Mojave Stage · Apr 19
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: T.serif, fontSize: 36, fontWeight: 700, color: T.accent, lineHeight: 1 }}>8.9</div>
          <div style={{ fontSize: 9, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, marginTop: 2 }}>27 ratings</div>
        </div>
      </div>

      {/* Reaction breakdown */}
      <div style={{ background: T.card, borderRadius: 4, padding: '14px 16px' }}>
        <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 10 }}>
          Top Reactions
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { emoji: '🌙', label: 'ethereal', pct: 72 },
            { emoji: '⚡', label: 'electric',  pct: 58 },
            { emoji: '🔥', label: 'fire',       pct: 44 },
          ].map(r => (
            <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 14, width: 20 }}>{r.emoji}</span>
              <div style={{ fontSize: 11, color: T.muted, fontFamily: T.sans, width: 60 }}>{r.label}</div>
              <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${r.pct}%`, height: '100%', background: T.accent, borderRadius: 2 }} />
              </div>
              <div style={{ fontSize: 10, color: T.faint, fontFamily: T.sans, width: 28, textAlign: 'right' }}>{r.pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Mock: Profile ────────────────────────────────────────────────────────────

function ProfileMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {/* Username + avatar row */}
      <div style={{
        background: T.card, borderRadius: 4, padding: '16px 18px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(211,84,0,0.2)', border: `1.5px solid ${T.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.serif, fontSize: 18, color: T.accent,
        }}>A</div>
        <div>
          <div style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: T.white, marginBottom: 1 }}>@festivalrat</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>
            Coachella 2026 · W2
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ label: 'Shows Logged', value: '14' }, { label: 'Avg Rating', value: '8.2' }].map(s => (
          <div key={s.label} style={{
            flex: 1, background: T.card, borderRadius: 4, padding: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 700, color: T.accent, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, marginTop: 5 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Top pick */}
      <div style={{
        background: T.card, borderRadius: 4, padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 14,
      }}>
        <span style={{ fontSize: 26 }}>⚡</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: T.accent, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 2 }}>Top Rated</div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: T.white }}>Charli XCX</div>
          <div style={{ fontSize: 11, color: T.muted, fontFamily: T.sans }}>Sahara Stage · 9.2</div>
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.accent }}>9.2</div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/feed')
    })
  }, [])

  const [ref1, inView1] = useInView()
  const [ref2, inView2] = useInView()
  const [ref3, inView3] = useInView()
  const [ref4, inView4] = useInView()
  const [ref5, inView5] = useInView()

  const fadeIn = (inView: boolean): React.CSSProperties => ({
    opacity: inView ? 1 : 0,
    transform: inView ? 'translateY(0)' : 'translateY(30px)',
    transition: 'opacity 0.7s ease, transform 0.7s ease',
  })

  const section: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '64px 24px',
  }

  return (
    <div style={{ background: T.bg, color: T.white, fontFamily: T.sans }}>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <div style={{ ...section, justifyContent: 'space-between', paddingTop: 72, paddingBottom: 56, gap: 0 }}>

        {/* Wordmark */}
        <div>
          <div style={{
            fontFamily: T.serif, fontSize: 38, fontWeight: 700,
            color: T.accent, letterSpacing: '0.04em', lineHeight: 1,
          }}>Gigl</div>
          <div style={{ fontSize: 10, color: T.faint, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: T.sans, marginTop: 6 }}>
            Live music · Festival season · Your rankings
          </div>
        </div>

        {/* Main copy */}
        <div style={{ paddingTop: 56 }}>
          <div style={{
            fontFamily: T.serif, fontSize: 42, fontWeight: 700,
            lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: 18,
          }}>
            Rate every set.<br />
            <span style={{ color: T.accent, fontStyle: 'italic' }}>Rank every moment.</span>
          </div>
          <div style={{ fontSize: 15, color: T.muted, fontFamily: T.sans, lineHeight: 1.7, marginBottom: 40 }}>
            Letterboxd for live music. Log sets right after you see them, score artists, and see what everyone around you is rating — in real-time.
          </div>

          <button
            onClick={() => router.push('/auth')}
            style={{
              width: '100%', background: T.accent, border: 'none',
              borderRadius: 4, padding: '16px 0', cursor: 'pointer',
              marginBottom: 10, boxShadow: '0 6px 28px rgba(211,84,0,0.3)',
            }}
          >
            <span style={{
              fontSize: 12, fontWeight: 700, color: '#fff',
              letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans,
            }}>Get Started →</span>
          </button>
          <button
            onClick={() => router.push('/auth')}
            style={{
              width: '100%', background: 'transparent',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: 4, padding: '14px 0', cursor: 'pointer',
            }}
          >
            <span style={{
              fontSize: 12, color: 'rgba(255,255,255,0.35)',
              letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans,
            }}>Already have an account</span>
          </button>
        </div>

        {/* Scroll nudge */}
        <div style={{ paddingTop: 48, textAlign: 'center' }}>
          <div style={{ fontSize: 9, color: T.faint, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 6 }}>
            See how it works
          </div>
          <div style={{ color: T.faint, fontSize: 18, animation: 'nudge 2s ease-in-out infinite' }}>↓</div>
        </div>
      </div>

      {/* Divider */}
      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 24px' }} />

      {/* ── 01 / Log ─────────────────────────────────────────────────────── */}
      <div ref={ref1} style={{ ...section, ...fadeIn(inView1) }}>
        <SectionLabel>01 / Log</SectionLabel>
        <SectionHeading line1="Log the set while" line2="it's still ringing." />
        <SectionSub>
          Rate a show the moment it ends. Add a photo, write what you felt, tag the vibe — your personal concert diary.
        </SectionSub>
        <LogMock />
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 24px' }} />

      {/* ── 02 / Feed ────────────────────────────────────────────────────── */}
      <div ref={ref2} style={{ ...section, ...fadeIn(inView2) }}>
        <SectionLabel>02 / Feed</SectionLabel>
        <SectionHeading line1="See what everyone" line2="is ranking." />
        <SectionSub>
          A live activity feed of every rated set. Find the show you almost skipped before the headliner goes on.
        </SectionSub>
        <FeedMock />
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 24px' }} />

      {/* ── 03 / Rankings ────────────────────────────────────────────────── */}
      <div ref={ref3} style={{ ...section, ...fadeIn(inView3) }}>
        <SectionLabel>03 / Rankings</SectionLabel>
        <SectionHeading line1="The crowd scores" line2="every artist." />
        <SectionSub>
          Real-time leaderboard updated as logs come in. Filter by day. See who delivered — and who didn't.
        </SectionSub>
        <RankingsMock />
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 24px' }} />

      {/* ── 04 / Artist ──────────────────────────────────────────────────── */}
      <div ref={ref4} style={{ ...section, ...fadeIn(inView4) }}>
        <SectionLabel>04 / Artist</SectionLabel>
        <SectionHeading line1="Every artist," line2="scored by the crowd." />
        <SectionSub>
          Tap any artist to see their score, breakdown, top reactions, and reviews from everyone who caught the set.
        </SectionSub>
        <ArtistMock />
      </div>

      <div style={{ height: 1, background: 'rgba(255,255,255,0.04)', margin: '0 24px' }} />

      {/* ── 05 / Profile ─────────────────────────────────────────────────── */}
      <div ref={ref5} style={{ ...section, ...fadeIn(inView5) }}>
        <SectionLabel>05 / Profile</SectionLabel>
        <SectionHeading line1="Your festival," line2="on record." />
        <SectionSub>
          Every show you've seen, tracked. Your ratings, your stats, your top picks — all in one place.
        </SectionSub>
        <ProfileMock />
      </div>

      {/* ── Final CTA ────────────────────────────────────────────────────── */}
      <div style={{
        ...section,
        alignItems: 'center', textAlign: 'center',
        background: 'linear-gradient(to bottom, #000000, #0d0500)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{
          width: 48, height: 2, background: T.accent,
          marginBottom: 32, borderRadius: 1,
        }} />
        <div style={{
          fontFamily: T.serif, fontSize: 38, fontWeight: 700,
          lineHeight: 1.05, letterSpacing: '-0.02em', marginBottom: 14,
        }}>
          Ready to rate<br />
          <span style={{ color: T.accent, fontStyle: 'italic' }}>the show?</span>
        </div>
        <div style={{
          fontSize: 14, color: T.muted, fontFamily: T.sans,
          lineHeight: 1.65, marginBottom: 40, maxWidth: 290,
        }}>
          Join everyone logging every set this festival season.
        </div>
        <button
          onClick={() => router.push('/auth')}
          style={{
            width: '100%', background: T.accent, border: 'none',
            borderRadius: 4, padding: '18px 0', cursor: 'pointer',
            marginBottom: 14, boxShadow: '0 8px 40px rgba(211,84,0,0.4)',
          }}
        >
          <span style={{
            fontSize: 12, fontWeight: 700, color: '#fff',
            letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans,
          }}>Create Account</span>
        </button>
        <button
          onClick={() => router.push('/auth')}
          style={{
            width: '100%', background: 'transparent',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 4, padding: '14px 0', cursor: 'pointer',
          }}
        >
          <span style={{
            fontSize: 12, color: 'rgba(255,255,255,0.35)',
            letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans,
          }}>Sign In</span>
        </button>

        <div style={{
          marginTop: 80, fontSize: 10, color: '#1c1c1c',
          letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans,
        }}>
          Gigl · Built for festival season
        </div>
      </div>

      <style>{`
        @keyframes nudge {
          0%, 100% { transform: translateY(0);   opacity: 0.35; }
          50%       { transform: translateY(7px); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
