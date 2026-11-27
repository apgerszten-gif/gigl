/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Design system tokens - DESIGN.md is the source of truth. The colours
      // are CSS variables (app/globals.css), one palette each for the light
      // and dark looks, so the whole app changes when <html data-theme>
      // does (lib/theme-setting.ts, switched from /admin). The names are the
      // riso ones: paper is the page, cream the cards, ink the text, accent
      // the clay-or-sienna actions, terra the dusty rose of places. The
      // alpha-value form is what lets bg-accent/10 and border-ink/30 work.
      colors: {
        paper: 'rgb(var(--c-paper) / <alpha-value>)',          // page background, inset surfaces
        cream: {
          DEFAULT: 'rgb(var(--c-cream) / <alpha-value>)',      // cards; also the text on accent buttons
          alt:     'rgb(var(--c-cream-alt) / <alpha-value>)',  // alternating rows
        },
        ink: {
          DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)',        // text and filled toggles
          muted:   'rgb(var(--c-ink-muted) / <alpha-value>)',  // secondary text
          faint:   'rgb(var(--c-ink-faint) / <alpha-value>)',  // timestamps, placeholders, inactive icons
        },
        accent: {
          DEFAULT: 'rgb(var(--c-accent) / <alpha-value>)',     // CTAs, active states, the logo slash
          hover:   'rgb(var(--c-accent-hover) / <alpha-value>)',
          light:   'rgb(var(--c-accent-light) / <alpha-value>)', // small accent text, where the accent is too dim
        },
        terra: {
          DEFAULT: 'rgb(var(--c-terra) / <alpha-value>)',      // dusty rose: place pins and the place chips
          light:   'rgb(var(--c-terra-light) / <alpha-value>)',
        },
        star:   'rgb(var(--c-accent) / <alpha-value>)',        // star ratings - stars only, no numbers or tiers
        tape:   'rgb(var(--c-tape) / <alpha-value>)',          // the tan tape date tags (DateTag)
        'tape-ink': 'rgb(var(--c-tape-ink) / <alpha-value>)',  // the type on the tape
        danger: 'rgb(var(--c-danger) / <alpha-value>)',        // errors, delete, block
        scrim:  'var(--scrim)',                                // what sheets darken the page with
      },
      // Borders in ink are soft hairlines, not full-strength; an opacity
      // modifier (border-ink/30) still sets its own alpha.
      borderColor: {
        ink: {
          DEFAULT: 'var(--border-ink)',
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
      // No hard riso shadows: soft ones, set per theme in globals.css.
      boxShadow: {
        riso:      'var(--shadow-riso)',
        'riso-lg': 'var(--shadow-riso-lg)',
        marker:    'var(--shadow-marker)',
      },
      letterSpacing: {
        label: '0.08em',
      },
    },
  },
  plugins: [],
}
