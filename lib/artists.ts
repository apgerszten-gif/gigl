// lib/artists.ts
// Coachella 2026 — full lineup with stage and day
// Sources: official set times via Goldenvoice / Timeout LA
// Stages: Coachella Stage, Outdoor Theatre, Mojave, Gobi, Sonora, Sahara, Yuma, Quasar, Do LaB, Heineken House, Croquet Afters
// Days: friday | saturday | sunday

export type Stage =
  | "Coachella Stage"
  | "Outdoor Theatre"
  | "Mojave"
  | "Gobi"
  | "Sonora"
  | "Sahara"
  | "Yuma"
  | "Quasar"
  | "Do LaB"
  | "Heineken House"
  | "Croquet Afters";

export type Day = "friday" | "saturday" | "sunday";

export interface Artist {
  id: string;
  name: string;
  stage: Stage;
  day: Day;
  headliner?: boolean;
  startTime?: string;
}

export const ARTISTS: Artist[] = [
  // ─── FRIDAY ──────────────────────────────────────────────────────────────

  // Coachella Stage
  { id: "sabrina-carpenter", name: "Sabrina Carpenter", stage: "Coachella Stage", day: "friday", headliner: true },
  { id: "the-xx", name: "The xx", stage: "Coachella Stage", day: "friday" },
  { id: "teddy-swims", name: "Teddy Swims", stage: "Coachella Stage", day: "friday" },
  { id: "anyma", name: "Anyma", stage: "Coachella Stage", day: "friday", headliner: true },

  // Outdoor Theatre
  { id: "disclosure", name: "Disclosure", stage: "Outdoor Theatre", day: "friday" },
  { id: "turnstile", name: "Turnstile", stage: "Outdoor Theatre", day: "friday" },
  { id: "lykke-li", name: "Lykke Li", stage: "Outdoor Theatre", day: "friday" },
  { id: "dijon", name: "Dijon", stage: "Outdoor Theatre", day: "friday" },
  { id: "dabeull", name: "Dabeull", stage: "Outdoor Theatre", day: "friday" },

  // Mojave
  { id: "ethel-cain", name: "Ethel Cain", stage: "Mojave", day: "friday" },
  { id: "blood-orange", name: "Blood Orange", stage: "Mojave", day: "friday" },
  { id: "moby", name: "Moby", stage: "Mojave", day: "friday" },
  { id: "devo", name: "Devo", stage: "Mojave", day: "friday" },
  { id: "central-cee", name: "Central Cee", stage: "Mojave", day: "friday" },
  { id: "bini", name: "BINI", stage: "Mojave", day: "friday" },
  { id: "slayyyter", name: "Slayyyter", stage: "Mojave", day: "friday" },

  // Gobi
  { id: "creepy-nuts", name: "Creepy Nuts", stage: "Gobi", day: "friday" },
  { id: "joost", name: "Joost", stage: "Gobi", day: "friday" },
  { id: "holly-humberstone", name: "Holly Humberstone", stage: "Gobi", day: "friday" },
  { id: "fakemink", name: "fakemink", stage: "Gobi", day: "friday" },
  { id: "cmat", name: "CMAT", stage: "Gobi", day: "friday" },
  { id: "joyce-manor", name: "Joyce Manor", stage: "Gobi", day: "friday" },
  { id: "newdad", name: "NewDad", stage: "Gobi", day: "friday" },
  { id: "bob-baker-marionettes", name: "Bob Baker Marionettes", stage: "Gobi", day: "friday" },

  // Sonora
  { id: "hot-mulligan", name: "Hot Mulligan", stage: "Sonora", day: "friday" },
  { id: "cachirula-loojan", name: "Cachirula & Loojan", stage: "Sonora", day: "friday" },
  { id: "ninajirachi", name: "Ninajirachi", stage: "Sonora", day: "friday" },
  { id: "the-two-lips", name: "The Two Lips", stage: "Sonora", day: "friday" },
  { id: "fleshwater", name: "Fleshwater", stage: "Sonora", day: "friday" },
  { id: "wednesday", name: "Wednesday", stage: "Sonora", day: "friday" },
  { id: "carolina-durante", name: "Carolina Durante", stage: "Sonora", day: "friday" },
  { id: "febuary", name: "Febuary", stage: "Sonora", day: "friday" },

  // Sahara
  { id: "sexyy-red", name: "Sexyy Red", stage: "Sahara", day: "friday" },
  { id: "swae-lee", name: "Swae Lee", stage: "Sahara", day: "friday" },
  { id: "levity", name: "Levity", stage: "Sahara", day: "friday" },
  { id: "katseye", name: "KATSEYE", stage: "Sahara", day: "friday" },
  { id: "marlon-hoffstadt", name: "Marlon Hoffstadt", stage: "Sahara", day: "friday" },
  { id: "hugel", name: "HUGEL", stage: "Sahara", day: "friday" },
  { id: "youna", name: "Youna", stage: "Sahara", day: "friday" },

  // Yuma
  { id: "gordo", name: "Gordo", stage: "Yuma", day: "friday" },
  { id: "max-styler", name: "Max Styler", stage: "Yuma", day: "friday" },
  { id: "max-dean-luke-dean", name: "Max Dean x Luke Dean", stage: "Yuma", day: "friday" },
  { id: "prospa", name: "Prospa", stage: "Yuma", day: "friday" },
  { id: "kettama", name: "Kettama", stage: "Yuma", day: "friday" },
  { id: "chloe-caillet-rossi", name: "Chloé Caillet x Rossi.", stage: "Yuma", day: "friday" },
  { id: "groove-armada", name: "Groove Armada", stage: "Yuma", day: "friday" },
  { id: "arodes", name: "Arodes", stage: "Yuma", day: "friday" },
  { id: "jessica-brankka", name: "Jessica Brankka", stage: "Yuma", day: "friday" },
  { id: "sahar-z", name: "Sahar Z", stage: "Yuma", day: "friday" },

  // Quasar
  { id: "pawsa", name: "PAWSA", stage: "Quasar", day: "friday" },
  { id: "deep-dish", name: "Deep Dish", stage: "Quasar", day: "friday" },

  // Do LaB — Friday (Weekend 1)
  { id: "andy-c", name: "Andy C", stage: "Do LaB", day: "friday" },
  { id: "jigitz", name: "Jigitz", stage: "Do LaB", day: "friday" },
  { id: "effin", name: "Effin", stage: "Do LaB", day: "friday" },
  { id: "jazzy-fri", name: "Jazzy", stage: "Do LaB", day: "friday" },
  { id: "mcr-t", name: "MCR-T", stage: "Do LaB", day: "friday" },
  { id: "bullet-tooth", name: "Bullet Tooth", stage: "Do LaB", day: "friday" },
  { id: "1tbsp", name: "1tbsp", stage: "Do LaB", day: "friday" },
  { id: "fifi", name: "Fifi", stage: "Do LaB", day: "friday" },

  // ─── SATURDAY ────────────────────────────────────────────────────────────

  // Coachella Stage
  { id: "justin-bieber", name: "Justin Bieber", stage: "Coachella Stage", day: "saturday", headliner: true },
  { id: "the-strokes", name: "The Strokes", stage: "Coachella Stage", day: "saturday" },
  { id: "giveon", name: "GIVĒON", stage: "Coachella Stage", day: "saturday" },
  { id: "addison-rae", name: "Addison Rae", stage: "Coachella Stage", day: "saturday" },

  // Outdoor Theatre
  { id: "david-byrne", name: "David Byrne", stage: "Outdoor Theatre", day: "saturday" },
  { id: "labrinth", name: "Labrinth", stage: "Outdoor Theatre", day: "saturday" },
  { id: "sombr", name: "SOMBR", stage: "Outdoor Theatre", day: "saturday" },
  { id: "alex-g", name: "Alex G", stage: "Outdoor Theatre", day: "saturday" },
  { id: "los-hermanos-flores", name: "Los Hermanos Flores", stage: "Outdoor Theatre", day: "saturday" },
  { id: "blondshell", name: "Blondshell", stage: "Outdoor Theatre", day: "saturday" },

  // Mojave
  { id: "interpol", name: "Interpol", stage: "Mojave", day: "saturday" },
  { id: "pinkpantheress", name: "PinkPantheress", stage: "Mojave", day: "saturday" },
  { id: "taemin", name: "Taemin", stage: "Mojave", day: "saturday" },
  { id: "royel-otis", name: "Royel Otis", stage: "Mojave", day: "saturday" },
  { id: "fujii-kaze", name: "Fujii Kaze", stage: "Mojave", day: "saturday" },
  { id: "jack-white", name: "Jack White", stage: "Mojave", day: "saturday" },
  { id: "kacey-musgraves", name: "Kacey Musgraves", stage: "Mojave", day: "saturday" },

  // Gobi
  { id: "morat", name: "Morat", stage: "Gobi", day: "saturday" },
  { id: "bia", name: "BIA", stage: "Gobi", day: "saturday" },
  { id: "davido", name: "Davido", stage: "Gobi", day: "saturday" },
  { id: "luisa-sonza", name: "Luísa Sonza", stage: "Gobi", day: "saturday" },
  { id: "geese", name: "Geese", stage: "Gobi", day: "saturday" },
  { id: "whatmore", name: "WHATMORE", stage: "Gobi", day: "saturday" },
  { id: "noga-erez", name: "Noga Erez", stage: "Gobi", day: "saturday" },

  // Sonora
  { id: "mind-enterprises", name: "Mind Enterprises", stage: "Sonora", day: "saturday" },
  { id: "54-ultra", name: "54 Ultra", stage: "Sonora", day: "saturday" },
  { id: "rusowsky", name: "rusowsky", stage: "Sonora", day: "saturday" },
  { id: "ceremony", name: "Ceremony", stage: "Sonora", day: "saturday" },
  { id: "ecca-vandal", name: "Ecca Vandal", stage: "Sonora", day: "saturday" },
  { id: "freak-slug", name: "Freak Slug", stage: "Sonora", day: "saturday" },
  { id: "die-spitz", name: "Die Spitz", stage: "Sonora", day: "saturday" },
  { id: "buster-jarvis", name: "Buster Jarvis", stage: "Sonora", day: "saturday" },

  // Sahara
  { id: "adriatique", name: "Adriatique", stage: "Sahara", day: "saturday" },
  { id: "worship", name: "Worship", stage: "Sahara", day: "saturday" },
  { id: "nine-inch-noize", name: "Nine Inch Noize", stage: "Sahara", day: "saturday" },
  { id: "yusuke-yukimatsu", name: "¥ØU$UK€ ¥UK1MAT$U", stage: "Sahara", day: "saturday" },
  { id: "hamdi", name: "Hamdi", stage: "Sahara", day: "saturday" },
  { id: "zulan", name: "ZULAN", stage: "Sahara", day: "saturday" },
  { id: "teed", name: "TEED", stage: "Sahara", day: "saturday" },
  { id: "fundido", name: "Fundido", stage: "Sahara", day: "saturday" },

  // Yuma
  { id: "armin-van-buuren-adam-beyer", name: "Armin van Buuren × Adam Beyer", stage: "Yuma", day: "saturday" },
  { id: "boys-noize", name: "Boys Noize", stage: "Yuma", day: "saturday" },
  { id: "bedouin", name: "Bedouin", stage: "Yuma", day: "saturday" },
  { id: "sosa", name: "SOSA", stage: "Yuma", day: "saturday" },
  { id: "ben-sterling", name: "Ben Sterling", stage: "Yuma", day: "saturday" },
  { id: "mahmut-orhan", name: "Mahmut Orhan", stage: "Yuma", day: "saturday" },
  { id: "riordan", name: "Riordan", stage: "Yuma", day: "saturday" },
  { id: "genesi", name: "GENESI", stage: "Yuma", day: "saturday" },
  { id: "yamagucci", name: "Yamagucci", stage: "Yuma", day: "saturday" },

  // Quasar
  { id: "david-guetta", name: "David Guetta", stage: "Quasar", day: "saturday" },
  { id: "afrojack-shimza", name: "Afrojack x Shimza", stage: "Quasar", day: "saturday" },

  // Do LaB — Saturday (Weekend 2)
  { id: "dolab-aeon-mode-b2b-blossom", name: "ÆON:MODE B2B Blossom", stage: "Do LaB", day: "saturday" },
  { id: "dolab-after-midnight", name: "AFTER MIDNIGHT (Matroda x San Pacho)", stage: "Do LaB", day: "saturday" },
  { id: "dolab-alex-chapman-b2b-zoe-gitter", name: "Alex Chapman B2B Zoe Gitter", stage: "Do LaB", day: "saturday" },
  { id: "dolab-alisha", name: "Alisha", stage: "Do LaB", day: "saturday" },
  { id: "dolab-ape-drums-b2b-bontan", name: "Ape Drums B2B Bontan", stage: "Do LaB", day: "saturday" },
  { id: "dolab-arthi", name: "Arthi", stage: "Do LaB", day: "saturday" },
  { id: "dolab-brothers-macklovitch", name: "The Brothers Macklovitch (A-Trak & Dave1)", stage: "Do LaB", day: "saturday" },
  { id: "dolab-champion", name: "Champion", stage: "Do LaB", day: "saturday" },
  { id: "dolab-cquestt", name: "CQuestt", stage: "Do LaB", day: "saturday" },
  { id: "dolab-dj-habibeats-b2b-zeemuffin", name: "DJ Habibeats B2B Zeemuffin", stage: "Do LaB", day: "saturday" },
  { id: "dolab-drama", name: "Drama (DJ Set)", stage: "Do LaB", day: "saturday" },
  { id: "dolab-eliza-rose", name: "Eliza Rose", stage: "Do LaB", day: "saturday" },
  { id: "dolab-gudfella", name: "Gudfella", stage: "Do LaB", day: "saturday" },
  { id: "dolab-level-up-b2b-mary-droppinz", name: "Level Up B2B Mary Droppinz", stage: "Do LaB", day: "saturday" },
  { id: "dolab-lyny", name: "LYNY", stage: "Do LaB", day: "saturday" },
  { id: "dolab-maxi-meraki", name: "Maxi Meraki", stage: "Do LaB", day: "saturday" },
  { id: "dolab-natascha-polke", name: "Natascha Polké", stage: "Do LaB", day: "saturday" },
  { id: "dolab-neumonic", name: "Neumonic", stage: "Do LaB", day: "saturday" },
  { id: "dolab-patricio", name: "Patricio", stage: "Do LaB", day: "saturday" },
  { id: "dolab-sam-alfred", name: "Sam Alfred", stage: "Do LaB", day: "saturday" },
  { id: "dolab-sam-binga-b2b-jia", name: "Sam Binga B2B Jia", stage: "Do LaB", day: "saturday" },

  // ─── SUNDAY ──────────────────────────────────────────────────────────────

  // Coachella Stage
  { id: "karol-g", name: "KAROL G", stage: "Coachella Stage", day: "sunday", headliner: true },
  { id: "young-thug", name: "Young Thug", stage: "Coachella Stage", day: "sunday" },
  { id: "major-lazer", name: "Major Lazer", stage: "Coachella Stage", day: "sunday" },
  { id: "wet-leg", name: "Wet Leg", stage: "Coachella Stage", day: "sunday" },

  // Outdoor Theatre
  { id: "bigbang", name: "BIGBANG", stage: "Outdoor Theatre", day: "sunday" },
  { id: "laufey", name: "Laufey", stage: "Outdoor Theatre", day: "sunday" },
  { id: "foster-the-people", name: "Foster the People", stage: "Outdoor Theatre", day: "sunday" },
  { id: "clipse", name: "Clipse", stage: "Outdoor Theatre", day: "sunday" },
  { id: "gigi-perez", name: "Gigi Perez", stage: "Outdoor Theatre", day: "sunday" },

  // Mojave
  { id: "fka-twigs", name: "FKA twigs", stage: "Mojave", day: "sunday" },
  { id: "iggy-pop", name: "Iggy Pop", stage: "Mojave", day: "sunday" },
  { id: "suicidal-tendencies", name: "Suicidal Tendencies", stage: "Mojave", day: "sunday" },
  { id: "little-simz", name: "Little Simz", stage: "Mojave", day: "sunday" },
  { id: "samia", name: "Samia", stage: "Mojave", day: "sunday" },

  // Gobi
  { id: "the-rapture", name: "The Rapture", stage: "Gobi", day: "sunday" },
  { id: "tomora", name: "TOMORA", stage: "Gobi", day: "sunday" },
  { id: "black-flag", name: "Black Flag", stage: "Gobi", day: "sunday" },
  { id: "oklou", name: "Oklou", stage: "Gobi", day: "sunday" },
  { id: "cobrah", name: "COBRAH", stage: "Gobi", day: "sunday" },
  { id: "the-chats", name: "The Chats", stage: "Gobi", day: "sunday" },
  { id: "flowerovlove", name: "flowerovlove", stage: "Gobi", day: "sunday" },

  // Sonora
  { id: "french-police", name: "French Police", stage: "Sonora", day: "sunday" },
  { id: "drain", name: "DRAIN", stage: "Sonora", day: "sunday" },
  { id: "roz", name: "RØZ", stage: "Sonora", day: "sunday" },
  { id: "los-retros", name: "Los Retros", stage: "Sonora", day: "sunday" },
  { id: "jane-remover", name: "Jane Remover", stage: "Sonora", day: "sunday" },
  { id: "model-actriz", name: "Model/Actriz", stage: "Sonora", day: "sunday" },
  { id: "glitterer", name: "Glitterer", stage: "Sonora", day: "sunday" },

  // Sahara
  { id: "kaskade", name: "Kaskade", stage: "Sahara", day: "sunday" },
  { id: "subtronics", name: "Subtronics", stage: "Sahara", day: "sunday" },
  { id: "mochakk", name: "Mochakk", stage: "Sahara", day: "sunday" },
  { id: "duke-dumont", name: "Duke Dumont", stage: "Sahara", day: "sunday" },
  { id: "bunt", name: "BUNT.", stage: "Sahara", day: "sunday" },

  // Yuma
  { id: "green-velvet-ayybo", name: "Green Velvet × AYYBO", stage: "Yuma", day: "sunday" },
  { id: "whomadewho", name: "WhoMadeWho", stage: "Yuma", day: "sunday" },
  { id: "royksopp", name: "Röyksopp", stage: "Yuma", day: "sunday" },
  { id: "carlita-josh-baker", name: "Carlita x Josh Baker", stage: "Yuma", day: "sunday" },
  { id: "mestiza", name: "MËSTIZA", stage: "Yuma", day: "sunday" },
  { id: "and-friends", name: "&friends", stage: "Yuma", day: "sunday" },
  { id: "azzecca", name: "AZZECCA", stage: "Yuma", day: "sunday" },
  { id: "le-yora", name: "LE YORA", stage: "Yuma", day: "sunday" },

  // Quasar
  { id: "fatboy-slim", name: "Fatboy Slim", stage: "Quasar", day: "sunday" },

  // Do LaB — Sunday (Weekend 1)
  { id: "whethan", name: "Whethan", stage: "Do LaB", day: "sunday" },
  { id: "omnom", name: "OMNOM", stage: "Do LaB", day: "sunday" },
  { id: "omar-plus", name: "OMAR+", stage: "Do LaB", day: "sunday" },
  { id: "deer-jade", name: "Deer Jade", stage: "Do LaB", day: "sunday" },
  { id: "poolside-daytime-disco", name: "Poolside's Daytime Disco", stage: "Do LaB", day: "sunday" },
  { id: "brunello", name: "Brunello", stage: "Do LaB", day: "sunday" },
  { id: "jackie-hollander", name: "Jackie Hollander", stage: "Do LaB", day: "sunday" },
  { id: "cincity", name: "Cincity", stage: "Do LaB", day: "sunday" },
  { id: "soul-purpose", name: "Soul Purpose", stage: "Do LaB", day: "sunday" },

  // ─── HEINEKEN HOUSE ───────────────────────────────────────────────────────
  { id: "coi-leray", name: "Coi Leray", stage: "Heineken House", day: "saturday" },
  { id: "wale", name: "Wale", stage: "Heineken House", day: "friday" },
  { id: "less-than-jake", name: "Less Than Jake", stage: "Heineken House", day: "saturday" },
  { id: "motion-city-soundtrack", name: "Motion City Soundtrack", stage: "Heineken House", day: "sunday" },
  { id: "robin-schulz", name: "Robin Schulz", stage: "Heineken House", day: "friday" },
  { id: "sean-paul", name: "Sean Paul", stage: "Heineken House", day: "saturday" },
  { id: "sander-kleinenberg", name: "Sander Kleinenberg", stage: "Heineken House", day: "sunday" },
  { id: "zerb", name: "Zerb", stage: "Heineken House", day: "friday" },
  { id: "niiko-x-swae", name: "Niiko X Swae", stage: "Heineken House", day: "saturday" },

  // ─── CROQUET AFTERS ──────────────────────────────────────────────────────
  { id: "gertrude-b2b-civalized", name: "Gertrude B2B Civalized", stage: "Croquet Afters", day: "saturday" },
];

