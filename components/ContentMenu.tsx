'use client'

import { useEffect, useState } from 'react'
import { Ban, Ellipsis, Flag, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { REPORT_REASONS, type ReportKind, type ReportReason } from '@/lib/reports'
import { ErrorNote, btnDanger, btnPrimary, btnQuiet, inputBox } from '@/components/ui'

// The ••• beside someone else's log, comment or profile: report it, or block
// whoever posted it. Apple won't list an app with user posts without both
// (guideline 1.2). Reports land in public.reports for /admin; a block is a
// row in public.blocks, which the read policies use to hide each person's
// logs and comments from the other (supabase-schema.sql).
//
// Renders nothing on your own things or while signed out: reporting and
// blocking both need to know who's asking.

type Step = 'menu' | 'report' | 'reported' | 'block' | 'blocked' | 'unblocked'

const NOUN: Record<ReportKind, string> = { log: 'log', comment: 'comment', profile: 'profile' }

export function ContentMenu({
  kind, targetId, ownerId, ownerName, onBlocked, className = '',
}: {
  kind:      ReportKind
  targetId:  string
  ownerId:   string
  ownerName: string | null
  // Lets a list drop the blocked person's posts straight away, rather than
  // on its next load.
  onBlocked?: (userId: string) => void
  className?: string
}) {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  if (!user || user.id === ownerId) return null

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Report or block${ownerName ? ` @${ownerName}` : ''}`}
        className={`-m-1 p-1 flex-shrink-0 text-ink-faint ${className}`}
      >
        <Ellipsis className="w-4 h-4" strokeWidth={2} />
      </button>
      {open && (
        <ContentMenuSheet
          kind={kind}
          targetId={targetId}
          ownerId={ownerId}
          ownerName={ownerName}
          viewerId={user.id}
          onBlocked={onBlocked}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function ContentMenuSheet({
  kind, targetId, ownerId, ownerName, viewerId, onBlocked, onClose,
}: {
  kind: ReportKind; targetId: string; ownerId: string; ownerName: string | null; viewerId: string
  onBlocked?: (userId: string) => void
  onClose: () => void
}) {
  const supabase = createClient()
  const who = ownerName ? `@${ownerName}` : 'this person'

  // Mounted at translateY(100%), flipped a tick after mount so the
  // transition animates (same as SignUpSheet and TagFriendsModal).
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10)
    return () => clearTimeout(t)
  }, [])

  const [step, setStep]       = useState<Step>('menu')
  const [reason, setReason]   = useState<ReportReason | null>(null)
  const [details, setDetails] = useState('')
  const [busy, setBusy]       = useState(false)
  const [error, setError]     = useState<string | null>(null)
  // Whether you've already blocked them, which turns Block into Unblock.
  // Only server-rendered pages (profiles, artist pages) still show a blocked
  // person's posts, so this is mostly for those.
  const [blocked, setBlocked] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.from('blocks').select('blocked_id').eq('blocker_id', viewerId).eq('blocked_id', ownerId).maybeSingle()
      .then(({ data }) => { if (!cancelled) setBlocked(!!data) })
    return () => { cancelled = true }
  }, [viewerId, ownerId])

  function go(next: Step) {
    setError(null)
    setStep(next)
  }

  async function sendReport() {
    if (!reason || busy) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('reports').insert({
      reporter_id: viewerId,
      kind,
      target_id:   targetId,
      reason,
      details:     details.trim() || null,
    })
    setBusy(false)
    // 23505: this person already reported this, which is just as good.
    if (error && error.code !== '23505') {
      console.error('reports insert failed:', error.message)
      setError("Couldn't send your report. Try again in a moment.")
      return
    }
    go('reported')
  }

  async function block() {
    if (busy) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('blocks').insert({ blocker_id: viewerId, blocked_id: ownerId })
    setBusy(false)
    if (error && error.code !== '23505') {
      console.error('blocks insert failed:', error.message)
      setError(`Couldn't block ${who}. Try again in a moment.`)
      return
    }
    setBlocked(true)
    go('blocked')
    onBlocked?.(ownerId)
  }

  async function unblock() {
    if (busy) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('blocks').delete().eq('blocker_id', viewerId).eq('blocked_id', ownerId)
    setBusy(false)
    if (error) {
      console.error('blocks delete failed:', error.message)
      setError(`Couldn't unblock ${who}. Try again in a moment.`)
      return
    }
    setBlocked(false)
    go('unblocked')
  }

  const title = {
    menu:      kind === 'profile' ? who : `${ownerName ? `@${ownerName}’s` : 'This'} ${NOUN[kind]}`,
    report:    kind === 'profile' ? `Report ${who}` : `Report this ${NOUN[kind]}`,
    reported:  'Thanks for telling us',
    block:     `Block ${who}?`,
    blocked:   `${ownerName ? `@${ownerName}` : 'They'} is blocked`,
    unblocked: `${ownerName ? `@${ownerName}` : 'They'} is unblocked`,
  }[step]

  const row = 'w-full flex items-center gap-3 px-1 py-3.5 text-left text-[14px] font-semibold'

  return (
    <div className="fixed inset-0 z-[120] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className={`absolute inset-0 bg-ink/55 transition-opacity duration-[280ms] ${shown ? 'opacity-100' : 'opacity-0'}`}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative w-full max-w-md max-h-full overflow-y-auto rounded-t-card border-1.5 border-b-0 border-ink bg-paper text-ink px-5 pt-4 pb-[calc(20px+env(safe-area-inset-bottom))] transition-transform duration-[280ms] ease-out ${
          shown ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="flex items-start gap-3">
          <h2 className="flex-1 min-w-0 font-display text-xl font-bold tracking-tight leading-tight break-words">
            {title}<span className="text-accent">{step === 'block' ? '' : '.'}</span>
          </h2>
          <button type="button" onClick={onClose} aria-label="Close" className="-mr-1 p-1 text-ink-muted">
            <X className="w-5 h-5" strokeWidth={2} />
          </button>
        </div>

        {step === 'menu' && (
          <div className="mt-2 divide-y divide-ink/10">
            <button type="button" onClick={() => go('report')} className={row}>
              <Flag className="w-4 h-4 text-ink-muted" strokeWidth={2} />
              {kind === 'profile' ? `Report ${who}` : `Report this ${NOUN[kind]}`}
            </button>
            {blocked ? (
              <button type="button" onClick={unblock} disabled={busy} className={row}>
                <Ban className="w-4 h-4 text-ink-muted" strokeWidth={2} />
                {busy ? 'Unblocking…' : `Unblock ${who}`}
              </button>
            ) : (
              <button type="button" onClick={() => go('block')} disabled={blocked === null} className={`${row} text-[#B03030] disabled:opacity-50`}>
                <Ban className="w-4 h-4" strokeWidth={2} />
                Block {who}
              </button>
            )}
          </div>
        )}

        {step === 'report' && (
          <div className="mt-3 space-y-3">
            <p className="text-[13px] leading-snug text-ink-muted">
              What&apos;s wrong with it? {ownerName ? `@${ownerName} won't` : "They won't"} know who reported it.
            </p>
            <div className="flex flex-col gap-1.5">
              {REPORT_REASONS.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setReason(r.value)}
                  aria-pressed={reason === r.value}
                  className={`rounded-card border-1.5 px-3.5 py-2.5 text-left text-[13px] font-semibold ${
                    reason === r.value ? 'border-accent bg-accent/10 text-accent' : 'border-ink/15 bg-cream text-ink'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
            <textarea
              value={details}
              onChange={e => setDetails(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Anything else we should know? (optional)"
              className={`${inputBox} block w-full resize-none px-3 py-2.5 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40`}
            />
            {error && <ErrorNote>{error}</ErrorNote>}
            <button type="button" onClick={sendReport} disabled={!reason || busy} className={`${btnPrimary} w-full py-3.5 text-xs`}>
              {busy ? 'Sending…' : 'Send report'}
            </button>
          </div>
        )}

        {step === 'reported' && (
          <div className="mt-2 space-y-3">
            <p className="text-[13px] leading-snug text-ink-muted">
              We look at every report within 24 hours and take down anything that breaks Gigl&apos;s rules.
            </p>
            {!blocked && (
              <button type="button" onClick={() => go('block')} className={`${btnDanger} w-full py-3 text-xs`}>
                Block {who} too
              </button>
            )}
            <button type="button" onClick={onClose} className={`${btnQuiet} w-full py-3 text-xs`}>Done</button>
          </div>
        )}

        {step === 'block' && (
          <div className="mt-2 space-y-3">
            <p className="text-[13px] leading-snug text-ink-muted">
              You won&apos;t see each other&apos;s logs or comments on Gigl, and you&apos;ll stop following each other.
              {' '}{ownerName ? `@${ownerName} won't` : "They won't"} be told.
            </p>
            {error && <ErrorNote>{error}</ErrorNote>}
            <div className="flex gap-2">
              <button type="button" onClick={onClose} disabled={busy} className={`${btnQuiet} flex-1 py-3 text-xs`}>Cancel</button>
              <button type="button" onClick={block} disabled={busy} className={`${btnDanger} flex-1 py-3 text-xs`}>
                {busy ? 'Blocking…' : 'Block'}
              </button>
            </div>
          </div>
        )}

        {(step === 'blocked' || step === 'unblocked') && (
          <div className="mt-2 space-y-3">
            <p className="text-[13px] leading-snug text-ink-muted">
              {step === 'blocked'
                ? `Their logs and comments are hidden from you. You can unblock ${ownerName ? `@${ownerName}` : 'them'} from their profile.`
                : 'You can see each other’s logs and comments again. Neither of you is following the other any more.'}
            </p>
            <button type="button" onClick={onClose} className={`${btnQuiet} w-full py-3 text-xs`}>Done</button>
          </div>
        )}

        {step === 'menu' && error && <div className="mt-2"><ErrorNote>{error}</ErrorNote></div>}
      </div>
    </div>
  )
}
