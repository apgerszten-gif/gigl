/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Design system tokens - DESIGN.md is the source of truth. Values match
      // DEFAULT_THEME in lib/theme.ts, the Warm Riso Zine look.
      colors: {
        paper: '#EDE3D0',             // page background, inset surfaces
        cream: {
          DEFAULT: '#FAF3E2',         // cards
          alt:     '#F5EDD8',         // alternating rows
        },
        ink: {
          DEFAULT: '#4A3528',         // text, borders, riso shadows
          muted:   '#8B7560',         // secondary text
          faint:   '#B8A898',         // timestamps, placeholders, inactive icons
        },
        accent: {
          DEFAULT: '#B85827',         // burnt sienna: CTAs, active states, the logo slash
          hover:   '#9C4B21',
        },
        terra: '#D4845A',             // soft secondary accent
        star:  '#B85827',             // star ratings - stars only, no numbers or tiers
      },
      fontFamily: {
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        sans:    ['var(--font-inter)', 'sans-serif'],
      },
      borderWidth: {
        '1.5': '1.5px',
      },
      borderRadius: {
        card: '5px',
      },
      boxShadow: {
        riso:      '2px 2px 0 #4A3528',
        'riso-lg': '3px 3px 0 #4A3528',
      },
      letterSpacing: {
        label: '0.08em',
      },
    },
  },
  plugins: [],
}
