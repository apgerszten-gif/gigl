export interface FestivalTheme {
  accent: string
  accentDim: string
  accentBorder: string
  accentMuted: string
  accentDeep: string
  accentGlow: string
  bg: string
  bgRgba: string
  card: string
  cardAlt: string
  cardInner: string
  muted: string
  faint: string
  serif: string
  sans: string
  logoUrl?: string
}

const roo = (a: number) => `rgba(232,160,32,${a})`
const ora = (a: number) => `rgba(211,84,0,${a})`

const FONTS = {
  serif: "'Noto Serif', Georgia, serif",
  sans:  "'Manrope', sans-serif",
}

export const DEFAULT_THEME: FestivalTheme = {
  accent:       '#D35400',
  accentDim:    ora(0.12),
  accentBorder: ora(0.2),
  accentMuted:  ora(0.65),
  accentDeep:   '#2a1a00',
  accentGlow:   ora(0.4),
  bg:           '#000000',
  bgRgba:       'rgba(0,0,0,0.75)',
  card:         '#131313',
  cardAlt:      '#0d0d0d',
  cardInner:    '#1a1a1a',
  muted:        '#A8A29E',
  faint:        '#555555',
  ...FONTS,
}

export const BONNAROO_THEME: FestivalTheme = {
  accent:       '#E8A020',
  accentDim:    roo(0.12),
  accentBorder: roo(0.22),
  accentMuted:  roo(0.60),
  accentDeep:   '#1A1200',
  accentGlow:   roo(0.4),
  bg:           '#0A0800',
  bgRgba:       'rgba(10,8,0,0.80)',
  card:         '#141008',
  cardAlt:      '#0E0C04',
  cardInner:    '#1C1608',
  muted:        '#B8A87A',
  faint:        '#5C5040',
  logoUrl:      'https://cdn.prod.website-files.com/671f413b248a1b1d2376796a/671f6058bca3066c21d7e386_Bonnaroo-Logo-24.png',
  ...FONTS,
}

const FESTIVAL_THEMES: Record<string, FestivalTheme> = {
  'bonnaroo-2026': BONNAROO_THEME,
}

export function getTheme(festivalId: string | null): FestivalTheme {
  if (festivalId && festivalId in FESTIVAL_THEMES) return FESTIVAL_THEMES[festivalId]
  return DEFAULT_THEME
}
