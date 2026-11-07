import Link from 'next/link'
import { X } from 'lucide-react'
import { splitMentions, type TaggedInLog } from '@/lib/tags'
import { ArtistPhoto, DateTag, Label, PersonPhoto, Place, placeOf } from '@/components/ui'

// How tags look once a log is posted (lib/tags.ts). No hooks, so server
// pages can render these too.

// A review with its @mentions of tagged people as links to their profiles.
// An @word that isn't a tag (nobody by that name, or they untagged
// themselves) stays plain text.
export function ReviewText({ text, tagged }: { text: string; tagged: string[] }) {
  return (
    <>
      {splitMentions(text).map((part, i) => part.username && tagged.includes(part.username)
        ? (
          <Link
            key={i}
            href={`/u/${part.username}`}
            className="font-semibold text-accent underline decoration-accent/40 underline-offset-2"
          >
            {part.text}
          </Link>
        )
        : <span key={i}>{part.text}</span>)}
    </>
  )
}

// "with @mo and @mei" under a feed card's review: everyone tagged on it.
export function WithLine({ people }: { people: { username: string; avatar_url: string | null }[] }) {
  if (people.length === 0) return null
  const shown = people.length > 3 ? people.slice(0, 2) : people
  const rest = people.length - shown.length
  const link = (p: { username: string }) => (
    <Link key={p.username} href={`/u/${p.username}`} className="font-semibold text-ink">@{p.username}</Link>
  )

  const parts: React.ReactNode[] = []
  shown.forEach((p, i) => {
    if (i > 0) parts.push(i === shown.length - 1 && rest === 0 ? ' and ' : ', ')
    parts.push(link(p))
  })
  if (rest > 0) parts.push(` and ${rest} other${rest === 1 ? '' : 's'}`)

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <div className="flex flex-shrink-0 -space-x-1.5">
        {people.slice(0, 3).map(p => (
          <PersonPhoto key={p.username} name={p.username} src={p.avatar_url} className="w-[18px] h-[18px] text-[8px] border border-cream" />
        ))}
      </div>
      <p className="min-w-0 truncate text-[10.5px] text-ink-muted">with {parts}</p>
    </div>
  )
}

// "Tagged in" on a profile: logs other people tagged this person on. On
// your own profile, `onRemove` adds a way to untag yourself.
export function TaggedInList({ logs, artistImage, onRemove }: {
  logs:         TaggedInLog[]
  artistImage:  (name: string) => string | null | undefined
  onRemove?:    (log: TaggedInLog) => void
}) {
  if (logs.length === 0) return null
  return (
    <section>
      <Label className="mb-2.5">Tagged in</Label>
      <div className="flex flex-col gap-2">
        {logs.map(log => {
          const place = placeOf({ stage: log.stage, day: log.day, venue: log.venue, artist_id: log.artistId })
          return (
            <div key={log.logId} className="rounded-card border-1.5 border-ink bg-cream p-2.5 flex items-center gap-3">
              <Link href={`/artist/${log.artistId}`} className="flex-shrink-0">
                <ArtistPhoto name={log.artistName} src={artistImage(log.artistName)} className="w-11 h-11" iconSize={14}>
                  <DateTag isoDate={log.showDate} />
                </ArtistPhoto>
              </Link>
              <div className="flex-1 min-w-0">
                <Link href={`/artist/${log.artistId}`} className="block font-display text-[14px] font-bold leading-tight truncate">
                  {log.artistName}
                </Link>
                {place && <Place className="mt-0.5">{place}</Place>}
                {log.by && (
                  <p className="mt-0.5 text-[11px] text-ink-muted truncate">
                    Tagged by <Link href={`/u/${log.by}`} className="font-semibold text-ink">@{log.by}</Link>
                  </p>
                )}
              </div>
              {onRemove && (
                <button
                  type="button"
                  onClick={() => onRemove(log)}
                  aria-label={`Untag yourself from ${log.artistName}`}
                  className="flex-shrink-0 p-1 text-ink-faint"
                >
                  <X className="w-4 h-4" strokeWidth={2} />
                </button>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
