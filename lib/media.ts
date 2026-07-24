export function resolveMediaUrls(row: { media_urls?: string[] | null; photo_url: string | null }): string[] {
  if (row.media_urls && row.media_urls.length > 0) return row.media_urls
  return row.photo_url ? [row.photo_url] : []
}
