'use client'

import { useRef } from 'react'
import { Check, ImagePlus, Loader2 } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import { ErrorNote, Label, btnPrimary } from '@/components/ui'
import type { PreparedImage } from '@/lib/wrapped/image'
import type { WrappedCard } from '@/lib/wrapped/types'

// Adding the screenshots: a slot for each of the two Wrapped cards. Either
// one is enough to go on, but the sheet leans on both, since Top songs
// usually turns up a few more artists: with one in, the big button asks for
// the other and only a plain link skips it.

const SLOTS: { card: WrappedCard; title: string; hint: string; skipLabel: string }[] = [
  { card: 'artists', title: 'Top artists', hint: 'Your five most-played artists', skipLabel: 'Skip, use Top artists only' },
  { card: 'songs',   title: 'Top songs',   hint: 'Usually adds 3 or 4 more artists', skipLabel: 'Skip, use Top songs only' },
]

export function WrappedUpload({ images, reading, error, onPick, onRead, onClose }: {
  images:  Partial<Record<WrappedCard, PreparedImage>>
  reading: boolean
  error:   string | null
  onPick:  (card: WrappedCard, file: File) => void
  onRead:  () => void
  onClose: () => void
}) {
  const inputs = useRef<Partial<Record<WrappedCard, HTMLInputElement | null>>>({})
  const added = SLOTS.filter(s => images[s.card]).length
  const missing = SLOTS.find(s => !images[s.card])
  const only = added === 1 ? SLOTS.find(s => images[s.card]) : null

  function pick(card: WrappedCard) {
    inputs.current[card]?.click()
  }

  return (
    <Sheet
      title="Add your Wrapped"
      blurb={`Screenshot both cards in your ${new Date().getFullYear()} Wrapped. Two finds you more shows than one.`}
      onClose={onClose}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full border-1.5 border-ink bg-cream overflow-hidden">
            <div className="h-full bg-accent transition-all" style={{ width: `${added * 50}%` }} />
          </div>
          <p className="text-[12px] text-ink-muted"><span className="font-semibold text-ink">{added} of 2</span> added</p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {SLOTS.map((slot, i) => {
            const image = images[slot.card]
            const isNext = !image && added === 1
            return (
              <div key={slot.card} className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-[15px] font-bold text-accent">{i + 1}</span>
                  <Label tone="ink">{slot.title}</Label>
                </div>
                <p className="mt-0.5 min-h-[30px] text-[11px] leading-snug text-ink-faint">{slot.hint}</p>
                <input
                  ref={el => { inputs.current[slot.card] = el }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const file = e.target.files?.[0]
                    if (file) onPick(slot.card, file)
                    e.target.value = ''
                  }}
                />
                {image ? (
                  <>
                    <div className="relative mt-1.5 h-40 rounded-card border-1.5 border-ink shadow-riso overflow-hidden bg-paper">
                      <img src={image.preview} alt={`Your ${slot.title} screenshot`} className="w-full h-full object-cover object-top" />
                      <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-accent text-cream border-1.5 border-ink flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" strokeWidth={3} />
                      </span>
                    </div>
                    <button type="button" onClick={() => pick(slot.card)} disabled={reading} className="w-full mt-1.5 text-[11px] text-ink-muted underline underline-offset-[3px]">
                      Replace
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => pick(slot.card)}
                    disabled={reading}
                    className={`relative mt-1.5 w-full h-40 rounded-card border-1.5 border-dashed flex flex-col items-center justify-center gap-2 px-2 text-[12px] font-semibold ${
                      isNext ? 'border-accent bg-accent/5 text-ink' : 'border-ink/30 bg-cream text-ink-muted'
                    }`}
                  >
                    {isNext && (
                      <span className="absolute -top-2 left-1/2 -translate-x-1/2 -rotate-2 rounded bg-accent px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-label text-cream border-1.5 border-ink">
                        Next
                      </span>
                    )}
                    <ImagePlus className="w-6 h-6 text-accent" strokeWidth={1.75} />
                    Add your {slot.title} screenshot
                  </button>
                )}
              </div>
            )
          })}
        </div>

        {error && <ErrorNote>{error}</ErrorNote>}

        {reading ? (
          <button type="button" disabled className={`${btnPrimary} w-full py-4 text-xs`}>
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
            Reading your Wrapped…
          </button>
        ) : added === 2 ? (
          <button type="button" onClick={onRead} className={`${btnPrimary} w-full py-4 text-xs`}>Find my shows</button>
        ) : (
          <>
            <button type="button" onClick={() => missing && pick(missing.card)} className={`${btnPrimary} w-full py-4 text-xs`}>
              Add {missing?.title}
            </button>
            {only && (
              <button type="button" onClick={onRead} className="w-full text-center text-[12px] text-ink-muted underline underline-offset-[3px]">
                {only.skipLabel}
              </button>
            )}
          </>
        )}

        <p className="text-center text-[11px] leading-snug text-ink-faint">
          Each screenshot is read once to find the artists&apos; names, then deleted. Nobody else sees it.
        </p>
      </div>
    </Sheet>
  )
}
