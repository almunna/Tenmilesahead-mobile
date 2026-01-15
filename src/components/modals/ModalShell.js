import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
} from "react-native";
import { COLORS, SPACING } from "../../lib/constants";

export default function ModalShell({
  visible,
  title,
  children,
  onClose,
  fullScreen = false,
  noScroll = false, // Set to true when children is already scrollable (FlatList, etc.)
}) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={!fullScreen}
      onRequestClose={onClose}
    >
      {fullScreen ? (
        <SafeAreaView style={styles.fullScreenContainer}>
          <View style={styles.header}>
            <Text style={styles.title}>{title}</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
          {noScroll ? (
            <View style={styles.contentNoScroll}>{children}</View>
          ) : (
            <ScrollView style={styles.content}>{children}</ScrollView>
          )}
        </SafeAreaView>
      ) : (
        <View style={styles.overlay}>
          <View style={styles.container}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            {noScroll ? (
              <View style={styles.scrollContentNoScroll}>{children}</View>
            ) : (
              <ScrollView style={styles.scrollContent}>{children}</ScrollView>
            )}
          </View>
        </View>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  container: {
    backgroundColor: COLORS.background,
    borderRadius: 16,
    width: "100%",
    maxHeight: "80%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 8,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    padding: SPACING.md,
  },
  contentNoScroll: {
    flex: 1,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  scrollContentNoScroll: {
    flex: 1,
  },
});
