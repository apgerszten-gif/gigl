// The metro areas the nightly sync (app/api/cron/sync-shows) pulls listings
// for. Ticketmaster's Discovery API has no "everything in the US" query that
// paginates sanely, so coverage is defined explicitly, one city at a time.
//
// city + stateCode rather than Ticketmaster's marketId/dmaId: market ids are
// opaque numbers that have to be looked up and re-verified when Ticketmaster
// changes them, whereas city/state is legible in a diff and fails visibly
// (zero results for that city) rather than silently pulling the wrong metro.
//
// lat/lng are the metro centroid, stamped onto every row the city's sync
// produces. Ticketmaster returns a venue location per event, but not
// reliably - plenty of events come back with no venue coordinates at all -
// so the centroid is the fallback that makes distance sorting possible for
// every row rather than most of them. See shows.lat/lng in supabase-schema.
export interface SyncCity {
  city:      string
  stateCode: string
  // Omitted for the US, which is almost everything here. Ticketmaster scopes
  // an event search by country, and a Canadian city queried under
  // countryCode=US simply returns nothing - so this has to travel with the
  // city rather than being a constant in the fetch.
  countryCode?: 'US' | 'CA'
  lat:       number
  lng:       number
}

export const SYNC_CITIES: SyncCity[] = [
  { city: 'New York',      stateCode: 'NY', lat: 40.7128,  lng: -74.0060 },
  { city: 'Brooklyn',      stateCode: 'NY', lat: 40.6782,  lng: -73.9442 },
  { city: 'Los Angeles',   stateCode: 'CA', lat: 34.0522,  lng: -118.2437 },
  { city: 'San Francisco', stateCode: 'CA', lat: 37.7749,  lng: -122.4194 },
  { city: 'Oakland',       stateCode: 'CA', lat: 37.8044,  lng: -122.2712 },
  { city: 'San Diego',     stateCode: 'CA', lat: 32.7157,  lng: -117.1611 },
  { city: 'Sacramento',    stateCode: 'CA', lat: 38.5816,  lng: -121.4944 },
  { city: 'Chicago',       stateCode: 'IL', lat: 41.8781,  lng: -87.6298 },
  { city: 'Houston',       stateCode: 'TX', lat: 29.7604,  lng: -95.3698 },
  { city: 'Austin',        stateCode: 'TX', lat: 30.2672,  lng: -97.7431 },
  { city: 'Dallas',        stateCode: 'TX', lat: 32.7767,  lng: -96.7970 },
  { city: 'San Antonio',   stateCode: 'TX', lat: 29.4241,  lng: -98.4936 },
  { city: 'Phoenix',       stateCode: 'AZ', lat: 33.4484,  lng: -112.0740 },
  { city: 'Tucson',        stateCode: 'AZ', lat: 32.2226,  lng: -110.9747 },
  { city: 'Philadelphia',  stateCode: 'PA', lat: 39.9526,  lng: -75.1652 },
  { city: 'Pittsburgh',    stateCode: 'PA', lat: 40.4406,  lng: -79.9959 },
  { city: 'Seattle',       stateCode: 'WA', lat: 47.6062,  lng: -122.3321 },
  { city: 'Portland',      stateCode: 'OR', lat: 45.5152,  lng: -122.6784 },
  { city: 'Denver',        stateCode: 'CO', lat: 39.7392,  lng: -104.9903 },
  { city: 'Boston',        stateCode: 'MA', lat: 42.3601,  lng: -71.0589 },
  { city: 'Washington',    stateCode: 'DC', lat: 38.9072,  lng: -77.0369 },
  { city: 'Baltimore',     stateCode: 'MD', lat: 39.2904,  lng: -76.6122 },
  { city: 'Atlanta',       stateCode: 'GA', lat: 33.7490,  lng: -84.3880 },
  { city: 'Miami',         stateCode: 'FL', lat: 25.7617,  lng: -80.1918 },
  { city: 'Orlando',       stateCode: 'FL', lat: 28.5383,  lng: -81.3792 },
  { city: 'Tampa',         stateCode: 'FL', lat: 27.9506,  lng: -82.4572 },
  { city: 'Nashville',     stateCode: 'TN', lat: 36.1627,  lng: -86.7816 },
  { city: 'Memphis',       stateCode: 'TN', lat: 35.1495,  lng: -90.0490 },
  { city: 'New Orleans',   stateCode: 'LA', lat: 29.9511,  lng: -90.0715 },
  { city: 'Detroit',       stateCode: 'MI', lat: 42.3314,  lng: -83.0458 },
  { city: 'Minneapolis',   stateCode: 'MN', lat: 44.9778,  lng: -93.2650 },
  { city: 'Milwaukee',     stateCode: 'WI', lat: 43.0389,  lng: -87.9065 },
  { city: 'St. Louis',     stateCode: 'MO', lat: 38.6270,  lng: -90.1994 },
  { city: 'Kansas City',   stateCode: 'MO', lat: 39.0997,  lng: -94.5786 },
  { city: 'Indianapolis',  stateCode: 'IN', lat: 39.7684,  lng: -86.1581 },
  { city: 'Columbus',      stateCode: 'OH', lat: 39.9612,  lng: -82.9988 },
  { city: 'Cleveland',     stateCode: 'OH', lat: 41.4993,  lng: -81.6944 },
  { city: 'Cincinnati',    stateCode: 'OH', lat: 39.1031,  lng: -84.5120 },
  { city: 'Charlotte',     stateCode: 'NC', lat: 35.2271,  lng: -80.8431 },
  { city: 'Raleigh',       stateCode: 'NC', lat: 35.7796,  lng: -78.6382 },
  { city: 'Asheville',     stateCode: 'NC', lat: 35.5951,  lng: -82.5515 },
  { city: 'Richmond',      stateCode: 'VA', lat: 37.5407,  lng: -77.4360 },
  { city: 'Las Vegas',     stateCode: 'NV', lat: 36.1699,  lng: -115.1398 },
  { city: 'Salt Lake City',stateCode: 'UT', lat: 40.7608,  lng: -111.8910 },
  { city: 'Boise',         stateCode: 'ID', lat: 43.6150,  lng: -116.2023 },
  { city: 'Albuquerque',   stateCode: 'NM', lat: 35.0844,  lng: -106.6504 },
  { city: 'Oklahoma City', stateCode: 'OK', lat: 35.4676,  lng: -97.5164 },
  { city: 'Omaha',         stateCode: 'NE', lat: 41.2565,  lng: -95.9345 },
  { city: 'Louisville',    stateCode: 'KY', lat: 38.2527,  lng: -85.7585 },
  { city: 'Birmingham',    stateCode: 'AL', lat: 33.5186,  lng: -86.8104 },
  { city: 'Buffalo',       stateCode: 'NY', lat: 42.8864,  lng: -78.8784 },
  { city: 'Providence',    stateCode: 'RI', lat: 41.8240,  lng: -71.4128 },

  // ── Second wave ───────────────────────────────────────────────────────────
  // The 52 above were a first guess at coverage. These were picked by
  // measurement rather than instinct: every candidate was queried against
  // Ticketmaster for its event count, and the ones carrying real listings
  // kept. Together they add ~6,900 events, and the smallest of them still
  // earn their place - one extra city costs one extra request a night
  // against a 5,000/day quota the sync barely touches.
  //
  // lat/lng here are the MEDIAN of the venue coordinates Ticketmaster
  // returned for each city, not a looked-up civic centroid. For a fallback
  // whose only job is to place a row with no coordinates of its own, the
  // middle of where that city's venues actually are beats the middle of its
  // municipal boundary.
  { city: 'Anchorage',        stateCode: 'AK', lat: 61.2169,   lng: -149.8682 },
  { city: 'Fayetteville',     stateCode: 'AR', lat: 36.1065,   lng: -94.2715 },
  { city: 'Little Rock',      stateCode: 'AR', lat: 34.7411,   lng: -92.2796 },
  { city: 'Flagstaff',        stateCode: 'AZ', lat: 35.1888,   lng: -111.6603 },
  { city: 'Mesa',             stateCode: 'AZ', lat: 33.4146,   lng: -111.8423 },
  { city: 'Tempe',            stateCode: 'AZ', lat: 33.437,    lng: -111.944 },
  { city: 'Anaheim',          stateCode: 'CA', lat: 33.8096,   lng: -117.923 },
  { city: 'Berkeley',         stateCode: 'CA', lat: 37.8697,   lng: -122.2584 },
  { city: 'Fresno',           stateCode: 'CA', lat: 36.7589,   lng: -119.7946 },
  { city: 'Long Beach',       stateCode: 'CA', lat: 33.7671,   lng: -118.1163 },
  { city: 'Pomona',           stateCode: 'CA', lat: 34.0419,   lng: -117.7548 },
  { city: 'Riverside',        stateCode: 'CA', lat: 33.9818,   lng: -117.3713 },
  { city: 'San Jose',         stateCode: 'CA', lat: 37.3305,   lng: -121.8897 },
  { city: 'Santa Ana',        stateCode: 'CA', lat: 33.6998,   lng: -117.9176 },
  { city: 'Santa Barbara',    stateCode: 'CA', lat: 34.4217,   lng: -119.7023 },
  { city: 'Santa Cruz',       stateCode: 'CA', lat: 36.9875,   lng: -121.9828 },
  { city: 'Boulder',          stateCode: 'CO', lat: 40.0402,   lng: -105.3626 },
  { city: 'Colorado Springs', stateCode: 'CO', lat: 38.8372,   lng: -104.7893 },
  { city: 'Fort Collins',     stateCode: 'CO', lat: 40.6475,   lng: -105.0476 },
  { city: 'Bridgeport',       stateCode: 'CT', lat: 41.1766,   lng: -73.2 },
  { city: 'Hartford',         stateCode: 'CT', lat: 41.7684,   lng: -72.6764 },
  { city: 'New Haven',        stateCode: 'CT', lat: 41.3116,   lng: -72.9264 },
  { city: 'Wilmington',       stateCode: 'DE', lat: 39.7411,   lng: -75.5503 },
  { city: 'Fort Lauderdale',  stateCode: 'FL', lat: 26.1384,   lng: -80.131 },
  { city: 'Gainesville',      stateCode: 'FL', lat: 29.6533,   lng: -82.2524 },
  { city: 'Jacksonville',     stateCode: 'FL', lat: 30.3149,   lng: -81.647 },
  { city: 'St. Petersburg',   stateCode: 'FL', lat: 27.7712,   lng: -82.636 },
  { city: 'West Palm Beach',  stateCode: 'FL', lat: 26.6854,   lng: -80.1764 },
  { city: 'Athens',           stateCode: 'GA', lat: 34.0052,   lng: -83.3475 },
  { city: 'Augusta',          stateCode: 'GA', lat: 33.4712,   lng: -81.9661 },
  { city: 'Savannah',         stateCode: 'GA', lat: 32.0785,   lng: -81.0978 },
  { city: 'Honolulu',         stateCode: 'HI', lat: 21.2772,   lng: -157.8271 },
  { city: 'Des Moines',       stateCode: 'IA', lat: 41.5876,   lng: -93.6383 },
  { city: 'Iowa City',        stateCode: 'IA', lat: 41.6899,   lng: -91.4517 },
  { city: 'Wichita',          stateCode: 'KS', lat: 37.6845,   lng: -97.3355 },
  { city: 'Lexington',        stateCode: 'KY', lat: 38.0531,   lng: -84.5086 },
  { city: 'Baton Rouge',      stateCode: 'LA', lat: 30.4378,   lng: -91.1899 },
  { city: 'Portland',         stateCode: 'ME', lat: 43.654,    lng: -70.2633 },
  { city: 'Ann Arbor',        stateCode: 'MI', lat: 42.2801,   lng: -83.7511 },
  { city: 'Grand Rapids',     stateCode: 'MI', lat: 42.9634,   lng: -85.6721 },
  { city: 'Columbia',         stateCode: 'MO', lat: 38.9522,   lng: -92.3278 },
  { city: 'Springfield',      stateCode: 'MO', lat: 37.2053,   lng: -93.2976 },
  { city: 'Jackson',          stateCode: 'MS', lat: 32.3359,   lng: -90.1748 },
  { city: 'Bozeman',          stateCode: 'MT', lat: 45.6853,   lng: -111.0459 },
  { city: 'Missoula',         stateCode: 'MT', lat: 46.8697,   lng: -113.9961 },
  { city: 'Fargo',            stateCode: 'ND', lat: 46.8797,   lng: -96.7929 },
  { city: 'Manchester',       stateCode: 'NH', lat: 42.986,    lng: -71.4631 },
  { city: 'Asbury Park',      stateCode: 'NJ', lat: 40.22,     lng: -74.0007 },
  { city: 'Atlantic City',    stateCode: 'NJ', lat: 39.3613,   lng: -74.4287 },
  { city: 'Newark',           stateCode: 'NJ', lat: 40.7395,   lng: -74.1681 },
  { city: 'Reno',             stateCode: 'NV', lat: 39.5233,   lng: -119.781 },
  { city: 'Albany',           stateCode: 'NY', lat: 42.6529,   lng: -73.7504 },
  { city: 'Bronx',            stateCode: 'NY', lat: 40.8745,   lng: -73.8917 },
  { city: 'Queens',           stateCode: 'NY', lat: 40.7385,   lng: -73.8163 },
  { city: 'Rochester',        stateCode: 'NY', lat: 43.1501,   lng: -77.6402 },
  { city: 'Syracuse',         stateCode: 'NY', lat: 43.0479,   lng: -76.153 },
  { city: 'Akron',            stateCode: 'OH', lat: 41.0785,   lng: -81.5153 },
  { city: 'Dayton',           stateCode: 'OH', lat: 39.8112,   lng: -84.1993 },
  { city: 'Toledo',           stateCode: 'OH', lat: 41.651,    lng: -83.5376 },
  { city: 'Tulsa',            stateCode: 'OK', lat: 36.1538,   lng: -95.9946 },
  { city: 'Bend',             stateCode: 'OR', lat: 44.0597,   lng: -121.311 },
  { city: 'Eugene',           stateCode: 'OR', lat: 44.0512,   lng: -123.0971 },
  { city: 'Allentown',        stateCode: 'PA', lat: 40.6013,   lng: -75.477 },
  { city: 'Harrisburg',       stateCode: 'PA', lat: 40.2537,   lng: -76.8692 },
  { city: 'Scranton',         stateCode: 'PA', lat: 41.348,    lng: -75.6639 },
  { city: 'Charleston',       stateCode: 'SC', lat: 32.7883,   lng: -79.9368 },
  { city: 'Columbia',         stateCode: 'SC', lat: 33.999,    lng: -81.0354 },
  { city: 'Greenville',       stateCode: 'SC', lat: 34.8573,   lng: -82.397 },
  { city: 'Sioux Falls',      stateCode: 'SD', lat: 43.5513,   lng: -96.7283 },
  { city: 'Chattanooga',      stateCode: 'TN', lat: 35.0386,   lng: -85.3061 },
  { city: 'Knoxville',        stateCode: 'TN', lat: 35.9623,   lng: -83.9171 },
  { city: 'Corpus Christi',   stateCode: 'TX', lat: 27.8034,   lng: -97.3973 },
  { city: 'El Paso',          stateCode: 'TX', lat: 31.7594,   lng: -106.4881 },
  { city: 'Fort Worth',       stateCode: 'TX', lat: 32.7411,   lng: -97.3685 },
  { city: 'Lubbock',          stateCode: 'TX', lat: 33.5838,   lng: -101.8403 },
  { city: 'Charlottesville',  stateCode: 'VA', lat: 38.0307,   lng: -78.4813 },
  { city: 'Norfolk',          stateCode: 'VA', lat: 36.8517,   lng: -76.2873 },
  { city: 'Virginia Beach',   stateCode: 'VA', lat: 36.8475,   lng: -76.0194 },
  { city: 'Burlington',       stateCode: 'VT', lat: 44.4772,   lng: -73.2223 },
  { city: 'Bellingham',       stateCode: 'WA', lat: 48.7531,   lng: -122.5024 },
  { city: 'Spokane',          stateCode: 'WA', lat: 47.6568,   lng: -117.426 },
  { city: 'Tacoma',           stateCode: 'WA', lat: 47.2549,   lng: -122.4415 },
  { city: 'Green Bay',        stateCode: 'WI', lat: 44.4949,   lng: -88.0696 },
  { city: 'Madison',          stateCode: 'WI', lat: 43.0809,   lng: -89.3746 },

  // Canada. lib/geo.ts's bounding box still never crosses the antimeridian
  // with these, so the no-wraparound assumption there holds.
  { city: 'Calgary',          stateCode: 'AB', countryCode: 'CA', lat: 51.0436,   lng: -114.0767 },
  { city: 'Edmonton',         stateCode: 'AB', countryCode: 'CA', lat: 53.5403,   lng: -113.4966 },
  { city: 'Vancouver',        stateCode: 'BC', countryCode: 'CA', lat: 49.2777,   lng: -123.1127 },
  { city: 'Victoria',         stateCode: 'BC', countryCode: 'CA', lat: 48.4235,   lng: -123.3651 },
  { city: 'Winnipeg',         stateCode: 'MB', countryCode: 'CA', lat: 49.8623,   lng: -97.1317 },
  { city: 'Halifax',          stateCode: 'NS', countryCode: 'CA', lat: 44.6528,   lng: -63.5759 },
  { city: 'Hamilton',         stateCode: 'ON', countryCode: 'CA', lat: 43.2562,   lng: -79.8725 },
  { city: 'London',           stateCode: 'ON', countryCode: 'CA', lat: 42.9892,   lng: -81.2497 },
  { city: 'Ottawa',           stateCode: 'ON', countryCode: 'CA', lat: 45.4262,   lng: -75.6938 },
  { city: 'Toronto',          stateCode: 'ON', countryCode: 'CA', lat: 43.6469,   lng: -79.379 },
  { city: 'Montreal',         stateCode: 'QC', countryCode: 'CA', lat: 45.5105,   lng: -73.5634 },
  { city: 'Quebec',           stateCode: 'QC', countryCode: 'CA', lat: 46.8133,   lng: -71.2142 },
]

