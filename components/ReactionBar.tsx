'use client'

import { Heart, MessageCircle } from 'lucide-react'

// The row under each Feed card: a heart (show_likes) and a comment button,
// side by side on the left, each with its count once there is one. The
// fire / laugh / wow reactions that used to sit beside the heart are gone
// from the app; rows already in show_reactions are kept, just not shown.

export interface ReactionBarProps {
  likeCount:      number
  likedByMe:      boolean
  commentCount:   number
  onToggleLike:   () => void
  onOpenComments: () => void
}

export function ReactionBar({ likeCount, likedByMe, commentCount, onToggleLike, onOpenComments }: ReactionBarProps) {
  return (
    <div className="px-2.5 py-1.5 flex items-center gap-1 border-t border-ink/10">
      <button
        type="button"
        onClick={onToggleLike}
        aria-label={likedByMe ? 'Unlike' : 'Like'}
        aria-pressed={likedByMe}
        className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${likedByMe ? 'text-accent' : 'text-ink-muted'}`}
      >
        <Heart className="w-[18px] h-[18px]" strokeWidth={2} fill={likedByMe ? 'currentColor' : 'none'} />
        {likeCount > 0 && <span className="text-[11px] font-semibold">{likeCount}</span>}
      </button>

      <button
        type="button"
        onClick={onOpenComments}
        aria-label="Comments"
        className="flex items-center gap-1.5 rounded-full px-2 py-1 text-ink-muted"
      >
        <MessageCircle className="w-[18px] h-[18px]" strokeWidth={2} />
        {commentCount > 0 && <span className="text-[11px] font-semibold">{commentCount}</span>}
      </button>
    </div>
  )
}
