// What a venue sync run reports, for /admin and /admin/venues. Types only,
// so client pages can import them without pulling in anything server-side.

export type VenueSyncMode = 'dry' | 'live'

// ok          events were found (some may still have been filtered out)
// no-events   the site answered but nothing on it could be read as an event,
//             usually a calendar drawn in the browser by a ticketing widget
// blocked     the site refused the request (401/403/429)
// robots      robots.txt asks bots to stay off that page
// error       unreachable, timed out, 404, or a server error
// not-reached the run hit its time limit before getting to this venue
export type VenueStatus = 'ok' | 'no-events' | 'blocked' | 'robots' | 'error' | 'not-reached'

export type VenueMethod = 'jsonld' | 'wordpress' | 'squarespace' | 'ical'

export interface VenueResult {
  id:     string
  name:   string
  city:   string
  state:  string
  metro:  string   // the group city, "Los Angeles, CA"
  url:    string
  status: VenueStatus
  method: VenueMethod | null
  // The page the events were actually read from, when it wasn't `url`.
  pageUrl: string | null
  found:  number   // events read off the site, of any kind
  kept:   number   // shows that became rows (or would have, in a dry run)
  past:   number   // of kept, ones that already happened
  onCatalogue: number // dropped because Ticketmaster or a user already has the show
  skipped: number  // not music, cancelled, outside the date window, or no usable name
  // A few kept shows, "Artist · YYYY-MM-DD", for checking the parsing by eye.
  sample: string[]
  error:  string | null
}

export interface VenueSyncTotals {
  venues:      number
  ok:          number
  noEvents:    number
  failed:      number   // blocked + robots + error
  notReached:  number
  shows:       number   // kept, across all venues
  past:        number
  onCatalogue: number
  written:     number   // 0 in a dry run
}

export interface VenueSyncReport {
  ranAt:       string
  mode:        VenueSyncMode
  durationMs:  number
  deadlineHit: boolean
  totals:      VenueSyncTotals
  venues:      VenueResult[]
}

// What the admin dashboard polls: the switch and the last run's totals,
// without the per-venue list (/api/admin/venues serves that).
export interface VenueSyncSummary {
  mode:   VenueSyncMode
  lastRun: Omit<VenueSyncReport, 'venues'> | null
}
