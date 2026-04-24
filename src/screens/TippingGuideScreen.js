import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";
import { TIPPING_DATA, CULTURE_CONFIG, FEATURED_COUNTRIES, searchCountries } from "../lib/tippingData";

// ── Country ISO code lookup ───────────────────────────────────────────────────
const COUNTRY_CODES = {
  "United States": "us", "Canada": "ca", "Mexico": "mx", "Costa Rica": "cr",
  "Jamaica": "jm", "Dominican Republic": "do", "Bahamas": "bs", "Cuba": "cu",
  "Brazil": "br", "Argentina": "ar", "Colombia": "co", "Peru": "pe", "Chile": "cl",
  "United Kingdom": "gb", "France": "fr", "Germany": "de", "Italy": "it",
  "Spain": "es", "Portugal": "pt", "Netherlands": "nl", "Switzerland": "ch",
  "Austria": "at", "Greece": "gr", "Turkey": "tr", "Czech Republic": "cz",
  "Hungary": "hu", "Poland": "pl", "Sweden": "se", "Norway": "no",
  "Denmark": "dk", "Ireland": "ie", "Japan": "jp", "China": "cn",
  "Thailand": "th", "Vietnam": "vn", "Indonesia": "id", "Philippines": "ph",
  "India": "in", "Singapore": "sg", "Malaysia": "my", "South Korea": "kr",
  "Taiwan": "tw", "Cambodia": "kh", "Nepal": "np", "Sri Lanka": "lk",
  "United Arab Emirates": "ae", "Egypt": "eg", "Morocco": "ma",
  "South Africa": "za", "Kenya": "ke", "Tanzania": "tz", "Israel": "il",
  "Jordan": "jo", "Australia": "au", "New Zealand": "nz", "Fiji": "fj",
  "Maldives": "mv", "Macau": "mo", "Madeira": "pt", "Mauritius": "mu",
  "Malta (General)": "mt", "Madagascar (Coastal)": "mg",
  "Mahé (Seychelles)": "sc", "Montenegro": "me", "Croatia": "hr",
  "Slovenia": "si", "Cyprus": "cy", "Bulgaria": "bg",
};

