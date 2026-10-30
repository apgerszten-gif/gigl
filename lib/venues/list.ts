// The venues whose own websites the nightly venue sync reads
// (app/api/cron/sync-venues): ten independent rooms in each of the 20 most
// populous US cities (Census Bureau, July 2025 estimates), New York down to
// Nashville, which takes in Austin.
//
// The point is the shows Ticketmaster doesn't carry - rooms that sell
// through DICE, Eventbrite, their own box office or a door. Rooms that sell
// through Ticketmaster are fine to list too: the sync drops any show the
// catalogue already has (see dedupe in lib/venues/sync.ts).
//
// `url` can be the home page. When it has no events on it, the sync follows
// one same-site link that looks like the calendar ("Calendar", "Shows",
// "Events"), so a venue only needs an exact calendar URL when its menu calls
// the page something else.
//
// `city` on a venue is only for one outside its group's city proper -
// Brooklyn, Mesa, Solana Beach - so its shows file under the right place.
// The /admin venue report says which of these produced shows on the last
// run; one that never does is worth replacing.

import { SYNC_CITIES } from '../shows/cities'

export interface VenueSeed {
  name: string
  url:  string
  city?: string
}

interface VenueCity {
  city:   string
  state:  string
  // IANA zone, for turning UTC timestamps into the local date of the show.
  tz:     string
  venues: VenueSeed[]
}

export interface Venue {
  id:    string
  name:  string
  url:   string
  city:  string
  state: string
  tz:    string
  // The group city as SYNC_CITIES labels it ("Los Angeles, CA"), matching the
  // Ticketmaster rows' metro column.
  metro: string
  // City centroid: the fallback position for a show whose listing carries no
  // coordinates, the same fallback the Ticketmaster sync uses.
  lat:   number | null
  lng:   number | null
}

