'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { SignUpSheet } from '@/components/SignUpSheet'
import { fetchFollowedNames, followKey, followName, unfollowName, type FollowedName } from './followedNames'

// The artists and venues the signed-in person follows, and the toggle a
// Follow button calls. Signed out, the toggle opens the sign-up sheet and the
// follow goes through once it hands back an account, the way Save does
// (lib/useShowSaving.tsx).
export function useFollowedNames() {
  const { user, loading: authLoading } = useAuth()

  const [follows, setFollows] = useState<FollowedName[]>([])
  const [loaded, setLoaded]   = useState(false)
  const [failed, setFailed]   = useState(false)
  const [pending, setPending] = useState<FollowedName | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { setFollows([]); setLoaded(true); return }
    setLoaded(false)
    fetchFollowedNames(user.id)
      .then(list => setFollows(list))
      .catch(err => console.error('followed artists and venues failed:', err))
      .finally(() => setLoaded(true))
  }, [authLoading, user?.id])

  const keys = new Set(follows.map(followKey))
  const isFollowing = (follow: FollowedName) => keys.has(followKey(follow))

  async function store(userId: string, follow: FollowedName, on: boolean) {
    setFailed(false)
    const key = followKey(follow)
    setFollows(list => on ? [...list.filter(f => followKey(f) !== key), follow] : list.filter(f => followKey(f) !== key))
    try {
      if (on) await followName(userId, follow)
      else await unfollowName(userId, follow)
    } catch (err) {
      console.error(on ? 'following failed:' : 'unfollowing failed:', err)
      setFailed(true)
      setFollows(list => on ? list.filter(f => followKey(f) !== key) : [...list, follow])
    }
  }

  function toggle(follow: FollowedName) {
    if (!user) { setPending(follow); return }
    store(user.id, follow, !isFollowing(follow))
  }

  const signUpSheet = pending && (
    <SignUpSheet
      title={`Follow ${pending.name}`}
      blurb="Make an account to follow artists and venues. Their shows near you collect under Following on the Upcoming tab."
      onClose={() => setPending(null)}
      onSignedIn={userId => {
        const follow = pending
        setPending(null)
        store(userId, follow, true)
      }}
    />
  )

  return { follows, loaded, failed, isFollowing, toggle, signUpSheet }
}
