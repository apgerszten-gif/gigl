'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { PersonPhoto, headerClass } from '@/components/ui'
import { useMyProfile } from '@/lib/useMyProfile'

// Sticky header for the main tabs (Feed, Rankings, Search). Your profile
// photo sits at the far right so it stays in view while the page scrolls;
// it's left off You itself and the log flow (see DESIGN.md).
export function AppHeader({ children, showProfile = true }: { children: React.ReactNode; showProfile?: boolean }) {
  const { user } = useAuth()
  const me = useMyProfile()
  const name = me?.display_name || me?.username || user?.email || ''

  return (
    <header className={headerClass}>
      <div className="flex-1 min-w-0 flex items-center justify-between gap-3">{children}</div>
      {showProfile && user && (
        <Link href="/profile" aria-label="Your profile" className="flex-shrink-0">
          <PersonPhoto name={name} className="w-9 h-9 text-sm border-1.5 border-ink shadow-riso" />
        </Link>
      )}
    </header>
  )
}
