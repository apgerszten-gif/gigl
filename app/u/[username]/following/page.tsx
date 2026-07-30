import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { PeopleListPage } from '@/components/PeopleList'

export default async function FollowingPage({ params }: { params: { username: string } }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', params.username)
    .single()

  if (!profile) notFound()

  const { data: followRows } = await supabase.from('follows').select('following_id').eq('follower_id', profile.id)
  const ids = (followRows ?? []).map(r => r.following_id)

  const people = ids.length > 0
    ? (await supabase.from('profiles').select('id, username, display_name').in('id', ids)).data ?? []
    : []

  return (
    <PeopleListPage
      title={`${profile.display_name} follows`}
      backHref={`/u/${profile.username}`}
      people={people}
      emptyText="Not following anyone yet"
    />
  )
}
