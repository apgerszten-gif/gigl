'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/components/FestivalThemeProvider'

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
  const T = useTheme()
  const router = useRouter()
  const [open, setOpen] = useState(false)

  if (wins + losses === 0) return null

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontSize: 10, color: T.muted, fontFamily: T.sans, fontWeight: 600,
          marginLeft: 6, whiteSpace: 'nowrap',
        }}
      >
        🏆 {wins}-{losses}
      </button>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 40,
            width: 216, background: T.card, border: T.cardBorder, boxShadow: T.cardShadow,
            borderRadius: 5, padding: '12px 14px', fontSize: 11.5, color: '#4A3528', lineHeight: 1.45,
          }}
        >
          {unlocked ? (
            context === 'aggregate' ? (
              <>🏆 {artistName} has been battled {wins + losses} time{wins + losses === 1 ? '' : 's'} across Gigl — {wins} win{wins === 1 ? '' : 's'}, {losses} loss{losses === 1 ? '' : 'es'} head to head.</>
            ) : (
              <>🏆 You&apos;ve battled {artistName} {wins + losses} time{wins + losses === 1 ? '' : 's'} — {wins} win{wins === 1 ? '' : 's'}, {losses} loss{losses === 1 ? '' : 'es'}.</>
            )
          ) : (
            <>🏆 Battle Mode lets you pit your favorite sets head to head and crown a champion. It unlocks once you&apos;ve logged 10 shows.</>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
            {unlocked && (
              <button onClick={() => router.push('/battle')} style={{
                background: 'none', border: 'none', color: T.accent, fontSize: 10.5, fontWeight: 700,
                cursor: 'pointer', padding: 0, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.sans,
              }}>Battle</button>
            )}
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', color: T.muted, fontSize: 10.5, fontWeight: 700,
              cursor: 'pointer', padding: 0, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: T.sans,
            }}>Got it</button>
          </div>
        </div>
      )}
    </span>
  )
}
