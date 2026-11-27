// The Wrapped popup's switch, as stored in app_settings (key 'wrapped_popup').
// Plain functions, used by the Feed (lib/wrapped/settings.ts) and the admin
// routes alike.
//
// It's switched on by hand from /admin the day Spotify releases Wrapped, so
// it needs no deploy, and switches itself off after the 31st of that
// December.

export interface WrappedPopupSetting {
  on:    boolean
  // When it was switched on, as an ISO time. Its year sets the end date.
  since: string | null
}

export const POPUP_OFF: WrappedPopupSetting = { on: false, since: null }

export function parseWrappedPopup(value: unknown): WrappedPopupSetting {
  const v = value as Partial<WrappedPopupSetting> | null
  if (!v || typeof v !== 'object') return POPUP_OFF
  return { on: v.on === true, since: typeof v.since === 'string' ? v.since : null }
}

// The last moment it runs: the end of December 31 of the year it was
// switched on, in the reader's own time.
export function popupEndsAt(setting: WrappedPopupSetting): Date {
  const since = setting.since ? new Date(setting.since) : new Date()
  return new Date(since.getFullYear(), 11, 31, 23, 59, 59)
}

export function popupIsLive(setting: WrappedPopupSetting): boolean {
  return setting.on && Date.now() <= popupEndsAt(setting).getTime()
}
