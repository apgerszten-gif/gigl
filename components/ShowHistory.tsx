'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, Play, X } from 'lucide-react'
import { nameKey } from '@/lib/nameKey'
import { showScore } from '@/lib/rating'
import { formatLongDate } from '@/lib/dates'
import { isVideoUrl } from '@/lib/media'
import { festivalNameOf } from '@/lib/festivals'
import { WithLine } from '@/components/TagDisplay'
import {
  ArtistPhoto, Card, Chip, EmptyState, Label, Place, PullQuote, Segmented, Stars, fieldInput, inputBox, placeOf,
} from '@/components/ui'

// A profile's shows read two ways: the Timeline, every show grouped by year
// and newest first, the way you'd flip back through a photo album; and
// Ranked, best first, which is how the profile used to open. Both read
// through the same filters (a year, an artist, a venue), so "my top five of
// 2025" is the 2025 chip and then Ranked. Used on You and on public profiles.
//
// The Timeline is the default because the interviews kept arriving at the
// same gap: people forget most of the shows they went to, keep makeshift
// logs in photo albums and camera rolls, and want to scroll back by year.
// A ranked list with no years on it can't do that.

export interface HistoryLog {
  id:                 string
  artist_id:          string
  artist_name:        string
  stage:              string | null
  day:                string | null
  venue:              string | null
  show_date:          string | null
  performance_rating: number | null
  venue_rating:       number | null
  review:             string | null
  tags:               string[] | null
}

export interface HistoryPerson {
  username:   string
  avatar_url: string | null
}

export type HistoryView = 'timeline' | 'ranked'

// Where a log happened, as the Venue filter reads it: the venue, or for a
// festival set the festival, since its stages aren't venues.
function venueOf(log: HistoryLog): string | null {
  return log.venue || festivalNameOf(log.artist_id) || null
}

function yearOf(log: HistoryLog): string | null {
  return log.show_date ? log.show_date.slice(0, 4) : null
}

interface NameOption {
  key:   string
  name:  string
  count: number
}

// Distinct names, most-seen first, matched loosely (nameKey) so "Charli XCX"
// and "Charli xcx" are one artist to filter by.
function nameOptions(names: (string | null)[]): NameOption[] {
  const byKey = new Map<string, NameOption>()
  for (const name of names) {
    if (!name) continue
    const key = nameKey(name)
    if (!key) continue
    const option = byKey.get(key) ?? { key, name, count: 0 }
    option.count += 1
    byKey.set(key, option)
  }
  return Array.from(byKey.values()).sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
}

export interface TimelineGroup<T extends HistoryLog> {
  // Null for logs with no date, which go last.
  year:   string | null
  items:  T[]
  venues: number
}

export function useShowHistory<T extends HistoryLog>(logs: T[]) {
  const [view, setView]     = useState<HistoryView>('timeline')
  const [year, setYear]     = useState<string | null>(null)
  const [artist, setArtist] = useState<string | null>(null)
  const [venue, setVenue]   = useState<string | null>(null)

  const years = useMemo(
    () => Array.from(new Set(logs.map(yearOf).filter((y): y is string => !!y))).sort().reverse(),
    [logs],
  )
  const artists = useMemo(() => nameOptions(logs.map(l => l.artist_name)), [logs])
  const venues  = useMemo(() => nameOptions(logs.map(venueOf)), [logs])

  const filtered = useMemo(() => logs.filter(l =>
    (!year || yearOf(l) === year)
    && (!artist || nameKey(l.artist_name) === artist)
    && (!venue || nameKey(venueOf(l) ?? '') === venue),
  ), [logs, year, artist, venue])

  const ranked = useMemo(() => filtered.slice().sort((a, b) => showScore(b) - showScore(a)), [filtered])

  const timeline = useMemo((): TimelineGroup<T>[] => {
    const byYear = new Map<string, T[]>()
    for (const log of filtered) {
      const key = yearOf(log) ?? ''
      const items = byYear.get(key) ?? []
      items.push(log)
      byYear.set(key, items)
    }
    return Array.from(byYear.entries())
      .sort(([a], [b]) => (a === '' ? 1 : b === '' ? -1 : b.localeCompare(a)))
      .map(([key, items]) => ({
        year:   key || null,
        items:  items.slice().sort((a, b) => (b.show_date ?? '').localeCompare(a.show_date ?? '')),
        venues: new Set(items.map(i => nameKey(venueOf(i) ?? '')).filter(Boolean)).size,
      }))
  }, [filtered])

  function clear() {
    setYear(null)
    setArtist(null)
    setVenue(null)
  }

  return {
    view, setView, year, setYear, artist, setArtist, venue, setVenue,
    years, artists, venues, filtered, ranked, timeline, clear,
    filtering: year != null || artist != null || venue != null,
  }
}

type HistoryState = ReturnType<typeof useShowHistory<HistoryLog>>

