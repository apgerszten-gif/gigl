export type Stage = 'Coachella' | 'Outdoor' | 'Sahara' | 'Mojave' | 'Gobi' | 'Sonora' | 'Yuma'
export type Day = 'Friday' | 'Saturday' | 'Sunday'
export type Genre = 'Pop' | 'Hip-Hop' | 'Electronic' | 'Rock' | 'Indie' | 'R&B' | 'Latin' | 'Alternative' | 'Dance' | 'Experimental' | 'Folk' | 'Punk'

export interface Artist {
  id: string
  name: string
  stage: Stage
  day: Day
  genre: Genre
  emoji: string
}

export const artists: Artist[] = [
  // HEADLINERS
  { id: 'sabrina-carpenter', name: 'Sabrina Carpenter', stage: 'Coachella', day: 'Friday', genre: 'Pop', emoji: '🎤' },
  { id: 'justin-bieber', name: 'Justin Bieber', stage: 'Coachella', day: 'Saturday', genre: 'Pop', emoji: '🎤' },
  { id: 'karol-g', name: 'Karol G', stage: 'Coachella', day: 'Sunday', genre: 'Latin', emoji: '🎤' },

  // COACHELLA STAGE
  { id: 'the-strokes', name: 'The Strokes', stage: 'Coachella', day: 'Friday', genre: 'Rock', emoji: '🎸' },
  { id: 'laufey', name: 'Laufey', stage: 'Coachella', day: 'Friday', genre: 'Folk', emoji: '🎻' },
  { id: 'ethel-cain', name: 'Ethel Cain', stage: 'Coachella', day: 'Friday', genre: 'Alternative', emoji: '🎤' },
  { id: 'interpol', name: 'Interpol', stage: 'Coachella', day: 'Saturday', genre: 'Indie', emoji: '🎸' },
  { id: 'fka-twigs', name: 'FKA twigs', stage: 'Coachella', day: 'Saturday', genre: 'Experimental', emoji: '🎤' },
  { id: 'david-byrne', name: 'David Byrne', stage: 'Coachella', day: 'Saturday', genre: 'Rock', emoji: '🎸' },
  { id: 'clipse', name: 'Clipse', stage: 'Coachella', day: 'Sunday', genre: 'Hip-Hop', emoji: '🎤' },
  { id: 'wet-leg', name: 'Wet Leg', stage: 'Coachella', day: 'Sunday', genre: 'Indie', emoji: '🎸' },
  { id: 'alex-g', name: 'Alex G', stage: 'Coachella', day: 'Sunday', genre: 'Indie', emoji: '🎸' },

  // OUTDOOR STAGE
  { id: 'anyma', name: 'Anyma', stage: 'Outdoor', day: 'Saturday', genre: 'Electronic', emoji: '🎹' },
  { id: 'the-xx', name: 'The xx', stage: 'Outdoor', day: 'Friday', genre: 'Indie', emoji: '🎸' },
  { id: 'disclosure', name: 'Disclosure', stage: 'Outdoor', day: 'Sunday', genre: 'Dance', emoji: '🎹' },
  { id: 'iggy-pop', name: 'Iggy Pop', stage: 'Outdoor', day: 'Friday', genre: 'Punk', emoji: '🎸' },
  { id: 'turnstile', name: 'Turnstile', stage: 'Outdoor', day: 'Saturday', genre: 'Punk', emoji: '🎸' },
  { id: 'dijon', name: 'Dijon', stage: 'Outdoor', day: 'Sunday', genre: 'R&B', emoji: '🎤' },
  { id: 'addison-rae', name: 'Addison Rae', stage: 'Outdoor', day: 'Friday', genre: 'Pop', emoji: '🎤' },
  { id: 'young-thug', name: 'Young Thug', stage: 'Outdoor', day: 'Saturday', genre: 'Hip-Hop', emoji: '🎤' },
  { id: 'bigbang', name: 'BIGBANG', stage: 'Outdoor', day: 'Sunday', genre: 'Pop', emoji: '🎤' },

  // SAHARA STAGE
  { id: 'fisher', name: 'FISHER', stage: 'Sahara', day: 'Friday', genre: 'Electronic', emoji: '🎹' },
  { id: 'rezz', name: 'Rezz', stage: 'Sahara', day: 'Friday', genre: 'Electronic', emoji: '🎹' },
  { id: 'amelie-lens', name: 'Amelie Lens', stage: 'Sahara', day: 'Saturday', genre: 'Electronic', emoji: '🎹' },
  { id: 'charlotte-de-witte', name: 'Charlotte de Witte', stage: 'Sahara', day: 'Saturday', genre: 'Electronic', emoji: '🎹' },
  { id: 'bicep', name: 'Bicep', stage: 'Sahara', day: 'Sunday', genre: 'Electronic', emoji: '🎹' },
  { id: 'fred-again', name: 'Fred again..', stage: 'Sahara', day: 'Friday', genre: 'Electronic', emoji: '🎹' },
  { id: 'four-tet', name: 'Four Tet', stage: 'Sahara', day: 'Saturday', genre: 'Electronic', emoji: '🎹' },
  { id: 'peggy-gou', name: 'Peggy Gou', stage: 'Sahara', day: 'Sunday', genre: 'Electronic', emoji: '🎹' },
  { id: 'skrillex', name: 'Skrillex', stage: 'Sahara', day: 'Saturday', genre: 'Electronic', emoji: '🎹' },
  { id: 'caribou', name: 'Caribou', stage: 'Sahara', day: 'Sunday', genre: 'Electronic', emoji: '🎹' },

  // MOJAVE STAGE
  { id: 'mk-gee', name: 'Mk.gee', stage: 'Mojave', day: 'Friday', genre: 'Indie', emoji: '🎸' },
  { id: 'mdou-moctar', name: 'Mdou Moctar', stage: 'Mojave', day: 'Saturday', genre: 'Rock', emoji: '🎸' },
  { id: 'arooj-aftab', name: 'Arooj Aftab', stage: 'Mojave', day: 'Sunday', genre: 'Experimental', emoji: '🎵' },
  { id: 'built-to-spill', name: 'Built to Spill', stage: 'Mojave', day: 'Friday', genre: 'Indie', emoji: '🎸' },
  { id: 'mannequin-pussy', name: 'Mannequin Pussy', stage: 'Mojave', day: 'Saturday', genre: 'Punk', emoji: '🎸' },
  { id: 'model-model', name: 'Model/Actriz', stage: 'Mojave', day: 'Sunday', genre: 'Alternative', emoji: '🎸' },
  { id: 'yo-la-tengo', name: 'Yo La Tengo', stage: 'Mojave', day: 'Friday', genre: 'Indie', emoji: '🎸' },
  { id: 'james-blake', name: 'James Blake', stage: 'Mojave', day: 'Saturday', genre: 'Experimental', emoji: '🎹' },
  { id: 'floating-points', name: 'Floating Points', stage: 'Mojave', day: 'Sunday', genre: 'Electronic', emoji: '🎹' },

  // GOBI STAGE
  { id: 'khruangbin', name: 'Khruangbin', stage: 'Gobi', day: 'Friday', genre: 'Indie', emoji: '🎸' },
  { id: 'caroline-polachek', name: 'Caroline Polachek', stage: 'Gobi', day: 'Saturday', genre: 'Pop', emoji: '🎤' },
  { id: 'yussef-dayes', name: 'Yussef Dayes', stage: 'Gobi', day: 'Sunday', genre: 'Experimental', emoji: '🥁' },
  { id: 'sampha', name: 'Sampha', stage: 'Gobi', day: 'Friday', genre: 'R&B', emoji: '🎹' },
  { id: 'jpegmafia', name: 'JPEGMAFIA', stage: 'Gobi', day: 'Saturday', genre: 'Hip-Hop', emoji: '🎤' },
  { id: 'jessica-pratt', name: 'Jessica Pratt', stage: 'Gobi', day: 'Sunday', genre: 'Folk', emoji: '🎸' },
  { id: 'tems', name: 'Tems', stage: 'Gobi', day: 'Friday', genre: 'R&B', emoji: '🎤' },
  { id: 'mk-xyz', name: 'MK', stage: 'Gobi', day: 'Saturday', genre: 'Dance', emoji: '🎹' },
  { id: 'underworld', name: 'Underworld', stage: 'Gobi', day: 'Sunday', genre: 'Electronic', emoji: '🎹' },

  // SONORA STAGE
  { id: 'supreme-jubilee', name: 'Special Interest', stage: 'Sonora', day: 'Friday', genre: 'Punk', emoji: '🎸' },
  { id: 'sprints', name: 'Sprints', stage: 'Sonora', day: 'Friday', genre: 'Punk', emoji: '🎸' },
  { id: 'soul-glo', name: 'Soul Glo', stage: 'Sonora', day: 'Saturday', genre: 'Punk', emoji: '🎸' },
  { id: 'geese', name: 'Geese', stage: 'Sonora', day: 'Saturday', genre: 'Rock', emoji: '🎸' },
  { id: 'ecca-vandal', name: 'Bar Italia', stage: 'Sonora', day: 'Sunday', genre: 'Indie', emoji: '🎸' },
  { id: 'the-dare', name: 'The Dare', stage: 'Sonora', day: 'Friday', genre: 'Dance', emoji: '🎹' },
  { id: 'yeule', name: 'Yeule', stage: 'Sonora', day: 'Saturday', genre: 'Experimental', emoji: '🎤' },
  { id: 'english-teacher', name: 'English Teacher', stage: 'Sonora', day: 'Sunday', genre: 'Indie', emoji: '🎸' },

  // YUMA STAGE
  { id: 'call-super', name: 'Call Super', stage: 'Yuma', day: 'Friday', genre: 'Electronic', emoji: '🎹' },
  { id: 'hunee', name: 'Hunee', stage: 'Yuma', day: 'Saturday', genre: 'Electronic', emoji: '🎹' },
  { id: 'pional', name: 'Pional', stage: 'Yuma', day: 'Sunday', genre: 'Electronic', emoji: '🎹' },
  { id: 'objekt', name: 'Objekt', stage: 'Yuma', day: 'Friday', genre: 'Electronic', emoji: '🎹' },
  { id: 'blawan', name: 'Blawan', stage: 'Yuma', day: 'Saturday', genre: 'Electronic', emoji: '🎹' },
  { id: 'shackleton', name: 'Shackleton', stage: 'Yuma', day: 'Sunday', genre: 'Electronic', emoji: '🎹' },
]

export function getArtistsByDay(day: Day): Artist[] {
  return artists.filter(a => a.day === day)
}

export function getArtistsByStage(stage: Stage): Artist[] {
  return artists.filter(a => a.stage === stage)
}

export function searchArtists(query: string): Artist[] {
  const q = query.toLowerCase()
  return artists.filter(a => a.name.toLowerCase().includes(q))
}
