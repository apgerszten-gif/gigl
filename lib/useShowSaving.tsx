'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { InviteSheet } from '@/components/InviteSheet'
import { SignUpSheet } from '@/components/SignUpSheet'
import { fetchSavedShowIds, saveShow, unsaveShow, type SavableShow } from '@/lib/savedShows'

// Save / unsave for any list of upcoming shows. Returns which of them are
// saved, the toggle a row's Save button calls, whether the last change
// failed, and the sign-up sheet to render: tapping Save signed out opens it,
// and the save goes through once it hands back an account.
//
// Every save records consent to the morning-after review text
// (text_opt_in_at), which the TextReminderNote beside each list of Save
// buttons tells people about. It only ever reaches a phone account.
export function useShowSaving() {
  const { user } = useAuth()

  const [savedIds, setSavedIds]       = useState<Set<string>>(new Set())
  const [saveFailed, setSaveFailed]   = useState(false)
  const [pendingSave, setPendingSave] = useState<SavableShow | null>(null)
  // Right after a save: a bar offering "Invite friends" for a few seconds,
  // and the invite sheet once tapped (components/InviteSheet.tsx).
  const [justSaved, setJustSaved]     = useState<SavableShow | null>(null)
  const [inviting, setInviting]       = useState<SavableShow | null>(null)
  const closeInvite = useCallback(() => setInviting(null), [])

  useEffect(() => {
    if (!justSaved) return
    const t = setTimeout(() => setJustSaved(null), 6000)
    return () => clearTimeout(t)
  }, [justSaved])

  useEffect(() => {
    if (!user) { setSavedIds(new Set()); return }
    fetchSavedShowIds(user.id).then(setSavedIds).catch(err => console.error('saved show ids failed:', err))
  }, [user?.id])

  async function storeSave(userId: string, show: SavableShow) {
    setSaveFailed(false)
    setSavedIds(ids => new Set(ids).add(show.id))
    try {
      await saveShow(userId, show, true)
      setJustSaved(show)
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

  const signUpSheet = (
    <>
      {pendingSave && (
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
      )}

      {justSaved && !inviting && (
        <div className="fixed inset-x-0 bottom-24 z-[90] px-5 flex justify-center pointer-events-none">
          <div className="pointer-events-auto w-full max-w-md flex items-center gap-3 rounded-full bg-ink text-cream shadow-riso-lg pl-4 pr-1.5 py-1.5">
            <Check className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
            <span className="flex-1 min-w-0 truncate text-[12px] font-semibold">Saved {justSaved.artist}</span>
            <button
              type="button"
              onClick={() => { setInviting(justSaved); setJustSaved(null) }}
              className="flex-shrink-0 rounded-full bg-accent border-1.5 border-cream px-3 py-1.5 text-[10px] font-bold uppercase tracking-label"
            >
              Invite friends
            </button>
          </div>
        </div>
      )}

      {inviting && <InviteSheet show={inviting} onClose={closeInvite} />}
    </>
  )

  return { savedIds, saveFailed, toggleSave, signUpSheet }
}
