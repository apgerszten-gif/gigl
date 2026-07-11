export interface FestivalTheme {
  // Accent palette
  accent:       string   // primary CTA / active state / high-score badges
  accentDim:    string   // subtle tinted fills
  accentBorder: string   // tinted borders
  accentMuted:  string   // muted accent text
  accentDeep:   string   // text colour on top of filled-accent surfaces (e.g. button labels)
  accentGlow:   string   // shadow / glow tint (soft for light theme)

  // Surfaces
  bg:        string   // page background
  bgRgba:    string   // sticky-header backdrop with opacity
  card:      string   // raised card surface
  cardAlt:   string   // alternating list row tint
  cardInner: string   // inset / inner surface (goes back toward bg)

  // Text
  muted:  string   // secondary / metadata text
  faint:  string   // very muted — dividers, timestamps, placeholders

  // Typography (prop names kept stable to avoid page-wide rename)
  serif: string   // display font — Space Grotesk (weights 500, 700)
  sans:  string   // body / UI font — Inter (weights 400–700)

  // Riso card treatment
  cardBorder: string   // e.g. '1.5px solid #4A3528'
  cardShadow: string   // hard-edge shadow, applied to primary items only

  // Festival logo
  logoFilter: string   // CSS filter applied to <img> festival logos
  logoUrl?:   string
}

// ── Colour helpers ─────────────────────────────────────────────────────────────

const sia = (a: number) => `rgba(184,88,39,${a})`    // burnt sienna
const roo = (a: number) => `rgba(200,137,10,${a})`   // Bonnaroo amber

// ── Shared fonts ───────────────────────────────────────────────────────────────

const FONTS = {
  serif: "'Space Grotesk', sans-serif",  // display / headings
  sans:  "'Inter', sans-serif",          // body / UI
}

// ── Warm Riso Zine (default) ───────────────────────────────────────────────────

export const DEFAULT_THEME: FestivalTheme = {
  accent:       '#B85827',
  accentDim:    sia(0.12),
  accentBorder: sia(0.28),
  accentMuted:  sia(0.70),
  accentDeep:   '#FAF3E2',    // cream text on sienna fills
  accentGlow:   sia(0.20),

  bg:        '#EDE3D0',
  bgRgba:    'rgba(237,227,208,0.92)',
  card:      '#FAF3E2',
  cardAlt:   '#F5EDD8',
  cardInner: '#EDE3D0',

  muted:  '#8B7560',
  faint:  '#B8A898',

  cardBorder: '1.5px solid #4A3528',
  cardShadow: '2px 2px 0 #4A3528',
  logoFilter: 'brightness(0)',   // renders logo in dark ink on light bg

  ...FONTS,
}

// ── Bonnaroo (amber accent, same paper bg) ─────────────────────────────────────

export const BONNAROO_THEME: FestivalTheme = {
  accent:       '#C8890A',
  accentDim:    roo(0.12),
  accentBorder: roo(0.28),
  accentMuted:  roo(0.70),
  accentDeep:   '#FAF3E2',
  accentGlow:   roo(0.20),

  bg:        '#EDE3D0',
  bgRgba:    'rgba(237,227,208,0.92)',
  card:      '#FAF3E2',
  cardAlt:   '#F5EDD8',
  cardInner: '#EDE3D0',

  muted:  '#8B7560',
  faint:  '#B8A898',

  cardBorder: '1.5px solid #4A3528',
  cardShadow: '2px 2px 0 #4A3528',
  logoFilter: 'brightness(0)',
  logoUrl:    'https://cdn.prod.website-files.com/671f413b248a1b1d2376796a/671f6058bca3066c21d7e386_Bonnaroo-Logo-24.png',

  ...FONTS,
}

// ── Lollapalooza / Outside Lands (default palette, festival logo) ─────────────

export const LOLLAPALOOZA_THEME: FestivalTheme = {
  ...DEFAULT_THEME,
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/cd/Lollapalooza_logo.svg',
}

export const OUTSIDE_LANDS_THEME: FestivalTheme = {
  ...DEFAULT_THEME,
  logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Outside_Lands_Music_and_Arts_Festival_2019.png',
}

// ── Registry ───────────────────────────────────────────────────────────────────

const FESTIVAL_THEMES: Record<string, FestivalTheme> = {
  'bonnaroo-2026':      BONNAROO_THEME,
  'lollapalooza-2026':  LOLLAPALOOZA_THEME,
  'outside-lands-2026': OUTSIDE_LANDS_THEME,
}

export function getTheme(festivalId: string | null): FestivalTheme {
  if (festivalId && festivalId in FESTIVAL_THEMES) return FESTIVAL_THEMES[festivalId]
  return DEFAULT_THEME
}
