'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Search, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { Label, PersonPhoto, btnSecondary, inputBox } from '@/components/ui'
import { activeMention, splitMentions, type TaggedPerson } from '@/lib/tags'

// The log screen's tagging: @mentions in the review and the "Did you go with
// another Gigl user?" bar. Both search everyone on Gigl, people you follow
// first, and both let you follow someone in the same tap as tagging them.
// See lib/tags.ts for how the two kinds of tag are kept.

const SEARCH_DEBOUNCE_MS = 200
const MAX_RESULTS = 8
const MAX_SUGGESTED = 6
const PERSON_FIELDS = 'id, username, display_name, avatar_url'

// .or() reads commas and parentheses as syntax; % and * are wildcards.
function cleanQuery(input: string): string {
  return input.replace(/[,()\\%*"@]/g, ' ').trim()
}

// Who you follow and who you've blocked, read once per screen, plus a way to
// follow someone. Blocked people never come up as someone to tag. Someone who
// blocked you can't be seen here, so they can still come up, but the
// database refuses the tag (show_tags_insert).
export function usePeopleGraph() {
  const supabase = createClient()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const [following, setFollowing] = useState<Set<string>>(new Set())
  const [blocked, setBlocked]     = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!userId) { setFollowing(new Set()); setBlocked(new Set()); return }
    let cancelled = false
    Promise.all([
      supabase.from('follows').select('following_id').eq('follower_id', userId),
      supabase.from('blocks').select('blocked_id').eq('blocker_id', userId),
    ]).then(([follows, blocks]) => {
      if (cancelled) return
      setFollowing(new Set((follows.data ?? []).map(r => r.following_id)))
      setBlocked(new Set((blocks.data ?? []).map(r => r.blocked_id)))
    })
    return () => { cancelled = true }
  }, [userId])

  async function follow(personId: string) {
    if (!userId || following.has(personId)) return
    setFollowing(prev => new Set(prev).add(personId))
    const { error } = await supabase.from('follows').insert({ follower_id: userId, following_id: personId })
    if (error && error.code !== '23505') {
      console.error('follow while tagging failed:', error.message)
      setFollowing(prev => { const next = new Set(prev); next.delete(personId); return next })
    }
  }

  return { userId, following, blocked, follow }
}

export type PeopleGraph = ReturnType<typeof usePeopleGraph>

// People matching `query`, or the people you follow while it's still empty.
// Null turns the search off. Leaves out you, anyone you've blocked, and
// anyone in `exclude` (already tagged).
function usePeopleSearch(query: string | null, graph: PeopleGraph, exclude: Set<string>) {
  const supabase = createClient()
  const [found, setFound]     = useState<TaggedPerson[]>([])
  const [settled, setSettled] = useState(false)

  const cleaned = query === null ? null : cleanQuery(query)
  const followingKey = Array.from(graph.following).sort().join(',')

  useEffect(() => {
    setSettled(false)
    if (cleaned === null) { setFound([]); return }

    let cancelled = false
    const run = async () => {
      let rows: TaggedPerson[] = []
      if (cleaned === '') {
        const ids = Array.from(graph.following).slice(0, 40)
        if (ids.length > 0) {
          const { data } = await supabase.from('profiles').select(PERSON_FIELDS).in('id', ids).eq('username_set', true).order('username')
          rows = data ?? []
        }
      } else {
        const { data, error } = await supabase.from('profiles').select(PERSON_FIELDS)
          .or(`username.ilike.${cleaned}%,display_name.ilike.%${cleaned}%`)
          .eq('username_set', true)
          .order('username')
          .limit(MAX_RESULTS + 4)
        if (error) console.error('people search failed:', error.message)
        rows = data ?? []
      }
      if (cancelled) return
      setFound(rows)
      setSettled(true)
    }
    const timer = setTimeout(run, cleaned === '' ? 0 : SEARCH_DEBOUNCE_MS)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [cleaned, followingKey])

  const people = found
    .filter(p => p.id !== graph.userId && !graph.blocked.has(p.id) && !exclude.has(p.id))
    .sort((a, b) => Number(graph.following.has(b.id)) - Number(graph.following.has(a.id)))
    .slice(0, cleaned === '' ? MAX_SUGGESTED : MAX_RESULTS)

  return { people, settled, empty: cleaned === '' }
}

// Tapping a result mustn't take focus from the text box it belongs to, or
// the list closes before the tap lands.
const keepFocus = (e: React.MouseEvent) => e.preventDefault()

function PersonPickRow({ person, graph, onPick }: {
  person: TaggedPerson
  graph:  PeopleGraph
  onPick: (person: TaggedPerson, follow: boolean) => void
}) {
  const following = graph.following.has(person.id)
  const name = person.display_name || person.username
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <button
        type="button"
        onMouseDown={keepFocus}
        onClick={() => onPick(person, false)}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left"
      >
        <PersonPhoto name={name} src={person.avatar_url} className="w-8 h-8 text-xs border border-ink/15" />
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold leading-tight truncate">{name}</span>
          <span className="block text-[11px] text-ink-muted truncate">@{person.username}</span>
        </span>
      </button>
      {following ? (
        <span className="flex-shrink-0 flex items-center gap-0.5 text-[10px] text-ink-muted">
          <Check className="w-3 h-3" strokeWidth={2.5} /> Following
        </span>
      ) : graph.userId ? (
        <button
          type="button"
          onMouseDown={keepFocus}
          onClick={() => onPick(person, true)}
          aria-label={`Tag and follow @${person.username}`}
          className={`${btnSecondary} flex-shrink-0 px-2 py-1 text-[9.5px]`}
        >
          + Follow
        </button>
      ) : null}
    </div>
  )
}

