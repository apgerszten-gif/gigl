'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/components/FestivalThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/Avatar'

// A friend tagged on a show - either a confirmed Gigl profile (userId set)
// or a pending invite for someone not on Gigl yet (pendingInvite true,
// inviteContact holds the phone/email they were invited through). Mirrors
// the shape of a show_tags row closely enough that the log-show screen can
// write these straight through on save.
export interface TaggedFriend {
  userId:        string | null
  username:      string | null
  displayName:   string
  pendingInvite: boolean
  inviteContact: string | null
}

interface ProfileResult {
  id:           string
  username:     string
  display_name: string
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
  const T = useTheme()
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
      const { data } = await supabase.from('profiles').select('id, username, display_name').in('id', ids)
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
        .select('id, username, display_name')
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
      : [...prev, { userId: p.id, username: p.username, displayName: p.display_name, pendingInvite: false, inviteContact: null }])
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
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: T.bg, fontFamily: T.sans, color: '#4A3528',
      maxWidth: 430, margin: '0 auto',
      display: 'flex', flexDirection: 'column',
      transform: shown ? 'translateY(0)' : 'translateY(100%)',
      transition: 'transform 0.28s ease-out',
    }}>
      {/* Header */}
      <div style={{
        padding: '18px 24px', position: 'sticky', top: 0, zIndex: 10,
        background: T.bgRgba,
        backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(74,53,40,0.12)',
        display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
      }}>
        <button onClick={onClose} aria-label="Back" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>Tag friends</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
        {/* Search bar */}
        <div style={{
          background: T.card, borderRadius: 5, border: T.cardBorder,
          padding: '12px 16px', marginBottom: 14,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by name or username..."
            style={{ background: 'none', border: 'none', outline: 'none', color: '#4A3528', fontSize: 16, fontFamily: T.sans, width: '100%' }}
          />
        </div>

        {/* Selected pills */}
        {selected.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
            {selected.map(f => (
              <button key={keyOf(f)} onClick={() => removeFriend(f)} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                background: T.accent, border: '1.5px solid #4A3528',
                borderRadius: 20, padding: '6px 10px 6px 12px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FAF3E2', fontFamily: T.sans }}>
                  {f.pendingInvite ? `${f.displayName} (invite)` : f.displayName}
                </span>
                <span style={{ color: '#FAF3E2', fontSize: 13, lineHeight: 1 }}>×</span>
              </button>
            ))}
          </div>
        )}

        {!query.trim() && (
          <div style={{ fontSize: 9, color: T.muted, letterSpacing: '0.12em', textTransform: 'uppercase', fontWeight: 700, marginBottom: 10 }}>
            Suggested
          </div>
        )}

        {/* Results / suggested */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {listToShow.length === 0 && !searching && (
            <div style={{ fontSize: 12, color: T.faint, padding: '8px 2px' }}>
              {query.trim() ? 'No one matches that search' : 'Follow people to see them here'}
            </div>
          )}
          {listToShow.map(p => {
            const added = isSelected(p.id)
            return (
              <button key={p.id} onClick={() => toggleProfile(p)} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: T.card, border: T.cardBorder, borderRadius: 5,
                padding: '10px 12px', cursor: 'pointer', textAlign: 'left', width: '100%',
              }}>
                <Avatar name={p.display_name || p.username} size={34} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: T.serif, fontSize: 13, fontWeight: 700, color: '#4A3528' }}>{p.display_name}</div>
                  <div style={{ fontSize: 10, color: T.muted }}>@{p.username}</div>
                </div>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                  background: added ? T.accent : 'none', border: added ? 'none' : `1.5px solid ${T.faint}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {added ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.faint} strokeWidth="2" strokeLinecap="round">
                      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Invite by contact */}
        <div style={{ marginTop: 16 }}>
          {inviteOpen ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                autoFocus
                value={inviteValue}
                onChange={e => setInviteValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addPendingInvite() }}
                placeholder="Phone or email"
                style={{
                  flex: 1, background: T.cardInner, border: T.cardBorder, borderRadius: 5,
                  padding: '10px 12px', fontSize: 13, color: '#4A3528', fontFamily: T.sans, outline: 'none',
                }}
              />
              <button onClick={addPendingInvite} style={{
                background: T.accent, border: '1.5px solid #4A3528', borderRadius: 5,
                padding: '0 16px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#FAF3E2', fontFamily: T.sans, textTransform: 'uppercase' }}>Add</span>
              </button>
            </div>
          ) : (
            <button onClick={() => setInviteOpen(true)} style={{
              width: '100%', background: 'none', border: '1.5px dashed rgba(74,53,40,0.3)',
              borderRadius: 5, padding: '14px 16px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <span style={{ fontSize: 11, color: T.faint, fontFamily: T.sans, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Not on Gigl? Invite by contact or link
              </span>
            </button>
          )}
          {inviteOpen && (
            <button onClick={shareInviteLink} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: '8px 2px', marginTop: 4,
            }}>
              <span style={{ fontSize: 11, color: T.accent, fontFamily: T.sans, fontWeight: 600, textDecoration: 'underline', textUnderlineOffset: 3 }}>
                or share an invite link instead
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Done */}
      <div style={{
        padding: '12px 24px calc(12px + env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(74,53,40,0.1)', flexShrink: 0,
      }}>
        <button onClick={() => onDone(selected)} style={{
          width: '100%', background: T.accent, border: '1.5px solid #4A3528', boxShadow: T.cardShadow,
          borderRadius: 5, padding: 16, cursor: 'pointer',
        }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#FAF3E2', letterSpacing: '0.1em', textTransform: 'uppercase', fontFamily: T.sans }}>
            Done{selected.length > 0 ? ` · ${selected.length} tagged` : ''}
          </span>
        </button>
      </div>
    </div>
  )
}