// Helper: get artists by day
export const getArtistsByDay = (day: Day) =>
  ARTISTS.filter((a) => a.day === day);

// Helper: get artists by stage
export const getArtistsByStage = (stage: Stage) =>
  ARTISTS.filter((a) => a.stage === stage);

// Helper: search artists by name (case-insensitive)
export const searchArtists = (query: string) => {
  const q = query.toLowerCase();
  return ARTISTS.filter((a) => a.name.toLowerCase().includes(q));
};

// Helper: get artist by id
export const getArtistById = (id: string) =>
  ARTISTS.find((a) => a.id === id) ?? null;

export const STAGES: Stage[] = [
  "Coachella Stage",
  "Outdoor Theatre",
  "Mojave",
  "Gobi",
  "Sonora",
  "Sahara",
  "Yuma",
  "Quasar",
  "Do LaB",
  "Heineken House",
  "Croquet Afters",
];

export const DAYS: Day[] = ["friday", "saturday", "sunday"];

// Legacy exports for backwards compatibility
export const ARTISTS_BY_DAY: Record<Day, Artist[]> = {
  friday: ARTISTS.filter((a) => a.day === "friday"),
  saturday: ARTISTS.filter((a) => a.day === "saturday"),
  sunday: ARTISTS.filter((a) => a.day === "sunday"),
};

export const DAY_DATES: Record<Day, string> = {
  friday: "April 17",
  saturday: "April 18",
  sunday: "April 19",
};
