'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

// The admin page's sign-up switch (app/admin): phone normally, email when
// texts aren't getting through. It lives in app_settings rather than code so
// it flips without a deploy.
export type SignupMethod = 'phone' | 'email'

// Remembered for the page load, so a sheet opening later shows the right
// form straight away.
let lastKnown: SignupMethod = 'phone'

// Anything unreadable - the table not created yet, a network blip - reads as
// phone, the default. Email is only ever shown when it was asked for.
async function fetchSignupMethod(): Promise<SignupMethod> {
  try {
    const { data, error } = await createClient()
      .from('app_settings')
      .select('value')
      .eq('key', 'signup_method')
      .maybeSingle()
    lastKnown = !error && data?.value === 'email' ? 'email' : 'phone'
  } catch {
    // keep lastKnown
  }
  return lastKnown
}

// Fetched as soon as a page that can sign people up loads, rather than when
// the sheet opens, so the switch is already known by the time anyone taps.
if (typeof window !== 'undefined') void fetchSignupMethod()

// Checked again on every mount, so a switch flipped while the page was open
// still reaches the next sheet.
export function useSignupMethod(): SignupMethod {
  const [method, setMethod] = useState<SignupMethod>(lastKnown)
  useEffect(() => {
    let live = true
    fetchSignupMethod().then(m => { if (live) setMethod(m) })
    return () => { live = false }
  }, [])
  return method
}
