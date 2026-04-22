'use client'
import { useState } from 'react'

interface Props {
  src: string
  style?: React.CSSProperties
}

export function VideoPlayer({ src, style }: Props) {
  const [muted, setMuted] = useState(true)
  return (
    <div style={{ position: 'relative', width: '100%', lineHeight: 0 }}>
      <video
        src={src}
        autoPlay
        muted={muted}
        loop
        playsInline
        onClick={() => setMuted(m => !m)}
        style={{ display: 'block', width: '100%', cursor: 'pointer', ...style }}
      />
      <div style={{
        position: 'absolute', bottom: 8, right: 8,
        background: 'rgba(0,0,0,0.55)', borderRadius: 20,
        padding: '3px 10px', fontSize: 12,
        pointerEvents: 'none', lineHeight: 1.4,
      }}>
        {muted ? '🔇' : '🔊'}
      </div>
    </div>
  )
}
