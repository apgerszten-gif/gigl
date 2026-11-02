'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { NamedPlace } from '@/lib/geo'
import { fieldInput, inputBox } from '@/components/ui'

const LOOKUP_DEBOUNCE_MS = 250
const MIN_QUERY = 2

export function placeName(place: NamedPlace): string {
  return [place.city, place.state].filter(Boolean).join(', ')
}

// Type a city, tap a match. It only offers places the catalogue has shows in
// (lib/shows/repository.ts), so a pick always has coordinates behind it and a
// typo can't quietly turn into an empty list.
export function CityPicker({ onPick, onClose }: {
  onPick: (city: NamedPlace) => void
  onClose: () => void
}) {
  const [query, setQuery]     = useState('')
  const [matches, setMatches] = useState<NamedPlace[]>([])
  const [settled, setSettled] = useState(false)

  const trimmed = query.trim()

  useEffect(() => {
    setSettled(false)
    if (trimmed.length < MIN_QUERY) { setMatches([]); return }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const res = await fetch(`/api/shows/cities?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal })
        const data = res.ok ? await res.json() : { cities: [] }
        setMatches(data.cities ?? [])
        setSettled(true)
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('city lookup failed:', err)
          setMatches([])
          setSettled(true)
        }
      }
    }, LOOKUP_DEBOUNCE_MS)

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [trimmed])

  return (
    <div className="pt-2.5">
      <div className={`${inputBox} flex items-center gap-2 px-3 py-2`}>
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && matches[0]) onPick(matches[0])
            if (e.key === 'Escape') onClose()
          }}
          placeholder="Type a city"
          aria-label="City"
          className={`${fieldInput} min-w-0 flex-1`}
        />
        <button type="button" onClick={onClose} aria-label="Close city search" className="flex-shrink-0 text-ink-muted">
          <X className="w-4 h-4" strokeWidth={2} />
        </button>
      </div>

      {matches.length > 0 && (
        <div className="mt-1.5 rounded-card border-1.5 border-ink bg-cream overflow-hidden">
          {matches.map((match, i) => (
            <button
              key={placeName(match)}
              type="button"
              onClick={() => onPick(match)}
              className={`w-full text-left px-3 py-2.5 text-sm font-semibold hover:bg-accent/5 ${
                i > 0 ? 'border-t border-ink/10' : ''
              }`}
            >
              {placeName(match)}
            </button>
          ))}
        </div>
      )}

      {settled && matches.length === 0 && (
        <p className="pt-1.5 text-[11px] leading-snug text-ink-faint">
          No shows in a city called &ldquo;{trimmed}&rdquo; yet. Try the nearest bigger city.
        </p>
      )}
    </div>
  )
}
