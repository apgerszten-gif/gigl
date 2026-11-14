'use client'

import { Trophy } from 'lucide-react'
import { Card, Chip, btnPrimary } from '@/components/ui'

// The invitation to Battle Mode, on Feed and Rankings once someone has
// logged 10 shows. It is the only invitation: nothing pops up over a log,
// and nobody sees Battle Mode before then. It says what a battle is, that
// it's optional, and "Not for me" puts it away for good
// (profiles.battle_card_dismissed).
export function BattleModeCard({
  onDismiss, onEnter,
}: {
  onDismiss?: () => void
  onEnter: () => void
}) {
  return (
    <Card className="p-3.5 space-y-3">
      <div className="flex items-start gap-3">
        <span className="w-10 h-10 flex-shrink-0 rounded-card bg-accent/10 border-1.5 border-accent/30 text-accent flex items-center justify-center">
          <Trophy className="w-5 h-5" strokeWidth={1.75} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-display text-sm font-bold">Battle Mode</p>
            <Chip compact>Optional</Chip>
          </div>
          <p className="mt-1 text-[12px] leading-snug text-ink-muted">
            Two shows you&apos;ve logged, head to head: pick the one that hit harder. Each pick adds to a
            win-loss record on Rankings and your profile.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <button type="button" onClick={onEnter} className={`${btnPrimary} px-3.5 py-2 text-[10px]`}>Try a battle</button>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="text-[12px] font-semibold text-ink-muted underline underline-offset-[3px]"
          >
            Not for me
          </button>
        )}
      </div>
    </Card>
  )
}
