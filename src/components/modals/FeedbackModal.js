import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../AuthProvider";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../../lib/constants";

export default function FeedbackModal({ visible, onClose }) {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleClose() {
    setRating(0);
    setComment("");
    onClose();
  }

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a rating before submitting.");
      return;
    }

    if (!user) {
      Alert.alert("Sign In Required", "Please sign in to submit feedback.");
      handleClose();
      return;
    }

    setSubmitting(true);
    try {
      await addDoc(collection(db, "feedback"), {
        userId: user.uid,
        userEmail: user.email || null,
        rating,
        comment: comment.trim(),
        createdAt: Date.now(),
        platform: "mobile",
      });
      Alert.alert("Thank You!", "Your feedback has been submitted successfully.");
      handleClose();
    } catch (error) {
      Alert.alert("Error", "Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Send Feedback</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Rating */}
          <Text style={styles.label}>Rating</Text>
          <View style={styles.starsRow}>
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setRating(star)}
                style={styles.starButton}
              >
                <Text style={[styles.star, rating >= star && styles.starFilled]}>
                  ★
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={styles.ratingHint}>
            {rating === 0 ? "Select a rating" : `${rating} star${rating > 1 ? "s" : ""}`}
          </Text>

          {/* Comment */}
          <Text style={[styles.label, styles.commentLabel]}>Comment</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Tell us what you think..."
            placeholderTextColor={COLORS.muted}
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />

          {/* Buttons */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitButton, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  container: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(16),
    padding: scaleSpacing(SPACING.lg),
    width: "100%",
    maxWidth: 440,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleSpacing(SPACING.lg),
  },
  title: {
    fontSize: scaleFontSize(20),
    fontWeight: "600",
    color: COLORS.foreground,
  },
  closeButton: {
    padding: scaleSpacing(SPACING.xs),
  },
  closeButtonText: {
    fontSize: scaleFontSize(18),
    color: COLORS.muted,
  },
  label: {
    fontSize: scaleFontSize(14),
    fontWeight: "500",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  commentLabel: {
    marginTop: scaleSpacing(SPACING.md),
  },
  starsRow: {
    flexDirection: "row",
    gap: scaleSpacing(SPACING.sm),
  },
  starButton: {
    padding: scaleSpacing(2),
  },
  star: {
    fontSize: scaleFontSize(32),
    color: COLORS.border,
  },
  starFilled: {
    color: COLORS.primary,
  },
  ratingHint: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
    marginTop: scaleSpacing(SPACING.xs),
    marginBottom: scaleSpacing(SPACING.xs),
  },
  textArea: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scaleFontSize(8),
    padding: scaleSpacing(SPACING.md),
    fontSize: scaleFontSize(15),
    color: COLORS.foreground,
    minHeight: scaleFontSize(120),
    textAlignVertical: "top",
  },
  buttonRow: {
    flexDirection: "row",
    gap: scaleSpacing(SPACING.sm),
    marginTop: scaleSpacing(SPACING.lg),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(24),
    alignItems: "center",
    backgroundColor: COLORS.primary,
  },
  cancelButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  submitButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(24),
    alignItems: "center",
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
