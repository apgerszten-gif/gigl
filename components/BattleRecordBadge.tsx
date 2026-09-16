'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'

// Small inline W-L indicator shown next to a show's star rating. Purely a
// display of battle_records data - never reads or writes performance_rating/
// venue_rating/crowd_rating. `context` controls copy only:
// 'aggregate' = this artist's all-time record across every user (Feed),
// 'personal' = the viewer's own record with this artist (Profile).
export function BattleRecordBadge({
  wins, losses, unlocked, context, artistName,
}: {
  wins: number
  losses: number
  unlocked: boolean
  context: 'aggregate' | 'personal'
  artistName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (wins + losses === 0) return null

  return (
    <span className="relative inline-block">
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="inline-flex items-center gap-0.5 whitespace-nowrap text-[10px] font-semibold text-ink-muted"
      >
        <Trophy className="w-3 h-3" strokeWidth={2} /> {wins}-{losses}
      </button>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute top-full right-0 mt-1.5 z-40 w-[216px] rounded-card border-1.5 border-ink bg-cream shadow-riso px-3.5 py-3 text-[11.5px] leading-snug text-ink"
        >
          {unlocked ? (
            context === 'aggregate' ? (
              <>{artistName} has been battled {wins + losses} time{wins + losses === 1 ? '' : 's'} across Gigl: {wins} win{wins === 1 ? '' : 's'}, {losses} loss{losses === 1 ? '' : 'es'} head to head.</>
            ) : (
              <>You&apos;ve battled {artistName} {wins + losses} time{wins + losses === 1 ? '' : 's'}: {wins} win{wins === 1 ? '' : 's'}, {losses} loss{losses === 1 ? '' : 'es'}.</>
            )
          ) : (
            <>Battle Mode lets you pit your favorite sets head to head and crown a champion. It unlocks once you&apos;ve logged 10 shows.</>
          )}
          <div className="flex gap-3 mt-2.5 text-[10px] font-bold uppercase tracking-label">
            {unlocked && (
              <button type="button" onClick={() => router.push('/battle')} className="text-accent">Battle</button>
            )}
            <button type="button" onClick={() => setOpen(false)} className="text-ink-muted">Got it</button>
          </div>
        </div>
      )}
    </span>
  )
}
