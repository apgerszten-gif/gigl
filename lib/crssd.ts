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

// ── Set times ────────────────────────────────────────────────────────────────
// From CRSSD's published Fall '26 timetable (one image per day, released Sep
// 20), transcribed because it only exists as pictures. San Diego time, 24h.
// Keyed by the part of the show id after idPrefix, which the import derives
// from the artist name. Kept here rather than on the `shows` rows so the
// weekend needs no schema change and lifts out with this file.

export type CrssdStage = 'Ocean View' | 'City Steps' | 'The Palms'

// Ocean View is the main stage; it breaks ties in the running order.
const STAGE_ORDER: CrssdStage[] = ['Ocean View', 'City Steps', 'The Palms']

interface SetTime { stage: CrssdStage; start: string; end: string }

const SET_TIMES: Record<string, SetTime> = {
  // Saturday - Ocean View
  'mochakk':           { stage: 'Ocean View', start: '21:45', end: '23:00' },
  'horsegiirl':        { stage: 'Ocean View', start: '20:00', end: '21:15' },
  'notion':            { stage: 'Ocean View', start: '18:30', end: '19:30' },
  'ayybo':             { stage: 'Ocean View', start: '17:00', end: '18:15' },
  'mind-enterprises':  { stage: 'Ocean View', start: '15:45', end: '16:30' },
  'ear':               { stage: 'Ocean View', start: '14:30', end: '15:15' },
  'beginagain':        { stage: 'Ocean View', start: '13:15', end: '14:00' },
  'pete-soul':         { stage: 'Ocean View', start: '12:30', end: '13:00' },
  // Saturday - City Steps
  'vtss':              { stage: 'City Steps', start: '21:45', end: '23:00' },
  'i-hate-models':     { stage: 'City Steps', start: '20:30', end: '21:45' },
  'marlon-hoffstadt':  { stage: 'City Steps', start: '19:00', end: '20:30' },
  'ben-ufo':           { stage: 'City Steps', start: '17:45', end: '19:00' },
  'mph':               { stage: 'City Steps', start: '16:30', end: '17:45' },
  'salute':            { stage: 'City Steps', start: '15:15', end: '16:30' },
  'ahadadream':        { stage: 'City Steps', start: '14:00', end: '15:15' },
  'adam-sellouk':      { stage: 'City Steps', start: '12:45', end: '14:00' },
  'bb-shaine':         { stage: 'City Steps', start: '12:00', end: '12:45' },
  // Saturday - The Palms
  'sonny-fodera':      { stage: 'The Palms',  start: '22:00', end: '23:00' },
  'layton-giordani':   { stage: 'The Palms',  start: '21:00', end: '22:00' },
  'chasewest':         { stage: 'The Palms',  start: '19:30', end: '21:00' },
  'rossi-b2b-carlita': { stage: 'The Palms',  start: '18:00', end: '19:30' },
  'locklead':          { stage: 'The Palms',  start: '17:00', end: '18:00' },
  'jamback':           { stage: 'The Palms',  start: '16:00', end: '17:00' },
  'dean-turnley':      { stage: 'The Palms',  start: '15:00', end: '16:00' },
  'rafael':            { stage: 'The Palms',  start: '14:00', end: '15:00' },
  'torren-foot':       { stage: 'The Palms',  start: '13:00', end: '14:00' },
  'heminguey':         { stage: 'The Palms',  start: '12:00', end: '13:00' },

  // Sunday - Ocean View
  'chris-lake-b2b-disclosure': { stage: 'Ocean View', start: '20:30', end: '22:00' },
  'big-wild':          { stage: 'Ocean View', start: '19:00', end: '20:00' },
  'drama':             { stage: 'Ocean View', start: '17:45', end: '18:30' },
  'oskar-med-k':       { stage: 'Ocean View', start: '16:45', end: '17:30' },
  'balu-brigada':      { stage: 'Ocean View', start: '15:30', end: '16:15' },
  'sebastien-tellier': { stage: 'Ocean View', start: '14:15', end: '15:00' },
  'roya':              { stage: 'Ocean View', start: '13:00', end: '13:45' },
  'saand':             { stage: 'Ocean View', start: '12:15', end: '12:45' },
  // Sunday - City Steps
  '999999999':         { stage: 'City Steps', start: '21:00', end: '22:00' },
  'boys-noize':        { stage: 'City Steps', start: '19:45', end: '21:00' },
  'helena-hauff':      { stage: 'City Steps', start: '18:30', end: '19:45' },
  'mathame':           { stage: 'City Steps', start: '17:15', end: '18:30' },
  'kas-st':            { stage: 'City Steps', start: '15:45', end: '17:15' },
  'arodes':            { stage: 'City Steps', start: '14:15', end: '15:45' },
  'son-of-son':        { stage: 'City Steps', start: '13:00', end: '14:15' },
  'rivka-m':           { stage: 'City Steps', start: '12:00', end: '13:00' },
  // Sunday - The Palms
  'kettama':           { stage: 'The Palms',  start: '20:45', end: '22:00' },
  'prospa':            { stage: 'The Palms',  start: '19:30', end: '20:45' },
  'groove-armada':     { stage: 'The Palms',  start: '18:30', end: '19:30' },
  'marco-strous':      { stage: 'The Palms',  start: '17:30', end: '18:30' },
  'genesi':            { stage: 'The Palms',  start: '16:30', end: '17:30' },
  'chris-lorenzo':     { stage: 'The Palms',  start: '15:30', end: '16:30' },
  'jay-de-lys':        { stage: 'The Palms',  start: '14:30', end: '15:30' },
  'sam-alfred':        { stage: 'The Palms',  start: '13:30', end: '14:30' },
  'greg-99':           { stage: 'The Palms',  start: '12:30', end: '13:30' },
  'punkybutter':       { stage: 'The Palms',  start: '12:00', end: '12:30' },
}

export function setTimeFor(showId: string): SetTime | null {
  return showId.startsWith(CRSSD.idPrefix) ? SET_TIMES[showId.slice(CRSSD.idPrefix.length)] ?? null : null
}

// '21:45' -> { clock: '9:45', meridiem: 'PM' }
function twelveHour(hhmm: string): { clock: string; meridiem: 'AM' | 'PM' } {
  const [h, m] = hhmm.split(':').map(Number)
  return { clock: `${h % 12 || 12}:${String(m).padStart(2, '0')}`, meridiem: h < 12 ? 'AM' : 'PM' }
}

// '9:45 – 11:00 PM', with the meridiem on both ends only when they differ.
export function formatSetTime(set: SetTime): string {
  const start = twelveHour(set.start)
  const end   = twelveHour(set.end)
  return start.meridiem === end.meridiem
    ? `${start.clock} – ${end.clock} ${end.meridiem}`
    : `${start.clock} ${start.meridiem} – ${end.clock} ${end.meridiem}`
}

// Running order, headliners first: the set that finishes last leads. Sets
// ending together put the longer one first - which is how the closing
// headliner outranks a shorter set on a side stage that also ends the night
// - then the main stage. A set missing from the timetable sinks to the
// bottom rather than guessing at a slot.
export function compareSets(aId: string, bId: string): number {
  const a = setTimeFor(aId)
  const b = setTimeFor(bId)
  if (!a || !b) return a ? -1 : b ? 1 : 0
  return b.end.localeCompare(a.end)
    || a.start.localeCompare(b.start)
    || STAGE_ORDER.indexOf(a.stage) - STAGE_ORDER.indexOf(b.stage)
}

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
