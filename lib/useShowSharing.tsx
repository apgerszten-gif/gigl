'use client'

import { useCallback, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { InviteSheet } from '@/components/InviteSheet'
import { SignUpSheet } from '@/components/SignUpSheet'
import type { SavableShow } from './savedShows'

// Sending a friend an upcoming show: the invite sheet (components/
// InviteSheet.tsx), whose /i/<token> link opens in any browser, with or
// without the app. It doesn't need the show saved first. Signed out, Share
// opens the sign-up sheet, since an invite carries who sent it, and the
// invite sheet follows once there's an account.
export function useShowSharing() {
  const { user } = useAuth()
  const [pending, setPending] = useState<SavableShow | null>(null)
  const [sharing, setSharing] = useState<SavableShow | null>(null)
  const close = useCallback(() => setSharing(null), [])

  function share(show: SavableShow) {
    if (!show.isoDate) return
    if (!user) { setPending(show); return }
    setSharing(show)
  }

  const shareSheet = (
    <>
      {pending && (
        <SignUpSheet
          title="Send this show"
          blurb="Make an account to send friends a link to this show. They can open it without one."
          onClose={() => setPending(null)}
          onSignedIn={() => {
            setSharing(pending)
            setPending(null)
          }}
        />
      )}
      {sharing && <InviteSheet show={sharing} onClose={close} />}
    </>
  )

  return { share, shareSheet }
}