const KEYWORD_CODES = [
  ["Japan", "jp"], ["Okinawa", "jp"], ["Miyako", "jp"], ["Nagasaki", "jp"],
  ["Onna Village", "jp"], ["Omishima", "jp"], ["Okinoerabu", "jp"],
  ["Mexico", "mx"], ["Playa del Carmen", "mx"], ["Riviera Maya", "mx"],
  ["Tulum", "mx"], ["Cancun", "mx"], ["Mazatlán", "mx"], ["Mazatlan", "mx"],
  ["Manzanillo", "mx"], ["Riviera Nayarit", "mx"], ["Quintana Roo", "mx"],
  ["Playa Mujeres", "mx"], ["Playa Samara", "mx"], ["Mérida", "mx"],
  ["Pacific Coast (Mexico", "mx"],
  ["Italy", "it"], ["Portofino", "it"], ["Positano", "it"], ["Polignano", "it"],
  ["Rimini", "it"], ["Ravello", "it"], ["Puglia", "it"], ["Olbia", "it"],
  ["Amalfi", "it"], ["Sardinia", "it"], ["Sicily", "it"], ["Liguria", "it"],
  ["Naples Coast", "it"],
  ["Spain", "es"], ["Mallorca", "es"], ["Majorca", "es"], ["Menorca", "es"],
  ["Ibiza", "es"], ["Formentera", "es"], ["Marbella", "es"], ["Malaga", "es"],
  ["Playa Blanca", "es"], ["Lanzarote", "es"], ["Costa del Sol", "es"],
  ["Pontevedra", "es"], ["Ribadesella", "es"],
  ["France", "fr"], ["Nice", "fr"], ["Cannes", "fr"], ["French Riviera", "fr"],
  ["Quiberon", "fr"], ["Île de Ré", "fr"], ["Île d'Oléron", "fr"],
  ["French Polynesia", "pf"], ["Moorea", "pf"], ["Raiatea", "pf"],
  ["Greece", "gr"], ["Mykonos", "gr"], ["Santorini", "gr"], ["Rhodes", "gr"],
  ["Rodos", "gr"], ["Milos", "gr"], ["Paros", "gr"], ["Naxos", "gr"],
  ["Kefalonia", "gr"], ["Karpathos", "gr"], ["Halkidiki", "gr"],
  ["Kavala", "gr"], ["Kassandra", "gr"],
  ["Portugal", "pt"], ["Algarve", "pt"], ["Azores", "pt"], ["Porto Santo", "pt"],
  ["Ponta Delgada", "pt"], ["Pico Island", "pt"], ["Quarteira", "pt"],
  ["Australia", "au"], ["Kangaroo Island", "au"], ["Noosa", "au"],
  ["Palm Cove", "au"], ["Ningaloo", "au"], ["Nelson Bay", "au"],
  ["Melbourne Coast", "au"], ["Perth Coast", "au"], ["Port Douglas", "au"],
  ["Northern Beaches (Sydney)", "au"], ["Noosa", "au"],
  ["New Zealand", "nz"], ["Raglan", "nz"], ["North Island (New Zealand", "nz"],
  ["Indonesia", "id"], ["Bali", "id"], ["Padangbai", "id"], ["Raja Ampat", "id"],
  ["Philippines", "ph"], ["Palawan", "ph"], ["Panglao", "ph"],
  ["Manila Bay", "ph"], ["Marinduque", "ph"], ["Pagudpud", "ph"],
  ["Thailand", "th"], ["Phuket", "th"], ["Pattaya", "th"], ["Phang Nga", "th"],
  ["Rayong", "th"],
  ["Ireland", "ie"], ["Inch Beach", "ie"], ["Inishbofin", "ie"],
  ["Inverness", "gb"], ["Scotland", "gb"], ["Northern Ireland", "gb"],
  ["Northumberland", "gb"], ["Orkney", "gb"], ["North Berwick", "gb"],
  ["Moray Firth", "gb"], ["Oban", "gb"], ["Plymouth Coast", "gb"],
  ["California", "us"], ["Florida", "us"], ["Hawaii", "us"], ["Oahu", "us"],
  ["Kauai", "us"], ["Maui", "us"], ["Big Island", "us"],
  ["North Carolina", "us"], ["Oregon Coast", "us"], ["Martha's Vineyard", "us"],
  ["Nantucket", "us"], ["Monterey", "us"], ["Morro Bay", "us"],
  ["Newport (Rhode Island)", "us"], ["Nags Head", "us"],
  ["Rehoboth Beach", "us"], ["Outer Banks", "us"], ["Miami Beach", "us"],
  ["Palm Beach (Florida)", "us"], ["New Smyrna Beach", "us"],
  ["New Brunswick Coast", "ca"], ["Newfoundland", "ca"],
  ["Ontario Great Lakes", "ca"], ["Quebec Maritime", "ca"],
  ["Egypt", "eg"], ["Red Sea", "eg"], ["Ras Sudr", "eg"],
  ["Morocco (Atlantic", "ma"], ["Agadir", "ma"],
  ["Kenya", "ke"], ["Mombasa", "ke"], ["Diani", "ke"],
  ["Tanzania", "tz"], ["Zanzibar", "tz"], ["Pemba Island", "tz"],
  ["South Africa", "za"], ["Plettenberg", "za"], ["Port Elizabeth", "za"],
  ["Mozambique", "mz"], ["Quelimane", "mz"], ["Quilalea", "mz"],
  ["Seychelles", "sc"],
  ["Mauritius", "mu"],
  ["Reunion Island", "re"], ["Reunion", "re"],
  ["UAE", "ae"], ["Dubai", "ae"], ["Ras Al Khaimah", "ae"], ["Abu Dhabi", "ae"],
  ["Oman", "om"],
  ["Jordan", "jo"], ["Aqaba", "jo"],
  ["Israel", "il"],
  ["Croatia", "hr"], ["Dubrovnik", "hr"], ["Opatija", "hr"], ["Rovinj", "hr"],
  ["Montenegro", "me"], ["Kotor", "me"], ["Budva", "me"],
  ["Slovenia", "si"], ["Piran", "si"],
  ["Cyprus", "cy"], ["North Cyprus", "cy"],
  ["Bulgaria", "bg"],
  ["Barbados", "bb"], ["Oistins", "bb"],
  ["Jamaica", "jm"], ["Negril", "jm"], ["Ocho Rios", "jm"],
  ["Port Antonio", "jm"], ["Runaway Bay", "jm"],
  ["Bahamas", "bs"], ["Nassau", "bs"],
  ["Dominican Republic", "do"], ["Punta Cana", "do"],
  ["St. Lucia", "lc"], ["Marigot Bay", "lc"],
  ["Montserrat", "ms"], ["Martinique", "mq"],
  ["Nevis", "kn"], ["Port Zante", "kn"],
  ["Brazil", "br"], ["Rio de Janeiro", "br"], ["Natal (Brazil)", "br"],
  ["Porto Seguro", "br"], ["Paraty", "br"],
  ["Argentina", "ar"], ["Patagonia Coastal Gateways (Argentina)", "ar"],
  ["Punta del Este", "uy"],
  ["Ecuador", "ec"], ["Manabi", "ec"],
  ["Peru", "pe"], ["Paracas", "pe"],
  ["Honduras", "hn"], ["Roatán", "hn"],
  ["Belize", "bz"], ["Placencia", "bz"],
  ["Costa Rica", "cr"], ["Puntarenas", "cr"], ["Playa Hermosa (Costa Rica)", "cr"],
  ["Vietnam", "vn"], ["Da Nang", "vn"], ["Nha Trang", "vn"],
  ["India", "in"], ["Goa", "in"], ["Kanyakumari", "in"], ["Kerala", "in"],
  ["Malaysia", "my"], ["Penang", "my"], ["Perhentian", "my"],
  ["Taiwan", "tw"], ["Kaohsiung", "tw"], ["Penghu", "tw"],
  ["South Korea", "kr"], ["Jeju", "kr"], ["Busan", "kr"],
  ["China", "cn"], ["Qingdao", "cn"], ["Qionghai", "cn"], ["Hainan", "cn"],
  ["Macau", "mo"],
  ["Singapore", "sg"],
  ["Cambodia", "kh"],
  ["Sri Lanka", "lk"],
  ["Nepal", "np"],
  ["Maldives", "mv"],
  ["Fiji", "fj"], ["Mamanuca Islands (Fiji)", "fj"],
  ["Cook Islands", "ck"], ["Rarotonga", "ck"],
  ["Vanuatu", "vu"], ["Port Vila", "vu"],
  ["Micronesia", "fm"], ["Pohnpei", "fm"],
  ["Northern Mariana Islands", "mp"],
  ["New Caledonia", "nc"],
  ["Niue", "nu"],
  ["Greenland", "gl"], ["Qaqortoq", "gl"],
  ["Germany", "de"], ["Rügen", "de"],
  ["Sweden", "se"], ["Norway", "no"], ["Denmark", "dk"],
  ["Poland", "pl"], ["Hungary", "hu"], ["Czech Republic", "cz"],
  ["Switzerland", "ch"], ["Austria", "at"], ["Netherlands", "nl"],
];

