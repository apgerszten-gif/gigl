// Shared by the report sheet (components/ContentMenu.tsx), /admin, and the
// /api/admin/reports routes. The values match the checks on public.reports
// in supabase-schema.sql.

export type ReportKind = 'log' | 'comment' | 'profile'

export const REPORT_REASONS = [
  { value: 'spam',       label: 'Spam or a fake account' },
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'hate',       label: 'Hate speech or symbols' },
  { value: 'sexual',     label: 'Nudity or sexual content' },
  { value: 'violence',   label: 'Violence or threats' },
  { value: 'other',      label: 'Something else' },
] as const

export type ReportReason = typeof REPORT_REASONS[number]['value']

export function reasonLabel(reason: string): string {
  return REPORT_REASONS.find(r => r.value === reason)?.label ?? reason
}

// One open report as /admin shows it. `target` is null once the reported
// log, comment or account is gone.
export interface AdminReport {
  id:        string
  createdAt: string
  kind:      ReportKind
  targetId:  string
  reason:    string
  details:   string | null
  reporter:  string | null
  target: {
    ownerId:  string
    owner:    string | null
    title:    string
    body:     string | null
    photos:   number
  } | null
}
