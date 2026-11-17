export function isVideoUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ['mp4', 'mov', 'webm', 'm4v', 'avi'].includes(ext ?? '')
}

export function resolveMediaUrls(row: { media_urls?: string[] | null; photo_url: string | null }): string[] {
  if (row.media_urls && row.media_urls.length > 0) return row.media_urls
  return row.photo_url ? [row.photo_url] : []
}
