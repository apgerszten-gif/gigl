// Pacing for the nightly Ticketmaster runs (app/api/cron/sync-shows and
// sync-unclassified): a shared rate gate and a small worker pool.

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// One global gate for the whole run: it hands out start times spaced
// REQUEST_SPACING_MS apart, so no matter how many workers are in flight the
// aggregate rate stays under Ticketmaster's limit. Reserving the slot before
// awaiting is what makes it safe under concurrency - two callers can never be
// handed the same slot.
export function createRateGate(intervalMs: number) {
  let nextSlot = 0
  return async function gate(): Promise<void> {
    const now = Date.now()
    const slot = Math.max(now, nextSlot)
    nextSlot = slot + intervalMs
    const wait = slot - now
    if (wait > 0) await sleep(wait)
  }
}

// Fixed-size worker pool. Each worker pulls the next index until the queue is
// drained or `shouldStop` says to give up, so one slow item can't stall the
// others behind it.
export async function pool<T>(
  items: T[],
  workers: number,
  run: (item: T) => Promise<void>,
  shouldStop?: () => boolean,
): Promise<void> {
  let cursor = 0
  const next = async (): Promise<void> => {
    while (cursor < items.length) {
      if (shouldStop?.()) return
      const item = items[cursor++]
      await run(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(workers, items.length) }, next))
}
