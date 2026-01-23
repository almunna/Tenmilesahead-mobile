import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from "react-native";
import {
  collection,
  getDocs,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import ModalShell from "./ModalShell";
import ItemFlipbook from "./ItemFlipbook";
import { COLORS, SPACING } from "../../lib/constants";
import { formatDateMMDDYYYY } from "../../lib/utils";
import { Ionicons } from "@expo/vector-icons";

export default function ItineraryModal({ tripId, visible, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    if (!tripId || !visible) return;

    fetchAllItems();
  }, [tripId, visible]);

  async function fetchAllItems() {
    try {
      const allItems = [];

      // Fetch destinations
      const destSnap = await getDocs(collection(db, "trips", tripId, "destinations"));
      destSnap.forEach((docSnap) => {
        const data = docSnap.data();
        allItems.push({
          id: docSnap.id,
          type: "Destination",
          subcollection: "destinations",
          icon: "📍",
          name: data.name || `${data.city || ""}, ${data.country || ""}`,
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          time: data.time || "",
          notes: data.notes || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          address: data.address || "",
          phoneNumber: data.phoneNumber || "",
          websiteUrl: data.websiteUrl || "",
        });
      });

      // Fetch activities
      const actSnap = await getDocs(collection(db, "trips", tripId, "activities"));
      actSnap.forEach((docSnap) => {
        const data = docSnap.data();
        allItems.push({
          id: docSnap.id,
          type: "Activity",
          subcollection: "activities",
          icon: "🎯",
          name: data.name || "",
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          time: data.time || "",
          notes: data.notes || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          address: data.address || "",
          phoneNumber: data.phoneNumber || "",
          websiteUrl: data.websiteUrl || "",
        });
      });

      // Fetch accommodations
      const accomSnap = await getDocs(collection(db, "trips", tripId, "accommodations"));
      accomSnap.forEach((docSnap) => {
        const data = docSnap.data();
        allItems.push({
          id: docSnap.id,
          type: "Accommodation",
          subcollection: "accommodations",
          icon: "🏨",
          name: data.name || "",
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          time: data.time || "",
          notes: data.notes || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          address: data.address || "",
          phoneNumber: data.phoneNumber || "",
          websiteUrl: data.websiteUrl || "",
        });
      });

      // Fetch restaurants
      const restSnap = await getDocs(collection(db, "trips", tripId, "restaurants"));
      restSnap.forEach((docSnap) => {
        const data = docSnap.data();
        allItems.push({
          id: docSnap.id,
          type: "Restaurant",
          subcollection: "restaurants",
          icon: "🍽️",
          name: data.name || "",
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          time: data.time || "",
          notes: data.notes || "",
          city: data.city || "",
          state: data.state || "",
          country: data.country || "",
          address: data.address || "",
          phoneNumber: data.phoneNumber || "",
          websiteUrl: data.websiteUrl || "",
        });
      });

      // Sort by startDate chronologically (matching web app logic)
      const parseDate = (dateVal) => {
        if (!dateVal) return 0;
        // Handle Firestore Timestamp objects
        if (dateVal && typeof dateVal.toDate === 'function') {
          return dateVal.toDate().getTime();
        }
        if (dateVal && dateVal.seconds) {
          return dateVal.seconds * 1000;
        }
        // Handle string formats
        if (typeof dateVal === 'string') {
          // Handle YYYY-MM-DD format
          const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(dateVal);
          if (isoMatch) {
            return new Date(parseInt(isoMatch[1]), parseInt(isoMatch[2]) - 1, parseInt(isoMatch[3])).getTime();
          }
          // Handle MM/DD/YYYY format
          const usMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(dateVal);
          if (usMatch) {
            return new Date(parseInt(usMatch[3]), parseInt(usMatch[1]) - 1, parseInt(usMatch[2])).getTime();
          }
        }
        // Fallback to Date parsing
        const parsed = new Date(dateVal).getTime();
        return isNaN(parsed) ? 0 : parsed;
      };

      allItems.sort((a, b) => {
        const sa = parseDate(a.startDate);
        const sb = parseDate(b.startDate);
        return sa - sb;
      });

      setItems(allItems);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching itinerary items:", error);
      setLoading(false);
    }
  }

  const handleCall = (phoneNumber) => {
    Linking.openURL(`tel:${phoneNumber}`);
  };

  const handleDirections = (address, city, state, country) => {
    const destination = [address, city, state, country]
      .filter(Boolean)
      .join(", ");
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
    Linking.openURL(url);
  };

  const handleWebsite = (websiteUrl) => {
    const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`;
    Linking.openURL(url);
  };

  const handlePhotos = (item) => {
    setSelectedItem({
      id: item.id,
      name: item.name,
      subcollection: item.subcollection,
    });
  };

  const renderItem = ({ item }) => {
    const location = [item.city, item.state, item.country]
      .filter(Boolean)
      .join(", ");

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Text style={styles.itemIcon}>{item.icon}</Text>
          <View style={styles.itemInfo}>
            <Text style={styles.itemType}>{item.type.toUpperCase()}</Text>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.notes && (
              <Text style={styles.itemNotes}>Notes: {item.notes}</Text>
            )}
            {location && <Text style={styles.itemLocation}>{location}</Text>}
          </View>

          {/* Action Icons */}
          <View style={styles.actionIcons}>
            {item.phoneNumber && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleCall(item.phoneNumber)}
              >
                <Ionicons name="call-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}

            {(item.address || item.city) && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleDirections(item.address, item.city, item.state, item.country)}
              >
                <Ionicons name="location-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}

            {item.websiteUrl && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handleWebsite(item.websiteUrl)}
              >
                <Ionicons name="globe-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}

            {item.subcollection !== "trip" && (
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => handlePhotos(item)}
              >
                <Ionicons name="images-outline" size={20} color={COLORS.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.itemDetails}>
          {item.startDate && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Date:</Text>
              <Text style={styles.detailValue}>
                {formatDateMMDDYYYY(item.startDate)}
                {item.endDate && item.endDate !== item.startDate
                  ? ` → ${formatDateMMDDYYYY(item.endDate)}`
                  : ""}
              </Text>
            </View>
          )}
          {item.time && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Time:</Text>
              <Text style={styles.detailValue}>{item.time}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <ModalShell visible={visible} title="Trip Itinerary" onClose={onClose} fullScreen noScroll={true}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>📋</Text>
            <Text style={styles.emptyText}>No itinerary items yet</Text>
            <Text style={styles.emptySubtext}>
              Add destinations, activities, accommodations, or restaurants to see your trip timeline
            </Text>
          </View>
        ) : (
          <FlatList
            data={items}
            renderItem={renderItem}
            keyExtractor={(item) => `${item.type}-${item.id}`}
            contentContainerStyle={styles.list}
          />
        )}
      </ModalShell>

      {/* Photo Flipbook Modal */}
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
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: SPACING.md,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  emptySubtext: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
  },
  list: {
    padding: SPACING.md,
  },
  itemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.sm,
  },
  itemIcon: {
    fontSize: 24,
    marginRight: SPACING.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemType: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.primary,
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: 2,
  },
  itemNotes: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 2,
    marginBottom: 4,
  },
  itemLocation: {
    fontSize: 13,
    color: COLORS.muted,
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: SPACING.sm,
  },
  iconButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: COLORS.background,
  },
  itemDetails: {
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceLight,
  },
  detailRow: {
    flexDirection: "row",
    marginBottom: SPACING.xs,
  },
  detailLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    width: 60,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: COLORS.foreground,
  },
});
