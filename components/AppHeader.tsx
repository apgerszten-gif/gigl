'use client'

import Link from 'next/link'
import { useAuth } from '@/components/AuthProvider'
import { HeaderPhoto, TopBar } from '@/components/ui'
import { useMyProfile } from '@/lib/useMyProfile'

// Sticky header for the main tabs (Feed, Rankings, Search). Your profile
// photo sits at the far right so it stays in view while the page scrolls;
// it's left off You itself and the log flow (see DESIGN.md).
export function AppHeader({ children, showProfile = true }: { children: React.ReactNode; showProfile?: boolean }) {
  const { user } = useAuth()
  const me = useMyProfile()
  const name = me?.display_name || me?.username || user?.email || ''

  return (
    <TopBar
      right={showProfile && user ? (
        <Link href="/profile" aria-label="Your profile" className="flex-shrink-0">
          <HeaderPhoto name={name} />
        </Link>
      ) : undefined}
    >
      {children}
    </TopBar>
  )
}
