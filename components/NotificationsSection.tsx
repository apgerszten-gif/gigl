'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AtSign, CalendarDays, Heart, MessageCircle, UserPlus } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { CommentsModal } from '@/components/CommentsModal'
import { ArtistPhoto, Label, PersonPhoto, btnPrimary, btnSecondary } from '@/components/ui'
import { createClient } from '@/lib/supabase/client'
import { loadNotifications, markNotificationsSeen, type Notification, type NotificationPerson } from '@/lib/notifications'
import { reviewPath } from '@/lib/share'
import { artistHref } from '@/lib/showLinks'

// Notifications on You (lib/notifications.ts works out the list). New ones
// carry a sienna dot for this visit; showing the list marks them seen, which
// clears the count on the dock's You tab.

// Rows shown before "Show all".
const PREVIEW = 5

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - Date.parse(iso)) / 60000)
  if (mins < 1)  return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const KIND_ICONS: Record<Notification['kind'], LucideIcon> = {
  follow:  UserPlus,
  like:    Heart,
  comment: MessageCircle,
  tag:     AtSign,
  show:    CalendarDays,
}

function Handle({ person }: { person: NotificationPerson }) {
  return <b className="font-semibold text-ink">@{person.username}</b>
}

export function NotificationsSection({ username }: { username: string | null }) {
  const { user } = useAuth()
  const [items, setItems]       = useState<Notification[] | null>(null)
  const [failed, setFailed]     = useState(false)
  // The log whose comments are open, from a comment row.
  const [comments, setComments] = useState<string | null>(null)
  // Follow back, keyed by person: true once followed from here.
  const [followed, setFollowed] = useState<Record<string, boolean>>({})

  useEffect(() => {
    if (!user) return
    let live = true
    loadNotifications(user.id)
      .then(list => {
        if (!live) return
        setItems(list)
        markNotificationsSeen(user.id)
      })
      .catch(err => {
        console.error('notifications failed:', err)
        if (live) setFailed(true)
      })
    return () => { live = false }
  }, [user?.id])

  async function followBack(person: NotificationPerson) {
    if (!user) return
    setFollowed(prev => ({ ...prev, [person.id]: true }))
    const { error } = await createClient().from('follows').insert({ follower_id: user.id, following_id: person.id })
    if (error && error.code !== '23505') {
      console.error('follow back failed:', error.message)
      setFollowed(prev => ({ ...prev, [person.id]: false }))
    }
  }

  // Says nothing while loading, or if it couldn't load: the rest of You
  // doesn't depend on it.
  if (!user || failed || items == null) return null

  return (
    <>
      <NotificationsView
        items={items}
        username={username}
        followed={followed}
        onFollowBack={followBack}
        onOpenComments={setComments}
      />
      {comments && (
        <CommentsModal loggedShowId={comments} onClose={() => setComments(null)} onCountChange={() => {}} />
      )}
    </>
  )
}

// The section itself, without loading anything, so the style guide
// (/design) can show it with sample rows.
export function NotificationsView({ items, username, followed, onFollowBack, onOpenComments }: {
  items:          Notification[]
  username:       string | null
  followed:       Record<string, boolean>
  onFollowBack:   (person: NotificationPerson) => void
  onOpenComments: (loggedShowId: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const newCount = items.filter(item => item.unseen).length
  const shown = expanded ? items : items.slice(0, PREVIEW)

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <Label>Notifications</Label>
        {newCount > 0 && <Label tone="accent">{newCount} new</Label>}
      </div>

      {items.length === 0 ? (
        <p className="text-[13px] leading-snug text-ink-faint">
          Nothing yet. New followers, likes and comments on your logs, and reminders for shows you&apos;ve saved will show up here.
        </p>
      ) : (
        <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso overflow-hidden">
          {shown.map((item, i) => (
            <Row
              key={item.key}
              item={item}
              index={i}
              username={username}
              followed={item.kind === 'follow' ? (followed[item.actor.id] ?? item.followingBack) : false}
              onFollowBack={onFollowBack}
              onOpenComments={onOpenComments}
            />
          ))}
        </div>
      )}

      {items.length > PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded(open => !open)}
          className={`${btnSecondary} w-full py-2.5 text-[11px]`}
        >
          {expanded ? 'Show fewer' : `Show all ${items.length}`}
        </button>
      )}
    </section>
  )
}

