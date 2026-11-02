'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { setActiveShow } from '@/lib/activeShow'
import { useAuth } from '@/components/AuthProvider'
import { LOCAL_STORAGE_KEY } from '@/lib/festivals'
import { dismissReminder, loadSavedShows, type SavedShow } from '@/lib/savedShows'
import { ArtistPhoto, Card, DateTag, Label, Place, btnPrimary, btnQuiet } from '@/components/ui'

// A few at a time, so a long absence doesn't push the feed off the screen.
// Dealing with one brings up the next.
const MAX_SHOWN = 3

// "How was it?" for shows someone saved that have now passed, at the top of
// the Feed. Says nothing at all until there's something to ask, and a failed
// load only costs the prompt, never the feed under it.
export function ReviewReminders() {
  const router = useRouter()
  const { user } = useAuth()
  const [due, setDue] = useState<SavedShow[]>([])

  useEffect(() => {
    if (!user) { setDue([]); return }
    let cancelled = false
    loadSavedShows(user.id)
      .then(result => { if (!cancelled) setDue(result.due) })
      .catch(err => console.error('review reminders failed:', err))
    return () => { cancelled = true }
  }, [user?.id])

  // Same hand-off as picking a show on /select-festival. Logging it is what
  // ends the reminder: loadSavedShows skips anything already logged.
  function review(show: SavedShow) {
    localStorage.setItem(LOCAL_STORAGE_KEY, show.show_id)
    setActiveShow({
      id: show.show_id, artist: show.artist, venue: show.venue, city: show.city, state: show.state,
      isoDate: show.show_date, imageUrl: show.image_url,
    })
    router.push('/log')
  }

  function dismiss(show: SavedShow) {
    setDue(shows => shows.filter(s => s.id !== show.id))
    dismissReminder(show.id).catch(err => console.error('dismissing a reminder failed:', err))
  }

  if (due.length === 0) return null

  return (
    <div className="space-y-2">
      {due.slice(0, MAX_SHOWN).map(show => (
        <Card key={show.id} className="p-3 flex items-center gap-3">
          <ArtistPhoto name={show.artist} src={show.image_url} className="w-14 h-14" iconSize={18}>
            <DateTag isoDate={show.show_date} />
          </ArtistPhoto>
          <div className="flex-1 min-w-0">
            <Label tone="accent">How was it?</Label>
            <h3 className="font-display text-[15px] font-bold leading-tight truncate">{show.artist}</h3>
            <Place className="mt-0.5">{[show.venue, show.city, show.state].filter(Boolean).join(', ')}</Place>
            <div className="mt-2 flex items-center gap-2">
              <button type="button" onClick={() => review(show)} className={`${btnPrimary} px-3 py-1.5 text-[10px]`}>
                Rate it
              </button>
              <button type="button" onClick={() => dismiss(show)} className={`${btnQuiet} px-3 py-1.5 text-[11px]`}>
                Didn&apos;t go
              </button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
