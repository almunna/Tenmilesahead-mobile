import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
} from "react-native";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { COLORS, SPACING } from "../../lib/constants";
import { Ionicons } from "@expo/vector-icons";
import { Video } from "expo-av";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function ItemFlipbook({
  tripId,
  linkedId,
  subcollection,
  itemName,
  visible,
  onClose,
}) {
  const [items, setItems] = useState([]);
  const [index, setIndex] = useState(0);

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

  const prev = () => {
    setIndex((i) => (i - 1 + items.length) % items.length);
  };

  const next = () => {
    setIndex((i) => (i + 1) % items.length);
  };

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
          <View style={styles.header}>
            <Text style={styles.headerText}>
              {itemName} — {items.length} item{items.length === 1 ? "" : "s"}
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
              <View style={styles.mediaContainer}>
                {items[index].type === "image" ? (
                  <Image
                    source={{ uri: items[index].downloadURL }}
                    style={styles.image}
                    resizeMode="contain"
                  />
                ) : (
                  <Video
                    source={{ uri: items[index].downloadURL }}
                    style={styles.video}
                    useNativeControls
                    resizeMode="contain"
                  />
                )}
              </View>
            )}

            {/* Navigation Buttons */}
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
          </View>

          {/* Footer - Caption */}
          {items.length > 0 && (
            <View style={styles.footer}>
              <Text style={styles.captionText}>
                {items[index].caption || ""}
              </Text>
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
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  container: {
    width: "100%",
    height: "85%",
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
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.8)",
    marginTop: SPACING.md,
  },
  mediaContainer: {
    width: "100%",
    height: "100%",
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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 50,
    padding: SPACING.sm,
  },
  nextButton: {
    position: "absolute",
    right: SPACING.md,
    top: "50%",
    transform: [{ translateY: -20 }],
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 50,
    padding: SPACING.sm,
  },
  footer: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    alignItems: "center",
  },
  captionText: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
  },
});
