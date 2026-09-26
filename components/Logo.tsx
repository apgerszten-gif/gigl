import Link from 'next/link'

// The Gigl wordmark: "Gigl" in Space Grotesk with a sienna slash. `size` is
// the font-size class, kept separate so it never fights the default.
//
// `href` makes it a link home. Opt-in rather than always-on because the
// wordmark also appears where navigating would be wrong: the sign-in and
// username screens (no feed to go to yet), the intro demo, and the style
// guide. Headers that already have a back control pass the logo to
// BackHeader instead, which is its own route home.
export function Logo({ size = 'text-[21px]', className = '', href }: {
  size?: string; className?: string; href?: string
}) {
  const mark = (
    <span className={`font-display font-bold tracking-[-0.5px] text-ink ${size} ${className}`}>
      Gigl<span className="text-accent">/</span>
    </span>
  )

  return href ? <Link href={href} aria-label="Go to your feed">{mark}</Link> : mark
}
