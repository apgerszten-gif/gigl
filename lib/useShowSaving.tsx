'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { SignUpSheet } from '@/components/SignUpSheet'
import { fetchSavedShowIds, saveShow, unsaveShow, type SavableShow } from '@/lib/savedShows'

// Save / unsave for any list of upcoming shows. Returns which of them are
// saved, the toggle a row's Save button calls, whether the last change
// failed, and the sign-up sheet to render: tapping Save signed out opens it,
// and the save goes through once it hands back an account.
//
// `textOptIn` is the Log screen's "also text me" checkbox, which only it
// shows. Everywhere else passes nothing, so no save records a consent the
// person wasn't asked for on that screen.
export function useShowSaving(textOptIn = false) {
  const { user } = useAuth()

  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set())
  const [saveFailed, setSaveFailed]   = useState(false)
  const [pendingSave, setPendingSave] = useState<SavableShow | null>(null)

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return }
    fetchSavedShowIds(user.id).then(setSavedIds).catch(err => console.error('saved show ids failed:', err))
  }, [user?.id])

  async function storeSave(userId: string, show: SavableShow) {
    setSaveFailed(false)
    setSavedIds(ids => new Set(ids).add(show.id))
    try {
      await saveShow(userId, show, textOptIn && !!user?.phone)
    } catch (err) {
      console.error('saving a show failed:', err)
      setSaveFailed(true)
      setSavedIds(ids => { const next = new Set(ids); next.delete(show.id); return next })
    }
  }

  async function toggleSave(show: SavableShow) {
    if (!user) { setPendingSave(show); return }
    if (!savedIds.has(show.id)) { await storeSave(user.id, show); return }

    setSaveFailed(false)
    setSavedIds(ids => { const next = new Set(ids); next.delete(show.id); return next })
    try {
      await unsaveShow(user.id, show.id)
    } catch (err) {
      console.error('removing a saved show failed:', err)
      setSaveFailed(true)
      setSavedIds(ids => new Set(ids).add(show.id))
    }
  }

  const signUpSheet = pendingSave ? (
    <SignUpSheet
      title="Save this show"
      blurb="Make an account to save shows. We'll remind you to review them once they've happened."
      onClose={() => setPendingSave(null)}
      onSignedIn={userId => {
        const show = pendingSave
        setPendingSave(null)
        storeSave(userId, show)
      }}
    />
  ) : null

  return { savedIds, saveFailed, toggleSave, signUpSheet }
}
