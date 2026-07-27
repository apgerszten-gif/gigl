'use client'

import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/FestivalThemeProvider'

export function BattleModeUnlockedModal({ onDismiss }: { onDismiss: () => void }) {
  const router = useRouter()
  const T = useTheme()

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(74,53,40,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
    }}>
      <div style={{
        background: T.card, borderRadius: 8, border: T.cardBorder, boxShadow: T.cardShadow,
        padding: '28px 24px', maxWidth: 360, width: '100%', textAlign: 'center', fontFamily: T.sans,
      }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>🏆</div>
        <div style={{ fontFamily: T.serif, fontSize: 22, fontWeight: 700, color: '#4A3528', marginBottom: 8, lineHeight: 1.2 }}>
          Battle Mode unlocked<span style={{ color: T.accent }}>!</span>
        </div>
        <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5, marginBottom: 24 }}>
          You&apos;ve logged 10 shows. Battle your favorites head to head and crown a champion.
        </div>

        <button onClick={() => router.push('/battle')} style={{
          width: '100%', background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
          borderRadius: 5, padding: 14, cursor: 'pointer', marginBottom: 10,
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#FAF3E2', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: T.sans }}>
            Start a battle
          </span>
        </button>

        <button onClick={onDismiss} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>
          <span style={{ fontSize: 12, color: T.muted, fontFamily: T.sans, textDecoration: 'underline', textUnderlineOffset: 3 }}>
            Maybe later
          </span>
        </button>
      </div>
    </div>
  )
}
