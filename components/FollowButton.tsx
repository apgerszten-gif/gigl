'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/components/FestivalThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'

// Asymmetric follow graph (public.follows) - no confirmation needed on
// either side, matching the model decided for this app. Renders nothing
// while logged out or on the viewer's own profile.
export function FollowButton({ targetUserId }: { targetUserId: string }) {
  const T = useTheme()
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
      onClick={toggle}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      disabled={pending}
      style={{
        padding: '8px 16px', borderRadius: 20, flexShrink: 0,
        background: isFollowing ? 'none' : T.accent,
        border: isFollowing
          ? (hovering ? '1.5px solid rgba(160,40,40,0.4)' : T.cardBorder)
          : '1.5px solid #4A3528',
        cursor: pending ? 'default' : 'pointer',
        opacity: pending ? 0.7 : 1,
      }}
    >
      <span style={{
        fontSize: 11, fontWeight: 700, fontFamily: T.sans,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        color: isFollowing ? (hovering ? '#B03030' : '#4A3528') : '#FAF3E2',
      }}>{label}</span>
    </button>
  )
}
