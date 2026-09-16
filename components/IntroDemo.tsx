'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronUp, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DockBar, LogTip } from '@/components/BottomNav'
import { Logo } from '@/components/Logo'
import {
  ArtistPhoto, Card, Chip, DateTag, HeaderPhoto, Label, PersonPhoto, Place, PullQuote, Segmented, Stars, TopBar,
  btnPrimary, btnSecondary, headerClass, inputBox,
} from '@/components/ui'

// The logged-out landing: a 16-second tour of the real screens (feed, show
// search, rating, rankings) played inside a mock phone, built from the same
// components as the app. Tapping or swiping anywhere goes to sign-up.
//
// Everything runs on one clock from mount: the phone pans between scenes via
// the introPan keyframes, and each tap/fill inside a scene is a CSS animation
// with an absolute delay (in seconds) on that same clock.

const DURATION_MS = 16000

// When each scene has finished panning into view (see introPan).
const SCENE_STARTS_MS = [0, 3900, 8000, 12100]

const CAPTIONS = [
  { label: 'The feed',   title: "See what everyone's seeing" },
  { label: 'Log a show', title: 'Find the show you saw' },
  { label: 'Rate it',    title: 'Stars in a few taps' },
  { label: 'Rankings',   title: 'Watch the rankings move' },
]

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

const ME = 'You'

// ── Animation helpers ────────────────────────────────────────────────────────

function Appear({ at, className = '', children }: { at: number; className?: string; children: React.ReactNode }) {
  return (
    <div className={`opacity-0 ${className}`} style={{ animation: `introFadeIn 0.4s ease-out ${at}s forwards` }}>
      {children}
    </div>
  )
}

// A fingertip pressing down: a contact ring plus a pointing finger, centred
// on whatever positioned element it's dropped inside.
function FingerTap({ delay }: { delay: number }) {
  return (
    <span
      className="pointer-events-none absolute top-1/2 left-1/2 z-20 opacity-0"
      style={{ animation: `introFingerTap 1.8s ease-out ${delay}s forwards` }}
    >
      <span className="absolute -mt-[13px] -ml-[13px] w-[26px] h-[26px] rounded-full bg-ink/25 border-2 border-ink/50" />
      <span className="absolute -mt-[30px] -ml-1.5 text-[22px] leading-none -rotate-[14deg]">👆</span>
    </span>
  )
}

// Accent wash that fades in over a tapped row.
function TapHighlight({ at }: { at: number }) {
  return (
    <span
      className="pointer-events-none absolute inset-0 bg-accent/10 border-2 border-accent opacity-0"
      style={{ animation: `introFadeIn 0.3s ease-out ${at}s forwards` }}
    />
  )
}

// Stars that pop in one at a time, as if being tapped in.
function TapStars({ count, size, delay, stagger = 0.15 }: { count: number; size: number; delay: number; stagger?: number }) {
  return (
    <span className="inline-flex gap-0.5 text-star">
      {[0, 1, 2, 3, 4].map(i => (
        <span key={i} className="relative inline-block flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="block">
            <polygon points={STAR_POINTS} />
          </svg>
          {i < count && (
            <span
              className="absolute inset-0 opacity-0"
              style={{ animation: `introStarPop 0.5s ease-out ${delay + i * stagger}s forwards` }}
            >
              <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" className="block">
                <polygon points={STAR_POINTS} />
              </svg>
            </span>
          )}
        </span>
      ))}
    </span>
  )
}

// ── Scene 1: the feed, then a tap on Log ─────────────────────────────────────

const FEED = [
  { handle: 'malabracadabra', when: '2h ago', score: 14 / 3, artist: 'Death Cab for Cutie', place: 'The Greek Theatre, Berkeley',  date: '2026-09-12', quote: 'Front row for Plans in full. Suspended in time.' },
  { handle: 'jonny.b',        when: '5h ago', score: 4,      artist: 'Japanese Breakfast',  place: 'The Fillmore, San Francisco', date: '2026-09-10', quote: 'The horn section turned the encore into a party.' },
  { handle: 'sam_hears',      when: '1d ago', score: 5,      artist: 'Mitski',              place: 'The Wiltern, Los Angeles',    date: '2026-09-02', quote: 'Pin-drop quiet room. Unreal.' },
]

