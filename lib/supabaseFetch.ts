// Was 8000 - production logs showed a real request whose first attempt hung
// for the full 8s before the retry succeeded in ~2.6s, turning a transient
// blip into an 11s+ page load (see PERF_INVESTIGATION). Every observed
// successful query, including a degraded-connection retry, has finished
// well under 3s, so 4000 still leaves generous headroom while capping the
// worst case a hung attempt can cost in half.
const TIMEOUT_MS = 4000
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 500

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Temporary diagnostic logging (see PERF_INVESTIGATION) - every retry or
// timeout here directly inflates page load time, so this is the first place
// to look for "sometimes slow" symptoms: a `attempt=1` or `attempt=2` log
// line means the request needed a retry, adding 500ms-4.5s of sleep plus
// however much of the 8s timeout it burned through before failing.
function pathOf(input: RequestInfo | URL): string {
  try {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
    return new URL(url).pathname.replace('/rest/v1/', '')
  } catch {
    return String(input)
  }
}

// A drop-in replacement for the global fetch, passed to supabase-js via the
// `global.fetch` client option. Retries only on actual connection failures
// (timeout/abort, DNS, dropped connection) — a real HTTP response, even a
// 4xx/5xx one, means the round-trip succeeded, so auth/permission/validation
// errors are returned as-is on the first attempt rather than retried.
export async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastError: unknown
  const label = pathOf(input)
  const callStart = Date.now()

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const attemptStart = Date.now()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(input, { ...init, signal: controller.signal })
      clearTimeout(timeoutId)
      console.log(`[perf][fetch] ${label} attempt=${attempt} ms=${Date.now() - attemptStart} status=${response.status}${attempt > 0 ? ` total_ms=${Date.now() - callStart} (retried)` : ''}`)
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err
      const timedOut = err instanceof Error && err.name === 'AbortError'
      console.log(`[perf][fetch] ${label} attempt=${attempt} ms=${Date.now() - attemptStart} FAILED reason=${timedOut ? 'timeout' : (err as Error)?.name || 'unknown'}`)
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(BASE_DELAY_MS * 2 ** attempt)
      }
    }
  }

  console.log(`[perf][fetch] ${label} EXHAUSTED attempts=${MAX_ATTEMPTS} total_ms=${Date.now() - callStart}`)
  throw lastError
}
