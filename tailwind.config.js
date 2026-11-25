/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Design system tokens - DESIGN.md is the source of truth. This is
      // Mojave Night: a warm brown-black page, bone text, earthy clay for
      // actions and stars, dusty rose for places. The token names are the
      // riso ones (paper, cream, ink), so every screen built from them turns
      // dark without being rewritten: paper is the page, cream the cards,
      // ink the text.
      colors: {
        paper: '#1B1612',             // page background, inset surfaces
        cream: {
          DEFAULT: '#251E18',         // cards; also the dark text on amber buttons
          alt:     '#211A15',         // alternating rows
        },
        ink: {
          DEFAULT: '#EDE4D1',         // text and filled toggles (bone)
          muted:   '#A99D89',         // secondary text
          faint:   '#908573',         // timestamps, placeholders, inactive icons
        },
        accent: {
          DEFAULT: '#BF734A',         // earthy clay: CTAs, active states, the logo slash
          hover:   '#CB8158',
          light:   '#D3916A',         // small accent text on dark, where clay is too dim
        },
        terra: {
          DEFAULT: '#C08B7E',         // dusty rose: place pins and the place chips
          light:   '#D4A396',         // rose text on dark
        },
        star:  '#BF734A',             // star ratings - stars only, no numbers or tiers
        tape:  '#CBB084',             // the tan tape date tags (DateTag)
      },
      // Borders in ink are soft hairlines on the dark page, not full-strength
      // bone; an opacity modifier (border-ink/30) still sets its own alpha.
      borderColor: {
        ink: {
          DEFAULT: 'rgba(237, 228, 209, 0.16)',
        },
      },
      fontFamily: {
        display: ['var(--font-fraunces)', 'serif'],          // headlines, names
        sans:    ['var(--font-instrument)', 'sans-serif'],   // everything else
        slab:    ['var(--font-alfa-slab)', 'serif'],         // big numbers: stats, ranks, years
        mono:    ['var(--font-courier)', 'monospace'],       // labels, marker tabs, tape dates
      },
      borderWidth: {
        '1.5': '1.5px',
      },
      borderRadius: {
        card: '12px',
      },
      // No hard riso shadows on a dark page: they'd be darker than the page.
      boxShadow: {
        riso:      '0 1px 0 rgba(0, 0, 0, 0.35)',
        'riso-lg': '0 10px 28px rgba(0, 0, 0, 0.5)',
        marker:    'inset 0 -8px 0 rgba(191, 115, 74, 0.6)',
      },
      letterSpacing: {
        label: '0.08em',
      },
    },
  },
  plugins: [],
}
