// Shared building blocks for the Mojave Night design system (DESIGN.md).
// No hooks here, so server and client components can both render these;
// anything that needs routing or auth lives in AppHeader / BottomNav.

import Link from 'next/link'
import { ChevronLeft, MapPin, MicVocal } from 'lucide-react'
import { StarDisplay } from './StarDisplay'
import { festivalNameOf } from '@/lib/festivals'

// ── Class recipes ────────────────────────────────────────────────────────────

// Buttons are pills in sentence case. Amber with dark text (cream is the
// dark card colour) for the one main action; outlined bone for the rest.
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-full bg-accent text-cream ' +
  'font-sans font-bold hover:bg-accent-hover disabled:opacity-45 disabled:cursor-not-allowed'

// Button recipes leave font size (and padding) to the caller.
export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-ink/30 bg-transparent text-ink ' +
  'font-bold disabled:opacity-50'

export const btnQuiet =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-ink bg-cream text-ink-muted ' +
  'font-semibold disabled:opacity-50'

// For a step that can't be undone (delete an account, block someone), in the
// same red as ErrorNote and the profile's Delete button: a lighter red than
// the light theme's, so it still reads on the dark page.
export const btnDanger =
  'inline-flex items-center justify-center gap-1.5 rounded-full border border-danger/40 bg-danger/10 text-danger ' +
  'font-bold disabled:opacity-50'

export const iconBtn = 'p-2 rounded-full border border-ink/30 bg-cream'

export const inputBox = 'rounded-card border border-ink bg-cream'

// ── Surfaces & type ──────────────────────────────────────────────────────────

export function Card({ children, className = '', flat = false }: {
  children: React.ReactNode; className?: string; flat?: boolean
}) {
  return (
    <div className={`bg-cream border border-ink rounded-card ${flat ? '' : 'shadow-riso'} ${className}`}>
      {children}
    </div>
  )
}

// `tone` sets the colour; don't pass a text colour through className, since
// it would compete with the default rather than replace it. Labels are typed
// in Courier, like the marker tabs and the tape dates.
const LABEL_TONES = { muted: 'text-ink-muted', ink: 'text-ink', accent: 'text-accent-light' }

export function Label({ children, className = '', tone = 'muted' }: {
  children: React.ReactNode; className?: string; tone?: keyof typeof LABEL_TONES
}) {
  return (
    <p className={`font-mono text-[12px] font-bold uppercase ${LABEL_TONES[tone]} ${className}`}>
      {children}
    </p>
  )
}

// Pill toggles in sentence case. Amber when on, or dusty rose (`tone="place"`)
// for the place chips: Near me, a typed city and the radius.
const CHIP_ACTIVE = {
  accent: 'bg-accent/15 border-accent text-accent-light',
  place:  'bg-terra/15 border-terra text-terra-light',
}