function FeedScene() {
  return (
    <div className="relative h-full bg-paper overflow-hidden">
      <TopBar right={<HeaderPhoto name={ME} />}>
        <Logo />
      </TopBar>

      <div className="px-4 pt-3 space-y-3">
        <Segmented
          options={[{ value: 'all', label: 'All activity' }, { value: 'following', label: 'Following' }]}
          value="all"
          onChange={() => {}}
        />
        {FEED.map(r => (
          <Card key={r.handle} className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <PersonPhoto name={r.handle} className="w-7 h-7 text-xs border border-ink/15" />
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold truncate">@{r.handle}</p>
                  <p className="text-[10px] text-ink-muted">{r.when}</p>
                </div>
              </div>
              <Stars score={r.score} size={13} />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0 space-y-0.5">
                <h3 className="font-display text-lg font-bold tracking-tight leading-tight truncate">{r.artist}</h3>
                <Place>{r.place}</Place>
              </div>
              <ArtistPhoto name={r.artist} className="w-14 h-14" iconSize={18}>
                <DateTag isoDate={r.date} />
              </ArtistPhoto>
            </div>
            <PullQuote>{r.quote}</PullQuote>
          </Card>
        ))}
      </div>

      <DockBar
        active="feed"
        mode="static"
        contained
        logTip={<LogTip style={{ opacity: 0, animation: 'introFadeIn 0.4s ease-out 0.3s forwards' }} />}
        logExtras={<FingerTap delay={1.8} />}
        logButtonStyle={{ animation: 'introPress 0.5s ease-out 1.8s' }}
      />
    </div>
  )
}

// ── Scene 2: search for the show and pick it ─────────────────────────────────

const RESULTS = [
  { artist: 'Turnstile',            place: 'Hollywood Palladium', date: '2026-09-24' },
  { artist: 'Turnover',             place: 'The Regent',          date: '2026-10-03' },
  { artist: 'Turnpike Troubadours', place: 'Greek Theatre',       date: '2026-10-11' },
]

function SearchScene() {
  return (
    <div className="relative h-full bg-paper overflow-hidden">
      <TopBar right={<HeaderPhoto name={ME} />}>
        <div className="min-w-0">
          <Label>Log a show</Label>
          <h2 className="font-display text-2xl font-bold tracking-tight leading-tight">
            What did you see<span className="text-accent">?</span>
          </h2>
        </div>
      </TopBar>

      <div className="px-4 pt-3">
        <div className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5`}>
          <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <span className="relative flex-1 text-sm">
            <span className="text-ink-faint" style={{ animation: 'introFadeOut 0.15s linear 4.5s forwards' }}>
              Artist, venue or city
            </span>
            <span className="absolute inset-0 opacity-0" style={{ animation: 'introFadeIn 0.3s ease-out 4.55s forwards' }}>
              turn<span className="ml-px inline-block w-px h-4 align-middle bg-ink" style={{ animation: 'introBlink 1s steps(1) infinite' }} />
            </span>
          </span>
        </div>
      </div>

      <Appear at={4.9}>
        <Label className="px-4 pt-4 pb-2">Results for &ldquo;turn&rdquo;</Label>
      </Appear>
      <Appear at={5.0} className="mx-4 rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
        {RESULTS.map((r, i) => (
          <div
            key={r.artist}
            className={`relative flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}
          >
            <ArtistPhoto name={r.artist} className="w-12 h-12" iconSize={16}>
              <DateTag isoDate={r.date} />
            </ArtistPhoto>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-[15px] font-bold leading-tight truncate">{r.artist}</h3>
              <Place className="mt-0.5">{r.place}</Place>
            </div>
            <span className={`${btnSecondary} flex-shrink-0 px-2 py-1 text-[10px]`}>+ Log</span>
            {i === 0 && (
              <>
                <TapHighlight at={5.85} />
                <FingerTap delay={5.7} />
              </>
            )}
          </div>
        ))}
      </Appear>

      <DockBar active="log" mode="static" contained />
    </div>
  )
}

// ── Scene 3: rate it ─────────────────────────────────────────────────────────

const RATING_ROWS = [
  { label: 'Performance', count: 5, tap: 8.35 },
  { label: 'Venue',       count: 4, tap: 9.15 },
  { label: 'Crowd',       count: 5, tap: 9.85 },
]

