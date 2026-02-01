// lib/geo.js
// United States is placed first as most users are expected to be from the US

export const COUNTRIES = [
  "United States",
  "Anguilla",
  "Antarctica",
  "Antigua and Barbuda",
  "Argentina",
  "Aruba",
  "Australia",
  "Austria",
  "Bahamas",
  "Bangladesh",
  "Barbados",
  "Belgium",
  "Belize",
  "Bermuda",
  "Bonaire",
  "Brazil",
  "British Virgin Islands",
  "Cambodia",
  "Canada",
  "Cayman Islands",
  "Chile",
  "China",
  "Colombia",
  "Comoros",
  "Cook Islands",
  "Croatia",
  "Cuba",
  "Curaçao",
  "Czechia",
  "Denmark",
  "Dominica",
  "Dominican Republic",
  "Ecuador",
  "Egypt",
  "England",
  "Ethiopia",
  "Fiji",
  "Finland",
  "France",
  "France (Mayotte)",
  "Germany",
  "Ghana",
  "Greece",
  "Greenland",
  "Grenada",
  "Guadeloupe (France)",
  "Haiti",
  "Honduras",
  "Hungary",
  "Iceland",
  "India",
  "Indonesia",
  "Ireland",
  "Israel",
  "Italy",
  "Jamaica",
  "Japan",
  "Kenya",
  "Kiribati",
  "Kuwait",
  "Madagascar",
  "Malaysia",
  "Maldives",
  "Marshall Islands",
  "Martinique (France)",
  "Mauritius",
  "Mexico",
  "Micronesia",
  "Montenegro",
  "Montserrat",
  "Morocco",
  "Mozambique",
  "Nauru",
  "Nepal",
  "Netherlands",
  "Netherlands Antilles",
  "New Caledonia (France)",
  "New Zealand",
  "Nigeria",
  "Northern Ireland",
  "Norway",
  "Pakistan",
  "Palau",
  "Panama",
  "Peru",
  "Philippines",
  "Poland",
  "Portugal",
  "Puerto Rico",
  "Qatar",
  "Romania",
  "Réunion (France)",
  "Saint Barthélemy (France)",
  "Saint Kitts and Nevis",
  "Saint Lucia",
  "Saint Vincent and Grenadines",
  "Samoa",
  "Saudi Arabia",
  "Scotland",
  "Seychelles",
  "Singapore",
  "Solomon Islands",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Sweden",
  "Switzerland",
  "São Tomé & Príncipe",
  "Taiwan",
  "Tanzania",
  "Thailand",
  "Tonga",
  "Trinidad and Tobago",
  "Tunisia",
  "Turkey",
  "Turks and Caicos",
  "Tuvalu",
  "UK Overseas Territory",
  "Ukraine",
  "United Arab Emirates",
  "United States (USVI)",
  "Vanuatu",
  "Venezuela",
  "Vietnam",
  "Wales",
  "Yemen",
  "Others",
];

