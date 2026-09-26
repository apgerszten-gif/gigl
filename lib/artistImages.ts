import type { SupabaseClient } from '@supabase/supabase-js'
import { nameKey } from './nameKey'

// Artist photos live in public.artist_images, keyed by a normalised artist
// name so "Charli xcx", "Charli XCX" and "Charli XCX " share one photo. The
// nightly sync fills the table; everything else only reads it.

export function artistKey(name: string): string {
  return nameKey(name)
}

// PostgREST puts `in` filters in the URL, so look keys up in chunks.
const KEY_CHUNK = 150

// Photo URLs for the given keys, as key -> url. Keys without a photo are
// simply absent. A failed lookup returns what it has rather than throwing:
// a missing photo only ever means the placeholder shows.
export async function fetchArtistImagesByKey(client: SupabaseClient, keys: string[]): Promise<Record<string, string>> {
  const unique = Array.from(new Set(keys.filter(Boolean)))
  const found: Record<string, string> = {}

  for (let i = 0; i < unique.length; i += KEY_CHUNK) {
    const { data, error } = await client
      .from('artist_images')
      .select('artist_key, image_url')
      .in('artist_key', unique.slice(i, i + KEY_CHUNK))
      .not('image_url', 'is', null)
    if (error) {
      console.error('[artist_images] lookup failed:', error.message)
      break
    }
    data?.forEach(row => { if (row.image_url) found[row.artist_key] = row.image_url })
  }

  return found
}

// Server-side convenience: name -> url lookup function for a set of names.
export async function getArtistImages(client: SupabaseClient, names: string[]): Promise<(name: string) => string | null> {
  const found = await fetchArtistImagesByKey(client, names.map(artistKey))
  return name => found[artistKey(name)] ?? null
}
