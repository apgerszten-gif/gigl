export interface FestivalArtist {
  id: string
  name: string
  stage: string
  day: string
  headliner?: boolean
}

export interface Festival {
  id: string
  name: string
  shortName: string
  city: string
  state: string
  dates: string
  days: string[]
  dayDates: Record<string, string>   // { friday: 'Jun 13', ... }
  stages: string[]
  emoji: string
  headliners: string[]               // preview list for the picker card
  artists: FestivalArtist[]
}

// ── Lollapalooza 2026 ─────────────────────────────────────────────────────────

const LOLLAPALOOZA: Festival = {
  id: 'lollapalooza-2026',
  name: 'Lollapalooza 2026',
  shortName: 'Lolla',
  city: 'Chicago',
  state: 'IL',
  dates: 'Jul 30 – Aug 2, 2026',
  days: ['thursday', 'friday', 'saturday', 'sunday'],
  dayDates: { thursday: 'Jul 30', friday: 'Jul 31', saturday: 'Aug 1', sunday: 'Aug 2' },
  stages: ['Bud Light Main Stage', 'T-Mobile Stage', 'BMI Stage', 'Pepsi Stage'],
  emoji: '🌊',
  headliners: ['SZA', 'Kendrick Lamar', 'Billie Eilish'],
  artists: [
    // Bud Light Main Stage
    { id: 'lolla-sza',               name: 'SZA',               stage: 'Bud Light Main Stage', day: 'thursday', headliner: true },
    { id: 'lolla-kendrick',          name: 'Kendrick Lamar',    stage: 'Bud Light Main Stage', day: 'friday',   headliner: true },
    { id: 'lolla-billie',            name: 'Billie Eilish',     stage: 'Bud Light Main Stage', day: 'saturday', headliner: true },
    { id: 'lolla-weeknd',            name: 'The Weeknd',        stage: 'Bud Light Main Stage', day: 'sunday',   headliner: true },
    { id: 'lolla-chappell-roan',     name: 'Chappell Roan',     stage: 'Bud Light Main Stage', day: 'friday' },
    { id: 'lolla-doechii',           name: 'Doechii',           stage: 'Bud Light Main Stage', day: 'saturday' },
    { id: 'lolla-tyla',              name: 'Tyla',              stage: 'Bud Light Main Stage', day: 'thursday' },

    // T-Mobile Stage
    { id: 'lolla-steve-lacy',        name: 'Steve Lacy',        stage: 'T-Mobile Stage',       day: 'friday' },
    { id: 'lolla-gracie-abrams',     name: 'Gracie Abrams',     stage: 'T-Mobile Stage',       day: 'saturday' },
    { id: 'lolla-omar-apollo',       name: 'Omar Apollo',       stage: 'T-Mobile Stage',       day: 'sunday' },
    { id: 'lolla-jungle',            name: 'Jungle',            stage: 'T-Mobile Stage',       day: 'thursday' },
    { id: 'lolla-pinkpantheress',    name: 'PinkPantheress',    stage: 'T-Mobile Stage',       day: 'friday' },
    { id: 'lolla-magdalena-bay',     name: 'Magdalena Bay',     stage: 'T-Mobile Stage',       day: 'saturday' },

    // BMI Stage
    { id: 'lolla-jon-batiste',       name: 'Jon Batiste',       stage: 'BMI Stage',            day: 'saturday' },
    { id: 'lolla-wet-leg',           name: 'Wet Leg',           stage: 'BMI Stage',            day: 'friday' },
    { id: 'lolla-caroline-polachek', name: 'Caroline Polachek', stage: 'BMI Stage',            day: 'thursday' },
    { id: 'lolla-ethel-cain',        name: 'Ethel Cain',        stage: 'BMI Stage',            day: 'sunday' },

    // Pepsi Stage
    { id: 'lolla-fred-again',        name: 'Fred Again..',      stage: 'Pepsi Stage',          day: 'friday' },
    { id: 'lolla-four-tet',          name: 'Four Tet',          stage: 'Pepsi Stage',          day: 'saturday' },
    { id: 'lolla-peggy-gou',         name: 'Peggy Gou',         stage: 'Pepsi Stage',          day: 'thursday' },
    { id: 'lolla-kaytranada',        name: 'Kaytranada',        stage: 'Pepsi Stage',          day: 'sunday' },
  ],
}

