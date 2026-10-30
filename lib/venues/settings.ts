// The venue sync's switch and its last report, both kept in app_settings so
// /admin can flip and read them without a deploy (the same table as the
// sign-up switch). Server-only: it writes through the service role.
//
//   venue_sync_mode    "dry" | "live" - missing means dry, so a fresh deploy
//                      never writes until someone has looked at a report
//   venue_sync_report  the last run's VenueSyncReport

import { supabaseAdmin } from '../supabaseAdmin'
import type { VenueSyncMode, VenueSyncReport } from './report'

const MODE_KEY   = 'venue_sync_mode'
const REPORT_KEY = 'venue_sync_report'

export async function readVenueSyncMode(): Promise<VenueSyncMode> {
  const { data, error } = await supabaseAdmin().from('app_settings').select('value').eq('key', MODE_KEY).maybeSingle()
  return !error && data?.value === 'live' ? 'live' : 'dry'
}

export async function saveVenueSyncMode(mode: VenueSyncMode): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('app_settings')
    .upsert({ key: MODE_KEY, value: mode, updated_at: new Date().toISOString() })
  if (error) throw new Error(error.message)
}

export async function readVenueSyncReport(): Promise<VenueSyncReport | null> {
  const { data, error } = await supabaseAdmin().from('app_settings').select('value').eq('key', REPORT_KEY).maybeSingle()
  if (error || !data?.value || typeof data.value !== 'object') return null
  return data.value as VenueSyncReport
}

export async function saveVenueSyncReport(report: VenueSyncReport): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('app_settings')
    .upsert({ key: REPORT_KEY, value: report, updated_at: new Date().toISOString() })
  if (error) console.error('[sync-venues] saving the report failed:', error.message)
}
