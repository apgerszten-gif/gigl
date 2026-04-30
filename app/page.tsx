'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'

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

// ── Shared slide shell ────────────────────────────────────────────────────────

function SlideShell({ label, line1, line2, sub, children }: {
  label: string; line1: string; line2: string; sub: string; children: React.ReactNode
}) {
  return (
    <div style={{ padding: '52px 24px 90px', minHeight: '100%' }}>
      <div style={{
        fontSize: 10, color: T.accent, letterSpacing: '0.16em',
        textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600,
        marginBottom: 8,
      }}>{label}</div>
      <div style={{
        fontFamily: T.serif, fontSize: 28, fontWeight: 700,
        lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 8,
      }}>
        {line1}<br />
        <span style={{ color: T.accent, fontStyle: 'italic' }}>{line2}</span>
      </div>
      <div style={{
        fontSize: 13, color: T.muted, fontFamily: T.sans,
        lineHeight: 1.6, marginBottom: 22,
      }}>{sub}</div>
      {children}
    </div>
  )
}

// ── Mock: Log ─────────────────────────────────────────────────────────────────

function LogMock() {
  return (
    <div style={{ background: T.card, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ position: 'relative' }}>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/e/ec/Charli_XCX_Lollapalooza.JPG"
          alt="Charli XCX performing"
          style={{ width: '100%', height: 140, objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
        />
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          fontSize: 9, color: 'rgba(255,255,255,0.55)', letterSpacing: '0.08em',
          textTransform: 'uppercase', fontFamily: T.sans,
          background: 'rgba(0,0,0,0.45)', padding: '3px 8px', borderRadius: 3,
        }}>📷 Add photo / video</div>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{
          width: 44, height: 44, background: T.cardInner, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
        }}>
          <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: T.accent }}>9.2</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 600, color: T.white, marginBottom: 1 }}>Charli XCX</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.sans }}>Main Stage · Night 2</div>
        </div>
      </div>
      <div style={{ padding: '0 16px 8px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontFamily: T.sans, lineHeight: 1.5 }}>
        "absolute supernova. never left the floor once."
      </div>
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 5 }}>
        {['#transcendent', '#crowd-energy'].map(tag => (
          <span key={tag} style={{
            fontSize: 9, padding: '3px 9px', borderRadius: 20,
            background: T.accentDim, color: T.accentMuted, border: `1px solid ${T.accentBorder}`,
            fontFamily: T.sans,
          }}>{tag}</span>
        ))}
      </div>
    </div>
  )
}

// ── Mock: Feed ────────────────────────────────────────────────────────────────

function FeedMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[
        {
          name: 'Jungle', score: '8.7', stage: 'Side Stage · Night 1',
          user: '@festivalrat', review: '"peaked at Keep Moving — room went sideways"',
          tags: ['#peak-energy'], time: '4m ago',
          photo: 'https://upload.wikimedia.org/wikipedia/commons/7/78/Jungle-band-by-moncboy.jpg',
        },
        {
          name: 'Magdalena Bay', score: '9.4', stage: 'The Tent · Night 3',
          user: '@nachtfalke', review: '"best set of the weekend, no contest"',
          tags: ['#unexpected-setlist'], time: '12m ago',
          photo: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Magdalena_Bay_at_Union_Transfer.jpg',
        },
      ].map((item, i) => (
        <div key={i} style={{ background: T.card, borderRadius: 4, overflow: 'hidden' }}>
          <img src={item.photo} alt={item.name}
            style={{ width: '100%', height: 100, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
          <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, background: T.cardInner, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
            }}>
              <span style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: T.accent }}>{item.score}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                <div style={{ fontFamily: T.serif, fontSize: 13, fontWeight: 600, color: T.white }}>{item.name}</div>
                <div style={{ fontSize: 9, color: T.faint, fontFamily: T.sans, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.time}</div>
              </div>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 2 }}>{item.stage}</div>
              <div style={{ fontSize: 10, color: T.accent, fontFamily: T.sans, marginBottom: 4 }}>{item.user}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontStyle: 'italic', fontFamily: T.sans, lineHeight: 1.4, marginBottom: 6 }}>{item.review}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {item.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 9, padding: '2px 7px', borderRadius: 20,
                    background: T.accentDim, color: T.accentMuted, border: `1px solid ${T.accentBorder}`,
                    fontFamily: T.sans,
                  }}>{tag}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Mock: Rankings ────────────────────────────────────────────────────────────

