'use client'

import { useEffect, useMemo, useState } from 'react'
import { AudioLines, Disc3, Drum, Guitar, Headphones, MicVocal, Music2, Radio } from 'lucide-react'
import { Label } from '@/components/ui'

// What shows while a Wrapped screenshot is being read and matched, which takes
// ten seconds or more: a row of little icons dancing and a line that changes
// every couple of seconds. The first line is always the same, the rest come
// in a shuffled order each time, so a second try doesn't read the same.

const LINES = [
  'Checking your vibe',
  'Is this thing on?',
  'Damn… saucy',
  'Ok, edgelord',
  "Wow, you're tastemaxxing right now",
  'Certified crate digger',
  "It's time to start therapy, my friend",
  "Sir, this is a Wendy's",
]

const DANCERS = [Guitar, Headphones, Disc3, MicVocal, Drum, Music2, Radio, AudioLines]

const LINE_MS = 2400

function shuffled<T>(items: T[]): T[] {
  const copy = [...items]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

export function WrappedLoading() {
  // Shuffled after mount so the server's and the browser's first render match.
  const [order, setOrder] = useState<string[]>(LINES.slice(0, 1))
  const [step, setStep] = useState(0)
  const dancers = useMemo(() => shuffled(DANCERS).slice(0, 5), [])

  useEffect(() => {
    setOrder([LINES[0], ...shuffled(LINES.slice(1))])
    const tick = setInterval(() => setStep(s => s + 1), LINE_MS)
    return () => clearInterval(tick)
  }, [])

  const line = order[step % order.length]

  return (
    <div className="py-6 text-center" role="status" aria-live="polite">
      <div className="flex items-end justify-center gap-3.5 h-16" aria-hidden="true">
        {dancers.map((Icon, i) => (
          <span
            key={i}
            className="dance text-accent"
            style={{ animationDelay: `${i * 0.17}s`, animationDuration: `${0.95 + (i % 3) * 0.15}s` }}
          >
            <Icon className="w-8 h-8" strokeWidth={1.9} />
          </span>
        ))}
      </div>

      <p key={step} className="fade-up mt-4 min-h-[56px] font-display text-[22px] font-bold leading-tight tracking-tight">
        {line}<span className="text-accent">.</span>
      </p>

      <Label className="mt-2">Reading your Wrapped</Label>
    </div>
  )
}
