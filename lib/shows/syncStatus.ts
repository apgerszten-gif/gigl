// A record of each nightly job's last run, so a night that never finished is
// visible somewhere other than Vercel's log pages. Kept in app_settings
// (key text, value jsonb), the table the venue sync's report already uses, so
// it needs no new DDL. Server-only: it writes through the service role.
//
// A run writes {startedAt} first and the full record when it ends. A
// startedAt with no finishedAt after it is the signature of a function that
// was killed at maxDuration, which is exactly the failure that otherwise
// leaves no trace and, per CLAUDE.md, is a permanent hole in the catalogue.
//
// Nothing here may fail a run: every write is caught and logged.

import { supabaseAdmin } from '../supabaseAdmin'

export type SyncJob = 'sync-shows' | 'sync-unclassified' | 'sync-sweep'

const keyFor = (job: SyncJob) => `sync_status_${job}`

export interface SyncStatus {
  startedAt:   string
  finishedAt?: string
  // The job's own summary object (counts, deadlineHit, durations).
  summary?:    Record<string, unknown>
}

async function write(job: SyncJob, value: SyncStatus): Promise<void> {
  try {
    const { error } = await supabaseAdmin()
      .from('app_settings')
      .upsert({ key: keyFor(job), value, updated_at: new Date().toISOString() })
    if (error) console.error(`[${job}] saving the run record failed:`, error.message)
  } catch (err) {
    console.error(`[${job}] saving the run record failed:`, err instanceof Error ? err.message : String(err))
  }
}

export const recordSyncStart = (job: SyncJob, startedAt: number) =>
  write(job, { startedAt: new Date(startedAt).toISOString() })

export const recordSyncFinish = (job: SyncJob, startedAt: number, summary: Record<string, unknown>) =>
  write(job, { startedAt: new Date(startedAt).toISOString(), finishedAt: new Date().toISOString(), summary })

export async function readSyncStatus(job: SyncJob): Promise<SyncStatus | null> {
  const { data, error } = await supabaseAdmin().from('app_settings').select('value').eq('key', keyFor(job)).maybeSingle()
  if (error || !data?.value || typeof data.value !== 'object') return null
  return data.value as SyncStatus
}

// Hours since the job last finished, or null if it never has (or the record
// can't be read). A started-but-unfinished record older than the grace period
// counts as stale too, because that is the killed-mid-run case.
export function staleHours(status: SyncStatus | null, now = Date.now()): number | null {
  if (!status?.finishedAt) return null
  return (now - Date.parse(status.finishedAt)) / 3_600_000
}