// ── Beyond the 148 ───────────────────────────────────────────────────────────
// Used only by the sweep job (app/api/cron/sync-sweep), never by sync-shows,
// whose time budget has no room for them (see its header). Everything above
// is asked about by name and by a 25-mile radius around the centre, so a venue
// in a town on nobody's list and farther than that from every centre was never
// asked about. These are the ones that audit (docs/show-coverage-audit.md,
// gap 4) found by geography: markets with no entry, and rooms and festival
// grounds well outside the nearest one (Coachella, The Gorge, Bethel Woods,
// Foxwoods, Mohegan Sun, Jiffy Lube Live).
//
// Unlike the list above, the centres here are civic centres, not the median of
// real venue coordinates (that needs Ticketmaster's data, which wasn't
// available when these were added), and the names are unchecked against how
// Ticketmaster spells them. A city that returns nothing is logged as
// `emptyProbes` in the job's report; the radius pass still covers it.
export const EXTRA_CITIES: SyncCity[] = [
  // Markets with no entry
  { city: 'Myrtle Beach',   stateCode: 'SC', lat: 33.6891, lng: -78.8867 },
  { city: 'Greensboro',     stateCode: 'NC', lat: 36.0726, lng: -79.7920 },
  { city: 'Winston-Salem',  stateCode: 'NC', lat: 36.0999, lng: -80.2442 },
  { city: 'Lincoln',        stateCode: 'NE', lat: 40.8136, lng: -96.7026 },
  { city: 'Tallahassee',    stateCode: 'FL', lat: 30.4383, lng: -84.2807 },
  { city: 'Pensacola',      stateCode: 'FL', lat: 30.4213, lng: -87.2169 },
  { city: 'Fort Myers',     stateCode: 'FL', lat: 26.6406, lng: -81.8723 },
  { city: 'Sarasota',       stateCode: 'FL', lat: 27.3364, lng: -82.5307 },
  { city: 'Mobile',         stateCode: 'AL', lat: 30.6954, lng: -88.0399 },
  { city: 'Huntsville',     stateCode: 'AL', lat: 34.7304, lng: -86.5861 },
  { city: 'Shreveport',     stateCode: 'LA', lat: 32.5252, lng: -93.7502 },
  { city: 'Lansing',        stateCode: 'MI', lat: 42.7325, lng: -84.5555 },
  { city: 'Fort Wayne',     stateCode: 'IN', lat: 41.0793, lng: -85.1394 },
  { city: 'South Bend',     stateCode: 'IN', lat: 41.6764, lng: -86.2520 },
  { city: 'Cedar Rapids',   stateCode: 'IA', lat: 41.9779, lng: -91.6656 },
  { city: 'Davenport',      stateCode: 'IA', lat: 41.5236, lng: -90.5776 },
  { city: 'Peoria',         stateCode: 'IL', lat: 40.6936, lng: -89.5890 },
  { city: 'Worcester',      stateCode: 'MA', lat: 42.2626, lng: -71.8023 },
  { city: 'Springfield',    stateCode: 'MA', lat: 42.1015, lng: -72.5898 },
  { city: 'Lancaster',      stateCode: 'PA', lat: 40.0379, lng: -76.3055 },
  { city: 'Erie',           stateCode: 'PA', lat: 42.1292, lng: -80.0851 },
  { city: 'Binghamton',     stateCode: 'NY', lat: 42.0987, lng: -75.9180 },
  { city: 'Santa Fe',       stateCode: 'NM', lat: 35.6870, lng: -105.9378 },
  { city: 'Waco',           stateCode: 'TX', lat: 31.5493, lng: -97.1467 },
  { city: 'McAllen',        stateCode: 'TX', lat: 26.2034, lng: -98.2300 },
  { city: 'Bakersfield',    stateCode: 'CA', lat: 35.3733, lng: -119.0187 },
  { city: 'Stockton',       stateCode: 'CA', lat: 37.9577, lng: -121.2908 },
  { city: 'Modesto',        stateCode: 'CA', lat: 37.6391, lng: -120.9969 },
  { city: 'Ventura',        stateCode: 'CA', lat: 34.2746, lng: -119.2290 },
  { city: 'Salem',          stateCode: 'OR', lat: 44.9429, lng: -123.0351 },
  { city: 'Billings',       stateCode: 'MT', lat: 45.7833, lng: -108.5007 },
  { city: 'Cheyenne',       stateCode: 'WY', lat: 41.1400, lng: -104.8202 },
  // Destinations well outside the nearest metro
  { city: 'Indio',          stateCode: 'CA', lat: 33.7206, lng: -116.2156 },
  { city: 'George',         stateCode: 'WA', lat: 47.1008, lng: -119.9959 },
  { city: 'Bethel',         stateCode: 'NY', lat: 41.6959, lng: -74.8795 },
  { city: 'Uncasville',     stateCode: 'CT', lat: 41.4343, lng: -72.1090 },
  { city: 'Mashantucket',   stateCode: 'CT', lat: 41.4720, lng: -71.9610 },
  { city: 'Temecula',       stateCode: 'CA', lat: 33.4936, lng: -117.1484 },
  { city: 'Napa',           stateCode: 'CA', lat: 38.2975, lng: -122.2869 },
  { city: 'Bristow',        stateCode: 'VA', lat: 38.7237, lng: -77.5392 },
  { city: 'The Woodlands',  stateCode: 'TX', lat: 30.1658, lng: -95.4613 },
  // Canada
  { city: 'Saskatoon',      stateCode: 'SK', countryCode: 'CA', lat: 52.1332, lng: -106.6700 },
  { city: 'Regina',         stateCode: 'SK', countryCode: 'CA', lat: 50.4452, lng: -104.6189 },
  { city: 'Kitchener',      stateCode: 'ON', countryCode: 'CA', lat: 43.4516, lng: -80.4925 },
  { city: 'Kelowna',        stateCode: 'BC', countryCode: 'CA', lat: 49.8880, lng: -119.4960 },
  { city: "St. John's",     stateCode: 'NL', countryCode: 'CA', lat: 47.5615, lng: -52.7126 },
]

