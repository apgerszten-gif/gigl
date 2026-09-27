'use client'

import { useEffect, useState } from 'react'
import type { SiteMode } from '@/lib/siteMode'

// The admin page's switches (app/admin) as they apply to this visitor, from
// /api/settings:
//   signupMethod - phone normally; email when texts aren't getting through
//   siteMode     - normal or crssd, already resolved for where the visitor
//                  is (lib/siteMode.ts)
export type SignupMethod = 'phone' | 'email'

export interface AppSettings {
  signupMethod: SignupMethod
  siteMode: SiteMode
}

// Remembered for the page load, so a sheet or page rendering later starts
// from the last value seen. Anything unreadable keeps it, and it starts
// from the defaults: phone sign-up, normal mode. Email sign-up and CRSSD
// mode only ever show when the server said so.
let lastKnown: AppSettings = { signupMethod: 'phone', siteMode: 'normal' }
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
            siteMode: data.siteMode === 'crssd' ? 'crssd' : 'normal',
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
export const useSiteMode = () => useSetting('siteMode')