function RankingsMock() {
  const items = [
    { rank: 1, name: 'Charli XCX',    score: '9.1', emoji: '⚡', logs: 38 },
    { rank: 2, name: 'Magdalena Bay', score: '8.9', emoji: '🌙', logs: 27 },
    { rank: 3, name: 'Jungle',        score: '8.7', emoji: '🌿', logs: 24 },
    { rank: 4, name: 'Bad Bunny',     score: '8.4', emoji: '🐰', logs: 42 },
  ]
  return (
    <div style={{ background: T.card, borderRadius: 4, overflow: 'hidden' }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 5 }}>
        {['All Days', 'Day 1', 'Day 2', 'Day 3'].map((d, i) => (
          <button key={d} style={{
            padding: '4px 9px', borderRadius: 4, fontSize: 9, border: 'none', cursor: 'default',
            background: i === 0 ? T.accent : 'rgba(255,255,255,0.04)',
            color: i === 0 ? '#fff' : 'rgba(255,255,255,0.3)',
            fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{d}</button>
        ))}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
          borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
          background: i === 0 ? 'rgba(211,84,0,0.04)' : 'transparent',
        }}>
          <div style={{ width: 18, textAlign: 'right', flexShrink: 0, fontFamily: T.sans, fontSize: 11, color: i === 0 ? T.accent : T.faint, fontWeight: 700 }}>{item.rank}</div>
          <span style={{ fontSize: 16 }}>{item.emoji}</span>
          <div style={{ flex: 1, fontFamily: T.serif, fontSize: 14, fontWeight: 600, color: T.white }}>{item.name}</div>
          <div style={{ fontSize: 10, color: T.faint, fontFamily: T.sans, marginRight: 6 }}>{item.logs} logs</div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: i === 0 ? T.accent : T.white }}>{item.score}</div>
        </div>
      ))}
    </div>
  )
}

// ── Mock: Artist ──────────────────────────────────────────────────────────────

function ArtistMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: T.card, borderRadius: 4, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ fontSize: 32 }}>🌙</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.white, marginBottom: 2 }}>Magdalena Bay</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>The Tent · Night 3</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: T.serif, fontSize: 34, fontWeight: 700, color: T.accent, lineHeight: 1 }}>8.9</div>
          <div style={{ fontSize: 9, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, marginTop: 2 }}>27 ratings</div>
        </div>
      </div>
      <div style={{ background: T.card, borderRadius: 4, padding: '14px 16px' }}>
        <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 10 }}>Top Reactions</div>
        {[{ emoji: '🌙', label: 'ethereal', pct: 72 }, { emoji: '⚡', label: 'electric', pct: 58 }, { emoji: '🔥', label: 'fire', pct: 44 }].map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, width: 20 }}>{r.emoji}</span>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: T.sans, width: 55 }}>{r.label}</div>
            <div style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${r.pct}%`, height: '100%', background: T.accent, borderRadius: 2 }} />
            </div>
            <div style={{ fontSize: 10, color: T.faint, fontFamily: T.sans, width: 28, textAlign: 'right' }}>{r.pct}%</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Mock: Profile ─────────────────────────────────────────────────────────────

function ProfileMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: T.card, borderRadius: 4, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: 'rgba(211,84,0,0.2)', border: `1.5px solid ${T.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.serif, fontSize: 16, color: T.accent, flexShrink: 0,
        }}>A</div>
        <div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: T.white, marginBottom: 1 }}>@festivalrat</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>Festival Season · 2026</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ label: 'Shows Logged', value: '14' }, { label: 'Avg Rating', value: '8.2' }].map(s => (
          <div key={s.label} style={{ flex: 1, background: T.card, borderRadius: 4, padding: '14px', textAlign: 'center' }}>
            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.accent, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: T.card, borderRadius: 4, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>⚡</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: T.accent, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 1 }}>Top Rated</div>
          <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: T.white }}>Charli XCX</div>
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, color: T.accent }}>9.2</div>
      </div>
    </div>
  )
}

