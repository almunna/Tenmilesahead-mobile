import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  addDoc,
  updateDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../AuthProvider";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../../lib/constants";

const CATEGORY_LABELS = {
  accommodations: "Accommodation",
  activities: "Activity",
  restaurants: "Restaurant",
  cruises: "Cruise",
  extras: "Extra",
};

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

function fmtDate(d) {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : d;
}

export default function AssignBookingModal({ booking, onClose, onAssigned }) {
  const { user } = useAuth();
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loadingTrips, setLoadingTrips] = useState(true);

  useEffect(() => {
    loadTrips();
  }, [user]);

  async function loadTrips() {
    if (!user) return;
    try {
      const snap = await getDocs(
        query(
          collection(db, "trips"),
          where("ownerId", "==", user.uid),
          orderBy("startDate", "desc")
        )
      );
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setTrips(arr);
    } catch (err) {
      // fallback: load without ordering if composite index not ready
      try {
        const snap2 = await getDocs(
          query(collection(db, "trips"), where("ownerId", "==", user.uid))
        );
        const arr2 = [];
        snap2.forEach((d) => arr2.push({ id: d.id, ...d.data() }));
        arr2.sort((a, b) => (b.startDate || "").localeCompare(a.startDate || ""));
        setTrips(arr2);
      } catch (_) {}
    }
    setLoadingTrips(false);
  }

  async function handleAssign() {
    if (!user || !selectedTripId) return;
    setSaving(true);
    try {
      const parsed = booking.parsed;
      const now = Date.now();

      const notesExtra = [
        parsed.notes,
        parsed.confirmationNumber ? `Confirmation: ${parsed.confirmationNumber}` : null,
        parsed.amount ? `Amount: ${parsed.amount}` : null,
        parsed.provider ? `Provider: ${parsed.provider}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      if (parsed.category === "extras") {
        await addDoc(collection(db, "trips", selectedTripId, "extras"), {
          name: parsed.name,
          extraType: parsed.extraType ?? "other",
          confirmationNumber: parsed.confirmationNumber ?? null,
          startDate: parsed.startDate ?? null,
          endDate: parsed.endDate ?? null,
          city: parsed.city ?? null,
          state: parsed.state ?? null,
          country: parsed.country ?? null,
          address: parsed.address ?? null,
          phoneNumber: parsed.phoneNumber ?? null,
          websiteUrl: parsed.websiteUrl ?? null,
          notes: notesExtra || null,
          provider: parsed.provider ?? null,
          amount: parsed.amount ?? null,
          createdAt: now,
          updatedAt: now,
        });
      } else {
        await addDoc(collection(db, "trips", selectedTripId, parsed.category), {
          name: parsed.name,
          city: parsed.city ?? "",
          state: parsed.state ?? null,
          country: parsed.country ?? "",
          address: parsed.address ?? null,
          phoneNumber: parsed.phoneNumber ?? null,
          websiteUrl: parsed.websiteUrl ?? null,
          startDate: parsed.startDate ?? null,
          endDate: parsed.endDate ?? null,
          notes: notesExtra || null,
          createdAt: now,
          updatedAt: now,
        });
      }

      // Mark pending booking as assigned
      await updateDoc(doc(db, "users", user.uid, "pendingBookings", booking.id), {
        status: "assigned",
        assignedTripId: selectedTripId,
        updatedAt: now,
      });

      onAssigned();
      onClose();
    } catch (err) {
      Alert.alert("Error", "Failed to assign booking. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const { parsed } = booking;
  const categoryLabel =
    parsed.category === "extras"
      ? EXTRA_TYPE_LABELS[parsed.extraType ?? "other"] ?? "Extra"
      : CATEGORY_LABELS[parsed.category] ?? parsed.category;

  const dateStr = parsed.startDate
    ? parsed.endDate && parsed.endDate !== parsed.startDate
      ? `${fmtDate(parsed.startDate)} → ${fmtDate(parsed.endDate)}`
      : fmtDate(parsed.startDate)
    : null;

  const locationStr = [parsed.city, parsed.state, parsed.country]
    .filter(Boolean)
    .join(", ");

  return (
    <Modal
      visible
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Booking to Trip</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
            {/* Booking Details */}
            <Text style={styles.sectionLabel}>Booking Details</Text>
            <View style={styles.bookingDetails}>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
              </View>
              <Text style={styles.bookingName}>{parsed.name}</Text>
              {parsed.provider ? (
                <Text style={styles.bookingProvider}>{parsed.provider}</Text>
              ) : null}
              {dateStr ? (
                <Text style={styles.bookingMeta}>📅 {dateStr}</Text>
              ) : null}
              {locationStr ? (
                <Text style={styles.bookingMeta}>📍 {locationStr}</Text>
              ) : null}
              {parsed.confirmationNumber ? (
                <Text style={styles.bookingMeta}>
                  🔖 {parsed.confirmationNumber}
                </Text>
              ) : null}
              {parsed.amount ? (
                <Text style={styles.bookingMeta}>💳 {parsed.amount}</Text>
              ) : null}
              {parsed.notes ? (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesText}>{parsed.notes}</Text>
                </View>
              ) : null}
            </View>

            {/* Trip selector */}
            <Text style={[styles.sectionLabel, { marginTop: scaleSpacing(SPACING.md) }]}>
              Select a Trip
            </Text>
            {loadingTrips ? (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={{ marginVertical: scaleSpacing(SPACING.md) }}
              />
            ) : trips.length === 0 ? (
              <Text style={styles.noTripsText}>No trips found. Create a trip first.</Text>
            ) : (
              <View style={styles.tripsList}>
                {trips.map((trip) => {
                  const isSelected = selectedTripId === trip.id;
                  const tripDateStr = trip.startDate
                    ? trip.endDate && trip.endDate !== trip.startDate
                      ? `${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}`
                      : fmtDate(trip.startDate)
                    : null;
                  const tripLocation = [trip.city, trip.country]
                    .filter(Boolean)
                    .join(", ");

                  return (
                    <TouchableOpacity
                      key={trip.id}
                      style={[styles.tripRow, isSelected && styles.tripRowSelected]}
                      onPress={() => setSelectedTripId(trip.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.tripRowInner}>
                        <Text
                          style={[
                            styles.tripName,
                            isSelected && styles.tripNameSelected,
                          ]}
                        >
                          {trip.name}
                        </Text>
                        {(tripLocation || tripDateStr) ? (
                          <Text style={styles.tripMeta}>
                            {[tripLocation, tripDateStr].filter(Boolean).join(" · ")}
                          </Text>
                        ) : null}
                      </View>
                      {isSelected && (
                        <Text style={styles.checkmark}>✓</Text>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>

          {/* Assign Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.assignButton,
                (!selectedTripId || saving) && styles.assignButtonDisabled,
              ]}
              onPress={handleAssign}
              disabled={!selectedTripId || saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={COLORS.white} />
              ) : (
                <Text style={styles.assignButtonText}>Assign to Trip</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "90%",
    paddingBottom: scaleSpacing(SPACING.lg),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  closeButton: {
    padding: scaleSpacing(SPACING.xs),
  },
  closeText: {
    fontSize: scaleFontSize(18),
    color: COLORS.muted,
  },
  body: {
    padding: scaleSpacing(SPACING.md),
  },
  sectionLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  bookingDetails: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: scaleSpacing(SPACING.md),
    gap: 4,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: `${COLORS.primary}1a`,
    borderRadius: 999,
    paddingHorizontal: scaleSpacing(SPACING.sm),
    paddingVertical: 3,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  categoryBadgeText: {
    fontSize: scaleFontSize(12),
    fontWeight: "600",
    color: COLORS.primary,
  },
  bookingName: {
    fontSize: scaleFontSize(17),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  bookingProvider: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
  },
  bookingMeta: {
    fontSize: scaleFontSize(13),
    color: COLORS.foreground,
  },
  notesBlock: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: scaleSpacing(SPACING.xs),
    paddingTop: scaleSpacing(SPACING.xs),
  },
  notesText: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
    lineHeight: scaleFontSize(18),
  },
  noTripsText: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    textAlign: "center",
    paddingVertical: scaleSpacing(SPACING.lg),
  },
  tripsList: {
    gap: scaleSpacing(SPACING.sm),
  },
  tripRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scaleSpacing(SPACING.sm),
  },
  tripRowSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}0d`,
  },
  tripRowInner: {
    flex: 1,
  },
  tripName: {
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: COLORS.foreground,
  },
  tripNameSelected: {
    color: COLORS.primary,
  },
  tripMeta: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
    marginTop: 2,
  },
  checkmark: {
    fontSize: scaleFontSize(16),
    color: COLORS.primary,
    fontWeight: "700",
    marginLeft: scaleSpacing(SPACING.sm),
  },
  footer: {
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingTop: scaleSpacing(SPACING.sm),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  assignButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: scaleSpacing(SPACING.md),
    alignItems: "center",
  },
  assignButtonDisabled: {
    opacity: 0.4,
  },
  assignButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "700",
  },
});
