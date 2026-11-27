'use client'

import { useState } from 'react'
import { Check, ImagePlus, Loader2, Plus, X } from 'lucide-react'
import { CityPicker, placeName } from '@/components/CityPicker'
import type { NamedPlace } from '@/lib/geo'
import { ArtistPhoto, Card, Chip, DateTag, EmptyState, Label, Place, Stars, btnPrimary, btnQuiet, btnSecondary, fieldInput, headerClass, inputBox } from '@/components/ui'
import { UpcomingShowRows, type ListedShow, type RowText } from '@/components/ShowRows'
import { computeShowScore } from '@/lib/rating'
import type { GuestDraft } from '@/lib/pendingLogs'
import type { WrappedArtist, WrappedCard, WrappedShow } from '@/lib/wrapped/types'

// The full-screen steps of the Wrapped flow (components/wrapped/WrappedFlow.tsx):
// checking the artists that were read, then the two lists of shows. They sit
// over the Feed, under their own header, and the ✕ ends the flow.

export function FlowScreen({ title, onClose, children, footer }: {
  title:   string
  onClose: () => void
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <div data-wrapped-screen className="fixed inset-0 z-[100] bg-paper text-ink overflow-y-auto">
      <div className="max-w-md mx-auto min-h-full flex flex-col">
        <header className={headerClass}>
          <h1 className="flex-1 min-w-0 font-display text-[17px] font-bold tracking-tight truncate">{title}</h1>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 text-ink-muted">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </header>
        <div className="flex-1 px-5 pt-4 pb-6 space-y-4">{children}</div>
        {footer && (
          <div className="sticky bottom-0 px-5 pt-5 pb-[calc(16px+env(safe-area-inset-bottom))] bg-gradient-to-t from-paper via-paper to-transparent">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Check the artists ────────────────────────────────────────────────────────

export interface ArtistCounts { upcoming: number; past: number }

function countLine(counts: ArtistCounts, nearby: boolean): string {
  const parts: string[] = []
  if (counts.upcoming > 0) parts.push(`${counts.upcoming} coming up`)
  if (counts.past > 0) parts.push(`${counts.past} past show${counts.past === 1 ? '' : 's'}`)
  if (parts.length > 0) return parts.join(' · ')
  return nearby ? 'Nothing near you right now' : 'No shows in Gigl right now'
}

export function CheckArtists({ artists, counts, ticked, photo, nearby, onToggle, onAddTyped, onAnother, adding, addNote }: {
  artists:  WrappedArtist[]
  counts:   Record<string, ArtistCounts>
  ticked:   Set<string>
  photo:    (name: string) => string | null
  nearby:   boolean
  onToggle: (name: string) => void
  // Type in an artist the reading missed.
  onAddTyped: (name: string) => Promise<void>
  // Add another screenshot's artists to this list.
  onAnother: () => void
  adding:   boolean
  // What happened to the last one typed ("Added Bon Iver", "Couldn't find...").
  addNote:  string | null
}) {
  const [typed, setTyped] = useState('')
  const groups: { from: WrappedCard; label: string }[] = [
    { from: 'artists', label: 'From Top artists' },
    { from: 'songs',   label: 'From Top songs' },
    { from: 'typed',   label: 'Added by you' },
  ]

  return (
    <>
      <div>
        <h2 className="font-display text-[24px] font-bold tracking-tight leading-tight">
          We found {artists.length} artist{artists.length === 1 ? '' : 's'}<span className="text-accent">.</span>
        </h2>
        <p className="mt-1 text-[13px] leading-snug text-ink-muted">
          Untick anyone who isn&apos;t right. Each row says what Gigl has for them{nearby ? ' near you' : ''}.
        </p>
      </div>

      {groups.map(group => {
        const rows = artists.filter(a => a.from === group.from)
        if (rows.length === 0) return null
        return (
          <section key={group.from} className="space-y-2">
            <Label>{group.label}</Label>
            <Card className="overflow-hidden">
              {rows.map((artist, i) => {
                const on = ticked.has(artist.name)
                const sub = !artist.matched
                  ? 'Not in Gigl yet'
                  : artist.corrected
                    ? null
                    : countLine(counts[artist.name] ?? { upcoming: 0, past: 0 }, nearby)
                return (
                  <button
                    key={`${artist.rank}-${artist.read}`}
                    type="button"
                    onClick={() => artist.matched && onToggle(artist.name)}
                    disabled={!artist.matched}
                    aria-pressed={on}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}
                  >
                    <span className={`w-5 flex-shrink-0 text-right font-display text-[15px] font-bold text-accent ${on ? '' : 'opacity-40'}`}>{artist.rank}</span>
                    <div className={on ? '' : 'opacity-40'}>
                      <ArtistPhoto name={artist.name} src={artist.imageUrl ?? photo(artist.name)} className="w-10 h-10" iconSize={15} />
                    </div>
                    <div className={`flex-1 min-w-0 ${on ? '' : 'opacity-50'}`}>
                      <h3 className="font-display text-[15px] font-bold leading-tight truncate">{artist.name}</h3>
                      {artist.corrected ? (
                        <p className="mt-0.5 text-[11px] text-ink-faint truncate">
                          Read as <span className="line-through">{artist.read}</span>
                          {' · '}<span className="text-accent">{countLine(counts[artist.name] ?? { upcoming: 0, past: 0 }, nearby)}</span>
                        </p>
                      ) : (
                        <p className={`mt-0.5 text-[11px] truncate ${artist.matched ? 'text-accent' : 'text-ink-faint'}`}>{sub}</p>
                      )}
                    </div>
                    <span className={`w-6 h-6 flex-shrink-0 rounded border-1.5 border-ink flex items-center justify-center ${on ? 'bg-accent text-cream' : 'bg-cream'}`}>
                      {on && <Check className="w-4 h-4" strokeWidth={3} />}
                    </span>
                  </button>
                )
              })}
            </Card>
          </section>
        )
      })}

      <section className="space-y-2">
        <Label>Someone missing?</Label>
        <form
          onSubmit={e => {
            e.preventDefault()
            const name = typed.trim()
            if (!name || adding) return
            onAddTyped(name).then(() => setTyped(''))
          }}
          className="flex gap-2"
        >
          <label className={`${inputBox} flex-1 min-w-0 flex items-center px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/40`}>
            <input
              value={typed}
              onChange={e => setTyped(e.target.value)}
              placeholder="Type an artist"
              enterKeyHint="done"
              className={fieldInput}
            />
          </label>
          <button type="submit" disabled={!typed.trim() || adding} className={`${btnSecondary} flex-shrink-0 gap-1 px-4 text-[11px]`}>
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" strokeWidth={2.5} /> : <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />}
            Add
          </button>
        </form>
        {addNote && <p className="text-[12px] leading-snug text-ink-muted">{addNote}</p>}

        <button type="button" onClick={onAnother} disabled={adding} className={`${btnQuiet} w-full py-3 text-[12px]`}>
          <ImagePlus className="w-4 h-4" strokeWidth={1.75} />
          Add another screenshot
        </button>
      </section>
    </>
  )
}

// ── The two lists ────────────────────────────────────────────────────────────

export type ResultsTab = 'upcoming' | 'past'
// Where the lists are measured from: the phone's own location, or a city
// they typed (the show may have been somewhere they aren't now), or nowhere.
export type PlaceFilter = 'near' | 'anywhere'

export function WrappedResults({
  tab, onTab, place, onPlace, radiusMiles, canFilterNearby, city, onPickCity, onClearCity, hasDeviceLocation,
  artistCount, upcoming, past, rankOf, photo,
  savedIds, onToggleSave, logs, onLog,
  following, onFollowAll,
}: {
  tab:          ResultsTab
  onTab:        (tab: ResultsTab) => void
  place:        PlaceFilter
  onPlace:      (place: PlaceFilter) => void
  radiusMiles:  number
  canFilterNearby: boolean
  // The city typed in instead of using the phone's location, if any.
  city:         NamedPlace | null
  onPickCity:   (city: NamedPlace) => void
  onClearCity:  () => void
  hasDeviceLocation: boolean
  artistCount:  number
  upcoming:     WrappedShow[]
  past:         WrappedShow[]
  rankOf:       (name: string) => number | null
  photo:        (name: string) => string | null
  savedIds:     Set<string>
  onToggleSave: (show: WrappedShow) => void
  logs:         Record<string, GuestDraft>
  onLog:        (show: WrappedShow) => void
  following:    boolean
  onFollowAll:  () => void
}) {
  const describe = (show: ListedShow): RowText => {
    const wrapped = (show as WrappedShow).wrappedArtist
    const rank = rankOf(wrapped)
    const onBill = wrapped && wrapped !== show.artist ? `With ${wrapped} · ` : ''
    return {
      title: show.artist,
      place: [show.venue, show.city, show.state].filter(Boolean).join(', '),
      note:  rank ? `${onBill}#${rank} on your Wrapped` : null,
    }
  }

  const byId = new Map(upcoming.map(s => [s.id, s]))

  return (
    <>
      <div>
        <Label tone="accent">Step {tab === 'upcoming' ? 1 : 2} of 2</Label>
        <h2 className="mt-1 font-display text-[24px] font-bold tracking-tight leading-tight">
          {tab === 'upcoming' ? 'Coming up' : 'Were you there?'}<span className="text-accent">.</span>
        </h2>
        {tab === 'upcoming' && (
          <p className="mt-1 text-[13px] leading-snug text-ink-muted">
            {`${upcoming.length} upcoming show${upcoming.length === 1 ? '' : 's'} by your ${artistCount} artists. Save the ones you want to go to.`}
          </p>
        )}
      </div>

      <PlaceChips
        place={place}
        onPlace={onPlace}
        radiusMiles={radiusMiles}
        canFilterNearby={canFilterNearby}
        city={city}
        onPickCity={onPickCity}
        onClearCity={onClearCity}
        hasDeviceLocation={hasDeviceLocation}
      />

      {tab === 'upcoming' ? (
        <>
          {upcoming.length > 0 ? (
            <UpcomingShowRows
              shows={upcoming}
              savedIds={savedIds}
              onToggleSave={show => { const s = byId.get(show.id); if (s) onToggleSave(s) }}
              describe={describe}
            />
          ) : (
            <EmptyState>
              {place === 'near' && canFilterNearby
                ? 'None of your artists have a show near you in the next year. Try Anywhere, Another city, or follow them below to hear about new dates.'
                : 'None of your artists have a show coming up in Gigl yet. Follow them below to hear about new dates.'}
            </EmptyState>
          )}

          {artistCount > 0 && (
            <Card className="p-3.5 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-display text-[15px] font-bold leading-tight">Follow all {artistCount}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-ink-muted">Their new dates show up in Upcoming → Following.</p>
              </div>
              {following ? (
                <span className={`${btnQuiet} px-3 py-2 text-[11px]`}><Check className="w-3.5 h-3.5" strokeWidth={2.5} />Following</span>
              ) : (
                <button type="button" onClick={onFollowAll} className={`${btnSecondary} px-3 py-2 text-[10px]`}>Follow</button>
              )}
            </Card>
          )}
        </>
      ) : (
        <>
          {past.length > 0 ? (
            <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
              {past.map((show, i) => {
                const log = logs[show.id]
                const text = describe(show)
                return (
                  <div key={show.id} className={`flex items-center gap-3 px-3 py-2.5 ${i % 2 ? 'bg-cream-alt' : ''} ${i > 0 ? 'border-t border-ink/10' : ''}`}>
                    <ArtistPhoto name={show.artist} src={show.imageUrl ?? photo(show.artist)} className="w-14 h-14" iconSize={18}>
                      <DateTag isoDate={show.isoDate} />
                    </ArtistPhoto>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display text-[15px] font-bold leading-tight truncate">{show.artist}</h3>
                      <Place className="mt-0.5">{text.place}</Place>
                      {log ? (
                        <span className="mt-1 flex items-center gap-1.5">
                          <Stars score={computeShowScore(log.performance_rating, log.venue_rating)} size={11} />
                          <span className="text-[10px] font-semibold uppercase tracking-label text-ink-faint">Yours</span>
                        </span>
                      ) : text.note && (
                        <p className="mt-0.5 text-[11px] text-ink-faint truncate">{text.note}</p>
                      )}
                    </div>
                    {log ? (
                      <button type="button" onClick={() => onLog(show)} className={`${btnQuiet} flex-shrink-0 gap-1 px-2.5 py-1 text-[10px] uppercase tracking-label`}>
                        <Check className="w-3 h-3" strokeWidth={2.5} />Logged
                      </button>
                    ) : (
                      <button type="button" onClick={() => onLog(show)} className={`${btnSecondary} flex-shrink-0 px-2.5 py-1 text-[10px]`}>
                        I was there
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <EmptyState>
              {place === 'near' && canFilterNearby
                ? 'Gigl has no shows by your artists near you from the past year. Try Anywhere.'
                : 'Gigl has no shows by your artists from the past year.'}
            </EmptyState>
          )}
        </>
      )}
    </>
  )
}

function PlaceChips({ place, onPlace, radiusMiles, canFilterNearby, city, onPickCity, onClearCity, hasDeviceLocation }: {
  place: PlaceFilter; onPlace: (place: PlaceFilter) => void; radiusMiles: number; canFilterNearby: boolean
  city: NamedPlace | null; onPickCity: (city: NamedPlace) => void; onClearCity: () => void; hasDeviceLocation: boolean
}) {
  const [picking, setPicking] = useState(false)
  const onCity = !!city && place === 'near' && canFilterNearby
  const onMe = !city && place === 'near' && canFilterNearby

  return (
    <div>
      <div className="flex flex-wrap gap-1.5">
        {(hasDeviceLocation || !city) && (
          <button type="button" onClick={() => { onClearCity(); onPlace('near'); setPicking(false) }}>
            <Chip active={onMe}>Near me · {radiusMiles} mi</Chip>
          </button>
        )}
        {city && (
          <button type="button" onClick={() => { onPlace('near'); setPicking(false) }}>
            <Chip active={onCity}>{placeName(city)} · {radiusMiles} mi</Chip>
          </button>
        )}
        <button type="button" onClick={() => setPicking(p => !p)}>
          <Chip active={picking}>{city ? 'Change city' : 'Another city'}</Chip>
        </button>
        <button type="button" onClick={() => { onPlace('anywhere'); setPicking(false) }}>
          <Chip active={place === 'anywhere' || !canFilterNearby}>Anywhere</Chip>
        </button>
      </div>
      {picking && (
        <CityPicker
          onPick={picked => { onPickCity(picked); onPlace('near'); setPicking(false) }}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  )
}

// The footer of the two result steps: Next from Coming up, then Done after
// Were you there? (with a way back).
export function ResultsFooter({ tab, signedIn, loggedCount, pastCount, onNext, onBack, onDone }: {
  tab:         ResultsTab
  signedIn:    boolean
  loggedCount: number
  pastCount:   number
  onNext:      () => void
  onBack:      () => void
  onDone:      () => void
}) {
  if (tab === 'upcoming') {
    return (
      <button type="button" onClick={onNext} className={`${btnPrimary} w-full py-4 text-xs`}>
        Next: were you there?
      </button>
    )
  }
  return (
    <>
      <button type="button" onClick={onDone} className={`${btnPrimary} w-full py-4 text-xs`}>
        {loggedCount === 0 && pastCount > 0 ? 'Skip and finish' : 'Done'}
      </button>
      <button type="button" onClick={onBack} className="w-full mt-2 py-1 text-[12px] font-semibold text-ink-muted">Back</button>
      {!signedIn && (
        <p className="text-center text-[11px] text-ink-faint">Next, your phone number, to keep your logs and saves.</p>
      )}
    </>
  )
}
