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
]
