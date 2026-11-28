// The state sweep's switch and its last report, both in app_settings (the
// same pattern as the venue sync, lib/venues/settings.ts). Server-only.
//
//   state_sweep_mode    "dry" | "live" - missing means dry, so a fresh deploy
//                       fetches and reports but never writes until someone has
//                       read a report
//   state_sweep_report  the last run's SweepReport
//
// Switch it with the SQL editor (there is no admin button yet):
//   insert into app_settings (key, value) values ('state_sweep_mode', '"live"')
//   on conflict (key) do update set value = excluded.value, updated_at = now();

import { supabaseAdmin } from '../supabaseAdmin'

const MODE_KEY   = 'state_sweep_mode'
const REPORT_KEY = 'state_sweep_report'

export type SweepMode = 'dry' | 'live'

export interface SweepReport {
  ranAt:       string
  mode:        SweepMode
  group:       number
  regions:     string[]
  extraCities: number
  // Distinct events found, and in a dry run how many of those the catalogue
  // does not already have (the answer to "what would this add").
  fetched:     number
  newToCatalogue: number | null
  cancelled:   number
  upserted:    number
  failed:      number
  errors:      string[]
  emptyProbes: string[]
  cappedProbes: string[]
  deadlineHit: boolean
  durationMs:  number
  // A few new events, "Artist · Venue · City, ST · date", for checking by eye.
  sample:      string[]
}

export async function readSweepMode(): Promise<SweepMode> {
  const { data, error } = await supabaseAdmin().from('app_settings').select('value').eq('key', MODE_KEY).maybeSingle()
  return !error && data?.value === 'live' ? 'live' : 'dry'
}

export async function saveSweepReport(report: SweepReport): Promise<void> {
  const { error } = await supabaseAdmin()
    .from('app_settings')
    .upsert({ key: REPORT_KEY, value: report, updated_at: new Date().toISOString() })
  if (error) console.error('[sync-sweep] saving the report failed:', error.message)
}
