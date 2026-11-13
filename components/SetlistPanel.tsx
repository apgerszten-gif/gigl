'use client'

import { useEffect, useState } from 'react'
import { Disc3, ListMusic, X } from 'lucide-react'
import { formatShowDate } from '@/lib/dates'
import type { ShowSetlist, ShowSetlistSong } from '@/lib/setlistfm'
import { Card, EmptyState, Label, LoadingLabel, btnSecondary } from '@/components/ui'

// What the artist played, from setlist.fm, on a show's page of reviews (under
// the reviews) and a review page: a "See the setlist" button that opens the
// songs in a sheet over the page, like SignUpSheet and RankingDetailSheet.
// Loaded only when someone taps for it: every lookup spends
// setlist.fm's daily quota, which search and the artist pages share, and
// most visits never want the songs. Nothing here is stored (see /api/setlist).

interface Props {
  artist:  string
  isoDate: string
  venue?:  string | null
  city?:   string | null
}

// How long the sheet takes to slide away, matching its duration-[280ms].
const SLIDE_MS = 280

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
  const [open, setOpen]   = useState(false)
  // A frame after `open`, so the sheet slides up rather than appearing.
  const [shown, setShown] = useState(false)

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

  // Asked for once per page: closing and reopening shows the same answer.
  function openSheet() {
    setOpen(true)
    if (state.kind === 'idle' || state.kind === 'failed') load()
  }

  function close() {
    setShown(false)
    setTimeout(() => setOpen(false), SLIDE_MS)
  }

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => setShown(true), 10)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    window.addEventListener('keydown', onKey)
    // The page behind stays put while the songs scroll.
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
    }
  }, [open])

  const songCount = state.kind === 'found'
    ? state.setlist.sets.reduce((n, set) => n + set.songs.filter(song => !song.tape).length, 0)
    : 0
  const subtitle = [venue, formatShowDate(isoDate), state.kind === 'found' ? state.setlist.tour : null]
    .filter(Boolean).join(' · ')

  return (
    <>
      <button type="button" onClick={openSheet} className={`${btnSecondary} w-full py-3 text-[11px]`}>
        <ListMusic className="w-4 h-4" strokeWidth={2} aria-hidden />
        See the setlist
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className={`absolute inset-0 bg-ink/55 transition-opacity duration-[280ms] ${shown ? 'opacity-100' : 'opacity-0'}`}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${artist}: setlist`}
            className={`relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-card border-1.5 border-b-0 border-ink bg-paper text-ink px-5 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] transition-transform duration-[280ms] ease-out ${
              shown ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="font-display text-2xl font-bold tracking-tight leading-tight break-words">
                  {artist}<span className="text-accent">.</span>
                </h2>
                <p className="mt-1 text-[13px] leading-snug text-ink-muted">{subtitle}</p>
              </div>
              <button type="button" onClick={close} aria-label="Close" className="-mr-1 p-1 text-ink-muted">
                <X className="w-5 h-5" strokeWidth={2} />
              </button>
            </div>

            <div className="mt-4">
              {state.kind === 'found' ? (
                <>
                  <div className="flex items-baseline justify-between gap-3 pb-2">
                    <Label>{songCount} {songCount === 1 ? 'song' : 'songs'}</Label>
                    <Credit href={state.setlist.url} />
                  </div>
                  <Songs setlist={state.setlist} />
                </>
              ) : state.kind === 'none' ? (
                <EmptyState>
                  No setlist for this show on setlist.fm yet. Remember it?{' '}
                  <a href="https://www.setlist.fm" target="_blank" rel="noopener" className="font-semibold text-accent underline underline-offset-[3px]">
                    Add it there
                  </a>.
                </EmptyState>
              ) : state.kind === 'failed' ? (
                <EmptyState>
                  Couldn&apos;t reach setlist.fm just now.{' '}
                  <button type="button" onClick={load} className="font-semibold text-accent underline underline-offset-[3px]">Try again</button>
                </EmptyState>
              ) : (
                <LoadingLabel>Finding the setlist…</LoadingLabel>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
