// Shared building blocks for the Warm Riso Zine design system (DESIGN.md).
// No hooks here, so server and client components can both render these;
// anything that needs routing or auth lives in AppHeader / BottomNav.

import Link from 'next/link'
import { ChevronLeft, MapPin, MicVocal } from 'lucide-react'
import { StarDisplay } from './StarDisplay'

// ── Class recipes ────────────────────────────────────────────────────────────

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-card bg-accent text-cream border-1.5 border-ink shadow-riso ' +
  'font-display font-bold uppercase tracking-label hover:bg-accent-hover disabled:opacity-45 disabled:cursor-not-allowed'

// Button recipes leave font size (and padding) to the caller.
export const btnSecondary =
  'inline-flex items-center justify-center gap-1.5 rounded-card border-1.5 border-ink bg-cream text-ink ' +
  'font-bold uppercase tracking-label disabled:opacity-50'

export const btnQuiet =
  'inline-flex items-center justify-center gap-1.5 rounded-card border-1.5 border-ink/15 bg-cream text-ink-muted ' +
  'font-semibold disabled:opacity-50'

export const iconBtn = 'p-2 rounded-card border-1.5 border-ink bg-cream shadow-riso'

export const inputBox = 'rounded-card border-1.5 border-ink bg-cream'

// ── Surfaces & type ──────────────────────────────────────────────────────────

export function Card({ children, className = '', flat = false }: {
  children: React.ReactNode; className?: string; flat?: boolean
}) {
  return (
    <div className={`bg-cream border-1.5 border-ink rounded-card ${flat ? '' : 'shadow-riso'} ${className}`}>
      {children}
    </div>
  )
}

// `tone` sets the colour; don't pass a text colour through className, since
// it would compete with the default rather than replace it.
const LABEL_TONES = { muted: 'text-ink-muted', ink: 'text-ink', accent: 'text-accent' }

export function Label({ children, className = '', tone = 'muted' }: {
  children: React.ReactNode; className?: string; tone?: keyof typeof LABEL_TONES
}) {
  return (
    <p className={`text-[10px] font-semibold uppercase tracking-label ${LABEL_TONES[tone]} ${className}`}>
      {children}
    </p>
  )
}

export function Chip({ children, active = false }: { children: React.ReactNode; active?: boolean }) {
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-label border-1.5 whitespace-nowrap ${
      active ? 'bg-accent/10 border-accent/30 text-accent' : 'border-ink/15 text-ink-muted'
    }`}>
      {children}
    </span>
  )
}

export function PullQuote({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <blockquote className={`border-l-2 border-accent pl-3 font-display text-[15px] leading-snug ${className}`}>
      &ldquo;{children}&rdquo;
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

// Big stat above a small label, for the profile/artist stat rows.
export function Stat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="flex-1 flex flex-col items-center text-center">
      <div className="font-display text-lg font-bold leading-none min-h-[18px] flex items-center">{value}</div>
      <p className="mt-1 text-[9px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
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

// Square artist photo with a riso border, or the halftone-and-mic
// placeholder when there's no photo. `children` (e.g. a DateTag) sits
// outside the clipped frame so it can overhang the corner.
export function ArtistPhoto({ name, src, className, iconSize = 20, children }: {
  name: string; src?: string | null; className: string; iconSize?: number; children?: React.ReactNode
}) {
  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div className={`w-full h-full rounded-card border-1.5 border-ink overflow-hidden ${src ? 'bg-paper' : tintFor(name)}`}>
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="halftone w-full h-full flex items-center justify-center text-ink/45" aria-label={`${name} (no photo)`}>
            <MicVocal size={iconSize} strokeWidth={1.75} />
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

// A place (venue and city, a stage, or just a city) behind a small sienna pin.
export function Place({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`flex items-center gap-1 text-[12px] text-ink-muted min-w-0 ${className}`}>
      <MapPin className="w-3 h-3 flex-shrink-0 text-accent" strokeWidth={2.25} />
      <span className="truncate">{children}</span>
    </p>
  )
}

// Place text for a log: the festival stage and day, or the venue.
export function placeOf(log: { stage?: string | null; day?: string | null; venue?: string | null }): string | null {
  if (log.stage) {
    const day = log.day ? log.day.charAt(0).toUpperCase() + log.day.slice(1) : null
    return [log.stage, day].filter(Boolean).join(' · ')
  }
  return log.venue || null
}

// 'YYYY-MM-DD' -> { month: 'Sep', day: '12' }, parsed at local midnight like
// formatShowDate so it doesn't shift a day outside UTC.
export function dateParts(isoDate: string | null | undefined): { month: string; day: string } | null {
  if (!isoDate) return null
  const d = new Date(`${isoDate}T00:00:00`)
  if (isNaN(d.getTime())) return null
  return {
    month: d.toLocaleDateString('en-US', { month: 'short' }),
    day:   String(d.getDate()),
  }
}

// Show date stuck onto the corner of an ArtistPhoto like a sticker.
export function DateTag({ isoDate }: { isoDate: string | null | undefined }) {
  const parts = dateParts(isoDate)
  if (!parts) return null
  return (
    <span className="absolute -bottom-1.5 -right-1.5 -rotate-3 min-w-[28px] rounded bg-cream border-1.5 border-ink shadow-riso px-1 py-0.5 text-center leading-none">
      <span className="block text-[8px] font-bold uppercase tracking-label text-ink-muted">{parts.month}</span>
      <span className="block font-display text-[13px] font-bold text-ink">{parts.day}</span>
    </span>
  )
}

// ── Controls ─────────────────────────────────────────────────────────────────

// Ink-bordered toggle: the active option is filled with ink.
export function Segmented<V extends string>({ options, value, onChange }: {
  options: { value: V; label: string }[]; value: V; onChange: (value: V) => void
}) {
  return (
    <div className="flex border-2 border-ink rounded-card overflow-hidden">
      {options.map((option, i) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={`flex-1 py-1.5 px-1 text-[10px] font-bold uppercase tracking-label ${i > 0 ? 'border-l-2 border-ink' : ''} ${
            value === option.value ? 'bg-ink text-cream' : 'bg-cream text-ink'
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

// Labeled input card for forms (sign-in, username).
export function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className={`${inputBox} block px-4 py-3 focus-within:ring-2 focus-within:ring-accent/40`}>
      <span className="block mb-1.5 text-[10px] font-bold uppercase tracking-label text-ink-muted">
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
    <div className="rounded-card border border-[#B03030]/20 bg-[#B03030]/10 px-3.5 py-2.5 text-xs leading-normal text-[#B03030]">
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
  return <PersonPhoto name={name} src={src} className="w-9 h-9 text-sm border-1.5 border-ink shadow-riso" />
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
