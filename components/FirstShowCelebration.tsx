'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PartyPopper } from 'lucide-react'
import { Card, btnPrimary, btnSecondary } from '@/components/ui'

export function FirstShowCelebration({ username }: { username: string | null }) {
  const router = useRouter()
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const origin = window.location.origin
    const url = username ? `${origin}/?ref=${encodeURIComponent(username)}` : origin

    if (navigator.share) {
      try {
        await navigator.share({ title: 'Gigl', text: 'Come rate shows with me on Gigl', url })
      } catch {
        // user backed out of the native share sheet — nothing to do
      }
      return
    }

    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <div className="fixed inset-0 z-[100] bg-ink/55 flex items-center justify-center p-6">
      <Card className="w-full max-w-[360px] px-6 py-7 text-center">
        <span className="mx-auto mb-3 w-12 h-12 rounded-full bg-accent/10 border-1.5 border-accent/30 text-accent flex items-center justify-center">
          <PartyPopper className="w-6 h-6" strokeWidth={1.75} />
        </span>
        <h2 className="font-display text-[22px] font-bold leading-tight mb-2">
          You logged your first show<span className="text-accent">!</span>
        </h2>
        <p className="text-[13px] text-ink-muted leading-relaxed mb-6">
          Bring your friends in on it and see who&apos;s rating what, together.
        </p>

        <button type="button" onClick={handleShare} className={`${btnPrimary} w-full py-3.5 text-xs mb-2.5`}>
          {copied ? 'Link copied!' : 'Share with friends'}
        </button>
        <button type="button" onClick={() => router.push('/select-festival?mode=log')} className={`${btnSecondary} w-full py-3.5 text-xs mb-2.5`}>
          Log another show
        </button>
        <button type="button" onClick={() => router.push('/feed')} className="p-2 text-xs text-ink-muted underline underline-offset-[3px]">
          Back to feed
        </button>
      </Card>
    </div>
  )
}
