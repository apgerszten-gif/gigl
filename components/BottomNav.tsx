'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CircleUser, Newspaper, Plus, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type DockTab = 'feed' | 'log' | 'profile'

// Three tabs, Log dead centre with one either side.
//
// There used to be five. Search was the fourth, and DESIGN.md admitted why:
// it existed "so that Log can sit in the middle with two tabs either side".
// It also pointed at the same screen as Log - both opened /select-festival,
// differing only in a heading - and once search started returning only shows
// that have already happened, "find a show" stopped being a separate idea
// from "log a show" altogether. A spacer with a job title.
//
// Rankings moved to a view on Feed rather than a destination of its own:
// both are the same logs read two ways, activity and aggregate. See
// components/FeedTabs.tsx.
const TABS: { id: DockTab; label: string; href: string; Icon: LucideIcon }[] = [
  { id: 'feed',    label: 'Feed', href: '/feed',             Icon: Newspaper },
  { id: 'log',     label: 'Log',  href: '/select-festival',  Icon: Plus },
  { id: 'profile', label: 'You',  href: '/profile',          Icon: CircleUser },
]

interface Props {
  // First-visit nudge pointing at the Log button (see the feed page).
  showLogTip?: boolean
  onDismissLogTip?: () => void
}

// The persistent 3-tab dock from DESIGN.md, routed. No Suspense wrapper any
// more: the only thing that needed useSearchParams was telling the Log tab
// apart from the Search tab by `?mode=log`, and neither survives.
export default function BottomNav(props: Props) {
  const pathname = usePathname()

  let active: DockTab | null = null
  // /rankings lights Feed, because Rankings is one of Feed's views now.
  if (pathname.startsWith('/feed') || pathname.startsWith('/rankings')) active = 'feed'
  else if (pathname.startsWith('/profile')) active = 'profile'
  else if (pathname.startsWith('/select-festival') || pathname.startsWith('/log')) active = 'log'

  return <DockBar active={active} mode="links" {...props} />
}

// The dock itself, without routing. `mode` picks what the tabs are: links
// (the app), buttons calling onSelect (the style guide), or inert (the intro
// demo, which sits it inside a mock phone with `contained`).
export function DockBar({
  active, mode, onSelect, contained = false, showLogTip, onDismissLogTip, logTip, logExtras, logButtonStyle,
}: Props & {
  active: DockTab | null
  mode: 'links' | 'buttons' | 'static'
  onSelect?: (tab: DockTab) => void
  contained?: boolean
  logTip?: React.ReactNode
  logExtras?: React.ReactNode
  logButtonStyle?: React.CSSProperties
}) {
  const tab = { mode, onSelect }

  return (
    <nav className={`${contained ? 'absolute' : 'fixed'} bottom-0 inset-x-0 z-40`}>
      <div className="max-w-md mx-auto bg-cream border-t-1.5 border-ink flex safe-bottom">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = active === id
          const labelClass = `text-[9px] font-bold uppercase tracking-label ${isActive ? 'text-accent' : 'text-ink-faint'}`

          if (id === 'log') {
            return (
              <div key={id} className="relative flex-1 flex flex-col items-center">
                {logTip ?? (showLogTip && <LogTip onDismiss={onDismissLogTip} />)}
                <Tab {...tab} id={id} href={href} className="flex flex-col items-center gap-1 pb-1">
                  {/* -18px lifts the button while keeping its label level with the other tabs' labels. */}
                  <span
                    style={logButtonStyle}
                    className="relative -mt-[18px] w-12 h-12 rounded-full bg-accent text-cream border-1.5 border-ink shadow-riso flex items-center justify-center"
                  >
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                    {logExtras}
                  </span>
                  <span className={labelClass}>{label}</span>
                </Tab>
              </div>
            )
          }

          return (
            <Tab key={id} {...tab} id={id} href={href} className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-1">
              <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-ink-faint'}`} strokeWidth={1.75} />
              <span className={labelClass}>{label}</span>
            </Tab>
          )
        })}
      </div>
    </nav>
  )
}

function Tab({ mode, onSelect, id, href, className, children }: {
  mode: 'links' | 'buttons' | 'static'
  onSelect?: (tab: DockTab) => void
  id: DockTab
  href: string
  className: string
  children: React.ReactNode
}) {
  if (mode === 'links') return <Link href={href} className={className}>{children}</Link>
  if (mode === 'buttons') return <button type="button" onClick={() => onSelect?.(id)} className={className}>{children}</button>
  return <span className={className}>{children}</span>
}

// Speech-bubble card above the Log button.
export function LogTip({ onDismiss, style }: { onDismiss?: () => void; style?: React.CSSProperties }) {
  return (
    <div style={style} className="absolute bottom-full left-1/2 -translate-x-1/2 mb-7 w-[min(300px,calc(100vw-32px))] z-10">
      <div className="relative rounded-card border-1.5 border-ink bg-cream shadow-riso pl-4 pr-9 py-3.5">
        <p className="text-[15px] leading-snug">
          <strong className="font-display">Welcome to Gigl.</strong> Log and rate your first show here.
        </p>
        {onDismiss && (
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="absolute top-2 right-2 p-1 text-ink-faint">
            <X className="w-4 h-4" />
          </button>
        )}
        <span className="absolute -bottom-[7px] left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-cream border-r-1.5 border-b-1.5 border-ink" />
      </div>
    </div>
  )
}