export const STATES_BY_COUNTRY = {
  // United States
  "United States": [
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado",
    "Connecticut", "Delaware", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana",
    "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota",
    "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada",
    "New Hampshire", "New Jersey", "New Mexico", "New York",
    "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota",
    "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington",
    "West Virginia", "Wisconsin", "Wyoming",
  ],

  // Canada
  Canada: [
    "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Nova Scotia", "Ontario",
    "Prince Edward Island", "Quebec", "Saskatchewan",
    "Northwest Territories", "Nunavut", "Yukon",
  ],

  // Australia
  Australia: [
    "New South Wales", "Victoria", "Queensland", "Western Australia",
    "South Australia", "Tasmania", "Northern Territory",
    "Australian Capital Territory",
  ],

  // India
  India: [
    "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh",
    "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka",
    "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
    "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand",
    "West Bengal", "Delhi (National Capital Territory)",
  ],

  // China
  China: [
    "Beijing", "Shanghai", "Tianjin", "Chongqing", "Anhui", "Fujian",
    "Gansu", "Guangdong", "Guizhou", "Hainan", "Hebei", "Heilongjiang",
    "Henan", "Hubei", "Hunan", "Jiangsu", "Jiangxi", "Jilin", "Liaoning",
    "Qinghai", "Shaanxi", "Shandong", "Shanxi", "Sichuan", "Yunnan",
    "Zhejiang", "Hong Kong", "Macau",
  ],

  // Japan
  Japan: [
    "Tokyo", "Osaka", "Kyoto", "Hokkaido", "Okinawa", "Kanagawa",
    "Aichi", "Fukuoka", "Hyogo", "Hiroshima", "Chiba", "Saitama",
  ],

  // United Kingdom regions
  England: [
    "Greater London", "West Midlands", "Greater Manchester", "West Yorkshire",
    "Kent", "Essex", "Hampshire", "Lancashire", "Surrey", "Devon",
  ],
  Scotland: [
    "Glasgow City", "Edinburgh (City of)", "Highland", "Aberdeen City",
    "Fife", "Perth and Kinross",
  ],
  Wales: [
    "Cardiff", "Swansea", "Newport", "Gwynedd", "Pembrokeshire",
  ],
  "Northern Ireland": [
    "Belfast", "Derry City and Strabane", "Antrim and Newtownabbey",
  ],

  // Germany
  Germany: [
    "Baden-Württemberg", "Bavaria (Bayern)", "Berlin", "Brandenburg",
    "Bremen", "Hamburg", "Hesse (Hessen)", "Lower Saxony (Niedersachsen)",
    "Mecklenburg-Vorpommern", "North Rhine-Westphalia (Nordrhein-Westfalen)",
    "Rhineland-Palatinate (Rheinland-Pfalz)", "Saarland", "Saxony (Sachsen)",
    "Saxony-Anhalt (Sachsen-Anhalt)", "Schleswig-Holstein", "Thuringia (Thüringen)",
  ],

  // France
  France: [
    "Île-de-France", "Provence-Alpes-Côte d'Azur", "Auvergne-Rhône-Alpes",
    "Nouvelle-Aquitaine", "Occitanie", "Bretagne", "Normandie",
  ],

  // Italy
  Italy: [
    "Lombardy", "Lazio", "Campania", "Veneto", "Sicily", "Emilia-Romagna",
    "Piedmont", "Tuscany", "Sardinia",
  ],

  // Spain
  Spain: [
    "Andalusia", "Catalonia", "Madrid", "Valencian Community",
    "Galicia", "Basque Country", "Canary Islands", "Balearic Islands",
  ],

  // Mexico
  Mexico: [
    "Mexico City", "Jalisco", "Nuevo León", "Quintana Roo", "Baja California Sur",
    "Yucatán", "Guanajuato", "Oaxaca",
  ],

  // Brazil
  Brazil: [
    "São Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Paraná",
    "Rio Grande do Sul", "Pernambuco", "Ceará",
  ],

  // Thailand
  Thailand: [
    "Bangkok", "Chiang Mai", "Phuket", "Krabi", "Chonburi", "Surat Thani",
  ],

  // Indonesia
  Indonesia: [
    "Bali", "Jakarta", "West Java", "Central Java", "East Java",
    "North Sumatra", "Yogyakarta",
  ],

  // Philippines
  Philippines: [
    "Metro Manila", "Cebu", "Davao del Sur", "Palawan", "Bohol",
  ],

  // Vietnam
  Vietnam: [
    "Ho Chi Minh City", "Hanoi", "Da Nang", "Khanh Hoa", "Quang Ninh",
  ],

  // Greece
  Greece: [
    "Attica", "Central Macedonia", "Crete", "Thessaly", "South Aegean",
  ],

  // Turkey
  Turkey: [
    "Istanbul", "Ankara", "Antalya", "Izmir", "Mugla",
  ],

  // South Africa
  "South Africa": [
    "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Mpumalanga",
  ],

  // New Zealand
  "New Zealand": [
    "Auckland", "Wellington", "Canterbury", "Otago", "Bay of Plenty",
  ],

  // United Arab Emirates
  "United Arab Emirates": [
    "Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah",
  ],

  // Caribbean and small nations
  Bahamas: ["New Providence", "Grand Bahama", "Eleuthera", "Exuma"],
  Jamaica: ["Kingston", "St. James", "St. Ann", "Westmoreland"],
  "Dominican Republic": ["Santo Domingo", "La Altagracia", "Puerto Plata", "Samaná"],
  "Puerto Rico": ["San Juan", "Bayamón", "Carolina", "Ponce"],
  Bermuda: ["Hamilton", "St. George's"],
  "Cayman Islands": ["Grand Cayman", "Cayman Brac", "Little Cayman"],
  "British Virgin Islands": ["Tortola", "Virgin Gorda", "Anegada", "Jost Van Dyke"],
  "Turks and Caicos": ["Providenciales", "Grand Turk", "North Caicos", "South Caicos"],
  Aruba: ["Oranjestad"],
  Curaçao: ["Willemstad"],
  Barbados: ["Christ Church", "St. Michael", "St. James"],
  "Saint Lucia": ["Castries", "Soufrière"],
  Grenada: ["St. George", "St. Andrew"],
  "Antigua and Barbuda": ["Saint John", "Saint Paul"],
  "Saint Kitts and Nevis": ["Basseterre", "Charlestown"],
  Dominica: ["Roseau", "Portsmouth"],
  "Saint Vincent and Grenadines": ["Kingstown", "Bequia"],
  "Trinidad and Tobago": ["Port of Spain", "San Fernando", "Scarborough"],

  // Pacific Islands
  Fiji: ["Viti Levu", "Vanua Levu"],
  Samoa: ["Upolu", "Savai'i"],
  Tonga: ["Tongatapu"],
  Vanuatu: ["Efate", "Espiritu Santo"],
  "Cook Islands": ["Rarotonga", "Aitutaki"],
  "French Polynesia": ["Tahiti", "Bora Bora", "Moorea"],

  // Indian Ocean
  Maldives: ["Malé", "Ari Atoll", "Baa Atoll"],
  Mauritius: ["Port Louis", "Black River"],
  Seychelles: ["Mahé", "Praslin", "La Digue"],
  Madagascar: ["Antananarivo", "Nosy Be"],
};

