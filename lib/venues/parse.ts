// Pure parsing for the venue-website sync (app/api/cron/sync-venues): turns
// what a venue's own site publishes into dated events, then events into
// "headliner + support" bills. Nothing here touches the network or the
// database, so every rule can be read - and tested - against a string.
//
// Four formats are understood, because they are the ones venue sites
// actually publish in a machine-readable way:
//
//   - schema.org Event JSON-LD, which sites add so Google can show their
//     events. The most common by far, and the only one that is a standard
//     rather than a product.
//   - The Events Calendar's REST API, on WordPress sites that use that
//     plugin. Answers date-range queries, including the past - the one
//     source of genuine history here.
//   - Squarespace event collections (?format=json), which also carry past
//     events.
//   - iCalendar (.ics) feeds a page links to.
//
// What none of them reach: calendars rendered in the browser by a ticketing
// widget (DICE, See Tickets, Eventbrite embeds). The HTML a plain fetch sees
// has no events in it at all, and the sync reports those venues as having
// none rather than guessing.

import { nameKey } from '../nameKey'

export interface VenueEvent {
  title:        string
  isoDate:      string           // venue-local YYYY-MM-DD
  performers:   string[]         // structured billing, in order; often empty
  locationName: string | null
  city:         string | null
  state:        string | null    // two-letter code when it could be read
  lat:          number | null
  lng:          number | null
  imageUrl:     string | null
  types:        string[]         // schema.org @type values; [] when the format has none
  categories:   string[]         // plugin categories and tags, lower-cased
  cancelled:    boolean
}

// ── Text ─────────────────────────────────────────────────────────────────────

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ',
  ndash: '–', mdash: '—', lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', hellip: '…',
}

export function decodeEntities(text: string): string {
  return text
    .replace(/&#(\d+);/g, (_, code) => safeCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => safeCodePoint(parseInt(code, 16)))
    .replace(/&([a-z]+);/gi, (match, name) => NAMED_ENTITIES[name.toLowerCase()] ?? match)
}

function safeCodePoint(code: number): string {
  try { return String.fromCodePoint(code) } catch { return '' }
}

// Tags inside a title ("<b>SOLD OUT</b>") and runs of whitespace.
function cleanText(value: unknown): string {
  if (typeof value !== 'string') return ''
  return decodeEntities(value.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()
}

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return []
  return Array.isArray(value) ? value : [value]
}

function toNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : NaN
  return Number.isFinite(n) ? n : null
}

// A coordinate pair is only kept when it lands inside the continental US
// bounding box, Alaska and Hawaii aside. A swapped lat/lng, a 0,0 default or
// a venue's site pointing at the wrong continent would otherwise drop the
// show into somebody else's "near me".
export function plausibleUsCoords(lat: number | null, lng: number | null): boolean {
  return lat != null && lng != null && lat > 18 && lat < 72 && lng > -170 && lng < -65
}

const STATE_CODES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA', colorado: 'CO',
  connecticut: 'CT', delaware: 'DE', 'district of columbia': 'DC', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA', kansas: 'KS', kentucky: 'KY',
  louisiana: 'LA', maine: 'ME', maryland: 'MD', massachusetts: 'MA', michigan: 'MI', minnesota: 'MN',
  mississippi: 'MS', missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV', 'new hampshire': 'NH',
  'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND',
  ohio: 'OH', oklahoma: 'OK', oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI',
  'south carolina': 'SC', 'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
}

export function stateCode(value: unknown): string | null {
  const text = cleanText(value)
  if (!text) return null
  if (/^[A-Za-z]{2}$/.test(text)) return text.toUpperCase()
  return STATE_CODES[text.toLowerCase().replace(/\./g, '')] ?? null
}

// ── Dates ────────────────────────────────────────────────────────────────────