// ── Embedded sign-up form ─────────────────────────────────────────────────────

function SignUpSlide() {
  const router = useRouter()
  const supabase = createClient()
  const [mode, setMode]         = useState<'signup' | 'signin'>('signup')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit() {
    setError(null)
    setLoading(true)
    if (mode === 'signup') {
      const { data, error: err } = await supabase.auth.signUp({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
      if (data.user) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          username: username.trim().toLowerCase().replace(/\s+/g, '_'),
        })
      }
    } else {
      const { error: err } = await supabase.auth.signInWithPassword({ email, password })
      if (err) { setError(err.message); setLoading(false); return }
    }
    setLoading(false)
    const hasFestival = localStorage.getItem(LOCAL_STORAGE_KEY)
    router.push(hasFestival ? '/feed' : '/select-festival')
  }

  return (
    <div style={{ padding: '52px 24px 90px' }}>
      <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 700, color: T.accent, letterSpacing: '0.04em', marginBottom: 20 }}>Gigl</div>

      <div style={{ fontSize: 10, color: T.accent, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 600, marginBottom: 8 }}>
        {mode === 'signup' ? 'Create your account' : 'Welcome back'}
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 28 }}>
        {mode === 'signup'
          ? <><span>Rate the sets.</span><br /><span style={{ color: T.accent, fontStyle: 'italic' }}>Own the moment.</span></>
          : <><span>Good to have</span><br /><span style={{ color: T.accent, fontStyle: 'italic' }}>you back.</span></>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
        {mode === 'signup' && (
          <div style={{ background: T.card, borderRadius: 4, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 5 }}>Username</div>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="how you'll appear in the feed"
              style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: T.white, fontSize: 14, fontFamily: T.sans }} />
          </div>
        )}
        <div style={{ background: T.card, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 5 }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: T.white, fontSize: 14, fontFamily: T.sans }} />
        </div>
        <div style={{ background: T.card, borderRadius: 4, padding: '12px 14px' }}>
          <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 5 }}>Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: T.white, fontSize: 14, fontFamily: T.sans }} />
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#e05555', fontFamily: T.sans, padding: '10px 14px', background: 'rgba(224,85,85,0.08)', borderRadius: 4, lineHeight: 1.5, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', background: T.accent, border: 'none', borderRadius: 4,
        padding: 16, cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, marginBottom: 16,
        boxShadow: '0 6px 24px rgba(211,84,0,0.3)',
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans }}>
          {loading ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
        </span>
      </button>

      <div style={{ textAlign: 'center', fontSize: 13, color: T.muted, fontFamily: T.sans }}>
        {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
        <span onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setError(null) }}
          style={{ color: T.accent, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 3 }}>
          {mode === 'signup' ? 'Sign in' : 'Sign up'}
        </span>
      </div>
    </div>
  )
}

// ── Carousel ──────────────────────────────────────────────────────────────────

const TOTAL_SLIDES = 7

