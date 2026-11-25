'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { Label, btnPrimary } from '@/components/ui'

// The Wrapped popup over the Feed (components/wrapped/WrappedFlow.tsx): shown
// once to each person while it's switched on in /admin.
export function WrappedPopup({ signedIn, onStart, onDismiss }: {
  signedIn:  boolean
  onStart:   () => void
  onDismiss: () => void
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onDismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onDismiss])

  return (
    <div className="fixed inset-0 z-[105] flex items-center justify-center px-5">
      <button type="button" aria-label="Close" onClick={onDismiss} className="absolute inset-0 bg-ink/55" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Your top artists, live"
        className="relative w-full max-w-sm rounded-card border-1.5 border-ink bg-cream shadow-riso-lg px-5 pt-5 pb-4 fade-up"
      >
        <button type="button" onClick={onDismiss} aria-label="Close" className="absolute top-3 right-3 p-1 text-ink-muted">
          <X className="w-5 h-5" strokeWidth={2} />
        </button>

        <ScreenshotPair />

        <Label tone="accent" className="mt-4">Wrapped is out</Label>
        <h2 className="mt-1 font-display text-[26px] font-bold tracking-tight leading-[1.05]">
          Your top artists, <span className="text-accent">live.</span>
        </h2>
        <p className="mt-2 text-[13px] leading-snug text-ink-muted">
          Add your Spotify Wrapped screenshots. We&apos;ll find who&apos;s playing near you, and the shows you might have been to.
        </p>

        <button type="button" onClick={onStart} className={`${btnPrimary} w-full mt-4 py-3.5 text-xs`}>
          Add my Wrapped
        </button>
        <button type="button" onClick={onDismiss} className="w-full mt-2 py-2 text-[13px] font-semibold text-ink-muted">
          No thanks
        </button>
        {!signedIn && (
          <p className="text-center text-[11px] text-ink-faint">No account needed to start</p>
        )}
      </div>
    </div>
  )
}

// Two tilted cards standing in for the two screenshots it asks for. Drawn,
// not Spotify's own artwork.
function ScreenshotPair() {
  return (
    <div className="flex justify-center pt-1" aria-hidden="true">
      <MiniCard label="Top artists" className="-rotate-6 translate-x-2 bg-accent" />
      <MiniCard label="Top songs" className="rotate-6 -translate-x-2 translate-y-1 bg-terra" />
    </div>
  )
}

function MiniCard({ label, className }: { label: string; className: string }) {
  return (
    <div className={`relative w-[62px] h-[104px] rounded-card border-1.5 border-ink shadow-riso overflow-hidden ${className}`}>
      <div className="halftone absolute inset-0 opacity-60" />
      <p className="relative px-1.5 pt-1.5 text-[7.5px] font-bold uppercase leading-tight tracking-label text-cream">{label}</p>
      <div className="absolute inset-x-1.5 bottom-2 space-y-1">
        {[80, 62, 72, 54].map(w => (
          <div key={w} className="h-[3px] rounded-full bg-cream/70" style={{ width: `${w}%` }} />
        ))}
      </div>
    </div>
  )
}
