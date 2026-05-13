import React, { useEffect, useState, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  ActivityIndicator,
  InteractionManager,
} from "react-native";
import CalendarPickerModal from "../components/CalendarPickerModal";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import SubscriptionRequiredModal from "../components/SubscriptionRequiredModal";
import TravelOverview from "../components/TravelOverview";
import WorldMap from "../components/WorldMap";
import TripCard from "../components/TripCard";
import EditTripModal from "../components/modals/EditTripModal";
import ShareTripModal from "../components/modals/ShareTripModal";
import PhotosModal from "../components/modals/PhotosModal";
import ItineraryModal from "../components/modals/ItineraryModal";
import PlaceModal from "../components/modals/PlaceModal";
import ConfirmModal from "../components/modals/ConfirmModal";
import AddTripModal from "../components/modals/AddTripModal";
import FeedbackModal from "../components/modals/FeedbackModal";
import {
  COLORS,
  SPACING,
  SCREENS,
  scaleFontSize,
  scaleSpacing,
} from "../lib/constants";
import { dateRangeOf, formatDateMMDDYYYY } from "../lib/utils";
import { calculateDistance } from "../lib/geocoding";

// Countdown Timer Component
function CountdownTimer({ targetDate }) {
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    mins: 0,
    secs: 0,
  });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const difference = target - now;

      if (difference <= 0) {
        return { days: 0, hours: 0, mins: 0, secs: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
        ),
        mins: Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60)),
        secs: Math.floor((difference % (1000 * 60)) / 1000),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const pad = (num) => String(num).padStart(2, "0");

  return (
    <View style={countdownStyles.container}>
      <View style={countdownStyles.timeBlock}>
        <Text style={countdownStyles.timeValue}>{timeLeft.days}</Text>
        <Text style={countdownStyles.timeLabel}>DAYS</Text>
      </View>
      <Text style={countdownStyles.separator}>:</Text>
      <View style={countdownStyles.timeBlock}>
        <Text style={countdownStyles.timeValue}>{pad(timeLeft.hours)}</Text>
        <Text style={countdownStyles.timeLabel}>HRS</Text>
      </View>
      <Text style={countdownStyles.separator}>:</Text>
      <View style={countdownStyles.timeBlock}>
        <Text style={countdownStyles.timeValue}>{pad(timeLeft.mins)}</Text>
        <Text style={countdownStyles.timeLabel}>MIN</Text>
      </View>
      <Text style={countdownStyles.separator}>:</Text>
      <View style={countdownStyles.timeBlock}>
        <Text style={countdownStyles.timeValue}>{pad(timeLeft.secs)}</Text>
        <Text style={countdownStyles.timeLabel}>SEC</Text>
      </View>
    </View>
  );
}