// The list under a text box: people you follow, then everyone else.
function PeopleResults({ query, graph, exclude, onPick }: {
  query:   string
  graph:   PeopleGraph
  exclude: Set<string>
  onPick:  (person: TaggedPerson, follow: boolean) => void
}) {
  const { people, settled, empty } = usePeopleSearch(query, graph, exclude)
  const followed = people.filter(p => graph.following.has(p.id))
  const others = people.filter(p => !graph.following.has(p.id))

  if (empty && people.length === 0) {
    if (!settled) return null
    return (
      <div className="rounded-card border-1.5 border-ink bg-cream px-3 py-2.5 text-[12px] text-ink-muted shadow-riso">
        Type a name to find someone on Gigl.
      </div>
    )
  }
  if (!settled && people.length === 0) return null

  const heading = 'px-3 pt-2 pb-0.5 text-[9.5px] font-semibold uppercase tracking-label text-ink-muted'
  return (
    <div className="rounded-card border-1.5 border-ink bg-cream shadow-riso-lg overflow-hidden" role="listbox" aria-label="People to tag">
      {people.length === 0 && (
        <p className="px-3 py-2.5 text-[12px] text-ink-muted">No one on Gigl matches &ldquo;{query}&rdquo;.</p>
      )}
      {followed.length > 0 && (
        <>
          <p className={heading}>{empty ? 'People you follow' : 'Following'}</p>
          {followed.map(p => <PersonPickRow key={p.id} person={p} graph={graph} onPick={onPick} />)}
        </>
      )}
      {others.length > 0 && (
        <div className={followed.length > 0 ? 'border-t border-ink/10' : ''}>
          <p className={heading}>Everyone on Gigl</p>
          {others.map(p => <PersonPickRow key={p.id} person={p} graph={graph} onPick={onPick} />)}
        </div>
      )}
    </div>
  )
}

