'use client'

import { useRef } from 'react'
import { Check, ImagePlus, Loader2 } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import { ErrorNote, btnPrimary } from '@/components/ui'
import type { PreparedImage } from '@/lib/wrapped/image'

// Adding the screenshot: one picture of the Wrapped summary card, which has
// Top Artists and Top Songs side by side. The artists come from both columns.

export function WrappedUpload({ image, reading, error, onPick, onRead, onClose }: {
  image:   PreparedImage | null
  reading: boolean
  error:   string | null
  onPick:  (file: File) => void
  onRead:  () => void
  onClose: () => void
}) {
  const input = useRef<HTMLInputElement | null>(null)

  return (
    <Sheet
      title="Add your Wrapped"
      blurb="Screenshot the card in your Wrapped that lists your Top Artists and Top Songs side by side."
      onClose={onClose}
    >
      <div className="space-y-4">
        <input
          ref={input}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) onPick(file)
            e.target.value = ''
          }}
        />

        {image ? (
          <div>
            <div className="relative h-72 rounded-card border-1.5 border-ink shadow-riso overflow-hidden bg-paper">
              <img src={image.preview} alt="Your Wrapped screenshot" className="w-full h-full object-cover object-top" />
              <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-accent text-cream border-1.5 border-ink flex items-center justify-center">
                <Check className="w-4 h-4" strokeWidth={3} />
              </span>
            </div>
            <button type="button" onClick={() => input.current?.click()} disabled={reading} className="w-full mt-2 text-[12px] text-ink-muted underline underline-offset-[3px]">
              Use a different screenshot
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="w-full h-56 rounded-card border-1.5 border-dashed border-accent bg-accent/5 flex flex-col items-center justify-center gap-2 px-6 text-center text-[13px] font-semibold"
          >
            <ImagePlus className="w-7 h-7 text-accent" strokeWidth={1.75} />
            Add your Wrapped screenshot
            <span className="text-[11px] font-normal text-ink-muted">The card with Top Artists on the left and Top Songs on the right</span>
          </button>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        {reading ? (
          <button type="button" disabled className={`${btnPrimary} w-full py-4 text-xs`}>
            <Loader2 className="w-4 h-4 animate-spin" strokeWidth={2.5} />
            Reading your Wrapped…
          </button>
        ) : (
          <button
            type="button"
            onClick={image ? onRead : () => input.current?.click()}
            className={`${btnPrimary} w-full py-4 text-xs`}
          >
            {image ? 'Find my shows' : 'Choose a screenshot'}
          </button>
        )}

        <p className="text-center text-[11px] leading-snug text-ink-faint">
          The screenshot is read once to find the artists&apos; names, then deleted. Nobody else sees it.
        </p>
      </div>
    </Sheet>
  )
}
