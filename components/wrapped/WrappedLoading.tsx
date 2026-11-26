'use client'

import { useEffect, useState } from 'react'
import { Label } from '@/components/ui'

// What shows while a Wrapped screenshot is being read and matched, which takes
// ten seconds or more: stick figures dancing across a little stage and a line
// that changes every couple of seconds, in a fixed order.

// In the order they play, one after another, then round again.
const LINES = [
  'Quick vibe check',
  'Certified crate digger',
  'Is this thing on?',
  'Ok, edgelord',
  'Damn… saucy',
  'Tastemogger extraordinaire',
  "It's time to start therapy, my friend",
  "Sir, this is a Wendy's",
]

// A stick figure, drawn in a 40x60 box: head, torso, two arms hinged at the
// shoulders and two legs at the hips. The dance class (globals.css) says
// which limbs move.
type Dance = 'disco' | 'jacks' | 'twist'

function StickFigure({ dance }: { dance: Dance }) {
  return (
    <svg viewBox="0 0 40 60" className={`stick-${dance} w-10 h-[60px] overflow-visible`} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <g className="stick-body">
        <g className="stick-torso">
          <circle cx="20" cy="9" r="5.5" />
          <line x1="20" y1="15" x2="20" y2="34" />
          <g className="stick-limb stick-armL"><polyline points="20,18 11,26 6,20" /></g>
          <g className="stick-limb stick-armR"><polyline points="20,18 29,26 34,20" /></g>
        </g>
        <g className="stick-limb stick-legL"><polyline points="20,34 14,45 12,56" /></g>
        <g className="stick-limb stick-legR"><polyline points="20,34 26,45 28,56" /></g>
      </g>
    </svg>
  )
}

// Who's on stage: a dance, a colour, a direction, a speed, and where it
// starts (negative delays put each one partway across from the first frame).
const CAST: { dance: Dance; colour: string; toLeft: boolean; seconds: number; offset: number; at: string }[] = [
  { dance: 'disco', colour: 'text-accent',    toLeft: false, seconds: 9,  offset: -2, at: '10%' },
  { dance: 'jacks', colour: 'text-ink',       toLeft: true,  seconds: 11, offset: -6, at: '38%' },
  { dance: 'twist', colour: 'text-terra',     toLeft: false, seconds: 13, offset: -9, at: '62%' },
  { dance: 'disco', colour: 'text-ink-muted', toLeft: true,  seconds: 10, offset: -4, at: '84%' },
]

const LINE_MS = 2400

export function WrappedLoading() {
  const [step, setStep] = useState(0)

  useEffect(() => {
    const tick = setInterval(() => setStep(s => s + 1), LINE_MS)
    return () => clearInterval(tick)
  }, [])

  const line = LINES[step % LINES.length]

  return (
    <div className="py-6 text-center" role="status" aria-live="polite">
      <div className="relative h-[72px] overflow-hidden border-b-1.5 border-ink/25" aria-hidden="true">
        {CAST.map((f, i) => (
          <span
            key={i}
            className={`stick-figure absolute bottom-0 -ml-5 ${f.colour}`}
            style={{
              left: f.at,
              animation: `${f.toLeft ? 'stickTravelLeft' : 'stickTravelRight'} ${f.seconds}s linear ${f.offset}s infinite`,
            }}
          >
            {/* Walking left means facing left. */}
            <span className="block" style={f.toLeft ? { transform: 'scaleX(-1)' } : undefined}>
              <StickFigure dance={f.dance} />
            </span>
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
