'use client'

import { Trophy, X } from 'lucide-react'
import { Card, btnPrimary } from '@/components/ui'

export function BattleModeCard({
  onDismiss, onEnter,
}: {
  onDismiss?: () => void
  onEnter: () => void
}) {
  return (
    <Card className="relative p-3.5 flex items-center gap-3">
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss Battle Mode card"
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-paper border-1.5 border-ink flex items-center justify-center"
        >
          <X className="w-3 h-3" strokeWidth={3} />
        </button>
      )}
      <span className="w-10 h-10 flex-shrink-0 rounded-card bg-accent/10 border-1.5 border-accent/30 text-accent flex items-center justify-center">
        <Trophy className="w-5 h-5" strokeWidth={1.75} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-sm font-bold">Battle Mode</p>
        <p className="text-[11px] text-ink-muted">Crown your #1 set</p>
      </div>
      <button type="button" onClick={onEnter} className={`${btnPrimary} px-3.5 py-2 text-[10px]`}>Battle</button>
    </Card>
  )
}
