import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";

export default function TravelOverview({ stats }) {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Your Travel Overview</Text>

      {/* Main Stats Grid */}
      <View style={styles.categoryGrid}>
        <TransportStat icon="✈️" count={stats.totalTrips} label="Total Trips" />
        <TransportStat icon="📅" count={stats.daysExplored} label="Days Explored" />
        <TransportStat icon="📷" count={stats.photosCaptured} label="Photos Captured" />
        <TransportStat
          icon="🛣️"
          count={stats.totalMiles.toLocaleString()}
          label="Total Miles"
        />
      </View>

      {/* Secondary Stats Grid */}
      <View style={styles.categoryGrid}>
        <TransportStat icon="🌍" count={`${stats.countriesVisited}/197`} label="Countries Visited" />
        <TransportStat icon="📍" count={`${stats.statesVisited}/50`} label="States Visited (US)" />
        <TransportStat icon="🏙️" count={stats.citiesVisited} label="Cities Visited" />
      </View>

      {/* Transportation Type */}
      <View style={styles.categorySection}>
        <Text style={styles.categoryTitle}>Transportation Type</Text>
        <View style={styles.categoryGrid}>
          <TransportStat
            icon="✈️"
            count={stats.transportationCounts["Airplane"] || 0}
            label="Airplane"
          />
          <TransportStat
            icon="🚌"
            count={stats.transportationCounts["Bus"] || 0}
            label="Bus"
          />
          <TransportStat
            icon="🚗"
            count={stats.transportationCounts["Car"] || 0}
            label="Car"
          />
          <TransportStat
            icon="🚢"
            count={stats.transportationCounts["Cruise"] || 0}
            label="Cruise"
          />
          <TransportStat
            icon="🚕"
            count={stats.transportationCounts["Uber/Taxi"] || 0}
            label="Uber/Taxi"
          />
          <TransportStat
            icon="🚶"
            count={stats.transportationCounts["Walk"] || 0}
            label="Walk"
          />
          <TransportStat
            icon="🚂"
            count={stats.transportationCounts["Train"] || 0}
            label="Train"
          />
          <TransportStat
            icon="🚙"
            count={stats.transportationCounts["RV"] || 0}
            label="RV"
          />
        </View>
      </View>

      {/* Stays by Type */}
      <View style={styles.categorySection}>
        <Text style={styles.categoryTitle}>Stays by Type</Text>
        <View style={styles.categoryGrid}>
          <AccommodationStat
            icon="🏢"
            count={stats.accommodationCounts["Airbnb/VRBO"] || 0}
            label="Airbnb/VRBO"
          />
          <AccommodationStat
            icon="⛺"
            count={stats.accommodationCounts["Camp"] || 0}
            label="Camp"
          />
          <AccommodationStat
            icon="🏢"
            count={stats.accommodationCounts["Condo"] || 0}
            label="Condo"
          />
          <AccommodationStat
            icon="🚢"
            count={stats.accommodationCounts["Cruise"] || 0}
            label="Cruise"
          />
          <AccommodationStat
            icon="👥"
            count={stats.accommodationCounts["Friends/Family"] || 0}
            label="Friends/Family"
          />
          <AccommodationStat
            icon="🛏️"
            count={stats.accommodationCounts["Hostel"] || 0}
            label="Hostel"
          />
          <AccommodationStat
            icon="🏨"
            count={stats.accommodationCounts["Hotel"] || 0}
            label="Hotel"
          />
          <AccommodationStat
            icon="🏠"
            count={stats.accommodationCounts["House"] || 0}
            label="House"
          />
          <AccommodationStat
            icon="🏖️"
            count={stats.accommodationCounts["Resort"] || 0}
            label="Resort"
          />
          <AccommodationStat
            icon="⋯"
            count={stats.accommodationCounts["Other"] || 0}
            label="Other"
          />
        </View>
      </View>

      <Text style={styles.footnote}>
        Note: Counts are cumulative and unique. Repeat visits to the same location
        don't increase totals.
      </Text>
    </View>
  );
}

function TransportStat({ icon, count, label }) {
  return (
    <View style={styles.transportStatCard}>
      <Text style={styles.transportIcon}>{icon}</Text>
      <View style={styles.transportInfo}>
        <Text style={styles.transportCount}>{count}</Text>
        <Text style={styles.transportLabel}>{label}</Text>
      </View>
    </View>
  );
}

function AccommodationStat({ icon, count, label }) {
  return (
    <View style={styles.transportStatCard}>
      <Text style={styles.transportIcon}>{icon}</Text>
      <View style={styles.transportInfo}>
        <Text style={styles.transportCount}>{count}</Text>
        <Text style={styles.transportLabel}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  sectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  categorySection: {
    backgroundColor: "#2c3e50",
    borderRadius: 8,
    padding: scaleSpacing(SPACING.sm),
    marginBottom: scaleSpacing(SPACING.xs),
  },
  categoryTitle: {
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: scaleSpacing(SPACING.xs),
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.xs),
    marginBottom: scaleSpacing(SPACING.xs),
  },
  transportStatCard: {
    backgroundColor: "#3d5266",
    borderRadius: 8,
    padding: scaleSpacing(SPACING.xs),
    paddingVertical: scaleSpacing(SPACING.sm),
    flexDirection: "row",
    alignItems: "center",
    width: "49%",
    minHeight: scaleFontSize(55),
  },
  transportIcon: {
    fontSize: scaleFontSize(22),
    marginRight: scaleSpacing(SPACING.xs),
  },
  transportInfo: {
    flex: 1,
  },
  transportCount: {
    fontSize: scaleFontSize(18),
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: scaleFontSize(20),
  },
  transportLabel: {
    fontSize: scaleFontSize(9),
    color: "rgba(255, 255, 255, 0.9)",
    marginTop: 1,
  },
  footnote: {
    fontSize: scaleFontSize(9),
    color: COLORS.muted,
    textAlign: "center",
    marginTop: scaleSpacing(SPACING.xs),
  },
});
