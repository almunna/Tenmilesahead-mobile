import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, SCREENS, scaleFontSize, scaleSpacing } from "../lib/constants";

const TOOLS = [
  {
    icon: "💰",
    label: "Budget",
    description: "Plan and track your travel spending",
    screen: SCREENS.BUDGET,
  },
  {
    icon: "💱",
    label: "Currency Exchange",
    description: "Check live exchange rates worldwide",
    screen: SCREENS.CURRENCY_EXCHANGE,
  },
  {
    icon: "🧳",
    label: "Packing List",
    description: "Never forget essentials again",
    screen: SCREENS.PACKING_LIST,
  },
  {
    icon: "🕐",
    label: "Time Zones",
    description: "Compare times across the globe",
    screen: SCREENS.TIME_ZONES,
  },
  {
    icon: "🍽️",
    label: "Tipping Guide",
    description: "Know the tipping etiquette everywhere",
    screen: SCREENS.TIPPING_GUIDE,
  },
];

export default function TravelToolsScreen() {
  const navigation = useNavigation();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Travel Tools</Text>
      <Text style={styles.subheading}>
        Everything you need to plan a smarter trip
      </Text>

      <View style={styles.grid}>
        {TOOLS.map((tool) => (
          <TouchableOpacity
            key={tool.label}
            style={styles.card}
            onPress={() => navigation.navigate(tool.screen)}
            activeOpacity={0.75}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.icon}>{tool.icon}</Text>
            </View>
            <View style={styles.textBlock}>
              <Text style={styles.label}>{tool.label}</Text>
              <Text style={styles.description}>{tool.description}</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: scaleSpacing(SPACING.lg),
    paddingBottom: scaleSpacing(SPACING.xxl),
  },
  heading: {
    fontSize: scaleFontSize(24),
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  subheading: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.lg),
  },
  grid: {
    gap: scaleSpacing(SPACING.md),
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(14),
    padding: scaleSpacing(SPACING.md),
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.md),
  },
  iconCircle: {
    width: scaleFontSize(48),
    height: scaleFontSize(48),
    borderRadius: scaleFontSize(24),
    backgroundColor: `${COLORS.primary}22`,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  icon: {
    fontSize: scaleFontSize(22),
  },
  textBlock: {
    flex: 1,
  },
  label: {
    fontSize: scaleFontSize(15),
    fontWeight: "600",
    color: COLORS.foreground,
  },
  description: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
    marginTop: scaleSpacing(2),
    lineHeight: scaleFontSize(17),
  },
  arrow: {
    fontSize: scaleFontSize(20),
    color: COLORS.muted,
  },
});
