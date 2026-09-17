'use client'

import type { SupabaseClient } from '@supabase/supabase-js'

// Profile photos are stored in the show-photos bucket, under the user's own
// folder like log media, as a 512px square JPEG.
const BUCKET = 'show-photos'
const AVATAR_SIZE = 512

// Centre-crops the picked image to a square and re-encodes it, so a 12MP
// phone photo uploads as ~60KB instead of several megabytes.
async function toSquareJpeg(file: File): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Couldn't read that image. Try a JPEG or PNG."))
      el.src = url
    })

    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_SIZE
    canvas.height = AVATAR_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error("Couldn't process that image.")
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side,
      0, 0, AVATAR_SIZE, AVATAR_SIZE,
    )

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error("Couldn't process that image.")), 'image/jpeg', 0.85)
    })
  } finally {
    URL.revokeObjectURL(url)
  }
}

// Uploads a new profile photo and points profiles.avatar_url at it.
// Returns the new public URL. The previous photo, if it was one of ours,
// is removed afterwards on a best-effort basis.
export async function uploadAvatar(client: SupabaseClient, userId: string, file: File, previousUrl: string | null): Promise<string> {
  const blob = await toSquareJpeg(file)
  const path = `${userId}/avatar-${Date.now()}.jpg`

  const { error: uploadError } = await client.storage.from(BUCKET).upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

  const { data } = client.storage.from(BUCKET).getPublicUrl(path)
  const { error: updateError } = await client.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', userId)
  if (updateError) throw new Error(`Saving your photo failed: ${updateError.message}`)

  void removeStoredAvatar(client, previousUrl)
  return data.publicUrl
}

export async function removeAvatar(client: SupabaseClient, userId: string, currentUrl: string | null): Promise<void> {
  const { error } = await client.from('profiles').update({ avatar_url: null }).eq('id', userId)
  if (error) throw new Error(`Removing your photo failed: ${error.message}`)
  void removeStoredAvatar(client, currentUrl)
}

async function removeStoredAvatar(client: SupabaseClient, url: string | null) {
  const marker = `/object/public/${BUCKET}/`
  if (!url || !url.includes(marker)) return
  const path = url.slice(url.indexOf(marker) + marker.length)
  if (!/\/avatar-\d+\.jpg$/.test(path)) return
  await client.storage.from(BUCKET).remove([path]).catch(() => undefined)
}
