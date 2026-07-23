const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

export function StarDisplay({
  score, size = 14, accent, gap = 1,
}: {
  score: number; size?: number; accent: string; gap?: number
}) {
  const rounded = Math.round(score * 8) / 8
  const totalWidth = size * 5 + gap * 4
  const filledWidth = Math.max(0, Math.min(totalWidth, (rounded / 5) * totalWidth))

  return (
    <div style={{ position: 'relative', display: 'inline-flex', width: totalWidth, height: size, flexShrink: 0 }}>
      <div style={{ display: 'flex', gap }}>
        {[0, 1, 2, 3, 4].map(i => (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5">
            <polygon points={STAR_POINTS} />
          </svg>
        ))}
      </div>
      <div style={{ position: 'absolute', top: 0, left: 0, display: 'flex', gap, overflow: 'hidden', width: filledWidth }}>
        {[0, 1, 2, 3, 4].map(i => (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" fill={accent} stroke={accent} strokeWidth="1.5">
            <polygon points={STAR_POINTS} />
          </svg>
        ))}
      </div>
    </div>
  )
}
