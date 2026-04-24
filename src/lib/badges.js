// Ten Miles Ahead - Badge Gamification System
// Badge definitions, lookup data, and evaluation engine

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const norm = (s) => (s || '').toLowerCase().trim();

const isUSA = (country) => {
  const c = norm(country);
  return (
    c === 'united states' ||
    c === 'usa' ||
    c === 'us' ||
    c === 'united states of america'
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY DEFINITIONS  (PDF order)
// ─────────────────────────────────────────────────────────────────────────────

export const BADGE_CATEGORIES = [
  {
    id: 'miles_traveled',
    name: 'Miles Traveled',
    color: '#2d7d46',
    lightColor: '#3da85e',
    tiered: true,
  },
  {
    id: 'states_visited',
    name: 'States Visited',
    color: '#7b2d8b',
    lightColor: '#9a3daa',
    tiered: true,
  },
  {
    id: 'countries_visited',
    name: 'Countries Visited',
    color: '#3a9bc4',
    lightColor: '#5ab4d4',
    tiered: true,
  },
  {
    id: 'first_time_milestones',
    name: 'First-Time Milestones',
    color: '#d63b2a',
    lightColor: '#e05c4b',
    tiered: false,
  },
  {
    id: 'distance_mileage',
    name: 'Distance & Mileage Achievement',
    color: '#b8a000',
    lightColor: '#d4bc00',
    tiered: false,
  },
  {
    id: 'destination_based',
    name: 'Destination-Based Achievements',
    color: '#16a085',
    lightColor: '#1abc9c',
    tiered: false,
  },
  {
    id: 'frequency_streak',
    name: 'Frequency & Streak Achievements',
    color: '#148f80',
    lightColor: '#1abc9c',
    tiered: false,
  },
  {
    id: 'timing_seasonal',
    name: 'Timing & Seasonal Achievements',
    color: '#c0570a',
    lightColor: '#e8743b',
    tiered: false,
  },
  {
    id: 'wonders',
    name: 'Modern 7 Wonders of the World',
    color: '#1e3a6e',
    lightColor: '#2a4e94',
    tiered: false,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TIER CONFIGS
// ─────────────────────────────────────────────────────────────────────────────

export const TIERS = [
  { id: 'bronze',   name: 'Bronze',   color: '#cd7f32', textColor: '#fff' },
  { id: 'silver',   name: 'Silver',   color: '#a8a9ad', textColor: '#fff' },
  { id: 'gold',     name: 'Gold',     color: '#d4af37', textColor: '#fff' },
  { id: 'platinum', name: 'Platinum', color: '#7fa8c9', textColor: '#fff' },
  { id: 'diamond',  name: 'Diamond',  color: '#72d8f0', textColor: '#1a1a1a' },
  { id: 'titan',    name: 'Titan',    color: '#00bfff', textColor: '#1a1a1a' },
];

export const getTier = (id) => TIERS.find((t) => t.id === id);

// ─────────────────────────────────────────────────────────────────────────────
// BADGE DEFINITIONS
// ─────────────────────────────────────────────────────────────────────────────

export const ALL_BADGES = [
  // ── Miles Traveled (tiered) ──────────────────────────────────────────────
  { id: 'miles_bronze',   categoryId: 'miles_traveled', tierId: 'bronze',   name: 'Bronze',   description: '1,000+ miles',    threshold: 1000   },
  { id: 'miles_silver',   categoryId: 'miles_traveled', tierId: 'silver',   name: 'Silver',   description: '5,000+ miles',    threshold: 5000   },
  { id: 'miles_gold',     categoryId: 'miles_traveled', tierId: 'gold',     name: 'Gold',     description: '15,000+ miles',   threshold: 15000  },
  { id: 'miles_platinum', categoryId: 'miles_traveled', tierId: 'platinum', name: 'Platinum', description: '30,000+ miles',   threshold: 30000  },
  { id: 'miles_diamond',  categoryId: 'miles_traveled', tierId: 'diamond',  name: 'Diamond',  description: '75,000+ miles',   threshold: 75000  },
  { id: 'miles_titan',    categoryId: 'miles_traveled', tierId: 'titan',    name: 'Titan',    description: '150,000+ miles',  threshold: 150000 },

  // ── States Visited (tiered) ───────────────────────────────────────────────
  { id: 'states_bronze',   categoryId: 'states_visited', tierId: 'bronze',   name: 'Bronze',   description: '3+ states visited',        threshold: 3  },
  { id: 'states_silver',   categoryId: 'states_visited', tierId: 'silver',   name: 'Silver',   description: '7+ states visited',        threshold: 7  },
  { id: 'states_gold',     categoryId: 'states_visited', tierId: 'gold',     name: 'Gold',     description: '12+ states visited',       threshold: 12 },
  { id: 'states_platinum', categoryId: 'states_visited', tierId: 'platinum', name: 'Platinum', description: '25+ states visited',       threshold: 25 },
  { id: 'states_diamond',  categoryId: 'states_visited', tierId: 'diamond',  name: 'Diamond',  description: '30+ states visited',       threshold: 30 },
  { id: 'states_titan',    categoryId: 'states_visited', tierId: 'titan',    name: 'Titan',    description: 'All 50 states visited',    threshold: 50 },

  // ── Countries Visited (tiered) ────────────────────────────────────────────
  { id: 'countries_bronze',   categoryId: 'countries_visited', tierId: 'bronze',   name: 'Bronze',   description: '2+ countries visited',  threshold: 2  },
  { id: 'countries_silver',   categoryId: 'countries_visited', tierId: 'silver',   name: 'Silver',   description: '5+ countries visited',  threshold: 5  },
  { id: 'countries_gold',     categoryId: 'countries_visited', tierId: 'gold',     name: 'Gold',     description: '8+ countries visited',  threshold: 8  },
  { id: 'countries_platinum', categoryId: 'countries_visited', tierId: 'platinum', name: 'Platinum', description: '12+ countries visited', threshold: 12 },
  { id: 'countries_diamond',  categoryId: 'countries_visited', tierId: 'diamond',  name: 'Diamond',  description: '30+ countries visited', threshold: 30 },
  { id: 'countries_titan',    categoryId: 'countries_visited', tierId: 'titan',    name: 'Titan',    description: '50+ countries visited', threshold: 50 },

  // ── First-Time Milestones ─────────────────────────────────────────────────
  { id: 'border_crosser',      categoryId: 'first_time_milestones', name: 'Border Crosser',          description: 'First time entering a new country',       emoji: '🛂' },
  { id: 'first_flight',        categoryId: 'first_time_milestones', name: 'First Flight',            description: 'First plane trip',                        emoji: '✈️' },
  { id: 'first_accommodation_stay', categoryId: 'first_time_milestones', name: 'First Accommodation Stay',description: 'First accommodation stay',                 emoji: '🏨' },
  { id: 'first_logged_trip',   categoryId: 'first_time_milestones', name: 'First Logged Trip',       description: 'First logged trip',                       emoji: '📝' },
  { id: 'road_trip_rookie',    categoryId: 'first_time_milestones', name: 'Road Trip Rookie',        description: 'First 100+ miles driven in a trip',       emoji: '🚗' },

  // ── Distance & Mileage Achievement ───────────────────────────────────────
  { id: 'distance_driver',      categoryId: 'distance_mileage', name: 'Distance Driver',      description: '300+ miles driven in a trip',    threshold: 300,  emoji: '🚗' },
  { id: 'long_haul_traveler',   categoryId: 'distance_mileage', name: 'Long Haul Traveler',   description: '750+ miles driven in a trip',    threshold: 750,  emoji: '🛣️' },
  { id: 'road_marathoner',      categoryId: 'distance_mileage', name: 'Road Marathoner',      description: '1,500+ miles driven in a trip',  threshold: 1500, emoji: '🏁' },
  { id: 'mileage_master',       categoryId: 'distance_mileage', name: 'Mileage Master',       description: '2,000+ miles driven in a trip',  threshold: 2000, emoji: '🏆' },
  { id: 'cross_country_cruiser',categoryId: 'distance_mileage', name: 'Cross Country Cruiser',description: '3,000+ miles driven in a trip',  threshold: 3000, emoji: '🗺️' },

  // ── Destination-Based Achievements ───────────────────────────────────────
  { id: 'capital_city_explorer', categoryId: 'destination_based', name: 'Capital City Explorer', description: 'National capital',                        emoji: '🏛️' },
  { id: 'city_breaker',          categoryId: 'destination_based', name: 'City Breaker',          description: 'City over 5 million population',          emoji: '🌆' },
  { id: 'cultural_explorer',     categoryId: 'destination_based', name: 'Cultural Explorer',     description: 'UNESCO World Heritage Site',              emoji: '🏺' },
  { id: 'island_hopper',         categoryId: 'destination_based', name: 'Island Hopper',         description: 'Island destination',                     emoji: '🏝️' },
  { id: 'waterfall_explorer',    categoryId: 'destination_based', name: 'Waterfall Explorer',    description: 'Trip to a waterfall destination',         emoji: '💧' },
  { id: 'nature_escape',         categoryId: 'destination_based', name: 'Nature Escape',         description: 'National park or protected area',         emoji: '🌲' },
  { id: 'new_year_new_places',   categoryId: 'destination_based', name: 'New Year New Places',   description: 'A trip in January',                       emoji: '🎆' },

  // ── Frequency & Streak Achievements ──────────────────────────────────────
  { id: 'weekend_wanderer',       categoryId: 'frequency_streak', name: 'Weekend Wanderer',       description: 'Trip under 72 hours',                              emoji: '📅' },
  { id: 'weekend_warrior',        categoryId: 'frequency_streak', name: 'Weekend Warrior',        description: '2 trips on back-to-back weekends',                 emoji: '⚔️' },
  { id: 'twelve_month_momentum',  categoryId: 'frequency_streak', name: '12 Month Momentum',      description: '1 trip each month for 12 months',                  emoji: '📆' },
  { id: 'seasonal_explorer',      categoryId: 'frequency_streak', name: 'Seasonal Explorer',      description: '1 trip in each season in a year',                  emoji: '🍂' },
  { id: 'annual_trailblazer',     categoryId: 'frequency_streak', name: 'Annual Trailblazer',     description: '5+ trips in one calendar year',                    emoji: '🗓️' },
  { id: 'anniversary_adventurer', categoryId: 'frequency_streak', name: 'Anniversary Adventurer', description: 'Trip on the same date two years in a row',         emoji: '🎉' },
  { id: 'frequent_flyer_month',   categoryId: 'frequency_streak', name: 'Frequent Flyer Month',   description: '3+ flights in one month',                          emoji: '✈️' },

  // ── Timing & Seasonal Achievements ───────────────────────────────────────
  { id: 'midweek_mover',   categoryId: 'timing_seasonal', name: 'Midweek Mover',   description: 'Trip starting on a Wednesday',              emoji: '📆' },
  { id: 'fall_explorer',   categoryId: 'timing_seasonal', name: 'Fall Explorer',   description: 'Trip between September to November',        emoji: '🍁' },
  { id: 'spring_breaker',  categoryId: 'timing_seasonal', name: 'Spring Breaker',  description: 'Trip in March or April',                    emoji: '🌸' },
  { id: 'summer_explorer', categoryId: 'timing_seasonal', name: 'Summer Explorer', description: '3 trips between June and August',           emoji: '☀️' },
  { id: 'winter_wanderer', categoryId: 'timing_seasonal', name: 'Winter Wanderer', description: 'Trip between December and February',        emoji: '❄️' },
  { id: 'holiday_traveler',categoryId: 'timing_seasonal', name: 'Holiday Traveler',description: 'Travel during a major holiday period',      emoji: '🎄' },

  // ── Modern 7 Wonders of the World ────────────────────────────────────────
  { id: 'great_wall_wanderer',     categoryId: 'wonders', name: 'Great Wall Wanderer',     description: 'Visit the Great Wall of China',           emoji: '🏯' },
  { id: 'petra_pathfinder',        categoryId: 'wonders', name: 'Petra Pathfinder',        description: 'Explore the ancient city of Petra',       emoji: '🏺' },
  { id: 'redeemer_ridge_visitor',  categoryId: 'wonders', name: 'Redeemer Ridge Visitor',  description: 'See Christ the Redeemer in Brazil',       emoji: '✝️' },
  { id: 'machu_picchu_explorer',   categoryId: 'wonders', name: 'Machu Picchu Explorer',   description: 'Visit the Incan citadel of Machu Picchu', emoji: '🏔️' },
  { id: 'chichen_itza_adventurer', categoryId: 'wonders', name: 'Chichen Itza Adventurer', description: 'Explore the ruins of Chichen Itza',       emoji: '🏛️' },
  { id: 'colosseum_challenger',    categoryId: 'wonders', name: 'Colosseum Challenger',    description: 'Visit the Roman Colosseum',               emoji: '🏟️' },
  { id: 'taj_mahal_traveler',      categoryId: 'wonders', name: 'Taj Mahal Traveler',      description: 'Experience the Taj Mahal in India',       emoji: '🕌' },
];

// ─────────────────────────────────────────────────────────────────────────────
// LOOKUP DATA
// ─────────────────────────────────────────────────────────────────────────────

// World capital cities (city name, normalised)
export const CAPITAL_CITIES = new Set([
  'kabul','tirana','algiers','andorra la vella','luanda','buenos aires',
  'yerevan','canberra','vienna','baku','nassau','manama','dhaka',
  'bridgetown','minsk','brussels','belmopan','porto-novo','thimphu',
  'sucre','la paz','sarajevo','gaborone','brasilia','brasília',
  'bandar seri begawan','sofia','ouagadougou','bujumbura','phnom penh',
  'yaounde','ottawa','praia','bangui','n\'djamena','santiago','beijing',
  'bogota','bogotá','moroni','kinshasa','brazzaville','san jose',
  'yamoussoukro','zagreb','havana','nicosia','prague','copenhagen',
  'djibouti city','djibouti','roseau','santo domingo','dili','quito',
  'cairo','san salvador','malabo','asmara','tallinn','addis ababa',
  'palikir','suva','helsinki','paris','libreville','banjul','tbilisi',
  'berlin','accra','athens','nuuk','guatemala city','conakry','bissau',
  'georgetown','port-au-prince','tegucigalpa','budapest','reykjavik',
  'new delhi','jakarta','tehran','baghdad','dublin','jerusalem','rome',
  'kingston','tokyo','amman','astana','nairobi','tarawa','pyongyang',
  'seoul','pristina','kuwait city','bishkek','vientiane','riga',
  'beirut','maseru','monrovia','tripoli','vaduz','vilnius','luxembourg',
  'skopje','antananarivo','lilongwe','kuala lumpur','male','bamako',
  'valletta','majuro','nouakchott','port louis','mexico city','chisinau',
  'monaco','ulaanbaatar','podgorica','rabat','maputo','windhoek',
  'yaren','kathmandu','amsterdam','the hague','wellington','managua',
  'niamey','abuja','oslo','muscat','islamabad','ngerulmud',
  'panama city','port moresby','asuncion','lima','manila','warsaw',
  'lisbon','bucharest','moscow','kigali','basseterre','castries',
  'kingstown','apia','san marino','sao tome','riyadh','dakar',
  'belgrade','freetown','bratislava','honiara','mogadishu','pretoria',
  'madrid','colombo','khartoum','paramaribo','mbabane','stockholm',
  'bern','damascus','taipei','dushanbe','dodoma','dar es salaam',
  'bangkok','lome','port of spain','tunis','ankara','ashgabat',
  'funafuti','kampala','kyiv','kiev','abu dhabi','london',
  'washington','washington dc','washington d.c.','tashkent',
  'port vila','caracas','hanoi','sanaa','sana\'a','lusaka','harare',
  'saint george\'s','nassau','nuku\'alofa','suva','tarawa',
]);

// Cities with 5 million+ population
export const LARGE_CITIES_5M = new Set([
  'tokyo','delhi','new delhi','shanghai','beijing','mumbai','bombay',
  'osaka','karachi','dhaka','kolkata','calcutta','tianjin','jakarta',
  'manila','seoul','guangzhou','shenzhen','chongqing','lahore',
  'bangalore','bengaluru','chennai','madras','hyderabad','ahmedabad',
  'wuhan','chengdu','nanjing','bangkok','tehran','dongguan',
  'ho chi minh city','saigon','hong kong','yangon','rangoon','pyongyang',
  'hanoi','riyadh','kuala lumpur','taipei','surat','lagos','kinshasa',
  'cairo','nairobi','dar es salaam','khartoum','addis ababa',
  'johannesburg','abidjan','luanda','accra','sao paulo','mexico city',
  'new york','new york city','los angeles','buenos aires',
  'rio de janeiro','bogota','bogotá','lima','santiago','chicago',
  'caracas','toronto','houston','istanbul','moscow','london','paris',
  'sydney','melbourne','singapore',
]);

// UNESCO World Heritage keywords — mirrors web's UNESCO_KEYWORDS array exactly.
// Uses multi-word / specific phrases to avoid false positives from short city names.
export const UNESCO_KEYWORDS = [
  'angkor','petra','machu picchu','great barrier reef','yellowstone',
  'grand canyon','yosemite','galapagos','serengeti','taj mahal',
  'great wall','forbidden city','lhasa','potala palace','venice',
  'florence','pompeii','athens','acropolis','dubrovnik','split',
  'kotor','mostar','prague','krakow','cracow','auschwitz','versailles',
  'mont saint-michel','chartres','avignon','bagan','borobudur',
  'prambanan','luang prabang','hoi an','hue','halong bay','ayutthaya',
  'sukhothai','kandy','sigiriya','ephesus','cappadocia','goreme',
  'alhambra','granada','cordoba','stonehenge','bath','colosseum',
  'sistine chapel','vatican','amalfi','cinque terre','tikal',
  'chichen itza','palenque','uxmal','teotihuacan','copan','tulum',
  'great zimbabwe','victoria falls','kilimanjaro','ngorongoro',
  'robben island','luxor','karnak','abu simbel','pyramids','giza',
  'jerash','wadi rum','palmyra','timbuktu','lalibela','aksum',
  'marrakech','fez','fes','meknes','carthage',
  'iguazu','iguassu','cartagena','nazca','ouro preto',
  'hiroshima','nara','kyoto','nikko','himeji',
  'hallstatt','dolomites','plitvice','krka',
  'uluru','kakadu','sundarbans','sagarmatha','royal chitwan',
];

// Keep UNESCO_PLACES as alias for backward compat (not used for Cultural Explorer anymore)
export const UNESCO_PLACES = new Set(UNESCO_KEYWORDS);

// National park / protected area keywords (checked in city/name/destination name)
export const NATIONAL_PARK_KEYWORDS = [
  'national park','national preserve','national monument',
  'national forest','nature reserve','game reserve','wildlife refuge',
  'protected area','state park','provincial park',
  'yellowstone','yosemite','grand canyon','zion','bryce canyon',
  'arches','canyonlands','rocky mountain','great smoky','acadia',
  'glacier','olympic','crater lake','joshua tree','sequoia',
  'death valley','shenandoah','everglades','mesa verde',
  'carlsbad caverns','white sands','great sand dunes','badlands',
  'wind cave','theodore roosevelt','north cascades','mount rainier',
  'redwood','channel islands','pinnacles','lassen volcanic',
  'hawaii volcanoes','haleakala','mammoth cave','isle royale',
  'banff','jasper','waterton','fundy','cape breton',
  'serengeti','masai mara','kruger','amboseli','bwindi','virunga',
  'okavango','chobe','etosha','amazon','pantanal','patagonia',
  'fiordland','tongariro','abel tasman','jiuzhaigou','zhangjiajie',
  'sagarmatha','royal chitwan','tortuguero','monteverde',
];

// Waterfall keywords (checked in city/destination/activity name)
export const WATERFALL_KEYWORDS = [
  'niagara','victoria falls','iguazu','iguaçu','angel falls',
  'yosemite falls','havasu','multnomah','kaieteur','tugela',
  'gullfoss','skogafoss','seljalandsfoss','dettifoss','sutherland',
  'hunlen','browne falls','minnehaha','snoqualmie','alamere',
  'mcarthur-burney','palouse','falls park','waterfall','cascade falls',
];

// Island nations (country check)
export const ISLAND_COUNTRIES = new Set([
  'maldives','seychelles','mauritius','madagascar','comoros',
  'cape verde','são tomé and príncipe','sao tome and principe',
  'fiji','tonga','samoa','vanuatu','solomon islands','kiribati',
  'tuvalu','nauru','marshall islands','micronesia','palau',
  'cuba','jamaica','haiti','dominican republic','trinidad and tobago',
  'barbados','grenada','saint lucia','saint vincent and the grenadines',
  'antigua and barbuda','saint kitts and nevis','dominica','bahamas',
  'malta','iceland','cyprus','sri lanka','indonesia','philippines',
  'timor-leste','new zealand','papua new guinea',
]);

// Well-known island cities / regions
export const ISLAND_CITIES = new Set([
  'honolulu','maui','oahu','kauai','hilo','kona',
  'bali','lombok','komodo','phuket','koh samui','koh phi phi',
  'langkawi','penang','boracay','palawan','cebu',
  'santorini','mykonos','rhodes','crete','corfu',
  'ibiza','mallorca','menorca','tenerife','gran canaria','lanzarote',
  'corsica','sardinia','sicily','ischia','capri',
  'zanzibar','pemba','reunion','rodrigues',
  'bermuda','nassau','aruba','curacao','barbados','st. lucia',
  'st. martin','turks and caicos','cayman islands',
  'galapagos','santa cruz','okinawa','jeju','bohol',
  'azores','funchal','madeira',
]);

// Major holiday windows (month 1-based, dayStart, dayEnd inclusive)
const HOLIDAY_WINDOWS = [
  { month: 12, dayStart: 23, dayEnd: 31 }, // Christmas / New Year
  { month:  1, dayStart:  1, dayEnd:  3 }, // New Year
  { month:  7, dayStart:  1, dayEnd:  7 }, // Canada Day / US Independence
  { month: 11, dayStart: 22, dayEnd: 30 }, // US Thanksgiving
  { month: 10, dayStart: 28, dayEnd: 31 }, // Halloween
  { month:  2, dayStart: 13, dayEnd: 16 }, // Valentine's Day
  { month:  4, dayStart:  1, dayEnd:  7 }, // Easter window (approximate)
];

// ─────────────────────────────────────────────────────────────────────────────
// LOCATION MATCHING HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function matchesKeywordList(haystack, keywords) {
  const h = norm(haystack);
  return keywords.some((kw) => h.includes(kw));
}

function isCapitalCity(city) {
  return CAPITAL_CITIES.has(norm(city));
}

function isLargeCity(city) {
  return LARGE_CITIES_5M.has(norm(city));
}

function isUNESCOPlace(city, name) {
  // Mirrors web's tripTextMatch(t, UNESCO_KEYWORDS): simple substring check
  // against specific multi-word phrases — avoids false positives from short city names.
  const text = norm(`${city} ${name || ''}`);
  return UNESCO_KEYWORDS.some((kw) => text.includes(kw));
}

function isIsland(city, country) {
  if (ISLAND_COUNTRIES.has(norm(country))) return true;
  if (ISLAND_CITIES.has(norm(city))) return true;
  return false;
}

function isWaterfall(city, name) {
  return (
    matchesKeywordList(city, WATERFALL_KEYWORDS) ||
    matchesKeywordList(name || '', WATERFALL_KEYWORDS)
  );
}

function isNationalPark(city, name) {
  return (
    matchesKeywordList(city, NATIONAL_PARK_KEYWORDS) ||
    matchesKeywordList(name || '', NATIONAL_PARK_KEYWORDS)
  );
}

function isDuringHoliday(startDate, endDate) {
  const start = new Date(startDate);
  const end   = new Date(endDate || startDate);
  for (const hw of HOLIDAY_WINDOWS) {
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (d.getMonth() + 1 === hw.month &&
          d.getDate() >= hw.dayStart &&
          d.getDate() <= hw.dayEnd) {
        return true;
      }
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// SEASON HELPER
// ─────────────────────────────────────────────────────────────────────────────
// Meteorological seasons (Northern Hemisphere)
function getSeason(month) {
  if (month >= 3 && month <= 5)  return 'spring';
  if (month >= 6 && month <= 8)  return 'summer';
  if (month >= 9 && month <= 11) return 'fall';
  return 'winter'; // 12, 1, 2
}

// Return the "season year" for grouping (winter that starts Dec belongs to NEXT year)
function getSeasonYear(date) {
  const d = new Date(date);
  const month = d.getMonth() + 1;
  const year  = d.getFullYear();
  return month === 12 ? year + 1 : year;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EVALUATION ENGINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Evaluate all badges given pre-fetched data.
 *
 * @param {Object} data
 *   trips          – array of trip documents
 *   allLocations   – [{city, country, state, name}] from trips + destinations
 *   totalMiles     – number (cumulative across all trips from stats)
 *   statesCount    – number (unique US states)
 *   countriesCount – number (unique countries)
 *   hasAccommodation – boolean (any accommodation logged)
 *   carRvTrips     – [{miles, transport}] trips with Car or RV transport + totalMiles set
 *   flightsByMonth – { 'YYYY-MM': count } flights per calendar month
 *
 * @returns {Set<string>} set of earned badge IDs
 */
export function evaluateBadges(data) {
  const {
    trips = [],
    allLocations = [],
    totalMiles = 0,
    statesCount = 0,
    countriesCount = 0,
    hasAccommodation = false,
    carRvTrips = [],
    flightsByMonth = {},
  } = data;

  const earned = new Set();

  // ── Miles Traveled ────────────────────────────────────────────────────────
  if (totalMiles >= 1000)   earned.add('miles_bronze');
  if (totalMiles >= 5000)   earned.add('miles_silver');
  if (totalMiles >= 15000)  earned.add('miles_gold');
  if (totalMiles >= 30000)  earned.add('miles_platinum');
  if (totalMiles >= 75000)  earned.add('miles_diamond');
  if (totalMiles >= 150000) earned.add('miles_titan');

  // ── States Visited ────────────────────────────────────────────────────────
  if (statesCount >= 3)  earned.add('states_bronze');
  if (statesCount >= 7)  earned.add('states_silver');
  if (statesCount >= 12) earned.add('states_gold');
  if (statesCount >= 25) earned.add('states_platinum');
  if (statesCount >= 30) earned.add('states_diamond');
  if (statesCount >= 50) earned.add('states_titan');

  // ── Countries Visited ─────────────────────────────────────────────────────
  if (countriesCount >= 2)  earned.add('countries_bronze');
  if (countriesCount >= 5)  earned.add('countries_silver');
  if (countriesCount >= 8)  earned.add('countries_gold');
  if (countriesCount >= 12) earned.add('countries_platinum');
  if (countriesCount >= 30) earned.add('countries_diamond');
  if (countriesCount >= 50) earned.add('countries_titan');

  // ── First Logged Trip ─────────────────────────────────────────────────────
  if (trips.length > 0) earned.add('first_logged_trip');

  // ── First Flight ──────────────────────────────────────────────────────────
  // Use flightsByMonth (built with fuzzy matching in BadgesScreen) so any
  // flight transport variant ("Airplane", "Flight", etc.) is captured.
  const hasAnyFlight = Object.values(flightsByMonth).some((c) => c > 0);
  if (hasAnyFlight) earned.add('first_flight');

  // ── First Accommodation Stay ──────────────────────────────────────────────
  if (hasAccommodation) earned.add('first_accommodation_stay');

  // ── Border Crosser ────────────────────────────────────────────────────────
  // Matches web: earned when user has visited 2+ countries total
  if (countriesCount >= 2) earned.add('border_crosser');

  // ── Road Trip Rookie ──────────────────────────────────────────────────────
  // Matches web: any car/RV trip earns the badge (no mileage minimum)
  if (carRvTrips.length > 0) earned.add('road_trip_rookie');

  // ── Distance & Mileage (per-trip, Car/RV) ────────────────────────────────
  const maxCarRvMiles = carRvTrips.reduce((m, t) => Math.max(m, t.miles), 0);
  if (maxCarRvMiles >= 300)  earned.add('distance_driver');
  if (maxCarRvMiles >= 750)  earned.add('long_haul_traveler');
  if (maxCarRvMiles >= 1500) earned.add('road_marathoner');
  if (maxCarRvMiles >= 2000) earned.add('mileage_master');
  if (maxCarRvMiles >= 3000) earned.add('cross_country_cruiser');

  // ── Destination-Based ─────────────────────────────────────────────────────
  for (const loc of allLocations) {
    const city    = loc.city    || '';
    const country = loc.country || '';
    const name    = loc.name    || '';

    if (isCapitalCity(city))           earned.add('capital_city_explorer');
    if (isLargeCity(city))             earned.add('city_breaker');
    if (isUNESCOPlace(city, name))     earned.add('cultural_explorer');
    if (isIsland(city, country))       earned.add('island_hopper');
    if (isWaterfall(city, name))       earned.add('waterfall_explorer');
    if (isNationalPark(city, name))    earned.add('nature_escape');
  }

  // New Year New Places – any trip starting in January
  if (trips.some((t) => t.startDate && new Date(t.startDate).getMonth() === 0)) {
    earned.add('new_year_new_places');
  }

  // ── Frequency & Streak ────────────────────────────────────────────────────

  // Weekend Wanderer – any trip < 72 hours
  for (const t of trips) {
    if (!t.startDate || !t.endDate) continue;
    const ms = new Date(t.endDate).getTime() - new Date(t.startDate).getTime();
    if (ms < 72 * 3600 * 1000) { earned.add('weekend_wanderer'); break; }
  }

  // Weekend Warrior – 2 trips on back-to-back weekends
  {
    // Collect "weekend numbers" (ISO week number * year)
    function weekNumber(dateStr) {
      const d = new Date(dateStr);
      const oneJan = new Date(d.getFullYear(), 0, 1);
      return Math.ceil(((d - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
    }
    const weekMap = {};
    for (const t of trips) {
      if (!t.startDate) continue;
      const d = new Date(t.startDate);
      const day = d.getDay(); // 0=Sun,6=Sat
      if (day === 0 || day === 6) {
        const yr = d.getFullYear();
        const wk = weekNumber(t.startDate);
        const key = `${yr}-${wk}`;
        weekMap[key] = true;
      }
    }
    const weekKeys = Object.keys(weekMap).sort();
    for (let i = 1; i < weekKeys.length; i++) {
      const [y1, w1] = weekKeys[i - 1].split('-').map(Number);
      const [y2, w2] = weekKeys[i    ].split('-').map(Number);
      if (y1 === y2 && w2 - w1 === 1) { earned.add('weekend_warrior'); break; }
      if (y2 - y1 === 1 && w1 >= 52 && w2 === 1) { earned.add('weekend_warrior'); break; }
    }
  }

  // Annual Trailblazer – 5+ trips in one calendar year
  {
    const tripsByYear = {};
    for (const t of trips) {
      if (!t.startDate) continue;
      const yr = new Date(t.startDate).getFullYear();
      tripsByYear[yr] = (tripsByYear[yr] || 0) + 1;
    }
    if (Object.values(tripsByYear).some((c) => c >= 5)) {
      earned.add('annual_trailblazer');
    }
  }

  // 12 Month Momentum – at least 1 trip in each of the 12 months of any calendar year
  {
    const monthsByYear = {};
    for (const t of trips) {
      if (!t.startDate) continue;
      const d = new Date(t.startDate);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      if (!monthsByYear[yr]) monthsByYear[yr] = new Set();
      monthsByYear[yr].add(mo);
    }
    if (Object.values(monthsByYear).some((s) => s.size === 12)) {
      earned.add('twelve_month_momentum');
    }
  }

  // Seasonal Explorer – 1 trip in each of the 4 seasons in any calendar year
  {
    const seasonsByYear = {};
    for (const t of trips) {
      if (!t.startDate) continue;
      const d   = new Date(t.startDate);
      const mo  = d.getMonth() + 1;
      const yr  = getSeasonYear(t.startDate);
      const sea = getSeason(mo);
      if (!seasonsByYear[yr]) seasonsByYear[yr] = new Set();
      seasonsByYear[yr].add(sea);
    }
    if (Object.values(seasonsByYear).some((s) => s.size === 4)) {
      earned.add('seasonal_explorer');
    }
  }

  // Anniversary Adventurer – trip on same month+day in at least 2 different years
  {
    const dateCounts = {};
    for (const t of trips) {
      if (!t.startDate) continue;
      const d  = new Date(t.startDate);
      const key = `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!dateCounts[key]) dateCounts[key] = new Set();
      dateCounts[key].add(d.getFullYear());
    }
    if (Object.values(dateCounts).some((s) => s.size >= 2)) {
      earned.add('anniversary_adventurer');
    }
  }

  // Frequent Flyer Month – 3+ flights in one calendar month
  if (Object.values(flightsByMonth).some((c) => c >= 3)) {
    earned.add('frequent_flyer_month');
  }

  // ── Timing & Seasonal ─────────────────────────────────────────────────────

  // Midweek Mover – any trip starting on Wednesday
  if (trips.some((t) => t.startDate && new Date(t.startDate).getDay() === 3)) {
    earned.add('midweek_mover');
  }

  // Fall Explorer – trip between Sep 1 – Nov 30
  if (trips.some((t) => {
    if (!t.startDate) return false;
    const mo = new Date(t.startDate).getMonth() + 1;
    return mo >= 9 && mo <= 11;
  })) earned.add('fall_explorer');

  // Spring Breaker – trip in March or April
  if (trips.some((t) => {
    if (!t.startDate) return false;
    const mo = new Date(t.startDate).getMonth() + 1;
    return mo === 3 || mo === 4;
  })) earned.add('spring_breaker');

  // Summer Explorer – 3+ trips in Jun-Aug across any years (matches web)
  {
    const summerCount = trips.filter((t) => {
      if (!t.startDate) return false;
      const mo = new Date(t.startDate).getMonth(); // 0-indexed
      return mo >= 5 && mo <= 7; // June=5, July=6, August=7
    }).length;
    if (summerCount >= 3) earned.add('summer_explorer');
  }

  // Winter Wanderer – trip between Dec 1 – Feb 29
  if (trips.some((t) => {
    if (!t.startDate) return false;
    const mo = new Date(t.startDate).getMonth() + 1;
    return mo === 12 || mo === 1 || mo === 2;
  })) earned.add('winter_wanderer');

  // Holiday Traveler – trip overlaps a major holiday
  if (trips.some((t) => t.startDate && isDuringHoliday(t.startDate, t.endDate))) {
    earned.add('holiday_traveler');
  }

  // ── Modern 7 Wonders ─────────────────────────────────────────────────────
  // Uses word-boundary matching to prevent false positives like
  // 'agra' matching 'niagara', or 'piste' matching ski slope names.
  const WONDER_KEYWORDS_MAP = {
    great_wall_wanderer:     ['great wall', 'badaling', 'mutianyu', 'jinshanling', 'simatai'],
    petra_pathfinder:        ['petra', 'wadi musa', 'wadi mousa'],
    redeemer_ridge_visitor:  ['christ the redeemer', 'corcovado', 'rio de janeiro'],
    machu_picchu_explorer:   ['machu picchu', 'aguas calientes'],
    chichen_itza_adventurer: ['chichen itza', 'chich\u00e9n itz\u00e1'],
    colosseum_challenger:    ['colosseum', 'colosseo'],
    taj_mahal_traveler:      ['taj mahal', 'agra'],
  };

  function wonderMatch(text, keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?<![a-z])${escaped}(?![a-z])`, 'i').test(text);
  }

  for (const loc of allLocations) {
    const locText = `${loc.city || ''} ${loc.name || ''} ${loc.country || ''}`;
    for (const [badgeId, keywords] of Object.entries(WONDER_KEYWORDS_MAP)) {
      if (keywords.some((kw) => wonderMatch(locText, kw))) {
        earned.add(badgeId);
      }
    }
  }

  // Also scan trip-level fields (state, specificAddress, originCity) for wonders
  for (const trip of trips) {
    const tripText = [
      trip.city, trip.name, trip.country,
      trip.state, trip.specificAddress, trip.originCity,
    ].filter(Boolean).join(' ');
    for (const [badgeId, keywords] of Object.entries(WONDER_KEYWORDS_MAP)) {
      if (keywords.some((kw) => wonderMatch(tripText, kw))) {
        earned.add(badgeId);
      }
    }
  }

  return earned;
}

// ─────────────────────────────────────────────────────────────────────────────
// TIERED BADGE PROGRESS HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns progress info for a tiered category.
 * @param {'miles_traveled'|'states_visited'|'countries_visited'} categoryId
 * @param {number} value  – current value (totalMiles, statesCount, countriesCount)
 * @returns {{ currentTier, nextTier, nextThreshold, pct }}
 */
export function getTieredProgress(categoryId, value) {
  const badges = ALL_BADGES.filter((b) => b.categoryId === categoryId && b.tierId);

  let currentTier = null;
  let nextTier    = null;
  let nextThreshold = null;

  for (let i = 0; i < badges.length; i++) {
    if (value >= badges[i].threshold) {
      currentTier = badges[i];
    } else {
      nextTier      = badges[i];
      nextThreshold = badges[i].threshold;
      break;
    }
  }

  const prevThreshold = currentTier ? currentTier.threshold : 0;
  const span = nextThreshold ? nextThreshold - prevThreshold : 1;
  const progress = nextThreshold ? Math.min((value - prevThreshold) / span, 1) : 1;

  return { currentTier, nextTier, nextThreshold, progress };
}

// ─────────────────────────────────────────────────────────────────────────────
// SUMMARY HELPER
// ─────────────────────────────────────────────────────────────────────────────

/** Returns total earned count and total badge count. */
export function getBadgeSummary(earnedSet) {
  return {
    earned: earnedSet.size,
    total:  ALL_BADGES.length,
  };
}
