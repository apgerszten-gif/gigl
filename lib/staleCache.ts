// A minimal localStorage-backed cache for "show the last-known data
// instantly, then quietly refresh it" screens — no library needed for
// something this small (two read-heavy screens, no mutation/invalidation
// logic beyond "overwrite with whatever came back").

export function readCache<T>(key: string): T | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeCache<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full/unavailable/private-browsing — this is just a perf
    // cache, safe to silently skip
  }
}
