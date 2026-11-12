'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

// The bottom-sheet pattern from DESIGN.md (the sign-up sheet's look): a paper
// sheet over a bg-ink/55 scrim, a text-2xl display title with the accent full
// stop, a one-line reason, and a close button. Closes on the scrim and Escape.
export function Sheet({ title, blurb, onClose, children }: {
  // Rendered with the accent full stop, so pass it without one.
  title: string
  blurb?: React.ReactNode
  onClose: () => void
  children: React.ReactNode
}) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10)
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey) }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/55 transition-opacity duration-[280ms] ${shown ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-t-card border-1.5 border-b-0 border-ink bg-paper text-ink px-5 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] transition-transform duration-[280ms] ease-out ${
          shown ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-display text-2xl font-bold tracking-tight leading-tight break-words">
              {title}<span className="text-accent">.</span>
            </h2>
            {blurb && <p className="mt-1 text-[13px] leading-snug text-ink-muted">{blurb}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 p-1 text-ink-muted">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  )
}

// An on/off switch in the riso style, for the share sheets' options.
export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between gap-3 text-[13px] cursor-pointer">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-6 flex-shrink-0 rounded-full border-1.5 border-ink transition-colors ${checked ? 'bg-accent' : 'bg-cream-alt'}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-cream border border-ink transition-all ${checked ? 'left-[18px]' : 'left-0.5'}`} />
      </button>
    </label>
  )
}
