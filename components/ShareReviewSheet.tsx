'use client'

import { useCallback, useState } from 'react'
import { Sheet, Toggle } from '@/components/Sheet'
import { ArtistPhoto, DateTag, ErrorNote, Place, PullQuote, Stars, btnPrimary } from '@/components/ui'
import { reviewPath, shareLink } from '@/lib/share'

export interface SharedReview {
  username: string
  showId:   string
  artist:   string
  place:    string | null
  isoDate:  string | null
  imageUrl: string | null
  score:    number | null
  review:   string | null
}

// "Send your take": a review's link (/r/<handle>/<show>) out to friends, who
// can read it without an account and rate the show themselves. "Hide my
// stars" keeps your stars off the link's preview and page until they've
// rated, then shows both side by side.
export function ShareReviewSheet({ review, onClose }: { review: SharedReview; onClose: () => void }) {
  const [hideStars, setHideStars] = useState(false)
  const [status, setStatus]       = useState<'copied' | 'failed' | null>(null)
  const close = useCallback(() => onClose(), [onClose])

  async function send() {
    setStatus(null)
    const result = await shareLink({
      title: `${review.artist}${review.place ? ` at ${review.place}` : ''}`,
      text:  hideStars ? `I rated ${review.artist}. What would you give it?` : `My take on ${review.artist}`,
      url:   `${window.location.origin}${reviewPath(review.username, review.showId, hideStars)}`,
    })
    if (result === 'copied' || result === 'failed') setStatus(result)
  }

  return (
    <Sheet title="Send your take" blurb="Friends can read it without an account, and rate the show if they were there." onClose={close}>
      <div className="space-y-4">
        <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso p-3 space-y-2.5">
          <div className="flex items-center gap-3">
            <ArtistPhoto name={review.artist} src={review.imageUrl} className="w-14 h-14" iconSize={18}>
              <DateTag isoDate={review.isoDate} />
            </ArtistPhoto>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-base font-bold leading-tight truncate">{review.artist}</h3>
              {review.place && <Place className="mt-0.5">{review.place}</Place>}
              <div className="mt-1">
                {hideStars || review.score == null
                  ? <span className="font-display text-[13px] font-bold tracking-[0.3em] text-accent">?????</span>
                  : <Stars score={review.score} size={13} />}
              </div>
            </div>
          </div>
          {review.review && <PullQuote compact className="line-clamp-2">{review.review}</PullQuote>}
        </div>

        <Toggle label="Hide my stars until they rate" checked={hideStars} onChange={setHideStars} />

        {status === 'failed' && <ErrorNote>Couldn&apos;t share or copy the link. Try again.</ErrorNote>}

        <button type="button" onClick={send} className={`${btnPrimary} w-full py-3.5 text-xs`}>
          {status === 'copied' ? 'Link copied' : 'Share'}
        </button>
      </div>
    </Sheet>
  )
}
