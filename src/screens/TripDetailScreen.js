import React, { useEffect, useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Alert,
  ActivityIndicator,
  Linking,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  orderBy,
  query,
  deleteDoc,
} from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import TripDetailMap from "../components/TripDetailMap";
import ItemFlipbook from "../components/modals/ItemFlipbook";
import SearchBookingsModal from "../components/modals/SearchBookingsModal";
import WeatherModal from "../components/modals/WeatherModal";
import { COLORS, SPACING, VISUAL_CROSSING_API_KEY } from "../lib/constants";
import { dateRangeOf, formatDateMMDDYYYY } from "../lib/utils";

const { width, height } = Dimensions.get("window");

// ─── Itinerary helpers ────────────────────────────────────────────────────────

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

function weatherEmoji(icon) {
  const map = {
    "clear-day": "☀️", "clear-night": "🌙", "partly-cloudy-day": "⛅",
    "partly-cloudy-night": "🌥️", cloudy: "☁️", fog: "🌫️", wind: "💨",
    rain: "🌧️", sleet: "🌨️", snow: "❄️", "thunder-rain": "⛈️",
    "thunder-showers-day": "⛈️", "thunder-showers-night": "⛈️",
    thunder: "🌩️", "showers-day": "🌦️", "showers-night": "🌦️",
  };
  return map[icon] || "🌡️";
}

const KIND_META = {
  "Primary Destination": { color: "#5eb9b3", icon: "🌍" },
  Destination: { color: "#3b82f6", icon: "📍" },
  Activity: { color: "#f59e0b", icon: "🎯" },
  Accommodation: { color: "#8b5cf6", icon: "🏨" },
  Restaurant: { color: "#ef4444", icon: "🍽️" },
  Cruise: { color: "#06b6d4", icon: "🚢" },
};

function RatingChip({ label, value }) {
  return (
    <View style={styles.itinRatingChip}>
      <Text style={styles.itinRatingChipLabel}>{label}</Text>
      <Text style={styles.itinRatingChipStars}>
        {"★".repeat(value)}{"☆".repeat(5 - value)}
      </Text>
    </View>
  );
}

function makeItinItem(type, subcollection, d) {
  return {
    id: d.id,
    type,
    subcollection,
    name: d.name || [d.city, d.country].filter(Boolean).join(", ") || "—",
    startDate: d.startDate || "",
    endDate: d.endDate || "",
    city: d.city || "",
    state: d.state || "",
    country: d.country || "",
    address: d.address || "",
    phoneNumber: d.phoneNumber || "",
    websiteUrl: d.websiteUrl || "",
    notes: d.notes || "",
    review: d.review || "",
    qualityRating: d.qualityRating || null,
    valueRating: d.valueRating || null,
    serviceRating: d.serviceRating || null,
    locationRating: d.locationRating || null,
    foodRating: d.foodRating || null,
    entertainmentRating: d.entertainmentRating || null,
    onShip: d.onShip || false,
    cruiseLine: d.cruiseLine || "",
    shipName: d.shipName || "",
  };
}