// ── Outside Lands 2026 ────────────────────────────────────────────────────────

const OUTSIDE_LANDS: Festival = {
  id: 'outside-lands-2026',
  name: 'Outside Lands 2026',
  shortName: 'Outside Lands',
  city: 'San Francisco',
  state: 'CA',
  dates: 'Aug 7–9, 2026',
  days: ['friday', 'saturday', 'sunday'],
  dayDates: { friday: 'Aug 7', saturday: 'Aug 8', sunday: 'Aug 9' },
  stages: ['Lands End Stage', 'Sutro Stage', 'Twin Peaks Stage', 'Panhandle Stage'],
  emoji: '🌉',
  headliners: ['The Cure', 'Tame Impala', 'Lana Del Rey'],
  artists: [
    // Lands End Stage
    { id: 'osl-the-cure',            name: 'The Cure',          stage: 'Lands End Stage',  day: 'friday',   headliner: true },
    { id: 'osl-tame-impala',         name: 'Tame Impala',       stage: 'Lands End Stage',  day: 'saturday', headliner: true },
    { id: 'osl-lana-del-rey',        name: 'Lana Del Rey',      stage: 'Lands End Stage',  day: 'sunday',   headliner: true },
    { id: 'osl-haim',                name: 'HAIM',              stage: 'Lands End Stage',  day: 'friday' },
    { id: 'osl-maggie-rogers',       name: 'Maggie Rogers',     stage: 'Lands End Stage',  day: 'saturday' },

    // Sutro Stage
    { id: 'osl-thundercat',          name: 'Thundercat',        stage: 'Sutro Stage',      day: 'friday' },
    { id: 'osl-khruangbin',          name: 'Khruangbin',        stage: 'Sutro Stage',      day: 'saturday' },
    { id: 'osl-waxahatchee',         name: 'Waxahatchee',       stage: 'Sutro Stage',      day: 'sunday' },
    { id: 'osl-sudan-archives',      name: 'Sudan Archives',    stage: 'Sutro Stage',      day: 'friday' },
    { id: 'osl-ethel-cain',          name: 'Ethel Cain',        stage: 'Sutro Stage',      day: 'saturday' },

    // Twin Peaks Stage
    { id: 'osl-channel-tres',        name: 'Channel Tres',      stage: 'Twin Peaks Stage', day: 'friday' },
    { id: 'osl-magdalena-bay',       name: 'Magdalena Bay',     stage: 'Twin Peaks Stage', day: 'saturday' },
    { id: 'osl-caroline-polachek',   name: 'Caroline Polachek', stage: 'Twin Peaks Stage', day: 'sunday' },
    { id: 'osl-doechii',             name: 'Doechii',           stage: 'Twin Peaks Stage', day: 'friday' },

    // Panhandle Stage
    { id: 'osl-four-tet',            name: 'Four Tet',          stage: 'Panhandle Stage',  day: 'saturday' },
    { id: 'osl-peggy-gou',           name: 'Peggy Gou',         stage: 'Panhandle Stage',  day: 'friday' },
    { id: 'osl-bonobo',              name: 'Bonobo',            stage: 'Panhandle Stage',  day: 'sunday' },
  ],
}

// ── Exports ───────────────────────────────────────────────────────────────────

export const FESTIVALS: Festival[] = [LOLLAPALOOZA, OUTSIDE_LANDS]

export function getFestival(id: string): Festival | null {
  return FESTIVALS.find(f => f.id === id) ?? null
}

export function getArtistsByDay(festival: Festival, day: string): FestivalArtist[] {
  return festival.artists.filter(a => a.day === day)
}

export const LOCAL_STORAGE_KEY = 'gigl_festival_id'
