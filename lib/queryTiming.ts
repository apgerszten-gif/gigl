// Temporary diagnostic instrumentation for the rankings/artist/profile
// slowness investigation. Wraps a Supabase query so its label, duration,
// row/error shape land in the logs (prefixed `[perf]` for easy grepping out
// of Vercel function logs or the browser console) without changing behavior.
// Safe to strip once the root cause is confirmed.

type LooseResult = { data: unknown; error: { message: string } | null; count?: number | null }

let warm = false

// Module state persists only for the lifetime of a warm serverless instance
// (Node.js modules are cached per-container, reset on cold start) - the first
// call after a cold start will see `warm === false`.
export function markInvocation(): { cold: boolean } {
  const cold = !warm
  warm = true
  return { cold }
}

export async function timeQuery<T extends LooseResult>(label: string, query: PromiseLike<T>): Promise<T> {
  const start = Date.now()
  const result = await query
  const duration = Date.now() - start
  const rows = Array.isArray(result.data) ? result.data.length : result.data ? 1 : 0
  const countPart = result.count != null ? ` count=${result.count}` : ''
  const errorPart = result.error ? ` error="${result.error.message}"` : ''
  console.log(`[perf] ${label} ms=${duration} rows=${rows}${countPart}${errorPart}`)
  return result
}

export function timeMark(label: string, startedAt: number) {
  console.log(`[perf] ${label} ms=${Date.now() - startedAt}`)
}
