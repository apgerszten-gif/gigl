'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronRight, Search } from 'lucide-react'
import { CRSSD } from '@/lib/crssd'
import { CrssdMark } from '@/components/CrssdMark'
import { useAuth } from '@/components/AuthProvider'
import { AppHeader } from '@/components/AppHeader'
import BottomNav from '@/components/BottomNav'
import { Label } from '@/components/ui'

// The first thing a new signup sees, and what the dock's Log button opens
// for the CRSSD weekend. Two doors: the festival lineup, or the whole
// catalogue.
//
// It exists because the people being onboarded this weekend are standing at
// one specific festival, and asking them to find their set by typing into a
// nationwide search is a worse first thirty seconds than showing them the
// lineup they are already looking at. Everything behind both doors is
// unchanged - see app/crssd and app/select-festival.
//
// To retire it after the weekend: point the dock's Log tab and the sign-up
// redirect back at /select-festival and delete this route.

// The festival's door wears the festival's own wordmark; the catalogue's
// wears a magnifying glass. `badge` rather than an icon component because
// the two want different shapes inside the same circle.
const OPTIONS = [
  {
    href:  '/crssd',
    title: 'Rate and log shows at CRSSD',
    note:  `${CRSSD.days[0].label} – ${CRSSD.days[1].label} · Waterfront Park`,
    badge: <CrssdMark className="w-[38px] h-auto" />,
    primary: true,
  },
  {
    href:  '/select-festival',
    title: 'Rate and log other shows',
    note:  'Search every show from the past week',
    badge: <Search className="w-5 h-5" strokeWidth={2} />,
    primary: false,
  },
]

export default function LogMenuPage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()

  useEffect(() => {
    if (!authLoading && !user) router.replace('/')
  }, [authLoading, user, router])

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      <AppHeader>
        <div className="min-w-0">
          <Label>Log a show</Label>
          <h1 className="font-display text-2xl font-bold tracking-tight leading-tight">
            What did you see<span className="text-accent">?</span>
          </h1>
        </div>
      </AppHeader>

      <main className="px-5 pt-4 space-y-3">
        {OPTIONS.map(({ href, title, note, badge, primary }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3.5 rounded-card border-1.5 border-ink shadow-riso px-3.5 py-4 ${
              primary ? 'crssd-sunset' : 'bg-cream hover:bg-accent/5'
            }`}
          >
            <span
              // A cream disc on the sunset: the wordmark has to hold up over
              // peach, dusty blue and orange in turn, and an accent-filled
              // circle muddies against the orange band.
              className={`w-14 h-14 flex-shrink-0 rounded-full border-1.5 flex items-center justify-center ${
                primary ? 'border-ink bg-cream text-ink' : 'border-ink/30 bg-paper text-ink-muted'
              }`}
            >
              {badge}
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-[17px] font-bold leading-tight">{title}</h2>
              {/* ink-faint disappears against the sunset; the plain door keeps it. */}
              <p className={`mt-1 text-[10px] font-semibold uppercase tracking-label ${primary ? 'text-ink' : 'text-ink-faint'}`}>{note}</p>
            </div>
            <ChevronRight className="w-4 h-4 flex-shrink-0 text-ink-faint" />
          </Link>
        ))}
      </main>

      <BottomNav />
    </div>
  )
}
