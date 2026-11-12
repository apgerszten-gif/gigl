'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Bookmark, Share2, X } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { InviteSheet } from '@/components/InviteSheet'
import { loadInviteRsvps } from '@/lib/invites'
import { loadSavedShows, unsaveShow, type SavableShow, type SavedShow } from '@/lib/savedShows'
import { ArtistPhoto, Chip, DateTag, Label, Place } from '@/components/ui'

// Your own upcoming plans, on your own profile only: where someone is going
// to be is theirs to share, so saved_shows is private and the public profile
// never shows it. Once a show passes it moves to the Feed's review prompt.
export function SavedShowsSection() {
  const { user } = useAuth()
  const [shows, setShows]   = useState<SavedShow[] | null>(null)
  // Who said "I'm in" through your invites, by show id (lib/invites.ts).
  const [goingWith, setGoingWith] = useState<Record<string, string[]>>({})
  const [inviting, setInviting]   = useState<SavableShow | null>(null)
  const closeInvite = useCallback(() => setInviting(null), [])

  useEffect(() => {
    if (!user) return
    let cancelled = false
    loadSavedShows(user.id)
      .then(result => { if (!cancelled) setShows(result.upcoming) })
      .catch(err => {
        console.error('saved shows failed:', err)
        if (!cancelled) setShows([])
      })
    loadInviteRsvps(user.id)
      .then(found => { if (!cancelled) setGoingWith(found) })
      .catch(err => console.error('invite replies failed:', err))
    return () => { cancelled = true }
  }, [user?.id])

  function remove(show: SavedShow) {
    if (!user) return
    setShows(current => current?.filter(s => s.id !== show.id) ?? null)
    unsaveShow(user.id, show.show_id).catch(err => {
      console.error('removing a saved show failed:', err)
      setShows(current => current ? [...current, show].sort((a, b) => a.show_date.localeCompare(b.show_date)) : current)
    })
  }

  if (shows === null) return null

  return (
    <section>
      <Label className="mb-2.5">Saved shows</Label>

      {shows.length > 0 && (
        <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden mb-3">
          {shows.map((show, i) => (
            <div
              key={show.id}
              className={`flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}
            >
              <ArtistPhoto name={show.artist} src={show.image_url} className="w-12 h-12" iconSize={16}>
                <DateTag isoDate={show.show_date} />
              </ArtistPhoto>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-[15px] font-bold leading-tight truncate">{show.artist}</h3>
                <Place className="mt-0.5">{[show.venue, show.city, show.state].filter(Boolean).join(', ')}</Place>
                {goingWith[show.show_id] && goingWith[show.show_id].length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {goingWith[show.show_id].map(name => <Chip key={name} active>{name}&apos;s in</Chip>)}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setInviting({
                  id: show.show_id, artist: show.artist, venue: show.venue, city: show.city, state: show.state,
                  isoDate: show.show_date, imageUrl: show.image_url,
                })}
                aria-label={`Invite friends to ${show.artist}`}
                className="flex-shrink-0 p-1 text-ink-muted hover:text-accent"
              >
                <Share2 className="w-4 h-4" strokeWidth={2} />
              </button>
              <button
                type="button"
                onClick={() => remove(show)}
                aria-label={`Remove ${show.artist} from saved shows`}
                className="flex-shrink-0 p-1 text-ink-muted"
              >
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/select-festival?view=upcoming"
        className="flex items-center gap-3 rounded-card border-1.5 border-dashed border-ink/30 px-3.5 py-3 hover:border-accent/50"
      >
        <span className="w-9 h-9 flex-shrink-0 rounded-full bg-accent/10 border border-accent/40 text-accent flex items-center justify-center">
          <Bookmark className="w-4 h-4" strokeWidth={2} />
        </span>
        <div className="min-w-0">
          <p className="font-display text-[15px] font-bold leading-tight">Going to a show soon?</p>
          <p className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">We&apos;ll remind you to review it</p>
        </div>
      </Link>

      {inviting && <InviteSheet show={inviting} onClose={closeInvite} />}
    </section>
  )
}