// Memoized itinerary card — only re-renders when its own item or weather changes
const ItineraryCard = React.memo(function ItineraryCard({
  item, itemWeather, isFirst,
  onCall, onDirections, onWebsite, onPhotos, onSearch, onWeather,
}) {
  const meta = KIND_META[item.type] || { color: COLORS.primary, icon: "📌" };
  const w = itemWeather;
  const location = item.onShip
    ? "On Ship"
    : [item.address, item.city, item.state, item.country].filter(Boolean).join(", ");
  const ratings = [
    { label: "Quality", val: item.qualityRating },
    { label: "Value", val: item.valueRating },
    { label: "Service", val: item.serviceRating },
    { label: "Location", val: item.locationRating },
    { label: "Food", val: item.foodRating },
    { label: "Entertainment", val: item.entertainmentRating },
  ].filter((r) => r.val);

  return (
    <View style={[styles.itinCard, { borderLeftColor: meta.color }, isFirst && styles.itinCardFirst]}>
      <View style={styles.itinCardHeader}>
        <View style={styles.itinCardHeaderLeft}>
          <Text style={styles.itinKindIcon}>{meta.icon}</Text>
          <View style={{ flex: 1 }}>
            <View style={[styles.itinKindBadge, { backgroundColor: meta.color + "22" }]}>
              <Text style={[styles.itinKindText, { color: meta.color }]}>{item.type.toUpperCase()}</Text>
            </View>
            <Text style={styles.itinItemName}>{item.name}</Text>
          </View>
        </View>
        {w && (
          <TouchableOpacity
            style={styles.itinWeatherBadge}
            onPress={() => onWeather({ name: item.name, location: item.city || item.country })}
            activeOpacity={0.75}
          >
            <Text style={styles.itinWeatherEmoji}>{weatherEmoji(w.icon)}</Text>
            <Text style={styles.itinWeatherTemp}>{w.high}°/{w.low}°F</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.itinDetailsBlock}>
        {!!item.startDate && (
          <View style={styles.itinDetailRow}>
            <Ionicons name="calendar-outline" size={13} color={COLORS.muted} style={styles.itinDetailIcon} />
            <Text style={styles.itinDetailText}>
              {formatDateMMDDYYYY(item.startDate)}
              {item.endDate && item.endDate !== item.startDate ? ` → ${formatDateMMDDYYYY(item.endDate)}` : ""}
            </Text>
          </View>
        )}
        {!!location && (
          <View style={styles.itinDetailRow}>
            <Ionicons name="location-outline" size={13} color={COLORS.muted} style={styles.itinDetailIcon} />
            <Text style={styles.itinDetailText}>{location}</Text>
          </View>
        )}
        {w && (
          <View style={styles.itinDetailRow}>
            <Ionicons name="partly-sunny-outline" size={13} color={COLORS.muted} style={styles.itinDetailIcon} />
            <Text style={styles.itinDetailText}>{w.conditions}</Text>
          </View>
        )}
        {item.type === "Cruise" && !!item.cruiseLine && (
          <View style={styles.itinDetailRow}>
            <Ionicons name="boat-outline" size={13} color={COLORS.muted} style={styles.itinDetailIcon} />
            <Text style={styles.itinDetailText}>{item.cruiseLine}{item.shipName ? ` — ${item.shipName}` : ""}</Text>
          </View>
        )}
        {!!item.phoneNumber && (
          <View style={styles.itinDetailRow}>
            <Ionicons name="call-outline" size={13} color={COLORS.muted} style={styles.itinDetailIcon} />
            <Text style={styles.itinDetailText}>{item.phoneNumber}</Text>
          </View>
        )}
        {!!item.notes && (
          <View style={styles.itinNotesRow}>
            <Ionicons name="document-text-outline" size={13} color={COLORS.muted} style={styles.itinDetailIcon} />
            <Text style={styles.itinNotesText}>{item.notes}</Text>
          </View>
        )}
        {!!item.review && (
          <View style={styles.itinNotesRow}>
            <Ionicons name="chatbubble-outline" size={13} color={COLORS.muted} style={styles.itinDetailIcon} />
            <Text style={styles.itinNotesText}>{item.review}</Text>
          </View>
        )}
      </View>

      {ratings.length > 0 && (
        <View style={styles.itinRatingsRow}>
          {ratings.map((r) => <RatingChip key={r.label} label={r.label} value={r.val} />)}
        </View>
      )}

      <View style={styles.itinActionRow}>
        {!!item.phoneNumber && (
          <TouchableOpacity style={styles.itinActionBtn} onPress={() => onCall(item.phoneNumber)}>
            <Ionicons name="call-outline" size={15} color={COLORS.primary} />
            <Text style={styles.itinActionLabel}>Call</Text>
          </TouchableOpacity>
        )}
        {!!(item.address || item.city) && !item.onShip && (
          <TouchableOpacity style={styles.itinActionBtn} onPress={() => onDirections(item)}>
            <Ionicons name="navigate-outline" size={15} color={COLORS.primary} />
            <Text style={styles.itinActionLabel}>Directions</Text>
          </TouchableOpacity>
        )}
        {!!item.websiteUrl && (
          <TouchableOpacity style={styles.itinActionBtn} onPress={() => onWebsite(item.websiteUrl)}>
            <Ionicons name="globe-outline" size={15} color={COLORS.primary} />
            <Text style={styles.itinActionLabel}>Website</Text>
          </TouchableOpacity>
        )}
        {item.subcollection !== "trip" && (
          <TouchableOpacity style={styles.itinActionBtn} onPress={() => onPhotos({ id: item.id, name: item.name, subcollection: item.subcollection })}>
            <Ionicons name="images-outline" size={15} color={COLORS.primary} />
            <Text style={styles.itinActionLabel}>Photos</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.itinActionBtn}
          onPress={() => onSearch({ name: item.name, location: [item.city, item.state, item.country].filter(Boolean).join(", ") })}
        >
          <Ionicons name="search-outline" size={15} color={COLORS.primary} />
          <Text style={styles.itinActionLabel}>Search</Text>
        </TouchableOpacity>
        {!!(item.city || item.country) && (
          <TouchableOpacity style={styles.itinActionBtn} onPress={() => onWeather({ name: item.name, location: item.city || item.country })}>
            <Ionicons name="partly-sunny-outline" size={15} color={COLORS.primary} />
            <Text style={styles.itinActionLabel}>Weather</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

// ─── Module-level helpers ─────────────────────────────────────────────────────

function formatDate(dateStr) {
  if (!dateStr) return "";
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (match) return `${match[2]}/${match[3]}/${match[1]}`;
  return dateStr;
}

function formatPhoneNumber(phone) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  return phone;
}

// Helper to convert timestamps to milliseconds (handles both number and Firestore Timestamp)
function getMillis(t) {
  if (!t) return 0;
  if (typeof t === "number") return t;
  if (typeof t === "object" && typeof t.seconds === "number") {
    return t.seconds * 1000 + (t.nanoseconds ? t.nanoseconds / 1e6 : 0);
  }
  return 0;
}

export default function TripDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { user } = useAuth();
  const { tripId } = route.params;

  const [trip, setTrip] = useState(null);
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Subcollections
  const [destinations, setDestinations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [accommodations, setAccommodations] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [cruises, setCruises] = useState([]);
  const [extras, setExtras] = useState([]);

  // Modals
  const [editingCaption, setEditingCaption] = useState(null);
  const [showFlipbook, setShowFlipbook] = useState(false);
  const [flipbookIndex, setFlipbookIndex] = useState(0);
  const [selectedItemPhotos, setSelectedItemPhotos] = useState(null);

  // Itinerary rich-card state
  const [weather, setWeather] = useState({});
  const weatherCache = useRef({});
  const pendingWeather = useRef({});
  const weatherFlushTimer = useRef(null);
  const [itinFlipbook, setItinFlipbook] = useState(null);
  const [bookingDest, setBookingDest] = useState(null);
  const [weatherDest, setWeatherDest] = useState(null);

  // Cover image positioning
  const [coverPosY, setCoverPosY] = useState(50);

  // Listen to trip document
  useEffect(() => {
    if (!tripId || !user) return;

    const tripRef = doc(db, "trips", tripId);
    const unsubTrip = onSnapshot(
      tripRef,
      (snap) => {
        if (!snap.exists()) {
          setError("Trip not found");
          setLoading(false);
          return;
        }

        const data = { id: snap.id, ...snap.data() };
        if (data.ownerId !== user.uid) {
          setError("You don't have permission to view this trip");
          setLoading(false);
          return;
        }

        setTrip(data);
        if (data.coverPositionY !== undefined) {
          setCoverPosY(data.coverPositionY);
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubTrip();
  }, [tripId, user]);

  // Listen to media subcollection
  useEffect(() => {
    if (!tripId) return;

    const mediaQuery = query(
      collection(db, "trips", tripId, "media"),
      orderBy("createdAt", "desc")
    );

    const unsubMedia = onSnapshot(mediaQuery, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setMedia(arr);
    });

    return () => unsubMedia();
  }, [tripId]);

  // Listen to subcollections
  useEffect(() => {
    if (!tripId) return;

    const unsubDest = onSnapshot(
      query(
        collection(db, "trips", tripId, "destinations"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setDestinations(arr);
      }
    );

    const unsubAct = onSnapshot(
      query(
        collection(db, "trips", tripId, "activities"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setActivities(arr);
      }
    );

    const unsubAcc = onSnapshot(
      query(
        collection(db, "trips", tripId, "accommodations"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setAccommodations(arr);
      }
    );

    const unsubRest = onSnapshot(
      query(
        collection(db, "trips", tripId, "restaurants"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setRestaurants(arr);
      }
    );

    const unsubCruise = onSnapshot(
      query(
        collection(db, "trips", tripId, "cruises"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setCruises(arr);
      }
    );

    const unsubExtras = onSnapshot(
      query(
        collection(db, "trips", tripId, "extras"),
        orderBy("createdAt", "desc")
      ),
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setExtras(arr);
      }
    );

    return () => {
      unsubDest();
      unsubAct();
      unsubAcc();
      unsubRest();
      unsubCruise();
      unsubExtras();
    };
  }, [tripId]);

  // Fetch weather for all itinerary items whenever data changes
  useEffect(() => {
    const allItems = [
      ...(trip ? [{ id: "trip-primary", city: trip.city, country: trip.country, startDate: trip.startDate }] : []),
      ...destinations.map((d) => ({ id: d.id, city: d.city, country: d.country, startDate: d.startDate })),
      ...activities.map((d) => ({ id: d.id, city: d.city, country: d.country, startDate: d.startDate })),
      ...accommodations.map((d) => ({ id: d.id, city: d.city, country: d.country, startDate: d.startDate })),
      ...restaurants.map((d) => ({ id: d.id, city: d.city, country: d.country, startDate: d.startDate })),
      ...cruises.map((d) => ({ id: d.id, city: d.city, country: d.country, startDate: d.startDate })),
    ];
    allItems.forEach((item) => {
      const location = item.city || item.country;
      const date = toYMD(item.startDate);
      if (location && date) fetchWeatherForItem(item.id, location, date);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip, destinations, activities, accommodations, restaurants, cruises]);

  const coverMedia = useMemo(
    () => (trip ? media.find((m) => m.id === trip.coverMediaId) : null),
    [trip, media]
  );

  const sortedMedia = useMemo(
    () =>
      [...media]
        .filter((m) => m.type === "image" || m.type === "video")
        .sort((a, b) => {
          const aWhen = getMillis(a.takenAt ?? a.createdAt);
          const bWhen = getMillis(b.takenAt ?? b.createdAt);
          if (aWhen !== bWhen) return aWhen - bWhen;
          return (a.id || "").localeCompare(b.id || "");
        }),
    [media]
  );

  const itinerary = useMemo(() => {
    if (!trip) return [];
    const primary = {
      id: "trip-primary",
      type: "Primary Destination",
      subcollection: "trip",
      name: trip.name || trip.city || trip.country || "Trip",
      startDate: trip.startDate || "",
      endDate: trip.endDate || "",
      city: trip.city || "",
      state: trip.state || "",
      country: trip.country || "",
      address: trip.specificAddress || "",
      phoneNumber: "", websiteUrl: "",
      notes: trip.description || "",
      review: "",
      qualityRating: null, valueRating: null, serviceRating: null,
      locationRating: null, foodRating: null, entertainmentRating: null,
      onShip: false, cruiseLine: "", shipName: "",
    };
    return [
      primary,
      ...destinations.map((d) => makeItinItem("Destination", "destinations", d)),
      ...activities.map((d) => makeItinItem("Activity", "activities", d)),
      ...accommodations.map((d) => makeItinItem("Accommodation", "accommodations", d)),
      ...restaurants.map((d) => makeItinItem("Restaurant", "restaurants", d)),
      ...cruises.map((d) => makeItinItem("Cruise", "cruises", d)),
    ].sort((a, b) => {
      if (a.type === "Primary Destination") return -1;
      if (b.type === "Primary Destination") return 1;
      const aDate = a.startDate ? new Date(a.startDate).getTime() : 0;
      const bDate = b.startDate ? new Date(b.startDate).getTime() : 0;
      return aDate - bDate;
    });
  }, [trip, destinations, activities, accommodations, restaurants, cruises]);

  const setCover = useCallback(async (mediaId) => {
    if (!trip) return;
    await updateDoc(doc(db, "trips", trip.id), { coverMediaId: mediaId, updatedAt: Date.now() });
  }, [trip]);

  const saveCaption = useCallback(async (mediaId, caption) => {
    await updateDoc(doc(db, "trips", tripId, "media", mediaId), { caption });
  }, [tripId]);

  const deleteMedia = useCallback((mediaId) => {
    Alert.alert("Delete Media", "Are you sure you want to delete this media?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteDoc(doc(db, "trips", tripId, "media", mediaId)); } },
    ]);
  }, [tripId]);

  const deleteExtra = useCallback((extraId) => {
    Alert.alert("Delete Extra", "Are you sure you want to delete this item?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => { await deleteDoc(doc(db, "trips", tripId, "extras", extraId)); } },
    ]);
  }, [tripId]);

  const handleViewPhotos = useCallback((itemId, subcollection) => {
    const itemMedia = media.filter(
      (m) => m.linkedId === itemId && m.linkedSubcollection === subcollection
    );
    setSelectedItemPhotos({ media: itemMedia, index: 0 });
  }, [media]);

  const fetchWeatherForItem = useCallback(async (itemId, location, dateStr) => {
    if (!location || !dateStr || !VISUAL_CROSSING_API_KEY) return;
    const cacheKey = `${location}_${dateStr}`;
    if (weatherCache.current[cacheKey]) {
      pendingWeather.current[itemId] = weatherCache.current[cacheKey];
    } else {
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
        const result = { high: Math.round(day.tempmax), low: Math.round(day.tempmin), conditions: day.conditions, icon: day.icon };
        weatherCache.current[cacheKey] = result;
        pendingWeather.current[itemId] = result;
      } catch {
        return;
      }
    }
    // Batch all weather arrivals into one setState
    if (weatherFlushTimer.current) clearTimeout(weatherFlushTimer.current);
    weatherFlushTimer.current = setTimeout(() => {
      weatherFlushTimer.current = null;
      const batch = pendingWeather.current;
      pendingWeather.current = {};
      if (Object.keys(batch).length > 0) {
        setWeather((prev) => ({ ...prev, ...batch }));
      }
    }, 80);
  }, []);

  const handleItinCall = useCallback((phone) => Linking.openURL(`tel:${phone}`), []);
  const handleItinDirections = useCallback((item) => {
    const dest = [item.address, item.city, item.state, item.country].filter(Boolean).join(", ");
    Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}`);
  }, []);
  const handleItinWebsite = useCallback((url) => {
    Linking.openURL(url.startsWith("http") ? url : `https://${url}`);
  }, []);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!trip) return null;

  const locationStr = [trip.city, trip.state, trip.country].filter(Boolean).join(", ");

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        {/* Cover Image */}
        <View style={styles.coverContainer}>
          {coverMedia?.type === "image" ? (
            <Image
              source={{ uri: coverMedia.downloadURL }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          ) : coverMedia?.type === "video" ? (
            <View style={styles.videoCover}>
              <Text style={styles.videoIcon}>▶</Text>
            </View>
          ) : (
            <View style={styles.noCover}>
              <Text style={styles.noCoverText}>No cover photo</Text>
            </View>
          )}
        </View>

        {/* Trip Header */}
        <View style={styles.header}>
          <Text style={styles.tripName}>{trip.name}</Text>
          <Text style={styles.location}>{locationStr}</Text>
          <Text style={styles.dates}>{dateRangeOf(trip)}</Text>

          {trip.originCity && (
            <Text style={styles.originText}>
              From {trip.originCity}
              {trip.originState ? `, ${trip.originState}` : ""}
              {trip.originCountry ? `, ${trip.originCountry}` : ""}
            </Text>
          )}

          {trip.totalMiles !== null && trip.totalMiles !== undefined && (
            <Text style={styles.milesText}>
              {trip.totalMiles.toLocaleString()} miles traveled
            </Text>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowFlipbook(true)}
            >
              <Text style={styles.primaryButtonText}>Open Flipbook</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* b. Trip Map */}
        <View style={styles.section}>
          <TripDetailMap
            trip={trip}
            destinations={destinations}
            activities={activities}
            restaurants={restaurants}
          />
        </View>

        {/* Description (below map) */}
        {trip.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{trip.description}</Text>
          </View>
        )}

        {/* c. Itinerary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itinerary</Text>
          {itinerary.length === 0 ? (
            <Text style={styles.emptyText}>No itinerary entries yet</Text>
          ) : (
            itinerary.map((item, index) => (
              <ItineraryCard
                key={`${item.type}-${item.id}`}
                item={item}
                itemWeather={weather[item.id]}
                isFirst={index === 0}
                onCall={handleItinCall}
                onDirections={handleItinDirections}
                onWebsite={handleItinWebsite}
                onPhotos={setItinFlipbook}
                onSearch={setBookingDest}
                onWeather={setWeatherDest}
              />
            ))
          )}
        </View>

        {/* d. Destinations */}
        <PlaceSection title="Destinations" items={destinations} subcollection="destinations" onViewPhotos={handleViewPhotos} />

        {/* e. Activities */}
        <PlaceSection title="Activities" items={activities} subcollection="activities" onViewPhotos={handleViewPhotos} />

        {/* f. Accommodations */}
        <PlaceSection title="Accommodations" items={accommodations} subcollection="accommodations" onViewPhotos={handleViewPhotos} />

        {/* g. Restaurants */}
        <PlaceSection title="Restaurants" items={restaurants} subcollection="restaurants" onViewPhotos={handleViewPhotos} />

        {/* Cruises */}
        <PlaceSection title="Cruises" items={cruises} subcollection="cruises" onViewPhotos={handleViewPhotos} />

        {/* Extras / Others */}
        <ExtrasSection items={extras} onDelete={deleteExtra} />

        {/* h. Photos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photosGrid}>
            {sortedMedia.map((m, index) => (
              <View key={m.id} style={styles.photoCard}>
                <TouchableOpacity
                  onPress={() => {
                    setFlipbookIndex(index);
                    setShowFlipbook(true);
                  }}
                >
                  {m.type === "image" ? (
                    <Image
                      source={{ uri: m.downloadURL }}
                      style={styles.photoImage}
                      resizeMode="cover"
                    />
                  ) : (
                    <View style={styles.videoThumbnail}>
                      <Text style={styles.videoIcon}>▶</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.photoActions}>
                  <TouchableOpacity onPress={() => setCover(m.id)}>
                    <Text style={styles.photoActionText}>
                      {trip.coverMediaId === m.id ? "✓ Cover" : "Set as cover"}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteMedia(m.id)}>
                    <Text style={styles.deleteText}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.captionInput}
                  value={
                    editingCaption?.id === m.id ? editingCaption.text : m.caption || ""
                  }
                  onChangeText={(text) =>
                    setEditingCaption({ id: m.id, text })
                  }
                  onBlur={() => {
                    if (editingCaption?.id === m.id) {
                      saveCaption(m.id, editingCaption.text);
                      setEditingCaption(null);
                    }
                  }}
                  placeholder="Add a caption..."
                  placeholderTextColor={COLORS.muted}
                  multiline
                />
              </View>
            ))}
          </View>
          {sortedMedia.length === 0 && (
            <Text style={styles.emptyText}>No photos yet</Text>
          )}
        </View>
      </ScrollView>

      {/* Itinerary item Photos modal */}
      {itinFlipbook && (
        <ItemFlipbook
          tripId={tripId}
          linkedId={itinFlipbook.id}
          subcollection={itinFlipbook.subcollection}
          itemName={itinFlipbook.name}
          visible={!!itinFlipbook}
          onClose={() => setItinFlipbook(null)}
        />
      )}

      {/* Itinerary Search bookings modal */}
      {bookingDest && (
        <SearchBookingsModal
          visible={!!bookingDest}
          destinationName={bookingDest.name}
          destinationLocation={bookingDest.location}
          onClose={() => setBookingDest(null)}
        />
      )}

      {/* Itinerary Weather modal */}
      {weatherDest && (
        <WeatherModal
          visible={!!weatherDest}
          locationName={weatherDest.name}
          locationQuery={weatherDest.location}
          onClose={() => setWeatherDest(null)}
        />
      )}

      {/* Flipbook Modal */}
      {showFlipbook && (
        <FlipbookModal
          media={sortedMedia}
          initialIndex={flipbookIndex}
          onClose={() => setShowFlipbook(false)}
        />
      )}

      {/* Item Photos Modal */}
      {selectedItemPhotos && (
        <FlipbookModal
          media={selectedItemPhotos.media}
          initialIndex={selectedItemPhotos.index}
          onClose={() => setSelectedItemPhotos(null)}
        />
      )}
    </View>
  );
}

const PlaceSection = React.memo(function PlaceSection({ title, items, subcollection, onViewPhotos }) {
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <PlaceCard key={item.id} item={item} subcollection={subcollection} onViewPhotos={onViewPhotos} />
      ))}
    </View>
  );
});

const PlaceCard = React.memo(function PlaceCard({ item, subcollection, onViewPhotos }) {
  const location = item.onShip
    ? "On Ship"
    : [item.address, item.city, item.state, item.country]
        .filter(Boolean)
        .join(", ");

  return (
    <View style={styles.placeCard}>
      <View style={styles.placeHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.placeName}>{item.name}</Text>
          {item.cruiseLine && (
            <Text style={styles.placeSubtitle}>{item.cruiseLine}</Text>
          )}
          {item.shipName && (
            <Text style={styles.placeSubtitle}>{item.shipName}</Text>
          )}
          <Text style={styles.placeLocation}>
            {formatDate(item.startDate)}
            {item.endDate ? ` → ${formatDate(item.endDate)}` : ""}
            {location && ` • ${location}`}
          </Text>
        </View>
        <TouchableOpacity onPress={() => onViewPhotos(item.id, subcollection)}>
          <Text style={styles.viewPhotosLink}>View Photos</Text>
        </TouchableOpacity>
      </View>

      {item.transportationMode && (
        <Text style={styles.placeDetail}>
          Transport: {item.transportationMode}
        </Text>
      )}

      {item.phoneNumber && (
        <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.phoneNumber}`)}>
          <Text style={styles.placeDetailLink}>
            Phone: {formatPhoneNumber(item.phoneNumber)}
          </Text>
        </TouchableOpacity>
      )}

      {item.websiteUrl && (
        <TouchableOpacity onPress={() => Linking.openURL(item.websiteUrl)}>
          <Text style={styles.placeDetailLink} numberOfLines={1}>
            Website: {item.websiteUrl}
          </Text>
        </TouchableOpacity>
      )}

      {/* Ratings */}
      {(item.qualityRating ||
        item.valueRating ||
        item.serviceRating ||
        item.locationRating ||
        item.foodRating ||
        item.entertainmentRating) && (
        <View style={styles.ratingsContainer}>
          {item.qualityRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Quality:</Text>
              <StarRating rating={item.qualityRating} />
            </View>
          )}
          {item.valueRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Value:</Text>
              <StarRating rating={item.valueRating} />
            </View>
          )}
          {item.serviceRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Service:</Text>
              <StarRating rating={item.serviceRating} />
            </View>
          )}
          {item.locationRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Location:</Text>
              <StarRating rating={item.locationRating} />
            </View>
          )}
          {item.foodRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Food:</Text>
              <StarRating rating={item.foodRating} />
            </View>
          )}
          {item.entertainmentRating && (
            <View style={styles.ratingRow}>
              <Text style={styles.ratingLabel}>Entertainment:</Text>
              <StarRating rating={item.entertainmentRating} />
            </View>
          )}
        </View>
      )}

      {item.notes && (
        <View style={styles.textBlock}>
          <Text style={styles.textBlockLabel}>Notes:</Text>
          <Text style={styles.textBlockContent}>{item.notes}</Text>
        </View>
      )}

      {item.review && (
        <View style={styles.textBlock}>
          <Text style={styles.textBlockLabel}>Review:</Text>
          <Text style={styles.textBlockContent}>{item.review}</Text>
        </View>
      )}
    </View>
  );
});

const EXTRA_TYPE_LABELS = {
  insurance: "Travel Insurance",
  rental_car: "Car Rental",
  esim: "eSIM",
  parking: "Parking",
  tour: "Tour",
  transfer: "Transfer",
  visa: "Visa",
  flight: "Flight",
  other: "Other",
};

function ExtrasSection({ items, onDelete }) {
  if (items.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Others</Text>
      {items.map((item) => (
        <ExtraCard key={item.id} item={item} onDelete={() => onDelete(item.id)} />
      ))}
    </View>
  );
}

function ExtraCard({ item, onDelete }) {
  const typeLabel =
    EXTRA_TYPE_LABELS[item.extraType] ||
    (item.extraType
      ? item.extraType.charAt(0).toUpperCase() + item.extraType.slice(1)
      : "Other");

  const dateStr = item.startDate
    ? item.endDate && item.endDate !== item.startDate
      ? `${formatDate(item.startDate)} → ${formatDate(item.endDate)}`
      : formatDate(item.startDate)
    : null;

  const locationStr = [item.city, item.state, item.country]
    .filter(Boolean)
    .join(", ");

  return (
    <View style={styles.placeCard}>
      <View style={styles.placeHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.extraTypeBadge}>
            <Text style={styles.extraTypeBadgeText}>{typeLabel}</Text>
          </View>
          <Text style={styles.placeName}>{item.name}</Text>
          {item.provider ? (
            <Text style={styles.placeSubtitle}>{item.provider}</Text>
          ) : null}
        </View>
        <TouchableOpacity onPress={onDelete}>
          <Text style={styles.deleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {dateStr ? (
        <Text style={styles.placeDetail}>📅 {dateStr}</Text>
      ) : null}
      {locationStr ? (
        <Text style={styles.placeDetail}>📍 {locationStr}</Text>
      ) : null}
      {item.confirmationNumber ? (
        <Text style={styles.placeDetail}>🔖 Confirmation: {item.confirmationNumber}</Text>
      ) : null}
      {item.amount ? (
        <Text style={styles.placeDetail}>💳 {item.amount}</Text>
      ) : null}
      {item.websiteUrl ? (
        <TouchableOpacity onPress={() => Linking.openURL(item.websiteUrl)}>
          <Text style={styles.placeDetailLink} numberOfLines={1}>
            Website: {item.websiteUrl}
          </Text>
        </TouchableOpacity>
      ) : null}
      {item.notes ? (
        <View style={styles.textBlock}>
          <Text style={styles.textBlockLabel}>Notes:</Text>
          <Text style={styles.textBlockContent}>{item.notes}</Text>
        </View>
      ) : null}
    </View>
  );
}

function StarRating({ rating }) {
  return (
    <View style={styles.starsContainer}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Text
          key={star}
          style={[
            styles.star,
            star <= rating ? styles.starFilled : styles.starEmpty,
          ]}
        >
          ★
        </Text>
      ))}
    </View>
  );
}

function FlipbookModal({ media, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % media.length);
  };

  if (media.length === 0) {
    return (
      <Modal visible transparent animationType="fade">
        <View style={styles.flipbookContainer}>
          <View style={styles.flipbookHeader}>
            <Text style={styles.flipbookTitle}>No media</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.flipbookClose}>Close</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.flipbookContent}>
            <Text style={styles.noMediaText}>No media available</Text>
          </View>
        </View>
      </Modal>
    );
  }

  const currentMedia = media[currentIndex];

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.flipbookContainer}>
        <View style={styles.flipbookHeader}>
          <Text style={styles.flipbookTitle}>
            {currentIndex + 1} / {media.length}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.flipbookClose}>Close</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.flipbookContent}>
          {currentMedia.type === "image" ? (
            <Image
              source={{ uri: currentMedia.downloadURL }}
              style={styles.flipbookImage}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.videoPlaceholder}>
              <Text style={styles.videoIcon}>▶</Text>
              <Text style={styles.videoText}>Video playback</Text>
            </View>
          )}

          {media.length > 1 && (
            <>
              <TouchableOpacity
                style={[styles.flipbookNav, styles.flipbookNavLeft]}
                onPress={handlePrev}
              >
                <Text style={styles.flipbookNavText}>‹</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.flipbookNav, styles.flipbookNavRight]}
                onPress={handleNext}
              >
                <Text style={styles.flipbookNavText}>›</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {currentMedia.caption && (
          <View style={styles.flipbookCaption}>
            <Text style={styles.flipbookCaptionText}>
              {currentMedia.caption}
            </Text>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 16,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  coverContainer: {
    width: "100%",
    height: 300,
    backgroundColor: COLORS.surfaceLight,
  },
  coverImage: {
    width: "100%",
    height: "100%",
  },
  videoCover: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  noCover: {
    width: "100%",
    height: "100%",
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  noCoverText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  videoIcon: {
    fontSize: 48,
    color: COLORS.white,
  },
  header: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
  },
  tripName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  location: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  dates: {
    fontSize: 14,
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  originText: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  milesText: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: "center",
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  secondaryButtonText: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "600",
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  section: {
    padding: SPACING.md,
    backgroundColor: COLORS.background,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  description: {
    fontSize: 14,
    color: COLORS.foreground,
    lineHeight: 20,
  },
  photosGrid: {
    gap: SPACING.md,
  },
  photoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  photoImage: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
  },
  videoThumbnail: {
    width: "100%",
    height: 200,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  photoActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  photoActionText: {
    fontSize: 12,
    color: COLORS.primary,
  },
  deleteText: {
    fontSize: 12,
    color: COLORS.error,
  },
  captionInput: {
    fontSize: 14,
    color: COLORS.foreground,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: SPACING.xs,
    marginTop: SPACING.xs,
    minHeight: 40,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    paddingVertical: SPACING.lg,
  },
  itineraryItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  itineraryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.xs,
  },
  itineraryKind: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "600",
  },
  viewPhotosLink: {
    fontSize: 12,
    color: COLORS.primary,
  },
  itineraryName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  itineraryDates: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  itineraryLocation: {
    fontSize: 12,
    color: COLORS.muted,
  },
  placeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    padding: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  placeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  placeName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  placeSubtitle: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  placeLocation: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  placeDetail: {
    fontSize: 12,
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  placeDetailLink: {
    fontSize: 12,
    color: COLORS.primary,
    marginBottom: SPACING.xs,
  },
  ratingsContainer: {
    marginTop: SPACING.xs,
    gap: SPACING.xs,
  },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
  },
  ratingLabel: {
    fontSize: 12,
    color: COLORS.muted,
    width: 90,
  },
  starsContainer: {
    flexDirection: "row",
    gap: 2,
  },
  star: {
    fontSize: 16,
  },
  starFilled: {
    color: "#FFD700",
  },
  starEmpty: {
    color: "#D1D5DB",
  },
  extraTypeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
    marginBottom: SPACING.xs,
  },
  extraTypeBadgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  textBlock: {
    marginTop: SPACING.sm,
  },
  textBlockLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  textBlockContent: {
    fontSize: 14,
    color: COLORS.foreground,
    lineHeight: 20,
  },
  flipbookContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  flipbookHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.md,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  flipbookTitle: {
    fontSize: 16,
    color: COLORS.white,
    fontWeight: "600",
  },
  flipbookClose: {
    fontSize: 16,
    color: COLORS.white,
  },
  flipbookContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  flipbookImage: {
    width: width,
    height: height - 200,
  },
  videoPlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  videoText: {
    color: COLORS.white,
    fontSize: 16,
    marginTop: SPACING.sm,
  },
  noMediaText: {
    color: COLORS.white,
    fontSize: 16,
  },
  flipbookNav: {
    position: "absolute",
    top: "50%",
    backgroundColor: "rgba(255,255,255,0.2)",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  flipbookNavLeft: {
    left: SPACING.md,
  },
  flipbookNavRight: {
    right: SPACING.md,
  },
  flipbookNavText: {
    fontSize: 32,
    color: COLORS.white,
    fontWeight: "bold",
  },
  flipbookCaption: {
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  flipbookCaptionText: {
    fontSize: 14,
    color: COLORS.white,
    textAlign: "center",
  },

  // ── Rich itinerary card styles ──
  itinCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  itinCardFirst: {
    borderWidth: 1,
    borderColor: COLORS.primary + "44",
  },
  itinCardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  itinCardHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: SPACING.sm,
  },
  itinKindIcon: {
    fontSize: 22,
    marginRight: SPACING.sm,
    marginTop: 2,
  },
  itinKindBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 4,
  },
  itinKindText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  itinItemName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.foreground,
    lineHeight: 20,
  },
  itinWeatherBadge: {
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 60,
  },
  itinWeatherEmoji: {
    fontSize: 20,
  },
  itinWeatherTemp: {
    fontSize: 11,
    color: COLORS.foreground,
    fontWeight: "600",
    marginTop: 2,
  },
  itinDetailsBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingTop: SPACING.sm,
    marginBottom: SPACING.sm,
    gap: 5,
  },
  itinDetailRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  itinDetailIcon: {
    marginRight: 5,
    marginTop: 1,
    flexShrink: 0,
  },
  itinDetailText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  itinNotesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 2,
  },
  itinNotesText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
    fontStyle: "italic",
    lineHeight: 18,
  },
  itinRatingsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: SPACING.sm,
  },
  itinRatingChip: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    alignItems: "center",
  },
  itinRatingChipLabel: {
    fontSize: 9,
    color: COLORS.muted,
    fontWeight: "600",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  itinRatingChipStars: {
    fontSize: 11,
    color: "#f59e0b",
    letterSpacing: 1,
  },
  itinActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
    paddingTop: SPACING.sm,
  },
  itinActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.background,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  itinActionLabel: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "500",
  },
});
