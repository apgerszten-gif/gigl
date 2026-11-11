'use client'

import Link from 'next/link'
import { Bookmark, Check } from 'lucide-react'
import { formatDistance } from '@/lib/geo'
import type { ShowRating } from '@/lib/showRatings'
import { ArtistPhoto, DateTag, Place, Stars, btnPrimary, btnSecondary } from '@/components/ui'

// The list-row pattern for shows, wherever they're listed to log or save: the
// Log screen, the Feed's search, and the artist and venue pages. One card of
// rows alternating cream / cream-alt, each with the artist photo and its date
// sticker, a title, the place line, any support acts, and one action on the
// right: "+ Log" for a show that's happened, Save for one that hasn't.

export interface ListedShow {
  id:       string
  artist:   string
  support?: string[]
  venue:    string
  city:     string
  state:    string
  isoDate:  string | null
  imageUrl: string | null
  distanceMiles?: number
  // False for a show that can be read about but not logged from a list: a
  // festival set, which is logged from its lineup instead.
  canLog?:  boolean
}

export interface RowText {
  title: string
  place: string
  note?: string | null
}

// The usual reading of a row: the artist, then where.
export function describeByArtist(show: ListedShow): RowText {
  return {
    title: show.artist,
    place: [show.venue, show.city, show.state].filter(Boolean).join(', '),
    note:  show.support && show.support.length > 0 ? `with ${show.support.join(', ')}` : null,
  }
}

function RowBody({ show, text, rating }: { show: ListedShow; text: RowText; rating?: ShowRating }) {
  return (
    <>
      <ArtistPhoto name={show.artist} src={show.imageUrl} className="w-14 h-14" iconSize={18}>
        <DateTag isoDate={show.isoDate} />
      </ArtistPhoto>
      <div className="flex-1 min-w-0">
        <h3 className="font-display text-[15px] font-bold leading-tight truncate">{text.title}</h3>
        {text.place && <Place className="mt-0.5">{text.place}</Place>}
        {text.note && <p className="mt-0.5 text-[11px] text-ink-faint truncate">{text.note}</p>}
        {rating && (
          <span className="mt-1 flex items-center gap-1.5">
            <Stars score={rating.score} size={11} />
            <span className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">
              {rating.count} {rating.count === 1 ? 'rating' : 'ratings'}
            </span>
          </span>
        )}
      </div>
    </>
  )
}

function Distance({ miles }: { miles?: number }) {
  if (miles == null) return null
  return <span className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">{formatDistance(miles)}</span>
}

const rowClass = (i: number) => `flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`

function RowsCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">{children}</div>
}

// Shows that have happened. Tapping a row starts logging it, unless Gigl
// already has ratings for it: then the row opens its page of reviews
// (/artist/<id>), and "+ Log" is the way in.
export function PastShowRows({ shows, onLog, ratings, describe = describeByArtist }: {
  shows:    ListedShow[]
  onLog:    (show: ListedShow) => void
  ratings?: Record<string, ShowRating>
  describe?: (show: ListedShow) => RowText
}) {
  return (
    <RowsCard>
      {shows.map((s, i) => {
        const rating = ratings?.[s.id]
        const canLog = s.canLog !== false
        const body = <RowBody show={s} text={describe(s)} rating={rating} />
        return (
          <div key={s.id} className={`${rowClass(i)} hover:bg-accent/5`}>
            {rating ? (
              <Link href={`/artist/${encodeURIComponent(s.id)}`} className="flex-1 min-w-0 flex items-center gap-3">{body}</Link>
            ) : canLog ? (
              <button type="button" onClick={() => onLog(s)} className="flex-1 min-w-0 flex items-center gap-3 text-left">{body}</button>
            ) : (
              <div className="flex-1 min-w-0 flex items-center gap-3">{body}</div>
            )}
            {(canLog || s.distanceMiles != null) && (
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <Distance miles={s.distanceMiles} />
                {canLog && (
                  <button type="button" onClick={() => onLog(s)} className={`${btnSecondary} px-2.5 py-1 text-[10px]`}>
                    + Log
                  </button>
                )}
              </div>
            )}
          </div>
        )
      })}
    </RowsCard>
  )
}

// Shows that haven't happened: nothing to log yet, so only Save acts.
export function UpcomingShowRows({ shows, savedIds, onToggleSave, describe = describeByArtist }: {
  shows:        ListedShow[]
  savedIds:     Set<string>
  onToggleSave: (show: ListedShow) => void
  describe?:    (show: ListedShow) => RowText
}) {
  return (
    <RowsCard>
      {shows.map((s, i) => {
        const saved = savedIds.has(s.id)
        return (
          <div key={s.id} className={rowClass(i)}>
            <RowBody show={s} text={describe(s)} />
            <div className="flex-shrink-0 flex flex-col items-end gap-1">
              <Distance miles={s.distanceMiles} />
              <button
                type="button"
                aria-pressed={saved}
                onClick={() => onToggleSave(s)}
                className={`${saved ? btnPrimary : btnSecondary} gap-1 px-2.5 py-1 text-[10px]`}
              >
                {saved ? <Check className="w-3 h-3" strokeWidth={2.5} /> : <Bookmark className="w-3 h-3" strokeWidth={2.5} />}
                {saved ? 'Saved' : 'Save'}
              </button>
            </div>
          </div>
        )
      })}
    </RowsCard>
  )
}

export function ShimmerRows({ count }: { count: number }) {
  return (
    <RowsCard>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={`flex items-center gap-3 px-3 py-2.5 ${i > 0 ? 'border-t border-ink/10' : ''}`}>
          <div className="shimmer w-14 h-14 rounded-card flex-shrink-0" />
          <div className="flex-1 min-w-0 space-y-2">
            <div className="shimmer h-3.5 w-3/5 rounded" />
            <div className="shimmer h-2.5 w-4/5 rounded" />
          </div>
        </div>
      ))}
    </RowsCard>
  )
}
