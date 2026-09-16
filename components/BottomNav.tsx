'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { BarChart2, CircleUser, Newspaper, Plus, Search, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

type Tab = 'feed' | 'rankings' | 'log' | 'search' | 'profile'

// Log sits in the centre with two tabs either side; Search is the fourth tab
// that makes that symmetry possible. Both Log and Search open show search -
// logging always starts by picking a show - with Log asking "what did you
// see?" instead of "find a show".
const TABS: { id: Tab; label: string; href: string; Icon: LucideIcon }[] = [
  { id: 'feed',     label: 'Feed',     href: '/feed',                     Icon: Newspaper },
  { id: 'rankings', label: 'Rankings', href: '/rankings',                 Icon: BarChart2 },
  { id: 'log',      label: 'Log',      href: '/select-festival?mode=log', Icon: Plus },
  { id: 'search',   label: 'Search',   href: '/select-festival',          Icon: Search },
  { id: 'profile',  label: 'You',      href: '/profile',                  Icon: CircleUser },
]

interface Props {
  // First-visit nudge pointing at the Log button (see the feed page).
  showLogTip?: boolean
  onDismissLogTip?: () => void
}

// The persistent 5-tab dock from DESIGN.md.
export default function BottomNav(props: Props) {
  return (
    <Suspense fallback={<Dock active={null} {...props} />}>
      <DockWithRoute {...props} />
    </Suspense>
  )
}

function DockWithRoute(props: Props) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  let active: Tab | null = null
  if (pathname.startsWith('/feed')) active = 'feed'
  else if (pathname.startsWith('/rankings')) active = 'rankings'
  else if (pathname.startsWith('/profile')) active = 'profile'
  else if (pathname.startsWith('/select-festival')) active = searchParams.get('mode') === 'log' ? 'log' : 'search'
  else if (pathname.startsWith('/log')) active = 'log'

  return <Dock active={active} {...props} />
}

function Dock({ active, showLogTip, onDismissLogTip }: Props & { active: Tab | null }) {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40">
      <div className="max-w-md mx-auto bg-cream border-t-1.5 border-ink flex safe-bottom">
        {TABS.map(({ id, label, href, Icon }) => {
          const isActive = active === id
          const labelClass = `text-[9px] font-bold uppercase tracking-label ${isActive ? 'text-accent' : 'text-ink-faint'}`

          if (id === 'log') {
            return (
              <div key={id} className="relative flex-1 flex flex-col items-center">
                {showLogTip && <LogTip onDismiss={onDismissLogTip} />}
                <Link href={href} className="flex flex-col items-center gap-1 pb-1">
                  {/* -18px lifts the button while keeping its label level with the other tabs' labels. */}
                  <span className="-mt-[18px] w-12 h-12 rounded-full bg-accent text-cream border-1.5 border-ink shadow-riso flex items-center justify-center">
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                  </span>
                  <span className={labelClass}>{label}</span>
                </Link>
              </div>
            )
          }

          return (
            <Link key={id} href={href} className="flex-1 flex flex-col items-center gap-1 pt-2.5 pb-1">
              <Icon className={`w-5 h-5 ${isActive ? 'text-accent' : 'text-ink-faint'}`} strokeWidth={1.75} />
              <span className={labelClass}>{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

function LogTip({ onDismiss }: { onDismiss?: () => void }) {
  return (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-7 w-[min(300px,calc(100vw-32px))] z-10">
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
