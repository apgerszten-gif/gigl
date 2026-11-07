'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { reasonLabel, type AdminReport } from '@/lib/reports'
import { Card, Chip, ErrorNote, Label, btnDanger, btnQuiet } from '@/components/ui'

// The Reports card on /admin: what people reported from the ••• menus
// (components/ContentMenu.tsx), oldest-waiting at the bottom. The Terms and
// the report sheet both promise a look within 24 hours, so this sits at the
// top of the page.

const KIND_LABEL = { log: 'Log', comment: 'Comment', profile: 'Profile' } as const

function ago(iso: string, now: number): string {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000))
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

export function AdminReports({ call, now, refreshKey }: {
  call: (path: string, init?: RequestInit) => Promise<Response>
  now: number
  // Changes whenever the page's own numbers reload, so this reloads with them.
  refreshKey: string
}) {
  const [reports, setReports] = useState<AdminReport[] | null | undefined>(undefined)
  const [open, setOpen]       = useState(0)
  const [busy, setBusy]       = useState<string | null>(null)
  const [error, setError]     = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await call('/api/admin/reports')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setReports(data.reports)
      setOpen(data.open)
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't load reports.")
    }
  }, [call])

  useEffect(() => { load() }, [load, refreshKey])

  async function act(report: AdminReport, action: 'remove' | 'dismiss') {
    if (action === 'remove') {
      const owner = report.target?.owner ? `@${report.target.owner}` : 'this person'
      const question = report.kind === 'profile'
        ? `Delete ${owner}'s account and everything they've posted? This can't be undone.`
        : `Remove ${owner}'s ${report.kind}? This can't be undone.`
      if (!window.confirm(question)) return
    }

    setBusy(report.id)
    const res = await call(`/api/admin/reports/${report.id}`, { method: 'POST', body: JSON.stringify({ action }) })
    const data = await res.json().catch(() => ({}))
    setBusy(null)
    if (!res.ok && res.status !== 404) { setError(data.error ?? "Couldn't update the report."); return }
    setError(null)
    // Every open report about the same thing closed with this one.
    const sameThing = (r: AdminReport) => r.kind === report.kind && r.targetId === report.targetId
    const closed = reports?.filter(sameThing).length ?? 0
    setReports(prev => prev && prev.filter(r => !sameThing(r)))
    setOpen(n => Math.max(0, n - closed))
  }

  return (
    <section className="space-y-2">
      <Label className="px-1">{reports && open > 0 ? `Reports · ${open} open` : 'Reports'}</Label>
      {error && <ErrorNote>{error}</ErrorNote>}
      {reports === null ? (
        <ErrorNote>Reports need their table. Run the reporting and blocking SQL in Supabase, then refresh.</ErrorNote>
      ) : reports === undefined ? null : reports.length === 0 ? (
        <Card flat className="px-3.5 py-3 text-[12px] text-ink-muted">Nothing reported. When someone reports a log, comment or profile it shows up here.</Card>
      ) : reports.map(report => {
        const t = report.target
        return (
          <Card key={report.id} flat className="p-3 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Chip compact active>{KIND_LABEL[report.kind]}</Chip>
              <span className="text-[12px] font-semibold">{reasonLabel(report.reason)}</span>
              <span className="text-[11px] text-ink-faint">
                {ago(report.createdAt, now)}{report.reporter && ` · from @${report.reporter}`}
              </span>
            </div>
            {report.details && <p className="text-[12px] leading-snug text-ink-muted">&ldquo;{report.details}&rdquo;</p>}

            {t ? (
              <div className="rounded-card border border-ink/15 bg-cream px-3 py-2 space-y-0.5">
                <p className="text-[11px] text-ink-muted">
                  {t.owner ? <Link href={`/u/${t.owner}`} className="font-semibold text-ink">@{t.owner}</Link> : 'No username'}
                  {t.photos > 0 && ` · ${t.photos} photo${t.photos === 1 ? '' : 's'}`}
                </p>
                <p className="font-display text-[14px] font-bold leading-tight">{t.title}</p>
                {t.body && <p className="text-[13px] leading-snug line-clamp-4">{t.body}</p>}
              </div>
            ) : (
              <p className="text-[12px] text-ink-faint">Already gone.</p>
            )}

            <div className="flex gap-2">
              {t && (
                <button
                  type="button"
                  onClick={() => act(report, 'remove')}
                  disabled={busy === report.id}
                  className={`${btnDanger} px-2.5 py-1.5 text-[10px]`}
                >
                  {report.kind === 'profile' ? 'Delete account' : `Remove ${report.kind}`}
                </button>
              )}
              <button
                type="button"
                onClick={() => act(report, 'dismiss')}
                disabled={busy === report.id}
                className={`${btnQuiet} px-2.5 py-1.5 text-[10px]`}
              >
                {busy === report.id ? 'Saving…' : t ? 'Leave it up' : 'Dismiss'}
              </button>
            </div>
          </Card>
        )
      })}
    </section>
  )
}
