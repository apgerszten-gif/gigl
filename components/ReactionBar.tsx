'use client'

import { useTheme } from '@/components/FestivalThemeProvider'
import type { FestivalTheme } from '@/lib/theme'

// Quick-react palette (Slack-style) rather than a full emoji picker - kept
// small and fast to tap on mobile. Rendered as line icons (not raw emoji
// glyphs) so they match gigl's monochrome iconography instead of the OS's
// full-colour emoji font. A user can react with more than one of these on
// the same review, just not the same one twice (see show_reactions'
// unique(logged_show_id, user_id, emoji) constraint) - except heart, which
// maps onto the existing like toggle rather than the reactions table.
const REACTIONS = [
  { emoji: '❤️', Icon: HeartGlyph, isLike: true },
  { emoji: '🔥', Icon: FireGlyph, isLike: false },
  { emoji: '😂', Icon: LaughGlyph, isLike: false },
  { emoji: '😮', Icon: WowGlyph, isLike: false },
] as const

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
      display: 'flex', alignItems: 'center', gap: 4,
      borderTop: '1px solid rgba(74,53,40,0.08)',
    }}>
      {REACTIONS.map(({ emoji, Icon, isLike }) => {
        const count  = isLike ? likeCount : (reactionCounts[emoji] ?? 0)
        const active = isLike ? likedByMe : myReactions.includes(emoji)
        const onClick = isLike ? onToggleLike : () => onToggleReaction(emoji)
        return (
          <button
            key={emoji}
            onClick={onClick}
            aria-label={isLike ? (active ? 'Unlike' : 'Like') : `React ${emoji}`}
            style={{
              display: 'flex', alignItems: 'center', gap: 3,
              background: active ? T.accentDim : 'none',
              border: active ? `1.5px solid ${T.accentBorder}` : '1.5px solid transparent',
              borderRadius: 20, padding: '3px 7px', cursor: 'pointer',
            }}
          >
            <Icon active={active} T={T} />
            {count > 0 && (
              <span style={{ fontSize: 11, fontWeight: 600, color: active ? T.accent : T.muted, fontFamily: T.sans }}>{count}</span>
            )}
          </button>
        )
      })}

      <button
        onClick={onOpenComments}
        aria-label="Comments"
        style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', gap: 5, marginLeft: 'auto' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.muted} strokeWidth="2">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
        {commentCount > 0 && (
          <span style={{ fontSize: 11, fontWeight: 600, color: T.muted, fontFamily: T.sans }}>{commentCount}</span>
        )}
      </button>
    </div>
  )
}

// ── Line icons ─────────────────────────────────────────────────────────────
// Drawn to match the existing heart / comment-bubble treatment: 16px, 2px
// stroke, muted by default and filled with the theme accent when active.

interface GlyphProps { active: boolean; T: FestivalTheme }

function HeartGlyph({ active, T }: GlyphProps) {
  return (
    <svg width="15.4" height="15.4" viewBox="0 0 24 24" fill={active ? T.accent : 'none'} stroke={active ? T.accent : T.muted} strokeWidth="2">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

// Flame silhouette (filled, not stroked) - the outline version read as an
// ambiguous blob at 14-16px, a solid tongue-of-flame shape is legible small.
function FireGlyph({ active, T }: GlyphProps) {
  const c = active ? T.accent : T.muted
  return (
    <svg width="15.4" height="15.4" viewBox="0 0 24 24" fill={c} stroke="none">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

function LaughGlyph({ active, T }: GlyphProps) {
  const c = active ? T.accent : T.muted
  return (
    <svg width="15.4" height="15.4" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 9.5q1-1.5 2-.2M14 9.5q1-1.5 2-.2" />
      <path d="M7.5 13.5a4.5 3.5 0 0 0 9 0z" fill={c} stroke="none" />
    </svg>
  )
}

function WowGlyph({ active, T }: GlyphProps) {
  const c = active ? T.accent : T.muted
  return (
    <svg width="15.4" height="15.4" viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="1" fill={c} stroke="none" />
      <circle cx="15" cy="10" r="1" fill={c} stroke="none" />
      <ellipse cx="12" cy="15.5" rx="2" ry="2.5" />
    </svg>
  )
}
