'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/FestivalThemeProvider'

export function FirstShowCelebration({ username }: { username: string | null }) {
  const router = useRouter()
  const T = useTheme()
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(74,53,40,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 24,
    }}>
      <div style={{
        background: T.card, borderRadius: 8, border: T.cardBorder, boxShadow: T.cardShadow,
        padding: '28px 24px', maxWidth: 360, width: '100%', textAlign: 'center', fontFamily: T.sans,
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🎉</div>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: '#4A3528', marginBottom: 8, lineHeight: 1.2 }}>
          You logged your first show<span style={{ color: T.accent }}>!</span>
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, marginBottom: 24 }}>
          Bring your friends in on it — see who&apos;s rating what, together.
        </div>

        <button onClick={handleShare} style={{
          width: '100%', background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
          borderRadius: 5, padding: 14, cursor: 'pointer', marginBottom: 10,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#FAF3E2', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>
            {copied ? 'Link copied!' : 'Share with friends'}
          </span>
        </button>

        <button onClick={() => router.push('/log')} style={{
          width: '100%', background: 'none', border: T.cardBorder,
          borderRadius: 5, padding: 14, cursor: 'pointer', marginBottom: 10,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#4A3528', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>
            Log another show
          </span>
        </button>

        <button onClick={() => router.push('/feed')} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <span style={{ fontSize: 12, color: T.muted, fontFamily: T.sans, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Back to feed
          </span>
        </button>
      </div>
    </div>
  )
}
