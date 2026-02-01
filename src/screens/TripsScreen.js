import React, { useEffect, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import Protected from "../components/Protected";
import SubscriptionRequiredModal from "../components/SubscriptionRequiredModal";
import TripCard from "../components/TripCard";
import ConfirmModal from "../components/modals/ConfirmModal";
import ShareTripModal from "../components/modals/ShareTripModal";
import PhotosModal from "../components/modals/PhotosModal";
import ItineraryModal from "../components/modals/ItineraryModal";
import PlaceModal from "../components/modals/PlaceModal";
import EditTripModal from "../components/modals/EditTripModal";
import AddTripModal from "../components/modals/AddTripModal";
import { COLORS, SPACING, SCREENS, TRANSPORT_OPTIONS } from "../lib/constants";

const { width } = Dimensions.get("window");

export default function TripsScreen({ navigation }) {
  return (
    <Protected>
      <TripsInner navigation={navigation} />
    </Protected>
  );
}

function TripsInner({ navigation }) {
  const { user, profile } = useAuth();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Date range filter states
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Modal states
  const [deleteTrip, setDeleteTrip] = useState(null);
  const [shareTrip, setShareTrip] = useState(null);
  const [editTrip, setEditTrip] = useState(null);
  const [photosTrip, setPhotosTrip] = useState(null);
  const [itineraryTrip, setItineraryTrip] = useState(null);
  const [destinationsTrip, setDestinationsTrip] = useState(null);
  const [activitiesTrip, setActivitiesTrip] = useState(null);
  const [accommodationsTrip, setAccommodationsTrip] = useState(null);
  const [restaurantsTrip, setRestaurantsTrip] = useState(null);
  const [menuTrip, setMenuTrip] = useState(null);
  const [showAddTrip, setShowAddTrip] = useState(false);

  // Check subscription (must have valid status AND not expired)
  const subscription = profile?.subscription;
  const isSubscribed =
    (subscription?.status === "active" ||
      subscription?.status === "trialing") &&
    !subscription?.cancelAtPeriodEnd &&
    subscription?.currentPeriodEnd > Date.now();

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
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [user]);

  // Filter trips by date range
  const filteredTrips = useMemo(() => {
    if (!startDate && !endDate) return trips;

    return trips.filter((trip) => {
      const tripStart = new Date(trip.startDate);
      const tripEnd = new Date(trip.endDate);

      if (startDate && endDate) {
        return tripStart >= startDate && tripEnd <= endDate;
      } else if (startDate) {
        return tripStart >= startDate;
      } else if (endDate) {
        return tripEnd <= endDate;
      }
      return true;
    });
  }, [trips, startDate, endDate]);

  function onRefresh() {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  }

  function clearFilters() {
    setStartDate(null);
    setEndDate(null);
  }

  function handleStartDateChange(event, selectedDate) {
    setShowStartPicker(false);
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  }

  function handleEndDateChange(event, selectedDate) {
    setShowEndPicker(false);
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  }

  async function handleDelete() {
    if (!deleteTrip) return;

    try {
      await deleteDoc(doc(db, "trips", deleteTrip.id));
      setDeleteTrip(null);
    } catch (error) {
      Alert.alert("Error", "Failed to delete trip");
    }
  }

  function handleMenu(trip) {
    setMenuTrip(trip);
  }

  function handleMenuOption(option) {
    if (!menuTrip) return;

    switch (option) {
      case "photos":
        setPhotosTrip(menuTrip.id);
        break;
      case "itinerary":
        setItineraryTrip(menuTrip.id);
        break;
      case "destinations":
        setDestinationsTrip(menuTrip.id);
        break;
      case "activities":
        setActivitiesTrip(menuTrip.id);
        break;
      case "accommodations":
        setAccommodationsTrip(menuTrip.id);
        break;
      case "restaurants":
        setRestaurantsTrip(menuTrip.id);
        break;
    }
    setMenuTrip(null);
  }

  if (!isSubscribed) {
    return (
      <SubscriptionRequiredModal
        title="My Trips"
        description="Access to trips requires an active subscription."
      />
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const renderTrip = ({ item }) => (
    <TripCard
      trip={item}
      onMenu={handleMenu}
      onShare={(t) => setShareTrip(t.id)}
      onEdit={(t) => setEditTrip(t.id)}
      onDelete={setDeleteTrip}
    />
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Your Trips</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddTrip(true)}
        >
          <Text style={styles.addButtonText}>+ Add Trip</Text>
        </TouchableOpacity>
      </View>

      {/* Date Range Filter */}
      {trips.length > 0 && (
        <View style={styles.filterContainer}>
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <Text style={styles.dateLabel}>Start Date</Text>
              <Text style={styles.dateValue}>
                {startDate ? startDate.toLocaleDateString() : "Any"}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <Text style={styles.dateLabel}>End Date</Text>
              <Text style={styles.dateValue}>
                {endDate ? endDate.toLocaleDateString() : "Any"}
              </Text>
            </TouchableOpacity>

            {(startDate || endDate) && (
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
              >
                <Text style={styles.clearButtonText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>

          {filteredTrips.length !== trips.length && (
            <Text style={styles.filterInfo}>
              Showing {filteredTrips.length} of {trips.length} trips
            </Text>
          )}
        </View>
      )}

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={handleStartDateChange}
        />
      )}

      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={handleEndDateChange}
        />
      )}

      {filteredTrips.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>✈️</Text>
          <Text style={styles.emptyTitle}>
            {trips.length === 0 ? "No trips yet" : "No trips found"}
          </Text>
          <Text style={styles.emptyText}>
            {trips.length === 0
              ? "Start documenting your adventures by adding your first trip."
              : "No trips match the selected date range. Try adjusting your filters."}
          </Text>
          {trips.length === 0 && (
            <TouchableOpacity
              style={styles.emptyButton}
              onPress={() => setShowAddTrip(true)}
            >
              <Text style={styles.emptyButtonText}>Add Your First Trip</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredTrips}
          renderItem={renderTrip}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}

      {/* Menu Modal */}
      {menuTrip && (
        <View style={styles.menuOverlay}>
          <TouchableOpacity
            style={styles.menuBackdrop}
            onPress={() => setMenuTrip(null)}
          />
          <View style={styles.menuContainer}>
            <Text style={styles.menuTitle}>{menuTrip.name}</Text>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption("photos")}
            >
              <Text style={styles.menuIcon}>🖼</Text>
              <Text style={styles.menuText}>Photos</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption("itinerary")}
            >
              <Text style={styles.menuIcon}>📋</Text>
              <Text style={styles.menuText}>Itinerary</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption("destinations")}
            >
              <Text style={styles.menuIcon}>📍</Text>
              <Text style={styles.menuText}>Destinations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption("activities")}
            >
              <Text style={styles.menuIcon}>🎯</Text>
              <Text style={styles.menuText}>Activities</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption("accommodations")}
            >
              <Text style={styles.menuIcon}>🏨</Text>
              <Text style={styles.menuText}>Accommodations</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => handleMenuOption("restaurants")}
            >
              <Text style={styles.menuIcon}>🍽</Text>
              <Text style={styles.menuText}>Restaurants</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuCancelButton}
              onPress={() => setMenuTrip(null)}
            >
              <Text style={styles.menuCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Modals */}
      <ConfirmModal
        isOpen={!!deleteTrip}
        title="Delete Trip"
        message={`Are you sure you want to delete "${deleteTrip?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTrip(null)}
      />

      <ShareTripModal
        tripId={shareTrip}
        visible={!!shareTrip}
        onClose={() => setShareTrip(null)}
      />

      <PhotosModal
        tripId={photosTrip}
        visible={!!photosTrip}
        onClose={() => setPhotosTrip(null)}
      />

      <ItineraryModal
        tripId={itineraryTrip}
        visible={!!itineraryTrip}
        onClose={() => setItineraryTrip(null)}
      />

      <PlaceModal
        tripId={destinationsTrip}
        visible={!!destinationsTrip}
        onClose={() => setDestinationsTrip(null)}
        title="Destinations"
        subcollection="destinations"
      />

      <PlaceModal
        tripId={activitiesTrip}
        visible={!!activitiesTrip}
        onClose={() => setActivitiesTrip(null)}
        title="Activities"
        subcollection="activities"
        extraLeft={[
          {
            key: "transportationType",
            label: "Mode of Transportation",
            options: TRANSPORT_OPTIONS,
          },
        ]}
      />

      <PlaceModal
        tripId={accommodationsTrip}
        visible={!!accommodationsTrip}
        onClose={() => setAccommodationsTrip(null)}
        title="Accommodations"
        subcollection="accommodations"
        extraLeft={[
          {
            key: "transportationType",
            label: "Mode of Transportation",
            options: TRANSPORT_OPTIONS,
          },
        ]}
      />

      <PlaceModal
        tripId={restaurantsTrip}
        visible={!!restaurantsTrip}
        onClose={() => setRestaurantsTrip(null)}
        title="Restaurants"
        subcollection="restaurants"
      />

      <EditTripModal
        tripId={editTrip}
        visible={!!editTrip}
        onClose={() => setEditTrip(null)}
      />

      <AddTripModal
        visible={showAddTrip}
        onClose={() => setShowAddTrip(false)}
        onCreated={(tripId) => {
          setShowAddTrip(false);
          // Navigate to the new trip
          navigation.navigate(SCREENS.TRIP_DETAIL, { tripId });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 25,
    alignItems: "center",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterContainer: {
    padding: SPACING.md,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  filterRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    alignItems: "center",
  },
  dateButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    padding: SPACING.md,
    alignItems: "center",
  },
  dateLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  dateValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  clearButton: {
    backgroundColor: COLORS.error,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  clearButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: "600",
  },
  filterInfo: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: SPACING.sm,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  list: {
    padding: SPACING.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  emptyText: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  menuOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  menuContainer: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.lg,
    textAlign: "center",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: SPACING.md,
  },
  menuText: {
    fontSize: 16,
    color: COLORS.foreground,
  },
  menuCancelButton: {
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  menuCancelText: {
    fontSize: 16,
    color: COLORS.muted,
  },
});
