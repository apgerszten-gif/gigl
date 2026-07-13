'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'

const T = {
  bg:           '#EDE3D0',
  card:         '#FAF3E2',
  cardInner:    '#EDE3D0',
  ink:          '#4A3528',
  accent:       '#B85827',
  accentDim:    'rgba(184,88,39,0.12)',
  accentBorder: 'rgba(184,88,39,0.28)',
  accentMuted:  'rgba(184,88,39,0.70)',
  muted:        '#8B7560',
  faint:        '#B8A898',
  cardBorder:   '1.5px solid #4A3528',
  cardShadow:   '2px 2px 0 #4A3528',
  serif:        "'Space Grotesk', sans-serif",
  sans:         "'Inter', sans-serif",
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
        lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 8, color: T.ink,
      }}>
        {line1}<br />
        <span style={{ color: T.accent }}>{line2}</span>
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
    <div style={{ background: T.card, borderRadius: 5, overflow: 'hidden', border: T.cardBorder, boxShadow: T.cardShadow }}>
      <div style={{ position: 'relative' }}>
        <img
          src="https://upload.wikimedia.org/wikipedia/commons/e/ec/Charli_XCX_Lollapalooza.JPG"
          alt="Charli XCX performing"
          style={{ width: '100%', height: 140, objectFit: 'cover', objectPosition: 'center top', display: 'block' }}
        />
        <div style={{
          position: 'absolute', bottom: 8, right: 10,
          fontSize: 9, color: 'rgba(250,243,226,0.85)', letterSpacing: '0.08em',
          textTransform: 'uppercase', fontFamily: T.sans,
          background: 'rgba(74,53,40,0.65)', padding: '3px 8px', borderRadius: 3,
        }}>📷 Add photo / video</div>
      </div>
      <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{
          width: 44, height: 44, background: T.accent, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
          border: T.cardBorder,
        }}>
          <span style={{ fontFamily: T.serif, fontSize: 16, fontWeight: 700, color: '#FAF3E2' }}>9.2</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 600, color: T.ink, marginBottom: 1 }}>Charli XCX</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.sans }}>Main Stage · Night 2</div>
        </div>
      </div>
      <div style={{ padding: '0 16px 8px', fontSize: 11, color: 'rgba(74,53,40,0.55)', fontStyle: 'italic', fontFamily: T.sans, lineHeight: 1.5 }}>
        &ldquo;absolute supernova. never left the floor once.&rdquo;
      </div>
      <div style={{ padding: '0 16px 14px', display: 'flex', gap: 5 }}>
        {['#transcendent', '#crowd-energy'].map(tag => (
          <span key={tag} style={{
            fontSize: 9, padding: '3px 9px', borderRadius: 20,
            background: T.accentDim, color: T.accentMuted, border: `1.5px solid ${T.accentBorder}`,
            fontFamily: T.sans, fontWeight: 600,
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
          top: true,
        },
        {
          name: 'Magdalena Bay', score: '9.4', stage: 'The Tent · Night 3',
          user: '@nachtfalke', review: '"best set of the weekend, no contest"',
          tags: ['#unexpected-setlist'], time: '12m ago',
          photo: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Magdalena_Bay_at_Union_Transfer.jpg',
          top: false,
        },
      ].map((item, i) => (
        <div key={i} style={{
          background: T.card, borderRadius: 5, overflow: 'hidden',
          border: T.cardBorder, boxShadow: item.top ? T.cardShadow : 'none',
        }}>
          <img src={item.photo} alt={item.name}
            style={{ width: '100%', height: 100, objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
          <div style={{ padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <div style={{
              width: 40, height: 40, background: T.accent, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4,
              border: T.cardBorder, boxShadow: item.top ? T.cardShadow : 'none',
            }}>
              <span style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: '#FAF3E2' }}>{item.score}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 1 }}>
                <div style={{ fontFamily: T.serif, fontSize: 13, fontWeight: 600, color: T.ink }}>{item.name}</div>
                <div style={{ fontSize: 9, color: T.faint, fontFamily: T.sans, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{item.time}</div>
              </div>
              <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 2 }}>{item.stage}</div>
              <div style={{ fontSize: 10, color: T.accent, fontFamily: T.sans, marginBottom: 4 }}>{item.user}</div>
              <div style={{ fontSize: 10, color: 'rgba(74,53,40,0.55)', fontStyle: 'italic', fontFamily: T.sans, lineHeight: 1.4, marginBottom: 6 }}>{item.review}</div>
              <div style={{ display: 'flex', gap: 4 }}>
                {item.tags.map(tag => (
                  <span key={tag} style={{
                    fontSize: 9, padding: '2px 7px', borderRadius: 20,
                    background: T.accentDim, color: T.accentMuted, border: `1.5px solid ${T.accentBorder}`,
                    fontFamily: T.sans, fontWeight: 600,
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
    <div style={{ background: T.card, borderRadius: 5, overflow: 'hidden', border: T.cardBorder, boxShadow: T.cardShadow }}>
      <div style={{ padding: '8px 12px', borderBottom: '1px solid rgba(74,53,40,0.08)', display: 'flex', gap: 5 }}>
        {['All Days', 'Day 1', 'Day 2', 'Day 3'].map((d, i) => (
          <button key={d} style={{
            padding: '4px 9px', borderRadius: 4, fontSize: 9, border: 'none', cursor: 'default',
            background: i === 0 ? T.ink : 'rgba(74,53,40,0.06)',
            color: i === 0 ? '#FAF3E2' : T.muted,
            fontFamily: T.sans, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
          }}>{d}</button>
        ))}
      </div>
      {items.map((item, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
          borderBottom: i < items.length - 1 ? '1px solid rgba(74,53,40,0.08)' : 'none',
          background: i === 0 ? T.accentDim : 'transparent',
        }}>
          <div style={{ width: 18, textAlign: 'right', flexShrink: 0, fontFamily: T.sans, fontSize: 11, color: i === 0 ? T.accent : T.faint, fontWeight: 700 }}>{item.rank}</div>
          <span style={{ fontSize: 16 }}>{item.emoji}</span>
          <div style={{ flex: 1, fontFamily: T.serif, fontSize: 14, fontWeight: 600, color: T.ink }}>{item.name}</div>
          <div style={{ fontSize: 10, color: T.faint, fontFamily: T.sans, marginRight: 6 }}>{item.logs} logs</div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: i === 0 ? T.accent : T.ink }}>{item.score}</div>
        </div>
      ))}
    </div>
  )
}

// ── Mock: Artist ──────────────────────────────────────────────────────────────

function ArtistMock() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ background: T.card, borderRadius: 5, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 14, border: T.cardBorder, boxShadow: T.cardShadow }}>
        <div style={{ fontSize: 32 }}>🌙</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: T.serif, fontSize: 18, fontWeight: 700, color: T.ink, marginBottom: 2 }}>Magdalena Bay</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>The Tent · Night 3</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: T.serif, fontSize: 34, fontWeight: 700, color: T.accent, lineHeight: 1 }}>8.9</div>
          <div style={{ fontSize: 9, color: T.faint, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, marginTop: 2 }}>27 ratings</div>
        </div>
      </div>
      <div style={{ background: T.card, borderRadius: 5, padding: '14px 16px', border: T.cardBorder }}>
        <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 10 }}>Top Reactions</div>
        {[{ emoji: '🌙', label: 'ethereal', pct: 72 }, { emoji: '⚡', label: 'electric', pct: 58 }, { emoji: '🔥', label: 'fire', pct: 44 }].map(r => (
          <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <span style={{ fontSize: 14, width: 20 }}>{r.emoji}</span>
            <div style={{ fontSize: 11, color: T.muted, fontFamily: T.sans, width: 55 }}>{r.label}</div>
            <div style={{ flex: 1, height: 3, background: 'rgba(74,53,40,0.08)', borderRadius: 2, overflow: 'hidden' }}>
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
      <div style={{ background: T.card, borderRadius: 5, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, border: T.cardBorder, boxShadow: T.cardShadow }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: T.accentDim, border: `1.5px solid ${T.accentBorder}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: T.serif, fontSize: 16, color: T.accent, flexShrink: 0,
        }}>A</div>
        <div>
          <div style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 700, color: T.ink, marginBottom: 1 }}>@festivalrat</div>
          <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>Festival Season · 2026</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        {[{ label: 'Shows Logged', value: '14' }, { label: 'Avg Rating', value: '8.2' }].map(s => (
          <div key={s.label} style={{ flex: 1, background: T.card, borderRadius: 5, padding: '14px', textAlign: 'center', border: T.cardBorder }}>
            <div style={{ fontFamily: T.serif, fontSize: 28, fontWeight: 700, color: T.accent, lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans, marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ background: T.card, borderRadius: 5, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, border: T.cardBorder }}>
        <span style={{ fontSize: 24 }}>⚡</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 9, color: T.accent, letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 1 }}>Top Rated</div>
          <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: T.ink }}>Charli XCX</div>
        </div>
        <div style={{ fontFamily: T.serif, fontSize: 24, fontWeight: 700, color: T.accent }}>9.2</div>
      </div>
    </div>
  )
}

// ── Mock: Groups callout ──────────────────────────────────────────────────────

function GroupsCallout() {
  return (
    <div style={{
      border: `1.5px dashed ${T.accent}`, borderRadius: 5,
      padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12,
    }}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.accent} strokeWidth="1.8" style={{ flexShrink: 0 }}>
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
      <div>
        <div style={{
          fontSize: 10, color: T.accent, letterSpacing: '0.1em',
          textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700, marginBottom: 3,
        }}>Groups</div>
        <div style={{ fontSize: 12, color: T.muted, fontFamily: T.sans, lineHeight: 1.5 }}>
          Start one with friends — see just their ratings, nobody else&apos;s.
        </div>
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
      <div style={{ fontFamily: T.serif, fontSize: 32, fontWeight: 700, color: T.ink, letterSpacing: '-0.5px', marginBottom: 4 }}>
        Gigl<span style={{ color: T.accent }}>/</span>
      </div>
      <div style={{ fontSize: 10, color: T.muted, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 20 }}>
        Festival season · 2026
      </div>

      <div style={{ fontSize: 10, color: T.accent, letterSpacing: '0.14em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700, marginBottom: 10 }}>
        {mode === 'signup' ? 'Create your account' : 'Welcome back'}
      </div>
      <div style={{ fontFamily: T.serif, fontSize: 30, fontWeight: 700, lineHeight: 1.1, letterSpacing: '-1px', marginBottom: 28, color: T.ink }}>
        {mode === 'signup'
          ? <><span>Rate the sets<span style={{ color: T.accent }}>.</span></span><br /><span>Own the moment<span style={{ color: T.accent }}>.</span></span></>
          : <><span>Good to have</span><br /><span>you back<span style={{ color: T.accent }}>.</span></span></>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
        {mode === 'signup' && (
          <div style={{ background: T.card, borderRadius: 5, padding: '14px 16px', border: T.cardBorder }}>
            <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700, marginBottom: 6 }}>Username</div>
            <input value={username} onChange={e => setUsername(e.target.value)} placeholder="how you'll appear in the feed"
              style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: T.ink, fontSize: 14, fontFamily: T.sans }} />
          </div>
        )}
        <div style={{ background: T.card, borderRadius: 5, padding: '14px 16px', border: T.cardBorder }}>
          <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700, marginBottom: 6 }}>Email</div>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com"
            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: T.ink, fontSize: 14, fontFamily: T.sans }} />
        </div>
        <div style={{ background: T.card, borderRadius: 5, padding: '14px 16px', border: T.cardBorder }}>
          <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: T.sans, fontWeight: 700, marginBottom: 6 }}>Password</div>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••"
            style={{ width: '100%', background: 'none', border: 'none', outline: 'none', color: T.ink, fontSize: 14, fontFamily: T.sans }} />
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#B03030', fontFamily: T.sans, padding: '10px 14px', background: 'rgba(160,40,40,0.08)', border: '1px solid rgba(160,40,40,0.2)', borderRadius: 5, lineHeight: 1.5, marginBottom: 8 }}>
          {error}
        </div>
      )}

      <button onClick={handleSubmit} disabled={loading} style={{
        width: '100%', background: T.accent,
        border: T.cardBorder, borderRadius: 5,
        boxShadow: T.cardShadow,
        padding: 16, cursor: loading ? 'not-allowed' : 'pointer',
        opacity: loading ? 0.7 : 1, marginBottom: 16,
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#FAF3E2', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans }}>
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

const TOTAL_SLIDES = 4

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
              <div style={{ fontFamily: T.serif, fontSize: 42, fontWeight: 700, color: T.ink, letterSpacing: '-0.5px', marginBottom: 4 }}>
                Gigl<span style={{ color: T.accent }}>/</span>
              </div>
              <div style={{ fontSize: 10, color: T.faint, letterSpacing: '0.16em', textTransform: 'uppercase', fontFamily: T.sans, marginBottom: 48 }}>
                Be the critic
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: T.serif, fontSize: 40, fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.025em', marginBottom: 18, color: T.ink }}>
                Rate every set<span style={{ color: T.accent }}>.</span><br />
                <span style={{ color: T.accent }}>Rank every moment<span style={{ color: T.accent }}>.</span></span>
              </div>
              <div style={{ fontSize: 15, color: T.muted, fontFamily: T.sans, lineHeight: 1.7, marginBottom: 40 }}>
                Letterboxd for live music. Log sets right after you see them, score artists, and see what everyone around you is rating — in real-time.
              </div>
              <button onClick={next} style={{
                width: '100%', background: T.accent,
                border: T.cardBorder, borderRadius: 5,
                boxShadow: T.cardShadow,
                padding: '16px 0', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#FAF3E2', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans }}>
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

        {/* Slide 2 — Log & feed */}
        <div style={{ minWidth: '100%', height: '100%', overflowY: 'auto' }}>
          <SlideShell label="01 / Log & feed" line1="Log it. Show it off." line2="See what everyone else thinks." sub="Rate a show the second it ends, then see what your crew and everyone else is ranking, live.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <LogMock />
              <FeedMock />
              <GroupsCallout />
            </div>
          </SlideShell>
        </div>

        {/* Slide 3 — Scores & you */}
        <div style={{ minWidth: '100%', height: '100%', overflowY: 'auto' }}>
          <SlideShell label="02 / Scores & you" line1="The crowd decides." line2="Your festival, on record." sub="A live leaderboard for every artist — plus every show you've seen, tracked as your own.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <RankingsMock />
              <ArtistMock />
              <ProfileMock />
            </div>
          </SlideShell>
        </div>

        {/* Slide 4 — Sign Up */}
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
            background: i === current ? T.accent : 'rgba(74,53,40,0.2)',
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
