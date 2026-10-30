// Network access for the venue-website sync, kept polite on purpose: these
// are small venues' own sites, often on cheap hosting, and the sync is a
// guest on them.
//
//   - It says who it is (USER_AGENT), and it obeys robots.txt for that name
//     and for "*".
//   - One request at a time per site, HOST_SPACING_MS apart, however many
//     venues share a host. Different sites are fetched in parallel.
//   - Every request has a time limit and a size limit, so one slow or huge
//     page can't eat the run.

// A browser-style prefix because some hosts turn away anything that doesn't
// start with one, then a name a venue can find and block in robots.txt.
export const USER_AGENT = 'Mozilla/5.0 (compatible; GiglBot/1.0; +https://www.gigl.space)'
const ROBOTS_NAME = 'giglbot'

const TIMEOUT_MS = 12_000
const MAX_BYTES = 4 * 1024 * 1024
const HOST_SPACING_MS = 1_000

export class FetchError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Per-host queue: each request for a host waits for the previous one to
// start plus HOST_SPACING_MS. Reserved before awaiting, so two workers can't
// take the same slot.
const nextSlot = new Map<string, number>()

async function hostGate(host: string): Promise<void> {
  const now = Date.now()
  const slot = Math.max(now, nextSlot.get(host) ?? 0)
  nextSlot.set(host, slot + HOST_SPACING_MS)
  if (slot > now) await sleep(slot - now)
}

async function readCapped(res: Response): Promise<string> {
  if (!res.body) return ''
  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > MAX_BYTES) {
      await reader.cancel()
      throw new FetchError('page too large', 0)
    }
    chunks.push(value)
  }
  const merged = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    merged.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder('utf-8').decode(merged)
}

export interface Fetched {
  url:         string   // after redirects
  status:      number
  contentType: string
  body:        string
}

// Next 14 caches fetch() forever unless told otherwise; every call here says
// no-store, and the route sets fetchCache as well.
export async function politeFetch(url: string, accept = 'text/html,application/xhtml+xml'): Promise<Fetched> {
  const host = new URL(url).host
  await hostGate(host)

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: accept, 'Accept-Language': 'en-US,en;q=0.8' },
      redirect: 'follow',
      cache: 'no-store',
      signal: controller.signal,
    })
    const body = await readCapped(res)
    return { url: res.url || url, status: res.status, contentType: res.headers.get('content-type') ?? '', body }
  } catch (err) {
    if (err instanceof FetchError) throw err
    const message = err instanceof Error ? (err.name === 'AbortError' ? 'timed out' : err.message) : String(err)
    throw new FetchError(message, 0)
  } finally {
    clearTimeout(timer)
  }
}

// ── robots.txt ───────────────────────────────────────────────────────────────

interface Rule { allow: boolean; pattern: RegExp; length: number }

function toPattern(path: string): RegExp {
  const escaped = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')
  return new RegExp(`^${escaped.endsWith('\\$') ? `${escaped.slice(0, -2)}$` : escaped}`)
}

// The rules for this bot: its own group if the file names it, otherwise the
// "*" group. Longest matching rule wins and Allow wins a tie, which is how
// Google reads the file and so how most sites expect it to be read.
export function parseRobots(text: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = []
  let current: { agents: string[]; rules: Rule[] } | null = null
  let lastWasAgent = false

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim()
    const colon = line.indexOf(':')
    if (colon < 0) continue
    const field = line.slice(0, colon).trim().toLowerCase()
    const value = line.slice(colon + 1).trim()

    if (field === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] }
        groups.push(current)
      }
      current.agents.push(value.toLowerCase())
      lastWasAgent = true
      continue
    }
    lastWasAgent = false
    if (!current || (field !== 'allow' && field !== 'disallow')) continue
    // "Disallow:" with nothing after it allows everything.
    if (!value) continue
    current.rules.push({ allow: field === 'allow', pattern: toPattern(value), length: value.length })
  }

  const own = groups.filter(g => g.agents.some(a => a !== '*' && ROBOTS_NAME.indexOf(a) >= 0))
  const chosen = own.length > 0 ? own : groups.filter(g => g.agents.indexOf('*') >= 0)
  return chosen.flatMap(g => g.rules)
}

export function robotsAllows(rules: Rule[], pathAndQuery: string): boolean {
  let best: Rule | null = null
  for (const rule of rules) {
    if (!rule.pattern.test(pathAndQuery)) continue
    if (!best || rule.length > best.length || (rule.length === best.length && rule.allow)) best = rule
  }
  return best ? best.allow : true
}

const robotsCache = new Map<string, Promise<Rule[] | 'unavailable'>>()

// A missing robots.txt (any 4xx) allows everything; a server error means
// "not now", the same as Google treats it.
async function robotsFor(origin: string): Promise<Rule[] | 'unavailable'> {
  let pending = robotsCache.get(origin)
  if (!pending) {
    pending = politeFetch(`${origin}/robots.txt`, 'text/plain')
      .then(res => {
        if (res.status >= 500) return 'unavailable' as const
        if (res.status >= 400) return []
        return parseRobots(res.body)
      })
      .catch(() => [] as Rule[])
    robotsCache.set(origin, pending)
  }
  return pending
}

export class RobotsDisallowed extends Error {}

// politeFetch, after checking robots.txt allows it.
export async function fetchIfAllowed(url: string, accept?: string): Promise<Fetched> {
  const parsed = new URL(url)
  const rules = await robotsFor(parsed.origin)
  if (rules === 'unavailable') throw new FetchError('robots.txt unavailable', 503)
  if (!robotsAllows(rules, parsed.pathname + parsed.search)) throw new RobotsDisallowed(`robots.txt disallows ${parsed.pathname}`)
  return politeFetch(url, accept)
}

// Fresh state for each run: the module stays warm between invocations on the
// same instance, and yesterday's robots.txt is not today's.
export function resetFetchState(): void {
  robotsCache.clear()
  nextSlot.clear()
}
