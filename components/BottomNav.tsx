'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function BottomNav() {
  const pathname = usePathname()
  const feedActive = pathname.startsWith('/feed')
  const profileActive = pathname.startsWith('/profile')

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50">
      <div className="max-w-md mx-auto">
        <div className="bg-[#0f0f11]/95 backdrop-blur-xl border-t border-white/[0.06] flex safe-bottom">

          <Link href="/feed" className="flex-1 flex flex-col items-center gap-1 pt-3 pb-1">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 5h16M3 11h16M3 17h10" stroke={feedActive ? '#D4537E' : 'rgba(255,255,255,0.3)'} strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span className={`text-[9px] uppercase tracking-widest font-medium ${feedActive ? 'text-brand' : 'text-white/25'}`}>Feed</span>
          </Link>

          <Link href="/log" className="flex-1 flex flex-col items-center gap-1 pt-1 pb-1">
            <div className="w-12 h-12 rounded-2xl bg-brand flex items-center justify-center -mt-5 shadow-lg shadow-brand/30">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M10 4v12M4 10h12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <span className={`text-[9px] uppercase tracking-widest font-medium ${pathname.startsWith('/log') ? 'text-brand' : 'text-white/25'}`}>Log</span>
          </Link>

          <Link href="/profile" className="flex-1 flex flex-col items-center gap-1 pt-3 pb-1">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="8" r="3.5" stroke={profileActive ? '#D4537E' : 'rgba(255,255,255,0.3)'} strokeWidth="1.6"/>
              <path d="M4.5 19c0-3.59 2.91-6.5 6.5-6.5s6.5 2.91 6.5 6.5" stroke={profileActive ? '#D4537E' : 'rgba(255,255,255,0.3)'} strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <span className={`text-[9px] uppercase tracking-widest font-medium ${profileActive ? 'text-brand' : 'text-white/25'}`}>Me</span>
          </Link>

        </div>
      </div>
    </nav>
  )
}
