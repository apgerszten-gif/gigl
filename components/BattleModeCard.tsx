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
          position: 'absolute', top: 6, right: 6, width: 22, height: 22,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: T.bg, border: '1.5px solid #4A3528',
          borderRadius: '50%', boxShadow: '0 1px 3px rgba(74,53,40,0.25)',
          cursor: 'pointer', color: '#4A3528', fontSize: 13, fontWeight: 700, padding: 0, lineHeight: 1,
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