const VENUE_CITIES: VenueCity[] = [
  {
    city: 'New York', state: 'NY', tz: 'America/New_York',
    venues: [
      { name: 'Baby\'s All Right', url: 'https://babysallright.com', city: 'Brooklyn' },
      { name: 'Union Pool', url: 'https://union-pool.com', city: 'Brooklyn' },
      { name: 'Elsewhere', url: 'https://www.elsewhere.club', city: 'Brooklyn' },
      { name: 'Market Hotel', url: 'https://www.markethotel.org', city: 'Brooklyn' },
      { name: 'Saint Vitus', url: 'https://saintvitusbar.com', city: 'Brooklyn' },
      { name: 'Pianos', url: 'https://www.pianosnyc.com' },
      { name: 'Le Poisson Rouge', url: 'https://lpr.com' },
      { name: 'Public Records', url: 'https://publicrecords.nyc', city: 'Brooklyn' },
      { name: 'Rockwood Music Hall', url: 'https://www.rockwoodmusichall.com' },
      { name: 'Barbès', url: 'https://www.barbesbrooklyn.com', city: 'Brooklyn' },
    ],
  },
  {
    city: 'Los Angeles', state: 'CA', tz: 'America/Los_Angeles',
    venues: [
      { name: 'The Echo', url: 'https://www.theecho.com' },
      { name: 'Zebulon', url: 'https://zebulon.la' },
      { name: 'The Smell', url: 'https://www.thesmell.org' },
      { name: 'Moroccan Lounge', url: 'https://www.themoroccan.com' },
      { name: 'Lodge Room', url: 'https://www.lodgeroomhlp.com' },
      { name: 'Troubadour', url: 'https://www.troubadour.com' },
      { name: 'The Hi Hat', url: 'https://www.hihat.la' },
      { name: 'Gold-Diggers', url: 'https://www.golddiggers.la' },
      { name: 'Hotel Cafe', url: 'https://www.hotelcafe.com' },
      { name: 'The Mint', url: 'https://www.themintla.com' },
    ],
  },
  {
    city: 'Chicago', state: 'IL', tz: 'America/Chicago',
    venues: [
      { name: 'Empty Bottle', url: 'https://www.emptybottle.com' },
      { name: 'Lincoln Hall', url: 'https://lh-st.com' },
      { name: 'Hideout', url: 'https://hideoutchicago.com' },
      { name: 'Thalia Hall', url: 'https://www.thaliahallchicago.com' },
      { name: 'Sleeping Village', url: 'https://www.sleeping-village.com' },
      { name: 'Subterranean', url: 'https://subt.net' },
      { name: 'Beat Kitchen', url: 'https://www.beatkitchen.com' },
      { name: 'Reggies', url: 'https://www.reggieslive.com' },
      { name: 'The Whistler', url: 'https://www.whistlerchicago.com' },
      { name: 'Constellation', url: 'https://www.constellation-chicago.com' },
    ],
  },
  {
    city: 'Houston', state: 'TX', tz: 'America/Chicago',
    venues: [
      { name: 'White Oak Music Hall', url: 'https://whiteoakmusichall.com' },
      { name: 'McGonigel\'s Mucky Duck', url: 'https://www.mcgonigels.com' },
      { name: 'The Continental Club', url: 'https://continentalclub.com/houston' },
      { name: 'Shoeshine Charley\'s Big Top Lounge', url: 'https://continentalclub.com/bigtop' },
      { name: 'Last Concert Cafe', url: 'https://lastconcert.com' },
      { name: 'Axelrad Beer Garden', url: 'https://www.axelradhouston.com' },
      { name: 'Dan Electro\'s', url: 'https://www.danelectrosheights.com' },
      { name: 'Notsuoh', url: 'https://notsuoh.com' },
      { name: 'The Secret Group', url: 'https://www.thesecretgrouphtx.com' },
      { name: 'The Heights Theater', url: 'https://theheightstheater.com' },
    ],
  },
  {
    city: 'Phoenix', state: 'AZ', tz: 'America/Phoenix',
    venues: [
      { name: 'The Rebel Lounge', url: 'https://therebellounge.com' },
      { name: 'Valley Bar', url: 'https://valleybarphx.com' },
      { name: 'Crescent Ballroom', url: 'https://crescentphx.com' },
      { name: 'Last Exit Live', url: 'https://lastexitlive.com' },
      { name: 'The Nile Theater', url: 'https://www.theniletheater.com', city: 'Mesa' },
      { name: 'The Van Buren', url: 'https://www.thevanburenphx.com' },
      { name: 'The Trunk Space', url: 'https://www.thetrunkspace.com' },
      { name: 'Linger Longer Lounge', url: 'https://www.lingerlongerlounge.com' },
      { name: 'The Nash', url: 'https://thenash.org' },
      { name: 'Char\'s Has the Blues', url: 'https://www.charshastheblues.com' },
    ],
  },
  {
    city: 'Philadelphia', state: 'PA', tz: 'America/New_York',
    venues: [
      { name: 'Johnny Brenda\'s', url: 'https://www.johnnybrendas.com' },
      { name: 'Union Transfer', url: 'https://utphilly.com' },
      { name: 'World Cafe Live', url: 'https://www.worldcafelive.org' },
      { name: 'PhilaMOCA', url: 'https://www.philamoca.org' },
      { name: 'Kung Fu Necktie', url: 'https://www.kungfunecktie.com' },
      { name: 'Ortlieb\'s', url: 'https://www.ortliebsphilly.com' },
      { name: 'MilkBoy Philly', url: 'https://www.milkboyphilly.com' },
      { name: 'Underground Arts', url: 'https://www.undergroundarts.org' },
      { name: 'Solar Myth', url: 'https://www.solarmyth.org' },
      { name: 'Chris\' Jazz Cafe', url: 'https://www.chrisjazzcafe.com' },
    ],
  },
  {
    city: 'San Antonio', state: 'TX', tz: 'America/Chicago',
    venues: [
      { name: 'Paper Tiger', url: 'https://www.papertigersatx.com' },
      { name: 'Sam\'s Burger Joint', url: 'https://www.samsburgerjoint.com' },
      { name: 'The Lonesome Rose', url: 'https://www.lonesomerosesa.com' },
      { name: 'Jazz, TX', url: 'https://www.jazztx.com' },
      { name: 'The Limelight', url: 'https://www.limelightsa.com' },
      { name: '502 Bar', url: 'https://www.502bar.com' },
      { name: 'The Aztec Theatre', url: 'https://www.theaztectheater.com' },
      { name: 'Hi-Tones', url: 'https://www.hitonessa.com' },
      { name: 'The Ten Eleven', url: 'https://www.thetenelevensa.com' },
      { name: 'Fitzgerald\'s', url: 'https://www.fitzgeraldssa.com' },
    ],
  },
  {
    city: 'San Diego', state: 'CA', tz: 'America/Los_Angeles',
    venues: [
      { name: 'The Casbah', url: 'https://www.casbahmusic.com' },
      { name: 'Soda Bar', url: 'https://www.sodabarmusic.com' },
      { name: 'Belly Up', url: 'https://bellyup.com', city: 'Solana Beach' },
      { name: 'The Irenic', url: 'https://www.theirenic.com' },
      { name: 'Music Box', url: 'https://www.musicboxsd.com' },
      { name: 'The Observatory North Park', url: 'https://www.observatorysd.com' },
      { name: 'Lestat\'s on Park', url: 'https://www.lestats.com' },
      { name: 'Winston\'s', url: 'https://www.winstonsob.com' },
      { name: 'Til-Two Club', url: 'https://www.tiltwoclub.com' },
      { name: 'Black Cat Bar', url: 'https://www.blackcatbarsd.com' },
    ],
  },
  {
    city: 'Dallas', state: 'TX', tz: 'America/Chicago',
    venues: [
      { name: 'Club Dada', url: 'https://www.dadadallas.com' },
      { name: 'Three Links', url: 'https://www.threelinksdeepellum.com' },
      { name: 'Trees', url: 'https://www.treesdallas.com' },
      { name: 'The Prophet Bar', url: 'https://www.theprophetbar.com' },
      { name: 'Sons of Hermann Hall', url: 'https://www.sonsofhermann.com' },
      { name: 'Granada Theater', url: 'https://www.granadatheater.com' },
      { name: 'Double Wide', url: 'https://www.double-wide.com' },
      { name: 'Adair\'s Saloon', url: 'https://www.adairssaloon.com' },
      { name: 'Ruins', url: 'https://www.ruinsdallas.com' },
      { name: 'Deep Ellum Art Co.', url: 'https://www.deepellumart.co' },
    ],
  },
  {
    city: 'Fort Worth', state: 'TX', tz: 'America/Chicago',
    venues: [
      { name: 'Tulips FTW', url: 'https://www.tulipsftw.com' },
      { name: 'Lola\'s', url: 'https://www.lolasfortworth.com' },
      { name: 'MASS', url: 'https://www.massftw.com' },
      { name: 'Magnolia Motor Lounge', url: 'https://www.magnoliamotorlounge.com' },
      { name: 'Scat Jazz Lounge', url: 'https://www.scatjazzlounge.com' },
      { name: 'Tannahill\'s Tavern & Music Hall', url: 'https://www.tannahills.com' },
      { name: 'Billy Bob\'s Texas', url: 'https://www.billybobstexas.com' },
      { name: 'Ridglea Theater', url: 'https://www.ridgleatheater.com' },
      { name: 'Capital Bar', url: 'https://www.capitalbarfw.com' },
      { name: 'The Post at River East', url: 'https://www.thepostfw.com' },
    ],
  },
  {
    city: 'Jacksonville', state: 'FL', tz: 'America/New_York',
    venues: [
      { name: 'Jack Rabbits', url: 'https://www.jackrabbitsonline.com' },
      { name: 'Underbelly', url: 'https://www.underbellylive.com' },
      { name: 'Murray Hill Theatre', url: 'https://www.murrayhilltheatre.com' },
      { name: 'Blue Jay Listening Room', url: 'https://www.bluejaylisteningroom.com', city: 'Jacksonville Beach' },
      { name: 'The Stout Snug', url: 'https://www.thestoutsnug.com' },
      { name: 'Intuition Bier Hall', url: 'https://intuitionaleworks.com/live-music/' },
      { name: 'Monkey\'s Uncle', url: 'https://monkeysunclemandarin.com' },
      { name: 'Florida Theatre', url: 'https://www.floridatheatre.com' },
      { name: 'Ponte Vedra Concert Hall', url: 'https://www.pvconcerthall.com', city: 'Ponte Vedra Beach' },
      { name: 'Surfer the Bar', url: 'https://www.surferthebar.com', city: 'Jacksonville Beach' },
    ],
  },
  {
    city: 'Austin', state: 'TX', tz: 'America/Chicago',
    venues: [
      { name: 'Mohawk', url: 'https://mohawkaustin.com' },
      { name: 'Cheer Up Charlies', url: 'https://www.cheerupcharlies.com' },
      { name: 'Hotel Vegas', url: 'https://texashotelvegas.com' },
      { name: 'Hole in the Wall', url: 'https://www.holeinthewallaustin.com' },
      { name: 'The Continental Club', url: 'https://continentalclub.com/austin' },
      { name: 'Antone\'s', url: 'https://antonesnightclub.com' },
      { name: 'Empire Control Room', url: 'https://www.empireatx.com' },
      { name: 'Sahara Lounge', url: 'https://www.saharalounge.com' },
      { name: 'The Saxon Pub', url: 'https://www.thesaxonpub.com' },
      { name: 'Scoot Inn', url: 'https://www.scootinnaustin.com' },
    ],
  },
  {
    city: 'San Jose', state: 'CA', tz: 'America/Los_Angeles',
    venues: [
      { name: 'The Ritz', url: 'https://www.theritzsanjose.com' },
      { name: 'Café Stritch', url: 'https://www.cafestritch.com' },
      { name: 'SLG Art Boutiki', url: 'https://www.artboutiki.com' },
      { name: 'SJZ Break Room', url: 'https://sanjosejazz.org' },
      { name: 'San Jose Civic', url: 'https://www.sanjosecivic.com' },
      { name: 'Hammer Theatre Center', url: 'https://hammertheatre.com' },
      { name: 'San Pedro Square Market', url: 'https://sanpedrosquare.com' },
      { name: 'Caravan Lounge', url: 'https://www.caravanlounge.com' },
      { name: 'The Back Bar SoFA', url: 'https://www.backbarsofa.com' },
      { name: 'The Continental Bar', url: 'https://www.thecontinentalbar.com' },
    ],
  },
  {
    city: 'Charlotte', state: 'NC', tz: 'America/New_York',
    venues: [
      { name: 'The Evening Muse', url: 'https://www.eveningmuse.com' },
      { name: 'Snug Harbor', url: 'https://www.snugrock.com' },
      { name: 'Petra\'s', url: 'https://www.petrasbar.com' },
      { name: 'Smokey Joe\'s Café', url: 'https://www.smokeyjoescafe.com' },
      { name: 'The Milestone Club', url: 'https://www.themilestoneclub.com' },
      { name: 'Middle C Jazz', url: 'https://www.middlecjazz.com' },
      { name: 'Visulite Theatre', url: 'https://www.visulite.com' },
      { name: 'Neighborhood Theatre', url: 'https://www.neighborhoodtheatre.com' },
      { name: 'Comet Grill', url: 'https://www.cometgrillcharlotte.com' },
      { name: 'The Rabbit Hole', url: 'https://www.therabbitholeclt.com' },
    ],
  },
  {
    city: 'Columbus', state: 'OH', tz: 'America/New_York',
    venues: [
      { name: 'Ace of Cups', url: 'https://aceofcupsbar.com' },
      { name: 'Rumba Cafe', url: 'https://columbusrumbacafe.com' },
      { name: 'Big Room Bar', url: 'https://www.bigroombar.com' },
      { name: 'Skully\'s Music-Diner', url: 'https://skullys.org' },
      { name: 'Spacebar', url: 'https://www.spacebarcolumbus.com' },
      { name: 'Woodlands Tavern', url: 'https://woodlandstavern.com' },
      { name: 'Kafe Kerouac', url: 'https://kafekerouac.com' },
      { name: 'Rambling House', url: 'https://www.ramblinghousemusic.com' },
      { name: 'The Bluestone', url: 'https://liveatthebluestone.com' },
      { name: 'Brothers Drake Meadery', url: 'https://www.brothersdrake.com/music.html' },
    ],
  },
  {
    city: 'Indianapolis', state: 'IN', tz: 'America/Indiana/Indianapolis',
    venues: [
      { name: 'HI-FI', url: 'https://hifiindy.com' },
      { name: 'Melody Inn', url: 'https://melodyindy.com' },
      { name: 'The Jazz Kitchen', url: 'https://www.thejazzkitchen.com' },
      { name: 'Chatterbox Jazz Club', url: 'https://www.chatterboxjazz.com' },
      { name: 'Hoosier Dome', url: 'https://indyhoosierdome.com' },
      { name: 'Black Circle Brewing', url: 'https://www.blackcirclebrewing.com' },
      { name: 'Square Cat Vinyl', url: 'https://www.squarecatvinyl.com' },
      { name: 'White Rabbit Cabaret', url: 'https://www.whiterabbitcabaret.com' },
      { name: 'Mousetrap', url: 'https://trapindy.com' },
      { name: 'The Vogue', url: 'https://www.thevogue.com' },
    ],
  },
  {
    city: 'San Francisco', state: 'CA', tz: 'America/Los_Angeles',
    venues: [
      { name: 'Bottom of the Hill', url: 'https://www.bottomofthehill.com' },
      { name: 'The Independent', url: 'https://www.theindependentsf.com' },
      { name: 'Rickshaw Stop', url: 'https://rickshawstop.com' },
      { name: 'Brick & Mortar Music Hall', url: 'https://www.brickandmortarmusic.com' },
      { name: 'Café du Nord', url: 'https://cafedunord.com' },
      { name: 'The Chapel', url: 'https://www.thechapelsf.com' },
      { name: 'Great American Music Hall', url: 'https://gamh.com' },
      { name: 'Thee Parkside', url: 'https://www.theeparkside.com' },
      { name: 'Hotel Utah', url: 'https://www.hotelutah.com' },
      { name: 'Make-Out Room', url: 'https://www.makeoutroom.com' },
    ],
  },
  {
    city: 'Seattle', state: 'WA', tz: 'America/Los_Angeles',
    venues: [
      { name: 'Neumos', url: 'https://www.neumos.com' },
      { name: 'Barboza', url: 'https://www.thebarboza.com' },
      { name: 'The Crocodile', url: 'https://www.thecrocodile.com' },
      { name: 'Tractor Tavern', url: 'https://tractortavern.com' },
      { name: 'Sunset Tavern', url: 'https://sunsettavern.com' },
      { name: 'Chop Suey', url: 'https://chopsuey.com' },
      { name: 'Clock-Out Lounge', url: 'https://clockoutlounge.com' },
      { name: 'High Dive', url: 'https://www.highdiveseattle.com' },
      { name: 'Nectar Lounge', url: 'https://nectarlounge.com' },
      { name: 'The Royal Room', url: 'https://theroyalroomseattle.com' },
    ],
  },
  {
    city: 'Denver', state: 'CO', tz: 'America/Denver',
    venues: [
      { name: 'Larimer Lounge', url: 'https://larimerlounge.com' },
      { name: 'Lost Lake', url: 'https://lost-lake.com' },
      { name: 'Hi-Dive', url: 'https://hi-dive.com' },
      { name: 'Globe Hall', url: 'https://globehall.com' },
      { name: 'Bluebird Theater', url: 'https://www.bluebirdtheater.net' },
      { name: 'Herman\'s Hideaway', url: 'https://www.hermanshideaway.com' },
      { name: 'Cervantes\' Masterpiece', url: 'https://www.cervantesmasterpiece.com' },
      { name: 'Ophelia\'s Electric Soapbox', url: 'https://www.opheliasdenver.com' },
      { name: 'Dazzle', url: 'https://www.dazzledenver.com' },
      { name: 'Seventh Circle Music Collective', url: 'https://www.seventhcirclemusic.com' },
    ],
  },
  {
    city: 'Nashville', state: 'TN', tz: 'America/Chicago',
    venues: [
      { name: 'The 5 Spot', url: 'https://www.the5spotlive.com' },
      { name: 'The Basement', url: 'https://www.thebasementnashville.com' },
      { name: 'The Basement East', url: 'https://www.thebasementeast.com' },
      { name: 'Exit/In', url: 'https://www.exitin.com' },
      { name: 'The Bluebird Cafe', url: 'https://bluebirdcafe.com' },
      { name: 'Station Inn', url: 'https://stationinn.com' },
      { name: 'Robert\'s Western World', url: 'https://robertswesternworld.com' },
      { name: '3rd & Lindsley', url: 'https://www.3rdandlindsley.com' },
      { name: 'Springwater Supper Club', url: 'https://www.springwatersupperclub.com' },
      { name: 'Eastside Bowl', url: 'https://www.eastsidebowl.com' },
    ],
  },
]

function slug(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function centroid(city: string, state: string): { lat: number; lng: number } | null {
  const match = SYNC_CITIES.find(c => c.city === city && c.stateCode === state)
  return match ? { lat: match.lat, lng: match.lng } : null
}

export const VENUES: Venue[] = VENUE_CITIES.flatMap(group =>
  group.venues.map(seed => {
    const city = seed.city ?? group.city
    const point = centroid(city, group.state) ?? centroid(group.city, group.state)
    return {
      // Stable as long as the name and city are: it is part of every show id
      // this venue produces.
      id:    `${slug(seed.name)}-${slug(city)}`,
      name:  seed.name,
      url:   seed.url,
      city,
      state: group.state,
      tz:    group.tz,
      metro: `${group.city}, ${group.state}`,
      lat:   point?.lat ?? null,
      lng:   point?.lng ?? null,
    }
  }),
)

export const VENUE_CITY_COUNT = VENUE_CITIES.length
