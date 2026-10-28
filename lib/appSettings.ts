'use client'

import { useEffect, useState } from 'react'

// The admin page's switches (app/admin), from /api/settings:
//   signupMethod - phone normally; email when texts aren't getting through
export type SignupMethod = 'phone' | 'email'

export interface AppSettings {
  signupMethod: SignupMethod
}

// Remembered for the page load, so a sheet or page rendering later starts
// from the last value seen. Anything unreadable keeps it, and it starts
// from the default, phone sign-up. Email sign-up only ever shows when the
// server said so.
let lastKnown: AppSettings = { signupMethod: 'phone' }
let inFlight: Promise<AppSettings> | null = null

export function fetchAppSettings(): Promise<AppSettings> {
  if (!inFlight) {
    inFlight = (async () => {
      try {
        const res = await fetch('/api/settings', { cache: 'no-store' })
        if (res.ok) {
          const data = await res.json()
          lastKnown = {
            signupMethod: data.signupMethod === 'email' ? 'email' : 'phone',
          }
        }
      } catch {
        // keep lastKnown
      }
      inFlight = null
      return lastKnown
    })()
  }
  return inFlight
}

// Fetched as soon as a page that uses a switch loads, so it's known by the
// time anyone taps.
if (typeof window !== 'undefined') void fetchAppSettings()

// Checked again on every mount, so a switch flipped while the page was open
// still reaches the next sheet or page.
function useSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  const [value, setValue] = useState<AppSettings[K]>(lastKnown[key])
  useEffect(() => {
    let live = true
    fetchAppSettings().then(settings => { if (live) setValue(settings[key]) })
    return () => { live = false }
  }, [key])
  return value
}

export const useSignupMethod = () => useSetting('signupMethod')
