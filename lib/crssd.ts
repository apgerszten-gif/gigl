// CRSSD Fest Fall '26 — the one lineup Gigl is being demoed at in person, so
// it gets a front door of its own rather than making people find 53 sets
// through the general search.
//
// Deliberately not a revival of lib/festivals.ts: these sets are ordinary
// rows in `shows` (imported by scripts/import-crssd.mjs), so logging one
// writes the same show id everybody else's logs use and lands in the same
// rankings. This file is only the handful of facts the CRSSD screens need,
// kept in one place so the weekend's work is easy to lift back out.

export const CRSSD = {
  // Matches the ids scripts/import-crssd.mjs writes.
  idPrefix: 'crssd-fall-2026-',
  name:     'CRSSD Fest',
  venue:    'CRSSD Festival',
  city:     'San Diego',
  state:    'CA',
  days: [
    { isoDate: '2026-09-26', label: 'Sat Sep 26' },
    { isoDate: '2026-09-27', label: 'Sun Sep 27' },
  ],
} as const

// Local date, not UTC. The lock below is "has this day started where you are
// standing", and the people using this are standing in Waterfront Park - a
// UTC day would flip it seven hours early every evening.
export function localIsoDate(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day   = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

// A set can be logged from the morning of the day it happens. Sunday's sets
// stay locked while you are still on the Saturday, the same way /log gates a
// festival day that hasn't occurred.
export function hasHappened(isoDate: string | null | undefined): boolean {
  return !!isoDate && isoDate <= localIsoDate()
}
