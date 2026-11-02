import Link from 'next/link'
import { FollowButton } from '@/components/FollowButton'
import { BackHeader, Card, EmptyState, PersonPhoto } from '@/components/ui'

export interface Person {
  id:           string
  username:     string
  display_name: string
  avatar_url?:  string | null
}

// One person: tap through to their profile, or follow them from here.
export function PersonRow({ person }: { person: Person }) {
  return (
    <Card flat className="flex items-center gap-3 px-3 py-2.5">
      <Link href={`/u/${person.username}`} className="flex items-center gap-3 flex-1 min-w-0">
        <PersonPhoto name={person.display_name || person.username} src={person.avatar_url} className="w-10 h-10 text-base border border-ink/15" />
        <div className="min-w-0">
          <p className="font-display text-sm font-bold truncate">{person.display_name}</p>
          <p className="text-[11px] text-ink-muted truncate">@{person.username}</p>
        </div>
      </Link>
      <FollowButton targetUserId={person.id} />
    </Card>
  )
}

// Shared shell for /u/[username]/followers and /following - same
// back-button header as the public profile page, same list-row pattern
// used for search results in TagFriendsModal.
export function PeopleListPage({
  title, backHref, people, emptyText,
}: {
  title:     string
  backHref:  string
  people:    Person[]
  emptyText: string
}) {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <BackHeader title={title} href={backHref} />

      <div className="px-5 pt-4 pb-10">
        {people.length === 0 ? (
          <EmptyState>{emptyText}</EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {people.map(p => <PersonRow key={p.id} person={p} />)}
          </div>
        )}
      </div>
    </div>
  )
}
