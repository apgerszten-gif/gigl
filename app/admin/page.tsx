'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { AdminLog, AdminStats } from '@/lib/adminStats'
import {
  BackHeader, Card, Chip, EmptyState, ErrorNote, Label, LoadingLabel, Place, Segmented, Stars, Stat,
  btnPrimary, btnQuiet, placeOf,
} from '@/components/ui'

// The owner's control room: today's QR funnel, whether texts are getting
// through, the sign-up switch, and the latest logs with a way to take one
// down. The /api/admin routes decide who gets in (lib/adminAuth.ts); this
// page only shows what they return.

const REFRESH_MS = 30_000

type Status = 'loading' | 'ready' | 'signed-out' | 'not-admin' | 'error'
type Method = 'phone' | 'email'

function ago(iso: string, now: number): string {
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.round(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.round(h / 24)}d ago`
}

const euro = (n: number) => `€${n.toFixed(2)}`
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export default function AdminPage() {
  const supabase = createClient()

  const [status, setStatus]         = useState<Status>('loading')
  const [stats, setStats]           = useState<AdminStats | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [now, setNow]               = useState(() => Date.now())
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [removing, setRemoving]     = useState<string | null>(null)

  const call = useCallback(async (path: string, init?: RequestInit) => {
    const { data: { session } } = await supabase.auth.getSession()
    return fetch(path, {
      ...init,
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token ?? ''}` },
    })
  }, [supabase])

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const res = await call('/api/admin/stats')
      if (res.status === 401) { setStatus('signed-out'); return }
      if (res.status === 403) { setStatus('not-admin'); return }
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setStats(data)
      setError(null)
      setStatus('ready')
    } catch (err) {
      // Keep showing the last numbers; say they're stale.
      setError(err instanceof Error && err.message ? err.message : "Couldn't reach the server. Trying again shortly.")
      setStatus(s => (s === 'ready' ? s : 'error'))
    } finally {
      setRefreshing(false)
    }
  }, [call])

  // Every 30 seconds while the page is on screen, and straight away when
  // it comes back to the front (a phone pulled out of a pocket).
  useEffect(() => {
    load()
    const refresh = setInterval(() => { if (document.visibilityState === 'visible') load() }, REFRESH_MS)
    const tick = setInterval(() => setNow(Date.now()), 5_000)
    const onVisible = () => { if (document.visibilityState === 'visible') load() }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(refresh)
      clearInterval(tick)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [load])

  async function switchSignup(next: Method) {
    if (!stats || saving || next === stats.signupMethod) return
    const question = next === 'email'
      ? 'Switch sign-up to email and password? New visitors get it within seconds.'
      : 'Switch sign-up back to phone numbers?'
    if (!window.confirm(question)) return

    setSaving(true)
    const res = await call('/api/admin/settings', { method: 'POST', body: JSON.stringify({ signupMethod: next }) })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { setError(data.error ?? "Couldn't save the switch."); return }
    setError(null)
    setStats(s => s && { ...s, signupMethod: data.signupMethod })
  }

  async function removeLog(log: AdminLog) {
    const whose = log.username ? `@${log.username}'s` : 'this'
    if (!window.confirm(`Remove ${whose} log of ${log.artistName}? This can't be undone.`)) return

    setRemoving(log.id)
    const res = await call(`/api/admin/logs/${log.id}`, { method: 'DELETE' })
    const data = await res.json().catch(() => ({}))
    setRemoving(null)
    // 404 means someone else already removed it; either way it's gone.
    if (!res.ok && res.status !== 404) { setError(data.error ?? "Couldn't remove the log."); return }
    setStats(s => s && { ...s, latestLogs: s.latestLogs.filter(l => l.id !== log.id) })
  }

  const header = (
    <BackHeader
      title="Admin"
      href="/feed"
      right={stats && (
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          aria-label="Refresh"
          className="flex items-center gap-1.5 text-[11px] text-ink-muted"
        >
          {ago(stats.generatedAt, now)}
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} strokeWidth={2} />
        </button>
      )}
    />
  )

  if (status !== 'ready' || !stats) {
    return (
      <div className="min-h-screen bg-paper text-ink">
        {header}
        <div className="px-4 pt-6 max-w-md mx-auto">
          {status === 'loading' && <LoadingLabel />}
          {status === 'signed-out' && (
            <EmptyState>
              Sign in with an admin account to see this page, then come back to /admin.
              <div className="mt-4">
                <Link href="/auth" className={`${btnPrimary} px-4 py-2.5 text-[11px]`}>Sign in</Link>
              </div>
            </EmptyState>
          )}
          {status === 'not-admin' && <EmptyState>This page is only for Gigl&apos;s admin accounts.</EmptyState>}
          {status === 'error' && <ErrorNote>{error}</ErrorNote>}
        </div>
      </div>
    )
  }

  const t = stats.today
  // Many numbers asking for a code and few typing one in is what texts not
  // arriving looks like from here.
  const textsLookStuck = t.unfinishedNumbers >= 3 && t.unfinishedNumbers >= t.newNumbers / 2

  return (
    <div className="min-h-screen bg-paper text-ink pb-28">
      {header}
      <main className="px-4 pt-4 max-w-md mx-auto space-y-4">
        {error && <ErrorNote>{error}</ErrorNote>}

        <Card className="p-4 space-y-3">
          <Label>Today, San Diego time</Label>
          <div className="flex">
            <Stat value={t.scans} label="QR scans" />
            <Stat value={t.visitors} label="Visitors" />
            <Stat value={t.signups} label="Sign-ups" />
            <Stat value={t.logs} label="Logs" />
          </div>
          <p className="text-[12px] leading-snug text-ink-muted">
            {plural(t.phonesScanned, 'phone')} scanned, {t.visitorsFromQr} visitors came from a QR code.
            {' '}Sign-ups: {t.signupsByPhone} by phone, {t.signupsByEmail} by email, {t.signupsFromQr} from a QR code.
            {' '}{plural(t.crssdLogs, 'CRSSD log')}.
          </p>
          <p className="text-[12px] text-ink-muted">
            All time: {plural(stats.totals.accounts, 'account')}, {plural(stats.totals.logs, 'log')}.
          </p>
        </Card>

        <Card className="p-4 space-y-3">
          <Label>Texting</Label>
          <div className="flex">
            <Stat value={t.newNumbers} label="New numbers" />
            <Stat value={t.newNumbers - t.unfinishedNumbers} label="Entered code" />
            <Stat value={t.unfinishedNumbers} label="Didn't" />
          </div>
          {textsLookStuck && (
            <div className="rounded-card bg-accent/10 border-1.5 border-accent/30 px-3.5 py-2.5 text-[12px] leading-snug">
              Most new numbers today never entered their code. If people say texts aren&apos;t arriving, switch sign-up to
              email below.
            </div>
          )}
          <p className="text-[12px] leading-snug text-ink-muted">
            About {euro(t.preludeEur)} of Prelude credit used today, including{' '}
            {plural(t.returningPhoneSignIns, 'returning sign-in')}. At least {euro(stats.totals.preludeEurAtLeast)} in total.
          </p>
          <a
            href="https://app.prelude.so"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-accent"
          >
            Check the balance on Prelude <ExternalLink className="w-3.5 h-3.5" strokeWidth={2} />
          </a>
        </Card>

        <Card className="p-4 space-y-3">
          <Label>Sign-up method</Label>
          {stats.signupMethod === null ? (
            <ErrorNote>The switch needs its settings table. Run the app_settings SQL in Supabase, then refresh.</ErrorNote>
          ) : (
            <>
              <Segmented<Method>
                options={[{ value: 'phone', label: 'Phone' }, { value: 'email', label: 'Email' }]}
                value={stats.signupMethod}
                onChange={switchSignup}
              />
              <p className="text-[12px] leading-snug text-ink-muted">
                {saving ? 'Saving…' : stats.signupMethod === 'phone'
                  ? 'New people sign up with a texted code. If texts stop arriving, switch to email. It takes effect in seconds, with no deploy.'
                  : 'New people sign up with email and a password, the way it worked before phone sign-up. Switch back once texts are arriving again.'}
              </p>
            </>
          )}
        </Card>

        <section className="space-y-2">
          <Label className="px-1">Latest logs</Label>
          {stats.latestLogs.length === 0 ? (
            <EmptyState>No logs yet.</EmptyState>
          ) : stats.latestLogs.map(log => {
            const place = placeOf(log)
            return (
              <Card key={log.id} flat className="p-3 flex gap-3">
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="text-[11px] text-ink-muted truncate">
                    {log.username
                      ? <Link href={`/u/${log.username}`} className="font-semibold text-ink">@{log.username}</Link>
                      : 'No username'}
                    {' · '}{ago(log.createdAt, now)}
                    {log.crssd && ' · CRSSD'}
                    {log.photos > 0 && ` · ${plural(log.photos, 'photo')}`}
                  </p>
                  <p className="font-display text-[15px] font-bold leading-tight truncate">{log.artistName}</p>
                  {place && <Place>{place}</Place>}
                  {log.score > 0 && <Stars score={log.score} size={12} />}
                  {log.review && <p className="text-[13px] leading-snug line-clamp-3">{log.review}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => removeLog(log)}
                  disabled={removing === log.id}
                  className={`${btnQuiet} self-start px-2.5 py-1.5 text-[10px]`}
                >
                  {removing === log.id ? 'Removing…' : 'Remove'}
                </button>
              </Card>
            )
          })}
        </section>

        <section className="space-y-2">
          <Label className="px-1">Latest sign-ups</Label>
          <Card flat className="divide-y divide-ink/10">
            {stats.latestSignups.map(s => (
              <div key={s.id} className="px-3 py-2.5 flex items-center gap-1.5">
                <p className="flex-1 min-w-0 text-[13px] truncate">
                  {s.username
                    ? <Link href={`/u/${s.username}`} className="font-semibold">@{s.username}</Link>
                    : <span className="text-ink-muted">No username yet</span>}
                </p>
                <Chip compact>{s.method}</Chip>
                {s.fromQr && <Chip compact active>QR</Chip>}
                {s.unfinished && <Chip compact>No code</Chip>}
                <span className="w-14 text-right text-[11px] text-ink-faint">{ago(s.createdAt, now)}</span>
              </div>
            ))}
          </Card>
        </section>
      </main>
    </div>
  )
}
