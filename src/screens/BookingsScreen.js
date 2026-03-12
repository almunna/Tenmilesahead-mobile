import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Clipboard,
  Alert,
} from "react-native";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import Protected from "../components/Protected";
import AssignBookingModal from "../components/modals/AssignBookingModal";
import ConfirmModal from "../components/modals/ConfirmModal";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";

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

const CATEGORY_COLORS = {
  accommodations: { bg: "#dbeafe", text: "#1d4ed8" },
  activities: { bg: "#dcfce7", text: "#15803d" },
  restaurants: { bg: "#ffedd5", text: "#c2410c" },
  cruises: { bg: "#f3e8ff", text: "#7e22ce" },
  extras: { bg: "#f1f5f9", text: "#475569" },
};

function fmtDate(d) {
  if (!d) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  return m ? `${m[2]}/${m[3]}/${m[1]}` : d;
}

function relativeTime(ms) {
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function BookingsScreen() {
  return (
    <Protected>
      <BookingsInner />
    </Protected>
  );
}

function BookingsInner() {
  const { user, profile } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState(null);
  const [discarding, setDiscarding] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "users", user.uid, "pendingBookings"),
      where("status", "==", "pending")
    );

    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      arr.sort((a, b) => b.createdAt - a.createdAt);
      setBookings(arr);
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [user]);

  async function handleDiscard() {
    if (!user || !discarding) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "pendingBookings", discarding.id));
    } catch (err) {
      Alert.alert("Error", "Failed to discard booking.");
    }
    setDiscarding(null);
  }

  function copyEmail() {
    if (!profile?.forwardingEmail) return;
    Clipboard.setString(profile.forwardingEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Bookings</Text>
          <Text style={styles.pageSubtitle}>
            Forwarded booking emails that need to be assigned to a trip
          </Text>
        </View>

        {/* Forwarding Email Card */}
        {profile?.forwardingEmail && (
          <View style={styles.emailCard}>
            <View style={styles.emailIconWrapper}>
              <Text style={styles.emailIcon}>✉️</Text>
            </View>
            <View style={styles.emailCardContent}>
              <Text style={styles.emailCardLabel}>Your booking email</Text>
              <Text style={styles.emailCardAddress} numberOfLines={1}>
                {profile.forwardingEmail}
              </Text>
            </View>
            <TouchableOpacity style={styles.copyButton} onPress={copyEmail}>
              <Text style={styles.copyButtonText}>{copied ? "Copied!" : "Copy"}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Empty state */}
        {bookings.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyTitle}>No pending bookings</Text>
            <Text style={styles.emptyText}>
              Forward a booking confirmation email to your TMA address and it
              will appear here automatically.
            </Text>
          </View>
        ) : (
          <View style={styles.bookingsList}>
            {bookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                onAssign={() => setAssigning(booking)}
                onDiscard={() => setDiscarding(booking)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Assign Modal */}
      {assigning && (
        <AssignBookingModal
          booking={assigning}
          onClose={() => setAssigning(null)}
          onAssigned={() => setAssigning(null)}
        />
      )}

      {/* Discard Confirm Modal */}
      <ConfirmModal
        isOpen={!!discarding}
        title="Discard Booking?"
        message={`Are you sure you want to discard "${discarding?.parsed?.name}"? This cannot be undone.`}
        confirmText="Discard"
        confirmVariant="danger"
        onConfirm={handleDiscard}
        onCancel={() => setDiscarding(null)}
      />
    </View>
  );
}

function BookingCard({ booking, onAssign, onDiscard }) {
  const { parsed, createdAt } = booking;

  const categoryColor = CATEGORY_COLORS[parsed.category] || CATEGORY_COLORS.extras;
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
    <View style={styles.bookingCard}>
      {/* Top row: badge + time */}
      <View style={styles.bookingCardHeader}>
        <View
          style={[
            styles.categoryBadge,
            { backgroundColor: categoryColor.bg },
          ]}
        >
          <Text style={[styles.categoryBadgeText, { color: categoryColor.text }]}>
            {categoryLabel}
          </Text>
        </View>
        <Text style={styles.bookingTime}>{relativeTime(createdAt)}</Text>
      </View>

      {/* Name */}
      <Text style={styles.bookingName}>{parsed.name}</Text>

      {/* Provider */}
      {parsed.provider && (
        <Text style={styles.bookingProvider}>{parsed.provider}</Text>
      )}

      {/* Dates */}
      {dateStr && (
        <Text style={styles.bookingMeta}>📅 {dateStr}</Text>
      )}

      {/* Location */}
      {locationStr ? (
        <Text style={styles.bookingMeta}>📍 {locationStr}</Text>
      ) : null}

      {/* Confirmation */}
      {parsed.confirmationNumber && (
        <Text style={styles.bookingMeta}>🔖 {parsed.confirmationNumber}</Text>
      )}

      {/* Cost */}
      {parsed.amount && (
        <Text style={styles.bookingMeta}>💳 {parsed.amount}</Text>
      )}

      {/* Notes */}
      {parsed.notes && (
        <View style={styles.bookingNotes}>
          <Text style={styles.bookingNotesText}>{parsed.notes}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={styles.bookingActions}>
        <TouchableOpacity style={styles.assignButton} onPress={onAssign}>
          <Text style={styles.assignButtonText}>Assign to Trip</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.discardButton} onPress={onDiscard}>
          <Text style={styles.discardButtonText}>Discard</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: scaleSpacing(SPACING.md),
    paddingBottom: scaleSpacing(SPACING.xxl),
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  headerSection: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  pageTitle: {
    fontSize: scaleFontSize(26),
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  pageSubtitle: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    lineHeight: scaleFontSize(20),
  },
  emailCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.md),
    gap: scaleSpacing(SPACING.sm),
  },
  emailIconWrapper: {
    width: scaleFontSize(38),
    height: scaleFontSize(38),
    borderRadius: 10,
    backgroundColor: `${COLORS.primary}1a`,
    justifyContent: "center",
    alignItems: "center",
  },
  emailIcon: {
    fontSize: scaleFontSize(18),
  },
  emailCardContent: {
    flex: 1,
  },
  emailCardLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 2,
  },
  emailCardAddress: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
    fontFamily: "monospace",
  },
  copyButton: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingVertical: scaleSpacing(SPACING.xs),
    paddingHorizontal: scaleSpacing(SPACING.sm),
  },
  copyButtonText: {
    fontSize: scaleFontSize(13),
    color: COLORS.foreground,
    fontWeight: "600",
  },
  emptyCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: scaleSpacing(SPACING.xl),
    alignItems: "center",
    marginTop: scaleSpacing(SPACING.md),
  },
  emptyIcon: {
    fontSize: scaleFontSize(40),
    marginBottom: scaleSpacing(SPACING.md),
  },
  emptyTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  emptyText: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: scaleFontSize(20),
  },
  bookingsList: {
    gap: scaleSpacing(SPACING.md),
  },
  bookingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: scaleSpacing(SPACING.md),
  },
  bookingCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleSpacing(SPACING.sm),
  },
  categoryBadge: {
    paddingHorizontal: scaleSpacing(SPACING.sm),
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontSize: scaleFontSize(12),
    fontWeight: "600",
  },
  bookingTime: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
  },
  bookingName: {
    fontSize: scaleFontSize(18),
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  bookingProvider: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  bookingMeta: {
    fontSize: scaleFontSize(13),
    color: COLORS.foreground,
    marginBottom: 4,
  },
  bookingNotes: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    marginTop: scaleSpacing(SPACING.sm),
    paddingTop: scaleSpacing(SPACING.sm),
  },
  bookingNotesText: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
    lineHeight: scaleFontSize(18),
  },
  bookingActions: {
    flexDirection: "row",
    gap: scaleSpacing(SPACING.sm),
    marginTop: scaleSpacing(SPACING.md),
  },
  assignButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: scaleSpacing(SPACING.sm),
    alignItems: "center",
  },
  assignButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },
  discardButton: {
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.sm),
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  discardButtonText: {
    color: COLORS.muted,
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },
});
