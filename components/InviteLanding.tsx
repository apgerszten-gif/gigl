'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { FollowButton } from '@/components/FollowButton'
import { Logo } from '@/components/Logo'
import { SignUpSheet } from '@/components/SignUpSheet'
import { ArtistPhoto, EmptyState, ErrorNote, LoadingLabel, PersonPhoto, Place, TopBar, btnPrimary } from '@/components/ui'
import { formatShowDate } from '@/lib/dates'
import { getInvite, hasRsvped, rsvp, type ShowInvite } from '@/lib/invites'
import { saveShow } from '@/lib/savedShows'
import { venueHref } from '@/lib/showLinks'

// What a friend sees from an invite link: who's going, the show, and one big
// "I'm going too". Works signed out; the tap asks for an account in place,
// then saves the show for them (so they get the review reminder after) and
// records the RSVP, which the inviter sees on their saved show.
export function InviteLanding({ token }: { token: string }) {
  const { user, loading: authLoading } = useAuth()
  const [invite, setInvite]   = useState<ShowInvite | null | undefined>(undefined)
  const [going, setGoing]     = useState(false)
  const [busy, setBusy]       = useState(false)
  const [failed, setFailed]   = useState(false)
  const [asking, setAsking]   = useState(false)

  useEffect(() => {
    getInvite(token).then(setInvite).catch(err => { console.error('invite lookup failed:', err); setInvite(null) })
  }, [token])

  useEffect(() => {
    if (!user || !invite) return
    hasRsvped(token, user.id).then(yes => { if (yes) setGoing(true) }).catch(() => {})
  }, [user?.id, invite, token])

  async function join(userId: string) {
    if (!invite) return
    setBusy(true)
    setFailed(false)
    // The save is what matters to them; the "I'm in" the inviter sees is
    // extra, so its failing is logged rather than shown.
    try {
      await saveShow(userId, {
        id: invite.show_id, artist: invite.artist, venue: invite.venue, city: invite.city, state: invite.state,
        isoDate: invite.show_date, imageUrl: invite.image_url,
      }, false)
    } catch (err) {
      console.error('saving the invited show failed:', err)
      setFailed(true)
      setBusy(false)
      return
    }
    try {
      if (userId !== invite.owner_id) await rsvp(token)
    } catch (err) {
      console.error('recording the RSVP failed:', err)
    } finally {
      setGoing(true)
      setBusy(false)
    }
  }

  const who = invite?.owner_name ?? 'A friend'
  const isOwner = !!user && !!invite && user.id === invite.owner_id

  return (
    <div className="min-h-screen bg-paper text-ink">
      <TopBar><Logo href="/feed" /></TopBar>

      <main className="px-5 pt-5 pb-16 max-w-md mx-auto">
        {invite === undefined ? (
          <LoadingLabel />
        ) : invite === null ? (
          <div className="space-y-4">
            <EmptyState>This invite has ended, or the show has already happened.</EmptyState>
            <Link href="/feed" className={`${btnPrimary} w-full py-3.5 text-xs`}>See what people are rating</Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <ArtistPhoto name={invite.artist} src={invite.image_url} className="w-full aspect-[4/3]" iconSize={44} />
              <span className="absolute -bottom-2 right-3 -rotate-3 rounded bg-cream border-1.5 border-ink shadow-riso px-2 py-1 text-center leading-none">
                <span className="block text-[9px] font-bold uppercase tracking-label text-ink-muted">
                  {new Date(`${invite.show_date}T00:00:00`).toLocaleDateString('en-US', { weekday: 'short', month: 'short' })}
                </span>
                <span className="block font-display text-xl font-bold">{new Date(`${invite.show_date}T00:00:00`).getDate()}</span>
              </span>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <PersonPhoto name={who} src={invite.owner_avatar} className="w-8 h-8 text-sm border border-ink/15" />
              <p className="text-[14px]"><span className="font-semibold">{isOwner ? 'You' : who}</span> {isOwner ? 'are' : 'is'} going</p>
            </div>

            <div>
              <h1 className="font-display text-[30px] font-bold tracking-tight leading-none">{invite.artist}</h1>
              <Link href={venueHref({ name: invite.venue, city: invite.city, state: invite.state })} className="block mt-1.5 hover:text-accent">
                <Place>{[invite.venue, invite.city, invite.state].filter(Boolean).join(', ')}</Place>
              </Link>
              <p className="mt-1 text-[12px] text-ink-muted">{formatShowDate(invite.show_date)}</p>
            </div>

            {failed && <ErrorNote>Couldn&apos;t save that. Try again.</ErrorNote>}

            {isOwner ? (
              <p className="text-[13px] text-ink-muted leading-snug">This is your invite. Friends who open it can tap &ldquo;I&apos;m going too&rdquo;, and you&apos;ll see them on your saved show.</p>
            ) : going ? (
              <div className="space-y-3">
                <div className={`${btnPrimary} w-full py-3.5 text-xs`}><Check className="w-4 h-4" strokeWidth={2.5} /> You&apos;re in</div>
                <p className="text-center text-[12px] text-ink-muted">Saved. {invite.owner_name ? `${invite.owner_name} will see you're in.` : "They'll see you're in."} We&apos;ll remind you to review it after.</p>
                {invite.owner_id && (
                  <div className="flex items-center justify-between gap-3 rounded-card border-1.5 border-ink/15 bg-cream px-3 py-2.5">
                    <span className="text-[13px]">Follow {who} on Gigl</span>
                    <FollowButton targetUserId={invite.owner_id} />
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 pt-2">
                <button
                  type="button"
                  disabled={busy || authLoading}
                  onClick={() => { if (user) void join(user.id); else setAsking(true) }}
                  className={`${btnPrimary} w-full py-3.5 text-xs`}
                >
                  {busy ? 'One sec…' : "I'm going too"}
                </button>
                <Link href="/feed" className="block text-center text-[12px] text-ink-muted underline underline-offset-[3px]">Not for me</Link>
              </div>
            )}
          </div>
        )}
      </main>

      {asking && invite && (
        <SignUpSheet
          title={`Tell ${who} you're in`}
          blurb="Make an account with your number. We'll save the show and remind you to review it after."
          onClose={() => setAsking(false)}
          onSignedIn={userId => { setAsking(false); void join(userId) }}
        />
      )}
    </div>
  )
}
