import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import { PeopleListPage } from '@/components/PeopleList'

export default async function FollowersPage({ params }: { params: { username: string } }) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', params.username)
    .single()

  if (!profile) notFound()

  const { data: followRows } = await supabase.from('follows').select('follower_id').eq('following_id', profile.id)
  const ids = (followRows ?? []).map(r => r.follower_id)

  const people = ids.length > 0
    ? (await supabase.from('profiles').select('id, username, display_name').in('id', ids)).data ?? []
    : []

  return (
    <PeopleListPage
      title={`${profile.display_name}'s followers`}
      backHref={`/u/${profile.username}`}
      people={people}
      emptyText="No followers yet"
    />
  )
}
