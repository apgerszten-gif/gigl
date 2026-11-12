'use client'

import { useAuth } from '@/components/AuthProvider'

// The consent line wherever a show can be saved. Saving with a phone account
// means a text the morning after asking how it was (lib/reviewTexts.ts), and
// this is what tells people before they tap. Hidden for older email accounts,
// which have no number to text. Turning it off lives on You.
export function TextReminderNote({ className = '' }: { className?: string }) {
  const { user, loading } = useAuth()
  if (loading || (user && !user.phone)) return null
  return (
    <p className={`text-[11px] leading-snug text-ink-faint ${className}`}>
      Saving a show means we&apos;ll text you the morning after to review it. Message and data rates may apply. Reply STOP to opt out.
    </p>
  )
}