function dayInZone(date: Date, tz: string): string | null {
  if (isNaN(date.getTime())) return null
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

// The calendar date a show happens on, where it happens.
//
// A date-only value, or a date-time written with the venue's own offset, is
// taken as written: its first ten characters already are the local date.
// Only a value in UTC is converted - a 9pm Pacific show stored as
// "...T04:00:00Z" belongs to the day before the one it names. Epoch
// milliseconds (Squarespace) are converted the same way.
export function localIsoDate(raw: unknown, tz: string): string | null {
  if (typeof raw === 'number') return dayInZone(new Date(raw), tz)
  if (typeof raw !== 'string') return null
  const text = raw.trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text

  const isoish = text.match(/^(\d{4}-\d{2}-\d{2})[T ](\d{2}):(\d{2})/)
  if (isoish) {
    if (/(?:Z|[+-]00:?00)$/i.test(text)) return dayInZone(new Date(text.replace(' ', 'T')), tz)
    return isoish[1]
  }

  // Anything else ("November 3, 2026 8:00 pm"): Date.parse reads a value with
  // no zone as UTC on the server, so formatting it in UTC returns the wall
  // date exactly as written.
  const parsed = Date.parse(text)
  return isNaN(parsed) ? null : dayInZone(new Date(parsed), 'UTC')
}

// ── JSON-LD ──────────────────────────────────────────────────────────────────

const LD_SCRIPT = /<script\b[^>]*type\s*=\s*["']?application\/ld\+json["']?[^>]*>([\s\S]*?)<\/script>/gi

function parseJsonLoosely(text: string): unknown {
  const body = text.replace(/^\s*<!--/, '').replace(/-->\s*$/, '').replace(/^\s*\/\/\s*<!\[CDATA\[/, '').replace(/\/\/\s*\]\]>\s*$/, '').trim()
  try {
    return JSON.parse(body)
  } catch {
    // The two ways hand-built JSON-LD usually breaks: a raw line break inside
    // a description, and a trailing comma after the last property.
    try {
      return JSON.parse(body.replace(/[\u0000-\u001F]+/g, ' ').replace(/,\s*([}\]])/g, '$1'))
    } catch {
      return null
    }
  }
}

