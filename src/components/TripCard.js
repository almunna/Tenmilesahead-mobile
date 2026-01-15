import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { collection, query, orderBy, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLORS, SPACING, SCREENS } from "../lib/constants";
import { dateRangeOf } from "../lib/utils";

const { width } = Dimensions.get("window");
const cardWidth = width - SPACING.md * 2;

export default function TripCard({ trip, onMenu, onEdit, onDelete, onShare }) {
  const navigation = useNavigation();
  const [cover, setCover] = useState(null);
  const [allMedia, setAllMedia] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Fetch all media for this trip
  useEffect(() => {
    if (!trip.id) return;

    const q = query(
      collection(db, "trips", trip.id, "media"),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setAllMedia(arr);
      },
      () => setAllMedia([])
    );

    return () => unsub();
  }, [trip.id]);

  // Set current cover based on index
  useEffect(() => {
    if (allMedia.length === 0) {
      setCover(null);
      return;
    }
    const media = allMedia[currentIndex];
    if (media) setCover(media);
  }, [allMedia, currentIndex]);

  // Set initial index based on coverMediaId
  useEffect(() => {
    if (!trip.coverMediaId || allMedia.length === 0) return;
    const idx = allMedia.findIndex((m) => m.id === trip.coverMediaId);
    if (idx !== -1) setCurrentIndex(idx);
  }, [trip.coverMediaId, allMedia]);

  function goToPrevious() {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  }

  function goToNext() {
    if (currentIndex < allMedia.length - 1) setCurrentIndex(currentIndex + 1);
  }

  const coverFocus = trip.coverFocus || { x: 50, y: 50 };

  return (
    <View style={styles.card}>
      {/* Cover Image */}
      <TouchableOpacity
        style={styles.coverContainer}
        onPress={() => navigation.navigate(SCREENS.TRIP_DETAIL, { tripId: trip.id })}
        activeOpacity={0.9}
      >
        {cover?.type === "image" ? (
          <Image
            source={{ uri: cover.downloadURL }}
            style={styles.coverImage}
            resizeMode="cover"
          />
        ) : cover?.type === "video" ? (
          <View style={styles.videoCover}>
            <Text style={styles.videoIcon}>▶</Text>
          </View>
        ) : (
          <View style={styles.noCover}>
            <Text style={styles.noCoverText}>No cover</Text>
          </View>
        )}

        {/* Gradient overlay */}
        <View style={styles.gradient} />

        {/* Trip info overlay */}
        <View style={styles.infoOverlay}>
          <Text style={styles.tripName} numberOfLines={1}>
            {trip.name}
          </Text>
          <Text style={styles.tripDates}>{dateRangeOf(trip)}</Text>
        </View>

        {/* Photo counter */}
        {allMedia.length > 1 && (
          <View style={styles.photoCounter}>
            <Text style={styles.photoCounterText}>
              {currentIndex + 1} / {allMedia.length}
            </Text>
          </View>
        )}

        {/* Navigation arrows */}
        {allMedia.length > 1 && (
          <>
            {currentIndex > 0 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowLeft]}
                onPress={goToPrevious}
              >
                <Text style={styles.navArrowText}>‹</Text>
              </TouchableOpacity>
            )}
            {currentIndex < allMedia.length - 1 && (
              <TouchableOpacity
                style={[styles.navArrow, styles.navArrowRight]}
                onPress={goToNext}
              >
                <Text style={styles.navArrowText}>›</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </TouchableOpacity>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate(SCREENS.TRIP_DETAIL, { tripId: trip.id })}
        >
          <Text style={styles.viewButtonText}>View Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onMenu && onMenu(trip)}
        >
          <Text style={styles.actionIcon}>☰</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onShare && onShare(trip)}
        >
          <Text style={styles.actionIcon}>↗</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit && onEdit(trip)}
        >
          <Text style={styles.actionIcon}>✎</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete && onDelete(trip)}
        >
          <Text style={styles.actionIcon}>🗑</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: cardWidth,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: SPACING.md,
  },
  coverContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
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
  videoIcon: {
    fontSize: 32,
    color: COLORS.white,
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
    fontSize: 12,
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "transparent",
    // React Native doesn't support CSS gradients, use LinearGradient component instead
  },
  infoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.sm,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  tripName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: 2,
  },
  tripDates: {
    fontSize: 11,
    color: COLORS.white,
    opacity: 0.8,
  },
  photoCounter: {
    position: "absolute",
    top: SPACING.xs,
    left: SPACING.xs,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  photoCounterText: {
    fontSize: 10,
    color: COLORS.white,
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    marginTop: -16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  navArrowLeft: {
    left: SPACING.xs,
  },
  navArrowRight: {
    right: SPACING.xs,
  },
  navArrowText: {
    fontSize: 20,
    color: COLORS.white,
    fontWeight: "bold",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    gap: SPACING.sm,
  },
  actionButton: {
    width: 36,
    height: 36,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  actionIcon: {
    fontSize: 16,
    color: COLORS.white,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  viewButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    alignItems: "center",
  },
  viewButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
});
