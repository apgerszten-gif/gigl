import { ARTISTS } from './artists'

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

// ── Coachella 2026 ────────────────────────────────────────────────────────────

const COACHELLA: Festival = {
  id: 'coachella-2026',
  name: 'Coachella 2026',
  shortName: 'Coachella',
  city: 'Indio',
  state: 'CA',
  dates: 'Apr 11–13 & Apr 17–19, 2026',
  days: ['friday', 'saturday', 'sunday'],
  dayDates: { friday: 'Apr 17', saturday: 'Apr 18', sunday: 'Apr 19' },
  stages: ['Coachella Stage', 'Outdoor Theatre', 'Mojave', 'Gobi', 'Sonora', 'Sahara', 'Yuma', 'Do LaB'],
  emoji: '🌴',
  headliners: ['Sabrina Carpenter', 'Justin Bieber', 'KAROL G'],
  artists: ARTISTS as FestivalArtist[],
}

// ── Bonnaroo 2026 ─────────────────────────────────────────────────────────────

const BONNAROO: Festival = {
  id: 'bonnaroo-2026',
  name: 'Bonnaroo 2026',
  shortName: 'Bonnaroo',
  city: 'Manchester',
  state: 'TN',
  dates: 'Jun 11–14, 2026',
  days: ['thursday', 'friday', 'saturday', 'sunday'],
  dayDates: { thursday: 'Jun 11', friday: 'Jun 12', saturday: 'Jun 13', sunday: 'Jun 14' },
  stages: ['Great Stage', 'Which Stage', 'What Stage', 'This Tent', 'Other Tent'],
  emoji: '🌾',
  headliners: ['Post Malone', 'Hozier', 'Tyler, the Creator'],
  artists: [
    // Great Stage
    { id: 'bonnaroo-post-malone',        name: 'Post Malone',          stage: 'Great Stage',  day: 'thursday', headliner: true },
    { id: 'bonnaroo-hozier',             name: 'Hozier',               stage: 'Great Stage',  day: 'friday',   headliner: true },
    { id: 'bonnaroo-tyler-the-creator',  name: 'Tyler, the Creator',   stage: 'Great Stage',  day: 'saturday', headliner: true },
    { id: 'bonnaroo-olivia-rodrigo',     name: 'Olivia Rodrigo',       stage: 'Great Stage',  day: 'sunday',   headliner: true },
    { id: 'bonnaroo-zach-bryan',         name: 'Zach Bryan',           stage: 'Great Stage',  day: 'friday' },
    { id: 'bonnaroo-noah-kahan',         name: 'Noah Kahan',           stage: 'Great Stage',  day: 'saturday' },
    { id: 'bonnaroo-maggie-rogers',      name: 'Maggie Rogers',        stage: 'Great Stage',  day: 'thursday' },

    // Which Stage
    { id: 'bonnaroo-rufus-du-sol',       name: 'Rüfüs Du Sol',         stage: 'Which Stage',  day: 'friday' },
    { id: 'bonnaroo-khruangbin',         name: 'Khruangbin',           stage: 'Which Stage',  day: 'saturday' },
    { id: 'bonnaroo-lcd-soundsystem',    name: 'LCD Soundsystem',      stage: 'Which Stage',  day: 'sunday' },
    { id: 'bonnaroo-bleachers',          name: 'Bleachers',            stage: 'Which Stage',  day: 'thursday' },
    { id: 'bonnaroo-jungle',             name: 'Jungle',               stage: 'Which Stage',  day: 'friday' },
    { id: 'bonnaroo-fleet-foxes',        name: 'Fleet Foxes',          stage: 'Which Stage',  day: 'saturday' },

    // What Stage
    { id: 'bonnaroo-fred-again',         name: 'Fred Again..',         stage: 'What Stage',   day: 'friday' },
    { id: 'bonnaroo-four-tet',           name: 'Four Tet',             stage: 'What Stage',   day: 'saturday' },
    { id: 'bonnaroo-kaytranada',         name: 'Kaytranada',           stage: 'What Stage',   day: 'thursday' },
    { id: 'bonnaroo-bonobo',             name: 'Bonobo',               stage: 'What Stage',   day: 'sunday' },

    // This Tent
    { id: 'bonnaroo-caroline-polachek',  name: 'Caroline Polachek',    stage: 'This Tent',    day: 'friday' },
    { id: 'bonnaroo-japanese-breakfast', name: 'Japanese Breakfast',   stage: 'This Tent',    day: 'saturday' },
    { id: 'bonnaroo-alex-g',             name: 'Alex G',               stage: 'This Tent',    day: 'thursday' },
    { id: 'bonnaroo-ethel-cain',         name: 'Ethel Cain',           stage: 'This Tent',    day: 'sunday' },
    { id: 'bonnaroo-alvvays',            name: 'Alvvays',              stage: 'This Tent',    day: 'friday' },
    { id: 'bonnaroo-waxahatchee',        name: 'Waxahatchee',          stage: 'This Tent',    day: 'saturday' },

    // Other Tent
    { id: 'bonnaroo-billy-strings',      name: 'Billy Strings',        stage: 'Other Tent',   day: 'saturday' },
    { id: 'bonnaroo-goose',              name: 'Goose',                stage: 'Other Tent',   day: 'friday' },
    { id: 'bonnaroo-mt-joy',             name: 'Mt. Joy',              stage: 'Other Tent',   day: 'thursday' },
    { id: 'bonnaroo-rainbow-kitten',     name: 'Rainbow Kitten Surprise', stage: 'Other Tent', day: 'sunday' },
    { id: 'bonnaroo-sylvan-esso',        name: 'Sylvan Esso',          stage: 'Other Tent',   day: 'saturday' },
  ],
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

// ── Governors Ball 2026 ───────────────────────────────────────────────────────

const GOVBALL: Festival = {
  id: 'governors-ball-2026',
  name: "Governor's Ball 2026",
  shortName: "Gov Ball",
  city: 'New York',
  state: 'NY',
  dates: 'Jun 5–7, 2026',
  days: ['friday', 'saturday', 'sunday'],
  dayDates: { friday: 'Jun 5', saturday: 'Jun 6', sunday: 'Jun 7' },
  stages: ['Capital One City Stage', 'Bacardi Stage', 'Mastercard Stage'],
  emoji: '🗽',
  headliners: ['Charli XCX', 'Peso Pluma', 'Doja Cat'],
  artists: [
    // Capital One City Stage
    { id: 'govball-charli-xcx',      name: 'Charli XCX',        stage: 'Capital One City Stage', day: 'friday',   headliner: true },
    { id: 'govball-peso-pluma',      name: 'Peso Pluma',        stage: 'Capital One City Stage', day: 'saturday', headliner: true },
    { id: 'govball-doja-cat',        name: 'Doja Cat',          stage: 'Capital One City Stage', day: 'sunday',   headliner: true },
    { id: 'govball-doechii',         name: 'Doechii',           stage: 'Capital One City Stage', day: 'friday' },
    { id: 'govball-kali-uchis',      name: 'Kali Uchis',        stage: 'Capital One City Stage', day: 'saturday' },

    // Bacardi Stage
    { id: 'govball-clairo',          name: 'Clairo',            stage: 'Bacardi Stage',          day: 'friday' },
    { id: 'govball-alex-g',          name: 'Alex G',            stage: 'Bacardi Stage',          day: 'saturday' },
    { id: 'govball-omar-apollo',     name: 'Omar Apollo',       stage: 'Bacardi Stage',          day: 'sunday' },
    { id: 'govball-pinkpantheress',  name: 'PinkPantheress',    stage: 'Bacardi Stage',          day: 'friday' },
    { id: 'govball-wet-leg',         name: 'Wet Leg',           stage: 'Bacardi Stage',          day: 'saturday' },
    { id: 'govball-magdalena-bay',   name: 'Magdalena Bay',     stage: 'Bacardi Stage',          day: 'sunday' },

    // Mastercard Stage
    { id: 'govball-peggy-gou',       name: 'Peggy Gou',         stage: 'Mastercard Stage',       day: 'saturday' },
    { id: 'govball-four-tet',        name: 'Four Tet',          stage: 'Mastercard Stage',       day: 'friday' },
    { id: 'govball-jungle',          name: 'Jungle',            stage: 'Mastercard Stage',       day: 'sunday' },
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

export const FESTIVALS: Festival[] = [COACHELLA, BONNAROO, LOLLAPALOOZA, GOVBALL, OUTSIDE_LANDS]

export function getFestival(id: string): Festival | null {
  return FESTIVALS.find(f => f.id === id) ?? null
}

export function getArtistsByDay(festival: Festival, day: string): FestivalArtist[] {
  return festival.artists.filter(a => a.day === day)
}

export const LOCAL_STORAGE_KEY = 'gigl_festival_id'
