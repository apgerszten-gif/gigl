'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Building2, ChevronRight, Plus, Search, X } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { PersonRow, type Person } from '@/components/PeopleList'
import { PastShowRows, ShimmerRows, UpcomingShowRows, type ListedShow } from '@/components/ShowRows'
import { ArtistPhoto, EmptyState, ErrorNote, Label, Place, inputBox } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { artistHref, venueHref } from '@/lib/showLinks'
import { useShowSaving } from '@/lib/useShowSaving'
import { useStartLogging } from '@/lib/useStartLogging'

// The Feed's search: one box for artists, venues, shows and people. An artist
// or venue opens its own page of every show (/artists, /venues); a show that's
// happened can be logged from here and one that hasn't can be saved, so the
// dock's Log button isn't the only way to either.

export const FEED_SEARCH_MIN = 2
const SEARCH_DEBOUNCE_MS = 300
const PEOPLE_LIMIT = 4

interface ArtistMatch { name: string; shows: number; imageUrl: string | null }
interface VenueMatch  { name: string; city: string; state: string; shows: number }
interface Results {
  artists:  ArtistMatch[]
  venues:   VenueMatch[]
  past:     ListedShow[]
  upcoming: ListedShow[]
  people:   Person[]
}

export function FeedSearchBar({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <label className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/40`}>
      <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={e => { if (e.key === 'Escape') onChange('') }}
        placeholder="Artists, venues, shows, people"
        aria-label="Search artists, venues, shows and people"
        enterKeyHint="search"
        autoComplete="off"
        className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
      />
      {value && (
        <button type="button" onClick={() => onChange('')} aria-label="Clear search" className="-m-1 p-1 text-ink-muted">
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      )}
    </label>
  )
}

// .or() takes a comma-separated filter string, so strip anything it would
// read as syntax, and the LIKE wildcards. Same as components/UserSearch.tsx.
function cleanPeopleQuery(input: string): string {
  return input.replace(/[,()\\%*"]/g, ' ').trim()
}

export function FeedSearchResults({ query }: { query: string }) {
  const { user } = useAuth()
  const startLogging = useStartLogging()
  const { savedIds, saveFailed, toggleSave, signUpSheet } = useShowSaving()

  const trimmed = query.trim()
  const [results, setResults] = useState<Results | null>(null)
  // Which query `results` answers. A newer one keeps the older results on
  // screen until it lands, rather than flashing back to shimmer each key.
  const [answered, setAnswered] = useState<string | null>(null)
  const [failed, setFailed]     = useState(false)
  const latest = useRef(trimmed)

  useEffect(() => {
    latest.current = trimmed
    if (trimmed.length < FEED_SEARCH_MIN) return

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      const people = cleanPeopleQuery(trimmed)
      let peopleQuery = createClient().from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${people}%,display_name.ilike.%${people}%`)
        .eq('username_set', true)
        .order('username')
        .limit(PEOPLE_LIMIT)
      if (user) peopleQuery = peopleQuery.neq('id', user.id)

      try {
        const [res, peopleRes] = await Promise.all([
          fetch(`/api/search?${new URLSearchParams({ q: trimmed }).toString()}`, { signal: controller.signal }),
          people.length >= FEED_SEARCH_MIN ? peopleQuery : Promise.resolve({ data: [], error: null }),
        ])
        if (!res.ok) throw new Error(`search failed: ${res.status}`)
        const data = await res.json()
        if (latest.current !== trimmed) return
        if (peopleRes.error) console.error('people search failed:', peopleRes.error.message)
        setResults({
          artists:  data.artists ?? [],
          venues:   data.venues ?? [],
          past:     data.past ?? [],
          upcoming: data.upcoming ?? [],
          people:   (peopleRes.data ?? []) as Person[],
        })
        setAnswered(trimmed)
        setFailed(false)
      } catch (err) {
        if ((err as Error).name === 'AbortError' || latest.current !== trimmed) return
        console.error('feed search failed:', err)
        setFailed(true)
        setAnswered(trimmed)
      }
    }, SEARCH_DEBOUNCE_MS)

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [trimmed, user?.id])

  const settled = answered === trimmed
  const empty = results != null && results.artists.length === 0 && results.venues.length === 0
    && results.past.length === 0 && results.upcoming.length === 0 && results.people.length === 0

  return (
    <main className="px-5 pt-4 space-y-5">
      {saveFailed && <ErrorNote>Couldn&apos;t update your saved shows. Try again.</ErrorNote>}

      {failed && settled ? (
        <EmptyState>Couldn&apos;t search right now. Try again in a moment.</EmptyState>
      ) : results == null ? (
        <ShimmerRows count={4} />
      ) : empty && settled ? (
        <EmptyState>Nothing on Gigl matches &ldquo;{trimmed}&rdquo; yet.</EmptyState>
      ) : (
        <div className={`space-y-5 transition-opacity ${settled ? '' : 'opacity-60'}`}>
          {results.artists.length > 0 && (
            <section>
              <Label className="mb-2">Artists</Label>
              <LinkRows>
                {results.artists.map((a, i) => (
                  <LinkRow key={a.name} href={artistHref(a.name)} index={i}>
                    <ArtistPhoto name={a.name} src={a.imageUrl} className="w-12 h-12" iconSize={16} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[15px] font-bold leading-tight truncate">{a.name}</h3>
                      <ShowCount count={a.shows} />
                    </div>
                  </LinkRow>
                ))}
              </LinkRows>
            </section>
          )}

          {results.venues.length > 0 && (
            <section>
              <Label className="mb-2">Venues</Label>
              <LinkRows>
                {results.venues.map((v, i) => (
                  <LinkRow key={`${v.name}|${v.city}|${v.state}`} href={venueHref(v)} index={i}>
                    <ArtistPhoto name={v.name} src={null} icon={Building2} className="w-12 h-12" iconSize={16} />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[15px] font-bold leading-tight truncate">{v.name}</h3>
                      <Place className="mt-0.5">{[v.city, v.state].filter(Boolean).join(', ')}</Place>
                      <ShowCount count={v.shows} />
                    </div>
                  </LinkRow>
                ))}
              </LinkRows>
            </section>
          )}

          {results.upcoming.length > 0 && (
            <section>
              <Label className="mb-2">Coming up</Label>
              <UpcomingShowRows shows={results.upcoming} savedIds={savedIds} onToggleSave={toggleSave} />
            </section>
          )}

          {results.past.length > 0 && (
            <section>
              <Label className="mb-2">Past shows</Label>
              <PastShowRows shows={results.past} onLog={startLogging} />
            </section>
          )}

          {results.people.length > 0 && (
            <section>
              <Label className="mb-2">People</Label>
              <div className="flex flex-col gap-2">
                {results.people.map(person => <PersonRow key={person.id} person={person} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* The catalogue stops at ticketed rooms, so this is the only route a
          house show or a local bill has into Gigl at all. */}
      {(results != null || failed) && (
        <Link href="/add-show" className="flex items-center gap-3 rounded-card border-1.5 border-dashed border-ink/30 px-3.5 py-3 hover:border-accent/50">
          <span className="w-9 h-9 flex-shrink-0 rounded-full bg-accent/10 border border-accent/40 text-accent flex items-center justify-center">
            <Plus className="w-4 h-4" strokeWidth={2} />
          </span>
          <div className="min-w-0">
            <p className="font-display text-[15px] font-bold leading-tight">Can&apos;t find your show?</p>
            <p className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">Add it yourself</p>
          </div>
        </Link>
      )}

      {signUpSheet}
    </main>
  )
}

function ShowCount({ count }: { count: number }) {
  return (
    <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-label text-ink-faint">
      {count} {count === 1 ? 'show' : 'shows'}
    </p>
  )
}

function LinkRows({ children }: { children: React.ReactNode }) {
  return <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">{children}</div>
}

function LinkRow({ href, index, children }: { href: string; index: number; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-3 py-2.5 hover:bg-accent/5 ${index % 2 ? 'bg-cream-alt' : ''} ${index > 0 ? 'border-t border-ink/10' : ''}`}
    >
      {children}
      <ChevronRight className="w-4 h-4 flex-shrink-0 text-ink-faint" />
    </Link>
  )
}
