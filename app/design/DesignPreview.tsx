'use client'

import { useEffect, useState } from 'react'
import { BarChart2, BookMarked, Newspaper, Pencil, Plus, Search, Share2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { StarDisplay } from '@/components/StarDisplay'

// Sample-data renderings of the four core screens in DESIGN.md, in the Warm
// Riso Zine look. The small building blocks at the top (Card, Label, Chip,
// Segmented, Stars, BottomDock) are the patterns DESIGN.md describes.
// Ratings are stars only; a show's rating is the average of three whole-star
// sub-ratings, so it lands on thirds (5, 4.67, 4.33...).

type Screen = 'feed' | 'rankings' | 'log' | 'profile'

export function DesignPreview() {
  const [screen, setScreen] = useState<Screen>('feed')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="bg-ink text-cream text-[10px] font-semibold uppercase tracking-label text-center px-4 py-1.5">
        Style guide · sample data
      </div>

      {screen === 'feed'     && <FeedScreen />}
      {screen === 'rankings' && <RankingsScreen />}
      {screen === 'log'      && <LogShowScreen />}
      {screen === 'profile'  && <ProfileScreen />}

      <BottomDock active={screen} onSelect={setScreen} />
    </div>
  )
}

// ── Patterns ─────────────────────────────────────────────────────────────────

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-cream border-1.5 border-ink rounded-card shadow-riso ${className}`}>
      {children}
    </div>
  )
}

function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-label text-ink-muted ${className}`}>
      {children}
    </p>
  )
}

