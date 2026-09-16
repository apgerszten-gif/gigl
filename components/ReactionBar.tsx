'use client'

import { MessageCircle } from 'lucide-react'

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
  return (
    <div className="px-3 py-2 flex items-center gap-1 border-t border-ink/10">
      {REACTIONS.map(({ emoji, Icon, isLike }) => {
        const count  = isLike ? likeCount : (reactionCounts[emoji] ?? 0)
        const active = isLike ? likedByMe : myReactions.includes(emoji)
        const onClick = isLike ? onToggleLike : () => onToggleReaction(emoji)
        return (
          <button
            key={emoji}
            type="button"
            onClick={onClick}
            aria-label={isLike ? (active ? 'Unlike' : 'Like') : `React ${emoji}`}
            className={`flex items-center gap-1 rounded-full px-2 py-1 border-1.5 ${
              active ? 'bg-accent/10 border-accent/30 text-accent' : 'border-transparent text-ink-muted'
            }`}
          >
            <Icon active={active} />
            {count > 0 && <span className="text-[11px] font-semibold">{count}</span>}
          </button>
        )
      })}

      <button
        type="button"
        onClick={onOpenComments}
        aria-label="Comments"
        className="ml-auto flex items-center gap-1 px-1 text-ink-muted"
      >
        <MessageCircle className="w-4 h-4" strokeWidth={2} />
        {commentCount > 0 && <span className="text-[11px] font-semibold">{commentCount}</span>}
      </button>
    </div>
  )
}

// ── Line icons ─────────────────────────────────────────────────────────────
// 15px, 2px stroke, drawn in currentColor so the button's text colour (muted,
// or sienna when active) carries through. Heart fills in when active.

function HeartGlyph({ active }: { active: boolean }) {
  return (
    <svg width="15.4" height="15.4" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
    </svg>
  )
}

// Flame silhouette (filled, not stroked) - the outline version read as an
// ambiguous blob at 14-16px, a solid tongue-of-flame shape is legible small.
function FireGlyph(_: { active: boolean }) {
  return (
    <svg width="15.4" height="15.4" viewBox="0 0 24 24" fill="currentColor" stroke="none">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  )
}

function LaughGlyph(_: { active: boolean }) {
  return (
    <svg width="15.4" height="15.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M8 9.5q1-1.5 2-.2M14 9.5q1-1.5 2-.2" />
      <path d="M7.5 13.5a4.5 3.5 0 0 0 9 0z" fill="currentColor" stroke="none" />
    </svg>
  )
}

function WowGlyph(_: { active: boolean }) {
  return (
    <svg width="15.4" height="15.4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="1" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="15.5" rx="2" ry="2.5" />
    </svg>
  )
}
