'use client'

import { useEffect, useState } from 'react'
import { Pencil, Plus, Search, Share2 } from 'lucide-react'
import { BattleModeCard } from '@/components/BattleModeCard'
import { DockBar } from '@/components/BottomNav'
import { NotificationsView } from '@/components/NotificationsSection'
import type { Notification } from '@/lib/notifications'
import { UpcomingShowRows, type ListedShow } from '@/components/ShowRows'
import { SuggestField } from '@/components/SuggestField'
import { Logo } from '@/components/Logo'
import {
  ArtistPhoto, Card, Chip, DateTag, Field, HeaderPhoto, Label, PersonPhoto, Place, PullQuote, Segmented, Stars, Stat, TopBar,
  btnPrimary, btnSecondary, fieldInput, headerClass, iconBtn, inputBox,
} from '@/components/ui'

// Sample-data renderings of the core screens in DESIGN.md, built from the same
// components the real screens use (components/ui.tsx, TopBar, DockBar). Here
// the header photo and dock switch between sample screens instead of routing.
// Items marked (mockup) in DESIGN.md appear here with sample data.
// Ratings are stars only; a show's rating is the average of three whole-star
// sub-ratings, so it lands on thirds (5, 4.67, 4.33...).

// 'pick' is the show picker the Log button opens; 'log' is the rating form
// it leads to. There is no 'search' any more - see components/BottomNav.tsx.
type Screen = 'feed' | 'upcoming' | 'rankings' | 'pick' | 'add' | 'log' | 'profile'

const ME = { name: 'Alex Gerszten', handle: 'gers_tunes' }

export function DesignPreview() {
  const [screen, setScreen] = useState<Screen>('feed')
  const openProfile = () => setScreen('profile')

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [screen])

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="bg-ink text-cream text-[10px] font-semibold uppercase tracking-label text-center px-4 py-1.5">
        Style guide · sample data
      </div>

      {screen === 'feed'     && <FeedScreen onProfile={openProfile} />}
      {screen === 'upcoming' && <UpcomingScreen onProfile={openProfile} />}
      {screen === 'rankings' && <RankingsScreen onProfile={openProfile} />}
      {screen === 'log'      && <LogShowScreen />}
      {screen === 'pick'     && <PickShowScreen onProfile={openProfile} onPick={() => setScreen('log')} onAdd={() => setScreen('add')} />}
      {screen === 'add'      && <AddShowScreen />}
      {screen === 'profile'  && <ProfileScreen />}

      {/* The picker and Add a show belong to Log, so both light that tab. */}
      <DockBar
        active={screen === 'pick' || screen === 'add' ? 'log' : screen}
        mode="buttons"
        onSelect={tab => setScreen(tab === 'log' ? 'pick' : tab)}
        profileBadge={screen === 'profile' ? 0 : SAMPLE_NOTIFICATIONS.filter(n => n.unseen).length}
      />
    </div>
  )
}

// ── Style-guide chrome ───────────────────────────────────────────────────────

// The real TopBar, with a button (not a link) to the sample profile.
function DemoHeader({ children, onProfile }: { children: React.ReactNode; onProfile?: () => void }) {
  return (
    <TopBar
      right={onProfile && (
        <button type="button" onClick={onProfile} aria-label="Your profile" className="flex-shrink-0">
          <HeaderPhoto name={ME.name} />
        </button>
      )}
    >
      {children}
    </TopBar>
  )
}

// ── Screen 1: Feed ───────────────────────────────────────────────────────────

const REVIEWS = [
  {
    handle: 'malabracadabra', when: '2d ago', score: 14 / 3,
    artist: 'Death Cab for Cutie', place: 'The Greek Theatre, Berkeley, CA', date: '2026-09-12',
    quote: 'Hard to beat being front row and hearing Plans in full. The crowd during Brothers on a Hotel Bed felt suspended in time.',
    tags: ['Emotional', 'Acoustic moment', 'Sing along'],
  },
  {
    handle: 'jonny.b', when: '4d ago', score: 4,
    artist: 'Japanese Breakfast', place: 'The Fillmore, San Francisco, CA', date: '2026-09-10',
    quote: 'Her voice cut through the whole room, and the horn section turned the encore into a party.',
    tags: ['Dancey', 'Packed crowd'],
  },
  {
    handle: 'sam_hears', when: '1w ago', score: 13 / 3,
    artist: 'Turnstile', place: 'Hollywood Palladium, Los Angeles, CA', date: '2026-09-06',
    quote: 'Pure chaos in the best way. The pit never stopped moving.',
    tags: ['Crowd surf'],
  },
]

