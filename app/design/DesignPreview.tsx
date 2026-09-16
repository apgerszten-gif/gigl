'use client'

import { useEffect, useState } from 'react'
import { BarChart2, BookMarked, Newspaper, Pencil, Plus, Search, Share2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { StarDisplay } from '@/components/StarDisplay'

// Sample-data renderings of the DESIGN.md templates, translated to the design
// tokens per CLAUDE.md. Ratings are stars only; a show's rating is the average
// of three whole-star sub-ratings, so it lands on thirds (5, 4.67, 4.33...).

type Screen = 'feed' | 'rankings' | 'log' | 'profile'

export function DesignPreview() {
  const [screen, setScreen] = useState<Screen>('feed')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  return (
    <div className="font-epilogue text-ink-title">
      {/* Covers the legacy paper body colour outside the max-w-md column. */}
      <div className="fixed inset-0 -z-10 bg-surface" />

      <div className="bg-ink-title text-white text-[11px] font-semibold text-center px-4 py-1.5">
        Design preview · sample data
      </div>

      {screen === 'feed'     && <FeedScreen />}
      {screen === 'rankings' && <RankingsScreen />}
      {screen === 'log'      && <LogShowScreen />}
      {screen === 'profile'  && <ProfileScreen />}

      <BottomDock active={screen} onSelect={setScreen} />
    </div>
  )
}

// ── Shared pieces ────────────────────────────────────────────────────────────

function Initials({ name, className }: { name: string; className: string }) {
  return (
    <div className={`rounded-full flex items-center justify-center font-extrabold bg-primary-light text-primary ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

function Stars({ score, size }: { score: number; size: number }) {
  return (
    <span className="text-star inline-flex flex-shrink-0" aria-label={`${score.toFixed(1)} out of 5 stars`}>
      <StarDisplay score={score} size={size} accent="currentColor" />
    </span>
  )
}

function Segmented({ options }: { options: string[] }) {
  const [active, setActive] = useState(options[0])
  return (
    <div className="grid grid-cols-3 p-1 bg-stone-200/70 rounded-xl text-sm font-semibold text-stone-600">
      {options.map(option => (
        <button
          key={option}
          onClick={() => setActive(option)}
          className={`py-1.5 rounded-lg ${active === option ? 'bg-surface-container-lowest text-ink-title shadow-warm-sm' : 'hover:text-ink-title'}`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

const DOCK_TABS: { id: Screen; label: string; Icon: LucideIcon }[] = [
  { id: 'feed',     label: 'Feed',     Icon: Newspaper },
  { id: 'rankings', label: 'Rankings', Icon: BarChart2 },
  { id: 'log',      label: 'Log',      Icon: Plus },
  { id: 'profile',  label: 'Diary',    Icon: BookMarked },
]

// Persistent 4-tab dock from DESIGN.md section 3. Here it switches between
// the preview screens instead of routing.
function BottomDock({ active, onSelect }: { active: Screen; onSelect: (s: Screen) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40">
      <div className="max-w-md mx-auto bg-surface/95 backdrop-blur-md border-t border-stone-200/80 flex safe-bottom">
        {DOCK_TABS.map(({ id, label, Icon }) => {
          const isActive = active === id
          if (id === 'log') {
            return (
              <button key={id} onClick={() => onSelect(id)} className="flex-1 flex flex-col items-center gap-1 pb-1">
                {/* -18px lifts the button while keeping its label level with the other tabs' labels. */}
                <span className={`-mt-[18px] w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center shadow-warm-md ${isActive ? 'ring-4 ring-primary/20' : ''}`}>
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </span>
                <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-ink-faint'}`}>{label}</span>
              </button>
            )
          }
          return (
            <button key={id} onClick={() => onSelect(id)} className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-1">
              <Icon className={`w-5 h-5 ${isActive ? 'text-primary' : 'text-ink-faint'}`} strokeWidth={2} />
              <span className={`text-[10px] font-bold ${isActive ? 'text-primary' : 'text-ink-faint'}`}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Screen 1: Live Feed ──────────────────────────────────────────────────────

function FeedScreen() {
  return (
    <div className="min-h-screen bg-surface pb-28">
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3.5 bg-surface/90 backdrop-blur-md border-b border-stone-200/60">
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black tracking-tight text-ink-title">gigl</span>
          <span className="text-primary text-xl font-bold">·\⊙</span>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 rounded-full hover:bg-stone-100 text-ink-body" aria-label="Search">
            <Search className="w-5 h-5" />
          </button>
          <Initials name="Alex" className="w-8 h-8 text-xs ring-2 ring-primary/20" />
        </div>
      </header>

      <div className="px-5 pt-3">
        <Segmented options={['Activity', 'Following', 'Popular Gigs']} />
      </div>

      <div className="flex items-center gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 whitespace-nowrap">
          <span>⚡</span> This Weekend
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-lowest text-stone-800 border border-stone-200 whitespace-nowrap">
          <span>📍</span> Los Angeles, CA ▾
        </button>
        <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-surface-container-lowest text-stone-800 border border-stone-200 whitespace-nowrap">
          <span>🎸</span> Indie & Rock
        </button>
      </div>

      <main className="px-5 space-y-4">
        <article className="bg-surface-container-lowest rounded-2xl p-4 border border-stone-200/80 shadow-warm-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Initials name="malabracadabra" className="w-10 h-10 text-sm ring-1 ring-stone-200" />
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-ink-title">@malabracadabra</span>
                  <span className="text-xs text-emerald-600">✓</span>
                </div>
                <span className="text-xs text-ink-muted">2 days ago · Sutro Stage</span>
              </div>
            </div>
            <Stars score={14 / 3} size={16} />
          </div>

          <div>
            <h3 className="text-lg font-extrabold text-ink-title leading-snug">Death Cab for Cutie</h3>
            <p className="text-xs text-ink-muted font-medium">Outside Lands 2026 · Golden Gate Park</p>
          </div>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-sm text-ink-body italic">
            “Hard to beat being front row and hearing Plans in full. Unreal sound balance and the crowd energy during Brothers on a Hotel Bed felt suspended in time.”
          </div>

          <div className="flex flex-wrap gap-1.5">
            {['#Emotional', '#AcousticMoment', '#SingAlong'].map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-md text-xs font-semibold bg-stone-100 text-ink-body">{tag}</span>
            ))}
          </div>
        </article>
      </main>
    </div>
  )
}

