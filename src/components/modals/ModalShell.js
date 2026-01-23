import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../../lib/constants";

// Tablet breakpoint (iPad mini width is 768)
const TABLET_BREAKPOINT = 600;

export default function ModalShell({
  visible,
  title,
  children,
  onClose,
  fullScreen = false,
  noScroll = false, // Set to true when children is already scrollable (FlatList, etc.)
}) {
  const { width } = useWindowDimensions();
  const isTablet = width >= TABLET_BREAKPOINT;

  // For fullScreen modals, always use full screen on all devices
  // For non-fullScreen modals, use centered overlay on tablets
  if (fullScreen) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
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
            <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
              {children}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    );
  }

  // Non-fullScreen modals - use overlay on all devices, centered on tablets
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[
          styles.container,
          isTablet && styles.tabletContainer,
        ]}>
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
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
    padding: 0,
  },
  container: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    width: "100%",
    maxHeight: "90%",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabletContainer: {
    maxWidth: 700,
    alignSelf: "center",
    borderRadius: 16,
    marginBottom: scaleSpacing(SPACING.xl),
    maxHeight: "85%",
  },
  fullScreenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.foreground,
  },
  closeButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.sm),
    paddingHorizontal: scaleSpacing(SPACING.md),
    borderRadius: 8,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: scaleSpacing(SPACING.md),
    paddingBottom: scaleSpacing(SPACING.xl),
  },
  contentNoScroll: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
    padding: scaleSpacing(SPACING.md),
  },
  scrollContentNoScroll: {
    flex: 1,
  },
});
