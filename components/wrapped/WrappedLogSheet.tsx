'use client'

import { useState } from 'react'
import { Camera } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import { ArtistPhoto, Card, Label, Place, Stars, btnPrimary } from '@/components/ui'
import { computeShowScore } from '@/lib/rating'
import { formatLongDate } from '@/lib/dates'
import type { GuestDraft } from '@/lib/pendingLogs'
import type { WrappedShow } from '@/lib/wrapped/types'

// Logging a past show from the Wrapped flow's "Were you there?" list, in a
// sheet over the list so they can log the next one straight after. The log
// screen's ratings (Performance and Venue, both required) and field notes.
// Photos and tagging who you went with need an account, so for someone
// without one they wait until after sign-up; the full log screen has them.

const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

function StarRow({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <p className="font-display text-base font-bold">{label}<span className="text-accent">*</span></p>
      <div className="flex gap-0.5 text-star">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} type="button" aria-label={`${label} ${n} star${n === 1 ? '' : 's'}`} onClick={() => onChange(n)} className="p-0.5">
            <svg width={28} height={28} viewBox="0 0 24 24" fill={n <= value ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
              <polygon points={STAR_POINTS} />
            </svg>
          </button>
        ))}
      </div>
    </div>
  )
}

export function WrappedLogSheet({ show, photo, signedIn, existing, onSave, onClose }: {
  show:     WrappedShow
  photo:    string | null
  signedIn: boolean
  // A log already written in this flow, to edit.
  existing: GuestDraft | null
  onSave:   (draft: GuestDraft) => void
  onClose:  () => void
}) {
  const [performance, setPerformance] = useState(existing?.performance_rating ?? 0)
  const [venue, setVenue]             = useState(existing?.venue_rating ?? 0)
  const [notes, setNotes]             = useState(existing?.review ?? '')
  const canSave = performance > 0 && venue > 0

  function save() {
    if (!canSave) return
    onSave({
      artist_id:          show.id,
      artist_name:        show.artist,
      stage:              null,
      day:                null,
      venue:              show.venue || null,
      show_date:          show.isoDate,
      performance_rating: performance,
      venue_rating:       venue,
      review:             notes.trim() || null,
      tags:               null,
    })
  }

  return (
    <Sheet title="Log a show" onClose={onClose}>
      <div className="space-y-4">
        <Card className="p-3 flex items-center gap-3">
          <ArtistPhoto name={show.artist} src={photo} className="w-14 h-14" />
          <div className="flex-1 min-w-0">
            <Label tone="accent">{formatLongDate(show.isoDate)}</Label>
            <h3 className="font-display text-base font-bold leading-tight truncate">{show.artist}</h3>
            <Place className="mt-0.5">{[show.venue, show.city, show.state].filter(Boolean).join(', ')}</Place>
          </div>
        </Card>

        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <Label tone="ink">Your rating</Label>
            {canSave
              ? <Stars score={computeShowScore(performance, venue)} size={15} />
              : <span className="text-[11px] italic text-ink-faint">Both required</span>}
          </div>
          <StarRow label="Performance" value={performance} onChange={setPerformance} />
          <StarRow label="Venue" value={venue} onChange={setVenue} />
        </Card>

        <section className="space-y-1.5">
          <Label tone="ink">Field notes</Label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="What made this set stand out?"
            className="w-full rounded-card border-1.5 border-ink bg-cream px-3 py-2.5 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
        </section>

        {!signedIn && (
          <p className="flex items-center gap-2 rounded-card border-1.5 border-dashed border-ink/25 px-3 py-2.5 text-[12px] leading-snug text-ink-faint">
            <Camera className="w-4 h-4 flex-shrink-0 text-ink-muted" strokeWidth={1.75} />
            Photos and who you went with can be added once you&apos;ve signed up.
          </p>
        )}

        <button type="button" onClick={save} disabled={!canSave} className={`${btnPrimary} w-full py-4 text-xs`}>
          Save log
        </button>
        {!signedIn && (
          <p className="-mt-2 text-center text-[11px] text-ink-faint">Saved on this phone until you sign up.</p>
        )}
      </div>
    </Sheet>
  )
}
