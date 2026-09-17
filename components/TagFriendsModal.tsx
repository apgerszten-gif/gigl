'use client'

import { useEffect, useState } from 'react'
import { Check, Plus, Search, X } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { BackHeader, Card, Label, PersonPhoto, btnPrimary, inputBox } from '@/components/ui'

// A friend tagged on a show - either a confirmed Gigl profile (userId set)
// or a pending invite for someone not on Gigl yet (pendingInvite true,
// inviteContact holds the phone/email they were invited through). Mirrors
// the shape of a show_tags row closely enough that the log-show screen can
// write these straight through on save.
export interface TaggedFriend {
  userId:        string | null
  username:      string | null
  displayName:   string
  avatarUrl?:    string | null
  pendingInvite: boolean
  inviteContact: string | null
}

interface ProfileResult {
  id:           string
  username:     string
  display_name: string
  avatar_url:   string | null
}

function keyOf(f: TaggedFriend): string {
  return f.userId ?? `pending:${f.inviteContact}`
}

export function TagFriendsModal({
  initialSelected, onClose, onDone,
}: {
  initialSelected: TaggedFriend[]
  onClose: () => void
  onDone: (friends: TaggedFriend[]) => void
}) {
  const supabase = createClient()
  const { user } = useAuth()

  // Mounted at translateY(100%), flipped a tick after mount so the
  // transition actually animates instead of snapping open.
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10)
    return () => clearTimeout(t)
  }, [])

  const [selected, setSelected] = useState<TaggedFriend[]>(initialSelected)
  const [query, setQuery]       = useState('')
  const [results, setResults]   = useState<ProfileResult[]>([])
  const [suggested, setSuggested] = useState<ProfileResult[]>([])
  const [searching, setSearching] = useState(false)
  const [inviteOpen, setInviteOpen]   = useState(false)
  const [inviteValue, setInviteValue] = useState('')

  // Suggested = people the current user follows, shown while the search box is empty.
  useEffect(() => {
    if (!user) return
    let cancelled = false
    async function loadSuggested() {
      const { data: followRows } = await supabase.from('follows').select('following_id').eq('follower_id', user!.id)
      const ids = (followRows ?? []).map(r => r.following_id)
      if (ids.length === 0) { if (!cancelled) setSuggested([]); return }
      const { data } = await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', ids)
      if (!cancelled) setSuggested(data ?? [])
    }
    loadSuggested()
    return () => { cancelled = true }
  }, [user])

  // Debounced profile search by username/display name.
  useEffect(() => {
    const q = query.trim().replace(/[%,()]/g, '')
    if (!q) { setResults([]); setSearching(false); return }
    setSearching(true)
    const t = setTimeout(async () => {
      const { data } = await supabase.from('profiles')
        .select('id, username, display_name, avatar_url')
        .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
        .neq('id', user?.id ?? '')
        .limit(20)
      setResults(data ?? [])
      setSearching(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query, user])

  function isSelected(id: string) {
    return selected.some(f => f.userId === id)
  }

  function toggleProfile(p: ProfileResult) {
    setSelected(prev => isSelected(p.id)
      ? prev.filter(f => f.userId !== p.id)
      : [...prev, { userId: p.id, username: p.username, displayName: p.display_name, avatarUrl: p.avatar_url, pendingInvite: false, inviteContact: null }])
  }

  function removeFriend(f: TaggedFriend) {
    setSelected(prev => prev.filter(x => keyOf(x) !== keyOf(f)))
  }

  function addPendingInvite() {
    const contact = inviteValue.trim()
    if (!contact) return
    setSelected(prev => prev.some(f => f.inviteContact === contact)
      ? prev
      : [...prev, { userId: null, username: null, displayName: contact, pendingInvite: true, inviteContact: contact }])
    setInviteValue('')
    setInviteOpen(false)
  }

  async function shareInviteLink() {
    const url = window.location.origin
    if (navigator.share) {
      try { await navigator.share({ title: 'Gigl', text: 'Come rate shows with me on Gigl', url }) } catch {
        // user backed out of the native share sheet — nothing to do
      }
      return
    }
    await navigator.clipboard.writeText(url)
  }

  const listToShow = query.trim() ? results : suggested

  return (
    <div className={`fixed inset-0 z-[100] mx-auto max-w-md bg-paper text-ink flex flex-col transition-transform duration-[280ms] ease-out ${
      shown ? 'translate-y-0' : 'translate-y-full'
    }`}>
      <BackHeader title="Tag friends" onBack={onClose} />

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
        <label className={`${inputBox} shadow-riso flex items-center gap-2 px-3 py-2.5 mb-3.5`}>
          <Search className="w-4 h-4 text-ink-muted flex-shrink-0" strokeWidth={1.75} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or username..."
            className="flex-1 min-w-0 bg-transparent text-base text-ink placeholder:text-ink-faint focus:outline-none"
          />
        </label>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selected.map(f => (
              <button
                key={keyOf(f)}
                type="button"
                onClick={() => removeFriend(f)}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent text-cream border-1.5 border-ink pl-3 pr-2 py-1 text-[11px] font-bold"
              >
                {f.pendingInvite ? `${f.displayName} (invite)` : f.displayName}
                <X className="w-3 h-3" strokeWidth={3} />
              </button>
            ))}
          </div>
        )}

        {!query.trim() && <Label className="mb-2.5">Suggested</Label>}

        <div className="flex flex-col gap-2">
          {listToShow.length === 0 && !searching && (
            <p className="px-0.5 py-2 text-xs text-ink-faint">
              {query.trim() ? 'No one matches that search' : 'Follow people to see them here'}
            </p>
          )}
          {listToShow.map(p => {
            const added = isSelected(p.id)
            return (
              <button key={p.id} type="button" onClick={() => toggleProfile(p)} className="w-full text-left">
                <Card flat className="flex items-center gap-3 px-3 py-2.5">
                  <PersonPhoto name={p.display_name || p.username} src={p.avatar_url} className="w-9 h-9 text-sm border border-ink/15" />
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-[13px] font-bold truncate">{p.display_name}</p>
                    <p className="text-[11px] text-ink-muted">@{p.username}</p>
                  </div>
                  <span className={`w-7 h-7 flex-shrink-0 rounded-full flex items-center justify-center ${
                    added ? 'bg-accent text-cream border-1.5 border-ink' : 'border-1.5 border-ink-faint text-ink-faint'
                  }`}>
                    {added ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Plus className="w-3.5 h-3.5" strokeWidth={2.5} />}
                  </span>
                </Card>
              </button>
            )
          })}
        </div>

        <div className="mt-4">
          {inviteOpen ? (
            <div className="flex gap-2">
              <input
                autoFocus
                value={inviteValue}
                onChange={e => setInviteValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addPendingInvite() }}
                placeholder="Phone or email"
                className={`${inputBox} flex-1 min-w-0 px-3 py-2.5 text-[13px] text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40`}
              />
              <button type="button" onClick={addPendingInvite} className={`${btnPrimary} px-4 text-[11px]`}>Add</button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="w-full rounded-card border-1.5 border-dashed border-ink/30 px-4 py-3.5 text-[11px] font-semibold uppercase tracking-label text-ink-faint"
            >
              Not on Gigl? Invite by contact or link
            </button>
          )}
          {inviteOpen && (
            <button type="button" onClick={shareInviteLink} className="mt-1 px-0.5 py-2 text-[11px] font-semibold text-accent underline underline-offset-[3px]">
              or share an invite link instead
            </button>
          )}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-ink/10 px-5 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))]">
        <button type="button" onClick={() => onDone(selected)} className={`${btnPrimary} w-full py-3.5 text-xs`}>
          Done{selected.length > 0 ? ` · ${selected.length} tagged` : ''}
        </button>
      </div>
    </div>
  )
}
