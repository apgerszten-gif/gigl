'use client'

import { useEffect, useState } from 'react'
import { Send } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/lib/supabase/client'
import { BackHeader, LoadingLabel, PersonPhoto, btnSecondary } from '@/components/ui'

interface CommentRow {
  id:           string
  body:         string
  created_at:   string
  user_id:      string
  username:     string | null
  display_name: string | null
  avatar_url:   string | null
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
  loggedShowId, onClose, onCountChange, onNeedAccount,
}: {
  loggedShowId: string
  onClose: () => void
  onCountChange: (delta: number) => void
  // Signed-out visitors can read comments; the reply box becomes a button
  // that calls this to ask for an account.
  onNeedAccount?: () => void
}) {
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
        ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', userIds)
        : { data: [] }
      if (cancelled) return

      const profileMap: Record<string, { username: string; display_name: string | null; avatar_url: string | null }> = {}
      profiles?.forEach(p => { profileMap[p.id] = p })

      setComments(rows.map(r => ({
        ...r,
        username:     profileMap[r.user_id]?.username ?? null,
        display_name: profileMap[r.user_id]?.display_name ?? null,
        avatar_url:   profileMap[r.user_id]?.avatar_url ?? null,
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
    if (error || !data) {
      console.error('show_comments insert failed:', error?.message)
      return
    }

    setBody('')
    setComments(prev => [...prev, {
      id: data.id, body: text, created_at: data.created_at, user_id: user.id,
      username: null, display_name: null, avatar_url: null,
    }])
    onCountChange(1)
  }

  return (
    <div className={`fixed inset-0 z-[100] mx-auto max-w-md bg-paper text-ink flex flex-col transition-transform duration-[280ms] ease-out ${
      shown ? 'translate-y-0' : 'translate-y-full'
    }`}>
      <BackHeader title="Comments" onBack={onClose} />

      <div className="flex-1 overflow-y-auto px-5 pt-4 pb-6">
        {loading && <LoadingLabel />}
        {!loading && comments.length === 0 && (
          <p className="py-2 text-center text-xs text-ink-faint">No comments yet. Be the first.</p>
        )}
        <div className="flex flex-col gap-3.5">
          {comments.map(c => (
            <div key={c.id} className="flex gap-2.5 items-start">
              <PersonPhoto name={c.display_name || c.username || '?'} src={c.avatar_url} className="w-8 h-8 text-xs border border-ink/15" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-display text-xs font-bold">
                    {c.display_name || (c.username ? `@${c.username}` : 'someone')}
                  </span>
                  <span className="text-[10px] text-ink-faint">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-[13px] leading-normal mt-0.5">{c.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-shrink-0 border-t border-ink/10 px-4 pt-2.5 pb-[calc(10px+env(safe-area-inset-bottom))] flex gap-2 items-center">
        {!user && onNeedAccount ? (
          <button type="button" onClick={onNeedAccount} className={`${btnSecondary} w-full py-3 text-xs`}>
            Sign up to comment
          </button>
        ) : (
          <>
            <input
              value={body}
              onChange={e => setBody(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') post() }}
              placeholder="Add a comment..."
              className="flex-1 min-w-0 rounded-full border-1.5 border-ink bg-cream px-4 py-2.5 text-base text-ink placeholder:text-ink-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
            />
            <button
              type="button"
              onClick={post}
              disabled={!body.trim() || posting}
              aria-label="Post comment"
              className="w-10 h-10 flex-shrink-0 rounded-full bg-accent text-cream border-1.5 border-ink shadow-riso flex items-center justify-center disabled:opacity-50"
            >
              <Send className="w-4 h-4" strokeWidth={2.25} />
            </button>
          </>
        )}
      </div>
    </div>
  )
}
