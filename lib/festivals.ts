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
// Full day-by-day set times as supplied directly (stage + start/end per
// artist), transcribed from the official schedule. A few acts repeat at a
// second, shorter slot later the same day on Duboce Triangle (an overflow/
// secondary stage) or across multiple days (e.g. Bingo Loco, Open Mic hosted
// by Rainbow Girls at Cocktail Magic) - each occurrence gets its own id
// (day/stage/index suffix, only as much as needed to disambiguate) so every
// set can be logged/rated independently, matching Lolla's day-suffix
// convention for repeats. One Friday SoMa slot (6:55-8:25pm) had an
// unverified performer name in the source data and is intentionally omitted
// rather than guessed.

const OUTSIDE_LANDS: Festival = {
  id: 'outside-lands-2026',
  name: 'Outside Lands 2026',
  shortName: 'Outside Lands',
  city: 'San Francisco',
  state: 'CA',
  dates: 'Aug 7–9, 2026',
  days: ['friday', 'saturday', 'sunday'],
  dayDates: { friday: 'Aug 7', saturday: 'Aug 8', sunday: 'Aug 9' },
  stages: ['Lands End', 'Twin Peaks', 'Sutro', 'Panhandle', 'SoMa', "Dolores'", 'Duboce Triangle', 'Cocktail Magic'],
  emoji: '🌉',
  headliners: ['Charli XCX', 'The Strokes', 'Rüfüs Du Sol'],
  artists: [
    // ── Friday ──
    { id: 'osl-faouzia', name: 'Faouzia', stage: 'Lands End', day: 'friday', startTime: '12:05', endTime: '12:50' },
    { id: 'osl-grace-ives', name: 'Grace Ives', stage: 'Lands End', day: 'friday', startTime: '1:20', endTime: '2:05' },
    { id: 'osl-durand-bernarr', name: 'Durand Bernarr', stage: 'Lands End', day: 'friday', startTime: '2:35', endTime: '3:25' },
    { id: 'osl-wet-leg', name: 'Wet Leg', stage: 'Lands End', day: 'friday', startTime: '3:55', endTime: '4:45' },
    { id: 'osl-glorilla', name: 'GloRilla', stage: 'Lands End', day: 'friday', startTime: '5:15', endTime: '6:15' },
    { id: 'osl-labrinth', name: 'Labrinth', stage: 'Lands End', day: 'friday', startTime: '6:45', endTime: '7:55', headliner: true },
    { id: 'osl-charli-xcx', name: 'Charli xcx', stage: 'Lands End', day: 'friday', startTime: '8:40', endTime: '9:55', headliner: true },
    { id: 'osl-nezza-fri-twin-peaks', name: 'Nezza', stage: 'Twin Peaks', day: 'friday', startTime: '12:35', endTime: '1:20' },
    { id: 'osl-kerala-dust', name: 'Kerala Dust', stage: 'Twin Peaks', day: 'friday', startTime: '2:05', endTime: '2:50' },
    { id: 'osl-alleycvt-fri-twin-peaks', name: 'Alleycvt', stage: 'Twin Peaks', day: 'friday', startTime: '3:35', endTime: '4:25' },
    { id: 'osl-tinashe', name: 'Tinashe', stage: 'Twin Peaks', day: 'friday', startTime: '5:10', endTime: '6:00' },
    { id: 'osl-clipse', name: 'Clipse', stage: 'Twin Peaks', day: 'friday', startTime: '6:45', endTime: '7:35' },
    { id: 'osl-griztronics', name: 'Griztronics', stage: 'Twin Peaks', day: 'friday', startTime: '8:25', endTime: '9:50', headliner: true },
    { id: 'osl-bad-nerves', name: 'Bad Nerves', stage: 'Sutro', day: 'friday', startTime: '12:25', endTime: '1:10' },
    { id: 'osl-die-spitz', name: 'Die Spitz', stage: 'Sutro', day: 'friday', startTime: '1:40', endTime: '2:25' },
    { id: 'osl-the-story-so-far', name: 'The Story So Far', stage: 'Sutro', day: 'friday', startTime: '2:55', endTime: '3:40' },
    { id: 'osl-sierra-ferrell', name: 'Sierra Ferrell', stage: 'Sutro', day: 'friday', startTime: '4:10', endTime: '5:10' },
    { id: 'osl-geese', name: 'Geese', stage: 'Sutro', day: 'friday', startTime: '5:50', endTime: '6:50' },
    { id: 'osl-turnstile', name: 'Turnstile', stage: 'Sutro', day: 'friday', startTime: '7:20', endTime: '8:20', headliner: true },
    { id: 'osl-modest-mouse', name: 'Modest Mouse', stage: 'Sutro', day: 'friday', startTime: '8:50', endTime: '9:50' },
    { id: 'osl-dani-satin-and-always-hallways', name: 'Dani Satin & Always Hallways', stage: 'Panhandle', day: 'friday', startTime: '12:00', endTime: '12:30' },
    { id: 'osl-chezile-fri-panhandle', name: 'Chezile', stage: 'Panhandle', day: 'friday', startTime: '1:20', endTime: '2:00' },
    { id: 'osl-sawyer-hill', name: 'Sawyer Hill', stage: 'Panhandle', day: 'friday', startTime: '2:50', endTime: '3:30' },
    { id: 'osl-billie-marten', name: 'Billie Marten', stage: 'Panhandle', day: 'friday', startTime: '4:25', endTime: '5:05' },
    { id: 'osl-goldie-boutilier', name: 'Goldie Boutilier', stage: 'Panhandle', day: 'friday', startTime: '6:00', endTime: '6:40' },
    { id: 'osl-dylan-brady', name: 'Dylan Brady', stage: 'Panhandle', day: 'friday', startTime: '7:35', endTime: '8:20' },
    { id: 'osl-vertigo', name: 'Vertigo', stage: 'SoMa', day: 'friday', startTime: '12:00', endTime: '12:55' },
    { id: 'osl-luke-alessi-fri-soma', name: 'Luke Alessi', stage: 'SoMa', day: 'friday', startTime: '12:55', endTime: '2:25' },
    { id: 'osl-tobiahs-fri-soma', name: 'Tobiahs', stage: 'SoMa', day: 'friday', startTime: '2:25', endTime: '3:55' },
    { id: 'osl-mph', name: 'MPH', stage: 'SoMa', day: 'friday', startTime: '3:55', endTime: '5:25' },
    { id: 'osl-ki-ki', name: 'Ki/Ki', stage: 'SoMa', day: 'friday', startTime: '5:25', endTime: '6:55' },
    { id: 'osl-odd-mob-and-omnom-present-hyperbeam', name: 'Odd Mob & Omnom present Hyperbeam', stage: 'SoMa', day: 'friday', startTime: '8:25', endTime: '9:55' },
    { id: 'osl-dj-erinyes', name: 'DJ Erinyes', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '12:30', endTime: '1:15' },
    { id: 'osl-dj-dolomedes', name: 'DJ Dolomedes', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '1:15', endTime: '2:00' },
    { id: 'osl-pink-stiletto', name: 'Pink Stiletto', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '2:00', endTime: '2:30' },
    { id: 'osl-dj-starr-noir', name: 'DJ Starr Noir', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '2:30', endTime: '3:20' },
    { id: 'osl-hot-goth-freak-show-fri-hot-goth-gf-1', name: 'Hot Goth Freak Show', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '3:20', endTime: '3:50' },
    { id: 'osl-soltera', name: 'Soltera', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '3:50', endTime: '4:35' },
    { id: 'osl-dj-hopeless-and-hot-goth-pole-show', name: 'DJ Hopeless & Hot Goth Pole Show', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '4:35', endTime: '5:20' },
    { id: 'osl-ms-boan', name: 'Ms. Boan', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '5:20', endTime: '6:05' },
    { id: 'osl-hot-goth-freak-show-fri-hot-goth-gf-2', name: 'Hot Goth Freak Show', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '6:05', endTime: '6:35' },
    { id: 'osl-light-asylum', name: 'Light Asylum', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '6:45', endTime: '7:30' },
    { id: 'osl-romy-dj-set', name: 'ROMY (DJ set)', stage: "Hot Goth GF @ Dolores'", day: 'friday', startTime: '7:30', endTime: '8:30' },
    { id: 'osl-nezza-fri-duboce-triangle', name: 'Nezza', stage: 'Duboce Triangle', day: 'friday', startTime: '2:05', endTime: '2:35' },
    { id: 'osl-chezile-fri-duboce-triangle', name: 'Chezile', stage: 'Duboce Triangle', day: 'friday', startTime: '3:25', endTime: '3:55' },
    { id: 'osl-luke-alessi-fri-duboce-triangle', name: 'Luke Alessi', stage: 'Duboce Triangle', day: 'friday', startTime: '4:45', endTime: '5:15' },
    { id: 'osl-alleycvt-fri-duboce-triangle', name: 'Alleycvt', stage: 'Duboce Triangle', day: 'friday', startTime: '6:15', endTime: '6:45' },
    { id: 'osl-tobiahs-fri-duboce-triangle', name: 'Tobiahs', stage: 'Duboce Triangle', day: 'friday', startTime: '7:55', endTime: '8:40' },
    { id: 'osl-bingo-loco-fri-cocktail-magic-1', name: 'Bingo Loco', stage: 'Cocktail Magic', day: 'friday', startTime: '12:30', endTime: '1:15' },
    { id: 'osl-bingo-loco-fri-cocktail-magic-2', name: 'Bingo Loco', stage: 'Cocktail Magic', day: 'friday', startTime: '1:40', endTime: '2:25' },
    { id: 'osl-bingo-loco-fri-cocktail-magic-3', name: 'Bingo Loco', stage: 'Cocktail Magic', day: 'friday', startTime: '2:50', endTime: '3:35' },
    { id: 'osl-open-mic-hosted-by-rainbow-girls-fri', name: 'Open Mic hosted by Rainbow Girls', stage: 'Cocktail Magic', day: 'friday', startTime: '4:05', endTime: '4:50' },
    { id: 'osl-bootie-mashup-diva-pop-w-dj-tyme', name: 'Bootie Mashup: Diva Pop w/ DJ Tyme', stage: 'Cocktail Magic', day: 'friday', startTime: '5:05', endTime: '6:05' },
    { id: 'osl-the-emo-night-tour', name: 'The Emo Night Tour', stage: 'Cocktail Magic', day: 'friday', startTime: '6:20', endTime: '7:20' },

    // ── Saturday ──
    { id: 'osl-bandalos-chinos-sat-lands-end', name: 'Bandalos Chinos', stage: 'Lands End', day: 'saturday', startTime: '12:10', endTime: '12:55' },
    { id: 'osl-haute-and-freddy', name: 'Haute & Freddy', stage: 'Lands End', day: 'saturday', startTime: '1:25', endTime: '2:10' },
    { id: 'osl-audrey-hobert', name: 'Audrey Hobert', stage: 'Lands End', day: 'saturday', startTime: '2:40', endTime: '3:30' },
    { id: 'osl-lucy-dacus', name: 'Lucy Dacus', stage: 'Lands End', day: 'saturday', startTime: '4:00', endTime: '4:50' },
    { id: 'osl-ethel-cain', name: 'Ethel Cain', stage: 'Lands End', day: 'saturday', startTime: '5:20', endTime: '6:20' },
    { id: 'osl-djo', name: 'DJO', stage: 'Lands End', day: 'saturday', startTime: '6:50', endTime: '7:50', headliner: true },
    { id: 'osl-the-strokes', name: 'The Strokes', stage: 'Lands End', day: 'saturday', startTime: '8:35', endTime: '9:55', headliner: true },
    { id: 'osl-red-leather', name: 'Red Leather', stage: 'Twin Peaks', day: 'saturday', startTime: '12:30', endTime: '1:10' },
    { id: 'osl-after', name: 'After', stage: 'Twin Peaks', day: 'saturday', startTime: '1:55', endTime: '2:35' },
    { id: 'osl-laszewo-sat-twin-peaks', name: 'Łaszewo', stage: 'Twin Peaks', day: 'saturday', startTime: '3:10', endTime: '4:00' },
    { id: 'osl-malcolm-todd', name: 'Malcolm Todd', stage: 'Twin Peaks', day: 'saturday', startTime: '4:45', endTime: '5:45' },
    { id: 'osl-dijon', name: 'Dijon', stage: 'Twin Peaks', day: 'saturday', startTime: '6:30', endTime: '7:20', headliner: true },
    { id: 'osl-the-xx', name: 'The xx', stage: 'Twin Peaks', day: 'saturday', startTime: '8:10', endTime: '9:25', headliner: true },
    { id: 'osl-rio-kosta', name: 'Rio Kosta', stage: 'Sutro', day: 'saturday', startTime: '12:35', endTime: '1:20' },
    { id: 'osl-wunderhorse', name: 'Wunderhorse', stage: 'Sutro', day: 'saturday', startTime: '1:50', endTime: '2:35' },
    { id: 'osl-sienna-spiro', name: 'Sienna Spiro', stage: 'Sutro', day: 'saturday', startTime: '3:05', endTime: '3:50' },
    { id: 'osl-yard-act', name: 'Yard Act', stage: 'Sutro', day: 'saturday', startTime: '4:20', endTime: '5:05' },
    { id: 'osl-snow-strippers', name: 'Snow Strippers', stage: 'Sutro', day: 'saturday', startTime: '5:35', endTime: '6:20' },
    { id: 'osl-it-s-murph', name: "It's Murph", stage: 'Sutro', day: 'saturday', startTime: '6:50', endTime: '8:00' },
    { id: 'osl-pinkpantheress', name: 'PinkPantheress', stage: 'Sutro', day: 'saturday', startTime: '8:45', endTime: '9:45', headliner: true },
    { id: 'osl-ryman', name: 'Ryman', stage: 'Panhandle', day: 'saturday', startTime: '12:00', endTime: '12:30' },
    { id: 'osl-racing-mount-pleasant-sat-panhandle', name: 'Racing Mount Pleasant', stage: 'Panhandle', day: 'saturday', startTime: '1:10', endTime: '1:50' },
    { id: 'osl-ally-evenson', name: 'Ally Evenson', stage: 'Panhandle', day: 'saturday', startTime: '2:35', endTime: '3:05' },
    { id: 'osl-automatic', name: 'Automatic', stage: 'Panhandle', day: 'saturday', startTime: '4:00', endTime: '4:40' },
    { id: 'osl-silvana-estrada', name: 'Silvana Estrada', stage: 'Panhandle', day: 'saturday', startTime: '5:45', endTime: '6:25' },
    { id: 'osl-dj-trixie-mattel', name: 'DJ Trixie Mattel', stage: 'Panhandle', day: 'saturday', startTime: '7:20', endTime: '8:05' },
    { id: 'osl-bad-juju-sat-soma', name: 'Bad Juju', stage: 'SoMa', day: 'saturday', startTime: '1:00', endTime: '1:55' },
    { id: 'osl-1-800-girls', name: '1-800 Girls', stage: 'SoMa', day: 'saturday', startTime: '1:55', endTime: '3:25' },
    { id: 'osl-camoufly', name: 'Camoufly', stage: 'SoMa', day: 'saturday', startTime: '3:25', endTime: '4:55' },
    { id: 'osl-sultan-shepard', name: 'Sultan + Shepard', stage: 'SoMa', day: 'saturday', startTime: '4:55', endTime: '6:25' },
    { id: 'osl-ben-bohmer', name: 'Ben Böhmer', stage: 'SoMa', day: 'saturday', startTime: '6:40', endTime: '8:10' },
    { id: 'osl-lane-8', name: 'Lane 8', stage: 'SoMa', day: 'saturday', startTime: '8:25', endTime: '9:55' },
    { id: 'osl-oasis-dj-set-beverly-chills', name: 'Oasis DJ Set: Beverly Chills', stage: "Oasis @ Dolores'", day: 'saturday', startTime: '12:30', endTime: '1:45' },
    { id: 'osl-out-tonight-a-musical-singalong-feat-d-arcy-drollinger', name: "Out Tonight: A Musical Singalong feat. D'Arcy Drollinger", stage: "Oasis @ Dolores'", day: 'saturday', startTime: '1:15', endTime: '2:15' },
    { id: 'osl-reparations-w-nicki-jizz-feat-kori-king', name: 'Reparations w/ Nicki Jizz feat. Kori King', stage: "Oasis @ Dolores'", day: 'saturday', startTime: '3:15', endTime: '4:45' },
    { id: 'osl-oasis-dj-set-dj-ion-the-prize', name: 'Oasis DJ Set: DJ Ion the Prize', stage: "Oasis @ Dolores'", day: 'saturday', startTime: '4:45', endTime: '5:45' },
    { id: 'osl-princess-w-tito-soto-feat-lydia-b-kollins', name: 'Princess w/ Tito Soto feat. Lydia B Kollins', stage: "Oasis @ Dolores'", day: 'saturday', startTime: '5:45', endTime: '7:15' },
    { id: 'osl-princess-dj-set-dj-vrok', name: 'Princess DJ Set: DJ Vrok', stage: "Oasis @ Dolores'", day: 'saturday', startTime: '7:15', endTime: '8:30' },
    { id: 'osl-surprise-guest-sat', name: 'Surprise Guest', stage: 'Duboce Triangle', day: 'saturday', startTime: '12:15', endTime: '1:45' },
    { id: 'osl-bandalos-chinos-sat-duboce-triangle', name: 'Bandalos Chinos', stage: 'Duboce Triangle', day: 'saturday', startTime: '2:10', endTime: '2:40' },
    { id: 'osl-racing-mount-pleasant-sat-duboce-triangle', name: 'Racing Mount Pleasant', stage: 'Duboce Triangle', day: 'saturday', startTime: '3:30', endTime: '4:00' },
    { id: 'osl-rio-kosta-dj-set', name: 'Rio Kosta DJ Set', stage: 'Duboce Triangle', day: 'saturday', startTime: '4:50', endTime: '5:20' },
    { id: 'osl-laszewo-sat-duboce-triangle', name: 'Łaszewo', stage: 'Duboce Triangle', day: 'saturday', startTime: '6:20', endTime: '6:50' },
    { id: 'osl-bad-juju-sat-duboce-triangle', name: 'Bad Juju', stage: 'Duboce Triangle', day: 'saturday', startTime: '7:50', endTime: '8:35' },
    { id: 'osl-bingo-loco-sat-cocktail-magic-1', name: 'Bingo Loco', stage: 'Cocktail Magic', day: 'saturday', startTime: '12:30', endTime: '1:15' },
    { id: 'osl-bingo-loco-sat-cocktail-magic-2', name: 'Bingo Loco', stage: 'Cocktail Magic', day: 'saturday', startTime: '1:40', endTime: '2:25' },
    { id: 'osl-bingo-loco-sat-cocktail-magic-3', name: 'Bingo Loco', stage: 'Cocktail Magic', day: 'saturday', startTime: '2:50', endTime: '3:35' },
    { id: 'osl-open-mic-hosted-by-rainbow-girls-sat', name: 'Open Mic hosted by Rainbow Girls', stage: 'Cocktail Magic', day: 'saturday', startTime: '4:05', endTime: '4:50' },
    { id: 'osl-bootie-mashup-hip-hop-fuego-w-dj-airsun', name: 'Bootie Mashup: Hip Hop Fuego w/ DJ Airsun', stage: 'Cocktail Magic', day: 'saturday', startTime: '5:05', endTime: '6:05' },
    { id: 'osl-electric-feels', name: 'Electric Feels', stage: 'Cocktail Magic', day: 'saturday', startTime: '6:20', endTime: '7:20' },

    // ── Sunday ──
    { id: 'osl-san-francisco-gay-men-s-chorus', name: "San Francisco Gay Men's Chorus", stage: 'Lands End', day: 'sunday', startTime: '12:00', endTime: '12:40' },
    { id: 'osl-sports', name: 'Sports', stage: 'Lands End', day: 'sunday', startTime: '1:10', endTime: '1:55' },
    { id: 'osl-balu-brigada', name: 'Balu Brigada', stage: 'Lands End', day: 'sunday', startTime: '2:25', endTime: '3:15' },
    { id: 'osl-jade', name: 'Jade', stage: 'Lands End', day: 'sunday', startTime: '3:45', endTime: '4:45' },
    { id: 'osl-disco-lines', name: 'Disco Lines', stage: 'Lands End', day: 'sunday', startTime: '5:15', endTime: '6:15' },
    { id: 'osl-empire-of-the-sun', name: 'Empire of the Sun', stage: 'Lands End', day: 'sunday', startTime: '6:45', endTime: '7:45', headliner: true },
    { id: 'osl-rufus-du-sol', name: 'Rüfüs Du Sol', stage: 'Lands End', day: 'sunday', startTime: '8:25', endTime: '9:55', headliner: true },
    { id: 'osl-magnus-ferrell', name: 'Magnus Ferrell', stage: 'Twin Peaks', day: 'sunday', startTime: '12:45', endTime: '1:25' },
    { id: 'osl-sosocamo', name: 'Sosocamo', stage: 'Twin Peaks', day: 'sunday', startTime: '2:10', endTime: '2:55' },
    { id: 'osl-destin-conrad', name: 'Destin Conrad', stage: 'Twin Peaks', day: 'sunday', startTime: '3:40', endTime: '4:30' },
    { id: 'osl-kwn', name: 'KWN', stage: 'Twin Peaks', day: 'sunday', startTime: '5:15', endTime: '6:05' },
    { id: 'osl-mariah-the-scientist', name: 'Mariah the Scientist', stage: 'Twin Peaks', day: 'sunday', startTime: '6:50', endTime: '7:50' },
    { id: 'osl-baby-keem', name: 'Baby Keem', stage: 'Twin Peaks', day: 'sunday', startTime: '8:40', endTime: '9:55', headliner: true },
    { id: 'osl-death-cab-for-cutie-sun-sutro-1', name: 'Death Cab for Cutie', stage: 'Sutro', day: 'sunday', startTime: '12:40', endTime: '1:30', headliner: true },
    { id: 'osl-marlon-funaki-sun-sutro', name: 'Marlon Funaki', stage: 'Sutro', day: 'sunday', startTime: '1:50', endTime: '2:30' },
    { id: 'osl-momma', name: 'Momma', stage: 'Sutro', day: 'sunday', startTime: '3:00', endTime: '3:45' },
    { id: 'osl-kingfishr', name: 'Kingfishr', stage: 'Sutro', day: 'sunday', startTime: '4:15', endTime: '5:05' },
    { id: 'osl-the-temper-trap', name: 'The Temper Trap', stage: 'Sutro', day: 'sunday', startTime: '5:35', endTime: '6:25' },
    { id: 'osl-not-for-radio', name: 'Not for Radio', stage: 'Sutro', day: 'sunday', startTime: '7:05', endTime: '7:55' },
    { id: 'osl-death-cab-for-cutie-sun-sutro-2', name: 'Death Cab for Cutie', stage: 'Sutro', day: 'sunday', startTime: '8:25', endTime: '9:40', headliner: true },
    { id: 'osl-cruz-beckham', name: 'Cruz Beckham', stage: 'Panhandle', day: 'sunday', startTime: '12:00', endTime: '12:40' },
    { id: 'osl-day-we-ran-sun-panhandle', name: 'Day We Ran', stage: 'Panhandle', day: 'sunday', startTime: '1:25', endTime: '2:05' },
    { id: 'osl-amble', name: 'Amble', stage: 'Panhandle', day: 'sunday', startTime: '2:55', endTime: '3:35' },
    { id: 'osl-night-tapes', name: 'Night Tapes', stage: 'Panhandle', day: 'sunday', startTime: '4:30', endTime: '5:10' },
    { id: 'osl-infinity-song', name: 'Infinity Song', stage: 'Panhandle', day: 'sunday', startTime: '6:05', endTime: '6:45' },
    { id: 'osl-frost-children', name: 'Frost Children', stage: 'Panhandle', day: 'sunday', startTime: '7:50', endTime: '8:35' },
    { id: 'osl-etari', name: 'Etari', stage: 'SoMa', day: 'sunday', startTime: '12:05', endTime: '1:35' },
    { id: 'osl-x-club', name: 'X Club.', stage: 'SoMa', day: 'sunday', startTime: '1:35', endTime: '3:10' },
    { id: 'osl-carlita', name: 'Carlita', stage: 'SoMa', day: 'sunday', startTime: '3:10', endTime: '4:45' },
    { id: 'osl-boys-noize', name: 'Boys Noize', stage: 'SoMa', day: 'sunday', startTime: '4:45', endTime: '6:20' },
    { id: 'osl-miss-monique', name: 'Miss Monique', stage: 'SoMa', day: 'sunday', startTime: '6:20', endTime: '7:55' },
    { id: 'osl-boris-brejcha', name: 'Boris Brejcha', stage: 'SoMa', day: 'sunday', startTime: '7:55', endTime: '9:55' },
    { id: 'osl-charles-hawthorne', name: 'Charles Hawthorne', stage: "Polyglamorous @ Dolores'", day: 'sunday', startTime: '12:45', endTime: '2:25' },
    { id: 'osl-mark-o-brien', name: "Mark O'Brien", stage: "Polyglamorous @ Dolores'", day: 'sunday', startTime: '2:25', endTime: '3:45' },
    { id: 'osl-grace-towers-and-friends-sun-polyglamorous-1', name: 'Grace Towers & Friends', stage: "Polyglamorous @ Dolores'", day: 'sunday', startTime: '3:45', endTime: '4:05' },
    { id: 'osl-stanley-frank-sensation', name: 'Stanley Frank Sensation', stage: "Polyglamorous @ Dolores'", day: 'sunday', startTime: '4:05', endTime: '5:05' },
    { id: 'osl-beya', name: 'Beya', stage: "Polyglamorous @ Dolores'", day: 'sunday', startTime: '5:05', endTime: '6:05' },
    { id: 'osl-grace-towers-and-friends-sun-polyglamorous-2', name: 'Grace Towers & Friends', stage: "Polyglamorous @ Dolores'", day: 'sunday', startTime: '6:05', endTime: '6:25' },
    { id: 'osl-elaine-and-robin', name: 'Elaine & Robin', stage: "Polyglamorous @ Dolores'", day: 'sunday', startTime: '6:25', endTime: '7:25' },
    { id: 'osl-dj-minx', name: 'DJ Minx', stage: "Polyglamorous @ Dolores'", day: 'sunday', startTime: '7:25', endTime: '8:25' },
    { id: 'osl-britton', name: 'Britton', stage: 'Duboce Triangle', day: 'sunday', startTime: '2:05', endTime: '2:35' },
    { id: 'osl-day-we-ran-sun-duboce-triangle', name: 'Day We Ran', stage: 'Duboce Triangle', day: 'sunday', startTime: '3:25', endTime: '3:55' },
    { id: 'osl-frost-children-dj-set', name: 'Frost Children DJ Set', stage: 'Duboce Triangle', day: 'sunday', startTime: '4:45', endTime: '5:30' },
    { id: 'osl-marlon-funaki-sun-duboce-triangle', name: 'Marlon Funaki', stage: 'Duboce Triangle', day: 'sunday', startTime: '6:15', endTime: '6:45' },
    { id: 'osl-bingo-loco-sun-cocktail-magic-1', name: 'Bingo Loco', stage: 'Cocktail Magic', day: 'sunday', startTime: '12:30', endTime: '1:15' },
    { id: 'osl-bingo-loco-sun-cocktail-magic-2', name: 'Bingo Loco', stage: 'Cocktail Magic', day: 'sunday', startTime: '1:40', endTime: '2:25' },
    { id: 'osl-bingo-loco-sun-cocktail-magic-3', name: 'Bingo Loco', stage: 'Cocktail Magic', day: 'sunday', startTime: '2:50', endTime: '3:35' },
    { id: 'osl-open-mic-hosted-by-rainbow-girls-sun', name: 'Open Mic hosted by Rainbow Girls', stage: 'Cocktail Magic', day: 'sunday', startTime: '4:05', endTime: '4:50' },
    { id: 'osl-aidan-corcoran', name: 'Aidan Corcoran', stage: 'Cocktail Magic', day: 'sunday', startTime: '5:15', endTime: '5:45' },
    { id: 'osl-help-me-lose-my-mind-uk-garage-and-house-w-mphd', name: 'Help Me Lose My Mind: UK Garage & House w/ MPHD', stage: 'Cocktail Magic', day: 'sunday', startTime: '6:00', endTime: '7:00' },
    { id: 'osl-surprise-guest-sun', name: 'Surprise Guest', stage: 'Cocktail Magic', day: 'sunday', startTime: '7:45', endTime: '8:45' },
  ],
}

// ── Exports ───────────────────────────────────────────────────────────────────

export const FESTIVALS: Festival[] = [OUTSIDE_LANDS, LOLLAPALOOZA]

export function getFestival(id: string): Festival | null {
  return FESTIVALS.find(f => f.id === id) ?? null
}

export function getArtistsByDay(festival: Festival, day: string): FestivalArtist[] {
  return festival.artists.filter(a => a.day === day)
}

// startTime/endTime are stored as bare 'h:mm' (see FestivalArtist above) -
// every set falls between noon and 10pm, so appending PM is unambiguous.
export function formatSetTime(a: FestivalArtist): string | null {
  if (!a.startTime) return null
  return a.endTime ? `${a.startTime}–${a.endTime} PM` : `${a.startTime} PM`
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
