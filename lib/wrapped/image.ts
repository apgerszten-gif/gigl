'use client'

// A Wrapped screenshot, ready to send: re-encoded as a JPEG no longer than
// LONG_EDGE on its long side. A phone screenshot is 2-4MB; this is a few
// hundred KB, which keeps two of them well under Vercel's 4.5MB request cap,
// and is about as large as Claude reads a picture anyway. Wrapped's lettering
// is big, so nothing that matters is lost.
const LONG_EDGE = 1568
const QUALITY = 0.85

export interface PreparedImage {
  // Base64, without the data: prefix.
  data:    string
  // An object URL for the thumbnail in the upload sheet.
  preview: string
}

// `longEdge` is smaller for a batch of photos (lib/photos), where several
// share one request.
export async function prepareScreenshot(file: File, longEdge = LONG_EDGE): Promise<PreparedImage> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error("Couldn't open that picture. Try a screenshot saved as a JPEG or PNG."))
      el.src = url
    })

    const scale = Math.min(1, longEdge /Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error("Couldn't process that picture.")
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    const dataUrl = canvas.toDataURL('image/jpeg', QUALITY)
    return { data: dataUrl.slice(dataUrl.indexOf(',') + 1), preview: url }
  } catch (err) {
    URL.revokeObjectURL(url)
    throw err
  }
}
