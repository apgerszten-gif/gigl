'use client'

import Link from 'next/link'
import { MediaGrid } from '@/components/MediaGrid'
import { showScore } from '@/lib/rating'
import {
  HistoryControls, NoHistoryMatches, TimelineList, useShowHistory, type HistoryLog, type HistoryPerson,
} from '@/components/ShowHistory'
import { ArtistPhoto, Card, Chip, DateTag, EmptyState, Label, Place, PullQuote, Stars, placeOf } from '@/components/ui'

// "Their shows" on a public profile (/u/<name>): the same Timeline / Ranked
// views and filters as You, read-only. The server page reads the logs and
// hands them over with their photos, videos and tagged people already
// resolved, since a server component can't pass functions down.

export interface PublicLog extends HistoryLog {
  // Full URLs of the log's photos and videos.
  media:  string[]
  // Everyone tagged on it.
  people: HistoryPerson[]
}

export function PublicShowHistory({ logs, artistImages }: {
  logs:         PublicLog[]
  // Artist name -> photo, for every artist in `logs`.
  artistImages: Record<string, string | null>
}) {
  const history = useShowHistory(logs)
  const artistImage = (name: string) => artistImages[name] ?? null

  return (
    <section className="space-y-3">
      <Label>Their shows</Label>

      {logs.length === 0 ? (
        <EmptyState>No shows logged yet</EmptyState>
      ) : (
        <>
          <HistoryControls history={history} />
          {history.filtered.length === 0 ? (
            <NoHistoryMatches onClear={history.clear} />
          ) : history.view === 'timeline' ? (
            <TimelineList
              groups={history.timeline}
              artistImage={artistImage}
              mediaOf={log => log.media}
              peopleOf={log => log.people}
              hrefOf={log => `/artist/${encodeURIComponent(log.artist_id)}`}
              onTop={year => { history.setYear(year); history.setView('ranked') }}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {history.ranked.map((show, i) => {
                const hasScore = show.performance_rating != null && show.venue_rating != null
                const place = placeOf(show)
                return (
                  <Card key={show.id} className="overflow-hidden">
                    {show.media.length > 0 && (
                      <div className="border-b-1.5 border-ink">
                        <MediaGrid urls={show.media} maxHeight={220} />
                      </div>
                    )}
                    <Link href={`/artist/${encodeURIComponent(show.artist_id)}`} className="p-3 flex items-center gap-3">
                      <span className="font-display text-2xl font-bold leading-none w-7 flex-shrink-0 text-center text-accent">{i + 1}</span>
                      <ArtistPhoto name={show.artist_name} src={artistImage(show.artist_name)} className="w-12 h-12" iconSize={16}>
                        <DateTag isoDate={show.show_date} />
                      </ArtistPhoto>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-display text-[15px] font-bold leading-tight truncate">{show.artist_name}</h3>
                          {hasScore && <Stars score={showScore(show)} size={12} />}
                        </div>
                        {place && <Place className="mt-0.5">{place}</Place>}
                      </div>
                    </Link>
                    {(show.review || (show.tags && show.tags.length > 0)) && (
                      <div className="px-3 pb-3 space-y-2.5">
                        {show.review && <PullQuote>{show.review}</PullQuote>}
                        {show.tags && show.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5">
                            {show.tags.map(tag => <Chip key={tag}>{tag}</Chip>)}
                          </div>
                        )}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </>
      )}
    </section>
  )
}
