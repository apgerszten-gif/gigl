'use client'

import { useRef } from 'react'
import { Check, ImagePlus } from 'lucide-react'
import { Sheet } from '@/components/Sheet'
import { ErrorNote, btnPrimary } from '@/components/ui'
import type { PreparedImage } from '@/lib/wrapped/image'
import { WrappedLoading } from './WrappedLoading'

// Adding a screenshot: Spotify's Wrapped summary card (Top Artists and Top
// Songs side by side) is the best one, but a Spotify Top Artists or Top Songs
// card, or an Apple Music Replay Top Artists, Top Songs or Top Albums screen,
// reads too, even cropped or partial.

export function WrappedUpload({ image, another = false, reading, error, onPick, onRead, onClose }: {
  image:   PreparedImage | null
  // Adding to a list that's already made, rather than starting one.
  another?: boolean
  reading: boolean
  error:   string | null
  onPick:  (file: File) => void
  onRead:  () => void
  onClose: () => void
}) {
  const input = useRef<HTMLInputElement | null>(null)

  // Reading and matching take a while: dancing icons and changing lines.
  if (reading) {
    return (
      <Sheet title="Hang tight" onClose={onClose}>
        <WrappedLoading />
      </Sheet>
    )
  }

  return (
    <Sheet
      title={another ? 'Add another screenshot' : 'Add your Wrapped'}
      blurb={another
        ? "Got another one? Its artists get added to your list."
        : 'Screenshot your Spotify Wrapped or Apple Music Replay. Top artists, top songs or top albums all work.'}
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

        <p className="rounded-card border-1.5 border-dashed border-ink/25 px-3 py-2.5 text-[12px] leading-snug text-ink-muted">
          <span className="font-semibold text-ink">Best one:</span> Spotify&apos;s summary card near the end of your Wrapped, with
          your top 5 artists and top 5 songs side by side. Or any single Top Artists, Top Songs or Top Albums screen. It doesn&apos;t
          have to be perfect.
          <span className="mt-1.5 block font-semibold text-accent">Team Apple? Your Replay works too. We don&apos;t pick sides in the streaming wars.</span>
        </p>

        {image ? (
          <div>
            <div className="relative h-72 rounded-card border-1.5 border-ink shadow-riso overflow-hidden bg-paper">
              <img src={image.preview} alt="Your Wrapped screenshot" className="w-full h-full object-cover object-top" />
              <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-accent text-cream border-1.5 border-ink flex items-center justify-center">
                <Check className="w-4 h-4" strokeWidth={3} />
              </span>
            </div>
            <button type="button" onClick={() => input.current?.click()} className="w-full mt-2 text-[12px] text-ink-muted underline underline-offset-[3px]">
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
            Add your screenshot
            <span className="text-[11px] font-normal text-ink-muted">Spotify Wrapped or Apple Music Replay</span>
          </button>
        )}

        {error && <ErrorNote>{error}</ErrorNote>}

        <button
          type="button"
          onClick={image ? onRead : () => input.current?.click()}
          className={`${btnPrimary} w-full py-4 text-xs`}
        >
          {image ? 'Find my shows' : 'Choose a screenshot'}
        </button>

        <p className="text-center text-[11px] leading-snug text-ink-faint">
          The screenshot is read once to find the artists&apos; names, then deleted. Nobody else sees it.
        </p>
      </div>
    </Sheet>
  )
}
