'use client'

import { useTheme } from '@/components/FestivalThemeProvider'

// Initials-only avatar (no avatar_url column on profiles yet) - same visual
// treatment as the artist-initial circle in app/log-show/page.tsx, reused
// here for people rather than artists.
export function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const T = useTheme()
  return (
    <div style={{
      width: size, height: size, flexShrink: 0, borderRadius: '50%',
      background: T.cardInner, border: '1px solid rgba(74,53,40,0.15)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <span style={{ fontFamily: T.serif, fontSize: size * 0.4, fontWeight: 700, color: T.faint }}>
        {name.charAt(0).toUpperCase()}
      </span>
    </div>
  )
}