const countdownStyles = StyleSheet.create({
  container: {
    position: "absolute",
    top: scaleSpacing(SPACING.sm),
    right: scaleSpacing(SPACING.sm),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 8,
    paddingVertical: scaleSpacing(SPACING.xs),
    paddingHorizontal: scaleSpacing(SPACING.xs),
  },
  timeBlock: {
    alignItems: "center",
    minWidth: scaleFontSize(32),
  },
  timeValue: {
    fontSize: scaleFontSize(16),
    fontWeight: "bold",
    color: COLORS.white,
  },
  timeLabel: {
    fontSize: scaleFontSize(8),
    color: COLORS.white,
    opacity: 0.8,
    marginTop: 1,
  },
  separator: {
    fontSize: scaleFontSize(16),
    fontWeight: "bold",
    color: COLORS.white,
    marginHorizontal: 1,
    marginBottom: scaleFontSize(10),
  },
});

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation();
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [pendingBookingsCount, setPendingBookingsCount] = useState(0);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [stats, setStats] = useState({
    totalTrips: 0,
    daysExplored: 0,
    photosCaptured: 0,
    totalMiles: 0,
    countriesVisited: 0,
    statesVisited: 0,
    citiesVisited: 0,
    transportationCounts: {},
    accommodationCounts: {},
  });
  const [statsVersion, setStatsVersion] = useState(0);
  const statsVersionTimerRef = useRef(null);
  const prevStatsTripsRef = useRef("");
  const [showWorldMap, setShowWorldMap] = useState(false);
  const worldMapRevealedRef = useRef(false);

  // Modal states
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [editingTrip, setEditingTrip] = useState(null);
  const [shareTrip, setShareTrip] = useState(null);
  const [photosTrip, setPhotosTrip] = useState(null);
  const [itineraryTrip, setItineraryTrip] = useState(null);
  const [destinationsTrip, setDestinationsTrip] = useState(null);
  const [activitiesTrip, setActivitiesTrip] = useState(null);
  const [accommodationsTrip, setAccommodationsTrip] = useState(null);
  const [restaurantsTrip, setRestaurantsTrip] = useState(null);
  const [cruisesTrip, setCruisesTrip] = useState(null);
  const [othersTrip, setOthersTrip] = useState(null);
  const [deleteTrip, setDeleteTrip] = useState(null);
  const [showMenu, setShowMenu] = useState(null);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  // Check subscription (must have valid status AND not expired)
  const subscription = profile?.subscription;
  const isSubscribed =
    (subscription?.status === "active" ||
      subscription?.status === "trialing") &&
    !subscription?.cancelAtPeriodEnd &&
    subscription?.currentPeriodEnd > Date.now();

  // Trip action handlers — useCallback so TripCard receives stable references
  const handleMenu = useCallback((trip) => setShowMenu(trip), []);
  const handleEdit = useCallback((trip) => setEditingTrip(trip), []);
  const handleShare = useCallback((trip) => setShareTrip(trip), []);
  const handleDelete = useCallback((trip) => setDeleteTrip(trip), []);

  async function confirmDelete() {
    if (!deleteTrip) return;
    try {
      await deleteDoc(doc(db, "trips", deleteTrip.id));
      setDeleteTrip(null);
    } catch (error) {}
  }

  // Fetch recent trips for display
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "trips"),
      where("ownerId", "==", user.uid),
      orderBy("startDate", "desc"),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setTrips(arr);

        // Find all upcoming trips (sorted by startDate ascending - nearest first)
        const today = new Date().toISOString().split("T")[0];
        const upcoming = arr
          .filter((t) => t.startDate >= today)
          .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
        setUpcomingTrips(upcoming);
      },
      () => setTrips([]),
    );

    return () => unsub();
  }, [user]);

  // Listen to pending bookings count
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "users", user.uid, "pendingBookings"),
      where("status", "==", "pending"),
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        setPendingBookingsCount(snap.size);
      },
      () => {},
    );
    return () => unsub();
  }, [user]);

  // Filter trips based on date range
  const filteredTrips = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : null;
    const to = dateTo ? new Date(dateTo).getTime() : null;
    return trips.filter((t) => {
      const s = new Date(t.startDate).getTime();
      const e = new Date(t.endDate).getTime();
      if (from && e < from) return false;
      if (to && s > to) return false;
      return true;
    });
  }, [trips, dateFrom, dateTo]);

  // Set up real-time listeners for trip subcollections to trigger stats recalculation.
  // Deferred via InteractionManager so the initial login navigation animation completes
  // before we open N×4 Firestore connections. Media is excluded — photo count changes
  // on the home screen are low priority and media subcollections can be very large.
  useEffect(() => {
    if (!user || filteredTrips.length === 0) return;

    const bumpStats = () => {
      if (statsVersionTimerRef.current) clearTimeout(statsVersionTimerRef.current);
      statsVersionTimerRef.current = setTimeout(
        () => setStatsVersion((v) => v + 1),
        1500,
      );
    };

    const unsubscribers = [];
    let taskDone = false;

    const task = InteractionManager.runAfterInteractions(() => {
      taskDone = true;
      for (const trip of filteredTrips) {
        unsubscribers.push(onSnapshot(collection(db, "trips", trip.id, "destinations"),   bumpStats));
        unsubscribers.push(onSnapshot(collection(db, "trips", trip.id, "activities"),     bumpStats));
        unsubscribers.push(onSnapshot(collection(db, "trips", trip.id, "accommodations"), bumpStats));
        unsubscribers.push(onSnapshot(collection(db, "trips", trip.id, "restaurants"),    bumpStats));
      }
    });

    return () => {
      if (!taskDone) task.cancel();
      unsubscribers.forEach((unsub) => unsub());
      if (statsVersionTimerRef.current) clearTimeout(statsVersionTimerRef.current);
    };
  }, [user, filteredTrips]);

  // Reveal WorldMap after the page has had time to render core content.
  // The WebView is expensive — deferring it lets trips, stats, and the
  // welcome section paint first so the screen feels instantly responsive.
  useEffect(() => {
    if (filteredTrips.length === 0 || worldMapRevealedRef.current) return;
    worldMapRevealedRef.current = true;
    const timer = setTimeout(() => setShowWorldMap(true), 1200);
    return () => clearTimeout(timer);
  }, [filteredTrips]);

  // Calculate comprehensive travel stats.
  // Wrapped in InteractionManager so any in-flight navigation tap / animation
  // finishes before the heavy Firestore reads begin — keeps the UI responsive.
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      runCalculateStats();
    });

    const runCalculateStats = async () => {
      try {
        const cSet = new Set();
        const sSet = new Set();
        const citySet = new Set();
        let imgTotal = 0;
        let totalDays = 0;
        let totalMiles = 0;
        const transportCounts = {};
        const accommodationCounts = {};

        const todayStr = new Date().toISOString().split("T")[0];
        const pastTrips = filteredTrips.filter(
          (t) => !t.startDate || t.startDate <= todayStr,
        );

        // PHASE 1: Fetch all subcollections in parallel — also collect destinations
        // data now so we don't need extra Firestore reads during miles computation.
        const tripDestinationsMap = new Map();

        await Promise.all(
          pastTrips.map(async (t) => {
            if (t.startDate && t.endDate) {
              const start = new Date(t.startDate);
              const end = new Date(t.endDate);
              const days =
                Math.ceil(
                  (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
                ) + 1;
              totalDays += days;
            }

            if (t.country) cSet.add(t.country);
            const isUSA =
              t.country &&
              [
                "united states",
                "usa",
                "us",
                "united states of america",
              ].includes(t.country.toLowerCase().trim());
            if (t.state && t.state.trim() && isUSA) sSet.add(t.state.trim());
            if (t.city) citySet.add(`${t.city}|${t.country || ""}`);
            if (t.originTransportationType) {
              transportCounts[t.originTransportationType] =
                (transportCounts[t.originTransportationType] || 0) + 1;
            }

            const [destSnap, actSnap, accomSnap, restaurantSnap, mediaSnap] =
              await Promise.all([
                getDocs(collection(db, "trips", t.id, "destinations")),
                getDocs(collection(db, "trips", t.id, "activities")),
                getDocs(collection(db, "trips", t.id, "accommodations")),
                getDocs(collection(db, "trips", t.id, "restaurants")),
                getDocs(collection(db, "trips", t.id, "media")),
              ]);

            const destinations = [];
            destSnap.forEach((d) => {
              const dest = d.data();
              destinations.push(dest);
              if (dest.country) cSet.add(dest.country);
              const destIsUSA =
                dest.country &&
                [
                  "united states",
                  "usa",
                  "us",
                  "united states of america",
                ].includes(dest.country.toLowerCase().trim());
              if (dest.state && dest.state.trim() && destIsUSA)
                sSet.add(dest.state.trim());
              if (dest.city) citySet.add(`${dest.city}|${dest.country || ""}`);
              if (
                dest.transportationType &&
                dest.transportationType !== "Cruise"
              ) {
                transportCounts[dest.transportationType] =
                  (transportCounts[dest.transportationType] || 0) + 1;
              }
            });
            // Store for phase 2 miles computation (no extra reads needed)
            tripDestinationsMap.set(t.id, destinations);

            actSnap.forEach((a) => {
              const act = a.data();
              if (
                act.transportationType &&
                act.transportationType !== "Cruise"
              ) {
                transportCounts[act.transportationType] =
                  (transportCounts[act.transportationType] || 0) + 1;
              }
            });

            accomSnap.forEach((a) => {
              const acc = a.data();
              if (acc.onShip) {
                accommodationCounts["Cruise"] =
                  (accommodationCounts["Cruise"] || 0) + 1;
              } else if (acc.accommodationType) {
                accommodationCounts[acc.accommodationType] =
                  (accommodationCounts[acc.accommodationType] || 0) + 1;
              }
              if (
                acc.transportationType &&
                acc.transportationType !== "Cruise"
              ) {
                transportCounts[acc.transportationType] =
                  (transportCounts[acc.transportationType] || 0) + 1;
              }
            });

            restaurantSnap.forEach((r) => {
              const rest = r.data();
              if (
                rest.transportationType &&
                rest.transportationType !== "Cruise"
              ) {
                transportCounts[rest.transportationType] =
                  (transportCounts[rest.transportationType] || 0) + 1;
              }
            });

            mediaSnap.forEach((m) => {
              const mm = m.data();
              if (mm.type === "image") imgTotal += 1;
            });
          }),
        );

        // Determine whether the trip list itself changed.
        // prevStatsTripsRef is only written after Phase 2 *completes* — if Phase 2
        // is cancelled mid-run (effect cleanup), the ref stays at the old value so
        // the next run still sees tripListChanged=true and retries geocoding.
        const currentTripIds = pastTrips.map((t) => t.id).sort().join(",");
        const tripListChanged = currentTripIds !== prevStatsTripsRef.current;

        // Show stats immediately — no geocoding needed yet.
        // Preserve totalMiles from previous state when Phase 2 will be skipped so
        // navigating away and back doesn't flash the value back to 0.
        if (cancelled) return;
        setStats((prev) => ({
          totalTrips: pastTrips.length,
          daysExplored: totalDays,
          photosCaptured: imgTotal,
          totalMiles: tripListChanged ? 0 : prev.totalMiles,
          countriesVisited: cSet.size,
          statesVisited: sSet.size,
          citiesVisited: citySet.size,
          transportationCounts: transportCounts,
          accommodationCounts: accommodationCounts,
        }));

        // PHASE 2: Compute miles for all trips — same logic as web, always recalculates.
        // Only runs when the trip list changes; ref is written on completion so a
        // cancelled run is automatically retried on the next effect fire.
        if (tripListChanged && pastTrips.length > 0) {
          let additionalMiles = 0;
          for (const t of pastTrips) {
            try {
              const destinations = tripDestinationsMap.get(t.id) || [];
              destinations.sort((a, b) =>
                a.startDate && b.startDate
                  ? new Date(a.startDate).getTime() -
                    new Date(b.startDate).getTime()
                  : 0,
              );
              const allLocations = [];
              if (t.city && t.country)
                allLocations.push({
                  city: t.city,
                  state: t.state,
                  country: t.country,
                  date: t.startDate || "",
                });
              for (const dest of destinations) {
                if (dest.city && dest.country && dest.startDate)
                  allLocations.push({
                    city: dest.city,
                    state: dest.state,
                    country: dest.country,
                    date: dest.startDate,
                  });
              }
              allLocations.sort((a, b) =>
                !a.date || !b.date
                  ? 0
                  : new Date(a.date).getTime() - new Date(b.date).getTime(),
              );
              let tripMiles = 0;
              if (allLocations.length > 0) {
                const firstLoc = allLocations[0];
                tripMiles += await calculateDistance(
                  t.originCity,
                  t.originState,
                  t.originCountry,
                  firstLoc.city,
                  firstLoc.state,
                  firstLoc.country,
                );
                for (let i = 1; i < allLocations.length; i++) {
                  const p = allLocations[i - 1],
                    c = allLocations[i];
                  tripMiles += await calculateDistance(
                    p.city,
                    p.state,
                    p.country,
                    c.city,
                    c.state,
                    c.country,
                  );
                }
              }
              additionalMiles += tripMiles;
              // Save per-trip miles to Firestore so the badges screen can use
              // them for Distance & Mileage badge evaluation — mirrors web behavior.
              const rounded = Math.round(tripMiles);
              if (rounded > 0 && rounded !== (t.totalMiles ?? 0)) {
                updateDoc(doc(db, "trips", t.id), { totalMiles: rounded }).catch(() => {});
              }
            } catch {}
          }
          if (cancelled) return;
          // Mark completion so future runs with the same trips skip Phase 2.
          prevStatsTripsRef.current = currentTripIds;
          if (additionalMiles > 0) {
            setStats((prev) => ({
              ...prev,
              totalMiles: prev.totalMiles + Math.round(additionalMiles),
            }));
          }
        }
      } catch (error) {}
    };

    return () => {
      cancelled = true;
      task.cancel();
    };
  }, [user, filteredTrips, statsVersion]);

  function onRefresh() {
    setRefreshing(true);
    // The onSnapshot will update automatically
    setTimeout(() => setRefreshing(false), 1000);
  }

  if (!user) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.landingContent}
      >
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Ten Miles Ahead</Text>
          <Text style={styles.heroSubtitle}>
            Your personal travel companion. Plan trips, capture memories, and
            share adventures.
          </Text>
          <TouchableOpacity
            style={styles.heroButton}
            onPress={() => navigation.navigate(SCREENS.SIGN_UP)}
          >
            <Text style={styles.heroButtonText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate(SCREENS.SIGN_IN)}
          >
            <Text style={styles.secondaryButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>🗺</Text>
            <Text style={styles.featureTitle}>Plan Your Trips</Text>
            <Text style={styles.featureText}>
              Organize destinations, accommodations, and activities in one
              place.
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📸</Text>
            <Text style={styles.featureTitle}>Capture Memories</Text>
            <Text style={styles.featureText}>
              Upload photos and videos to document your journey.
            </Text>
          </View>
          <View style={styles.featureCard}>
            <Text style={styles.featureIcon}>📖</Text>
            <Text style={styles.featureTitle}>Create Photobooks</Text>
            <Text style={styles.featureText}>
              Turn your trip photos into beautiful digital photobooks.
            </Text>
          </View>
        </View>
      </ScrollView>
    );
  }

  if (!isSubscribed) {
    return <SubscriptionRequiredModal />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      removeClippedSubviews={true}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <Text style={styles.welcomeText}>Welcome,</Text>
        <Text style={styles.welcomeName}>
          {profile?.username || "traveler"}!
        </Text>
      </View>

      {/* Pending Bookings Banner */}
      {pendingBookingsCount > 0 && (
        <TouchableOpacity
          style={styles.pendingBookingsBanner}
          onPress={() => navigation.navigate(SCREENS.BOOKINGS)}
          activeOpacity={0.8}
        >
          <View style={styles.pendingBookingsBannerLeft}>
            <Text style={styles.pendingBookingsIcon}>🕐</Text>
            <View>
              <Text style={styles.pendingBookingsTitle}>
                {pendingBookingsCount} Pending{" "}
                {pendingBookingsCount === 1 ? "Booking" : "Bookings"}
              </Text>
              <Text style={styles.pendingBookingsSubtitle}>
                Tap to assign {pendingBookingsCount === 1 ? "it" : "them"} to a
                trip
              </Text>
            </View>
          </View>
          <Text style={styles.pendingBookingsArrow}>→</Text>
        </TouchableOpacity>
      )}

      {/* Upcoming Trips */}
      {upcomingTrips.length > 0 && (
        <View style={styles.upcomingSection}>
          <Text style={styles.upcomingSectionTitle}>
            Upcoming {upcomingTrips.length === 1 ? "Trip" : "Trips"}
          </Text>
          {upcomingTrips.map((trip) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.upcomingCard}
              onPress={() =>
                navigation.navigate(SCREENS.TRIP_DETAIL, {
                  tripId: trip.id,
                })
              }
            >
              <CountdownTimer targetDate={trip.startDate} />
              <Text style={styles.upcomingLabel}>Upcoming Trip</Text>
              <Text style={styles.upcomingTitle}>{trip.name}</Text>
              <Text style={styles.upcomingDates}>{dateRangeOf(trip)}</Text>
              <Text style={styles.upcomingLocation}>
                {trip.city}, {trip.country}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* My Trips */}
      <View style={styles.tripsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Trips</Text>
          <View style={styles.sectionHeaderActions}>
            <TouchableOpacity
              style={styles.addTripHeaderButton}
              onPress={() => setShowAddTrip(true)}
            >
              <Text style={styles.addTripHeaderButtonText}>+ Add Trip</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.TRIPS)}
            >
              <Text style={styles.viewAllText}>View All</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date Filter */}
        <View style={styles.dateFilterContainer}>
          <View style={styles.dateFilterRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowFromPicker(true)}
            >
              <Text style={styles.dateLabel}>From</Text>
              <Text style={styles.dateText}>
                {dateFrom ? formatDateMMDDYYYY(dateFrom) : "Select date"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowToPicker(true)}
            >
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateText}>
                {dateTo ? formatDateMMDDYYYY(dateTo) : "Select date"}
              </Text>
            </TouchableOpacity>

            {(dateFrom || dateTo) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={() => {
                  setDateFrom("");
                  setDateTo("");
                }}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {filteredTrips.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>
              {trips.length === 0 ? "No trips yet" : "No trips in this range"}
            </Text>
            {trips.length === 0 && (
              <TouchableOpacity
                style={styles.addTripButton}
                onPress={() => setShowAddTrip(true)}
              >
                <Text style={styles.addTripButtonText}>
                  Add Your First Trip
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredTrips
            .slice(0, 6)
            .map((trip) => (
              <TripCard
                key={trip.id}
                trip={trip}
                onMenu={handleMenu}
                onEdit={handleEdit}
                onShare={handleShare}
                onDelete={handleDelete}
              />
            ))
        )}
      </View>

      {/* World Map — deferred so core content renders first */}
      {filteredTrips.length > 0 && (
        showWorldMap
          ? <WorldMap trips={filteredTrips} user={user} />
          : <View style={styles.mapLoadingPlaceholder}>
              <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
      )}

      {/* Travel Overview Stats */}
      <TravelOverview stats={stats} />

      {/* My Badges */}
      <TouchableOpacity
        style={styles.badgesCard}
        onPress={() => navigation.navigate("Achievements")}
        activeOpacity={0.85}
      >
        <View style={styles.badgesCardLeft}>
          <Text style={styles.badgesCardTitle}>My Badges</Text>
          <Text style={styles.badgesCardSubtitle}>
            Earn badges as you explore the world
          </Text>
        </View>
        <View style={styles.badgesCardRight}>
          <Text style={styles.badgesCardIcon}>🏆</Text>
          <Text style={styles.badgesCardArrow}>View All →</Text>
        </View>
      </TouchableOpacity>

      {/* Footer */}
      <View style={styles.footer}>
        {/* Branding Section */}
        <View style={styles.footerBrandRow}>
          <View style={styles.footerLogoWrapper}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.footerLogoImage}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.footerBrandText}>Ten Miles Ahead</Text>
        </View>
        <Text style={styles.footerDescription}>
          Travel journals, photo flipbooks, and shared adventures.
        </Text>

        {/* Three-column Links */}
        <View style={styles.footerSectionsRow}>
          <View style={styles.footerCol}>
            <Text style={styles.footerSectionTitle}>Explore</Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.FAQS)}>
              <Text style={styles.footerLink}>FAQs</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.TUTORIALS)}
            >
              <Text style={styles.footerLink}>Tutorials</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.SUBSCRIBE)}
            >
              <Text style={styles.footerLink}>Subscribe</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerCol}>
            <Text style={styles.footerSectionTitle}>Support</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.HELP_SUPPORT)}
            >
              <Text style={styles.footerLink}>Help & Support</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setFeedbackVisible(true)}>
              <Text style={styles.footerLink}>Feedback</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.footerCol}>
            <Text style={styles.footerSectionTitle}>Legal</Text>
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.PRIVACY)}
            >
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.navigate(SCREENS.TERMS)}
            >
              <Text style={styles.footerLink}>Terms of Service</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Copyright */}
        <View style={styles.footerBottom}>
          <Text style={styles.footerCopyright}>
            © {new Date().getFullYear()} Ten Miles Ahead. All rights reserved.
          </Text>
        </View>
      </View>

      {/* Modals */}
      {editingTrip && (
        <EditTripModal
          tripId={editingTrip.id}
          visible={true}
          onClose={() => setEditingTrip(null)}
        />
      )}

      {shareTrip && (
        <ShareTripModal
          tripId={shareTrip.id}
          onClose={() => setShareTrip(null)}
        />
      )}

      {photosTrip && (
        <PhotosModal
          tripId={photosTrip.id}
          visible={true}
          onClose={() => setPhotosTrip(null)}
        />
      )}

      {itineraryTrip && (
        <ItineraryModal
          tripId={itineraryTrip.id}
          visible={true}
          onClose={() => setItineraryTrip(null)}
        />
      )}

      {destinationsTrip && (
        <PlaceModal
          title="Destinations"
          tripId={destinationsTrip.id}
          subcollection="destinations"
          visible={true}
          onClose={() => setDestinationsTrip(null)}
        />
      )}

      {activitiesTrip && (
        <PlaceModal
          title="Activities"
          tripId={activitiesTrip.id}
          subcollection="activities"
          visible={true}
          onClose={() => setActivitiesTrip(null)}
        />
      )}

      {accommodationsTrip && (
        <PlaceModal
          title="Accommodations"
          tripId={accommodationsTrip.id}
          subcollection="accommodations"
          visible={true}
          onClose={() => setAccommodationsTrip(null)}
        />
      )}

      {restaurantsTrip && (
        <PlaceModal
          title="Restaurants"
          tripId={restaurantsTrip.id}
          subcollection="restaurants"
          visible={true}
          onClose={() => setRestaurantsTrip(null)}
        />
      )}

      {cruisesTrip && (
        <PlaceModal
          title="Cruises"
          tripId={cruisesTrip.id}
          subcollection="cruises"
          visible={true}
          onClose={() => setCruisesTrip(null)}
        />
      )}

      {othersTrip && (
        <PlaceModal
          title="Others"
          tripId={othersTrip.id}
          subcollection="extras"
          visible={true}
          onClose={() => setOthersTrip(null)}
        />
      )}

      {deleteTrip && (
        <ConfirmModal
          isOpen={true}
          title="Delete Trip"
          message={`Are you sure you want to delete "${deleteTrip.name}"? This action cannot be undone.`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTrip(null)}
        />
      )}

      {showAddTrip && (
        <AddTripModal
          visible={showAddTrip}
          onClose={() => setShowAddTrip(false)}
          onCreated={(tripId) => {
            setShowAddTrip(false);
            // Optionally navigate to the new trip
            navigation.navigate(SCREENS.TRIP_DETAIL, { tripId });
          }}
        />
      )}

      <FeedbackModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />

      {showMenu && (
        <Modal visible transparent animationType="fade">
          <TouchableOpacity
            style={styles.menuBackdrop}
            activeOpacity={1}
            onPress={() => setShowMenu(null)}
          >
            <TouchableOpacity
              style={styles.menuContainer}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setAccommodationsTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>🏨</Text>
                <Text style={styles.menuText}>Accommodations</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setActivitiesTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>🎯</Text>
                <Text style={styles.menuText}>Activities</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setCruisesTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>🚢</Text>
                <Text style={styles.menuText}>Cruises</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setDestinationsTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>📍</Text>
                <Text style={styles.menuText}>Destinations</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setItineraryTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>🗓️</Text>
                <Text style={styles.menuText}>Itinerary</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setPhotosTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>📷</Text>
                <Text style={styles.menuText}>Photos</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setRestaurantsTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>🍽️</Text>
                <Text style={styles.menuText}>Restaurants</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setOthersTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>🧳</Text>
                <Text style={styles.menuText}>Others</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.menuItem, styles.menuCancelItem]}
                onPress={() => setShowMenu(null)}
              >
                <Text style={styles.menuCancelText}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Date Pickers */}
      <CalendarPickerModal
        visible={showFromPicker}
        value={dateFrom ? new Date(dateFrom) : new Date()}
        title="Filter From Date"
        onSelect={(d) => setDateFrom(d.toISOString().split("T")[0])}
        onClose={() => setShowFromPicker(false)}
      />

      <CalendarPickerModal
        visible={showToPicker}
        value={
          dateTo ? new Date(dateTo) : dateFrom ? new Date(dateFrom) : new Date()
        }
        title="Filter To Date"
        onSelect={(d) => setDateTo(d.toISOString().split("T")[0])}
        onClose={() => setShowToPicker(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: COLORS.background,
  },
  mapLoadingPlaceholder: {
    height: 220,
    marginVertical: scaleSpacing(SPACING.md),
    borderRadius: 12,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    padding: scaleSpacing(SPACING.md),
  },
  landingContent: {
    padding: scaleSpacing(SPACING.lg),
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: scaleSpacing(SPACING.xxl),
  },
  heroTitle: {
    fontSize: scaleFontSize(36),
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  heroSubtitle: {
    fontSize: scaleFontSize(16),
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: scaleSpacing(SPACING.xl),
    lineHeight: scaleFontSize(24),
  },
  heroButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.md),
    paddingHorizontal: scaleSpacing(SPACING.xl),
    borderRadius: 8,
    marginBottom: scaleSpacing(SPACING.md),
  },
  heroButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(18),
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: scaleSpacing(SPACING.md),
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(16),
  },
  featuresSection: {
    marginTop: scaleSpacing(SPACING.xl),
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: scaleSpacing(SPACING.lg),
    marginBottom: scaleSpacing(SPACING.md),
    alignItems: "center",
  },
  featureIcon: {
    fontSize: scaleFontSize(40),
    marginBottom: scaleSpacing(SPACING.sm),
  },
  featureTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  featureText: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: scaleFontSize(20),
  },
  welcomeSection: {
    marginTop: scaleSpacing(20),
    marginBottom: scaleSpacing(SPACING.lg),
    backgroundColor: COLORS.primary,
    padding: scaleSpacing(SPACING.lg),
    borderRadius: 16,
  },
  welcomeText: {
    fontSize: scaleFontSize(28),
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
  },
  welcomeName: {
    fontSize: scaleFontSize(28),
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
  },
  pendingBookingsBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.md),
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
  },
  pendingBookingsBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
    flex: 1,
  },
  pendingBookingsIcon: {
    fontSize: scaleFontSize(24),
  },
  pendingBookingsTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  pendingBookingsSubtitle: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
    marginTop: 2,
  },
  pendingBookingsArrow: {
    fontSize: scaleFontSize(18),
    color: COLORS.primary,
    fontWeight: "700",
  },
  upcomingSection: {
    marginBottom: scaleSpacing(SPACING.lg),
  },
  upcomingSectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.md),
  },
  upcomingCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: scaleSpacing(SPACING.lg),
    marginBottom: scaleSpacing(SPACING.md),
  },
  upcomingLabel: {
    fontSize: scaleFontSize(12),
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  upcomingTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  upcomingDates: {
    fontSize: scaleFontSize(14),
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  upcomingLocation: {
    fontSize: scaleFontSize(14),
    color: COLORS.white,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.md),
  },
  tripsSection: {
    marginBottom: scaleSpacing(SPACING.lg),
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleSpacing(SPACING.md),
  },
  dateFilterContainer: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  dateFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
  },
  dateButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scaleSpacing(SPACING.sm),
  },
  dateLabel: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
    marginBottom: 4,
  },
  dateText: {
    fontSize: scaleFontSize(14),
    color: COLORS.foreground,
  },
  clearButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.sm),
  },
  clearButtonText: {
    fontSize: scaleFontSize(14),
    color: COLORS.primary,
    fontWeight: "600",
  },
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.md),
  },
  addTripHeaderButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.xs),
    paddingHorizontal: scaleSpacing(SPACING.md),
    borderRadius: 8,
  },
  addTripHeaderButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },
  viewAllText: {
    fontSize: scaleFontSize(14),
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: "center",
    padding: scaleSpacing(SPACING.xl),
  },
  emptyText: {
    fontSize: scaleFontSize(16),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.md),
  },
  addTripButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.sm),
    paddingHorizontal: scaleSpacing(SPACING.lg),
    borderRadius: 8,
  },
  addTripButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },
  actionsSection: {
    marginBottom: scaleSpacing(SPACING.xl),
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.sm),
  },
  actionCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: scaleSpacing(SPACING.lg),
    alignItems: "center",
  },
  actionIcon: {
    fontSize: scaleFontSize(32),
    marginBottom: scaleSpacing(SPACING.sm),
  },
  actionText: {
    fontSize: scaleFontSize(14),
    color: COLORS.foreground,
    fontWeight: "500",
  },
  menuModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: scaleSpacing(SPACING.lg),
  },
  menuContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingTop: scaleSpacing(SPACING.md),
    paddingBottom: scaleSpacing(SPACING.md),
    width: "90%",
    maxWidth: 400,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scaleSpacing(SPACING.md),
    paddingHorizontal: scaleSpacing(SPACING.lg),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  menuIcon: {
    fontSize: scaleFontSize(20),
    marginRight: scaleSpacing(SPACING.md),
  },
  menuText: {
    fontSize: scaleFontSize(16),
    color: COLORS.foreground,
  },
  menuCancelItem: {
    borderBottomWidth: 0,
    marginTop: scaleSpacing(SPACING.sm),
    justifyContent: "center",
  },
  menuCancelText: {
    fontSize: scaleFontSize(16),
    color: COLORS.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingVertical: scaleSpacing(SPACING.lg),
    paddingHorizontal: scaleSpacing(SPACING.md),
    marginTop: scaleSpacing(SPACING.xl),
  },
  footerSection: {
    marginBottom: scaleSpacing(SPACING.lg),
  },
  footerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
    marginBottom: scaleSpacing(SPACING.sm),
  },
  footerLogoWrapper: {
    width: scaleFontSize(32),
    height: scaleFontSize(32),
    borderRadius: scaleFontSize(8),
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    padding: 3,
  },
  footerLogoImage: {
    width: scaleFontSize(24),
    height: scaleFontSize(24),
  },
  footerBrandText: {
    fontSize: scaleFontSize(16),
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  footerDescription: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
    lineHeight: scaleFontSize(18),
    marginBottom: scaleSpacing(SPACING.lg),
  },
  footerSectionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  footerCol: {
    flex: 1,
  },
  footerSection: {
    marginBottom: scaleSpacing(SPACING.lg),
  },
  footerSectionTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  footerLink: {
    fontSize: scaleFontSize(12),
    color: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.xs),
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: scaleSpacing(SPACING.md),
    marginTop: scaleSpacing(SPACING.md),
    width: "100%",
  },
  footerCopyright: {
    fontSize: scaleFontSize(10),
    color: COLORS.muted,
    textAlign: "center",
  },
  badgesCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scaleSpacing(SPACING.lg),
    marginBottom: scaleSpacing(SPACING.lg),
  },
  badgesCardLeft: {
    flex: 1,
  },
  badgesCardTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  badgesCardSubtitle: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
  },
  badgesCardRight: {
    alignItems: "center",
    marginLeft: scaleSpacing(SPACING.md),
  },
  badgesCardIcon: {
    fontSize: scaleFontSize(32),
    marginBottom: scaleSpacing(SPACING.xs),
  },
  badgesCardArrow: {
    fontSize: scaleFontSize(12),
    color: COLORS.primary,
    fontWeight: "600",
  },
});
