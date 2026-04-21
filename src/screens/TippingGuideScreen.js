import React, { useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";
import { TIPPING_DATA, CULTURE_CONFIG, FEATURED_COUNTRIES, searchCountries } from "../lib/tippingData";

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
                <Text style={styles.dropdownFlag}>{entry.flag}</Text>
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
              <Text style={styles.countryFlag}>{selected.flag}</Text>
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
                  <Text style={styles.featuredFlag}>{entry.flag}</Text>
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
  countryFlag:    { fontSize: scaleFontSize(36) },
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
  featuredFlag:    { fontSize: scaleFontSize(28), marginBottom: scaleSpacing(SPACING.xs) },
  featuredCountry: { fontSize: scaleFontSize(13), fontWeight: "600", color: COLORS.foreground },
  coverageNote:    { fontSize: scaleFontSize(11), color: COLORS.muted, textAlign: "center", marginTop: scaleSpacing(SPACING.sm) },
});
