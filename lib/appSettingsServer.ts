import { supabaseAdmin } from './supabaseAdmin'

// The admin page's switches as stored in app_settings, read on the server
// (/api/settings, /api/admin/stats). The browser gets them through
// /api/settings instead - see lib/appSettings.ts.
export interface StoredSettings {
  signupMethod: 'phone' | 'email'
}

export const DEFAULT_SETTINGS: StoredSettings = { signupMethod: 'phone' }

// null when app_settings can't be read: not configured, not created yet, or
// the database is unreachable.
export async function readStoredSettings(): Promise<StoredSettings | null> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return null
  const { data, error } = await supabaseAdmin().from('app_settings').select('key, value')
  if (error) return null
  const byKey = new Map((data ?? []).map(row => [row.key as string, row.value as unknown]))
  return {
    signupMethod: byKey.get('signup_method') === 'email' ? 'email' : 'phone',
  }
}

// The same, but never slower than `ms`: past that, or on any failure, the
// defaults. For requests a person is waiting on.
export async function readStoredSettingsWithin(ms: number): Promise<StoredSettings> {
  const read = readStoredSettings().catch(() => null)
  const late = new Promise<null>(resolve => setTimeout(() => resolve(null), ms))
  return (await Promise.race([read, late])) ?? DEFAULT_SETTINGS
}
