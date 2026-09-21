'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { closestMatch, nameKey } from '@/lib/nameKey'
import { Field, fieldInput } from '@/components/ui'
import type { SuggestField as FieldName } from '@/lib/shows/repository'

const DEBOUNCE_MS = 300

// A typo won't substring-match the right spelling - "turnstyle" never finds
// "Turnstile" - so a query that comes back empty is retried on its first few
// characters, which usually still match. closestMatch then decides whether
// what came back is near enough to be worth offering.
const FUZZY_PREFIX = 4

const MAX_CHIPS = 5

// A text field that offers spellings already in the catalogue.
//
// The point is not autocomplete convenience, it's that the catalogue is
// shared. A venue typed as "fillmore sf" is a different venue from "The
// Fillmore" as far as every future search is concerned, and the person
// typing it has no way of knowing that. Showing them the existing spelling
// at the moment they type is the only cheap fix.
//
// It never blocks a new value. A room nobody has logged yet is exactly what
// the add-a-show form is for.
export function SuggestField({ field, label, hint, placeholder, value, onChange }: {
  field: FieldName
  label: string
  hint?: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
}) {
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Set when a suggestion is accepted, so the "did you mean" line doesn't
  // come straight back for the value the person just chose.
  const acceptedRef = useRef<string | null>(null)

  useEffect(() => {
    const trimmed = value.trim()
    if (trimmed.length < 2) { setSuggestions([]); return }

    const controller = new AbortController()
    const timeoutId = setTimeout(async () => {
      try {
        const ask = async (q: string) => {
          const res = await fetch(
            `/api/shows/suggest?field=${field}&q=${encodeURIComponent(q)}`,
            { signal: controller.signal },
          )
          if (!res.ok) return []
          return (await res.json()).suggestions as string[]
        }

        let found = await ask(trimmed)
        if (found.length === 0 && trimmed.length > FUZZY_PREFIX) {
          found = await ask(trimmed.slice(0, FUZZY_PREFIX))
        }
        setSuggestions(found)
      } catch (err) {
        // A failed lookup must not break the form - typing something brand
        // new is a legitimate outcome that needs no suggestions at all.
        if ((err as Error).name !== 'AbortError') setSuggestions([])
      }
    }, DEBOUNCE_MS)

    return () => { clearTimeout(timeoutId); controller.abort() }
  }, [field, value])

  const typed   = value.trim()
  // Exact only. "Fillmore" against a catalogue holding "The Fillmore" is
  // deliberately NOT known - that is precisely the case the prompt below
  // exists to correct.
  const isKnown = suggestions.some(name => nameKey(name) === nameKey(typed))

  const nearMiss = useMemo(() => {
    if (!typed || isKnown || acceptedRef.current === typed) return null
    return closestMatch(typed, suggestions)
  }, [suggestions, typed, isKnown])

  function accept(next: string) {
    acceptedRef.current = next
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <Field label={label} hint={hint}>
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={fieldInput}
        />
      </Field>

      {suggestions.length > 0 && !isKnown && (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.slice(0, MAX_CHIPS).map(name => (
            <button
              key={name}
              type="button"
              onClick={() => accept(name)}
              className="rounded-card border-1.5 border-ink/25 bg-cream px-2.5 py-1 text-[11px] text-ink-muted"
            >
              {name}
            </button>
          ))}
        </div>
      )}

      {nearMiss && (
        <p className="text-[11px] leading-snug text-ink-muted">
          Did you mean{' '}
          <button type="button" onClick={() => accept(nearMiss)} className="font-bold text-accent underline">
            {nearMiss}
          </button>
          ? Using the spelling already listed keeps your log with everyone else&apos;s.
        </p>
      )}

      {isKnown && typed && (
        <p className="text-[11px] text-ink-faint">Already in Gigl.</p>
      )}
    </div>
  )
}
