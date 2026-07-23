const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2'

// One star, filled left-to-right by `fill` (0-1). The overflow-clip is
// scoped to this single star's own box, so each star's partial fill is
// exact and independent of its neighbors — no cross-star subpixel drift
// from clipping a whole row of stars at once.
function StarUnit({ fill, size, accent }: { fill: number; size: number; accent: string }) {
  return (
    <span style={{ position: 'relative', display: 'inline-block', width: size, height: size, lineHeight: 0, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={accent} strokeWidth="1.5" style={{ display: 'block' }}>
        <polygon points={STAR_POINTS} />
      </svg>
      {fill > 0 && (
        <span style={{
          position: 'absolute', top: 0, left: 0,
          width: size * fill, height: size, overflow: 'hidden', display: 'block',
        }}>
          <svg width={size} height={size} viewBox="0 0 24 24" fill={accent} stroke={accent} strokeWidth="1.5" style={{ display: 'block' }}>
            <polygon points={STAR_POINTS} />
          </svg>
        </span>
      )}
    </span>
  )
}

export function StarDisplay({
  score, size = 14, accent, gap = 1,
}: {
  score: number; size?: number; accent: string; gap?: number
}) {
  const rounded = Math.round(score * 8) / 8

  return (
    <div style={{ display: 'inline-flex', gap, flexShrink: 0 }}>
      {[0, 1, 2, 3, 4].map(i => {
        const fill = Math.max(0, Math.min(1, rounded - i))
        return <StarUnit key={i} fill={fill} size={size} accent={accent} />
      })}
    </div>
  )
}