// ── Screen 2: Rankings Scorecard ─────────────────────────────────────────────

const RANKED = [
  { artist: 'Tame Impala',  venue: 'Kia Forum · Inglewood, CA',     note: '★ Peak Setlist · 3x Encore',       highlight: true,  score: 5 },
  { artist: 'Fred again..', venue: 'LA Coliseum · Los Angeles, CA', note: '📊 78,000 cap · Insane Stage Prod', highlight: false, score: 14 / 3 },
]

function RankingsScreen() {
  const tabs = ['Been (42)', 'Want to See (18)', 'Festivals (4)', 'Recs']
  const [activeTab, setActiveTab] = useState(tabs[0])

  return (
    <div className="min-h-screen bg-surface pb-28">
      <header className="sticky top-0 z-30 px-5 py-3.5 bg-surface/90 backdrop-blur-md border-b border-stone-200/60 flex items-center justify-between">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-faint">My Music Index ✓</p>
          <h1 className="text-2xl font-black tracking-tight text-ink-title flex items-center gap-1.5">
            2026 Gigs
            <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Personal</span>
          </h1>
        </div>
        <button className="p-2 rounded-full border border-stone-200 bg-surface-container-lowest text-ink-body" aria-label="Share">
          <Share2 className="w-4 h-4" />
        </button>
      </header>

      <div className="flex border-b border-stone-200 px-5 gap-6 text-sm font-bold overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 whitespace-nowrap ${activeTab === tab ? 'text-ink-title border-b-2 border-primary' : 'text-ink-faint hover:text-ink-body'}`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="m-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center font-bold">🏅</div>
          <div>
            <p className="text-xs font-bold text-ink-title">Top 5% Gig-Goer</p>
            <p className="text-[11px] text-ink-muted">42 ranked shows across 11 venues</p>
          </div>
        </div>
        <span className="text-xs font-black text-emerald-800 bg-surface-container-lowest px-2.5 py-1 rounded-lg border border-emerald-200 shadow-warm-sm">L.A. #84</span>
      </div>

      <main className="px-5 space-y-3">
        {RANKED.map((row, i) => (
          <div key={row.artist} className="p-4 rounded-2xl bg-surface-container-lowest border border-stone-200/80 shadow-warm-sm flex items-start gap-3.5">
            <span className="text-2xl font-black text-ink-title w-6 flex-shrink-0">{i + 1}</span>
            <div className="flex-1 min-w-0">
              {/* Stars sit beside the title rather than the whole column, so the note chip below gets the full card width. */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-base font-extrabold text-ink-title">{row.artist}</h3>
                  <p className="text-xs text-ink-muted">{row.venue}</p>
                </div>
                <span className="mt-1"><Stars score={row.score} size={14} /></span>
              </div>
              <span className={`inline-block mt-2 text-[11px] font-semibold px-2 py-0.5 rounded ${row.highlight ? 'text-amber-900 bg-amber-50 border border-amber-200' : 'text-ink-body bg-stone-100'}`}>
                {row.note}
              </span>
            </div>
          </div>
        ))}
      </main>

      <div className="fixed bottom-24 inset-x-0 flex justify-center z-20 pointer-events-none">
        <button className="pointer-events-auto flex items-center gap-2 px-5 py-2.5 rounded-full bg-ink-title text-white font-bold text-sm shadow-warm-lg hover:bg-stone-800 transition">
          <span>🗺️</span> View Gig Map <span className="text-ink-faint">•</span> 42
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Log Show Flow ──────────────────────────────────────────────────

const SUB_RATINGS = [
  { label: 'Performance', stars: 5 },
  { label: 'Venue',  stars: 4 },
  { label: 'Crowd',  stars: 5 },
]

const VIBES = ['Surprise guest', 'Acoustic moment', 'Crowd surf', 'Sing along', 'Laser show']

function LogShowScreen() {
  const [notes, setNotes] = useState('Incredible set, Plans played front to back. Sound at Sutro was pristine and the foggy SF atmosphere was magical.')
  const [vibes, setVibes] = useState<string[]>(['Surprise guest', 'Acoustic moment'])
  const score = SUB_RATINGS.reduce((sum, r) => sum + r.stars, 0) / SUB_RATINGS.length

  const toggleVibe = (vibe: string) =>
    setVibes(current => current.includes(vibe) ? current.filter(v => v !== vibe) : [...current, vibe])

  return (
    <div className="min-h-screen bg-surface p-4 pb-24 flex flex-col justify-between">
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-stone-200 pb-2">
          <button className="text-ink-body font-bold text-sm flex items-center gap-1">← Cancel</button>
          <span className="text-xs font-black uppercase tracking-wider text-ink-muted">Log Gig · Step 2/2</span>
          <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-md">Draft</span>
        </div>

        <div className="p-3 bg-surface-container-lowest rounded-xl border border-stone-200 flex items-center gap-3 shadow-warm-sm">
          <div className="w-12 h-12 rounded-lg flex-shrink-0 bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-white font-black">
            DC
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-primary uppercase">Outside Lands 2026</p>
            <h2 className="text-sm font-extrabold text-ink-title truncate">Death Cab for Cutie</h2>
            <p className="text-[11px] text-ink-muted truncate">Sutro Stage · Sun, Aug 11</p>
          </div>
          <button className="text-ink-faint hover:text-ink-body" aria-label="Change show">
            <Pencil className="w-4 h-4" />
          </button>
        </div>

        <div className="p-3 bg-surface-container-lowest rounded-xl border border-stone-200 shadow-warm-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-stone-800">The Gigl Scorecard</span>
            <Stars score={score} size={16} />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center pt-1">
            {SUB_RATINGS.map(r => (
              <div key={r.label} className="p-1.5 bg-stone-50 rounded-lg border border-stone-100 flex flex-col items-center gap-1">
                <p className="text-[10px] font-bold text-ink-muted">{r.label}</p>
                <Stars score={r.stars} size={12} />
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs font-bold text-ink-body">
            <span>Field Notes</span>
            <span className="text-ink-faint font-normal text-[10px]">{notes.length}/500</span>
          </div>
          <textarea
            rows={2}
            maxLength={500}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-stone-200 bg-surface-container-lowest text-ink-title focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="Sound, crowd, stage visuals, unforgettable songs..."
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-ink-body">
            <span>Gig Highlights & Vibes</span>
            <span className="text-primary text-[10px]">{vibes.length} selected</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VIBES.map(vibe => vibes.includes(vibe) ? (
              <button key={vibe} onClick={() => toggleVibe(vibe)} className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-primary text-white">
                {vibe} ✓
              </button>
            ) : (
              <button key={vibe} onClick={() => toggleVibe(vibe)} className="px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-surface-container-lowest border border-stone-200 text-ink-body">
                + {vibe}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1">
          <div className="p-2 bg-surface-container-lowest rounded-xl border border-stone-200 flex items-center justify-between">
            <span className="text-xs font-bold text-ink-body">Companions</span>
            <span className="text-[10px] font-black bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">OL +1</span>
          </div>
          <div className="p-2 bg-surface-container-lowest rounded-xl border border-stone-200 flex items-center justify-center gap-1.5 text-[11px] font-bold text-ink-body whitespace-nowrap">
            <span>📷 Photo (1)</span>
            <span className="text-stone-300">|</span>
            <span>📋 Setlist</span>
          </div>
        </div>
      </div>

      <div className="pt-3 mt-3 border-t border-stone-200/60">
        <button className="w-full py-3 rounded-xl bg-primary text-white font-extrabold text-sm shadow-warm-md flex items-center justify-center gap-2 hover:bg-primary-hover transition">
          SAVE & PUBLISH GIG LOG →
        </button>
      </div>
    </div>
  )
}

// ── Screen 4: Profile & Diary ────────────────────────────────────────────────

const STATS = [
  { value: '42',    label: 'Gigs' },
  { value: '128',   label: 'Followers' },
  { value: '#4.8k', label: 'Rank', accent: true },
]

const DIRECTORY = [
  { label: 'Attended Shows', count: 42 },
  { label: 'Want to See',    count: 18 },
  { label: 'Festivals',      count: 6 },
  { label: 'Buddies',        count: 34 },
]

function ProfileScreen() {
  return (
    <div className="min-h-screen bg-surface p-4 pb-24 space-y-3">
      <div className="bg-surface-container-lowest p-3.5 rounded-2xl border border-stone-200 shadow-warm-sm space-y-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Initials name="Alex" className="w-14 h-14 text-xl ring-2 ring-primary" />
            <span className="absolute bottom-0 right-0 w-4 h-4 bg-primary text-white text-[10px] rounded-full flex items-center justify-center font-bold">+</span>
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-extrabold text-ink-title truncate">Alex Gerszten</h1>
            <p className="text-xs text-ink-muted font-medium">@gers_tunes · 📍 Los Angeles</p>
          </div>
          <span className="text-[10px] font-bold text-ink-faint">Dec 2024</span>
        </div>

        <div className="flex items-center justify-between border-t border-stone-100 pt-2.5">
          <div className="flex gap-4 text-center">
            {STATS.map(stat => (
              <div key={stat.label}>
                <p className={`text-sm font-black ${stat.accent ? 'text-primary' : 'text-ink-title'}`}>{stat.value}</p>
                <p className="text-[9px] font-bold text-ink-faint uppercase">{stat.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <button className="px-2.5 py-1 text-xs font-bold rounded-lg bg-stone-100 text-stone-800">Edit</button>
            <button className="px-2.5 py-1 text-xs font-bold rounded-lg bg-stone-100 text-stone-800">Share</button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-2.5 bg-surface-container-lowest rounded-xl border border-stone-200 flex items-center gap-2 shadow-warm-sm">
          <span className="text-base">🔥</span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-ink-faint uppercase">Live Streak</p>
            <p className="text-xs font-extrabold text-ink-title truncate">4 Weekends</p>
          </div>
        </div>
        <div className="p-2.5 bg-surface-container-lowest rounded-xl border border-stone-200 flex items-center gap-2 shadow-warm-sm">
          <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-1 rounded">96%</span>
          <div className="min-w-0">
            <p className="text-[9px] font-bold text-ink-faint uppercase">Soundprints</p>
            <p className="text-xs font-extrabold text-ink-title truncate">Indie / Club</p>
          </div>
        </div>
      </div>

      <div className="p-3 bg-surface-container-lowest rounded-xl border border-stone-200 shadow-warm-sm space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="text-ink-title flex items-center gap-1">🏆 2026 GOAL</span>
          <span className="text-primary font-black">84%</span>
        </div>
        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div className="h-full w-[84%] bg-primary rounded-full" />
        </div>
        <div className="flex justify-between text-[10px] text-ink-muted font-medium">
          <span>42 attended <span className="text-emerald-600 font-bold">(8 to go)</span></span>
          <span>Target: 50</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DIRECTORY.map(item => (
          <div key={item.label} className="p-2.5 bg-surface-container-lowest rounded-xl border border-stone-200 flex items-center justify-between shadow-warm-sm">
            <span className="text-xs font-bold text-stone-800">{item.label}</span>
            <span className="text-xs font-black text-ink-title">{item.count}</span>
          </div>
        ))}
      </div>

      <div className="p-3 bg-surface-container-lowest rounded-xl border border-stone-200 shadow-warm-sm space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold uppercase text-ink-faint text-[10px]">Latest Log</span>
          <span className="font-bold text-primary text-[11px]">View All (42)</span>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-xs font-extrabold text-ink-title">Jamie xx <span className="font-normal text-ink-faint text-[10px]">In Waves</span></h4>
            <p className="text-[10px] text-ink-muted">Shrine Expo Hall · Jan 24</p>
          </div>
          <Stars score={5} size={14} />
        </div>
      </div>
    </div>
  )
}
