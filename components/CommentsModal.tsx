'use client'

import { useEffect, useState } from 'react'
import { useTheme } from '@/components/FestivalThemeProvider'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { Avatar } from '@/components/Avatar'

interface CommentRow {
  id:           string
  body:         string
  created_at:   string
  user_id:      string
  username:     string | null
  display_name: string | null
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

// Slide-up sheet mirroring TagFriendsModal's animation/layout conventions.
// Flat comment list (no threading/editing) scoped to one logged_shows row.
export function CommentsModal({
  loggedShowId, onClose, onCountChange,
}: {
  loggedShowId: string
  onClose: () => void
  onCountChange: (delta: number) => void
}) {
  const T = useTheme()
  const supabase = createClient()
  const { user } = useAuth()

  const [shown, setShown] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setShown(true), 10)
    return () => clearTimeout(t)
  }, [])

  const [comments, setComments] = useState<CommentRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [body, setBody]         = useState('')
  const [posting, setPosting]   = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data: rows } = await supabase
        .from('show_comments')
        .select('id, body, created_at, user_id')
        .eq('logged_show_id', loggedShowId)
        .order('created_at', { ascending: true })

      if (cancelled) return
      if (!rows) { setLoading(false); return }

      const userIds = rows.map(r => r.user_id).filter((id, i, arr) => arr.indexOf(id) === i)
      const { data: profiles } = userIds.length
        ? await supabase.from('profiles').select('id, username, display_name').in('id', userIds)
        : { data: [] }
      if (cancelled) return

      const profileMap: Record<string, { username: string; display_name: string | null }> = {}
      profiles?.forEach(p => { profileMap[p.id] = { username: p.username, display_name: p.display_name } })

      setComments(rows.map(r => ({
        ...r,
        username:     profileMap[r.user_id]?.username ?? null,
        display_name: profileMap[r.user_id]?.display_name ?? null,
      })))
      setLoading(false)
    }
    load()
    return () => { cancelled = true }
  }, [loggedShowId])

  async function post() {
    const text = body.trim()
    if (!text || !user || posting) return
    setPosting(true)
    const { data, error } = await supabase
      .from('show_comments')
      .insert({ logged_show_id: loggedShowId, user_id: user.id, body: text })
      .select('id, created_at')
      .single()
    setPosting(false)
    if (error || !data) return

    setBody('')
    setComments(prev => [...prev, {
      id: data.id, body: text, created_at: data.created_at, user_id: user.id,
      username: null, display_name: null,
    }])
    onCountChange(1)
  }

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
        <div style={{ fontFamily: T.serif, fontSize: 17, fontWeight: 700, letterSpacing: '-0.3px' }}>Comments</div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px 24px' }}>
        {loading && (
          <div style={{
            textAlign: 'center', padding: 40,
            fontSize: 11, color: T.faint,
            letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600,
          }}>Loading...</div>
        )}
        {!loading && comments.length === 0 && (
          <div style={{ fontSize: 12, color: T.faint, padding: '8px 2px', textAlign: 'center' }}>
            No comments yet — be the first
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <Avatar name={c.display_name || c.username || '?'} size={30} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontFamily: T.serif, fontSize: 12, fontWeight: 700, color: '#4A3528' }}>
                    {c.display_name || (c.username ? `@${c.username}` : 'someone')}
                  </span>
                  <span style={{ fontSize: 9, color: T.faint }}>{timeAgo(c.created_at)}</span>
                </div>
                <div style={{ fontSize: 12, color: '#4A3528', lineHeight: 1.5, marginTop: 2 }}>{c.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Composer */}
      <div style={{
        padding: '10px 16px calc(10px + env(safe-area-inset-bottom))',
        borderTop: '1px solid rgba(74,53,40,0.1)', flexShrink: 0,
        display: 'flex', gap: 8, alignItems: 'center',
      }}>
        <input
          value={body}
          onChange={e => setBody(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') post() }}
          placeholder="Add a comment..."
          style={{
            flex: 1, background: T.cardInner, border: T.cardBorder, borderRadius: 20,
            padding: '10px 16px', fontSize: 16, color: '#4A3528', fontFamily: T.sans, outline: 'none',
          }}
        />
        <button
          onClick={post}
          disabled={!body.trim() || posting}
          style={{
            background: T.accent, border: '1.5px solid #4A3528', borderRadius: '50%',
            width: 38, height: 38, flexShrink: 0,
            cursor: body.trim() ? 'pointer' : 'default', opacity: body.trim() ? 1 : 0.5,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#FAF3E2" strokeWidth="2.5">
            <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  )
}