function RateScene() {
  return (
    <div className="relative h-full bg-paper overflow-hidden">
      <header className={headerClass}>
        <h2 className="flex-1 font-display text-[17px] font-bold tracking-tight">Log a show</h2>
        <X className="w-5 h-5 text-ink-muted" strokeWidth={2} />
      </header>

      <div className="px-4 pt-3 space-y-3.5">
        <Card className="p-3 flex items-center gap-3">
          <ArtistPhoto name="Turnstile" className="w-12 h-12" iconSize={16} />
          <div className="min-w-0">
            <Label tone="accent">Sep 24</Label>
            <h3 className="font-display text-base font-bold leading-tight">Turnstile</h3>
            <Place className="mt-0.5">Hollywood Palladium</Place>
          </div>
        </Card>

        <Card className="p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <Label tone="ink">Your rating</Label>
            <Appear at={10.3}><Stars score={14 / 3} size={14} /></Appear>
          </div>
          {RATING_ROWS.map(row => (
            <div key={row.label} className="flex items-center justify-between gap-3">
              <p className="font-display text-[15px] font-bold">{row.label}<span className="text-accent">*</span></p>
              <span className="relative">
                <TapStars count={row.count} size={24} delay={row.tap + 0.1} />
                <FingerTap delay={row.tap} />
              </span>
            </div>
          ))}
        </Card>

        <div className="space-y-1.5">
          <Label tone="ink">Field notes</Label>
          <div className={`${inputBox} px-3 py-2.5 min-h-[44px] text-[13px] leading-snug`}>
            <Appear at={10.65}>Never left the pit once. That breakdown is still ringing in my ears.</Appear>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label tone="ink">Highlights</Label>
          <div className="flex flex-wrap gap-1.5">
            <span className="relative">
              <Chip>Crowd surf</Chip>
              <span className="absolute inset-0 opacity-0" style={{ animation: 'introFadeIn 0.3s ease-out 10.95s forwards' }}>
                <Chip active>Crowd surf</Chip>
              </span>
              <FingerTap delay={10.85} />
            </span>
            <Chip>Sing along</Chip>
            <Chip>Packed crowd</Chip>
          </div>
        </div>

        <span
          className={`${btnPrimary} relative w-full py-3.5 text-xs`}
          style={{ animation: 'introPress 0.5s ease-out 11.45s' }}
        >
          Save log
          <FingerTap delay={11.35} />
        </span>
      </div>
    </div>
  )
}

// ── Scene 4: the rankings ────────────────────────────────────────────────────

const RANKED = [
  { artist: 'Turnstile',           place: 'Hollywood Palladium', date: '2026-09-24', score: 5,      count: 64 },
  { artist: 'Mitski',              place: 'The Wiltern',         date: '2026-09-02', score: 14 / 3, count: 51 },
  { artist: 'Japanese Breakfast',  place: 'The Fillmore',        date: '2026-09-10', score: 14 / 3, count: 38 },
  { artist: 'Death Cab for Cutie', place: 'The Greek Theatre',   date: '2026-09-12', score: 13 / 3, count: 47 },
  { artist: 'Fred again..',        place: 'LA Coliseum',         date: '2026-07-30', score: 13 / 3, count: 90 },
  { artist: 'Phoebe Bridgers',     place: 'Hollywood Bowl',      date: '2026-08-18', score: 4,      count: 29 },
]

function RankingsScene() {
  return (
    <div className="relative h-full bg-paper overflow-hidden">
      <TopBar right={<HeaderPhoto name={ME} />}>
        <div className="min-w-0">
          <Label>Everyone&apos;s ratings</Label>
          <h2 className="font-display text-2xl font-bold tracking-tight leading-tight">Rankings</h2>
        </div>
      </TopBar>

      <div className="px-4 pt-3 space-y-2.5">
        {RANKED.map((r, i) => (
          <Card key={r.artist} className="relative p-2.5 flex items-center gap-2.5 overflow-hidden">
            <span className="font-display text-2xl font-bold leading-none w-6 flex-shrink-0 text-center text-accent">{i + 1}</span>
            <ArtistPhoto name={r.artist} className="w-12 h-12" iconSize={16}>
              <DateTag isoDate={r.date} />
            </ArtistPhoto>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-[15px] font-bold leading-tight truncate">{r.artist}</h3>
                <Stars score={r.score} size={11} />
              </div>
              <Place className="mt-0.5">{r.place}</Place>
              <div className="mt-1"><Chip>{r.count} ratings</Chip></div>
            </div>
            {i === 0 && <TapHighlight at={12.5} />}
          </Card>
        ))}
      </div>

      <DockBar active="rankings" mode="static" contained />
    </div>
  )
}

// ── Intro shell ──────────────────────────────────────────────────────────────

