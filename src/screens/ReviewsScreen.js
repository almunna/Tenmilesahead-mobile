import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Modal,
  Alert,
} from "react-native";
import {
  collectionGroup,
  getDocs,
  query,
  orderBy,
  where,
  doc,
  getDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import Protected from "../components/Protected";
import { COLORS, SPACING } from "../lib/constants";

const KIND_LABEL = {
  activities: "Activity",
  accommodations: "Accommodation",
  restaurants: "Restaurant",
  cruises: "Cruise",
};

const KIND_OPTIONS = [
  { value: "", label: "All Types" },
  { value: "activities", label: "Activities" },
  { value: "accommodations", label: "Accommodations" },
  { value: "restaurants", label: "Restaurants" },
  { value: "cruises", label: "Cruises" },
];

const fmtMDY = (s) => {
  if (!s) return "";
  if (typeof s === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (m) return `${m[2]}/${m[3]}/${m[1]}`;
  }
  const d = new Date(s);
  return `${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}/${d.getFullYear()}`;
};

export default function ReviewsScreen({ navigation }) {
  return (
    <Protected>
      <ReviewsInner navigation={navigation} />
    </Protected>
  );
}

function ReviewsInner({ navigation }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tiles, setTiles] = useState([]);
  const [cities, setCities] = useState([]);
  const [filterCity, setFilterCity] = useState("");
  const [filterKind, setFilterKind] = useState("");
  const [showKindDropdown, setShowKindDropdown] = useState(false);
  const [openTile, setOpenTile] = useState(null);

  useEffect(() => {
    loadReviews();

    // Set a timeout to auto-cancel if loading takes too long
    const timeout = setTimeout(() => {
      if (loading) {
        setLoading(false);
      }
    }, 30000); // 30 second timeout

    return () => clearTimeout(timeout);
  }, []);

  const loadReviews = async () => {
    setLoading(true);
    try {
      const kinds = ["activities", "accommodations", "restaurants", "cruises"];
      const all = [];
      const tripOwners = new Map();

      // Fetch all reviews in parallel for better performance
      const kindPromises = kinds.map(async (kind) => {
        const qx = query(
          collectionGroup(db, kind),
          orderBy("createdAt", "desc"),
        );
        const snap = await getDocs(qx);
        return { kind, docs: snap.docs };
      });

      const kindResults = await Promise.all(kindPromises);

      // Collect all unique trip IDs first
      const tripIds = new Set();
      for (const { docs } of kindResults) {
        for (const d of docs) {
          const ref = d.ref;
          const parent = ref.parent;
          const trip = parent?.parent;
          const tripId = trip?.id || "";
          if (tripId) tripIds.add(tripId);
        }
      }

      // Fetch all trip owners in parallel (batch)
      const tripPromises = Array.from(tripIds).map(async (tripId) => {
        try {
          const tripDoc = await getDoc(doc(db, "trips", tripId));
          if (tripDoc.exists()) {
            return { tripId, ownerId: tripDoc.data().ownerId || "" };
          }
        } catch (e) {
        }
        return null;
      });

      const tripResults = await Promise.all(tripPromises);
      tripResults.forEach((result) => {
        if (result) {
          tripOwners.set(result.tripId, result.ownerId);
        }
      });

      // Process all documents
      for (const { kind, docs } of kindResults) {
        for (const d of docs) {
          const ref = d.ref;
          const parent = ref.parent;
          const trip = parent?.parent;
          const tripId = trip?.id || "";

          const data = d.data();
          const item = {
            id: d.id,
            tripId,
            ownerId: tripOwners.get(tripId),
            kind,
            name: data.name || "",
            startDate: data.startDate || null,
            endDate: data.endDate || null,
            address: data.address || null,
            city: data.city || "",
            state: data.state || "",
            country: data.country || "",
            price: data.price ?? null,
            priceUnit: data.priceUnit || null,
            cruiseLine: data.cruiseLine || null,
            shipName: data.shipName || null,
            createdAt: data.createdAt || undefined,
          };

          if (item.name && item.country) {
            all.push(item);
          }
        }
      }

      const citySet = new Set(
        all
          .map((r) => (r.city || "").trim())
          .filter(Boolean)
          .sort(),
      );
      setCities(Array.from(citySet));

      // Group by place identity
      const map = new Map();
      for (const r of all) {
        const city = (r.city || "").trim();
        const state = (r.state || "").trim();
        const cruiseLine = (r.cruiseLine || "").trim();
        const shipName = (r.shipName || "").trim();
        const key =
          r.kind === "cruises"
            ? `${r.kind}|${r.name.trim()}|${cruiseLine}|${shipName}|${r.country.trim()}`
            : `${r.kind}|${r.name.trim()}|${city}|${state}|${r.country.trim()}`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            kind: r.kind,
            name: r.name.trim(),
            city,
            state,
            country: r.country.trim(),
            reviewCount: 0,
            thumbs: [],
            reviews: [],
            cruiseLine: cruiseLine || undefined,
            shipName: shipName || undefined,
          });
        }
        const t = map.get(key);
        t.reviewCount += 1;
        t.reviews.push(r);
      }

      const tilesArr = Array.from(map.values());

      // Fetch thumbnails in smaller batches to avoid overwhelming Firebase
      const batchSize = 5;
      const withThumbs = [];

      for (let i = 0; i < tilesArr.length; i += batchSize) {
        const batch = tilesArr.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (tile) => {
            const out = { ...tile, thumbs: [] };
            // Only fetch thumbnails for first review to speed up initial load
            const firstReview = tile.reviews[0];
            if (firstReview && out.thumbs.length < 3) {
              try {
                const qMedia = query(
                  collectionGroup(db, "media"),
                  where("tripId", "==", firstReview.tripId),
                  where("linkedSubcollection", "==", firstReview.kind),
                  where("linkedId", "==", firstReview.id),
                );
                const ms = await getDocs(qMedia);
                for (const m of ms.docs) {
                  const d = m.data();
                  if (
                    d &&
                    (d.type === "image" || d.type === "video") &&
                    d.downloadURL
                  ) {
                    out.thumbs.push({ url: d.downloadURL, type: d.type });
                    if (out.thumbs.length >= 3) break;
                  }
                }
              } catch (e) {
              }
            }
            return out;
          }),
        );
        withThumbs.push(...batchResults);
      }

      withThumbs.sort((a, b) => {
        if (b.reviewCount !== a.reviewCount)
          return b.reviewCount - a.reviewCount;
        return a.name.localeCompare(b.name);
      });

      setTiles(withThumbs);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    return tiles.filter((t) => {
      if (filterKind && t.kind !== filterKind) return false;
      if (filterCity && t.city.toLowerCase() !== filterCity.toLowerCase())
        return false;
      return true;
    });
  }, [tiles, filterCity, filterKind]);

  const handleDelete = async (review) => {
    Alert.alert("Delete Review", `Delete this review for "${review.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteDoc(
              doc(db, "trips", review.tripId, review.kind, review.id),
            );
            loadReviews();
            setOpenTile(null);
          } catch (error) {
            Alert.alert("Error", "Failed to delete review.");
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading reviews...</Text>
        <Text style={styles.loadingSubtext}>
          This may take a moment if you have many trips
        </Text>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => setLoading(false)}
        >
          <Text style={styles.skipButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Global Reviews</Text>
      </View>

      {/* Filters */}
      <View style={styles.filtersCard}>
        <View style={styles.filterRow}>
          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Location (City)</Text>
            <TextInput
              style={styles.filterInput}
              value={filterCity}
              onChangeText={setFilterCity}
              placeholder="Start typing a city..."
              placeholderTextColor={COLORS.muted}
            />
          </View>

          <View style={styles.filterItem}>
            <Text style={styles.filterLabel}>Type</Text>
            <TouchableOpacity
              style={styles.filterSelect}
              onPress={() => setShowKindDropdown(!showKindDropdown)}
            >
              <Text style={styles.filterSelectText}>
                {filterKind
                  ? KIND_LABEL[filterKind] || filterKind
                  : "All Types"}
              </Text>
              <Text style={styles.filterArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.clearButton}
          onPress={() => {
            setFilterCity("");
            setFilterKind("");
          }}
        >
          <Text style={styles.clearButtonText}>Clear Filters</Text>
        </TouchableOpacity>
      </View>

      {/* Kind Dropdown */}
      {showKindDropdown && (
        <View style={styles.dropdown}>
          {KIND_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.label}
              style={styles.dropdownItem}
              onPress={() => {
                setFilterKind(option.value);
                setShowKindDropdown(false);
              }}
            >
              <Text style={styles.dropdownItemText}>{option.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Results Count */}
      <Text style={styles.resultsText}>
        {filtered.length
          ? `Showing ${filtered.length} place${filtered.length > 1 ? "s" : ""}`
          : "No results with these filters."}
      </Text>

      {/* Tiles Grid */}
      <ScrollView
        style={styles.tilesContainer}
        contentContainerStyle={styles.tilesContent}
      >
        {filtered.map((tile) => (
          <TouchableOpacity
            key={tile.key}
            style={styles.tileCard}
            onPress={() => setOpenTile(tile)}
          >
            {/* Thumbs Row */}
            <View style={styles.thumbsRow}>
              {tile.thumbs.length === 0 ? (
                <View style={styles.noThumbsPlaceholder}>
                  <Text style={styles.noThumbsText}>No photos yet</Text>
                </View>
              ) : tile.thumbs.length === 1 ? (
                <Image
                  source={{ uri: tile.thumbs[0].url }}
                  style={styles.singleThumb}
                />
              ) : (
                <View style={styles.multiThumbsRow}>
                  {tile.thumbs.map((thumb, idx) => (
                    <Image
                      key={idx}
                      source={{ uri: thumb.url }}
                      style={styles.multiThumb}
                    />
                  ))}
                </View>
              )}
            </View>

            {/* Tile Body */}
            <View style={styles.tileBody}>
              <View style={styles.tileHeader}>
                <Text style={styles.tileName} numberOfLines={1}>
                  {tile.name}
                </Text>
                <View style={styles.tileBadge}>
                  <Text style={styles.tileBadgeText}>
                    {KIND_LABEL[tile.kind]}
                  </Text>
                </View>
              </View>
              <Text style={styles.tileLocation}>
                {tile.kind === "cruises"
                  ? [tile.cruiseLine, tile.shipName].filter(Boolean).join(" - ")
                  : [tile.city, tile.state, tile.country]
                      .filter(Boolean)
                      .join(", ")}
              </Text>
              <Text style={styles.tileReviewCount}>
                <Text style={styles.tileReviewCountBold}>
                  {tile.reviewCount}
                </Text>{" "}
                review{tile.reviewCount > 1 ? "s" : ""}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Detail Modal */}
      {openTile && (
        <Modal
          visible={true}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setOpenTile(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <View>
                  <Text style={styles.modalTitle}>{openTile.name}</Text>
                  <Text style={styles.modalSubtitle}>
                    {KIND_LABEL[openTile.kind]} •{" "}
                    {openTile.kind === "cruises"
                      ? [openTile.cruiseLine, openTile.shipName]
                          .filter(Boolean)
                          .join(" - ")
                      : [openTile.city, openTile.state, openTile.country]
                          .filter(Boolean)
                          .join(", ")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setOpenTile(null)}
                >
                  <Text style={styles.closeButtonText}>Close</Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody}>
                {openTile.reviews.map((r) => (
                  <View key={r.id} style={styles.reviewItem}>
                    <View style={styles.reviewItemHeader}>
                      <Text style={styles.reviewItemAuthor}>By traveler</Text>
                      <View style={styles.reviewItemActions}>
                        <Text style={styles.reviewItemDate}>
                          {fmtMDY(r.startDate)}
                          {r.endDate ? ` → ${fmtMDY(r.endDate)}` : ""}
                        </Text>
                        {user?.uid === r.ownerId && (
                          <TouchableOpacity
                            style={styles.reviewDeleteButton}
                            onPress={() => handleDelete(r)}
                          >
                            <Text style={styles.reviewDeleteButtonText}>
                              Delete
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                    <Text style={styles.reviewItemLocation}>
                      {r.kind === "cruises"
                        ? [r.cruiseLine, r.shipName]
                            .filter(Boolean)
                            .join(" - ") || "—"
                        : [r.address, r.city, r.state, r.country]
                            .filter(Boolean)
                            .join(", ") || "—"}
                      {r.price != null
                        ? ` • ${r.price}${r.priceUnit ? ` ${r.priceUnit}` : ""}`
                        : ""}
                    </Text>
                  </View>
                ))}

                {openTile.reviews.length === 0 && (
                  <Text style={styles.noReviewsText}>No reviews found.</Text>
                )}

                <Text style={styles.tipText}>
                  Tip: Photos/videos here come from the entries' uploads
                  (Activities, Accommodations, Restaurants, Cruises). All photos
                  also appear in each trip's flipbook.
                </Text>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
    padding: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.md,
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
  loadingSubtext: {
    marginTop: SPACING.sm,
    color: COLORS.muted,
    fontSize: 14,
    textAlign: "center",
  },
  skipButton: {
    marginTop: SPACING.xl,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
  },
  skipButtonText: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "500",
  },
  header: {
    padding: SPACING.md,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  filtersCard: {
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  filterRow: {
    flexDirection: "row",
    gap: SPACING.md,
    marginBottom: SPACING.md,
  },
  filterItem: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  filterInput: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    color: COLORS.foreground,
    fontSize: 14,
  },
  filterSelect: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filterSelectText: {
    color: COLORS.foreground,
    fontSize: 14,
  },
  filterArrow: {
    color: COLORS.muted,
    fontSize: 10,
  },
  clearButton: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingVertical: SPACING.sm,
    alignItems: "center",
  },
  clearButtonText: {
    color: COLORS.foreground,
    fontSize: 14,
  },
  dropdown: {
    position: "absolute",
    top: 180,
    right: SPACING.md,
    left: "50%",
    backgroundColor: COLORS.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    zIndex: 100,
  },
  dropdownItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownItemText: {
    color: COLORS.foreground,
    fontSize: 14,
  },
  resultsText: {
    paddingHorizontal: SPACING.md,
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  tilesContainer: {
    flex: 1,
  },
  tilesContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  tileCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    marginBottom: SPACING.md,
    overflow: "hidden",
  },
  thumbsRow: {
    aspectRatio: 16 / 9,
    backgroundColor: COLORS.surfaceLight,
  },
  noThumbsPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  noThumbsText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  singleThumb: {
    width: "100%",
    height: "100%",
  },
  multiThumbsRow: {
    flex: 1,
    flexDirection: "row",
    gap: 2,
  },
  multiThumb: {
    flex: 1,
    height: "100%",
  },
  tileBody: {
    padding: SPACING.md,
  },
  tileHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  tileName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  tileBadge: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
    marginLeft: SPACING.sm,
  },
  tileBadgeText: {
    fontSize: 10,
    color: COLORS.foreground,
  },
  tileLocation: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  tileReviewCount: {
    fontSize: 14,
    color: COLORS.foreground,
    marginTop: SPACING.xs,
  },
  tileReviewCountBold: {
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: SPACING.sm,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    maxHeight: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  modalSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  closeButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 8,
  },
  closeButtonText: {
    color: COLORS.foreground,
    fontSize: 14,
  },
  modalBody: {
    padding: SPACING.md,
  },
  reviewItem: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  reviewItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  reviewItemAuthor: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.foreground,
  },
  reviewItemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  reviewItemDate: {
    fontSize: 12,
    color: COLORS.muted,
  },
  reviewDeleteButton: {
    backgroundColor: COLORS.error,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
    borderRadius: 4,
  },
  reviewDeleteButtonText: {
    color: COLORS.white,
    fontSize: 11,
  },
  reviewItemLocation: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  noReviewsText: {
    color: COLORS.muted,
    fontSize: 14,
  },
  tipText: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
