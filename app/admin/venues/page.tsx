'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { VenueResult, VenueStatus, VenueSyncMode, VenueSyncReport } from '@/lib/venues/report'
import { BackHeader, Card, Chip, EmptyState, ErrorNote, Label, LoadingLabel, Segmented, btnPrimary } from '@/components/ui'

// Every venue in the last venue-sync run, by city: which ones gave up their
// shows, how, and a few of the shows it read, so the parsing can be checked
// by eye before the sync is switched live. A venue that keeps coming back
// "No events" is one to replace in lib/venues/list.ts.

type Filter = 'all' | 'working' | 'not'
type Status = 'loading' | 'ready' | 'signed-out' | 'not-admin' | 'error'

const STATUS_LABEL: Record<VenueStatus, string> = {
  'ok':          'Read',
  'no-events':   'No events',
  'blocked':     'Blocked',
  'robots':      'robots.txt',
  'error':       'Error',
  'not-reached': 'Not reached',
}

const METHOD_LABEL = { jsonld: 'Page data', wordpress: 'WordPress', squarespace: 'Squarespace', ical: 'Calendar feed' }

// What a status usually means, in the words of what to do about it.
const STATUS_HINT: Partial<Record<VenueStatus, string>> = {
  'no-events':   'The calendar is probably drawn by a ticketing widget, which a plain page read can’t see.',
  'blocked':     'The site turned the request away.',
  'robots':      'The site asks bots not to read that page, so the sync doesn’t.',
  'not-reached': 'The run hit its time limit first. It starts somewhere else tomorrow.',
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

function VenueRow({ v }: { v: VenueResult }) {
  const working = v.status === 'ok' && v.kept > 0
  return (
    <div className="px-3 py-2.5 space-y-1">
      <div className="flex items-center gap-2">
        <a
          href={v.pageUrl ?? v.url}
          target="_blank"
          rel="noreferrer"
          className="flex-1 min-w-0 inline-flex items-center gap-1 font-display text-[14px] font-bold leading-tight"
        >
          <span className="truncate">{v.name}</span>
          <ExternalLink className="w-3 h-3 flex-shrink-0 text-ink-faint" strokeWidth={2} />
        </a>
        <Chip compact active={working}>
          {v.status === 'ok' ? plural(v.kept, 'show') : STATUS_LABEL[v.status]}
        </Chip>
      </div>
      <p className="text-[11px] leading-snug text-ink-muted">
        {v.city !== v.metro.split(',')[0] && `${v.city} · `}
        {v.method && METHOD_LABEL[v.method]}
        {v.status === 'ok' && ` · ${v.found} listed, ${v.past} past, ${v.onCatalogue} already had, ${v.skipped} skipped`}
        {v.status !== 'ok' && (v.error ?? STATUS_HINT[v.status] ?? '')}
      </p>
      {v.sample.length > 0 && (
        <ul className="text-[12px] leading-snug text-ink space-y-0.5">
          {v.sample.map(line => <li key={line} className="truncate">{line}</li>)}
        </ul>
      )}
    </div>
  )
}

export default function AdminVenuesPage() {
  const supabase = createClient()
  const [status, setStatus] = useState<Status>('loading')
  const [mode, setMode]     = useState<VenueSyncMode>('dry')
  const [report, setReport] = useState<VenueSyncReport | null>(null)
  const [error, setError]   = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')

  const load = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/admin/venues', {
        cache: 'no-store',
        headers: { Authorization: `Bearer ${session?.access_token ?? ''}` },
      })
      if (res.status === 401) { setStatus('signed-out'); return }
      if (res.status === 403) { setStatus('not-admin'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setMode(data.mode)
      setReport(data.report)
      setStatus('ready')
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Couldn't reach the server.")
      setStatus('error')
    }
  }, [supabase])

  useEffect(() => { load() }, [load])

  // Cities in list order, venues inside each with the working ones first.
  const groups = useMemo(() => {
    if (!report) return []
    const visible = report.venues.filter(v =>
      filter === 'all' ? true : filter === 'working' ? v.status === 'ok' && v.kept > 0 : !(v.status === 'ok' && v.kept > 0))
    const byMetro = new Map<string, VenueResult[]>()
    for (const v of visible) {
      const list = byMetro.get(v.metro) ?? []
      list.push(v)
      byMetro.set(v.metro, list)
    }
    return Array.from(byMetro.entries()).map(([metro, venues]) => ({
      metro,
      venues: venues.slice().sort((a, b) => b.kept - a.kept),
      working: venues.filter(v => v.status === 'ok' && v.kept > 0).length,
    }))
  }, [report, filter])

  return (
    <div className="min-h-screen bg-paper text-ink pb-16">
      <BackHeader title="Venue websites" href="/admin" />
      <main className="px-4 pt-4 max-w-md mx-auto space-y-4">
        {status === 'loading' && <LoadingLabel />}
        {status === 'signed-out' && (
          <EmptyState>
            Sign in with an admin account to see this page.
            <div className="mt-4">
              <Link href="/auth" className={`${btnPrimary} px-4 py-2.5 text-[11px]`}>Sign in</Link>
            </div>
          </EmptyState>
        )}
        {status === 'not-admin' && <EmptyState>This page is only for Gigl&apos;s admin accounts.</EmptyState>}
        {status === 'error' && <ErrorNote>{error}</ErrorNote>}

        {status === 'ready' && !report && (
          <EmptyState>No run yet. Start one from the Venue websites card on /admin.</EmptyState>
        )}

        {status === 'ready' && report && (
          <>
            <p className="text-[12px] leading-snug text-ink-muted">
              {report.mode === 'dry' ? 'Dry run' : 'Live run'} on {new Date(report.ranAt).toLocaleString()}:{' '}
              {report.totals.ok} of {plural(report.totals.venues, 'venue')} read, {plural(report.totals.shows, 'new show')}.
              {' '}The switch is {mode === 'live' ? 'live' : 'on dry run'}.
            </p>
            <Segmented<Filter>
              options={[{ value: 'all', label: 'All' }, { value: 'working', label: 'Working' }, { value: 'not', label: 'Not working' }]}
              value={filter}
              onChange={setFilter}
            />
            {groups.length === 0 && <EmptyState>Nothing here.</EmptyState>}
            {groups.map(g => (
              <section key={g.metro} className="space-y-2">
                <Label className="px-1">{g.metro} · {g.working} working</Label>
                <Card flat className="divide-y divide-ink/10">
                  {g.venues.map(v => <VenueRow key={v.id} v={v} />)}
                </Card>
              </section>
            ))}
          </>
        )}
      </main>
    </div>
  )
}
