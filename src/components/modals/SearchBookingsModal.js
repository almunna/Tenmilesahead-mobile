import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  ScrollView,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../../lib/constants";

// Booking service definitions
// {dest} is replaced with URL-encoded destination string at runtime
const BOOKING_SERVICES = [
  {
    label: "Airport Transfers",
    icon: "airplane-outline",
    iconColor: "#5eb9b3",
    url: "https://tpx.gr/JqYXUQTB",
  },
  {
    label: "Food & Drink",
    icon: "navigate-outline",
    iconColor: "#ef4444",
    url: "https://www.yelp.com/search?find_desc=restaurants&find_loc={dest}",
  },
  {
    label: "Reserve a Table",
    icon: "restaurant-outline",
    iconColor: "#ef4444",
    url: "https://www.opentable.com/s/?term={dest}",
  },
  {
    label: "Hotels",
    icon: "bed-outline",
    iconColor: "#1d4ed8",
    url: "http://www.awin1.com/awclick.php?mid=6776&id=2773070",
  },
  {
    label: "Theme Parks (U.S.)",
    icon: "chatbubble-ellipses-outline",
    iconColor: "#5eb9b3",
    url: "https://www.dpbolvw.net/click-101693012-12521347",
  },
  {
    label: "Tours/Activities",
    icon: "location-outline",
    iconColor: "#f59e0b",
    url: "https://www.getyourguide.com/?partner_id=BFKZPLS&utm_medium=online_publisher",
  },
  {
    label: "Campgrounds",
    icon: "bonfire-outline",
    iconColor: "#5eb9b3",
    url: "https://tidd.ly/3PI8IWa",
  },
  {
    label: "Audio Tours",
    icon: "mic-outline",
    iconColor: "#5eb9b3",
    url: "https://tidd.ly/3Nd2VHo",
  },
];

export default function SearchBookingsModal({ visible, onClose, destinationName, destinationLocation }) {
  const destEncoded = encodeURIComponent(
    destinationLocation || destinationName || ""
  );

  function handlePress(service) {
    const url = service.url.replace("{dest}", destEncoded);
    Linking.openURL(url).catch(() => {});
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="search-outline" size={scaleFontSize(18)} color={COLORS.white} style={{ marginRight: 8 }} />
              <Text style={styles.headerTitle} numberOfLines={1}>
                {destinationName || "Search"}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={scaleFontSize(22)} color={COLORS.white} />
            </TouchableOpacity>
          </View>

          {/* Service Grid */}
          <ScrollView contentContainerStyle={styles.gridContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.grid}>
              {BOOKING_SERVICES.map((service) => (
                <TouchableOpacity
                  key={service.label}
                  style={styles.tile}
                  onPress={() => handlePress(service)}
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={service.icon}
                    size={scaleFontSize(32)}
                    color={service.iconColor}
                    style={styles.tileIcon}
                  />
                  <Text style={styles.tileLabel}>{service.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Disclaimer */}
            <Text style={styles.disclaimer}>
              Ten Miles Ahead may receive a small commission for any booking made using the links above.
            </Text>
          </ScrollView>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "80%",
    overflow: "hidden",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.md),
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: scaleSpacing(SPACING.sm),
  },
  headerTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "700",
    color: COLORS.white,
    flex: 1,
  },
  closeBtn: {
    padding: 4,
  },

  // Grid
  gridContainer: {
    backgroundColor: COLORS.white,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingTop: scaleSpacing(SPACING.md),
    paddingBottom: scaleSpacing(SPACING.lg),
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.sm),
    justifyContent: "space-between",
  },
  tile: {
    width: "48%",
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingVertical: scaleSpacing(SPACING.lg),
    paddingHorizontal: scaleSpacing(SPACING.sm),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  tileIcon: {
    marginBottom: scaleSpacing(SPACING.sm),
  },
  tileLabel: {
    fontSize: scaleFontSize(13),
    fontWeight: "500",
    color: "#111827",
    textAlign: "center",
    lineHeight: scaleFontSize(18),
  },

  // Disclaimer
  disclaimer: {
    marginTop: scaleSpacing(SPACING.md),
    fontSize: scaleFontSize(11),
    color: "#6b7280",
    textAlign: "center",
    lineHeight: scaleFontSize(16),
    paddingHorizontal: scaleSpacing(SPACING.sm),
  },
});
