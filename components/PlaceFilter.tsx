'use client'

import { useState } from 'react'
import { Building2, MapPin, X } from 'lucide-react'
import { RADIUS_OPTIONS, type Nearby } from '@/lib/useNearby'
import type { useSearchCity } from '@/lib/useSearchCity'
import { CityPicker, placeName } from '@/components/CityPicker'
import { Chip } from '@/components/ui'

// Where to look for shows: a Near me chip, a Search city chip, and while
// either is on, the radius chips. Shared by the Log screen and the Upcoming
// tab. The caller owns the two hooks, since it also reads them to build its
// search.
//
// Location is requested on arrival (lib/useNearby.ts), so the Near me chip
// reports the filter rather than starting it. Turning it off is remembered
// and stops the asking; tapping it back on is also the retry after a
// refusal. A typed city is the way to search by place without sharing a
// location, and wins while set.
export function PlaceFilter({ nearby, searchCity }: {
  nearby:     Nearby
  searchCity: ReturnType<typeof useSearchCity>
}) {
  const [pickingCity, setPickingCity] = useState(false)
  const nearMeOn = nearby.active && !searchCity.city
  const centre = searchCity.city ?? (nearby.active ? nearby.coords : null)

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          aria-pressed={nearMeOn}
          disabled={nearby.status === 'locating'}
          onClick={() => {
            if (nearMeOn) { nearby.disable(); return }
            searchCity.clear()
            setPickingCity(false)
            if (!nearby.active) nearby.enable()
          }}
        >
          <Chip active={nearMeOn} tone="place">
            <span className="inline-flex items-center gap-1">
              <MapPin className="w-3 h-3" strokeWidth={2.5} />
              {nearby.status === 'locating' ? 'Locating…' : 'Near me'}
            </span>
          </Chip>
        </button>

        {/* Picking a city also turns Near me off, which is remembered, so
            someone who chose this over sharing a location isn't asked
            again next time. */}
        <button
          type="button"
          aria-pressed={searchCity.city != null}
          onClick={() => {
            if (searchCity.city) searchCity.clear()
            else setPickingCity(open => !open)
          }}
        >
          <Chip active={searchCity.city != null} tone="place">
            <span className="inline-flex items-center gap-1">
              <Building2 className="w-3 h-3" strokeWidth={2.5} />
              {searchCity.city ? placeName(searchCity.city) : 'Search city'}
              {searchCity.city && <X className="w-3 h-3" strokeWidth={2.5} />}
            </span>
          </Chip>
        </button>

        {centre && RADIUS_OPTIONS.map(miles => (
          <button
            key={miles}
            type="button"
            aria-pressed={nearby.radiusMiles === miles}
            onClick={() => nearby.setRadius(miles)}
          >
            <Chip active={nearby.radiusMiles === miles} tone="place">{miles} mi</Chip>
          </button>
        ))}
      </div>

      {pickingCity && !searchCity.city && (
        <CityPicker
          onPick={city => {
            searchCity.choose(city)
            setPickingCity(false)
            nearby.disable()
          }}
          onClose={() => setPickingCity(false)}
        />
      )}

      {!searchCity.city && !pickingCity && (nearby.status === 'denied' || nearby.status === 'unavailable') && (
        <p className="pt-1.5 text-[11px] leading-snug text-ink-faint">
          {nearby.status === 'denied'
            ? 'Gigl can’t see your location. Allow it in your browser’s site settings, or pick a city.'
            : 'Couldn’t get your location. Check that location services are on, then tap Near me again, or pick a city.'}
        </p>
      )}
    </>
  )
}
