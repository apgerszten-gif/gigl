'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/feed', label: 'Feed', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <rect x="3" y="3" width="7" height="7" rx="2" stroke={active ? '#D4537E' : 'rgba(255,255,255,0.35)'} strokeWidth="1.4"/>
      <rect x="12" y="3" width="7" height="7" rx="2" stroke={active ? '#D4537E' : 'rgba(255,255,255,0.35)'} strokeWidth="1.4"/>
      <rect x="3" y="12" width="7" height="7" rx="2" stroke={active ? '#D4537E' : 'rgba(255,255,255,0.35)'} strokeWidth="1.4"/>
      <rect x="12" y="12" width="7" height="7" rx="2" stroke={active ? '#D4537E' : 'rgba(255,255,255,0.35)'} strokeWidth="1.4"/>
    </svg>
  )},
  { href: '/log', label: 'Log', icon: (_active: boolean) => (
    <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center -mt-3 shadow-lg">
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 4v10M4 9h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </div>
  )},
  { href: '/profile', label: 'Profile', icon: (active: boolean) => (
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="8" r="4" stroke={active ? '#D4537E' : 'rgba(255,255,255,0.35)'} strokeWidth="1.4"/>
      <path d="M4 19c0-3.866 3.134-7 7-7s7 3.134 7 7" stroke={active ? '#D4537E' : 'rgba(255,255,255,0.35)'} strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )},
]

export default function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-brand-dark border-t border-white/[0.06] safe-bottom z-50">
      <div className="max-w-md mx-auto flex">
        {tabs.map(tab => {
          const active = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex-1 flex flex-col items-center gap-1 pt-3 pb-2"
            >
              {tab.icon(active)}
              <span className={`text-[9px] uppercase tracking-widest font-medium ${active ? 'text-brand' : 'text-white/25'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
