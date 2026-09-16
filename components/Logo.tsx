// The Gigl wordmark: "Gigl" in Space Grotesk with a sienna slash. `size` is
// the font-size class, kept separate so it never fights the default.
export function Logo({ size = 'text-[21px]', className = '' }: { size?: string; className?: string }) {
  return (
    <span className={`font-display font-bold tracking-[-0.5px] text-ink ${size} ${className}`}>
      Gigl<span className="text-accent">/</span>
    </span>
  )
}
