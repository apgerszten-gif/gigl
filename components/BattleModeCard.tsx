'use client'

import { useTheme } from '@/components/FestivalThemeProvider'

export function BattleModeCard({
  onDismiss, onEnter,
}: {
  onDismiss?: () => void
  onEnter: () => void
}) {
  const T = useTheme()

  return (
    <div style={{
      position: 'relative', background: T.card, border: T.cardBorder, boxShadow: T.cardShadow,
      borderRadius: 5, padding: '14px 16px', marginBottom: 12,
      display: 'flex', alignItems: 'center', gap: 12,
    }}>
      {onDismiss && (
        <button onClick={onDismiss} aria-label="Dismiss Battle Mode card" style={{
          position: 'absolute', top: 6, right: 8, background: 'none', border: 'none',
          cursor: 'pointer', color: T.faint, fontSize: 15, padding: 4, lineHeight: 1,
        }}>×</button>
      )}
      <div style={{ fontSize: 28, flexShrink: 0 }}>🏆</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: T.serif, fontSize: 14, fontWeight: 700, color: '#4A3528' }}>Battle Mode</div>
        <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>Crown your #1 set</div>
      </div>
      <button onClick={onEnter} style={{
        background: T.accent, border: '1.5px solid #4A3528', borderRadius: 5,
        padding: '8px 14px', color: '#FAF3E2', fontSize: 10, fontWeight: 700,
        cursor: 'pointer', fontFamily: T.sans, letterSpacing: '0.06em',
        textTransform: 'uppercase', flexShrink: 0,
      }}>Battle</button>
    </div>
  )
}