export function Chip({ children, active = false, compact = false, tone = 'accent' }: {
  children: React.ReactNode; active?: boolean; compact?: boolean; tone?: keyof typeof CHIP_ACTIVE
}) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold border whitespace-nowrap ${
      compact ? 'px-2 py-0 text-[10.5px]' : 'px-2.5 py-1 text-[12px]'
    } ${
      active ? CHIP_ACTIVE[tone] : 'border-ink/25 text-ink-muted'
    }`}>
      {children}
    </span>
  )
}

// A review, in Fraunces italic behind a hanging amber quote mark.
export function PullQuote({ children, className = '', compact = false }: {
  children: React.ReactNode; className?: string; compact?: boolean
}) {
  return (
    <blockquote className={`relative ${compact ? 'pl-4 text-[13.5px]' : 'pl-5 text-[16px]'} font-display italic leading-snug ${className}`}>
      <span aria-hidden="true" className={`absolute left-0 ${compact ? '-top-0.5 text-[24px]' : '-top-1 text-[30px]'} not-italic font-bold leading-none text-accent`}>
        &ldquo;
      </span>
      {children}
    </blockquote>
  )
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border-1.5 border-dashed border-ink/30 bg-cream px-5 py-6 text-center text-[13px] leading-relaxed text-ink-muted">
      {children}
    </div>
  )
}

export function LoadingLabel({ children = 'Loading…' }: { children?: React.ReactNode }) {
  return (
    <p className="py-10 text-center text-[11px] font-semibold uppercase tracking-label text-ink-faint">{children}</p>
  )
}

// Big stat above a small label, for the profile/artist stat rows. `after`
// sits beside the label: a chevron on a stat that opens something.
export function Stat({ value, label, after }: { value: React.ReactNode; label: string; after?: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center">
      <div className="font-slab text-[22px] leading-none min-h-[22px] flex items-center">{value}</div>
      <p className="mt-1.5 font-mono text-[11px] font-bold uppercase text-ink-muted inline-flex items-center gap-0.5">{label}{after}</p>
    </div>
  )
}

// ── Ratings ──────────────────────────────────────────────────────────────────

// Ratings are only ever stars - no numbers, no tier labels.
export function Stars({ score, size }: { score: number; size: number }) {
  return (
    <span className="text-star inline-flex flex-shrink-0" aria-label={`${score.toFixed(1)} out of 5 stars`}>
      <StarDisplay score={score} size={size} accent="currentColor" />
    </span>
  )
}

// ── Photos, places, dates ────────────────────────────────────────────────────

// Placeholder tints, picked per name so a list of placeholders doesn't read
// as one repeated block.
const PHOTO_TINTS = ['bg-terra/25', 'bg-accent/15', 'bg-ink/10']

function tintFor(name: string) {
  const sum = Array.from(name).reduce((total, ch) => total + ch.charCodeAt(0), 0)
  return PHOTO_TINTS[sum % PHOTO_TINTS.length]
}

// What ArtistPhoto's placeholder icon is called with. Matches the slice of
// lucide's props actually used, so a lucide icon and a hand-drawn one are
// interchangeable here.
interface IconProps { size?: string | number; strokeWidth?: string | number }

// A DJ behind the decks, for bills where nobody is holding a microphone.
// Drawn rather than imported: lucide has turntables, headphones and vinyl,
// but nobody standing behind them, and the point of the placeholder is that
// somebody played.
export function DjDecks({ size = 20, strokeWidth = 1.75 }: IconProps) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      <circle cx="12" cy="4.25" r="2.25" />
      <path d="M6.5 13.5 L9 9.25 A3.6 3.6 0 0 1 15 9.25 L17.5 13.5" />
      <rect x="2" y="13.5" width="20" height="7" rx="1.5" />
      <circle cx="7" cy="17" r="1.6" />
      <circle cx="17" cy="17" r="1.6" />
    </svg>
  )
}

// Square artist photo in its own colours, or the halftone placeholder when
// there's no photo. `children` (e.g. a DateTag) sits outside the clipped
// frame so it can overhang the corner.
//
// `icon` swaps what the placeholder draws. It stays a microphone everywhere
// by default; an all-DJ bill passes DjDecks.
export function ArtistPhoto({ name, src, className, iconSize = 20, icon: Icon = MicVocal, children }: {
  name: string; src?: string | null; className: string; iconSize?: number
  icon?: React.ComponentType<IconProps>
  children?: React.ReactNode
}) {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className={`w-full h-full rounded-[10px] overflow-hidden ${src ? 'bg-paper' : tintFor(name)}`}>
        {src ? (
          // Lazy: a festival day can be dozens of photos and a few MB, and on
          // festival signal the ones below the fold shouldn't hold up the
          // ones on screen.
          <img src={src} alt={name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="halftone w-full h-full flex items-center justify-center text-ink/45" aria-label={`${name} (no photo)`}>
            <Icon size={iconSize} strokeWidth={1.75} />
          </div>
        )}
      </div>
      {children}
    </div>
  )
}

// Round profile photo; the initial when there's no photo.
export function PersonPhoto({ name, src, className }: { name: string; src?: string | null; className: string }) {
  return (
    <div className={`flex-shrink-0 rounded-full overflow-hidden bg-paper flex items-center justify-center font-display font-bold text-ink-muted ${className}`}>
      {src ? (
        <img src={src} alt={name} className="w-full h-full object-cover" />
      ) : (
        (name.trim().charAt(0) || '?').toUpperCase()
      )}
    </div>
  )
}

// A place (venue and city, a stage, or just a city) behind a small dusty-rose pin.
// `compact` is the feed's density: every size in a review tile is 15% down
// on the default so more of them fit on screen. It's a prop rather than a
// smaller default because the same component sets the place line on
// rankings, profiles and the artist page, which aren't list-dense.
export function Place({ children, className = '', compact = false }: {
  children: React.ReactNode; className?: string; compact?: boolean
}) {
  return (
    <p className={`flex items-center gap-1 ${compact ? 'text-[10.2px]' : 'text-[12px]'} text-ink-muted min-w-0 ${className}`}>
      <MapPin className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} flex-shrink-0 text-terra`} strokeWidth={2.25} />
      <span className="truncate">{children}</span>
    </p>
  )
}

