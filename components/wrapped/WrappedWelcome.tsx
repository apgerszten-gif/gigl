'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { Card } from '@/components/ui'
import { WELCOME_EVENT, takeWelcome, type WrappedCounts } from '@/lib/wrapped/stash'

// On You, once, after someone signs up at the end of the Wrapped flow: what
// arrived on their new account (lib/wrapped/stash.ts). Shown on the visit
// when it arrives, then gone.
export function WrappedWelcome() {
  const [counts, setCounts] = useState<WrappedCounts | null>(null)

  useEffect(() => {
    const take = () => { const found = takeWelcome(); if (found) setCounts(found) }
    take()
    window.addEventListener(WELCOME_EVENT, take)
    return () => window.removeEventListener(WELCOME_EVENT, take)
  }, [])

  if (!counts) return null

  const parts = [
    counts.logs > 0 && `${counts.logs} log${counts.logs === 1 ? '' : 's'} in My shows`,
    counts.saves > 0 && `${counts.saves} saved show${counts.saves === 1 ? '' : 's'}`,
    counts.follows > 0 && `new dates from your ${counts.follows} artist${counts.follows === 1 ? '' : 's'} in Upcoming → Following`,
  ].filter(Boolean) as string[]

  return (
    <Card className="relative p-3.5 pr-10 border-accent bg-accent/5">
      <button type="button" onClick={() => setCounts(null)} aria-label="Close" className="absolute top-2.5 right-2.5 p-1 text-ink-muted">
        <X className="w-4 h-4" strokeWidth={2} />
      </button>
      <p className="font-display text-[16px] font-bold leading-tight">
        Your Wrapped shows are in<span className="text-accent">.</span>
      </p>
      <p className="mt-1 text-[13px] leading-snug text-ink-muted">
        {parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}.` : `${parts[0]}.`}
      </p>
    </Card>
  )
}