export default function LandingPage() {
  const router = useRouter()
  const supabase = createClient()
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/feed')
    })
  }, [])

  function next() { setCurrent(c => Math.min(c + 1, TOTAL_SLIDES - 1)) }
  function prev() { setCurrent(c => Math.max(c - 1, 0)) }

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = touchStartX.current - e.changedTouches[0].clientX
    const dy = Math.abs(touchStartY.current - e.changedTouches[0].clientY)
    if (Math.abs(dx) > 40 && Math.abs(dx) > dy) {
      if (dx > 0) next()
      else prev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      style={{ height: '100vh', overflow: 'hidden', position: 'relative', background: T.bg }}
    >
      {/* Track */}
      <div style={{
        display: 'flex',
        height: '100%',
        transform: `translateX(${-current * 100}%)`,
        transition: 'transform 0.42s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        willChange: 'transform',
      }}>

        {/* Slide 1 — Hero */}
        <div style={{ minWidth: '100%', height: '100%', overflowY: 'auto' }}>
          <div style={{ padding: '72px 24px 90px', display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
            <div>
              <div style={{ fontFamily: T.serif, fontSize: 42, fontWeight: 700, color: T.accent, letterSpacing: '0.04em', marginBottom: 6 }}>Gigl</div>
              <div style={{ fontSize: 10, color: T.faint, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 48 }}>
                Live music · Festival season · Your rankings
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.serif, fontSize: 40, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: 18 }}>
                Rate every set.<br />
                <span style={{ color: T.accent, fontStyle: 'italic' }}>Rank every moment.</span>
              </div>
              <div style={{ fontSize: 15, color: T.muted, fontFamily: T.sans, lineHeight: 1.7, marginBottom: 40 }}>
                Letterboxd for live music. Log sets right after you see them, score artists, and see what everyone around you is rating — in real-time.
              </div>
              <button onClick={next} style={{
                width: '100%', background: T.accent, border: 'none', borderRadius: 4,
                padding: '16px 0', cursor: 'pointer', boxShadow: '0 6px 28px rgba(211,84,0,0.3)',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans }}>
                  See How It Works →
                </span>
              </button>
            </div>
            <div style={{ textAlign: 'center', paddingTop: 32 }}>
              <div style={{ fontSize: 9, color: T.faint, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 5 }}>Swipe to explore</div>
              <div style={{ color: T.faint, fontSize: 16, animation: 'nudge 2s ease-in-out infinite' }}>→</div>
            </div>
          </div>
        </div>

        {/* Slide 2 — Log */}
        <div style={{ minWidth: '100%', height: '100%', overflowY: 'auto' }}>
          <SlideShell label="01 / Log" line1="Log the set while" line2="it's still ringing." sub="Rate a show the moment it ends. Add a photo, write what you felt, tag the vibe — your very own concert diary.">
            <LogMock />
          </SlideShell>
        </div>

        {/* Slide 3 — Feed */}
        <div style={{ minWidth: '100%', height: '100%', overflowY: 'auto' }}>
          <SlideShell label="02 / Feed" line1="See what everyone" line2="is ranking." sub="A live activity feed of every rated set. Find the show you almost skipped before the headliner goes on.">
            <FeedMock />
          </SlideShell>
        </div>

        {/* Slide 4 — Rankings */}
        <div style={{ minWidth: '100%', height: '100%', overflowY: 'auto' }}>
          <SlideShell label="03 / Rankings" line1="The crowd scores" line2="every artist." sub="Real-time leaderboard updated as logs come in. Filter by day. See who delivered — and who didn't.">
            <RankingsMock />
          </SlideShell>
        </div>

        {/* Slide 5 — Artist */}
        <div style={{ minWidth: '100%', height: '100%', overflowY: 'auto' }}>
          <SlideShell label="04 / Artist" line1="Every artist," line2="scored by the crowd." sub="Tap any artist to see their score, breakdown, top reactions, and reviews from everyone who caught the set.">
            <ArtistMock />
          </SlideShell>
        </div>

        {/* Slide 6 — Profile */}
        <div style={{ minWidth: '100%', height: '100%', overflowY: 'auto' }}>
          <SlideShell label="05 / Profile" line1="Your festival," line2="on record." sub="Every show you've seen, tracked. Your ratings, your stats, your top picks — all in one place.">
            <ProfileMock />
          </SlideShell>
        </div>

        {/* Slide 7 — Sign Up */}
        <div style={{ minWidth: '100%', height: '100%', overflowY: 'auto' }}>
          <SignUpSlide />
        </div>

      </div>

      {/* Dot indicators */}
      <div style={{
        position: 'absolute', bottom: 28, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6,
        pointerEvents: 'none',
      }}>
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div key={i} style={{
            height: 5, borderRadius: 3,
            width: i === current ? 22 : 5,
            background: i === current ? T.accent : 'rgba(255,255,255,0.18)',
            transition: 'width 0.3s ease, background 0.3s ease',
          }} />
        ))}
      </div>

      <style>{`
        @keyframes nudge {
          0%, 100% { transform: translateX(0);   opacity: 0.35; }
          50%       { transform: translateX(5px); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}
