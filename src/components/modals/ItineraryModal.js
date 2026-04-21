import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import { collection, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import ModalShell from "./ModalShell";
import ItemFlipbook from "./ItemFlipbook";
import SearchBookingsModal from "./SearchBookingsModal";
import WeatherModal from "./WeatherModal";
import { COLORS, SPACING, VISUAL_CROSSING_API_KEY } from "../../lib/constants";
import { formatDateMMDDYYYY } from "../../lib/utils";
import { Ionicons } from "@expo/vector-icons";

// ─── Helpers ────────────────────────────────────────────────────────────────

function parseDate(val) {
  if (!val) return 0;
  if (typeof val === "object" && typeof val.toDate === "function")
    return val.toDate().getTime();
  if (val && val.seconds) return val.seconds * 1000;
  if (typeof val === "string") {
    const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(val);
    if (iso)
      return new Date(
        parseInt(iso[1]),
        parseInt(iso[2]) - 1,
        parseInt(iso[3])
      ).getTime();
    const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(val);
    if (us)
      return new Date(
        parseInt(us[3]),
        parseInt(us[1]) - 1,
        parseInt(us[2])
      ).getTime();
  }
  const n = new Date(val).getTime();
  return isNaN(n) ? 0 : n;
}

// Return YYYY-MM-DD string for any date value
function toYMD(val) {
  if (!val) return null;
  if (typeof val === "string" && /^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
  if (typeof val === "object" && typeof val.toDate === "function")
    return val.toDate().toISOString().slice(0, 10);
  if (val && val.seconds)
    return new Date(val.seconds * 1000).toISOString().slice(0, 10);
  const d = new Date(val);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

// Visual Crossing icon → emoji
function weatherEmoji(icon) {
  const map = {
    "clear-day": "☀️",
    "clear-night": "🌙",
    "partly-cloudy-day": "⛅",
    "partly-cloudy-night": "🌥️",
    cloudy: "☁️",
    fog: "🌫️",
    wind: "💨",
    rain: "🌧️",
    sleet: "🌨️",
    snow: "❄️",
    "thunder-rain": "⛈️",
    "thunder-showers-day": "⛈️",
    "thunder-showers-night": "⛈️",
    thunder: "🌩️",
    "showers-day": "🌦️",
    "showers-night": "🌦️",
  };
  return map[icon] || "🌡️";
}

// Per-category accent colour and emoji
const KIND_META = {
  "Primary Destination": { color: "#5eb9b3", icon: "🌍" },
  Destination: { color: "#3b82f6", icon: "📍" },
  Activity: { color: "#f59e0b", icon: "🎯" },
  Accommodation: { color: "#8b5cf6", icon: "🏨" },
  Restaurant: { color: "#ef4444", icon: "🍽️" },
  Cruise: { color: "#06b6d4", icon: "🚢" },
};

// ─── RatingChip ─────────────────────────────────────────────────────────────

function RatingChip({ label, value }) {
  return (
    <View style={styles.ratingChip}>
      <Text style={styles.ratingChipLabel}>{label}</Text>
      <Text style={styles.ratingChipStars}>
        {"★".repeat(value)}
        {"☆".repeat(5 - value)}
      </Text>
    </View>
  );
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function ItineraryModal({ tripId, visible, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);
  const [bookingDest, setBookingDest] = useState(null); // { name, location }
  const [weatherDest, setWeatherDest] = useState(null); // { name, location }
  const [weather, setWeather] = useState({});
  const weatherCache = useRef({});

  useEffect(() => {
    if (!tripId || !visible) return;
    setLoading(true);
    setItems([]);
    setWeather({});
    fetchAllItems();
  }, [tripId, visible]);

  // ── Weather ────────────────────────────────────────────────────────────────

  async function fetchWeatherForItem(itemId, location, dateStr) {
    if (!location || !dateStr || !VISUAL_CROSSING_API_KEY) return;
    const cacheKey = `${location}_${dateStr}`;
    if (weatherCache.current[cacheKey]) {
      setWeather((prev) => ({ ...prev, [itemId]: weatherCache.current[cacheKey] }));
      return;
    }
    try {
      const url =
        `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/` +
        `${encodeURIComponent(location)}/${dateStr}` +
        `?unitGroup=us&elements=datetime,tempmax,tempmin,conditions,icon&include=days` +
        `&key=${VISUAL_CROSSING_API_KEY}`;
      const resp = await fetch(url);
      if (!resp.ok) return;
      const data = await resp.json();
      const day = data?.days?.[0];
      if (!day) return;
      const result = {
        high: Math.round(day.tempmax),
        low: Math.round(day.tempmin),
        conditions: day.conditions,
        icon: day.icon,
      };
      weatherCache.current[cacheKey] = result;
      setWeather((prev) => ({ ...prev, [itemId]: result }));
    } catch {
      // Silently fail — weather is supplemental
    }
  }

  // ── Data fetching ──────────────────────────────────────────────────────────

  async function fetchAllItems() {
    try {
      const allItems = [];

      // 1. Primary Destination — the trip document itself
      const tripSnap = await getDoc(doc(db, "trips", tripId));
      if (tripSnap.exists()) {
        const t = tripSnap.data();
        allItems.push({
          id: "trip-primary",
          type: "Primary Destination",
          subcollection: "trip",
          name: t.name || t.city || t.country || "Trip",
          startDate: t.startDate || "",
          endDate: t.endDate || "",
          city: t.city || "",
          state: t.state || "",
          country: t.country || "",
          address: t.specificAddress || "",
          phoneNumber: "",
          websiteUrl: "",
          notes: t.description || "",
          review: "",
          qualityRating: null,
          valueRating: null,
          serviceRating: null,
          locationRating: null,
          foodRating: null,
          entertainmentRating: null,
          onShip: false,
          cruiseLine: "",
          shipName: "",
        });
      }

      // 2. All subcollections in parallel
      const [destSnap, actSnap, accomSnap, restSnap, cruiseSnap] =
        await Promise.all([
          getDocs(collection(db, "trips", tripId, "destinations")),
          getDocs(collection(db, "trips", tripId, "activities")),
          getDocs(collection(db, "trips", tripId, "accommodations")),
          getDocs(collection(db, "trips", tripId, "restaurants")),
          getDocs(collection(db, "trips", tripId, "cruises")),
        ]);

      const push = (snap, type, subcollection) => {
        snap.forEach((d) => {
          const x = d.data();
          allItems.push({
            id: d.id,
            type,
            subcollection,
            name:
              x.name ||
              [x.city, x.country].filter(Boolean).join(", ") ||
              "—",
            startDate: x.startDate || "",
            endDate: x.endDate || "",
            city: x.city || "",
            state: x.state || "",
            country: x.country || "",
            address: x.address || "",
            phoneNumber: x.phoneNumber || "",
            websiteUrl: x.websiteUrl || "",
            notes: x.notes || "",
            review: x.review || "",
            qualityRating: x.qualityRating || null,
            valueRating: x.valueRating || null,
            serviceRating: x.serviceRating || null,
            locationRating: x.locationRating || null,
            foodRating: x.foodRating || null,
            entertainmentRating: x.entertainmentRating || null,
            onShip: x.onShip || false,
            cruiseLine: x.cruiseLine || "",
            shipName: x.shipName || "",
          });
        });
      };

      push(destSnap, "Destination", "destinations");
      push(actSnap, "Activity", "activities");
      push(accomSnap, "Accommodation", "accommodations");
      push(restSnap, "Restaurant", "restaurants");
      push(cruiseSnap, "Cruise", "cruises");

      // 3. Sort chronologically; Primary Destination always first
      allItems.sort((a, b) => {
        if (a.type === "Primary Destination") return -1;
        if (b.type === "Primary Destination") return 1;
        return parseDate(a.startDate) - parseDate(b.startDate);
      });

      setItems(allItems);
      setLoading(false);

      // 4. Fetch weather for each item (non-blocking, updates state incrementally)
      allItems.forEach((item) => {
        const location = item.city || item.country;
        const date = toYMD(item.startDate);
        if (location && date) {
          fetchWeatherForItem(item.id, location, date);
        }
      });
    } catch {
      setLoading(false);
    }
  }

  // ── Actions ────────────────────────────────────────────────────────────────

  const handleCall = (phone) => Linking.openURL(`tel:${phone}`);

  const handleDirections = (item) => {
    const dest = [item.address, item.city, item.state, item.country]
      .filter(Boolean)
      .join(", ");
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`
    );
  };

  const handleWebsite = (url) =>
    Linking.openURL(url.startsWith("http") ? url : `https://${url}`);

  // ── Render item ────────────────────────────────────────────────────────────

  const renderItem = ({ item, index }) => {
    const meta = KIND_META[item.type] || { color: COLORS.primary, icon: "📌" };
    const w = weather[item.id];

    const location = item.onShip
      ? "On Ship"
      : [item.address, item.city, item.state, item.country]
          .filter(Boolean)
          .join(", ");

    const ratings = [
      { label: "Quality", val: item.qualityRating },
      { label: "Value", val: item.valueRating },
      { label: "Service", val: item.serviceRating },
      { label: "Location", val: item.locationRating },
      { label: "Food", val: item.foodRating },
      { label: "Entertainment", val: item.entertainmentRating },
    ].filter((r) => r.val);

    const isFirst = index === 0;

    return (
      <View
        style={[
          styles.card,
          { borderLeftColor: meta.color },
          isFirst && styles.cardFirst,
        ]}
      >
        {/* ── Category badge + name ── */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={styles.kindIcon}>{meta.icon}</Text>
            <View style={{ flex: 1 }}>
              <View
                style={[
                  styles.kindBadge,
                  { backgroundColor: meta.color + "22" },
                ]}
              >
                <Text style={[styles.kindText, { color: meta.color }]}>
                  {item.type.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.itemName}>{item.name}</Text>
            </View>
          </View>

          {/* Weather badge */}
          {w && (
            <TouchableOpacity
              style={styles.weatherBadge}
              onPress={() =>
                setWeatherDest({
                  name: item.name,
                  location: item.city || item.country,
                })
              }
              activeOpacity={0.75}
            >
              <Text style={styles.weatherEmoji}>{weatherEmoji(w.icon)}</Text>
              <Text style={styles.weatherTemp}>
                {w.high}°/{w.low}°F
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Details ── */}
        <View style={styles.detailsBlock}>
          {/* Dates */}
          {!!item.startDate && (
            <View style={styles.detailRow}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={COLORS.muted}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>
                {formatDateMMDDYYYY(item.startDate)}
                {item.endDate && item.endDate !== item.startDate
                  ? ` → ${formatDateMMDDYYYY(item.endDate)}`
                  : ""}
              </Text>
            </View>
          )}

          {/* Location */}
          {!!location && (
            <View style={styles.detailRow}>
              <Ionicons
                name="location-outline"
                size={13}
                color={COLORS.muted}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>{location}</Text>
            </View>
          )}

          {/* Weather conditions */}
          {w && (
            <View style={styles.detailRow}>
              <Ionicons
                name="partly-sunny-outline"
                size={13}
                color={COLORS.muted}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>{w.conditions}</Text>
            </View>
          )}

          {/* Cruise-specific */}
          {item.type === "Cruise" && !!item.cruiseLine && (
            <View style={styles.detailRow}>
              <Ionicons
                name="boat-outline"
                size={13}
                color={COLORS.muted}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>
                {item.cruiseLine}
                {item.shipName ? ` — ${item.shipName}` : ""}
              </Text>
            </View>
          )}

          {/* Phone */}
          {!!item.phoneNumber && (
            <View style={styles.detailRow}>
              <Ionicons
                name="call-outline"
                size={13}
                color={COLORS.muted}
                style={styles.detailIcon}
              />
              <Text style={styles.detailText}>{item.phoneNumber}</Text>
            </View>
          )}

          {/* Notes */}
          {!!item.notes && (
            <View style={styles.notesRow}>
              <Ionicons
                name="document-text-outline"
                size={13}
                color={COLORS.muted}
                style={styles.detailIcon}
              />
              <Text style={styles.notesText}>{item.notes}</Text>
            </View>
          )}

          {/* Review */}
          {!!item.review && (
            <View style={styles.notesRow}>
              <Ionicons
                name="chatbubble-outline"
                size={13}
                color={COLORS.muted}
                style={styles.detailIcon}
              />
              <Text style={styles.notesText}>{item.review}</Text>
            </View>
          )}
        </View>

        {/* ── Ratings ── */}
        {ratings.length > 0 && (
          <View style={styles.ratingsRow}>
            {ratings.map((r) => (
              <RatingChip key={r.label} label={r.label} value={r.val} />
            ))}
          </View>
        )}

        {/* ── Action buttons ── */}
        <View style={styles.actionRow}>
          {!!item.phoneNumber && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleCall(item.phoneNumber)}
            >
              <Ionicons name="call-outline" size={15} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>
          )}

          {!!(item.address || item.city) && !item.onShip && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleDirections(item)}
            >
              <Ionicons
                name="navigate-outline"
                size={15}
                color={COLORS.primary}
              />
              <Text style={styles.actionLabel}>Directions</Text>
            </TouchableOpacity>
          )}

          {!!item.websiteUrl && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => handleWebsite(item.websiteUrl)}
            >
              <Ionicons
                name="globe-outline"
                size={15}
                color={COLORS.primary}
              />
              <Text style={styles.actionLabel}>Website</Text>
            </TouchableOpacity>
          )}

          {item.subcollection !== "trip" && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                setSelectedItem({
                  id: item.id,
                  name: item.name,
                  subcollection: item.subcollection,
                })
              }
            >
              <Ionicons
                name="images-outline"
                size={15}
                color={COLORS.primary}
              />
              <Text style={styles.actionLabel}>Photos</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() =>
              setBookingDest({
                name: item.name,
                location: [item.city, item.state, item.country]
                  .filter(Boolean)
                  .join(", "),
              })
            }
          >
            <Ionicons name="search-outline" size={15} color={COLORS.primary} />
            <Text style={styles.actionLabel}>Search</Text>
          </TouchableOpacity>

          {!!(item.city || item.country) && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() =>
                setWeatherDest({
                  name: item.name,
                  location: item.city || item.country,
                })
              }
            >
              <Ionicons name="partly-sunny-outline" size={15} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Weather</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <ModalShell
        visible={visible}
        title="Trip Itinerary"
        onClose={onClose}
        fullScreen
        noScroll={true}
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.loadingText}>Loading itinerary…</Text>
          </View>
        ) : items.length === 0 ? (
          <View style={styles.center}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No itinerary items yet</Text>
            <Text style={styles.emptySubtitle}>
              Add destinations, activities, accommodations, or restaurants to
              see your trip timeline.
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        )}
      </ModalShell>

      {selectedItem && (
        <ItemFlipbook
          tripId={tripId}
          linkedId={selectedItem.id}
          subcollection={selectedItem.subcollection}
          itemName={selectedItem.name}
          visible={!!selectedItem}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {bookingDest && (
        <SearchBookingsModal
          visible={!!bookingDest}
          destinationName={bookingDest.name}
          destinationLocation={bookingDest.location}
          onClose={() => setBookingDest(null)}
        />
      )}

      {weatherDest && (
        <WeatherModal
          visible={!!weatherDest}
          locationName={weatherDest.name}
          locationQuery={weatherDest.location}
          onClose={() => setWeatherDest(null)}
        />
      )}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.muted,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  list: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },

  // ── Card ──
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  cardFirst: {
    borderWidth: 1,
    borderColor: COLORS.primary + "44",
  },

  // ── Header ──
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: SPACING.sm,
  },
  kindIcon: {
    fontSize: 22,
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  kindBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  kindText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.foreground,
    lineHeight: 20,
  },

  // ── Weather badge ──
  weatherBadge: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  weatherEmoji: {
    fontSize: 20,
  },
  weatherTemp: {
    fontSize: 11,
    color: COLORS.foreground,
    fontWeight: "600",
    marginTop: 2,
  },

  // ── Details block ──
  detailsBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: 5,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  detailIcon: {
    marginRight: 5,
    marginTop: 1,
    flexShrink: 0,
  },
  detailText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  notesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
  },
  notesText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: "italic",
    lineHeight: 18,
  },

  // ── Ratings ──
  ratingsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: SPACING.sm,
  },
  ratingChip: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: "center",
  },
  ratingChipLabel: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  ratingChipStars: {
    fontSize: 11,
    color: "#f59e0b",
    letterSpacing: 1,
  },

  // ── Action row ──
  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingTop: SPACING.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  actionLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
});
