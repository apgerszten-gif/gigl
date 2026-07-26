'use client'

import Image from 'next/image'
import { VideoPlayer } from './VideoPlayer'

function isVideoUrl(url: string): boolean {
  const ext = url.split('?')[0].split('.').pop()?.toLowerCase()
  return ['mp4', 'mov', 'webm', 'm4v', 'avi'].includes(ext ?? '')
}

export function MediaGrid({ urls, maxHeight = 220 }: { urls: string[]; maxHeight?: number }) {
  if (urls.length === 0) return null

  if (urls.length === 1) {
    const url = urls[0]
    return isVideoUrl(url)
      ? <VideoPlayer src={url} style={{ maxHeight, objectFit: 'cover' }} />
      : (
        <div style={{ position: 'relative', width: '100%', height: maxHeight }}>
          <Image src={url} alt="" fill sizes="430px" style={{ objectFit: 'cover' }} />
        </div>
      )
  }

  return (
    <div style={{ display: 'flex', gap: 2, overflowX: 'auto' }}>
      {urls.map((url, i) => (
        <div key={i} style={{ flexShrink: 0, width: '78%', maxWidth: 280 }}>
          {isVideoUrl(url)
            ? <VideoPlayer src={url} style={{ height: maxHeight, objectFit: 'cover' }} />
            : (
              <div style={{ position: 'relative', width: '100%', height: maxHeight }}>
                <Image src={url} alt="" fill sizes="280px" style={{ objectFit: 'cover' }} />
              </div>
            )}
        </div>
      ))}
    </div>
  )
}