function Chip({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-label border-1.5 whitespace-nowrap ${
      active ? 'bg-accent/10 border-accent/30 text-accent' : 'border-ink/15 text-ink-muted'
    }`}>
      {children}
    </span>
  )
}

function Stars({ score, size }: { score: number; size: number }) {
  return (
    <span className="text-star inline-flex flex-shrink-0" aria-label={`${score.toFixed(1)} out of 5 stars`}>
      <StarDisplay score={score} size={size} accent="currentColor" />
    </span>
  )
}

function Initials({ name, className }: { name: string; className: string }) {
  return (
    <div className={`rounded-full flex items-center justify-center font-display font-bold bg-paper text-ink-faint border border-ink/15 ${className}`}>
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// Ink-bordered toggle: the active option is filled with ink.
function Segmented({ options }: { options: string[] }) {
  const [active, setActive] = useState(options[0])
  return (
    <div className="flex border-2 border-ink rounded-card overflow-hidden">
      {options.map((option, i) => (
        <button
          key={option}
          onClick={() => setActive(option)}
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-label ${i > 0 ? 'border-l-2 border-ink' : ''} ${
            active === option ? 'bg-ink text-cream' : 'bg-cream text-ink'
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function Header({ children }: { children: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 bg-paper/90 backdrop-blur-md border-b border-ink/10 px-5 py-3 flex items-center justify-between gap-3">
      {children}
    </header>
  )
}

const DOCK_TABS: { id: Screen; label: string; Icon: LucideIcon }[] = [
  { id: 'feed',     label: 'Feed',     Icon: Newspaper },
  { id: 'rankings', label: 'Rankings', Icon: BarChart2 },
  { id: 'log',      label: 'Log',      Icon: Plus },
  { id: 'profile',  label: 'Diary',    Icon: BookMarked },
]

// Persistent 4-tab dock. Here it switches between the style guide screens
// instead of routing.
function BottomDock({ active, onSelect }: { active: Screen; onSelect: (s: Screen) => void }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40">
      <div className="max-w-md mx-auto bg-cream border-t-1.5 border-ink flex safe-bottom">
        {DOCK_TABS.map(({ id, label, Icon }) => {
          const isActive = active === id
          const labelClass = `text-[9px] font-bold uppercase tracking-label ${isActive ? 'text-accent' : 'text-ink-faint'}`
          if (id === 'log') {
            return (
              <button key={id} onClick={() => onSelect(id)} className="flex-1 flex flex-col items-center gap-1 pb-1">
                {/* -18px lifts the button while keeping its label level with the other tabs' labels. */}
                <span className="-mt-[18px] w-12 h-12 rounded-full bg-accent text-cream border-1.5 border-ink shadow-riso flex items-center justify-center">
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </span>
                <span className={labelClass}>{label}</span>
              </button>
            )
          }
          return (
            <button key={id} onClick={() => onSelect(id)} className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-1">
              <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-ink-faint'}`} strokeWidth={1.75} />
              <span className={labelClass}>{label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

// ── Screen 1: Feed ───────────────────────────────────────────────────────────

function FeedScreen() {
  return (
    <div className="pb-28">
      <Header>
        <Logo />
        <div className="flex items-center gap-2">
          <button className="p-1.5 text-ink" aria-label="Search shows">
            <Search className="w-5 h-5" strokeWidth={1.75} />
          </button>
          <Initials name="Alex" className="w-8 h-8 text-sm" />
        </div>
      </Header>

      <div className="px-5 pt-3 space-y-2.5">
        <Segmented options={['Activity', 'Following', 'Popular']} />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <Chip active>This weekend</Chip>
          <Chip>Los Angeles ▾</Chip>
          <Chip>Indie &amp; rock</Chip>
        </div>
      </div>

      <main className="px-5 pt-4 space-y-4">
        <Card className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <Initials name="malabracadabra" className="w-9 h-9 text-sm" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink truncate">
                  @malabracadabra <span className="text-accent">✓</span>
                </p>
                <p className="text-[11px] text-ink-muted">2 days ago · Sutro Stage</p>
              </div>
            </div>
            <Stars score={14 / 3} size={15} />
          </div>

          <div>
            <h3 className="font-display text-xl font-bold tracking-tight leading-tight">Death Cab for Cutie</h3>
            <Label className="mt-1">Outside Lands 2026 · Golden Gate Park</Label>
          </div>

          <blockquote className="border-l-2 border-accent pl-3 font-display text-[15px] leading-snug">
            “Hard to beat being front row and hearing Plans in full. The crowd during Brothers on a Hotel Bed felt suspended in time.”
          </blockquote>

          <div className="flex flex-wrap gap-1.5">
            <Chip>Emotional</Chip>
            <Chip>Acoustic moment</Chip>
            <Chip>Sing-along</Chip>
          </div>
        </Card>
      </main>
    </div>
  )
}

// ── Screen 2: Rankings ───────────────────────────────────────────────────────

const RANKED = [
  { artist: 'Tame Impala',  venue: 'Kia Forum · Inglewood, CA',     note: 'Peak setlist · 3x encore', score: 5 },
  { artist: 'Fred again..', venue: 'LA Coliseum · Los Angeles, CA', note: 'Insane stage production',  score: 14 / 3 },
]

function RankingsScreen() {
  const tabs = ['Been 42', 'Want to see 18', 'Festivals 4', 'Recs']
  const [activeTab, setActiveTab] = useState(tabs[0])

  return (
    <div className="pb-28">
      <Header>
        <div>
          <Label>My music index</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">2026 Gigs</h1>
        </div>
        <button className="p-2 rounded-card border-1.5 border-ink bg-cream shadow-riso" aria-label="Share">
          <Share2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </Header>

      <div className="flex gap-5 px-5 border-b border-ink/10 overflow-x-auto no-scrollbar">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`py-2.5 text-[10px] font-bold uppercase tracking-label whitespace-nowrap ${
              activeTab === tab ? 'text-ink border-b-2 border-accent' : 'text-ink-faint'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mx-5 mt-4 p-3 rounded-card bg-accent/10 border-1.5 border-accent/30 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold">Top 5% gig-goer</p>
          <p className="text-[11px] text-ink-muted">42 ranked shows across 11 venues</p>
        </div>
        <span className="font-display text-sm font-bold text-accent">L.A. #84</span>
      </div>

      <main className="px-5 pt-4 space-y-3">
        {RANKED.map((row, i) => (
          <Card key={row.artist} className="p-3.5 flex items-start gap-3">
            <span className="font-display text-3xl font-bold leading-none w-7 flex-shrink-0 text-accent">{i + 1}</span>
            <div className="flex-1 min-w-0">
              {/* Stars sit beside the title rather than the whole column, so the chip below gets the full card width. */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-base font-bold leading-tight">{row.artist}</h3>
                  <p className="text-[11px] text-ink-muted">{row.venue}</p>
                </div>
                <span className="mt-0.5"><Stars score={row.score} size={13} /></span>
              </div>
              <div className="mt-2"><Chip>{row.note}</Chip></div>
            </div>
          </Card>
        ))}
      </main>

      <div className="fixed bottom-24 inset-x-0 flex justify-center z-20 pointer-events-none">
        <button className="pointer-events-auto px-4 py-2 rounded-full bg-ink text-cream text-[10px] font-bold uppercase tracking-label shadow-riso-lg">
          View gig map · 42
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Log a show ─────────────────────────────────────────────────────

const SUB_RATINGS = [
  { label: 'Performance', stars: 5 },
  { label: 'Venue',       stars: 4 },
  { label: 'Crowd',       stars: 5 },
]

const VIBES = ['Surprise guest', 'Acoustic moment', 'Crowd surf', 'Sing-along', 'Laser show']

function LogShowScreen() {
  const [notes, setNotes] = useState('Plans played front to back. Sound at Sutro was pristine and the fog made it magic.')
  const [vibes, setVibes] = useState<string[]>(['Surprise guest', 'Acoustic moment'])
  const rating = SUB_RATINGS.reduce((sum, r) => sum + r.stars, 0) / SUB_RATINGS.length

  const toggleVibe = (vibe: string) =>
    setVibes(current => current.includes(vibe) ? current.filter(v => v !== vibe) : [...current, vibe])

  return (
    <div className="min-h-screen px-5 pt-3 pb-28 flex flex-col justify-between">
      <div className="space-y-3.5">
        <div className="flex items-center justify-between pb-2 border-b border-ink/10">
          <button className="text-[11px] font-semibold text-ink-muted">← Cancel</button>
          <Label>Log a show · 2 of 2</Label>
          <Chip active>Draft</Chip>
        </div>

        <Card className="p-3 flex items-center gap-3">
          <div className="w-12 h-12 rounded-card bg-accent text-cream border-1.5 border-ink flex items-center justify-center font-display text-lg font-bold flex-shrink-0">
            D
          </div>
          <div className="flex-1 min-w-0">
            <Label className="text-accent">Outside Lands 2026</Label>
            <h2 className="font-display text-base font-bold leading-tight truncate">Death Cab for Cutie</h2>
            <p className="text-[11px] text-ink-muted truncate">Sutro Stage · Sun, Aug 11</p>
          </div>
          <button className="text-ink-faint" aria-label="Change show">
            <Pencil className="w-4 h-4" />
          </button>
        </Card>

        <Card className="p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <Label className="text-ink">Your rating</Label>
            <Stars score={rating} size={16} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SUB_RATINGS.map(r => (
              <div key={r.label} className="py-2 rounded-card bg-paper border border-ink/10 flex flex-col items-center gap-1">
                <Label>{r.label}</Label>
                <Stars score={r.stars} size={12} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-ink">Field notes</Label>
            <span className="text-[10px] text-ink-faint">{notes.length}/500</span>
          </div>
          <textarea
            rows={2}
            maxLength={500}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className="w-full text-[13px] p-2.5 rounded-card border-1.5 border-ink bg-cream text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
            placeholder="Sound, crowd, the song you'll remember..."
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-ink">Highlights</Label>
            <span className="text-[10px] font-semibold text-accent">{vibes.length} selected</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VIBES.map(vibe => (
              <button key={vibe} onClick={() => toggleVibe(vibe)}>
                <Chip active={vibes.includes(vibe)}>{vibes.includes(vibe) ? `${vibe} ✓` : `+ ${vibe}`}</Chip>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="p-2.5 rounded-card bg-cream border-1.5 border-ink/15 flex items-center justify-between">
            <span className="text-xs font-semibold">Went with</span>
            <Chip active>+1</Chip>
          </div>
          <div className="p-2.5 rounded-card bg-cream border-1.5 border-ink/15 flex items-center justify-center gap-1.5 text-xs font-semibold whitespace-nowrap">
            <span>Photo (1)</span>
            <span className="text-ink-faint">·</span>
            <span>Setlist</span>
          </div>
        </div>
      </div>

      <button className="mt-4 w-full py-3 rounded-card bg-accent text-cream border-1.5 border-ink shadow-riso font-display text-sm font-bold uppercase tracking-label hover:bg-accent-hover">
        Save &amp; publish →
      </button>
    </div>
  )
}

// ── Screen 4: Diary / profile ────────────────────────────────────────────────

const STATS = [
  { value: '42',    label: 'Gigs' },
  { value: '128',   label: 'Followers' },
  { value: '#4.8k', label: 'Rank' },
]

const DIRECTORY = [
  { label: 'Attended',    count: 42 },
  { label: 'Want to see', count: 18 },
  { label: 'Festivals',   count: 6 },
  { label: 'Buddies',     count: 34 },
]

function ProfileScreen() {
  return (
    <div className="pb-24">
      <Header>
        <Logo />
        <button className="p-2 rounded-card border-1.5 border-ink bg-cream shadow-riso" aria-label="Share profile">
          <Share2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </Header>

      <div className="px-5 pt-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Initials name="Alex" className="w-14 h-14 text-2xl" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold tracking-tight leading-tight truncate">Alex Gerszten</h1>
              <p className="text-xs text-ink-muted">@gers_tunes · Los Angeles</p>
            </div>
            <button className="px-2.5 py-1 rounded-card border-1.5 border-ink text-[10px] font-bold uppercase tracking-label">Edit</button>
          </div>
          <div className="flex border-t border-ink/10 pt-3">
            {STATS.map((stat, i) => (
              <div key={stat.label} className={`flex-1 text-center ${i > 0 ? 'border-l border-ink/10' : ''}`}>
                <p className="font-display text-lg font-bold leading-none">{stat.value}</p>
                <Label className="mt-1">{stat.label}</Label>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          <Card className="p-2.5">
            <Label>Live streak</Label>
            <p className="font-display text-sm font-bold">4 weekends</p>
          </Card>
          <Card className="p-2.5">
            <Label>Soundprint</Label>
            <p className="font-display text-sm font-bold">Indie / club</p>
          </Card>
        </div>

        <Card className="p-3 space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-ink">2026 goal</Label>
            <span className="font-display text-sm font-bold text-accent">84%</span>
          </div>
          <div className="h-2 rounded-full bg-paper border border-ink/15 overflow-hidden">
            <div className="h-full w-[84%] bg-accent" />
          </div>
          <div className="flex justify-between text-[10px] text-ink-muted">
            <span>42 attended · 8 to go</span>
            <span>Target 50</span>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-2">
          {DIRECTORY.map(item => (
            <div key={item.label} className="p-2.5 rounded-card bg-cream border-1.5 border-ink/15 flex items-center justify-between">
              <span className="text-xs font-semibold">{item.label}</span>
              <span className="font-display text-sm font-bold">{item.count}</span>
            </div>
          ))}
        </div>

        <Card className="p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label>Latest log</Label>
            <span className="text-[10px] font-semibold uppercase tracking-label text-accent">View all 42</span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-display text-sm font-bold">Jamie xx</h4>
              <p className="text-[11px] text-ink-muted">Shrine Expo Hall · Jan 24</p>
            </div>
            <Stars score={5} size={13} />
          </div>
        </Card>
      </div>
    </div>
  )
}
