import { CRSSD } from './crssd'
import { distanceInMiles, type Coords } from './geo'

// Which front door a visitor gets.
//
//   crssd  - a QR scan opens the CRSSD lineup under its banner, Log opens
//            the lineup too, and the feed wears the Gigl × CRSSD branding.
//   normal - a QR scan opens the feed, and Log opens show search, for any
//            show anywhere.
export type SiteMode = 'normal' | 'crssd'

// The /admin switch (app_settings.site_mode). 'auto' decides per visitor:
// CRSSD mode within CRSSD_RADIUS_MILES of the festival, normal beyond it.
// The other two apply to everyone. No row yet means auto.
export type SiteModeSetting = 'auto' | SiteMode

export const CRSSD_RADIUS_MILES = 50

export function parseSiteModeSetting(value: unknown): SiteModeSetting {
  return value === 'crssd' || value === 'normal' ? value : 'auto'
}

// Where a visitor is, as Vercel reads it from their IP address on every
// request - no permission prompt, and roughly city-level. On mobile data it
// can land on the carrier's regional hub instead, which is why /admin can
// override auto. Null outside Vercel (local dev) and when Vercel can't tell.
export function visitorCoords(headers: Headers): Coords | null {
  if (!headers.has('x-vercel-ip-latitude') || !headers.has('x-vercel-ip-longitude')) return null
  const lat = Number(headers.get('x-vercel-ip-latitude'))
  const lng = Number(headers.get('x-vercel-ip-longitude'))
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
}

// "San%20Diego" -> "San Diego", for showing on /admin.
export function visitorCity(headers: Headers): string | null {
  const city = headers.get('x-vercel-ip-city')
  if (!city) return null
  try { return decodeURIComponent(city) } catch { return city }
}

export function milesFromCrssd(coords: Coords | null): number | null {
  return coords ? distanceInMiles(coords, CRSSD.site) : null
}

// An unknown location gets normal mode: CRSSD mode is for people who are
// demonstrably nearby.
export function resolveSiteMode(setting: SiteModeSetting, coords: Coords | null): SiteMode {
  if (setting !== 'auto') return setting
  const miles = milesFromCrssd(coords)
  return miles !== null && miles <= CRSSD_RADIUS_MILES ? 'crssd' : 'normal'
}

// Where Log - the dock's, the feed card's, and a new account's first stop -
// goes in each mode.
export function logHref(mode: SiteMode): string {
  return mode === 'crssd' ? '/crssd' : '/select-festival'
}
