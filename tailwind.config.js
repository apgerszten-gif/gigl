/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Design system tokens - DESIGN.md is the source of truth.
      colors: {
        surface: {
          DEFAULT: '#FFF8F5',
          dim:     '#E2D8D2',
          bright:  '#FFF8F5',
          container: {
            lowest:  '#FFFFFF',
            low:     '#FCF2EB',
            DEFAULT: '#F5ECE5',
            high:    '#EFE5DF',
            highest: '#E8DED8',
          },
        },
        primary: {
          DEFAULT: '#D95D39',
          hover:   '#C2410C',
          light:   '#FFEDD5',
        },
        ink: {
          // DEFAULT is the legacy Warm Riso Zine ink, kept so existing
          // `text-ink` usages don't break mid-migration. New code uses the
          // named shades.
          DEFAULT: '#4A3528',
          title:   '#1C1917',
          body:    '#44403C',
          muted:   '#78716C',
          faint:   '#A8A29E',
        },
        score: {
          elite:  '#15803D',
          epic:   '#16A34A',
          superb: '#EA580C',
          good:   '#CA8A04',
        },

        // Legacy Warm Riso Zine palette - remove once every screen is on the
        // tokens above (see "Migration status" in CLAUDE.md).
        paper:  '#EDE3D0',
        cream:  '#FAF3E2',
        sienna: '#B85827',
        terra:  '#D4845A',
        taupe:  '#8B7560',
        faint:  '#B8A898',
      },
      fontFamily: {
        epilogue: ['var(--font-epilogue)', 'Epilogue', 'sans-serif'],
        // Legacy - see above.
        display: ['var(--font-space-grotesk)', 'sans-serif'],
        sans:    ['var(--font-inter)', 'sans-serif'],
      },
      borderRadius: {
        inherit:  'inherit',
        squircle: '14px',
      },
      boxShadow: {
        'warm-sm': '0 1px 3px rgba(41, 37, 36, 0.05)',
        'warm-md': '0 4px 14px rgba(217, 93, 57, 0.08), 0 2px 6px rgba(41, 37, 36, 0.04)',
        'warm-lg': '0 10px 25px -5px rgba(217, 93, 57, 0.15)',
      },
    },
  },
  plugins: [],
}
