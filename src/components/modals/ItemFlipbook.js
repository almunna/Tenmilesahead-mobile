import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLORS, SPACING } from "../../lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function ItemFlipbook({
  tripId,
  linkedId,
  subcollection,
  itemName,
  visible,
  onClose,
}) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);
  const flatListRef = useRef(null);

  // Firestore listener
  useEffect(() => {
    if (!visible || !tripId || !linkedId) return;

    const q = query(
      collection(db, "trips", tripId, "media"),
      orderBy("createdAt", "asc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((doc) => {
        const data = doc.data();
        if (
          data.linkedId === linkedId &&
          data.linkedSubcollection === subcollection
        ) {
          arr.push({ id: doc.id, ...data });
        }
      });
      setItems(arr);
      if (index >= arr.length) setIndex(0);
    });

    return () => unsub();
  }, [tripId, linkedId, subcollection, visible]);

  // Prefetch adjacent images whenever index or items change
  useEffect(() => {
    if (items.length === 0) return;
    const toPrefetch = [
      (index + 1) % items.length,
      (index - 1 + items.length) % items.length,
    ];
    toPrefetch.forEach((i) => {
      const item = items[i];
      if (item?.type === "image" && item?.downloadURL) {
        Image.prefetch(item.downloadURL);
      }
    });
  }, [index, items]);

  // Scroll FlatList when arrow buttons are pressed
  const goTo = useCallback(
    (newIndex) => {
      setIndex(newIndex);
      flatListRef.current?.scrollToIndex({ index: newIndex, animated: true });
    },
    []
  );

  const prev = () => goTo((index - 1 + items.length) % items.length);
  const next = () => goTo((index + 1) % items.length);

  // Called when user finishes a swipe
  const onMomentumScrollEnd = (e) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setIndex(newIndex);
  };

  // Required for scrollToIndex to work reliably
  const getItemLayout = useCallback(
    (_, i) => ({ length: SCREEN_WIDTH, offset: SCREEN_WIDTH * i, index: i }),
    []
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={styles.slide}>
        {item.type === "image" ? (
          <Image
            source={{ uri: item.downloadURL }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <Video
            source={{ uri: item.downloadURL }}
            style={styles.video}
            useNativeControls
            resizeMode="contain"
          />
        )}
      </View>
    ),
    []
  );

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={[styles.header, { marginTop: Math.max(insets.top, 50) }]}>
            <Text style={styles.headerText}>
              {itemName}
              {items.length > 1 ? `  ${index + 1} / ${items.length}` : ""}
            </Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {items.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="images-outline" size={64} color={COLORS.surface} />
                <Text style={styles.emptyText}>No media for this item yet</Text>
              </View>
            ) : (
              <>
                <FlatList
                  ref={flatListRef}
                  data={items}
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onMomentumScrollEnd={onMomentumScrollEnd}
                  getItemLayout={getItemLayout}
                  initialScrollIndex={0}
                  windowSize={3}
                  maxToRenderPerBatch={2}
                  removeClippedSubviews={false}
                />

                {/* Arrow buttons — shown over the FlatList */}
                {items.length > 1 && (
                  <>
                    <TouchableOpacity style={styles.prevButton} onPress={prev}>
                      <Ionicons name="chevron-back" size={32} color={COLORS.surface} />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.nextButton} onPress={next}>
                      <Ionicons name="chevron-forward" size={32} color={COLORS.surface} />
                    </TouchableOpacity>
                  </>
                )}
              </>
            )}
          </View>

          {/* Footer — caption + dot indicators */}
          {items.length > 0 && (
            <View style={styles.footer}>
              {items[index]?.caption ? (
                <Text style={styles.captionText}>{items[index].caption}</Text>
              ) : null}
              {items.length > 1 && (
                <View style={styles.dots}>
                  {items.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === index && styles.dotActive]}
                    />
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
  },
  container: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  headerText: {
    fontSize: 14,
    color: COLORS.surface,
    flex: 1,
  },
  closeButton: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 14,
    color: COLORS.surface,
  },
  content: {
    flex: 1,
    position: "relative",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: SPACING.md,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  video: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  prevButton: {
    position: "absolute",
    left: SPACING.md,
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 50,
    padding: SPACING.sm,
  },
  nextButton: {
    position: "absolute",
    right: SPACING.md,
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: 50,
    padding: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
    minHeight: 36,
  },
  captionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  dots: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  dotActive: {
    backgroundColor: COLORS.surface,
    width: 18,
  },
});
