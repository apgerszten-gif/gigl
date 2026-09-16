// The Gigl wordmark: "Gigl" in Space Grotesk with a sienna slash. Screens
// still on useTheme() inline their own copy of this; new UI uses this one.
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`font-display text-[21px] font-bold tracking-[-0.5px] text-ink ${className}`}>
      Gigl<span className="text-accent">/</span>
    </span>
  )
}
