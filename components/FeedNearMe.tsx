'use client'

import { MapPin } from 'lucide-react'
import { Chip } from '@/components/ui'
import { RADIUS_OPTIONS, type Nearby } from '@/lib/useNearby'

// The Near me row under the Feed's search box: the same chips as on the Log
// screen (/select-festival), sharing its answer through lib/useNearby.ts, so
// allowing location on the Feed means the Log screen never asks again, and
// turning Near me off in one turns it off in both.
//
// Location is asked for as the Feed opens, so this reports the filter rather
// than starting it. Tapping it back on is also the retry after a refusal.
export function FeedNearMe({ nearby }: { nearby: Nearby }) {
  const on = nearby.active

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed={on}
          disabled={nearby.status === 'locating'}
          onClick={() => (on ? nearby.disable() : nearby.enable())}
        >
          <Chip active={on}>
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" strokeWidth={2.5} />
              {nearby.status === 'locating' ? 'Locating…' : 'Near me'}
            </span>
          </Chip>
        </button>
        {on && RADIUS_OPTIONS.map(miles => (
          <button key={miles} type="button" aria-pressed={nearby.radiusMiles === miles} onClick={() => nearby.setRadius(miles)}>
            <Chip active={nearby.radiusMiles === miles}>{miles} mi</Chip>
          </button>
        ))}
      </div>

      {(nearby.status === 'denied' || nearby.status === 'unavailable') && (
        <p className="text-[11px] leading-snug text-ink-faint">
          {nearby.status === 'denied'
            ? 'Gigl can’t see your location, so this is everyone’s activity. Allow it in your browser’s site settings to see what’s near you.'
            : 'Couldn’t get your location. Check that location services are on, then tap Near me again.'}
        </p>
      )}
    </div>
  )
}