function getCountryCode(countryName) {
  if (COUNTRY_CODES[countryName]) return COUNTRY_CODES[countryName];
  for (const [keyword, code] of KEYWORD_CODES) {
    if (countryName.includes(keyword)) return code;
  }
  return null;
}

function FlagImage({ country, size = 32 }) {
  const code = getCountryCode(country);
  if (!code) return <Text style={{ fontSize: size * 0.9 }}>🌍</Text>;
  return (
    <Image
      source={{ uri: `https://flagcdn.com/w80/${code}.png` }}
      style={{ width: size * 1.4, height: size, borderRadius: 3 }}
      resizeMode="cover"
    />
  );
}

const FEATURED = TIPPING_DATA.filter((e) => FEATURED_COUNTRIES.includes(e.country));

const TIP_CARD_COLORS = [
  { border: "#bfdbfe", bg: "#eff6ff" },
  { border: "#c7d2fe", bg: "#eef2ff" },
  { border: "#99f6e4", bg: "#f0fdfa" },
  { border: "#a7f3d0", bg: "#ecfdf5" },
  { border: "#ddd6fe", bg: "#f5f3ff" },
];

function CultureBadge({ culture, small }) {
  const cfg = CULTURE_CONFIG[culture];
  return (
    <View style={[styles.badge, { backgroundColor: cfg.bg }, small && styles.badgeSmall]}>
      <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
      <Text style={[styles.badgeText, { color: cfg.color }, small && styles.badgeTextSmall]}>
        {cfg.label}
      </Text>
    </View>
  );
}

