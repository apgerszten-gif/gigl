'use client'

import { useRouter } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { Card, btnPrimary } from '@/components/ui'

export function BattleModeUnlockedModal({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter()

  return (
    <div className="fixed inset-0 z-[100] bg-ink/55 flex items-center justify-center p-6">
      <Card className="w-full max-w-[360px] px-6 py-7 text-center">
        <span className="mx-auto mb-3 w-12 h-12 rounded-full bg-accent/10 border-1.5 border-accent/30 text-accent flex items-center justify-center">
          <Trophy className="w-6 h-6" strokeWidth={1.75} />
        </span>
        <h2 className="font-display text-[22px] font-bold leading-tight mb-2">
          Battle Mode unlocked<span className="text-accent">!</span>
        </h2>
        <p className="text-[13px] text-ink-muted leading-relaxed mb-6">
          You&apos;ve logged 10 shows. Battle your favorites head to head and crown a champion.
        </p>

        <button type="button" onClick={() => router.push('/battle')} className={`${btnPrimary} w-full py-3.5 text-xs mb-2.5`}>
          Start a battle
        </button>
        <button type="button" onClick={onDismiss} className="p-2 text-xs text-ink-muted underline underline-offset-[3px]">
          Maybe later
        </button>
      </Card>
    </div>
  )
}
