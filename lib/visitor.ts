// Who is opening the site and where they came from, for the QR funnel:
// scanned (app/qr), opened (app/api/visits), signed up (the signup_source
// stored on each account). Nothing here identifies a person. The visitor id
// is a random value this browser makes up for itself, and the only other
// thing recorded is which door they came in by.

export const VISIT_SOURCES = ['qr', 'share', 'direct'] as const
export type VisitSource = typeof VISIT_SOURCES[number]

// Only the real site is counted. Local dev and preview deployments talk to
// the production database, and their traffic would pad the numbers.
const COUNTED_HOSTS = ['www.gigl.space', 'gigl.space', 'gigl-review.vercel.app']
export function isCountedHost(host: string | null): boolean {
  return !!host && COUNTED_HOSTS.includes(host)
}

const VISITOR_KEY = 'gigl_visitor'
const SOURCE_KEY  = 'gigl_first_source'
const OPENED_KEY  = 'gigl_visit_recorded'

// Storage can throw (private browsing, blocked site data), and none of this
// is worth breaking a page over.
function read(storage: () => Storage, key: string): string | null {
  try { return storage().getItem(key) } catch { return null }
}
function write(storage: () => Storage, key: string, value: string) {
  try { storage().setItem(key, value) } catch { /* not recorded, not fatal */ }
}
const local   = () => localStorage
const session = () => sessionStorage

function visitorId(): string {
  let id = read(local, VISITOR_KEY)
  if (!id) {
    id = crypto.randomUUID()
    write(local, VISITOR_KEY, id)
  }
  return id
}

// The ?src= the QR redirect adds, a friend's profile link, or neither.
function sourceOfThisVisit(): VisitSource {
  const src = new URLSearchParams(window.location.search).get('src')
  if (VISIT_SOURCES.includes(src as VisitSource)) return src as VisitSource
  if (window.location.pathname.startsWith('/u/')) return 'share'
  return 'direct'
}

// Once per tab: a reload or a tap between screens is the same visit.
export function recordVisit() {
  const source = sourceOfThisVisit()

  // Take ?src= back out of the address bar, so a link copied from here
  // doesn't make whoever receives it look like another scan. Every time,
  // not just on a visit that gets counted.
  const url = new URL(window.location.href)
  if (url.searchParams.has('src')) {
    url.searchParams.delete('src')
    window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
  }

  if (read(session, OPENED_KEY)) return
  write(session, OPENED_KEY, '1')

  // First door wins, so someone who scanned the code and later opens a
  // friend's link still signs up as a QR arrival.
  if (!read(local, SOURCE_KEY)) write(local, SOURCE_KEY, source)

  fetch('/api/visits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visitorId: visitorId(), source }),
    keepalive: true,
  }).catch(() => { /* a lost count is not worth an error */ })
}

// Stored on the account as user metadata at sign-up: auth.users is already
// an exact count of sign-ups, and this says which door each one came in by.
export function signupMetadata() {
  return {
    signup_source: read(local, SOURCE_KEY) ?? 'direct',
    visitor_id:    visitorId(),
  }
}