function FeedScreen({ onProfile }: { onProfile: () => void }) {
  const [filter, setFilter] = useState<string>('all')
  return (
    <div className="pb-28">
      <DemoHeader onProfile={onProfile}>
        <Logo />
      </DemoHeader>

      <div className="px-5 pt-3 space-y-2.5">
        {/* Whose logs. The real one is components/FeedTabs.tsx - inlined
            here because the style guide must not actually navigate. The
            rankings live on their own dock tab. */}
        <Segmented
          options={[
            { value: 'all', label: 'All activity' },
            { value: 'following', label: 'Following' },
          ]}
          value={filter}
          onChange={setFilter}
        />
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          <Chip active>This weekend</Chip>
          <Chip>Los Angeles ▾</Chip>
          <Chip>Indie &amp; rock</Chip>
        </div>
      </div>

      <main className="px-5 pt-4 space-y-4">
        {/* Shown once someone has logged 10 shows, until they put it away. */}
        <BattleModeCard onDismiss={() => {}} onEnter={() => {}} />

        {REVIEWS.map(review => (
          <Card key={review.handle} className="overflow-hidden">
            <div className="px-3.5 pt-2.5 pb-2.5 space-y-1.5">
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <PersonPhoto name={review.handle} className="w-7 h-7 text-xs border border-ink/15" />
                  <div className="min-w-0">
                    <p className="text-[10.7px] font-semibold truncate">@{review.handle}</p>
                    <p className="text-[9.4px] text-ink-muted">{review.when}</p>
                  </div>
                </div>
                <Stars score={review.score} size={13} />
              </div>

              <div className="flex items-center gap-2.5">
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h3 className="font-display text-[17px] font-bold tracking-tight leading-tight">{review.artist}</h3>
                  <Place compact>{review.place}</Place>
                </div>
                <ArtistPhoto name={review.artist} className="w-[58px] h-[58px]" iconSize={20}>
                  <DateTag isoDate={review.date} />
                </ArtistPhoto>
              </div>

              <PullQuote compact>{review.quote}</PullQuote>

              <div className="flex flex-wrap gap-1">
                {review.tags.map(tag => <Chip key={tag} compact>{tag}</Chip>)}
              </div>
            </div>
          </Card>
        ))}
      </main>
    </div>
  )
}

// ── Screen 2: Rankings ───────────────────────────────────────────────────────

// One row per artist across every show of theirs, ranked on Performance and
// Performance stars (or Venue, or the two averaged - the "Rank by" chips).
const RANKED = [
  { artist: 'Tame Impala',  shows: 4, count: 38, performance: 5,   venue: 5 },
  { artist: 'Fred again..', shows: 6, count: 51, performance: 5,   venue: 4.5 },
  { artist: 'Mitski',       shows: 2, count: 17, performance: 4.5, venue: 4.5 },
]