/**
 * Get states/provinces for a given country
 * @param {string} country - Country name
 * @returns {string[]} Array of states/provinces
 */
export function getStates(country) {
  return (country && STATES_BY_COUNTRY[country]) || [];
}

// Map Google Places country names to our COUNTRIES array
const COUNTRY_NAME_MAP = {
  "United States": "United States",
  "USA": "United States",
  "US": "United States",
  "United Kingdom": "England", // Default to England, can be overridden
  "UK": "England",
  "Republic of Ireland": "Ireland",
  "South Korea": "South Korea",
  "Republic of Korea": "South Korea",
  "Taiwan": "Taiwan",
  "Republic of China": "Taiwan",
  "Czech Republic": "Czechia",
  "Czechia": "Czechia",
  "UAE": "United Arab Emirates",
  "U.S. Virgin Islands": "United States (USVI)",
  "British Virgin Islands": "British Virgin Islands",
  "Turks and Caicos Islands": "Turks and Caicos",
  "Trinidad & Tobago": "Trinidad and Tobago",
  "São Tomé and Príncipe": "São Tomé & Príncipe",
  "St. Kitts and Nevis": "Saint Kitts and Nevis",
  "St. Kitts & Nevis": "Saint Kitts and Nevis",
  "St. Lucia": "Saint Lucia",
  "St. Vincent and the Grenadines": "Saint Vincent and Grenadines",
  "St. Barthélemy": "Saint Barthélemy (France)",
  "Saint Barthélemy": "Saint Barthélemy (France)",
  "Reunion": "Réunion (France)",
  "Réunion": "Réunion (France)",
  "New Caledonia": "New Caledonia (France)",
  "Guadeloupe": "Guadeloupe (France)",
  "Martinique": "Martinique (France)",
  "Mayotte": "France (Mayotte)",
  "Hong Kong": "China",
  "Macau": "China",
  "Macao": "China",
};

/**
 * Match a country name from Google Places to our COUNTRIES array
 * Returns the matched country or the original name if no match found
 * @param {string} googleCountry - Country name from Google Places API
 * @returns {string} Matched country name
 */
export function matchCountryName(googleCountry) {
  if (!googleCountry) return "";

  // Check exact match first
  if (COUNTRIES.includes(googleCountry)) {
    return googleCountry;
  }

  // Check mapping
  const mapped = COUNTRY_NAME_MAP[googleCountry];
  if (mapped && COUNTRIES.includes(mapped)) {
    return mapped;
  }

  // Try case-insensitive search
  const lowerGoogle = googleCountry.toLowerCase();
  for (const country of COUNTRIES) {
    if (country.toLowerCase() === lowerGoogle) {
      return country;
    }
  }

  // Try partial match (for cases like "United States of America")
  for (const country of COUNTRIES) {
    if (
      lowerGoogle.includes(country.toLowerCase()) ||
      country.toLowerCase().includes(lowerGoogle)
    ) {
      return country;
    }
  }

  // Return original if no match found - user can select manually
  return googleCountry;
}

/**
 * Match a state/region name to our STATES_BY_COUNTRY for a given country
 * Returns the matched state or the original name if no match found
 * @param {string} country - Country name
 * @param {string} googleState - State name from Google Places API
 * @returns {string} Matched state name
 */
export function matchStateName(country, googleState) {
  if (!country || !googleState) return googleState || "";

  const states = STATES_BY_COUNTRY[country];
  if (!states || states.length === 0) return googleState;

  // Check exact match
  if (states.includes(googleState)) {
    return googleState;
  }

  // Try case-insensitive search
  const lowerGoogle = googleState.toLowerCase();
  for (const state of states) {
    if (state.toLowerCase() === lowerGoogle) {
      return state;
    }
  }

  // Try partial match
  for (const state of states) {
    if (
      lowerGoogle.includes(state.toLowerCase()) ||
      state.toLowerCase().includes(lowerGoogle)
    ) {
      return state;
    }
  }

  // Return original if no match
  return googleState;
}
