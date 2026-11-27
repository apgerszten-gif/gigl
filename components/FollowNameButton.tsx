'use client'

import { Check, Plus } from 'lucide-react'
import { useFollowedNames } from '@/lib/useFollowedNames'
import type { FollowedName } from '@/lib/followedNames'
import { btnPrimary } from '@/components/ui'

// Follow an artist or a venue, on their page (/artists, /venues). Their
// upcoming shows then show under Following on the Upcoming tab. The look
// matches following a person (components/FollowButton.tsx): a primary
// "Follow", and once followed an ink-bordered "Following".
export function FollowNameButton({ follow }: { follow: FollowedName }) {
  const { loaded, failed, isFollowing, toggle, signUpSheet } = useFollowedNames()
  const on = isFollowing(follow)

  return (
    <>
      <div className="flex flex-col items-start gap-1">
        <button
          type="button"
          onClick={() => toggle(follow)}
          disabled={!loaded}
          aria-pressed={on}
          className={`flex-shrink-0 gap-1 px-3 py-1.5 text-[10px] ${
            on
              ? 'inline-flex items-center rounded-card border-1.5 border-ink bg-cream text-ink font-bold uppercase tracking-label disabled:opacity-50'
              : btnPrimary
          }`}
        >
          {on ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <Plus className="w-3 h-3" strokeWidth={2.5} />}
          {on ? 'Following' : 'Follow'}
        </button>
        {failed && <span className="text-[11px] text-danger">Couldn&apos;t update that. Try again.</span>}
      </div>
      {signUpSheet}
    </>
  )
}