function TipCard({ tip, index }) {
  const colors = TIP_CARD_COLORS[index % TIP_CARD_COLORS.length];
  return (
    <View style={[styles.tipCard, { borderColor: colors.border, backgroundColor: colors.bg }]}>
      <View style={styles.tipCardHeader}>
        <Text style={styles.tipCardIcon}>{tip.icon}</Text>
        <Text style={styles.tipCardCategory}>{tip.category}</Text>
      </View>
      <Text style={styles.tipCardRec}>{tip.recommendation}</Text>
    </View>
  );
}

export default function TippingGuideScreen() {
  const [query, setQuery]         = useState("");
  const [results, setResults]     = useState([]);
  const [selected, setSelected]   = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setShowDropdown(false);
      return;
    }
    const matches = searchCountries(query);
    setResults(matches);
    setShowDropdown(matches.length > 0);
  }, [query]);

  function selectEntry(entry) {
    setSelected(entry);
    setQuery(entry.country);
    setShowDropdown(false);
  }

  function clearSearch() {
    setQuery("");
    setSelected(null);
    setResults([]);
    setShowDropdown(false);
    inputRef.current?.focus();
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.headerBlock}>
        <Text style={styles.headerIcon}>💰</Text>
        <Text style={styles.heading}>Tipping Guide</Text>
        <Text style={styles.subheading}>
          Know what to tip — and what not to — in 50+ countries and destinations worldwide.
        </Text>
      </View>

      {/* ── Culture Legend ── */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.legendRow} contentContainerStyle={styles.legendContent}>
        {Object.entries(CULTURE_CONFIG).map(([key, cfg]) => (
          <View key={key} style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
            <Text style={[styles.badgeText, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
        ))}
      </ScrollView>

      {/* ── Search Box ── */}
      <View style={styles.searchBox}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder="Type a country name… e.g. France, Japan"
          placeholderTextColor={COLORS.muted}
          autoCorrect={false}
          autoCapitalize="words"
          onFocus={() => { if (results.length > 0) setShowDropdown(true); }}
        />
        {query.length > 0 && (
          <TouchableOpacity style={styles.clearBtn} onPress={clearSearch}>
            <Text style={styles.clearIcon}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Dropdown ── */}
      {showDropdown && results.length > 0 && (
        <View style={styles.dropdown}>
          {results.map((entry, i) => {
            const cfg = CULTURE_CONFIG[entry.tippingCulture];
            return (
              <TouchableOpacity
                key={entry.country}
                style={[styles.dropdownItem, i < results.length - 1 && styles.dropdownItemBorder]}
                onPress={() => selectEntry(entry)}
                activeOpacity={0.7}
              >
                <FlagImage country={entry.country} size={22} />
                <View style={styles.dropdownInfo}>
                  <Text style={styles.dropdownCountry}>{entry.country}</Text>
                  <Text style={styles.dropdownRegion}>{entry.region}</Text>
                </View>
                <View style={[styles.badgeSmall, { backgroundColor: cfg.bg }]}>
                  <Text style={[styles.badgeTextSmall, { color: cfg.color }]}>{cfg.label}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* ── No results ── */}
      {query.trim() && results.length === 0 && !selected && (
        <View style={styles.noResults}>
          <Text style={styles.noResultsText}>No countries found for "{query}"</Text>
          <Text style={styles.noResultsHint}>Try "France", "Japan", "Mexico", or another country name.</Text>
        </View>
      )}

      {/* ── Selected Country ── */}
      {selected && (
        <View style={styles.selectedBlock}>
          {/* Country header */}
          <View style={styles.countryCard}>
            <View style={styles.countryRow}>
              <FlagImage country={selected.country} size={44} />
              <View style={styles.countryInfo}>
                <Text style={styles.countryName}>{selected.country}</Text>
                <Text style={styles.countryMeta}>{selected.region} · Currency: {selected.currency}</Text>
              </View>
              <CultureBadge culture={selected.tippingCulture} />
            </View>
            <Text style={styles.countryOverview}>{selected.overview}</Text>
          </View>

          {/* Tip cards */}
          <Text style={styles.sectionHeading}>Recommendations by Category</Text>
          <View style={styles.tipsGrid}>
            {selected.tips.map((tip, i) => (
              <TipCard key={tip.category} tip={tip} index={i} />
            ))}
          </View>

          {/* Search again */}
          <TouchableOpacity style={styles.searchAgainBtn} onPress={clearSearch}>
            <Text style={styles.searchAgainText}>← Search another country</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Featured Countries (when no search) ── */}
      {!query && !selected && (
        <View style={styles.featuredBlock}>
          <Text style={styles.featuredHeading}>POPULAR DESTINATIONS</Text>
          <View style={styles.featuredGrid}>
            {FEATURED.map((entry) => {
              const cfg = CULTURE_CONFIG[entry.tippingCulture];
              return (
                <TouchableOpacity
                  key={entry.country}
                  style={styles.featuredCard}
                  onPress={() => selectEntry(entry)}
                  activeOpacity={0.75}
                >
                  <FlagImage country={entry.country} size={36} />
                  <Text style={styles.featuredCountry} numberOfLines={1}>{entry.country}</Text>
                  <View style={[styles.badgeSmall, { backgroundColor: cfg.bg, marginTop: scaleSpacing(4) }]}>
                    <Text style={[styles.badgeTextSmall, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={styles.coverageNote}>
            Covering 50+ countries and popular travel destinations worldwide.
          </Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: scaleSpacing(SPACING.md), paddingBottom: scaleSpacing(SPACING.xxl) },

  /* Header */
  headerBlock: { alignItems: "center", marginBottom: scaleSpacing(SPACING.md) },
  headerIcon:  { fontSize: scaleFontSize(32), marginBottom: scaleSpacing(SPACING.xs) },
  heading:     { fontSize: scaleFontSize(24), fontWeight: "700", color: COLORS.foreground },
  subheading:  { fontSize: scaleFontSize(13), color: COLORS.muted, textAlign: "center", marginTop: scaleSpacing(4), maxWidth: 300 },

  /* Legend */
  legendRow:    { marginBottom: scaleSpacing(SPACING.md) },
  legendContent:{ gap: scaleSpacing(SPACING.sm), paddingHorizontal: scaleSpacing(SPACING.xs) },

  /* Badge */
  badge:         { flexDirection: "row", alignItems: "center", gap: scaleSpacing(4), paddingHorizontal: scaleSpacing(10), paddingVertical: scaleSpacing(5), borderRadius: 100 },
  badgeSmall:    { flexDirection: "row", alignItems: "center", gap: scaleSpacing(3), paddingHorizontal: scaleSpacing(6), paddingVertical: scaleSpacing(3), borderRadius: 100 },
  badgeDot:      { width: scaleFontSize(6), height: scaleFontSize(6), borderRadius: scaleFontSize(3) },
  badgeText:     { fontSize: scaleFontSize(11), fontWeight: "600" },
  badgeTextSmall:{ fontSize: scaleFontSize(9), fontWeight: "600" },

  /* Search */
  searchBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(12), borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(SPACING.sm),
    gap: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.sm),
  },
  searchIcon:  { fontSize: scaleFontSize(16) },
  searchInput: { flex: 1, fontSize: scaleFontSize(15), color: COLORS.foreground, paddingVertical: scaleSpacing(4) },
  clearBtn:    { padding: scaleSpacing(4) },
  clearIcon:   { fontSize: scaleFontSize(14), color: COLORS.muted },

  /* Dropdown */
  dropdown: {
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(12), borderWidth: 1,
    borderColor: COLORS.border, overflow: "hidden", marginBottom: scaleSpacing(SPACING.md),
  },
  dropdownItem:       { flexDirection: "row", alignItems: "center", paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(12), gap: scaleSpacing(SPACING.sm) },
  dropdownItemBorder: { borderBottomWidth: 1, borderBottomColor: `${COLORS.border}88` },
  dropdownFlag:       { fontSize: scaleFontSize(20) },
  dropdownInfo:       { flex: 1 },
  dropdownCountry:    { fontSize: scaleFontSize(14), fontWeight: "600", color: COLORS.foreground },
  dropdownRegion:     { fontSize: scaleFontSize(11), color: COLORS.muted },

  /* No results */
  noResults:     { backgroundColor: COLORS.surface, borderRadius: scaleFontSize(12), padding: scaleSpacing(SPACING.lg), alignItems: "center", marginBottom: scaleSpacing(SPACING.md) },
  noResultsText: { fontSize: scaleFontSize(14), color: COLORS.muted, textAlign: "center" },
  noResultsHint: { fontSize: scaleFontSize(12), color: COLORS.muted, textAlign: "center", marginTop: scaleSpacing(4) },

  /* Selected country */
  selectedBlock:  { gap: scaleSpacing(SPACING.md) },
  countryCard:    {
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(16), borderWidth: 1,
    borderColor: COLORS.border, padding: scaleSpacing(SPACING.md),
  },
  countryRow:     { flexDirection: "row", alignItems: "flex-start", gap: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.sm) },
  countryFlag:    { width: scaleFontSize(56), height: scaleFontSize(40), borderRadius: 4 },
  countryInfo:    { flex: 1 },
  countryName:    { fontSize: scaleFontSize(22), fontWeight: "700", color: COLORS.foreground },
  countryMeta:    { fontSize: scaleFontSize(12), color: COLORS.muted, marginTop: scaleSpacing(2) },
  countryOverview:{ fontSize: scaleFontSize(13), color: COLORS.foreground, lineHeight: scaleFontSize(20), paddingTop: scaleSpacing(SPACING.sm), borderTopWidth: 1, borderTopColor: COLORS.border },
  sectionHeading: { fontSize: scaleFontSize(15), fontWeight: "600", color: COLORS.foreground },
  tipsGrid:       { gap: scaleSpacing(SPACING.sm) },
  tipCard:        { borderRadius: scaleFontSize(14), borderWidth: 1, padding: scaleSpacing(SPACING.md) },
  tipCardHeader:  { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.sm) },
  tipCardIcon:    { fontSize: scaleFontSize(20) },
  tipCardCategory:{ fontSize: scaleFontSize(14), fontWeight: "600", color: "#1f2937" },
  tipCardRec:     { fontSize: scaleFontSize(13), color: "#374151", lineHeight: scaleFontSize(20) },
  searchAgainBtn: { paddingVertical: scaleSpacing(SPACING.sm), alignItems: "center" },
  searchAgainText:{ fontSize: scaleFontSize(13), color: COLORS.primary, fontWeight: "500" },

  /* Featured grid */
  featuredBlock:   { gap: scaleSpacing(SPACING.sm) },
  featuredHeading: { fontSize: scaleFontSize(11), fontWeight: "600", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, textAlign: "center" },
  featuredGrid:    { flexDirection: "row", flexWrap: "wrap", gap: scaleSpacing(SPACING.sm) },
  featuredCard:    {
    width: "47%", backgroundColor: COLORS.surface, borderRadius: scaleFontSize(14),
    borderWidth: 1, borderColor: COLORS.border, padding: scaleSpacing(SPACING.md),
    alignItems: "flex-start",
  },
  featuredFlag:    { marginBottom: scaleSpacing(SPACING.xs) },
  featuredCountry: { fontSize: scaleFontSize(13), fontWeight: "600", color: COLORS.foreground },
  coverageNote:    { fontSize: scaleFontSize(11), color: COLORS.muted, textAlign: "center", marginTop: scaleSpacing(SPACING.sm) },
});
