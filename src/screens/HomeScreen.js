import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Modal,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useNavigation } from "@react-navigation/native";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  getDocs,
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
import { COLORS, SPACING, SCREENS } from "../lib/constants";
import { dateRangeOf } from "../lib/utils";
import { calculateDistance } from "../lib/geocoding";

export default function HomeScreen() {
  const { user, profile } = useAuth();
  const navigation = useNavigation();
  const [trips, setTrips] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingTrip, setUpcomingTrip] = useState(null);
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
  const [deleteTrip, setDeleteTrip] = useState(null);
  const [showMenu, setShowMenu] = useState(null);
  const [showAddTrip, setShowAddTrip] = useState(false);

  // Check subscription
  const subscription = profile?.subscription;
  const isSubscribed =
    (subscription?.status === "active" ||
      subscription?.status === "trialing") &&
    !subscription?.cancelAtPeriodEnd;

  // Trip action handlers
  function handleMenu(trip) {
    setShowMenu(trip);
  }

  function handleEdit(trip) {
    setEditingTrip(trip);
  }

  function handleShare(trip) {
    setShareTrip(trip);
  }

  function handleDelete(trip) {
    setDeleteTrip(trip);
  }

  async function confirmDelete() {
    if (!deleteTrip) return;
    try {
      await deleteDoc(doc(db, "trips", deleteTrip.id));
      setDeleteTrip(null);
    } catch (error) {
      console.error("Error deleting trip:", error);
    }
  }

  // Fetch recent trips for display
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "trips"),
      where("ownerId", "==", user.uid),
      orderBy("startDate", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setTrips(arr);

        // Find upcoming trip
        const today = new Date().toISOString().split("T")[0];
        const upcoming = arr.find((t) => t.startDate >= today);
        setUpcomingTrip(upcoming || null);
      },
      () => setTrips([])
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

  // Set up real-time listeners for all trip subcollections to trigger stats recalculation
  useEffect(() => {
    if (!user || filteredTrips.length === 0) return;

    const unsubscribers = [];

    // Listen to each filtered trip's subcollections
    for (const trip of filteredTrips) {
      // Destinations
      unsubscribers.push(
        onSnapshot(collection(db, "trips", trip.id, "destinations"), () => {
          setStatsVersion((v) => v + 1);
        })
      );
      // Activities
      unsubscribers.push(
        onSnapshot(collection(db, "trips", trip.id, "activities"), () => {
          setStatsVersion((v) => v + 1);
        })
      );
      // Accommodations
      unsubscribers.push(
        onSnapshot(collection(db, "trips", trip.id, "accommodations"), () => {
          setStatsVersion((v) => v + 1);
        })
      );
      // Restaurants
      unsubscribers.push(
        onSnapshot(collection(db, "trips", trip.id, "restaurants"), () => {
          setStatsVersion((v) => v + 1);
        })
      );
      // Media
      unsubscribers.push(
        onSnapshot(collection(db, "trips", trip.id, "media"), () => {
          setStatsVersion((v) => v + 1);
        })
      );
    }

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, filteredTrips]);

  // Calculate comprehensive travel stats
  useEffect(() => {
    if (!user) return;

    const calculateStats = async () => {
      try {
        const cSet = new Set();
        const sSet = new Set();
        const citySet = new Set();
        let imgTotal = 0;
        let totalDays = 0;
        let totalMiles = 0;
        const transportCounts = {};
        const accommodationCounts = {};

        for (const t of filteredTrips) {

          // Calculate days for this trip
          if (t.startDate && t.endDate) {
            const start = new Date(t.startDate);
            const end = new Date(t.endDate);
            const days =
              Math.ceil(
                (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
              ) + 1;
            totalDays += days;
          }

          // Track locations (only destination locations, not origin)
          if (t.country) cSet.add(t.country);
          // Only count US states for the "States Visited (US)" stat
          const isUSA =
            t.country &&
            ["united states", "usa", "us", "united states of america"].includes(
              t.country.toLowerCase().trim()
            );
          if (t.state && t.state.trim() && isUSA) sSet.add(t.state.trim());
          if (t.city) citySet.add(`${t.city}|${t.country || ""}`);

          // Track transportation from main trip
          if (t.originTransportationType) {
            transportCounts[t.originTransportationType] =
              (transportCounts[t.originTransportationType] || 0) + 1;
          }

          // Destinations subcollection - fetch and sort by startDate
          const destSnap = await getDocs(
            collection(db, "trips", t.id, "destinations")
          );
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

          // Sort destinations by startDate for chronological ordering
          destinations.sort((a, b) => {
            if (a.startDate && b.startDate) {
              return (
                new Date(a.startDate).getTime() -
                new Date(b.startDate).getTime()
              );
            }
            return 0;
          });

          // Build chronological list of all locations for this trip
          // Start with main trip destination (using trip start date)
          const allLocations = [];

          // Add main trip destination with trip's start date
          if (t.city && t.country) {
            allLocations.push({
              city: t.city,
              state: t.state,
              country: t.country,
              date: t.startDate || "",
            });
          }

          // Add all destinations from subcollection
          for (const dest of destinations) {
            if (dest.city && dest.country && dest.startDate) {
              allLocations.push({
                city: dest.city,
                state: dest.state,
                country: dest.country,
                date: dest.startDate,
              });
            }
          }

          // Sort all locations chronologically by date
          allLocations.sort((a, b) => {
            if (!a.date || !b.date) return 0;
            return new Date(a.date).getTime() - new Date(b.date).getTime();
          });

          // Calculate distance: origin → first location → second location → etc.
          if (allLocations.length > 0) {
            // Distance from origin to first chronological location
            const firstLoc = allLocations[0];
            const originToFirst = await calculateDistance(
              t.originCity,
              t.originState,
              t.originCountry,
              firstLoc.city,
              firstLoc.state,
              firstLoc.country
            );
            totalMiles += originToFirst;

            // Distance between consecutive locations
            for (let i = 1; i < allLocations.length; i++) {
              const prevLoc = allLocations[i - 1];
              const currLoc = allLocations[i];
              const segmentDistance = await calculateDistance(
                prevLoc.city,
                prevLoc.state,
                prevLoc.country,
                currLoc.city,
                currLoc.state,
                currLoc.country
              );
              totalMiles += segmentDistance;
            }
          }

          // Activities subcollection
          const actSnap = await getDocs(
            collection(db, "trips", t.id, "activities")
          );
          actSnap.forEach((a) => {
            const act = a.data();
            if (act.transportationType && act.transportationType !== "Cruise") {
              transportCounts[act.transportationType] =
                (transportCounts[act.transportationType] || 0) + 1;
            }
          });

          // Accommodations subcollection
          const accomSnap = await getDocs(
            collection(db, "trips", t.id, "accommodations")
          );
          accomSnap.forEach((a) => {
            const acc = a.data();
            if (acc.onShip) {
              accommodationCounts["Cruise"] =
                (accommodationCounts["Cruise"] || 0) + 1;
            } else if (acc.accommodationType) {
              accommodationCounts[acc.accommodationType] =
                (accommodationCounts[acc.accommodationType] || 0) + 1;
            }
            if (acc.transportationType && acc.transportationType !== "Cruise") {
              transportCounts[acc.transportationType] =
                (transportCounts[acc.transportationType] || 0) + 1;
            }
          });

          // Restaurants subcollection
          const restaurantSnap = await getDocs(
            collection(db, "trips", t.id, "restaurants")
          );
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

          // Media (photos)
          const mediaSnap = await getDocs(
            collection(db, "trips", t.id, "media")
          );
          mediaSnap.forEach((m) => {
            const mm = m.data();
            if (mm.type === "image") imgTotal += 1;
          });
        }

        setStats({
          totalTrips: filteredTrips.length,
          daysExplored: totalDays,
          photosCaptured: imgTotal,
          totalMiles: totalMiles,
          countriesVisited: cSet.size,
          statesVisited: sSet.size,
          citiesVisited: citySet.size,
          transportationCounts: transportCounts,
          accommodationCounts: accommodationCounts,
        });
      } catch (error) {
        console.error("Error calculating stats:", error);
      }
    };

    calculateStats();
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
        <Text style={styles.welcomeText}>
          Welcome {profile?.username || "traveler"}!
        </Text>
      </View>

      {/* Upcoming Trip */}
      {upcomingTrip && (
        <TouchableOpacity
          style={styles.upcomingCard}
          onPress={() =>
            navigation.navigate(SCREENS.TRIP_DETAIL, {
              tripId: upcomingTrip.id,
            })
          }
        >
          <Text style={styles.upcomingLabel}>Upcoming Trip</Text>
          <Text style={styles.upcomingTitle}>{upcomingTrip.name}</Text>
          <Text style={styles.upcomingDates}>{dateRangeOf(upcomingTrip)}</Text>
          <Text style={styles.upcomingLocation}>
            {upcomingTrip.city}, {upcomingTrip.country}
          </Text>
        </TouchableOpacity>
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
                {dateFrom || "Select date"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowToPicker(true)}
            >
              <Text style={styles.dateLabel}>To</Text>
              <Text style={styles.dateText}>
                {dateTo || "Select date"}
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
                <Text style={styles.addTripButtonText}>Add Your First Trip</Text>
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

      {/* World Map */}
      {filteredTrips.length > 0 && <WorldMap trips={filteredTrips} user={user} />}

      {/* Travel Overview Stats */}
      <TravelOverview stats={stats} />

      {/* Footer */}
      <View style={styles.footer}>
        {/* Branding Section */}
        <View style={styles.footerSection}>
          <View style={styles.footerBrandRow}>
            <View style={styles.footerLogo} />
            <Text style={styles.footerBrandText}>Ten Miles Ahead</Text>
          </View>
          <Text style={styles.footerDescription}>
            Travel journals, photo flipbooks, and shared adventures.
          </Text>
        </View>

        {/* Sections Row */}
        <View style={styles.footerSectionsRow}>
          {/* Explore Section */}
          <View style={styles.footerSection}>
            <Text style={styles.footerSectionTitle}>Explore</Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.FAQS)}>
              <Text style={styles.footerLink}>FAQs</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.TUTORIALS)}>
              <Text style={styles.footerLink}>Tutorials</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.SUBSCRIBE)}>
              <Text style={styles.footerLink}>Subscribe</Text>
            </TouchableOpacity>
          </View>

          {/* Legal Section */}
          <View style={styles.footerSection}>
            <Text style={styles.footerSectionTitle}>Legal</Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.PRIVACY)}>
              <Text style={styles.footerLink}>Privacy Policy</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.TERMS)}>
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
      <EditTripModal
        tripId={editingTrip?.id}
        visible={!!editingTrip}
        onClose={() => setEditingTrip(null)}
      />

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
                  setItineraryTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>📋</Text>
                <Text style={styles.menuText}>Itinerary</Text>
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
                  setRestaurantsTrip(showMenu);
                  setShowMenu(null);
                }}
              >
                <Text style={styles.menuIcon}>🍽️</Text>
                <Text style={styles.menuText}>Restaurants</Text>
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
      {showFromPicker && (
        <DateTimePicker
          value={dateFrom ? new Date(dateFrom) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowFromPicker(Platform.OS === "ios");
            if (selectedDate) {
              const dateStr = selectedDate.toISOString().split("T")[0];
              setDateFrom(dateStr);
            }
            if (Platform.OS === "android") {
              setShowFromPicker(false);
            }
          }}
        />
      )}

      {showToPicker && (
        <DateTimePicker
          value={dateTo ? new Date(dateTo) : new Date()}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={(event, selectedDate) => {
            setShowToPicker(Platform.OS === "ios");
            if (selectedDate) {
              const dateStr = selectedDate.toISOString().split("T")[0];
              setDateTo(dateStr);
            }
            if (Platform.OS === "android") {
              setShowToPicker(false);
            }
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  landingContent: {
    padding: SPACING.lg,
  },
  heroSection: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: SPACING.xl,
    lineHeight: 24,
  },
  heroButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 8,
    marginBottom: SPACING.md,
  },
  heroButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: "600",
  },
  secondaryButton: {
    paddingVertical: SPACING.md,
  },
  secondaryButtonText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  featuresSection: {
    marginTop: SPACING.xl,
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    alignItems: "center",
  },
  featureIcon: {
    fontSize: 40,
    marginBottom: SPACING.sm,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  featureText: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 20,
  },
  welcomeSection: {
    marginTop: 20,
    marginBottom: SPACING.lg,
    backgroundColor: COLORS.primary,
    padding: SPACING.lg,
    borderRadius: 16,
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.white,
    textAlign: "center",
  },
  upcomingCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  upcomingLabel: {
    fontSize: 12,
    color: COLORS.white,
    opacity: 0.8,
    marginBottom: SPACING.xs,
  },
  upcomingTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  upcomingDates: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.9,
    marginBottom: SPACING.xs,
  },
  upcomingLocation: {
    fontSize: 14,
    color: COLORS.white,
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  tripsSection: {
    marginBottom: SPACING.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  dateFilterContainer: {
    marginBottom: SPACING.md,
  },
  dateFilterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  dateButton: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.sm,
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: 4,
  },
  dateText: {
    fontSize: 14,
    color: COLORS.foreground,
  },
  clearButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  clearButtonText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "600",
  },
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.md,
  },
  addTripHeaderButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  addTripHeaderButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  viewAllText: {
    fontSize: 14,
    color: COLORS.primary,
  },
  emptyState: {
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: SPACING.md,
  },
  addTripButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
  },
  addTripButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  actionsSection: {
    marginBottom: SPACING.xl,
  },
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  actionCard: {
    width: "48%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: SPACING.sm,
  },
  actionText: {
    fontSize: 14,
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
    padding: SPACING.lg,
  },
  menuContainer: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    width: "90%",
    maxWidth: 400,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceLight,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: SPACING.md,
  },
  menuText: {
    fontSize: 16,
    color: COLORS.foreground,
  },
  menuCancelItem: {
    borderBottomWidth: 0,
    marginTop: SPACING.sm,
    justifyContent: "center",
  },
  menuCancelText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.xl,
  },
  footerSection: {
    marginBottom: SPACING.lg,
  },
  footerSectionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: SPACING.xl,
  },
  footerBrandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  footerLogo: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: COLORS.primary,
  },
  footerBrandText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  footerDescription: {
    fontSize: 12,
    color: COLORS.muted,
    lineHeight: 18,
  },
  footerSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  footerLink: {
    fontSize: 12,
    color: COLORS.primary,
    paddingVertical: SPACING.xs,
  },
  footerBottom: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.md,
    marginTop: SPACING.md,
  },
  footerCopyright: {
    fontSize: 10,
    color: COLORS.muted,
    textAlign: "center",
  },
});
