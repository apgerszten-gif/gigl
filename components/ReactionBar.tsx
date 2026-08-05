'use client'

import { useTheme } from '@/components/FestivalThemeProvider'

// Fixed quick-react palette (Slack-style) rather than a full emoji picker -
// kept small and fast to tap on mobile. A user can react with more than one
// of these on the same review, just not the same one twice (see
// show_reactions' unique(logged_show_id, user_id, emoji) constraint).
const REACTION_EMOJIS = ['🔥', '❤️', '😂', '😮', '🙌']

export interface ReactionBarProps {
  likeCount: number
  likedByMe: boolean
  reactionCounts: Record<string, number>
  myReactions: string[]
  commentCount: number
  onToggleLike: () => void
  onToggleReaction: (emoji: string) => void
  onOpenComments: () => void
}

export function ReactionBar({
  likeCount, likedByMe, reactionCounts, myReactions, commentCount,
  onToggleLike, onToggleReaction, onOpenComments,
}: ReactionBarProps) {
  const T = useTheme()

  return (
    <div style={{
      padding: '8px 14px 10px',
      display: 'flex', alignItems: 'center', gap: 14,
      borderTop: '1px solid rgba(74,53,40,0.08)',
    }}>
      <button
        onClick={onToggleLike}
        aria-label={likedByMe ? 'Unlike' : 'Like'}
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill={likedByMe ? T.accent : 'none'} stroke={likedByMe ? T.accent : T.muted} strokeWidth="2">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
        {likeCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: likedByMe ? T.accent : T.muted, fontFamily: T.sans }}>{likeCount}</span>
        )}
      </button>

      <button
        onClick={onOpenComments}
        aria-label="Comments"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {commentCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, fontFamily: T.sans }}>{commentCount}</span>
        )}
      </button>

      <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
        {REACTION_EMOJIS.map(emoji => {
          const count  = reactionCounts[emoji] ?? 0
          const active = myReactions.includes(emoji)
          return (
            <button
              key={emoji}
              onClick={() => onToggleReaction(emoji)}
              aria-label={`React ${emoji}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 3,
                background: active ? T.accentDim : 'none',
                border: active ? `1.5px solid ${T.accentBorder}` : '1.5px solid transparent',
                borderRadius: 20, padding: '3px 7px', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: 13, lineHeight: 1 }}>{emoji}</span>
              {count > 0 && (
                <span style={{ fontSize: 10, fontWeight: 600, color: active ? T.accent : T.muted, fontFamily: T.sans }}>{count}</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