// The Timeline / Ranked switch, then the filter chips: one per year, and an
// Artist and a Venue chip that open a short list to pick from. A chip only
// appears when it has more than one thing to choose between.
export function HistoryControls({ history }: { history: HistoryState }) {
  const [picking, setPicking] = useState<'artist' | 'venue' | null>(null)

  const pickedName = (options: NameOption[], key: string | null) => options.find(o => o.key === key)?.name ?? null
  const artistName = pickedName(history.artists, history.artist)
  const venueName  = pickedName(history.venues, history.venue)

  const showYears   = history.years.length > 1
  const showArtists = history.artists.length > 1
  const showVenues  = history.venues.length > 1

  return (
    <div className="space-y-2.5">
      <Segmented
        options={[{ value: 'timeline', label: 'Timeline' }, { value: 'ranked', label: 'Ranked' }]}
        value={history.view}
        onChange={history.setView}
      />

      {(showYears || showArtists || showVenues) && (
        <div className="flex flex-wrap items-center gap-1.5">
          {showYears && (
            <>
              <button type="button" aria-pressed={history.year == null} onClick={() => history.setYear(null)}>
                <Chip active={history.year == null}>All years</Chip>
              </button>
              {history.years.map(y => (
                <button key={y} type="button" aria-pressed={history.year === y} onClick={() => history.setYear(history.year === y ? null : y)}>
                  <Chip active={history.year === y}>{y}</Chip>
                </button>
              ))}
            </>
          )}
          {showArtists && (
            <FilterChip
              label="Artist"
              picked={artistName}
              open={picking === 'artist'}
              onToggle={() => setPicking(p => (p === 'artist' ? null : 'artist'))}
              onClear={() => history.setArtist(null)}
            />
          )}
          {showVenues && (
            <FilterChip
              label="Venue"
              picked={venueName}
              open={picking === 'venue'}
              onToggle={() => setPicking(p => (p === 'venue' ? null : 'venue'))}
              onClear={() => history.setVenue(null)}
            />
          )}
        </div>
      )}

      {picking && (
        <NamePicker
          label={picking === 'artist' ? 'Artist' : 'Venue'}
          options={picking === 'artist' ? history.artists : history.venues}
          onPick={key => {
            if (picking === 'artist') history.setArtist(key)
            else history.setVenue(key)
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}
    </div>
  )
}

function FilterChip({ label, picked, open, onToggle, onClear }: {
  label: string; picked: string | null; open: boolean; onToggle: () => void; onClear: () => void
}) {
  if (picked) {
    return (
      <button type="button" aria-label={`Clear the ${label.toLowerCase()} filter (${picked})`} onClick={onClear}>
        <Chip active>
          <span className="inline-flex items-center gap-1 max-w-[180px]">
            <span className="truncate">{picked}</span>
            <X className="w-3 h-3 flex-shrink-0" strokeWidth={2.5} />
          </span>
        </Chip>
      </button>
    )
  }
  return (
    <button type="button" aria-expanded={open} onClick={onToggle}>
      <Chip active={open}>
        <span className="inline-flex items-center gap-0.5">
          {label}
          <ChevronDown className="w-3 h-3" strokeWidth={2.5} />
        </span>
      </Chip>
    </button>
  )
}

// The CityPicker's pattern: type to narrow, tap a row.
function NamePicker({ label, options, onPick, onClose }: {
  label: string; options: NameOption[]; onPick: (key: string) => void; onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const typed = nameKey(query)
  const shown = typed ? options.filter(o => o.key.includes(typed)) : options

  return (
    <div>
      {options.length > 6 && (
        <div className={`${inputBox} flex items-center gap-2 px-3 py-2 mb-1.5`}>
          <input
            autoFocus
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter' && shown[0]) onPick(shown[0].key)
              if (e.key === 'Escape') onClose()
            }}
            placeholder={`Type ${label === 'Artist' ? 'an artist' : 'a venue'}`}
            aria-label={label}
            className={`${fieldInput} min-w-0 flex-1`}
          />
          <button type="button" onClick={onClose} aria-label={`Close the ${label.toLowerCase()} list`} className="flex-shrink-0 text-ink-muted">
            <X className="w-4 h-4" strokeWidth={2} />
          </button>
        </div>
      )}
      <div className="max-h-64 overflow-y-auto rounded-card border-1.5 border-ink bg-cream">
        {shown.length === 0 ? (
          <p className="px-3 py-2.5 text-[12px] text-ink-muted">No {label.toLowerCase()} by that name in these shows.</p>
        ) : shown.map((option, i) => (
          <button
            key={option.key}
            type="button"
            onClick={() => onPick(option.key)}
            className={`w-full flex items-center justify-between gap-3 text-left px-3 py-2.5 hover:bg-accent/5 ${
              i % 2 ? 'bg-cream-alt' : ''
            } ${i > 0 ? 'border-t border-ink/10' : ''}`}
          >
            <span className="min-w-0 truncate text-sm font-semibold">{option.name}</span>
            <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-label text-ink-faint">
              {option.count} {option.count === 1 ? 'show' : 'shows'}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

// When the filters leave nothing to show.
export function NoHistoryMatches({ onClear }: { onClear: () => void }) {
  return (
    <EmptyState>
      No shows match these filters.
      <button type="button" onClick={onClear} className="block mx-auto mt-2.5 text-xs font-bold uppercase tracking-label text-accent">
        Clear filters
      </button>
    </EmptyState>
  )
}

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

// The Timeline itself: a heading per year ("2026 · 7 shows · 5 venues"),
// then a card per show, newest first. Each card has the full date (always
// with the year), the artist and place, the stars, the review, the photos
// and videos attached to the log, and who it was with.
export function TimelineList<T extends HistoryLog>({ groups, artistImage, mediaOf, peopleOf, hrefOf, onTop }: {
  groups:      TimelineGroup<T>[]
  artistImage: (name: string) => string | null
  // The log's photos and videos, already resolved to full URLs.
  mediaOf:     (log: T) => string[]
  peopleOf:    (log: T) => HistoryPerson[]
  // Where tapping the card goes (the show's page of reviews), if anywhere.
  hrefOf?:     (log: T) => string | null
  // "Top 5": that year, ranked.
  onTop?:      (year: string) => void
}) {
  return (
    <div className="space-y-6">
      {groups.map(group => (
        <section key={group.year ?? 'undated'}>
          <div className="flex items-end justify-between gap-3 border-b-1.5 border-ink pb-1.5 mb-3">
            <div className="flex items-baseline gap-2 min-w-0">
              <h2 className="font-slab text-[30px] leading-none">{group.year ?? 'Undated'}</h2>
              <span className="text-[12px] text-ink-muted truncate">
                {plural(group.items.length, 'show')}{group.venues > 0 ? ` · ${plural(group.venues, 'venue')}` : ''}
              </span>
            </div>
            {onTop && group.year && group.items.length > 1 && (
              <button
                type="button"
                onClick={() => onTop(group.year!)}
                className="flex-shrink-0 py-1 text-[10px] font-bold uppercase tracking-label text-accent"
              >
                Top 5 →
              </button>
            )}
          </div>
          <div className="flex flex-col gap-3">
            {group.items.map(log => (
              <TimelineEntry
                key={log.id}
                log={log}
                photo={artistImage(log.artist_name)}
                media={mediaOf(log)}
                people={peopleOf(log)}
                href={hrefOf?.(log) ?? null}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

function TimelineEntry({ log, photo, media, people, href }: {
  log: HistoryLog; photo: string | null; media: string[]; people: HistoryPerson[]; href: string | null
}) {
  const hasScore = log.performance_rating != null && log.venue_rating != null
  const place = placeOf(log)

  const head = (
    <div className="flex items-center gap-3">
      <ArtistPhoto name={log.artist_name} src={photo} className="w-12 h-12" iconSize={16} />
      <div className="flex-1 min-w-0">
        <Label tone="accent">{formatLongDate(log.show_date)}</Label>
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-display text-[15px] font-bold leading-tight truncate">{log.artist_name}</h3>
          {hasScore && <Stars score={showScore(log)} size={12} />}
        </div>
        {place && <Place className="mt-0.5">{place}</Place>}
      </div>
    </div>
  )

  return (
    <Card className="p-3 space-y-2.5">
      {href ? <Link href={href} className="block">{head}</Link> : head}
      {log.review && <PullQuote compact>{log.review}</PullQuote>}
      {media.length > 0 && <MediaStrip urls={media} />}
      {(people.length > 0 || (log.tags && log.tags.length > 0)) && (
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">{people.length > 0 && <WithLine people={people} />}</div>
          {log.tags && log.tags.length > 0 && (
            <div className="flex flex-shrink-0 flex-wrap justify-end gap-1">
              {log.tags.slice(0, 2).map(tag => <Chip key={tag} compact>{tag}</Chip>)}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

// Thumbnails rather than the feed's full-bleed photos, so a year of shows
// still scrolls like a list. Three at most, the last saying how many more.
const STRIP_MAX = 3

function MediaStrip({ urls }: { urls: string[] }) {
  const shown = urls.slice(0, STRIP_MAX)
  const more = urls.length - shown.length
  return (
    <div className="flex gap-1.5">
      {shown.map((url, i) => (
        <div key={url} className="relative w-[72px] h-[72px] flex-shrink-0 rounded-card border-1.5 border-ink overflow-hidden bg-paper">
          {isVideoUrl(url) ? (
            <>
              <video src={url} muted playsInline preload="metadata" className="w-full h-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center text-ink">
                <Play className="w-5 h-5 drop-shadow" strokeWidth={2.25} fill="currentColor" />
              </span>
            </>
          ) : (
            <img src={url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          )}
          {more > 0 && i === shown.length - 1 && (
            <span className="absolute inset-0 bg-black/60 flex items-center justify-center font-display text-base font-bold text-ink">
              +{more}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}