function RankingsScreen({ onProfile }: { onProfile: () => void }) {
  return (
    <div className="pb-28">
      <DemoHeader onProfile={onProfile}>
        <Logo />
      </DemoHeader>

      <div className="px-5 pt-3 space-y-2.5">
        <Segmented
          options={[
            { value: 'all', label: 'All activity' },
            { value: 'following', label: 'Following' },
          ]}
          value="all"
          onChange={() => {}}
        />
        <Segmented
          options={[
            { value: 'rankings', label: 'Artist rankings' },
            { value: 'venues', label: 'Venue rankings' },
          ]}
          value="rankings"
          onChange={() => {}}
        />
        <label className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5`}>
          <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input placeholder="Search artists" className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none" />
        </label>
        <div className="flex flex-wrap items-center gap-1.5">
          <Label className="mr-0.5">Rank by</Label>
          <Chip active>Performance</Chip>
          <Chip>Venue</Chip>
          <Chip>Both</Chip>
        </div>
      </div>

      <div className="mx-5 mt-4 p-3 rounded-card bg-accent/10 border-1.5 border-accent/30 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-sm font-bold">Top 5% gig-goer</p>
          <p className="text-[11px] text-ink-muted">42 ranked shows across 11 venues (mockup)</p>
        </div>
        <span className="font-display text-sm font-bold text-accent">L.A. #84</span>
      </div>

      <main className="px-5 pt-4 space-y-3">
        {RANKED.map((row, i) => (
          <Card key={row.artist} className="p-3 flex items-center gap-3">
            <span className="font-display text-3xl font-bold leading-none w-7 flex-shrink-0 text-center text-accent">{i + 1}</span>
            <ArtistPhoto name={row.artist} className="w-14 h-14" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-base font-bold leading-tight truncate">{row.artist}</h3>
                <Stars score={row.performance} size={12} />
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                <span className="inline-flex items-center gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-label text-ink-muted">Performance</span>
                  <Stars score={row.performance} size={9} />
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-[9px] font-semibold uppercase tracking-label text-ink-muted">Venue</span>
                  <Stars score={row.venue} size={9} />
                </span>
              </div>
              <div className="mt-1.5 flex gap-1.5"><Chip>{row.shows} shows</Chip><Chip>{row.count} ratings</Chip></div>
            </div>
          </Card>
        ))}
      </main>

      <div className="fixed bottom-24 inset-x-0 flex justify-center z-20 pointer-events-none">
        <button type="button" className="pointer-events-auto px-4 py-2 rounded-full bg-ink text-cream text-[10px] font-bold uppercase tracking-label shadow-riso-lg">
          View gig map · 42
        </button>
      </div>
    </div>
  )
}

// ── Screen 3: Log a show ─────────────────────────────────────────────────────

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'
const VIBES = ['Surprise guest', 'Acoustic moment', 'Crowd surf', 'Sing along', 'Cool lighting']

function LogShowScreen() {
  const [ratings, setRatings] = useState({ Performance: 5, Venue: 4 })
  const [notes, setNotes] = useState('Plans played front to back. Sound at the Greek was pristine and the fog rolled in on cue.')
  const [vibes, setVibes] = useState<string[]>(['Surprise guest', 'Acoustic moment'])
  const values = Object.values(ratings)
  const rating = values.reduce((sum, n) => sum + n, 0) / values.length

  const toggleVibe = (vibe: string) =>
    setVibes(current => current.includes(vibe) ? current.filter(v => v !== vibe) : [...current, vibe])

  return (
    <div className="pb-28">
      <header className={headerClass}>
        <h1 className="flex-1 font-display text-[17px] font-bold tracking-tight">Log a show</h1>
      </header>

      <div className="px-5 pt-4 space-y-5">
        <Card className="p-3 flex items-center gap-3">
          <ArtistPhoto name="Death Cab for Cutie" className="w-14 h-14" />
          <div className="flex-1 min-w-0">
            <Label tone="accent">Sep 12</Label>
            <h2 className="font-display text-base font-bold leading-tight truncate">Death Cab for Cutie</h2>
            <Place className="mt-0.5">The Greek Theatre</Place>
          </div>
          <span className="text-ink-faint"><Pencil className="w-4 h-4" /></span>
        </Card>

        <Card className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <Label tone="ink">Your rating</Label>
            <Stars score={rating} size={16} />
          </div>
          {(Object.keys(ratings) as (keyof typeof ratings)[]).map(label => (
            <div key={label} className="flex items-center justify-between gap-3">
              <p className="font-display text-base font-bold">{label}<span className="text-accent">*</span></p>
              <div className="flex gap-0.5 text-star">
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    key={n}
                    type="button"
                    aria-label={`${label} ${n} stars`}
                    onClick={() => setRatings(r => ({ ...r, [label]: n }))}
                    className="p-0.5"
                  >
                    <svg width={30} height={30} viewBox="0 0 24 24" fill={n <= ratings[label] ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                      <polygon points={STAR_POINTS} />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </Card>

        <section className="space-y-1.5">
          <Label tone="ink">Field notes</Label>
          <textarea
            rows={2}
            value={notes}
            onChange={e => setNotes(e.target.value)}
            className={`${inputBox} block w-full resize-none px-3 py-2.5 text-sm text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40`}
          />
        </section>

        <section className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label tone="ink">Highlights</Label>
            <span className="text-[10px] font-semibold text-accent">{vibes.length} selected</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {VIBES.map(vibe => (
              <button key={vibe} type="button" onClick={() => toggleVibe(vibe)}>
                <Chip active={vibes.includes(vibe)}>{vibes.includes(vibe) ? `${vibe} ✓` : `+ ${vibe}`}</Chip>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-1.5">
          <Label tone="ink">Went with</Label>
          <Card flat className="flex items-center gap-2.5 px-3 py-2.5">
            <div className="flex items-center">
              <PersonPhoto name="Maya" className="w-7 h-7 text-[11px] border-2 border-cream" />
              <PersonPhoto name="Leo" className="w-7 h-7 text-[11px] border-2 border-cream -ml-2.5" />
            </div>
            <span className="flex-1 text-[13px] font-semibold">Maya, Leo</span>
          </Card>
        </section>

        <button type="button" className={`${btnPrimary} w-full py-4 text-xs`}>Save log</button>
      </div>
    </div>
  )
}

// ── Screen 4: Search ─────────────────────────────────────────────────────────

const RESULTS = [
  { artist: 'Phoebe Bridgers',    place: 'The Greek Theatre, Berkeley, CA',       date: '2026-09-19' },
  { artist: 'Turnstile',          place: 'Hollywood Palladium, Los Angeles, CA',  date: '2026-09-18' },
  { artist: 'Japanese Breakfast', place: 'The Fillmore, San Francisco, CA',       date: '2026-09-16' },
  { artist: 'Mitski',             place: 'Shrine Auditorium, Los Angeles, CA',    date: '2026-09-14' },
]

function PickShowScreen({ onProfile, onPick, onAdd }: { onProfile: () => void; onPick: () => void; onAdd: () => void }) {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const results = RESULTS.filter(r => !q || r.artist.toLowerCase().includes(q) || r.place.toLowerCase().includes(q))

  return (
    <div className="pb-28">
      <DemoHeader onProfile={onProfile}>
        <div className="min-w-0">
          <Label>Log a show</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">What did you see<span className="text-accent">?</span></h1>
        </div>
      </DemoHeader>

      <div className="px-5 pt-3">
        <label className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5`}>
          <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Artist or venue"
            className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </label>
      </div>

      <Label className="px-5 pt-4 pb-2">{q ? `${results.length} matches` : 'This past week'}</Label>

      <main className="mx-5 rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
        {results.map((r, i) => (
          <div key={r.artist} className={`flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}>
            <ArtistPhoto name={r.artist} className="w-14 h-14" iconSize={18}>
              <DateTag isoDate={r.date} />
            </ArtistPhoto>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-[15px] font-bold leading-tight truncate">{r.artist}</h3>
              <Place className="mt-0.5">{r.place}</Place>
            </div>
            <button type="button" onClick={onPick} className={`${btnSecondary} flex-shrink-0 px-2.5 py-1 text-[10px]`}>+ Log</button>
          </div>
        ))}
        {results.length === 0 && (
          <p className="px-3.5 py-6 text-center text-xs text-ink-muted">No shows match &ldquo;{query}&rdquo;</p>
        )}
      </main>

      <button
        type="button"
        onClick={onAdd}
        className="mt-3 mx-5 w-[calc(100%-40px)] flex items-center gap-3 rounded-card border-1.5 border-dashed border-ink/30 px-3.5 py-3 text-left"
      >
        <span className="w-9 h-9 flex-shrink-0 rounded-full bg-accent/10 border border-accent/40 text-accent flex items-center justify-center">
          <Plus className="w-4 h-4" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold leading-tight">Can&apos;t find your show?</p>
          <p className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">Add it yourself</p>
        </div>
      </button>
    </div>
  )
}

// ── Screen: Upcoming ─────────────────────────────────────────────────────────

const COMING_UP: { day: string; today?: boolean; shows: ListedShow[] }[] = [
  { day: 'Tonight · Mon, Nov 16', today: true, shows: [
    { id: 'u1', artist: 'Japanese Breakfast', venue: 'The Fillmore', city: 'San Francisco', state: 'CA', isoDate: '2026-11-16', imageUrl: null, distanceMiles: 2.1 },
  ] },
  { day: 'Fri, Nov 20', shows: [
    { id: 'u2', artist: 'Turnstile', venue: 'The Warfield', city: 'San Francisco', state: 'CA', isoDate: '2026-11-20', imageUrl: null, distanceMiles: 1.4 },
    { id: 'u3', artist: 'Four Tet', venue: 'Bill Graham Civic Auditorium', city: 'San Francisco', state: 'CA', isoDate: '2026-11-20', imageUrl: null, distanceMiles: 0.9 },
  ] },
]

function UpcomingScreen({ onProfile }: { onProfile: () => void }) {
  const [scope, setScope] = useState('all')
  const [saved, setSaved] = useState<Set<string>>(new Set(['u2']))
  const toggle = (show: ListedShow) => setSaved(ids => {
    const next = new Set(ids)
    if (next.has(show.id)) next.delete(show.id)
    else next.add(show.id)
    return next
  })

  return (
    <div className="pb-28">
      <DemoHeader onProfile={onProfile}>
        <div className="min-w-0">
          <Label>San Francisco, CA</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">What&apos;s on<span className="text-accent">?</span></h1>
        </div>
      </DemoHeader>

      <div className="px-5 pt-3 space-y-2.5">
        <Segmented
          options={[{ value: 'all', label: 'Everything' }, { value: 'following', label: 'Following' }]}
          value={scope}
          onChange={setScope}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip>Near me</Chip>
          <Chip active>San Francisco, CA ×</Chip>
          <Chip>10 mi</Chip>
          <Chip active>50 mi</Chip>
          <Chip>100 mi</Chip>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-label text-ink-muted mr-0.5">When</span>
          <Chip>Tonight</Chip>
          <Chip>This weekend</Chip>
          <Chip active>Next 7 days</Chip>
          <Chip>Next 30 days</Chip>
        </div>
      </div>

      <main className="px-5 pt-4 space-y-5">
        {COMING_UP.map(group => (
          <section key={group.day}>
            <Label tone={group.today ? 'accent' : 'ink'} className="mb-2">{group.day}</Label>
            <UpcomingShowRows shows={group.shows} savedIds={saved} onToggleSave={toggle} onShare={() => {}} />
          </section>
        ))}
      </main>
    </div>
  )
}

// ── Screen 5: You ────────────────────────────────────────────────────────────

// One of each kind (components/NotificationsSection.tsx). The first four are
// new, so the dock shows 4 everywhere but on You.
const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
const mo  = { id: 'p-mo',  username: 'mo',  display_name: 'Mo',  avatar_url: null }
const mei = { id: 'p-mei', username: 'mei', display_name: 'Mei', avatar_url: null }
const jo  = { id: 'p-jo',  username: 'jo',  display_name: 'Jo',  avatar_url: null }
const SAMPLE_NOTIFICATIONS: Notification[] = [
  { kind: 'show', key: 'show', at: hoursAgo(6), unseen: true, when: 'tomorrow',
    show: { id: 's1', artist: 'Fred again..', venue: 'Kia Forum', city: 'Inglewood', state: 'CA', show_date: '2026-11-25', image_url: null } },
  { kind: 'like', key: 'like', at: hoursAgo(1), unseen: true, actors: [mo, mei, jo], total: 3,
    log: { id: 'l1', artistId: 'a1', artistName: 'Prospa' } },
  { kind: 'comment', key: 'comment', at: hoursAgo(3), unseen: true, actor: mei, body: 'The second encore was unreal',
    log: { id: 'l1', artistId: 'a1', artistName: 'Prospa' } },
  { kind: 'follow', key: 'follow', at: hoursAgo(20), unseen: true, actor: jo, followingBack: false },
  { kind: 'tag', key: 'tag', at: hoursAgo(50), unseen: false, actor: mo,
    log: { id: 'l2', artistId: 'a2', artistName: 'Rüfüs Du Sol' } },
  // Older than 3 days: collapsed behind "2 notifications older than 3 days".
  { kind: 'follow', key: 'follow-old', at: hoursAgo(24 * 5), unseen: false, actor: mei, followingBack: true },
  { kind: 'like', key: 'like-old', at: hoursAgo(24 * 9), unseen: false, actors: [mo], total: 1,
    log: { id: 'l3', artistId: 'a3', artistName: 'Khruangbin' } },
]

function ProfileScreen() {
  return (
    <div className="pb-28">
      <header className={headerClass}>
        <div className="flex-1 flex items-center justify-between gap-3">
          <Logo />
          <button type="button" className={`${btnSecondary} shadow-riso px-2.5 py-2 text-[10px] whitespace-nowrap`}>
            <Share2 className="w-3.5 h-3.5" strokeWidth={2} />
            Invite friends to Gigl
          </button>
        </div>
      </header>

      <div className="px-5 pt-4 space-y-3">
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <PersonPhoto name={ME.name} className="w-16 h-16 text-2xl border-1.5 border-ink shadow-riso" />
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-xl font-bold tracking-tight leading-tight truncate">{ME.name}</h1>
              <p className="text-xs text-ink-muted">@{ME.handle}</p>
              <Place className="mt-0.5">Los Angeles, CA</Place>
            </div>
          </div>
          <label className={`${inputBox} flex items-center gap-2 px-3 py-2`}>
            <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
            <input
              placeholder="Search for other users"
              className="flex-1 min-w-0 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none"
            />
          </label>
          <div className="flex border-t border-ink/10 pt-3">
            <div className="flex-1 flex">
              <Stat value="42" label="Gigs" />
              <div className="flex-1 flex border-l border-ink/10">
                <Stat value={<Stars score={4.4} size={11} />} label="Avg rating" />
              </div>
            </div>
            <div className="flex-1 flex border-l-1.5 border-ink">
              <Stat value="128" label="Followers" />
              <div className="flex-1 flex border-l border-ink/10">
                <Stat value="97" label="Following" />
              </div>
            </div>
          </div>
        </Card>

        <NotificationsView
          items={SAMPLE_NOTIFICATIONS}
          username={ME.handle}
          followed={{}}
          onFollowBack={() => {}}
          onOpenComments={() => {}}
        />

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
            <Label tone="ink">2026 goal</Label>
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

        <Label>My rankings</Label>
        <Card className="p-3 flex items-center gap-3">
          <span className="font-display text-2xl font-bold leading-none w-7 flex-shrink-0 text-center text-accent">1</span>
          <ArtistPhoto name="Jamie xx" className="w-12 h-12" iconSize={16}>
            <DateTag isoDate="2026-01-24" />
          </ArtistPhoto>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-[15px] font-bold leading-tight truncate">Jamie xx</h3>
              <Stars score={5} size={12} />
            </div>
            <Place className="mt-0.5">Shrine Expo Hall, Los Angeles, CA</Place>
          </div>
          <span className="p-1.5 text-ink-faint"><Pencil className="w-4 h-4" /></span>
        </Card>
      </div>
    </div>
  )
}

// -- Screen: Add a show ------------------------------------------------------
// Uses the real SuggestField rather than a mock, so the suggestion chips and
// the "did you mean" prompt here are the same code the app runs - and can be
// seen working without a sign-in, which the real /add-show needs.

function AddShowScreen() {
  const [artist, setArtist] = useState('')
  const [venue, setVenue]   = useState('')
  const [city, setCity]     = useState('')
  const [date, setDate]     = useState('')

  return (
    <div className="pb-28">
      <div className={`${headerClass} px-5 py-3`}>
        <h1 className="font-display text-lg font-bold tracking-tight">Add a show</h1>
      </div>

      <div className="px-5 pt-4 space-y-3">
        <SuggestField field="artist" label="Artist" hint="who you saw" placeholder="Turnstile" value={artist} onChange={setArtist} />

        <Field label="Date" hint="when it happened">
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className={fieldInput} />
        </Field>

        <SuggestField field="venue" label="Venue" hint="where it was" placeholder="Bottom of the Hill" value={venue} onChange={setVenue} />
        <SuggestField field="city" label="City" hint="optional" placeholder="San Francisco, CA" value={city} onChange={setCity} />

        <button type="button" className={`${btnPrimary} w-full py-3.5 text-xs`}>Add show and log it</button>
      </div>
    </div>
  )
}
