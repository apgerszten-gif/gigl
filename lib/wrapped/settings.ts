'use client'

import { createClient } from '@/lib/supabase/client'
import { POPUP_OFF, parseWrappedPopup, type WrappedPopupSetting } from './popup'

export { popupIsLive } from './popup'

// Whether the Feed should open the Wrapped popup: the switch in /admin
// (lib/wrapped/popup.ts), and whether this phone has already seen it this
// season. Everyone sees it once: new visitors and members alike.

// Anything unreadable reads as off.
export async function fetchWrappedPopup(): Promise<WrappedPopupSetting> {
  try {
    const { data, error } = await createClient()
      .from('app_settings')
      .select('value')
      .eq('key', 'wrapped_popup')
      .maybeSingle()
    return error ? POPUP_OFF : parseWrappedPopup(data?.value)
  } catch {
    return POPUP_OFF
  }
}

// Once per person per year, remembered on this phone. A member who opens
// Gigl on a second phone can see it there too; that's the price of not
// keeping it on the account.
const SEEN_KEY = 'gigl_wrapped_seen'

function seasonOf(setting: WrappedPopupSetting): string {
  return String((setting.since ? new Date(setting.since) : new Date()).getFullYear())
}

export function popupSeen(setting: WrappedPopupSetting): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === seasonOf(setting)
  } catch {
    // Storage blocked: better to skip it than show it on every visit.
    return true
  }
}

export function markPopupSeen(setting: WrappedPopupSetting): void {
  try {
    localStorage.setItem(SEEN_KEY, seasonOf(setting))
  } catch {
    // not remembered; popupSeen already reads blocked storage as seen
  }
}
