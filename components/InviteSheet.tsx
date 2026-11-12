'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { Sheet, Toggle } from '@/components/Sheet'
import { ArtistPhoto, Chip, DateTag, ErrorNote, Place, btnPrimary } from '@/components/ui'
import { formatShowDate } from '@/lib/dates'
import { createInvite, findInvite, invitePath, revokeInvite, setInviteAnonymous } from '@/lib/invites'
import type { SavableShow } from '@/lib/savedShows'
import { shareLink } from '@/lib/share'

// "Invite friends" for a show you've saved: a preview of what friends will
// see, whether it carries your name, then the phone's own share sheet with an
// /i/<token> link (lib/invites.ts). Sharing the same show again sends the
// same link, so everyone's "I'm in" lands in one place.
export function InviteSheet({ show, onClose }: { show: SavableShow; onClose: () => void }) {
  const { user } = useAuth()
  const [token, setToken]         = useState<string | null>(null)
  const [anonymous, setAnonymous] = useState(false)
  const [savedAnonymous, setSavedAnonymous] = useState(false)
  const [loaded, setLoaded]       = useState(false)
  const [busy, setBusy]           = useState(false)
  const [status, setStatus]       = useState<'copied' | 'off' | null>(null)
  const [failed, setFailed]       = useState(false)
  const close = useCallback(() => onClose(), [onClose])

  useEffect(() => {
    if (!user) return
    findInvite(user.id, show.id)
      .then(found => {
        if (found) { setToken(found.token); setAnonymous(found.anonymous); setSavedAnonymous(found.anonymous) }
      })
      .catch(err => console.error('invite lookup failed:', err))
      .finally(() => setLoaded(true))
  }, [user?.id, show.id])

  async function send() {
    if (!user || busy) return
    setBusy(true)
    setFailed(false)
    setStatus(null)
    try {
      let live = token
      if (!live) {
        live = await createInvite(user.id, show, anonymous)
        setToken(live)
        setSavedAnonymous(anonymous)
      } else if (anonymous !== savedAnonymous) {
        await setInviteAnonymous(live, anonymous)
        setSavedAnonymous(anonymous)
      }
      const when = show.isoDate ? ` on ${formatShowDate(show.isoDate)}` : ''
      const result = await shareLink({
        title: `${show.artist} at ${show.venue}`,
        text:  `${anonymous ? 'A friend is' : "I'm"} going to ${show.artist} at ${show.venue}${when}. You in?`,
        url:   `${window.location.origin}${invitePath(live)}`,
      })
      if (result === 'copied') setStatus('copied')
      if (result === 'failed') setFailed(true)
    } catch (err) {
      console.error('sending an invite failed:', err)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  async function turnOff() {
    if (!token || busy) return
    setBusy(true)
    try {
      await revokeInvite(token)
      setToken(null)
      setStatus('off')
    } catch (err) {
      console.error('turning off an invite failed:', err)
      setFailed(true)
    } finally {
      setBusy(false)
    }
  }

  const place = [show.venue, show.city, show.state].filter(Boolean).join(', ')

  return (
    <Sheet title="Invite friends" blurb="Send this to the group chat. Friends can say they're in, and you'll see who is." onClose={close}>
      <div className="space-y-4">
        <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso p-3 flex items-center gap-3">
          <ArtistPhoto name={show.artist} src={show.imageUrl} className="w-16 h-16" iconSize={20}>
            <DateTag isoDate={show.isoDate} />
          </ArtistPhoto>
          <div className="flex-1 min-w-0 space-y-1">
            <Chip active>{anonymous ? 'A friend is going' : "I'm going"}</Chip>
            <h3 className="font-display text-base font-bold leading-tight truncate">{show.artist}</h3>
            {place && <Place>{place}</Place>}
          </div>
        </div>

        <Toggle label="Show my name" checked={!anonymous} onChange={on => setAnonymous(!on)} />

        {failed && <ErrorNote>Couldn&apos;t make the invite link. Try again.</ErrorNote>}

        <button type="button" onClick={send} disabled={busy || !loaded || !user} className={`${btnPrimary} w-full py-3.5 text-xs`}>
          {busy ? 'One sec…' : status === 'copied' ? 'Link copied' : 'Send invite'}
        </button>

        <p className="text-center text-[11px] leading-snug text-ink-faint">
          {status === 'off'
            ? 'That link is off. Sending again makes a new one.'
            : `Only this show and ${anonymous ? 'no name' : 'your first name'} are on it. It stops working the day after the show.`}
        </p>

        {token && (
          <button type="button" onClick={turnOff} disabled={busy} className="block mx-auto text-[12px] text-ink-muted underline underline-offset-[3px]">
            Turn off this link
          </button>
        )}
      </div>
    </Sheet>
  )
}
