'use client'

import { useRouter } from 'next/navigation'
import { DEFAULT_THEME as T } from '@/lib/theme'

export function LegalPageShell({ title, updated, children }: {
  title: string; updated: string; children: React.ReactNode
}) {
  const router = useRouter()

  return (
    <div style={{ minHeight: '100vh', background: T.bg, fontFamily: T.sans, color: '#4A3528', maxWidth: 430, margin: '0 auto' }}>
      <div style={{
        padding: '18px 24px 14px', position: 'sticky', top: 0, zIndex: 10,
        background: T.bgRgba, backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(74,53,40,0.12)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <button onClick={() => router.back()} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 700, color: '#4A3528', letterSpacing: '-0.3px' }}>
          Gigl<span style={{ color: T.accent }}>/</span>
        </div>
        <div style={{ width: 18 }} />
      </div>

      <div style={{ padding: '24px 24px 80px' }}>
        <div style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 700, letterSpacing: '-0.5px', marginBottom: 4, color: '#4A3528' }}>
          {title}
        </div>
        <div style={{ fontSize: 11, color: T.muted, marginBottom: 20 }}>{updated}</div>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: '#4A3528' }}>
          {children}
        </div>
      </div>
    </div>
  )
}