export default function IntroDemo() {
  const router   = useRouter()
  const supabase = createClient()

  const [ready, setReady] = useState(false)
  const [scene, setScene] = useState(0)
  const navigatedRef = useRef(false)
  const panRef = useRef<HTMLDivElement>(null)

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

    // Captions and the hand-off to sign-up follow the pan animation's own
    // clock rather than timers, so they can't run ahead of it (browsers pause
    // animations in a background tab but keep timers going).
    const pan = panRef.current?.getAnimations().find(a => (a as CSSAnimation).animationName === 'introPan')
    if (!pan) {
      const t = setTimeout(goToAuth, DURATION_MS)
      return () => clearTimeout(t)
    }

    let frame = 0
    const tick = () => {
      const elapsed = Number(pan.currentTime ?? 0)
      if (elapsed >= DURATION_MS) { goToAuth(); return }
      const current = SCENE_STARTS_MS.filter(ms => elapsed >= ms).length - 1
      setScene(s => (s === current ? s : current))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    pan.addEventListener('finish', goToAuth)

    return () => {
      cancelAnimationFrame(frame)
      pan.removeEventListener('finish', goToAuth)
    }
  }, [ready])

  const touchStartY = useRef<number | null>(null)
  function onTouchStart(e: React.TouchEvent) { touchStartY.current = e.touches[0].clientY }
  function onTouchEnd() { touchStartY.current = null; goToAuth() }

  if (!ready) {
    return <div className="h-[100dvh] bg-paper" />
  }

  const caption = CAPTIONS[scene]

  return (
    <div
      onClick={goToAuth}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      className="relative h-[100dvh] w-full overflow-hidden bg-paper text-ink cursor-pointer touch-none flex flex-col items-center px-4 pt-4 pb-3"
    >
      <div className="w-full flex items-center justify-between">
        <Logo />
        <button
          type="button"
          onClick={e => { e.stopPropagation(); goToAuth() }}
          className={`${btnSecondary} px-3 py-1.5 text-[10px]`}
        >
          Skip →
        </button>
      </div>

      {/* Re-keyed per scene so each caption fades in fresh. */}
      <div key={scene} className="w-full my-3 text-center" style={{ animation: 'introFadeIn 0.4s ease-out' }}>
        <Label tone="accent">{scene + 1} of {CAPTIONS.length} · {caption.label}</Label>
        <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
          {caption.title}<span className="text-accent">.</span>
        </h1>
      </div>

      {/* Mock phone, so the tour reads as a demo rather than the real app. */}
      <div className="relative flex-1 min-h-0 w-full max-w-[390px] rounded-[34px] bg-ink p-2 shadow-riso-lg">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 w-[70px] h-4 rounded-b-xl bg-ink" />
        <div className="relative w-full h-full rounded-[26px] overflow-hidden bg-paper">
          <div
            ref={panRef}
            className="absolute inset-x-0 top-0 h-[400%] flex flex-col"
            style={{ animation: `introPan ${DURATION_MS}ms linear forwards` }}
          >
            <div className="h-1/4 pt-3"><FeedScene /></div>
            <div className="h-1/4 pt-3"><SearchScene /></div>
            <div className="h-1/4 pt-3"><RateScene /></div>
            <div className="h-1/4 pt-3"><RankingsScene /></div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-col items-center gap-2 pointer-events-none">
        <div className="flex gap-1.5">
          {CAPTIONS.map((c, i) => (
            <span
              key={c.label}
              className={`h-2 rounded-full border border-ink transition-all duration-300 ${i === scene ? 'w-6 bg-accent' : 'w-2 bg-cream'}`}
            />
          ))}
        </div>
        <div
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-label text-accent"
          style={{ animation: 'introHintPulse 1.6s ease-in-out infinite' }}
        >
          <ChevronUp className="w-3.5 h-3.5" strokeWidth={3} />
          Swipe up to sign up
        </div>
      </div>

      <style>{`
        @keyframes introPan {
          0%      { transform: translateY(0); }
          23.125% { transform: translateY(0); }
          25.625% { transform: translateY(-25%); }
          48.75%  { transform: translateY(-25%); }
          51.25%  { transform: translateY(-50%); }
          74.375% { transform: translateY(-50%); }
          76.875% { transform: translateY(-75%); }
          100%    { transform: translateY(-75%); }
        }
        @keyframes introHintPulse {
          0%, 100% { opacity: 0.55; transform: translateY(0); }
          50%       { opacity: 1;    transform: translateY(-3px); }
        }
        @keyframes introFingerTap {
          0%   { opacity: 0; transform: scale(0.7); }
          25%  { opacity: 1; transform: scale(1); }
          70%  { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.9); }
        }
        @keyframes introPress {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
        @keyframes introStarPop {
          0%   { opacity: 0; transform: scale(0.4); }
          60%  { opacity: 1; transform: scale(1.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes introFadeIn  { from { opacity: 0; } to { opacity: 1; } }
        @keyframes introFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes introBlink   { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
      `}</style>
    </div>
  )
}