// Place text for a log: the festival stage and day with the festival after
// them ("Lands End · Friday (Outside Lands)"), or the venue.
export function placeOf(log: {
  stage?: string | null; day?: string | null; venue?: string | null; artist_id?: string | null
}): string | null {
  if (log.stage) {
    const day = log.day ? log.day.charAt(0).toUpperCase() + log.day.slice(1) : null
    const festival = festivalNameOf(log.artist_id)
    return [log.stage, day].filter(Boolean).join(' · ') + (festival ? ` (${festival})` : '')
  }
  return log.venue || null
}

// 'YYYY-MM-DD' -> { month: 'Sep', day: '12', year: null }, parsed at local
// midnight like formatShowDate so it doesn't shift a day outside UTC. `year`
// is only set outside the current year, when month and day alone could mean
// either.
export function dateParts(isoDate: string | null | undefined): { month: string; day: string; year: string | null } | null {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T00:00:00`)
  if (isNaN(d.getTime())) return null
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day:   String(d.getDate()),
    year:  d.getFullYear() === new Date().getFullYear() ? null : String(d.getFullYear()),
  }
}

// Show date on a strip of tan tape across the bottom-left corner of an
// ArtistPhoto, typed in Courier ("NOV 21"), with the year after it when it
// isn't this year's ("NOV 21 '25"). `withYear` prints it this year too, where
// a list mixes years (the Log screen's past shows, which reach back five).
export function DateTag({ isoDate, withYear = false }: { isoDate: string | null | undefined; withYear?: boolean }) {
  const parsed = dateParts(isoDate)
  if (!parsed) return null
  const parts = withYear && !parsed.year ? { ...parsed, year: (isoDate ?? '').slice(0, 4) } : parsed
  return (
    <span className="tape-edge absolute -bottom-1.5 -left-2 -rotate-6 bg-tape px-1.5 py-0.5 font-mono text-[10px] font-bold leading-tight text-tape-ink whitespace-nowrap">
      {parts.month.toUpperCase()} {parts.day}{parts.year && ` '${parts.year.slice(2)}`}
    </span>
  )
}

// ── Controls ─────────────────────────────────────────────────────────────────

// Marker tabs: the options typed in Courier on one hairline, the chosen one
// struck through underneath with an amber highlighter.
export function Segmented<V extends string>({ options, value, onChange }: {
  options: { value: V; label: string }[]; value: V; onChange: (value: V) => void
}) {
  return (
    <div className="flex border-b border-ink/30">
      {options.map(option => {
        const on = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(option.value)}
            className={`flex-1 h-10 px-1 font-mono text-[13px] font-bold uppercase ${on ? 'text-ink' : 'text-ink-muted'}`}
          >
            <span className={on ? 'px-1 shadow-marker' : ''}>{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

// Labeled input card for forms (sign-in, username).
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={`${inputBox} block px-4 py-3 focus-within:ring-2 focus-within:ring-accent/40`}>
      <span className="block mb-1.5 font-mono text-[11.5px] font-bold uppercase text-ink-muted">
        {label}
        {hint && <span className="ml-1 normal-case tracking-normal font-medium text-ink-faint">{hint}</span>}
      </span>
      {children}
    </label>
  )
}

export const fieldInput = 'w-full bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none'

export function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-xs leading-normal text-danger">
      {children}
    </div>
  )
}

// ── Page chrome ──────────────────────────────────────────────────────────────

export const headerClass =
  'sticky top-0 z-30 bg-paper/90 backdrop-blur-md border-b border-ink/10 px-5 py-3 flex items-center gap-3'

// The main tabs' header bar: content on the left, an optional slot (the
// profile photo) pinned right. AppHeader wires it to auth; the style guide
// and intro demo render it with sample content.
export function TopBar({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <header className={headerClass}>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">{children}</div>
      {right}
    </header>
  )
}

// The header's profile photo.
export function HeaderPhoto({ name, src }: { name: string; src?: string | null }) {
  return <PersonPhoto name={name} src={src} className="w-9 h-9 text-sm border border-ink/30" />
}

// Header for pages you arrive at from somewhere (artist, profile, lists,
// modals). Pass `href` from server components, `onBack` from client ones.
export function BackHeader({ title, href, onBack, right }: {
  title?: React.ReactNode; href?: string; onBack?: () => void; right?: React.ReactNode
}) {
  const icon = <ChevronLeft className="w-5 h-5" strokeWidth={2} />
  return (
    <header className={headerClass}>
      {href ? (
        <Link href={href} aria-label="Back" className="-ml-1 p-1 text-ink-muted">{icon}</Link>
      ) : (
        <button type="button" onClick={onBack} aria-label="Back" className="-ml-1 p-1 text-ink-muted">{icon}</button>
      )}
      <div className="flex-1 min-w-0 font-display text-[17px] font-bold tracking-tight truncate">{title}</div>
      {right}
    </header>
  )
}