function Row({ item, index, username, followed, onFollowBack, onOpenComments }: {
  item:           Notification
  index:          number
  username:       string | null
  followed:       boolean
  onFollowBack:   (person: NotificationPerson) => void
  onOpenComments: (loggedShowId: string) => void
}) {
  const KindIcon = KIND_ICONS[item.kind]
  const rowClass = `flex items-center gap-3 px-3 py-2.5 ${index % 2 ? 'bg-cream-alt' : ''} ${index > 0 ? 'border-t border-ink/10' : ''}`

  const photo = item.kind === 'show'
    ? <ArtistPhoto name={item.show.artist} src={item.show.image_url} className="w-10 h-10" iconSize={14} />
    : <PersonPhoto
        name={(item.kind === 'like' ? item.actors[0] : item.actor).display_name || (item.kind === 'like' ? item.actors[0] : item.actor).username}
        src={(item.kind === 'like' ? item.actors[0] : item.actor).avatar_url}
        className="w-10 h-10 text-sm border-1.5 border-ink"
      />

  let text: React.ReactNode
  let when = timeAgo(item.at)
  switch (item.kind) {
    case 'follow':
      text = <><Handle person={item.actor} /> followed you</>
      break
    case 'like': {
      const others = item.total - 1
      text = (
        <>
          <Handle person={item.actors[0]} />
          {others === 1 && <> and <Handle person={item.actors[1]} /></>}
          {others > 1 && <> and {others} others</>}
          {' '}liked your <b className="font-semibold text-ink">{item.log.artistName}</b> review
        </>
      )
      break
    }
    case 'comment':
      text = (
        <>
          <Handle person={item.actor} /> commented on <b className="font-semibold text-ink">{item.log.artistName}</b>:{' '}
          <span className="text-ink-muted">&ldquo;{item.body}&rdquo;</span>
        </>
      )
      break
    case 'tag':
      text = <><Handle person={item.actor} /> tagged you at <b className="font-semibold text-ink">{item.log.artistName}</b></>
      break
    case 'show':
      text = <><b className="font-semibold text-ink">{item.show.artist}</b> is {item.when} at {item.show.venue}</>
      when = item.when === 'tonight' ? 'Tonight' : 'Tomorrow'
      break
  }

  const body = (
    <>
      <span className="relative flex-shrink-0">
        {photo}
        <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-accent text-cream border-1.5 border-ink flex items-center justify-center">
          <KindIcon className="w-2.5 h-2.5" strokeWidth={2.5} fill={item.kind === 'like' ? 'currentColor' : 'none'} />
        </span>
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-[13px] leading-snug text-ink-muted line-clamp-2">{text}</span>
        <span className={`block mt-0.5 text-[10px] font-semibold uppercase tracking-label ${item.kind === 'show' ? 'text-accent' : 'text-ink-faint'}`}>{when}</span>
      </span>
    </>
  )

  const mainClass = 'flex-1 min-w-0 flex items-center gap-3 text-left'
  let main: React.ReactNode
  switch (item.kind) {
    case 'follow':
      main = <Link href={`/u/${item.actor.username}`} className={mainClass}>{body}</Link>
      break
    case 'like':
      main = <Link href={username ? reviewPath(username, item.log.artistId) : `/artist/${encodeURIComponent(item.log.artistId)}`} className={mainClass}>{body}</Link>
      break
    case 'comment':
      main = <button type="button" onClick={() => onOpenComments(item.log.id)} className={mainClass}>{body}</button>
      break
    case 'tag':
      main = <Link href={reviewPath(item.actor.username, item.log.artistId)} className={mainClass}>{body}</Link>
      break
    case 'show':
      main = <Link href={artistHref(item.show.artist)} className={mainClass}>{body}</Link>
      break
  }

  return (
    <div className={rowClass}>
      {main}
      {item.kind === 'follow' ? (
        followed
          ? <span className={`${btnSecondary} flex-shrink-0 px-2.5 py-1.5 text-[10px]`}>Following</span>
          : (
            <button type="button" onClick={() => onFollowBack(item.actor)} className={`${btnPrimary} flex-shrink-0 px-2.5 py-1.5 text-[10px]`}>
              Follow back
            </button>
          )
      ) : item.unseen ? (
        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-accent" aria-label="New" />
      ) : null}
    </div>
  )
}
