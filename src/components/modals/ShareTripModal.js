import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
} from "react-native";
import { doc, updateDoc, getDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import ModalShell from "./ModalShell";
import { COLORS, SPACING } from "../../lib/constants";

export default function ShareTripModal({ tripId, visible, onClose }) {
  const [shareToken, setShareToken] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate share link
  async function generateShareLink() {
    if (!tripId) return;
    setLoading(true);

    try {
      const tripRef = doc(db, "trips", tripId);
      const tripSnap = await getDoc(tripRef);

      if (tripSnap.exists()) {
        const tripData = tripSnap.data();

        // Check if share token already exists
        if (tripData.shareToken) {
          setShareToken(tripData.shareToken);
        } else {
          // Generate new token
          const token = Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15);

          await updateDoc(tripRef, {
            shareToken: token,
            shareEnabled: true,
            updatedAt: Date.now(),
          });

          setShareToken(token);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate share link");
    } finally {
      setLoading(false);
    }
  }

  // Copy link to clipboard and share
  async function shareLink() {
    if (!shareToken) return;

    const shareUrl = `https://tenmilesahead.com/share/${shareToken}`;

    try {
      await Share.share({
        message: `Check out my trip on Ten Miles Ahead! ${shareUrl}`,
        url: shareUrl,
      });
    } catch (error) {
    }
  }

  // Disable sharing
  async function disableSharing() {
    if (!tripId) return;
    setLoading(true);

    try {
      const tripRef = doc(db, "trips", tripId);
      await updateDoc(tripRef, {
        shareEnabled: false,
        updatedAt: Date.now(),
      });
      setShareToken(null);
      Alert.alert("Success", "Sharing has been disabled");
    } catch (error) {
      Alert.alert("Error", "Failed to disable sharing");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModalShell visible={visible} title="Share Trip" onClose={onClose}>
      <View style={styles.content}>
        {!shareToken ? (
          <>
            <Text style={styles.description}>
              Generate a shareable link to let others view your trip.
            </Text>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={generateShareLink}
              disabled={loading}
            >
              <Text style={styles.buttonText}>
                {loading ? "Generating..." : "Generate Share Link"}
              </Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.label}>Share Link:</Text>
            <View style={styles.linkContainer}>
              <TextInput
                style={styles.linkInput}
                value={`tenmilesahead.com/share/${shareToken}`}
                editable={false}
                selectTextOnFocus
              />
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.button}
                onPress={shareLink}
              >
                <Text style={styles.buttonText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.disableButton}
              onPress={disableSharing}
              disabled={loading}
            >
              <Text style={styles.disableButtonText}>
                {loading ? "Disabling..." : "Disable Sharing"}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ModalShell>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: SPACING.md,
  },
  description: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: SPACING.lg,
    lineHeight: 24,
  },
  label: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.sm,
  },
  linkContainer: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 8,
    marginBottom: SPACING.lg,
  },
  linkInput: {
    color: COLORS.foreground,
    fontSize: 14,
    padding: SPACING.md,
  },
  buttonRow: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  button: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  disableButton: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  disableButtonText: {
    color: COLORS.error,
    fontSize: 14,
  },
});
