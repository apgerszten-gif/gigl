'use client'

import { useState } from 'react'
import { Disc3, ListMusic } from 'lucide-react'
import type { ShowSetlist, ShowSetlistSong } from '@/lib/setlistfm'
import { Card, EmptyState, Label, btnSecondary } from '@/components/ui'

// What the artist played, from setlist.fm, on a show's page of reviews and a
// review page. Loaded only when someone taps for it: every lookup spends
// setlist.fm's daily quota, which search and the artist pages share, and
// most visits never want the songs. Nothing here is stored (see /api/setlist).

interface Props {
  artist:  string
  isoDate: string
  venue?:  string | null
  city?:   string | null
}

type State =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'found'; setlist: ShowSetlist }
  | { kind: 'none' }
  | { kind: 'failed' }

// setlist.fm's terms ask for a credit wherever its data appears, with a link
// search engines can follow - so no rel="nofollow".
function Credit({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="text-[10px] font-semibold uppercase tracking-label text-ink-faint underline underline-offset-[3px] hover:text-accent"
    >
      via setlist.fm
    </a>
  )
}

function details(song: ShowSetlistSong): string | null {
  const parts = [
    song.cover ? `${song.cover} cover` : null,
    song.with ? `with ${song.with}` : null,
    song.info ?? null,
    song.tape ? 'from tape' : null,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

function Songs({ setlist }: { setlist: ShowSetlist }) {
  // Numbered straight through every set and encore, as setlist.fm numbers
  // them; a song played from tape isn't counted.
  let n = 0
  return (
    <Card className="overflow-hidden">
      {setlist.sets.map((set, s) => (
        <div key={s} className={s > 0 ? 'border-t-1.5 border-ink' : ''}>
          {set.title && (
            <div className="px-3.5 pt-2.5 pb-1.5 bg-paper/60 border-b border-ink/10">
              <Label tone="accent">{set.title}</Label>
            </div>
          )}
          <ol>
            {set.songs.map((song, i) => {
              const note = details(song)
              if (!song.tape) n++
              return (
                <li
                  key={i}
                  className={`flex items-start gap-3 px-3.5 py-2 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}
                >
                  <span className="w-5 flex-shrink-0 flex justify-end pt-px font-display text-[15px] font-bold leading-tight text-accent">
                    {song.tape ? <Disc3 className="w-3.5 h-3.5 mt-0.5 text-ink-faint" strokeWidth={2} aria-hidden /> : n}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[14px] leading-tight ${song.tape ? 'italic text-ink-muted' : ''}`}>
                      {song.name}
                      {song.segue && <span className="ml-1.5 text-ink-faint" aria-label="into the next song">→</span>}
                    </p>
                    {note && <p className="mt-0.5 text-[11px] leading-snug text-ink-muted">{note}</p>}
                  </div>
                </li>
              )
            })}
          </ol>
        </div>
      ))}
    </Card>
  )
}

export function SetlistPanel({ artist, isoDate, venue, city }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })

  async function load() {
    setState({ kind: 'loading' })
    const params = new URLSearchParams({ artist, date: isoDate })
    if (venue) params.set('venue', venue)
    if (city) params.set('city', city)
    try {
      const res = await fetch(`/api/setlist?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const { setlist } = await res.json() as { setlist: ShowSetlist | null }
      setState(setlist ? { kind: 'found', setlist } : { kind: 'none' })
    } catch {
      setState({ kind: 'failed' })
    }
  }

  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 pb-2">
        <Label>Setlist</Label>
        {state.kind === 'found' && <Credit href={state.setlist.url} />}
      </div>

      {(state.kind === 'idle' || state.kind === 'loading') && (
        <button
          type="button"
          onClick={load}
          disabled={state.kind === 'loading'}
          className={`${btnSecondary} w-full py-2.5 text-[11px]`}
        >
          <ListMusic className="w-4 h-4" strokeWidth={2} aria-hidden />
          {state.kind === 'loading' ? 'Finding the setlist…' : 'See what they played'}
        </button>
      )}

      {state.kind === 'found' && (
        <div className="space-y-2">
          {state.setlist.tour && <p className="text-[12px] text-ink-muted">{state.setlist.tour}</p>}
          <Songs setlist={state.setlist} />
        </div>
      )}

      {state.kind === 'none' && (
        <EmptyState>
          No setlist for this show on setlist.fm yet. Remember it?{' '}
          <a href="https://www.setlist.fm" target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-[3px]">
            Add it there
          </a>.
        </EmptyState>
      )}

      {state.kind === 'failed' && (
        <EmptyState>
          Couldn&apos;t reach setlist.fm just now.{' '}
          <button type="button" onClick={load} className="font-semibold text-accent underline underline-offset-[3px]">Try again</button>
        </EmptyState>
      )}
    </section>
  )
}
