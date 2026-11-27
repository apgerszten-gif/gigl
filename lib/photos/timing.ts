'use client'

// Lightweight timing for the photo finder, so someone can measure on a real
// phone where the wait after picking photos goes. Off unless asked for:
//
//   /photos?timing=1                shows a panel of timings on the screen
//                                   (a phone has no console) and logs the same
//                                   lines to console.info under "[photos]"
//   /photos?timing=1&accept=any     also swaps the file picker's `accept` list
//   /photos?timing=1&accept=heic    for A/B tests on the device, see acceptFor
//
// Remembered for the browser tab with ?timing=1 (sessionStorage), turned off
// with ?timing=0. Nothing is sent anywhere; the lines are only displayed.

const KEY = 'gigl_photo_timing'

export function photoTimingOn(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const flag = new URLSearchParams(window.location.search).get('timing')
    if (flag === '1') { sessionStorage.setItem(KEY, '1'); return true }
    if (flag === '0') { sessionStorage.removeItem(KEY); return false }
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return new URLSearchParams(window.location.search).get('timing') === '1'
  }
}

// The picker's accept list. The default is the one the page has always used.
// The others exist only to be tried with ?timing=1&accept=...: iOS decides
// whether to hand over the original HEIC (with its location) or a converted
// JPEG partly from this list, and how long it takes to prepare the files is
// the longest wait there is. The timing panel reports which formats arrived.
export const DEFAULT_ACCEPT = 'image/jpeg,image/png,image/heic,image/heif'

export function acceptFor(timing: boolean): string {
  if (!timing || typeof window === 'undefined') return DEFAULT_ACCEPT
  const choice = new URLSearchParams(window.location.search).get('accept')
  if (choice === 'any')  return 'image/*'
  if (choice === 'heic') return 'image/heic,image/heif,image/jpeg,image/png'
  return DEFAULT_ACCEPT
}

export class PhotoTimer {
  private lines: string[] = []
  private origin = performance.now()
  private listeners = new Set<() => void>()

  // Everything is relative to the moment the person tapped "Choose photos".
  start(label: string) {
    this.lines = []
    this.origin = performance.now()
    this.add(label)
  }

  at(label: string, detail?: string) {
    this.add(label, detail)
  }

  note(text: string) {
    this.lines.push(`   ${text}`)
    console.info('[photos]', text)
    this.listeners.forEach(fn => fn())
  }

  snapshot(): string[] {
    return this.lines
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => { this.listeners.delete(fn) }
  }

  private add(label: string, detail?: string) {
    const t = ((performance.now() - this.origin) / 1000).toFixed(2).padStart(6)
    const line = `${t}s  ${label}${detail ? `  ${detail}` : ''}`
    this.lines.push(line)
    console.info('[photos]', line)
    this.listeners.forEach(fn => fn())
  }
}

// Median and 95th percentile of a list of milliseconds.
export function spread(values: number[]): { median: number; p95: number; max: number } {
  if (values.length === 0) return { median: 0, p95: 0, max: 0 }
  const sorted = values.slice().sort((a, b) => a - b)
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))]
  return { median: at(0.5), p95: at(0.95), max: sorted[sorted.length - 1] }
}
