const TIMEOUT_MS = 8000
const MAX_ATTEMPTS = 3
const BASE_DELAY_MS = 500

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// A drop-in replacement for the global fetch, passed to supabase-js via the
// `global.fetch` client option. Retries only on actual connection failures
// (timeout/abort, DNS, dropped connection) — a real HTTP response, even a
// 4xx/5xx one, means the round-trip succeeded, so auth/permission/validation
// errors are returned as-is on the first attempt rather than retried.
export async function resilientFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let lastError: unknown

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const response = await fetch(input, { ...init, signal: controller.signal })
      clearTimeout(timeoutId)
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      lastError = err
      if (attempt < MAX_ATTEMPTS - 1) {
        await sleep(BASE_DELAY_MS * 2 ** attempt)
      }
    }
  }

  throw lastError
}
