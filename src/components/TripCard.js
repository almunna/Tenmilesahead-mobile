import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  PanResponder,
  InteractionManager,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import { collection, query, orderBy, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLORS, SPACING, SCREENS, scaleFontSize, scaleSpacing } from "../lib/constants";
import { dateRangeOf } from "../lib/utils";

const { width } = Dimensions.get("window");
const cardWidth = width - SPACING.md * 2;
const containerHeight = cardWidth / (16 / 9);

function TripCard({ trip, onMenu, onEdit, onDelete, onShare }) {
  const navigation = useNavigation();
  const [cover, setCover] = useState(null);
  const [allMedia, setAllMedia] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imgSize, setImgSize] = useState({ width: 0, height: 0 });
  const [adjustMode, setAdjustMode] = useState(false);
  const [localFocus, setLocalFocus] = useState({ x: 50, y: 50 });

  // Refs for PanResponder callbacks (created once, need current values via refs)
  const adjustModeRef = useRef(false);
  const localFocusRef = useRef({ x: 50, y: 50 });
  const startFocusRef = useRef({ x: 50, y: 50 });
  const imgSizeRef = useRef({ width: 0, height: 0 });
  const tripIdRef = useRef(trip.id);

  // Keep refs in sync with state
  useEffect(() => { adjustModeRef.current = adjustMode; }, [adjustMode]);
  useEffect(() => { localFocusRef.current = localFocus; }, [localFocus]);
  useEffect(() => { imgSizeRef.current = imgSize; }, [imgSize]);
  useEffect(() => { tripIdRef.current = trip.id; }, [trip.id]);

  // Initialize localFocus from trip data
  useEffect(() => {
    const cf = trip.coverFocus || { x: 50, y: 50 };
    setLocalFocus(cf);
    localFocusRef.current = cf;
  }, [trip.coverFocus?.x, trip.coverFocus?.y]);

  // Fetch media for this trip once, deferred until after the navigation animation
  // settles. Using getDocs (not onSnapshot) so each card doesn't hold a persistent
  // Firestore listener — N cards × onSnapshot was flooding the JS thread on mount.
  useEffect(() => {
    if (!trip.id) return;

    let cancelled = false;

    const task = InteractionManager.runAfterInteractions(() => {
      if (cancelled) return;
      const q = query(
        collection(db, "trips", trip.id, "media"),
        orderBy("createdAt", "desc")
      );
      getDocs(q)
        .then((snap) => {
          if (cancelled) return;
          const arr = [];
          snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
          setAllMedia(arr);
        })
        .catch(() => {});
    });

    return () => {
      cancelled = true;
      task.cancel();
    };
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

  // Get image dimensions for cover focus positioning
  useEffect(() => {
    if (cover?.type === "image") {
      if (cover.width && cover.height) {
        const size = { width: cover.width, height: cover.height };
        setImgSize(size);
        imgSizeRef.current = size;
      } else if (cover.downloadURL) {
        Image.getSize(
          cover.downloadURL,
          (w, h) => {
            const size = { width: w, height: h };
            setImgSize(size);
            imgSizeRef.current = size;
          },
          () => {}
        );
      }
    } else {
      setImgSize({ width: 0, height: 0 });
      imgSizeRef.current = { width: 0, height: 0 };
    }
  }, [cover?.downloadURL, cover?.width, cover?.height]);

  // PanResponder for drag-to-reposition
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => adjustModeRef.current,
      onMoveShouldSetPanResponder: () => adjustModeRef.current,
      onPanResponderGrant: () => {
        startFocusRef.current = { ...localFocusRef.current };
      },
      onPanResponderMove: (_, gs) => {
        const { width: iw, height: ih } = imgSizeRef.current;
        if (iw === 0 || ih === 0) return;

        const scaleX = cardWidth / iw;
        const scaleY = containerHeight / ih;
        const scale = Math.max(scaleX, scaleY);

        const maxOX = iw * scale - cardWidth;
        const maxOY = ih * scale - containerHeight;

        const dx = maxOX > 0 ? (gs.dx / maxOX) * 100 : 0;
        const dy = maxOY > 0 ? (gs.dy / maxOY) * 100 : 0;

        const newFocus = {
          x: Math.max(0, Math.min(100, startFocusRef.current.x - dx)),
          y: Math.max(0, Math.min(100, startFocusRef.current.y - dy)),
        };
        localFocusRef.current = newFocus;
        setLocalFocus(newFocus);
      },
      onPanResponderRelease: async () => {
        const focus = localFocusRef.current;
        try {
          await updateDoc(doc(db, "trips", tripIdRef.current), {
            coverFocus: { x: Math.round(focus.x), y: Math.round(focus.y) },
            updatedAt: Date.now(),
          });
        } catch (e) {
        }
      },
    })
  ).current;

  function goToPrevious() {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setAdjustMode(false);
    }
  }

  function goToNext() {
    if (currentIndex < allMedia.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setAdjustMode(false);
    }
  }

  // Calculate image positioning based on coverFocus
  const hasImgSize = imgSize.width > 0 && imgSize.height > 0;
  let computedImageStyle = null;
  if (hasImgSize) {
    const scaleX = cardWidth / imgSize.width;
    const scaleY = containerHeight / imgSize.height;
    const scale = Math.max(scaleX, scaleY);
    const scaledW = imgSize.width * scale;
    const scaledH = imgSize.height * scale;
    const maxOX = scaledW - cardWidth;
    const maxOY = scaledH - containerHeight;

    computedImageStyle = {
      position: "absolute",
      width: scaledW,
      height: scaledH,
      left: -(localFocus.x / 100) * maxOX,
      top: -(localFocus.y / 100) * maxOY,
    };
  }

  return (
    <View style={styles.card}>
      {/* Cover area */}
      <View style={styles.coverContainer}>
        {/* Image / Video / Placeholder */}
        {cover?.type === "image" ? (
          computedImageStyle ? (
            <Image
              source={{ uri: cover.downloadURL }}
              style={computedImageStyle}
              resizeMode="stretch"
            />
          ) : (
            <Image
              source={{ uri: cover.downloadURL }}
              style={styles.coverImage}
              resizeMode="cover"
            />
          )
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
        <View style={styles.gradient} pointerEvents="none" />

        {/* Trip info overlay */}
        <View style={styles.infoOverlay} pointerEvents="none">
          <Text style={styles.tripName} numberOfLines={1}>
            {trip.name}
          </Text>
          <Text style={styles.tripDates}>{dateRangeOf(trip)}</Text>
        </View>

        {/* Photo counter */}
        {allMedia.length > 1 && (
          <View style={styles.photoCounter} pointerEvents="none">
            <Text style={styles.photoCounterText}>
              {currentIndex + 1} / {allMedia.length}
            </Text>
          </View>
        )}

        {/* Mode-specific interactive layers */}
        {adjustMode ? (
          <>
            {/* Drag surface for repositioning */}
            <View style={StyleSheet.absoluteFill} {...panResponder.panHandlers} />

            {/* Drag hint */}
            <View style={styles.adjustHintWrap} pointerEvents="none">
              <View style={styles.adjustHint}>
                <Text style={styles.adjustHintText}>Drag to reposition</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            {/* Tap to navigate to trip detail */}
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              onPress={() => navigation.navigate(SCREENS.TRIP_DETAIL, { tripId: trip.id })}
              activeOpacity={0.9}
            />

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
          </>
        )}

        {/* Adjust / Done button (images only, always on top) */}
        {cover?.type === "image" && (
          <TouchableOpacity
            style={[styles.adjustButton, adjustMode && styles.adjustButtonActive]}
            onPress={() => setAdjustMode(!adjustMode)}
          >
            <Text style={styles.adjustButtonText}>
              {adjustMode ? "Done" : "Move"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.viewButton}
          onPress={() => navigation.navigate(SCREENS.TRIP_DETAIL, { tripId: trip.id })}
        >
          <Ionicons name="eye-outline" size={scaleFontSize(16)} color={COLORS.white} />
          <Text style={styles.viewButtonText}>View Trip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onMenu && onMenu(trip)}
        >
          <Ionicons name="menu-outline" size={scaleFontSize(20)} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onShare && onShare(trip)}
        >
          <Ionicons name="share-social-outline" size={scaleFontSize(20)} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onEdit && onEdit(trip)}
        >
          <Ionicons name="pencil-outline" size={scaleFontSize(20)} color={COLORS.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => onDelete && onDelete(trip)}
        >
          <Ionicons name="trash-outline" size={scaleFontSize(20)} color={COLORS.white} />
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
    marginBottom: scaleSpacing(SPACING.md),
  },
  coverContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    position: "relative",
    overflow: "hidden",
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
    fontSize: scaleFontSize(32),
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
    fontSize: scaleFontSize(12),
  },
  gradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "60%",
    backgroundColor: "transparent",
  },
  infoOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: scaleSpacing(SPACING.sm),
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  tripName: {
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: COLORS.white,
    marginBottom: 2,
  },
  tripDates: {
    fontSize: scaleFontSize(11),
    color: COLORS.white,
    opacity: 0.8,
  },
  photoCounter: {
    position: "absolute",
    top: scaleSpacing(SPACING.xs),
    left: scaleSpacing(SPACING.xs),
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: scaleSpacing(2),
    paddingHorizontal: scaleSpacing(6),
    borderRadius: 4,
  },
  photoCounterText: {
    fontSize: scaleFontSize(10),
    color: COLORS.white,
  },
  navArrow: {
    position: "absolute",
    top: "50%",
    marginTop: scaleFontSize(-16),
    width: scaleFontSize(32),
    height: scaleFontSize(32),
    borderRadius: scaleFontSize(16),
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  navArrowLeft: {
    left: scaleSpacing(SPACING.xs),
  },
  navArrowRight: {
    right: scaleSpacing(SPACING.xs),
  },
  navArrowText: {
    fontSize: scaleFontSize(20),
    color: COLORS.white,
    fontWeight: "bold",
  },
  adjustButton: {
    position: "absolute",
    top: scaleSpacing(SPACING.xs),
    right: scaleSpacing(SPACING.xs),
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: scaleSpacing(4),
    paddingHorizontal: scaleSpacing(10),
    borderRadius: scaleSpacing(12),
  },
  adjustButtonActive: {
    backgroundColor: COLORS.primary,
  },
  adjustButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(11),
    fontWeight: "600",
  },
  adjustHintWrap: {
    position: "absolute",
    bottom: scaleSpacing(40),
    left: 0,
    right: 0,
    alignItems: "center",
  },
  adjustHint: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: scaleSpacing(4),
    paddingHorizontal: scaleSpacing(12),
    borderRadius: scaleSpacing(8),
  },
  adjustHintText: {
    color: COLORS.white,
    fontSize: scaleFontSize(11),
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    padding: scaleSpacing(SPACING.sm),
    gap: scaleSpacing(SPACING.sm),
  },
  actionButton: {
    width: scaleFontSize(36),
    height: scaleFontSize(36),
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  viewButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleSpacing(6),
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.sm),
    borderRadius: 8,
  },
  viewButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },
});

export default React.memo(TripCard, (prev, next) =>
  prev.trip.id === next.trip.id &&
  prev.trip.updatedAt === next.trip.updatedAt &&
  prev.trip.coverMediaId === next.trip.coverMediaId &&
  prev.trip.coverFocus?.x === next.trip.coverFocus?.x &&
  prev.trip.coverFocus?.y === next.trip.coverFocus?.y
);
