export type Reaction = 'loved' | 'ok' | 'skip' | null

export interface Artist {
  id: string
  name: string
  day: 'friday' | 'saturday' | 'sunday'
  stage: string
  startTime: string
  endTime: string
  headliner?: boolean
}

export const ARTISTS: Artist[] = [
  // ── FRIDAY April 17 ──────────────────────────────────────────
  { id: 'slayyyter', name: 'Slayyyter', day: 'friday', stage: 'Mojave', startTime: '3:00pm', endTime: '3:45pm' },
  { id: 'lykke-li', name: 'Lykke Li', day: 'friday', stage: 'Outdoor Theatre', startTime: '5:20pm', endTime: '6:10pm' },
  { id: 'teddy-swims', name: 'Teddy Swims', day: 'friday', stage: 'Coachella Stage', startTime: '5:30pm', endTime: '6:20pm' },
  { id: 'central-cee', name: 'Central Cee', day: 'friday', stage: 'Mojave', startTime: '5:30pm', endTime: '6:15pm' },
  { id: 'the-xx', name: 'The xx', day: 'friday', stage: 'Coachella Stage', startTime: '7:00pm', endTime: '7:55pm' },
  { id: 'katseye', name: 'KATSEYE', day: 'friday', stage: 'Sahara', startTime: '8:00pm', endTime: '8:45pm' },
  { id: 'moby', name: 'Moby', day: 'friday', stage: 'Mojave', startTime: '8:10pm', endTime: '9:00pm' },
  { id: 'holly-humberstone', name: 'Holly Humberstone', day: 'friday', stage: 'Gobi', startTime: '8:25pm', endTime: '9:10pm' },
  { id: 'sabrina-carpenter', name: 'Sabrina Carpenter', day: 'friday', stage: 'Coachella Stage', startTime: '9:05pm', endTime: '10:35pm', headliner: true },
  { id: 'ethel-cain', name: 'Ethel Cain', day: 'friday', stage: 'Mojave', startTime: '10:35pm', endTime: '11:25pm' },
  { id: 'disclosure', name: 'Disclosure', day: 'friday', stage: 'Outdoor Theatre', startTime: '10:35pm', endTime: '11:50pm' },
  { id: 'swae-lee', name: 'Swae Lee', day: 'friday', stage: 'Sahara', startTime: '10:50pm', endTime: '11:40pm' },
  { id: 'blood-orange', name: 'Blood Orange', day: 'friday', stage: 'Mojave', startTime: '11:55pm', endTime: '12:45am' },
  { id: 'anyma', name: 'Anyma', day: 'friday', stage: 'Coachella Stage', startTime: '12:00am', endTime: '' },
  { id: 'sexyy-red', name: 'Sexyy Red', day: 'friday', stage: 'Sahara', startTime: '12:05am', endTime: '12:55am' },

  // ── SATURDAY April 18 ────────────────────────────────────────
  { id: 'jack-white', name: 'Jack White', day: 'saturday', stage: 'Mojave', startTime: '3:00pm', endTime: '3:45pm' },
  { id: 'addison-rae', name: 'Addison Rae', day: 'saturday', stage: 'Coachella Stage', startTime: '5:30pm', endTime: '6:20pm' },
  { id: 'giveon', name: 'Giveon', day: 'saturday', stage: 'Coachella Stage', startTime: '7:00pm', endTime: '7:50pm' },
  { id: 'sombr', name: 'Sombr', day: 'saturday', stage: 'Outdoor Theatre', startTime: '7:05pm', endTime: '7:55pm' },
  { id: 'labrinth', name: 'Labrinth', day: 'saturday', stage: 'Outdoor Theatre', startTime: '8:30pm', endTime: '9:25pm' },
  { id: 'pinkpantheress', name: 'PinkPantheress', day: 'saturday', stage: 'Mojave', startTime: '8:55pm', endTime: '9:45pm' },
  { id: 'bia', name: 'BIA', day: 'saturday', stage: 'Gobi', startTime: '9:00pm', endTime: '9:45pm' },
  { id: 'david-guetta', name: 'David Guetta', day: 'saturday', stage: 'Quasar', startTime: '9:00pm', endTime: '11:00pm' },
  { id: 'the-strokes', name: 'The Strokes', day: 'saturday', stage: 'Coachella Stage', startTime: '9:00pm', endTime: '10:10pm' },
  { id: 'interpol', name: 'Interpol', day: 'saturday', stage: 'Mojave', startTime: '10:15pm', endTime: '11:15pm' },
  { id: 'david-byrne', name: 'David Byrne', day: 'saturday', stage: 'Outdoor Theatre', startTime: '10:20pm', endTime: '11:20pm' },
  { id: 'justin-bieber', name: 'Justin Bieber', day: 'saturday', stage: 'Coachella Stage', startTime: '11:25pm', endTime: '', headliner: true },

  // ── SUNDAY April 19 ──────────────────────────────────────────
  { id: 'gigi-perez', name: 'Gigi Perez', day: 'sunday', stage: 'Outdoor Theatre', startTime: '4:00pm', endTime: '4:45pm' },
  { id: 'little-simz', name: 'Little Simz', day: 'sunday', stage: 'Mojave', startTime: '4:25pm', endTime: '5:10pm' },
  { id: 'wet-leg', name: 'Wet Leg', day: 'sunday', stage: 'Coachella Stage', startTime: '4:45pm', endTime: '5:30pm' },
  { id: 'clipse', name: 'Clipse', day: 'sunday', stage: 'Outdoor Theatre', startTime: '5:15pm', endTime: '6:10pm' },
  { id: 'major-lazer', name: 'Major Lazer', day: 'sunday', stage: 'Coachella Stage', startTime: '6:10pm', endTime: '7:10pm' },
  { id: 'foster-the-people', name: 'Foster the People', day: 'sunday', stage: 'Outdoor Theatre', startTime: '6:45pm', endTime: '7:40pm' },
  { id: 'iggy-pop', name: 'Iggy Pop', day: 'sunday', stage: 'Mojave', startTime: '7:10pm', endTime: '8:10pm' },
  { id: 'young-thug', name: 'Young Thug', day: 'sunday', stage: 'Coachella Stage', startTime: '7:50pm', endTime: '8:40pm' },
  { id: 'fatboy-slim', name: 'Fatboy Slim', day: 'sunday', stage: 'Quasar', startTime: '8:00pm', endTime: '10:00pm' },
  { id: 'laufey', name: 'Laufey', day: 'sunday', stage: 'Outdoor Theatre', startTime: '8:40pm', endTime: '9:40pm' },
  { id: 'fka-twigs', name: 'FKA twigs', day: 'sunday', stage: 'Mojave', startTime: '8:45pm', endTime: '10:00pm' },
  { id: 'karol-g', name: 'Karol G', day: 'sunday', stage: 'Coachella Stage', startTime: '9:55pm', endTime: '', headliner: true },
  { id: 'kaskade', name: 'Kaskade', day: 'sunday', stage: 'Sahara', startTime: '10:45pm', endTime: '11:55pm' },
]

export const ARTISTS_BY_DAY = {
  friday: ARTISTS.filter(a => a.day === 'friday'),
  saturday: ARTISTS.filter(a => a.day === 'saturday'),
  sunday: ARTISTS.filter(a => a.day === 'sunday'),
}

export const DAY_DATES: Record<string, string> = {
  friday: 'Apr 17',
  saturday: 'Apr 18',
  sunday: 'Apr 19',
}
