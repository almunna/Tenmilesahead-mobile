import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import ModalShell from "./ModalShell";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../../lib/constants";

export default function ShareTripModal({ tripId, visible, onClose }) {
  const shareUrl = tripId
    ? `https://tenmilesahead.com/share?tripId=${tripId}`
    : "";

  async function handleShare() {
    if (!shareUrl) return;
    try {
      await Share.share({
        message: `Check out my trip on Ten Miles Ahead! ${shareUrl}`,
        url: shareUrl,
      });
    } catch {
      // user cancelled
    }
  }

  return (
    <ModalShell visible={visible} title="Share Trip" onClose={onClose}>
      <View style={styles.content}>
        <Text style={styles.description}>
          Share this link with anyone to let them view your trip.
        </Text>

        {/* Link display */}
        <View style={styles.linkBox}>
          <Ionicons name="link-outline" size={scaleFontSize(16)} color={COLORS.muted} style={styles.linkIcon} />
          <TextInput
            style={styles.linkInput}
            value={shareUrl}
            editable={false}
            selectTextOnFocus
            numberOfLines={1}
          />
        </View>

        {/* Share button */}
        <TouchableOpacity style={styles.primaryBtn} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={scaleFontSize(18)} color={COLORS.white} />
          <Text style={styles.primaryBtnText}>Share</Text>
        </TouchableOpacity>
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: scaleSpacing(SPACING.md),
  },
  description: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.lg),
    lineHeight: scaleFontSize(20),
  },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    paddingHorizontal: scaleSpacing(SPACING.sm),
    marginBottom: scaleSpacing(SPACING.md),
  },
  linkIcon: {
    marginRight: scaleSpacing(SPACING.xs),
    flexShrink: 0,
  },
  linkInput: {
    flex: 1,
    color: COLORS.foreground,
    fontSize: scaleFontSize(13),
    paddingVertical: scaleSpacing(SPACING.sm),
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scaleSpacing(SPACING.xs),
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: 8,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: scaleFontSize(15),
    fontWeight: "600",
  },
});