// "http://schema.org/MusicEvent", "schema:MusicEvent" -> "MusicEvent"
function typesOf(node: Record<string, unknown>): string[] {
  return asArray(node['@type'] as string | string[] | undefined)
    .filter((t): t is string => typeof t === 'string')
    .map(t => t.split(/[/:#]/).pop() ?? t)
}

function isEventType(type: string): boolean {
  return type === 'Event' || type === 'Festival' || /Event$/.test(type)
}

// Events sit at the top level, in an array, inside @graph, in an ItemList,
// or as sub-events of a festival. The walk goes a few levels deep and no
// further, so a page's whole knowledge graph can't send it in circles.
const NESTED_KEYS = ['@graph', 'itemListElement', 'item', 'subEvent', 'subEvents', 'event', 'events', 'mainEntity']

function collectEventNodes(node: unknown, out: Record<string, unknown>[], depth = 0): void {
  if (depth > 6 || node == null) return
  if (Array.isArray(node)) {
    node.forEach(child => collectEventNodes(child, out, depth + 1))
    return
  }
  if (typeof node !== 'object') return
  const record = node as Record<string, unknown>
  if (typesOf(record).some(isEventType)) out.push(record)
  for (const key of NESTED_KEYS) {
    if (key in record) collectEventNodes(record[key], out, depth + 1)
  }
}

function nameOf(value: unknown): string {
  if (typeof value === 'string') return cleanText(value)
  if (value && typeof value === 'object') return cleanText((value as Record<string, unknown>).name)
  return ''
}

function imageOf(value: unknown): string | null {
  for (const item of asArray(value as unknown)) {
    const url = typeof item === 'string' ? item : item && typeof item === 'object' ? (item as Record<string, unknown>).url : null
    if (typeof url === 'string' && /^https?:\/\//.test(url)) return url
  }
  return null
}

function eventFromJsonLd(node: Record<string, unknown>, tz: string): VenueEvent | null {
  const isoDate = localIsoDate(node.startDate, tz)
  const title = nameOf(node.name)
  if (!isoDate || !title) return null

  const status = String(node.eventStatus ?? '')
  const locations = asArray(node.location as unknown)
  const isVirtual = (l: unknown) => !!l && typeof l === 'object' && typesOf(l as Record<string, unknown>).some(t => /Virtual/.test(t))
  // Online-only events have nowhere anybody could have been.
  if (/MovedOnline/i.test(status) || (locations.length > 0 && locations.every(isVirtual))) return null

  const place = locations.find(
    (l): l is Record<string, unknown> => !!l && typeof l === 'object' && !isVirtual(l),
  )
  const address = place && typeof place.address === 'object' && place.address ? place.address as Record<string, unknown> : null
  const geo = place && typeof place.geo === 'object' && place.geo ? place.geo as Record<string, unknown> : null
  const lat = toNumber(geo?.latitude)
  const lng = toNumber(geo?.longitude)

  return {
    title,
    isoDate,
    performers:   asArray((node.performer ?? node.performers) as unknown).map(nameOf).filter(Boolean),
    locationName: place ? nameOf(place.name) || null : typeof node.location === 'string' ? cleanText(node.location) || null : null,
    city:         address ? cleanText(address.addressLocality) || null : null,
    state:        address ? stateCode(address.addressRegion) : null,
    lat:          plausibleUsCoords(lat, lng) ? lat : null,
    lng:          plausibleUsCoords(lat, lng) ? lng : null,
    imageUrl:     imageOf(node.image),
    types:        typesOf(node),
    categories:   [],
    cancelled:    /Cancelled|Postponed/i.test(status),
  }
}

export function extractJsonLdEvents(html: string, tz: string): VenueEvent[] {
  const nodes: Record<string, unknown>[] = []
  let match: RegExpExecArray | null
  LD_SCRIPT.lastIndex = 0
  while ((match = LD_SCRIPT.exec(html)) !== null) {
    collectEventNodes(parseJsonLoosely(match[1]), nodes)
  }
  return nodes.map(node => eventFromJsonLd(node, tz)).filter((e): e is VenueEvent => e !== null)
}

// ── The Events Calendar (WordPress) ──────────────────────────────────────────

export function detectEventsCalendarApi(html: string, pageUrl: string): string | null {
  const linked = html.match(/["'](https?:\/\/[^"']+\/wp-json\/tribe\/events\/v1\/?)["']/i)
  if (linked) return linked[1].replace(/\/?$/, '/')
  // The plugin's markup without the discovery link: try the default path.
  if (/tribe-events|tribe_events|the-events-calendar/i.test(html) && /wp-content|wp-json/i.test(html)) {
    return `${new URL(pageUrl).origin}/wp-json/tribe/events/v1/`
  }
  return null
}

interface TribeEvent {
  title?: string
  start_date?: string
  utc_start_date?: string
  venue?: { venue?: string; city?: string; state?: string; province?: string; stateprovince?: string; geo_lat?: number | string; geo_lng?: number | string } | unknown[]
  image?: { url?: string } | false
  categories?: { name?: string }[]
  tags?: { name?: string }[]
}

export function eventsFromTribe(payload: unknown): VenueEvent[] {
  const events = (payload && typeof payload === 'object' ? (payload as { events?: TribeEvent[] }).events : null) ?? []
  const out: VenueEvent[] = []
  for (const e of events) {
    // start_date is in the site's own zone already: "2026-11-03 20:00:00".
    const isoDate = typeof e.start_date === 'string' ? e.start_date.slice(0, 10) : null
    const title = cleanText(e.title)
    if (!isoDate || !/^\d{4}-\d{2}-\d{2}$/.test(isoDate) || !title) continue
    const venue = e.venue && !Array.isArray(e.venue) ? e.venue : null
    const lat = toNumber(venue?.geo_lat)
    const lng = toNumber(venue?.geo_lng)
    out.push({
      title,
      isoDate,
      performers:   [],
      locationName: cleanText(venue?.venue) || null,
      city:         cleanText(venue?.city) || null,
      state:        stateCode(venue?.state ?? venue?.stateprovince ?? venue?.province),
      lat:          plausibleUsCoords(lat, lng) ? lat : null,
      lng:          plausibleUsCoords(lat, lng) ? lng : null,
      imageUrl:     e.image && typeof e.image === 'object' && typeof e.image.url === 'string' ? e.image.url : null,
      types:        [],
      categories:   [...(e.categories ?? []), ...(e.tags ?? [])].map(c => cleanText(c?.name).toLowerCase()).filter(Boolean),
      cancelled:    /\b(cancel+ed|postponed)\b/i.test(title),
    })
  }
  return out
}

// ── Squarespace ──────────────────────────────────────────────────────────────

export function looksLikeSquarespace(html: string): boolean {
  return /static1\.squarespace\.com|Static\.SQUARESPACE_CONTEXT/i.test(html)
}

interface SquarespaceItem {
  title?: string
  startDate?: number
  assetUrl?: string
  location?: { addressTitle?: string; addressLine2?: string; mapLat?: number; mapLng?: number; markerLat?: number; markerLng?: number }
  tags?: string[]
  categories?: string[]
}

// An events collection answers ?format=json with `upcoming` and `past`. Any
// other kind of page answers without them, which is how this tells.
export function eventsFromSquarespace(payload: unknown, tz: string): VenueEvent[] | null {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as { upcoming?: SquarespaceItem[]; past?: SquarespaceItem[] }
  if (!Array.isArray(p.upcoming) && !Array.isArray(p.past)) return null

  const out: VenueEvent[] = []
  for (const item of [...(p.upcoming ?? []), ...(p.past ?? [])]) {
    const isoDate = localIsoDate(item.startDate, tz)
    const title = cleanText(item.title)
    if (!isoDate || !title) continue
    // "Brooklyn, NY, 11211"
    const [city, state] = (item.location?.addressLine2 ?? '').split(',').map(s => s.trim())
    const lat = toNumber(item.location?.markerLat ?? item.location?.mapLat)
    const lng = toNumber(item.location?.markerLng ?? item.location?.mapLng)
    out.push({
      title,
      isoDate,
      performers:   [],
      locationName: cleanText(item.location?.addressTitle) || null,
      city:         city || null,
      state:        stateCode(state),
      lat:          plausibleUsCoords(lat, lng) ? lat : null,
      lng:          plausibleUsCoords(lat, lng) ? lng : null,
      imageUrl:     typeof item.assetUrl === 'string' && /^https?:\/\//.test(item.assetUrl) ? item.assetUrl : null,
      types:        [],
      categories:   [...(item.tags ?? []), ...(item.categories ?? [])].map(c => cleanText(c).toLowerCase()).filter(Boolean),
      cancelled:    /\b(cancel+ed|postponed)\b/i.test(title),
    })
  }
  return out
}

// ── iCalendar ────────────────────────────────────────────────────────────────

export function findIcsLink(html: string, pageUrl: string): string | null {
  const candidates = [
    html.match(/<link\b[^>]*type\s*=\s*["']text\/calendar["'][^>]*href\s*=\s*["']([^"']+)["']/i)?.[1],
    html.match(/<link\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*type\s*=\s*["']text\/calendar["']/i)?.[1],
    html.match(/href\s*=\s*["']((?:webcal|https?):\/\/[^"']+\.ics(?:\?[^"']*)?)["']/i)?.[1],
    html.match(/href\s*=\s*["']([^"']*[?&]ical=1[^"']*)["']/i)?.[1],
  ]
  for (const raw of candidates) {
    if (!raw) continue
    try {
      return new URL(decodeEntities(raw).replace(/^webcal:/i, 'https:'), pageUrl).toString()
    } catch {
      // keep looking
    }
  }
  return null
}

function unescapeIcs(text: string): string {
  return text.replace(/\\n/gi, ' ').replace(/\\([,;\\])/g, '$1').trim()
}

export function eventsFromIcs(text: string, tz: string): VenueEvent[] {
  // Long lines are folded onto the next with a leading space or tab.
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
  const out: VenueEvent[] = []
  let current: Record<string, { params: string; value: string }> | null = null

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { current = {}; continue }
    if (line === 'END:VEVENT') {
      if (current) {
        const event = eventFromIcsFields(current, tz)
        if (event) out.push(event)
      }
      current = null
      continue
    }
    if (!current) continue
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const head = line.slice(0, colon)
    const semi = head.indexOf(';')
    const name = (semi < 0 ? head : head.slice(0, semi)).toUpperCase()
    current[name] = { params: semi < 0 ? '' : head.slice(semi + 1), value: line.slice(colon + 1) }
  }
  return out
}

function eventFromIcsFields(f: Record<string, { params: string; value: string }>, tz: string): VenueEvent | null {
  const start = f.DTSTART?.value ?? ''
  const m = start.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/)
  if (!m) return null
  const isoDate = m[7]
    ? dayInZone(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6])), tz)
    : `${m[1]}-${m[2]}-${m[3]}`
  const title = cleanText(unescapeIcs(f.SUMMARY?.value ?? ''))
  if (!isoDate || !title) return null

  const [geoLat, geoLng] = (f.GEO?.value ?? '').split(';').map(toNumber)
  const location = unescapeIcs(f.LOCATION?.value ?? '')
  return {
    title,
    isoDate,
    performers:   [],
    // LOCATION is usually "Venue Name, 123 Street, City, ST 00000".
    locationName: location.split(',')[0]?.trim() || null,
    city:         null,
    state:        null,
    lat:          plausibleUsCoords(geoLat ?? null, geoLng ?? null) ? geoLat ?? null : null,
    lng:          plausibleUsCoords(geoLat ?? null, geoLng ?? null) ? geoLng ?? null : null,
    imageUrl:     null,
    types:        [],
    categories:   unescapeIcs(f.CATEGORIES?.value ?? '').toLowerCase().split(',').map(s => s.trim()).filter(Boolean),
    cancelled:    /CANCELLED/i.test(f.STATUS?.value ?? '') || /\b(cancel+ed|postponed)\b/i.test(title),
  }
}

// ── Finding the calendar ─────────────────────────────────────────────────────

// Same-site links that look like the page listing shows, best first. Used
// when the URL on file is a home page with no events on it: one hop to
// "Calendar" or "Shows" finds most of them.
export function findCalendarLinks(html: string, pageUrl: string, limit = 2): string[] {
  const base = new URL(pageUrl)
  const seen = new Set<string>()
  const scored: { url: string; score: number }[] = []
  const anchor = /<a\b[^>]*href\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi
  let match: RegExpExecArray | null
  while ((match = anchor.exec(html)) !== null) {
    let url: URL
    try { url = new URL(decodeEntities(match[1]), base) } catch { continue }
    if (url.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) continue
    if (url.pathname === base.pathname || /\.(jpe?g|png|gif|pdf|css|js)$/i.test(url.pathname)) continue
    const text = cleanText(match[2]).toLowerCase()
    const path = url.pathname.toLowerCase()
    const hit = /\b(calendar|events|shows|schedule|upcoming|concerts|lineup|listings|music)\b/
    if (!hit.test(text) && !hit.test(path.replace(/[-_/]/g, ' '))) continue
    // A single event's page ("/events/some-band-2026-11-03") is not the list.
    if (/\d{4}-\d{2}-\d{2}|\/(event|show)\/[^/]+\/?$/.test(path)) continue
    const key = url.origin + url.pathname
    if (seen.has(key)) continue
    seen.add(key)
    const score = (/calendar|shows|events/.test(text) ? 2 : 0) + (/calendar|shows|events/.test(path) ? 1 : 0) - path.split('/').length * 0.1
    scored.push({ url: url.toString(), score })
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map(s => s.url)
}

// ── Is it a show? ────────────────────────────────────────────────────────────

// schema.org types that are never a concert.
const NOT_MUSIC_TYPES = new Set([
  'ComedyEvent', 'TheaterEvent', 'SportsEvent', 'ScreeningEvent', 'EducationEvent', 'BusinessEvent',
  'FoodEvent', 'ExhibitionEvent', 'ChildrensEvent', 'LiteraryEvent', 'SaleEvent', 'Hackathon',
  'VisualArtsEvent', 'CourseInstance',
])

// Words that mark a listing as something other than a gig. Deliberately
// short and literal: a broader list ("talk", "wine", "film", "class") starts
// throwing out bands (Talking Heads, Film School, Class Actress). A
// MusicEvent, or a listing filed under a music category, skips this check.
const NOT_MUSIC_WORDS = /\b(comedy|comedian|stand[- ]?up|improv|trivia|karaoke|bingo|open mic|drag (?:brunch|show|bingo)|brunch|yoga|workshop|flea market|private event|closed for|screening|watch party|viewing party|podcast|book (?:signing|launch|club)|poetry slam|burlesque|wrestling|magic show|pub quiz|quiz night|game night|networking|craft fair|spelling bee|storytime|skate night|holiday market|art market)\b/i

const MUSIC_CATEGORIES = /\b(music|concert|live|band|dj|club night|dance|festival|tour|show)\b/

export function isMusic(event: VenueEvent): boolean {
  if (event.types.indexOf('MusicEvent') >= 0) return true
  if (event.types.some(t => NOT_MUSIC_TYPES.has(t))) return false
  const categories = event.categories.join(' ')
  if (categories && NOT_MUSIC_WORDS.test(categories) && !MUSIC_CATEGORIES.test(categories)) return false
  return !NOT_MUSIC_WORDS.test(event.title)
}

// ── Who's playing ────────────────────────────────────────────────────────────

// Status and marketing that venues glue onto the front of a listing.
const LEADING_NOISE = /^\s*(?:sold[\s-]*out|low tickets|few tickets( left)?|selling fast|on sale now|just announced|newly announced|new date|rescheduled|moved|added show|second show( added)?|2nd show( added)?|late show|early show|matinee|tonight|this week|free( show)?|all ages|\d{2}\+|cancel+ed|postponed)\s*[:!|\-–—]+\s*/i

// "KCRW Presents:", "Spaceland presents", "An evening with".
const PRESENTER = /^.{1,60}?\bpresents?\b\s*[:\-–—]?\s+/i
const EVENING_WITH = /^(?:an |a special )?evening with\s+/i

// Bracketed notes that are about the night rather than the act.
const BRACKET_NOTE = /\s*[(\[][^)\]]*(?:sold out|tickets?|\d{2}\+|all ages|early|late|show|tour|release|dj set|live set|matinee|rsvp|cancel|postpon|resched|doors|free|night \d|\d{1,2}(?::\d{2})?\s*(?:am|pm))[^)\]]*[)\]]/gi

// Where the bill turns from headliner to support.
const SUPPORT_SPLIT = /\s+(?:w\/|with special guests?|and special guests?|& special guests?|special guests?:?|with guests?|with|plus|support(?:ed)? by|featuring special guests?)\s+|\s+w\/\s*/i

// After the headliner, a subtitle is a tour or an occasion, not a name.
const SUBTITLE = /\b(?:tour|release|album|anniversary|celebrat\w*|residency|benefit|tribute|in concert|edition|record|vinyl|night \w+|live (?:at|in|from)|farewell|reunion|(?:19|20)\d{2})\b/i

const PLACEHOLDER = /^(?:tba|tbd|tbc|various artists|special guests?|guests?|more|and more|friends|local support|support|doors|closed|private event)$/i

export interface Bill {
  artist:  string
  support: string[]
}

function tidy(name: string): string {
  return name
    .replace(BRACKET_NOTE, '')
    .replace(/^[\s\-–—:|,.+]+|[\s\-–—:|,+]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

// "w/ Special Guest Snail Mail" leaves this on the front of the first name.
const GUEST_PREFIX = /^(?:(?:very )?special guests?|guests?|with|w\/|featuring|feat\.?|support:?)\s*:?\s+/i

function splitList(text: string): string[] {
  return text
    .split(/\s*(?:,|\s\/\s|\s\+\s|;|\s\|\s|\s&\s(?=special|friends)|\s+and more\b)\s*/i)
    .map(name => tidy(name.replace(GUEST_PREFIX, '')))
    .filter(name => name.length > 1 && !PLACEHOLDER.test(name))
}

// The headliner and supporting acts for one listing, or null when nothing
// usable is left once the marketing is stripped away.
export function billFor(event: VenueEvent, venueName: string): Bill | null {
  const venueKey = nameKey(venueName)
  const usable = (name: string) => name.length > 1 && name.length <= 80 && !PLACEHOLDER.test(name) && nameKey(name) !== venueKey

  // Structured billing wins when it looks like real names: it is what the
  // venue typed into its ticketing system, act by act.
  const performers = event.performers.map(tidy).filter(usable)
  if (performers.length > 0) {
    return { artist: performers[0], support: performers.slice(1).filter(p => nameKey(p) !== nameKey(performers[0])) }
  }

  let title = event.title
  for (let i = 0; i < 4; i++) {
    const before = title
    title = title.replace(LEADING_NOISE, '').replace(EVENING_WITH, '')
    if (title === before) break
  }
  if (PRESENTER.test(title)) title = title.replace(PRESENTER, '')
  title = title.replace(BRACKET_NOTE, '').trim()

  const [headPart, ...rest] = title.split(SUPPORT_SPLIT)
  const supportPart = rest.join(', ')

  // Co-headliners: "A / B" and "A + B" bill two acts; the first leads.
  const heads = headPart.split(/\s+(?:\/|\+|\|)\s+/)
  let artist = heads[0]

  // "Artist - The Something Tour" / "Artist: Album Release Show"
  const parts = artist.split(/\s+[-–—|]\s+|:\s+/)
  if (parts.length > 1) {
    const tail = parts.slice(1).join(' ')
    if (SUBTITLE.test(tail)) artist = parts[0]
    else if (SUBTITLE.test(parts[0]) && !SUBTITLE.test(tail)) artist = tail
  }

  artist = tidy(artist)
  if (!usable(artist)) return null

  const support = [...heads.slice(1).map(tidy), ...splitList(supportPart)]
    .filter(usable)
    .filter(name => nameKey(name) !== nameKey(artist))
  return { artist, support }
}

// Same act, allowing for how differently two listings spell one bill:
// "Beach House" vs "Beach House (DJ Set)", "The National" vs "National".
export function sameArtist(a: string, b: string): boolean {
  const strip = (s: string) => nameKey(s).replace(/^the /, '').replace(/[^a-z0-9 ]/g, '').trim()
  const x = strip(a)
  const y = strip(b)
  if (!x || !y) return false
  if (x === y) return true
  const [short, long] = x.length <= y.length ? [x, y] : [y, x]
  return short.length >= 4 && (long.startsWith(`${short} `) || long.endsWith(` ${short}`))
}
