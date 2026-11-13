'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, Stars, Stat } from '@/components/ui'

// The stats card on a show's page of reviews (/artist/<id>): how many
// ratings, the average and the top one. The Performance / Venue breakdown
// behind the average stays folded away until someone taps the average.

interface Props {
  count:          number
  avgScore:       number
  topScore:       number
  avgPerformance: number
  avgVenue:       number
}

const NONE = <span className="text-accent">—</span>

export function ShowRatingsCard({ count, avgScore, topScore, avgPerformance, avgVenue }: Props) {
  const [open, setOpen] = useState(false)
  const rated = count > 0

  return (
    <div className="space-y-2">
      <Card className="flex py-3">
        <Stat value={count} label="Ratings" />
        <div className="flex-1 flex border-l border-ink/10">
          {rated ? (
            <button
              type="button"
              onClick={() => setOpen(o => !o)}
              aria-expanded={open}
              aria-controls="rating-breakdown"
              className="flex-1 flex"
            >
              <Stat
                value={<Stars score={avgScore} size={11} />}
                label="Avg rating"
                after={<ChevronDown className={`w-2.5 h-2.5 transition-transform ${open ? 'rotate-180' : ''}`} strokeWidth={2.5} aria-hidden />}
              />
            </button>
          ) : (
            <Stat value={NONE} label="Avg rating" />
          )}
        </div>
        <div className="flex-1 flex border-l border-ink/10">
          <Stat value={rated ? <Stars score={topScore} size={11} /> : NONE} label="Top rating" />
        </div>
      </Card>

      {open && (
        <Card flat className="px-4 py-3">
          <div id="rating-breakdown" className="space-y-2">
            {[
              { label: 'Performance', value: avgPerformance },
              { label: 'Venue',       value: avgVenue },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <span className="text-[13px] text-ink-muted">{row.label}</span>
                <Stars score={row.value} size={15} />
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
