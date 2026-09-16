'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { btnPrimary } from '@/components/ui'

// Asymmetric follow graph (public.follows) - no confirmation needed on
// either side, matching the model decided for this app. Renders nothing
// while logged out or on the viewer's own profile.
export function FollowButton({ targetUserId }: { targetUserId: string }) {
  const supabase = createClient()
  const { user } = useAuth()

  const [isFollowing, setIsFollowing] = useState<boolean | null>(null)
  const [pending, setPending]         = useState(false)
  const [hovering, setHovering]       = useState(false)

  useEffect(() => {
    if (!user || user.id === targetUserId) return
    let cancelled = false
    supabase.from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', targetUserId)
      .maybeSingle()
      .then(({ data }) => { if (!cancelled) setIsFollowing(!!data) })
    return () => { cancelled = true }
  }, [user, targetUserId])

  if (!user || user.id === targetUserId || isFollowing === null) return null

  async function toggle() {
    if (pending) return
    const next = !isFollowing
    setPending(true)
    setIsFollowing(next)

    const { error } = next
      ? await supabase.from('follows').insert({ follower_id: user!.id, following_id: targetUserId })
      : await supabase.from('follows').delete().eq('follower_id', user!.id).eq('following_id', targetUserId)

    if (error) setIsFollowing(!next)
    setPending(false)
  }

  const label = isFollowing ? (hovering ? 'Unfollow' : 'Following') : 'Follow'

  return (
    <button
      type="button"
      onClick={toggle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={pending}
      className={`flex-shrink-0 px-3 py-1.5 text-[10px] ${
        isFollowing
          ? `inline-flex items-center rounded-card border-1.5 bg-cream font-bold uppercase tracking-label disabled:opacity-50 ${
              hovering ? 'border-[#B03030]/40 text-[#B03030]' : 'border-ink text-ink'
            }`
          : btnPrimary
      }`}
    >
      {label}
    </button>
  )
}