// Every state and province, for the sweep's "all music events whose venue is
// in this state" question, which needs no city and no coordinates and so
// catches any venue the lists above missed, including ones Ticketmaster lists
// without a location. Ordered by size, so that taking every third entry
// (SWEEP_GROUPS) gives three roughly equal nights.
export interface SweepRegion { stateCode: string; countryCode: 'US' | 'CA' }

const us = (stateCode: string): SweepRegion => ({ stateCode, countryCode: 'US' })
const ca = (stateCode: string): SweepRegion => ({ stateCode, countryCode: 'CA' })

export const SWEEP_REGIONS: SweepRegion[] = [
  us('CA'), us('TX'), us('FL'), us('NY'), us('PA'), us('IL'), us('OH'), us('GA'), us('NC'), us('MI'),
  ca('ON'), us('NJ'), us('VA'), us('WA'), us('AZ'), us('MA'), us('TN'), us('IN'), us('MO'), us('MD'),
  us('WI'), us('CO'), us('MN'), us('SC'), us('AL'), us('LA'), us('KY'), us('OR'), us('OK'), us('CT'),
  ca('QC'), ca('BC'), ca('AB'), us('UT'), us('IA'), us('NV'), us('AR'), us('MS'), us('KS'), us('NM'),
  us('NE'), us('ID'), us('WV'), us('HI'), us('NH'), us('ME'), us('MT'), us('RI'), us('DE'), us('SD'),
  us('ND'), us('AK'), us('DC'), us('VT'), us('WY'), ca('MB'), ca('SK'), ca('NS'), ca('NB'), ca('NL'), ca('PE'),
]

// The sweep does one group a night, so every region is seen every
// SWEEP_GROUPS nights. Three because a saved-show reminder treats a
// Ticketmaster row not seen for more than three days before its date as
// probably cancelled (lib/savedShows.ts, CANCELLED_AFTER_DAYS), and a row only
// the sweep sees is refreshed no more often than this. Make it longer and
// real shows would be flagged as cancelled.
export const SWEEP_GROUPS = 3