// The review box. Typing @ opens a list of people to tag; picking one writes
// @username into the text. Mentions are tinted by a copy of the text drawn
// behind a see-through textarea, so the two have to share every font and
// spacing setting: change one, change both.
export function NotesWithMentions({ value, onChange, placeholder, graph, exclude, onPicked }: {
  value:       string
  onChange:    (next: string) => void
  placeholder: string
  graph:       PeopleGraph
  exclude:     Set<string>
  // Someone picked from the list, so the screen knows who @username is.
  onPicked:    (person: TaggedPerson) => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const [caret, setCaret]     = useState(0)
  const [focused, setFocused] = useState(false)
  const nextCaret = useRef<number | null>(null)

  // Grows to fit the text. Re-measured when the width changes (rotating the
  // phone) and once the web font arrives, as well as on every edit, or the
  // box and the tinted copy behind it would wrap differently.
  function fit() {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let width = el.clientWidth
    const observer = new ResizeObserver(() => {
      if (el.clientWidth !== width) { width = el.clientWidth; fit() }
    })
    observer.observe(el)
    document.fonts?.ready.then(fit)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    fit()
    if (nextCaret.current !== null) {
      el.setSelectionRange(nextCaret.current, nextCaret.current)
      setCaret(nextCaret.current)
      nextCaret.current = null
    }
  }, [value])

  const mention = focused ? activeMention(value, caret) : null

  function trackCaret() {
    setCaret(ref.current?.selectionStart ?? 0)
  }

  function pick(person: TaggedPerson, follow: boolean) {
    if (!mention) return
    const end = mention.start + 1 + mention.query.length
    const after = value.slice(end)
    const insert = `@${person.username}${after.startsWith(' ') ? '' : ' '}`
    nextCaret.current = mention.start + insert.length + (after.startsWith(' ') ? 1 : 0)
    onPicked(person)
    if (follow) void graph.follow(person.id)
    onChange(value.slice(0, mention.start) + insert + after)
  }

  const shared = 'text-base leading-normal whitespace-pre-wrap break-words'

  return (
    <div className="space-y-1.5">
      <div className={`${inputBox} relative px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/40`}>
        <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden px-3 py-2.5 text-ink ${shared}`}>
          {splitMentions(value).map((part, i) => part.username
            ? <span key={i} className="rounded-sm bg-accent/15 text-accent">{part.text}</span>
            : <span key={i}>{part.text}</span>)}
        </div>
        <textarea
          ref={ref}
          value={value}
          onChange={e => { onChange(e.target.value); setCaret(e.target.selectionStart) }}
          onSelect={trackCaret}
          onKeyUp={trackCaret}
          onClick={trackCaret}
          onFocus={() => { setFocused(true); trackCaret() }}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          rows={1}
          className={`relative block w-full resize-none overflow-hidden bg-transparent text-transparent caret-ink placeholder:text-ink-faint focus:outline-none ${shared}`}
        />
      </div>
      {mention && (
        <PeopleResults query={mention.query} graph={graph} exclude={exclude} onPick={pick} />
      )}
    </div>
  )
}

// "Went with": everyone tagged, however they were tagged, and the search bar
// for tagging someone the review doesn't mention.
export function WentWithField({ tagged, graph, onAdd, onRemove }: {
  tagged:   TaggedPerson[]
  graph:    PeopleGraph
  onAdd:    (person: TaggedPerson) => void
  onRemove: (person: TaggedPerson) => void
}) {
  const [query, setQuery]     = useState('')
  const [focused, setFocused] = useState(false)
  const taggedIds = new Set(tagged.map(p => p.id))

  function pick(person: TaggedPerson, follow: boolean) {
    onAdd(person)
    if (follow) void graph.follow(person.id)
    setQuery('')
  }

  return (
    <section className="space-y-1.5">
      {tagged.length > 0 && <Label tone="ink">Went with</Label>}
      {tagged.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pb-0.5">
          {tagged.map(person => (
            <span
              key={person.id}
              className="inline-flex items-center gap-1.5 rounded-full border-1.5 border-accent/35 bg-cream py-0.5 pl-0.5 pr-1.5 text-[12px] font-semibold text-accent"
            >
              <PersonPhoto name={person.display_name || person.username} src={person.avatar_url} className="w-5 h-5 text-[9px] border border-ink/15" />
              @{person.username}
              <button type="button" onClick={() => onRemove(person)} aria-label={`Untag @${person.username}`} className="-mr-0.5 p-0.5 text-accent/70">
                <X className="w-3 h-3" strokeWidth={2.5} />
              </button>
            </span>
          ))}
        </div>
      )}
      <label className={`${inputBox} flex items-center gap-2 px-3 py-2.5 focus-within:ring-2 focus-within:ring-accent/40`}>
        <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={tagged.length > 0 ? 'Anyone else?' : 'Did you go with another Gigl user?'}
          aria-label="Tag someone you went with"
          autoCapitalize="none"
          autoCorrect="off"
          className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
        />
      </label>
      {focused && (
        <PeopleResults query={query.replace(/^@/, '')} graph={graph} exclude={taggedIds} onPick={pick} />
      )}
    </section>
  )
}
