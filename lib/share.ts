// Sends a link out: the phone's own share sheet where there is one (texts,
// group chats, AirDrop), otherwise the clipboard. Returns what happened so
// the button can say "Link copied".
export async function shareLink(link: { title: string; text: string; url: string }): Promise<'shared' | 'copied' | 'cancelled' | 'failed'> {
  if (typeof navigator !== 'undefined' && navigator.share) {
    try {
      await navigator.share(link)
      return 'shared'
    } catch (err) {
      // Backing out of the sheet throws AbortError; anything else falls
      // through to the clipboard.
      if ((err as Error).name === 'AbortError') return 'cancelled'
    }
  }
  try {
    await navigator.clipboard.writeText(link.url)
    return 'copied'
  } catch {
    return 'failed'
  }
}

// A review's public page: one person's log of one show. Keyed by handle and
// show id, the pair a log is unique on, so the link exists the moment the
// log is saved, before it has reached the server and has an id of its own.
export function reviewPath(username: string, showId: string, hideStars = false): string {
  return `/r/${encodeURIComponent(username)}/${encodeURIComponent(showId)}${hideStars ? '?b=1' : ''}`
}
