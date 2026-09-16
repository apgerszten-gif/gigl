'use client'

import { useRouter } from 'next/navigation'
import { Logo } from '@/components/Logo'
import { BackHeader } from '@/components/ui'

export function LegalPageShell({ title, updated, children }: {
  title: string; updated: string; children: React.ReactNode
}) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-paper text-ink">
      <BackHeader title={<Logo />} onBack={() => router.back()} />

      <div className="px-5 pt-6 pb-20">
        <h1 className="font-display text-[26px] font-bold tracking-tight leading-tight mb-1">{title}</h1>
        <p className="text-[11px] text-ink-muted mb-5">{updated}</p>
        <div className="text-[13px] leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  )
}

// Body blocks for the legal pages.
export function LegalH2({ children }: { children: React.ReactNode }) {
  return <h2 className="font-display text-base font-bold mt-6 mb-2">{children}</h2>
}

export function LegalP({ children }: { children: React.ReactNode }) {
  return <p className="mb-3">{children}</p>
}

export function LegalUl({ children }: { children: React.ReactNode }) {
  return <ul className="mb-3 pl-5 list-disc">{children}</ul>
}
