export interface FestivalArtist {
  id: string
  name: string
  stage: string
  day: string
  startTime?: string   // local time, e.g. '4:30' - festival runs noon-10pm so AM/PM is unambiguous
  endTime?: string
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

// Per-artist stage assignments aren't published until set times drop closer
// to the event, so every artist is tagged 'Stage TBA' until then.

// ── Lollapalooza 2026 ─────────────────────────────────────────────────────────
// Full day-by-day set times as published on the official day-by-day schedule
// (lollapalooza.com/schedule - image-only, no API/structured HTML, transcribed
// by hand). A handful of artists that were on the original admat lineup don't
// appear on the day schedule (Jim Legxacy, Chace, Fakemink, Paloma Morphy) -
// left as 'Stage TBA' rather than guessed or dropped. Kidzapalooza's kids'-
// stage performers are intentionally not included - they repeat across
// multiple days, which doesn't fit this one-entry-per-artist-per-day model.

const LOLLAPALOOZA: Festival = {
  id: 'lollapalooza-2026',
  name: 'Lollapalooza 2026',
  shortName: 'Lolla',
  city: 'Chicago',
  state: 'IL',
  dates: 'Jul 30 – Aug 2, 2026',
  days: ['thursday', 'friday', 'saturday', 'sunday'],
  dayDates: { thursday: 'Jul 30', friday: 'Jul 31', saturday: 'Aug 1', sunday: 'Aug 2' },
  stages: ['T-Mobile', 'Perry\'s', 'Allianz', 'BMI', 'Airbnb', 'Tito\'s', 'Bud Light', 'Toyota Music Den', 'Bud Light Sound Bar'],
  emoji: '🌭',
  headliners: ['Charli XCX', 'Lorde', 'Tate McRae'],
  artists: [
    // ── Thursday, Jul 30 ──
    { id: 'lolla-lorde', name: 'Lorde', stage: 'T-Mobile', day: 'thursday', startTime: '8:30', headliner: true },
    { id: 'lolla-john-summit', name: 'John Summit', stage: 'Bud Light', day: 'thursday', startTime: '8:30', endTime: '10:00', headliner: true },
    { id: 'lolla-sombr', name: 'Sombr', stage: 'T-Mobile', day: 'thursday', startTime: '6:30', endTime: '7:30' },
    { id: 'lolla-empire-of-the-sun', name: 'Empire of the Sun', stage: 'Bud Light', day: 'thursday', startTime: '6:30', endTime: '7:30' },
    { id: 'lolla-wet-leg', name: 'Wet Leg', stage: 'Allianz', day: 'thursday', startTime: '7:30', endTime: '8:30' },
    { id: 'lolla-worship', name: 'Worship', stage: 'Perry\'s', day: 'thursday', startTime: '8:30', endTime: '9:45' },
    { id: 'lolla-blood-orange', name: 'Blood Orange', stage: 'Bud Light', day: 'thursday', startTime: '4:45', endTime: '5:45' },
    { id: 'lolla-5-seconds-of-summer', name: '5 Seconds of Summer', stage: 'T-Mobile', day: 'thursday', startTime: '4:30', endTime: '5:30' },
    { id: 'lolla-kettama', name: 'Kettama', stage: 'Perry\'s', day: 'thursday', startTime: '7:00', endTime: '8:00' },
    { id: 'lolla-viagra-boys', name: 'Viagra Boys', stage: 'Airbnb', day: 'thursday', startTime: '9:00', endTime: '10:00' },
    { id: 'lolla-audrey-hobert', name: 'Audrey Hobert', stage: 'Allianz', day: 'thursday', startTime: '5:30', endTime: '6:30' },
    { id: 'lolla-snow-strippers', name: 'Snow Strippers', stage: 'Airbnb', day: 'thursday', startTime: '7:45', endTime: '8:30' },
    { id: 'lolla-boris-brejcha', name: 'Boris Brejcha', stage: 'Perry\'s', day: 'thursday', startTime: '5:45', endTime: '6:45' },
    { id: 'lolla-paris-paloma', name: 'Paris Paloma', stage: 'Tito\'s', day: 'thursday', startTime: '3:45', endTime: '4:45' },
    { id: 'lolla-little-simz', name: 'Little Simz', stage: 'Tito\'s', day: 'thursday', startTime: '5:45', endTime: '6:30' },
    { id: 'lolla-cmat', name: 'CMAT', stage: 'Airbnb', day: 'thursday', startTime: '6:30', endTime: '7:15' },
    { id: 'lolla-boys-noize', name: 'Boys Noize', stage: 'Perry\'s', day: 'thursday', startTime: '4:15', endTime: '5:15' },
    { id: 'lolla-between-friends', name: 'Between Friends', stage: 'Bud Light', day: 'thursday', startTime: '2:45', endTime: '3:45' },
    { id: 'lolla-mph', name: 'MPH', stage: 'Perry\'s', day: 'thursday', startTime: '3:00', endTime: '4:00' },
    { id: 'lolla-amble', name: 'Amble', stage: 'Airbnb', day: 'thursday', startTime: '5:15', endTime: '6:00' },
    { id: 'lolla-kingfishr', name: 'Kingfishr', stage: 'Tito\'s', day: 'thursday', startTime: '1:45', endTime: '2:45' },
    { id: 'lolla-ninajirachi', name: 'Ninajirachi', stage: 'Airbnb', day: 'thursday', startTime: '4:00', endTime: '4:45' },
    { id: 'lolla-haute-and-freddy', name: 'Haute & Freddy', stage: 'T-Mobile', day: 'thursday', startTime: '2:30', endTime: '3:30' },
    { id: 'lolla-bella-kay', name: 'Bella Kay', stage: 'BMI', day: 'thursday', startTime: '4:30', endTime: '5:10' },
    { id: 'lolla-marlon-funaki', name: 'Marlon Funaki', stage: 'Airbnb', day: 'thursday', startTime: '1:50', endTime: '2:30' },
    { id: 'lolla-devault', name: 'Devault', stage: 'Perry\'s', day: 'thursday', startTime: '1:45', endTime: '2:45' },
    { id: 'lolla-sb19', name: 'SB19', stage: 'Allianz', day: 'thursday', startTime: '3:30', endTime: '4:30' },
    { id: 'lolla-ecca-vandal', name: 'Ecca Vandal', stage: 'Airbnb', day: 'thursday', startTime: '2:50', endTime: '3:30' },
    { id: 'lolla-bad-nerves', name: 'Bad Nerves', stage: 'Allianz', day: 'thursday', startTime: '1:30', endTime: '2:30' },
    { id: 'lolla-asha-banks', name: 'Asha Banks', stage: 'T-Mobile', day: 'thursday', startTime: '12:45', endTime: '1:30' },
    { id: 'lolla-faouzia', name: 'Faouzia', stage: 'Tito\'s', day: 'thursday', startTime: '12:15', endTime: '1:00' },
    { id: 'lolla-evening-elephants', name: 'Evening Elephants', stage: 'BMI', day: 'thursday', startTime: '6:50', endTime: '7:30' },
    { id: 'lolla-pearly-drops', name: 'Pearly Drops', stage: 'Allianz', day: 'thursday', startTime: '12:00', endTime: '12:45' },
    { id: 'lolla-bixby', name: 'Bixby', stage: 'Bud Light', day: 'thursday', startTime: '1:00', endTime: '1:45' },
    { id: 'lolla-penelope-road', name: 'Penelope Road', stage: 'Airbnb', day: 'thursday', startTime: '12:50', endTime: '1:30' },
    { id: 'lolla-know-good', name: 'Know Good', stage: 'Perry\'s', day: 'thursday', startTime: '12:45', endTime: '1:30' },
    { id: 'lolla-elizabeth-nichols', name: 'Elizabeth Nichols', stage: 'BMI', day: 'thursday', startTime: '3:20', endTime: '4:00' },
    { id: 'lolla-klo', name: 'KLO', stage: 'Perry\'s', day: 'thursday', startTime: '12:00', endTime: '12:30' },
    { id: 'lolla-the-braymores', name: 'The Braymores', stage: 'BMI', day: 'thursday', startTime: '1:00', endTime: '1:40' },
    { id: 'lolla-chalk', name: 'Chalk', stage: 'BMI', day: 'thursday', startTime: '5:40', endTime: '6:20' },
    { id: 'lolla-simon-grossmann', name: 'Simon Grossmann', stage: 'BMI', day: 'thursday', startTime: '2:10', endTime: '2:50' },
    { id: 'lolla-kim-theory', name: 'Kim Theory', stage: 'Airbnb', day: 'thursday', startTime: '12:00', endTime: '12:30' },
    { id: 'lolla-cazes', name: 'Cazes', stage: 'Bud Light Sound Bar', day: 'thursday', startTime: '2:30', endTime: '4:00' },
    { id: 'lolla-mr-shaw', name: 'Mr. Shaw', stage: 'Bud Light Sound Bar', day: 'thursday', startTime: '4:05', endTime: '5:25' },
    { id: 'lolla-peace-control-thu', name: 'Peace Control', stage: 'Bud Light Sound Bar', day: 'thursday', startTime: '5:50', endTime: '6:35' },

    // ── Friday, Jul 31 ──
    { id: 'lolla-charli-xcx', name: 'Charli XCX', stage: 'T-Mobile', day: 'friday', startTime: '8:40', headliner: true },
    { id: 'lolla-smashing-pumpkins', name: 'The Smashing Pumpkins', stage: 'Bud Light', day: 'friday', startTime: '8:30', endTime: '10:00', headliner: true },
    { id: 'lolla-lil-uzi-vert', name: 'Lil Uzi Vert', stage: 'T-Mobile', day: 'friday', startTime: '6:40', endTime: '7:40' },
    { id: 'lolla-yungblud', name: 'Yungblud', stage: 'Bud Light', day: 'friday', startTime: '6:30', endTime: '7:30' },
    { id: 'lolla-major-lazer', name: 'Major Lazer', stage: 'Perry\'s', day: 'friday', startTime: '8:30', endTime: '9:45' },
    { id: 'lolla-not-for-radio', name: 'Not For Radio', stage: 'Allianz', day: 'friday', startTime: '7:40', endTime: '8:40' },
    { id: 'lolla-zara-larsson', name: 'Zara Larsson', stage: 'T-Mobile', day: 'friday', startTime: '4:40', endTime: '5:40' },
    { id: 'lolla-freddie-gibbs', name: 'Freddie Gibbs', stage: 'Airbnb', day: 'friday', startTime: '9:15', endTime: '10:00' },
    { id: 'lolla-suki-waterhouse', name: 'Suki Waterhouse', stage: 'Allianz', day: 'friday', startTime: '5:40', endTime: '6:40' },
    { id: 'lolla-i-dle', name: 'I-DLE', stage: 'T-Mobile', day: 'friday', startTime: '2:40', endTime: '3:40' },
    { id: 'lolla-mustard', name: 'Mustard', stage: 'Perry\'s', day: 'friday', startTime: '7:00', endTime: '8:00' },
    { id: 'lolla-oklou', name: 'Oklou', stage: 'Airbnb', day: 'friday', startTime: '5:30', endTime: '6:15' },
    { id: 'lolla-horsegiirl', name: 'Horsegirl', stage: 'Airbnb', day: 'friday', startTime: '8:00', endTime: '8:45' },
    { id: 'lolla-the-story-so-far', name: 'The Story So Far', stage: 'Bud Light', day: 'friday', startTime: '4:30', endTime: '5:30' },
    { id: 'lolla-loathe', name: 'Loathe', stage: 'Tito\'s', day: 'friday', startTime: '5:30', endTime: '6:30' },
    { id: 'lolla-nettspend', name: 'Nettspend', stage: 'Tito\'s', day: 'friday', startTime: '7:30', endTime: '8:30' },
    { id: 'lolla-sidepiece', name: 'Sidepiece', stage: 'Perry\'s', day: 'friday', startTime: '5:45', endTime: '6:45' },
    { id: 'lolla-skye-newman', name: 'Skye Newman', stage: 'Allianz', day: 'friday', startTime: '3:40', endTime: '4:40' },
    { id: 'lolla-notion', name: 'Notion', stage: 'Perry\'s', day: 'friday', startTime: '4:15', endTime: '5:15' },
    { id: 'lolla-roz', name: 'RØZ', stage: 'Perry\'s', day: 'friday', startTime: '3:00', endTime: '4:00' },
    { id: 'lolla-balu-brigada', name: 'Balu Brigada', stage: 'Airbnb', day: 'friday', startTime: '6:45', endTime: '7:30' },
    { id: 'lolla-lyny', name: 'LYNY', stage: 'Perry\'s', day: 'friday', startTime: '1:45', endTime: '2:45' },
    { id: 'lolla-mother-mother', name: 'Mother Mother', stage: 'Tito\'s', day: 'friday', startTime: '3:30', endTime: '4:30' },
    { id: 'lolla-julia-wolf', name: 'Julia Wolf', stage: 'Tito\'s', day: 'friday', startTime: '2:00', endTime: '2:45' },
    { id: 'lolla-slayyyter', name: 'Slayyyter', stage: 'Bud Light', day: 'friday', startTime: '2:45', endTime: '3:30' },
    { id: 'lolla-claire-rosinkranz', name: 'Claire Rosinkranz', stage: 'Allianz', day: 'friday', startTime: '1:40', endTime: '2:40' },
    { id: 'lolla-54-ultra', name: '54 Ultra', stage: 'Airbnb', day: 'friday', startTime: '2:50', endTime: '3:30' },
    { id: 'lolla-high-vis', name: 'High Vis', stage: 'Bud Light', day: 'friday', startTime: '1:15', endTime: '2:00' },
    { id: 'lolla-finn-wolfhard', name: 'Finn Wolfhard', stage: 'Airbnb', day: 'friday', startTime: '4:00', endTime: '4:45' },
    { id: 'lolla-avello', name: 'Avello', stage: 'Perry\'s', day: 'friday', startTime: '12:45', endTime: '1:30' },
    { id: 'lolla-partyof2', name: 'Partyof2', stage: 'T-Mobile', day: 'friday', startTime: '12:55', endTime: '1:40' },
    { id: 'lolla-the-army-the-navy', name: 'The Army, The Navy', stage: 'Allianz', day: 'friday', startTime: '12:10', endTime: '12:55' },
    { id: 'lolla-love-spells', name: 'Love Spells', stage: 'Airbnb', day: 'friday', startTime: '1:50', endTime: '2:30' },
    { id: 'lolla-ella-red', name: 'Ella Red', stage: 'BMI', day: 'friday', startTime: '5:40', endTime: '6:20' },
    { id: 'lolla-paloma-morphy', name: 'Paloma Morphy', stage: 'Stage TBA', day: 'friday' },
    { id: 'lolla-day-we-ran', name: 'Day We Ran', stage: 'Airbnb', day: 'friday', startTime: '12:50', endTime: '1:30' },
    { id: 'lolla-ivri', name: 'Ivri', stage: 'BMI', day: 'friday', startTime: '4:30', endTime: '5:10' },
    { id: 'lolla-ella-boh', name: 'Ella Boh', stage: 'BMI', day: 'friday', startTime: '2:10', endTime: '2:50' },
    { id: 'lolla-bradeazy', name: 'Bradeazy', stage: 'Perry\'s', day: 'friday', startTime: '12:00', endTime: '12:30' },
    { id: 'lolla-emi-grace', name: 'Emi Grace', stage: 'BMI', day: 'friday', startTime: '3:20', endTime: '4:00' },
    { id: 'lolla-beno', name: 'Beno', stage: 'Airbnb', day: 'friday', startTime: '12:00', endTime: '12:30' },
    { id: 'lolla-chicago-made', name: 'Chicago Made', stage: 'Tito\'s', day: 'friday', startTime: '12:30', endTime: '1:15' },
    { id: 'lolla-valencia-grace', name: 'Valencia Grace', stage: 'BMI', day: 'friday', startTime: '1:00', endTime: '1:40' },
    { id: 'lolla-whitney-whitney', name: 'Whitney Whitney', stage: 'BMI', day: 'friday', startTime: '6:50', endTime: '7:30' },
    { id: 'lolla-bobby-booshay', name: 'Bobby Booshay', stage: 'Bud Light Sound Bar', day: 'friday', startTime: '2:30', endTime: '4:00' },
    { id: 'lolla-chachi', name: 'Chachi', stage: 'Bud Light Sound Bar', day: 'friday', startTime: '4:05', endTime: '5:25' },
    { id: 'lolla-alvaro-diaz', name: 'Álvaro Díaz', stage: 'Toyota Music Den', day: 'friday', startTime: '6:00', endTime: '6:30' },

    // ── Saturday, Aug 1 ──
    { id: 'lolla-olivia-dean', name: 'Olivia Dean', stage: 'T-Mobile', day: 'saturday', startTime: '8:30', headliner: true },
    { id: 'lolla-jennie', name: 'Jennie', stage: 'Bud Light', day: 'saturday', startTime: '8:55', endTime: '10:00', headliner: true },
    { id: 'lolla-the-neighbourhood', name: 'The Neighbourhood', stage: 'T-Mobile', day: 'saturday', startTime: '6:30', endTime: '7:30' },
    { id: 'lolla-ethel-cain', name: 'Ethel Cain', stage: 'Bud Light', day: 'saturday', startTime: '7:00', endTime: '8:00' },
    { id: 'lolla-disco-lines', name: 'Disco Lines', stage: 'Perry\'s', day: 'saturday', startTime: '8:30', endTime: '9:45' },
    { id: 'lolla-leon-thomas', name: 'Leon Thomas', stage: 'T-Mobile', day: 'saturday', startTime: '4:30', endTime: '5:30' },
    { id: 'lolla-clipse', name: 'Clipse', stage: 'Bud Light', day: 'saturday', startTime: '5:00', endTime: '6:00' },
    { id: 'lolla-geese', name: 'Geese', stage: 'Allianz', day: 'saturday', startTime: '7:30', endTime: '8:30' },
    { id: 'lolla-alison-wonderland', name: 'Alison Wonderland', stage: 'Perry\'s', day: 'saturday', startTime: '7:00', endTime: '8:00' },
    { id: 'lolla-dj-trixie-mattel', name: 'DJ Trixie Mattel', stage: 'Airbnb', day: 'saturday', startTime: '9:00', endTime: '10:00' },
    { id: 'lolla-bbnos', name: 'BBNO$', stage: 'Tito\'s', day: 'saturday', startTime: '6:00', endTime: '7:00' },
    { id: 'lolla-kwn', name: 'KWN', stage: 'Airbnb', day: 'saturday', startTime: '6:30', endTime: '7:15' },
    { id: 'lolla-sienna-spiro', name: 'Sienna Spiro', stage: 'Airbnb', day: 'saturday', startTime: '5:15', endTime: '6:00' },
    { id: 'lolla-max-styler', name: 'Max Styler', stage: 'Perry\'s', day: 'saturday', startTime: '5:45', endTime: '6:45' },
    { id: 'lolla-spacey-jane', name: 'Spacey Jane', stage: 'Allianz', day: 'saturday', startTime: '5:30', endTime: '6:30' },
    { id: 'lolla-wolf-alice', name: 'Wolf Alice', stage: 'Bud Light', day: 'saturday', startTime: '3:00', endTime: '4:00' },
    { id: 'lolla-whethan', name: 'Whethan', stage: 'Perry\'s', day: 'saturday', startTime: '4:15', endTime: '5:15' },
    { id: 'lolla-cortis', name: 'Cortis', stage: 'T-Mobile', day: 'saturday', startTime: '2:55', endTime: '3:45' },
    { id: 'lolla-cameron-whitcomb', name: 'Cameron Whitcomb', stage: 'Airbnb', day: 'saturday', startTime: '7:45', endTime: '8:30' },
    { id: 'lolla-ayybo', name: 'Ayybo', stage: 'Perry\'s', day: 'saturday', startTime: '3:00', endTime: '4:00' },
    { id: 'lolla-khamari', name: 'Khamari', stage: 'Allianz', day: 'saturday', startTime: '3:45', endTime: '4:30' },
    { id: 'lolla-quadeca', name: 'Quadeca', stage: 'Airbnb', day: 'saturday', startTime: '4:00', endTime: '4:45' },
    { id: 'lolla-momma', name: 'Momma', stage: 'Tito\'s', day: 'saturday', startTime: '4:00', endTime: '5:00' },
    { id: 'lolla-frost-children', name: 'Frost Children', stage: 'Airbnb', day: 'saturday', startTime: '2:50', endTime: '3:30' },
    { id: 'lolla-goldie-boutilier', name: 'Goldie Boutilier', stage: 'Tito\'s', day: 'saturday', startTime: '2:00', endTime: '3:00' },
    { id: 'lolla-die-spitz', name: 'Die Spitz', stage: 'Airbnb', day: 'saturday', startTime: '1:50', endTime: '2:30' },
    { id: 'lolla-lucy-bedroque', name: 'Lucy Bedroque', stage: 'T-Mobile', day: 'saturday', startTime: '1:10', endTime: '1:55' },
    { id: 'lolla-omnom', name: 'Omnom', stage: 'Perry\'s', day: 'saturday', startTime: '1:45', endTime: '2:45' },
    { id: 'lolla-jim-legxacy', name: 'Jim Legxacy', stage: 'Stage TBA', day: 'saturday' },
    { id: 'lolla-chezile', name: 'Chezile', stage: 'Tito\'s', day: 'saturday', startTime: '12:30', endTime: '1:15' },
    { id: 'lolla-jae-stephens', name: 'Jae Stephens', stage: 'BMI', day: 'saturday', startTime: '5:40', endTime: '6:20' },
    { id: 'lolla-ryman', name: 'Ryman', stage: 'BMI', day: 'saturday', startTime: '6:50', endTime: '7:30' },
    { id: 'lolla-villanelle', name: 'Villanelle', stage: 'Airbnb', day: 'saturday', startTime: '12:50', endTime: '1:30' },
    { id: 'lolla-sunday-1994', name: 'Sunday (1994)', stage: 'Allianz', day: 'saturday', startTime: '12:25', endTime: '1:10' },
    { id: 'lolla-mc4d', name: 'MC4D', stage: 'Perry\'s', day: 'saturday', startTime: '12:45', endTime: '1:30' },
    { id: 'lolla-chace', name: 'Chace', stage: 'Stage TBA', day: 'saturday' },
    { id: 'lolla-calder-allen', name: 'Calder Allen', stage: 'BMI', day: 'saturday', startTime: '4:30', endTime: '5:10' },
    { id: 'lolla-nat-myers', name: 'Nat Myers', stage: 'Airbnb', day: 'saturday', startTime: '12:00', endTime: '12:30' },
    { id: 'lolla-ink', name: 'Ink', stage: 'BMI', day: 'saturday', startTime: '3:20', endTime: '4:00' },
    { id: 'lolla-peace-control', name: 'Peace Control', stage: 'Perry\'s', day: 'saturday', startTime: '12:00', endTime: '12:30' },
    { id: 'lolla-the-creekers', name: 'The Creekers', stage: 'BMI', day: 'saturday', startTime: '1:00', endTime: '1:40' },
    { id: 'lolla-next-of-kin', name: 'Next of Kin', stage: 'BMI', day: 'saturday', startTime: '2:10', endTime: '2:50' },
    { id: 'lolla-cyso', name: 'Chicago Youth Symphony Orchestra', stage: 'Tito\'s', day: 'saturday', startTime: '8:00', endTime: '8:55' },
    { id: 'lolla-wisp', name: 'Wisp', stage: 'Allianz', day: 'saturday', startTime: '1:55', endTime: '2:55' },
    { id: 'lolla-ric-wilson', name: 'Ric Wilson', stage: 'Bud Light', day: 'saturday', startTime: '1:15', endTime: '2:00' },
    { id: 'lolla-cream', name: 'Cream', stage: 'Bud Light Sound Bar', day: 'saturday', startTime: '3:00', endTime: '4:15' },
    { id: 'lolla-kupyd', name: 'Kupyd', stage: 'Bud Light Sound Bar', day: 'saturday', startTime: '4:20', endTime: '5:40' },

    // ── Sunday, Aug 2 ──
    { id: 'lolla-tate-mcrae', name: 'Tate McRae', stage: 'T-Mobile', day: 'sunday', startTime: '8:45', headliner: true },
    { id: 'lolla-the-xx', name: 'The xx', stage: 'Bud Light', day: 'sunday', startTime: '8:45', endTime: '10:00', headliner: true },
    { id: 'lolla-turnstile', name: 'Turnstile', stage: 'Bud Light', day: 'sunday', startTime: '7:00', endTime: '8:00' },
    { id: 'lolla-beabadoobee', name: 'Beabadoobee', stage: 'T-Mobile', day: 'sunday', startTime: '6:45', endTime: '7:45' },
    { id: 'lolla-aespa', name: 'Aespa', stage: 'Allianz', day: 'sunday', startTime: '7:45', endTime: '8:45' },
    { id: 'lolla-the-chainsmokers', name: 'The Chainsmokers', stage: 'Perry\'s', day: 'sunday', startTime: '8:30', endTime: '9:45' },
    { id: 'lolla-muna', name: 'Muna', stage: 'T-Mobile', day: 'sunday', startTime: '4:45', endTime: '5:45' },
    { id: 'lolla-hot-mulligan', name: 'Hot Mulligan', stage: 'Tito\'s', day: 'sunday', startTime: '6:00', endTime: '7:00' },
    { id: 'lolla-yoasobi', name: 'Yoasobi', stage: 'Bud Light', day: 'sunday', startTime: '5:00', endTime: '6:00' },
    { id: 'lolla-ado', name: 'Ado', stage: 'Airbnb', day: 'sunday', startTime: '9:15', endTime: '10:00' },
    { id: 'lolla-jade', name: 'Jade', stage: 'Allianz', day: 'sunday', startTime: '5:45', endTime: '6:45' },
    { id: 'lolla-eli-brown', name: 'Eli Brown', stage: 'Perry\'s', day: 'sunday', startTime: '7:00', endTime: '8:00' },
    { id: 'lolla-duke-dumont', name: 'Duke Dumont', stage: 'Perry\'s', day: 'sunday', startTime: '5:45', endTime: '6:45' },
    { id: 'lolla-fakemink', name: 'Fakemink', stage: 'Stage TBA', day: 'sunday' },
    { id: 'lolla-dombresky', name: 'Dombresky', stage: 'Perry\'s', day: 'sunday', startTime: '4:15', endTime: '5:15' },
    { id: 'lolla-monaleo', name: 'Monaleo', stage: 'Airbnb', day: 'sunday', startTime: '6:30', endTime: '7:15' },
    { id: 'lolla-adela', name: 'Adéla', stage: 'T-Mobile', day: 'sunday', startTime: '3:00', endTime: '3:45' },
    { id: 'lolla-riordan', name: 'Riordan', stage: 'Perry\'s', day: 'sunday', startTime: '3:00', endTime: '4:00' },
    { id: 'lolla-wunderhorse', name: 'Wunderhorse', stage: 'Tito\'s', day: 'sunday', startTime: '4:00', endTime: '5:00' },
    { id: 'lolla-amber-mark', name: 'Amber Mark', stage: 'Allianz', day: 'sunday', startTime: '3:45', endTime: '4:45' },
    { id: 'lolla-westend', name: 'Westend', stage: 'Perry\'s', day: 'sunday', startTime: '1:45', endTime: '2:45' },
    { id: 'lolla-destin-conrad', name: 'Destin Conrad', stage: 'Allianz', day: 'sunday', startTime: '2:00', endTime: '3:00' },
    { id: 'lolla-inji', name: 'Inji', stage: 'Airbnb', day: 'sunday', startTime: '4:00', endTime: '4:45' },
    { id: 'lolla-waylon-wyatt', name: 'Waylon Wyatt', stage: 'Bud Light', day: 'sunday', startTime: '3:00', endTime: '4:00' },
    { id: 'lolla-water-from-your-eyes', name: 'Water From Your Eyes', stage: 'Airbnb', day: 'sunday', startTime: '2:50', endTime: '3:30' },
    { id: 'lolla-los-retros', name: 'Los Retros', stage: 'Airbnb', day: 'sunday', startTime: '5:15', endTime: '6:00' },
    { id: 'lolla-vandelux', name: 'Vandelux', stage: 'Tito\'s', day: 'sunday', startTime: '8:00', endTime: '8:45' },
    { id: 'lolla-new-constellations', name: 'New Constellations', stage: 'T-Mobile', day: 'sunday', startTime: '1:15', endTime: '2:00' },
    { id: 'lolla-cruz-beckham-breakers', name: 'Cruz Beckham and the Breakers', stage: 'Tito\'s', day: 'sunday', startTime: '2:15', endTime: '3:00' },
    { id: 'lolla-the-bends', name: 'The Bends', stage: 'Airbnb', day: 'sunday', startTime: '12:50', endTime: '1:30' },
    { id: 'lolla-after', name: 'After', stage: 'Airbnb', day: 'sunday', startTime: '1:50', endTime: '2:30' },
    { id: 'lolla-whatmore', name: 'Whatmore', stage: 'Bud Light', day: 'sunday', startTime: '1:30', endTime: '2:15' },
    { id: 'lolla-porch-light', name: 'Porch Light', stage: 'BMI', day: 'sunday', startTime: '5:40', endTime: '6:20' },
    { id: 'lolla-easy-honey', name: 'Easy Honey', stage: 'Tito\'s', day: 'sunday', startTime: '12:45', endTime: '1:30' },
    { id: 'lolla-jackie-hollander', name: 'Jackie Hollander', stage: 'Perry\'s', day: 'sunday', startTime: '12:45', endTime: '1:30' },
    { id: 'lolla-stella-lefty', name: 'Stella Lefty', stage: 'Airbnb', day: 'sunday', startTime: '7:45', endTime: '8:30' },
    { id: 'lolla-justine-skye', name: 'Justine Skye', stage: 'BMI', day: 'sunday', startTime: '4:30', endTime: '5:10' },
    { id: 'lolla-will-swinton', name: 'Will Swinton', stage: 'BMI', day: 'sunday', startTime: '6:50', endTime: '7:30' },
    { id: 'lolla-sunshine', name: 'Sunshine Benzi', stage: 'Airbnb', day: 'sunday', startTime: '12:00', endTime: '12:30' },
    { id: 'lolla-case-oats', name: 'Case Oats', stage: 'BMI', day: 'sunday', startTime: '3:20', endTime: '4:00' },
    { id: 'lolla-surfing-for-daisy', name: 'Surfing For Daisy', stage: 'BMI', day: 'sunday', startTime: '2:10', endTime: '2:50' },
    { id: 'lolla-snacktime', name: 'Snacktime', stage: 'BMI', day: 'sunday', startTime: '1:00', endTime: '1:40' },
    { id: 'lolla-zack-martino', name: 'Zack Martino', stage: 'Perry\'s', day: 'sunday', startTime: '12:00', endTime: '12:30' },
    { id: 'lolla-squirrel-flower', name: 'Squirrel Flower', stage: 'Allianz', day: 'sunday', startTime: '12:30', endTime: '1:15' },
    { id: 'lolla-avera', name: 'Avera', stage: 'Bud Light Sound Bar', day: 'sunday', startTime: '2:30', endTime: '4:00' },
    { id: 'lolla-heavy', name: 'Heavy', stage: 'Bud Light Sound Bar', day: 'sunday', startTime: '5:50', endTime: '6:30' },
  ],
}

// ── Outside Lands 2026 ────────────────────────────────────────────────────────
// Full day-by-day lineup as announced on the official daily-lineup poster (sfoutsidelands.com/lineup).

const OUTSIDE_LANDS: Festival = {
  id: 'outside-lands-2026',
  name: 'Outside Lands 2026',
  shortName: 'Outside Lands',
  city: 'San Francisco',
  state: 'CA',
  dates: 'Aug 7–9, 2026',
  days: ['friday', 'saturday', 'sunday'],
  dayDates: { friday: 'Aug 7', saturday: 'Aug 8', sunday: 'Aug 9' },
  stages: ['Stage TBA'],
  emoji: '🌉',
  headliners: ['Charli XCX', 'The Strokes', 'Rüfüs Du Sol'],
  artists: [
    // ── Friday, Aug 7 ──
    { id: 'osl-charli-xcx',            name: 'Charli XCX',                       stage: 'Stage TBA', day: 'friday', headliner: true },
    { id: 'osl-turnstile',             name: 'Turnstile',                        stage: 'Stage TBA', day: 'friday', headliner: true },
    { id: 'osl-griztronics',           name: 'Griztronics (Subtronics + Griz)',  stage: 'Stage TBA', day: 'friday', headliner: true },
    { id: 'osl-labrinth',              name: 'Labrinth',                         stage: 'Stage TBA', day: 'friday', headliner: true },
    { id: 'osl-glorilla',              name: 'GloRilla',                         stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-geese',                 name: 'Geese',                            stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-clipse',                name: 'Clipse',                           stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-modest-mouse',          name: 'Modest Mouse',                     stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-wet-leg',               name: 'Wet Leg',                          stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-tinashe',               name: 'Tinashe',                          stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-sierra-ferrell',        name: 'Sierra Ferrell',                   stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-hyperbeam',             name: 'Hyperbeam (Odd Mob + Omnom)',      stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-the-story-so-far',      name: 'The Story So Far',                 stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-yousuke-yukimatsu',     name: '¥ØU$UK€ ¥UKIMAT$U',                stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-ki-ki',                 name: 'KI/KI',                            stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-durand-bernarr',        name: 'Durand Bernarr',                   stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-alleycvt',              name: 'Alleycvt',                         stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-die-spitz',             name: 'Die Spitz',                        stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-mph',                   name: 'MPH',                              stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-goldie-boutilier',      name: 'Goldie Boutilier',                 stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-dylan-brady',           name: 'Dylan Brady',                      stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-tobiahs',               name: 'Tobiahs',                          stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-billie-marten',         name: 'Billie Marten',                    stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-faouzia',               name: 'Faouzia',                          stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-bad-nerves',            name: 'Bad Nerves',                       stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-luke-alessi',           name: 'Luke Alessi',                      stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-chezile',               name: 'Chezile',                          stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-sawyer-hill',           name: 'Sawyer Hill',                      stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-nezza',                 name: 'Nezza',                            stage: 'Stage TBA', day: 'friday' },
    { id: 'osl-vertigo',               name: 'Vertigo',                          stage: 'Stage TBA', day: 'friday' },

    // ── Saturday, Aug 8 ──
    { id: 'osl-the-strokes',           name: 'The Strokes',                      stage: 'Stage TBA', day: 'saturday', headliner: true },
    { id: 'osl-the-xx',                name: 'The xx',                           stage: 'Stage TBA', day: 'saturday', headliner: true },
    { id: 'osl-djo',                   name: 'Djo',                              stage: 'Stage TBA', day: 'saturday', headliner: true },
    { id: 'osl-dijon',                 name: 'Dijon',                            stage: 'Stage TBA', day: 'saturday', headliner: true },
    { id: 'osl-pinkpantheress',        name: 'PinkPantheress',                   stage: 'Stage TBA', day: 'saturday', headliner: true },
    { id: 'osl-ethel-cain',            name: 'Ethel Cain',                       stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-lucy-dacus',            name: 'Lucy Dacus',                       stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-malcolm-todd',          name: 'Malcolm Todd',                     stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-lane-8',                name: 'Lane 8',                           stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-snow-strippers',        name: 'Snow Strippers',                   stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-its-murph',             name: "It's Murph",                       stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-audrey-hobert',         name: 'Audrey Hobert',                    stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-ben-bohmer',            name: 'Ben Böhmer',                       stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-dj-trixie-mattel',      name: 'DJ Trixie Mattel',                 stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-laszewo',               name: 'Łaszewo',                          stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-sienna-spiro',          name: 'Sienna Spiro',                     stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-sultan-shepard',        name: 'Sultan + Shepard',                 stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-silvana-estrada',       name: 'Silvana Estrada',                  stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-haute-and-freddy',      name: 'Haute & Freddy',                   stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-yard-act',              name: 'Yard Act',                         stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-wunderhorse',           name: 'Wunderhorse',                      stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-camoufly',              name: 'Camoufly',                         stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-bandalos-chinos',       name: 'Bandalos Chinos',                  stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-after',                 name: 'After',                            stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-rio-kosta',             name: 'Rio Kosta',                        stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-automatic',             name: 'Automatic',                        stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-racing-mount-pleasant', name: 'Racing Mount Pleasant',            stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-bad-juuju',             name: 'Bad Juuju',                        stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-1-800-girls',           name: '1-800 Girls',                      stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-red-leather',           name: 'Red Leather',                      stage: 'Stage TBA', day: 'saturday' },
    { id: 'osl-ryman',                 name: 'Ryman',                            stage: 'Stage TBA', day: 'saturday' },

    // ── Sunday, Aug 9 ──
    { id: 'osl-rufus-du-sol',          name: 'Rüfüs Du Sol',                     stage: 'Stage TBA', day: 'sunday', headliner: true },
    { id: 'osl-baby-keem',             name: 'Baby Keem',                        stage: 'Stage TBA', day: 'sunday', headliner: true },
    { id: 'osl-empire-of-the-sun',     name: 'Empire of the Sun',                stage: 'Stage TBA', day: 'sunday', headliner: true },
    { id: 'osl-death-cab-for-cutie',   name: 'Death Cab for Cutie',              stage: 'Stage TBA', day: 'sunday', headliner: true },
    { id: 'osl-disco-lines',           name: 'Disco Lines',                      stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-mariah-the-scientist',  name: 'Mariah the Scientist',             stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-not-for-radio',         name: 'Not For Radio',                    stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-boris-brejcha',         name: 'Boris Brejcha',                    stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-the-temper-trap',       name: 'The Temper Trap',                  stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-jade',                  name: 'Jade',                             stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-kwn',                   name: 'KWN',                              stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-boys-noize',            name: 'Boys Noize',                       stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-destin-conrad',         name: 'Destin Conrad',                    stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-kingfishr',             name: 'Kingfishr',                        stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-balu-brigada',          name: 'Balu Brigada',                     stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-frost-children',        name: 'Frost Children',                   stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-miss-monique',          name: 'Miss Monique',                     stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-carlita',               name: 'Carlita',                          stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-amble',                 name: 'Amble',                            stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-momma',                 name: 'Momma',                            stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-infinity-song',         name: 'Infinity Song',                    stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-sports',                name: 'Sports',                           stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-marlon-funaki',         name: 'Marlon Funaki',                    stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-night-tapes',           name: 'Night Tapes',                      stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-x-club',                name: 'X Club.',                          stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-jim-legxacy',           name: 'Jim Legxacy',                      stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-sosocamo',              name: 'Sosocamo',                         stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-day-we-ran',            name: 'Day We Ran',                       stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-cruz-beckham',          name: 'Cruz Beckham',                     stage: 'Stage TBA', day: 'sunday' },
    { id: 'osl-britton',               name: 'Britton',                          stage: 'Stage TBA', day: 'sunday' },
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

// Shows can only be logged starting the calendar day they actually happen -
// never in advance. Compares by local calendar date only (time-of-day
// ignored), so a show unlocks first thing in the morning of its day rather
// than at its exact set time. `dayDates` values (e.g. 'Jul 30') carry no
// year, so it's pulled out of the festival's `dates` range string (e.g.
// 'Jul 30 – Aug 2, 2026') instead.
export function hasDayOccurred(festival: Festival, day: string, now: Date = new Date()): boolean {
  const dateStr = festival.dayDates[day]
  if (!dateStr) return false

  const yearMatch = festival.dates.match(/(\d{4})/)
  const year = yearMatch ? yearMatch[1] : String(now.getFullYear())
  const showDate = new Date(`${dateStr} ${year}`)
  if (isNaN(showDate.getTime())) return false

  const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return dateOnly(showDate) <= dateOnly(now)
}

export const LOCAL_STORAGE_KEY = 'gigl_festival_id'
