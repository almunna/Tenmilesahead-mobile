import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS, SPACING, scaleFontSize, scaleSpacing, VISUAL_CROSSING_API_KEY } from "../../lib/constants";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toC(f) { return Math.round((f - 32) * 5 / 9); }
function fmtTemp(val, unit) { return unit === "F" ? Math.round(val) : toC(val); }

function shortDay(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
}
function shortDate(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Weather icon string → emoji
function weatherEmoji(icon, size = 28) {
  const n = (icon || "").toLowerCase();
  if (n.includes("clear") || n === "sunny")          return { emoji: "☀️", color: "#F59E0B" };
  if (n.includes("partly-cloudy") || n.includes("partly_cloudy")) return { emoji: "⛅", color: "#F59E0B" };
  if (n.includes("thunder") && n.includes("rain"))   return { emoji: "⛈️", color: "#6366f1" };
  if (n.includes("thunder") || n.includes("storm"))  return { emoji: "🌩️", color: "#6366f1" };
  if (n.includes("snow") || n.includes("sleet") || n.includes("freezing")) return { emoji: "❄️", color: "#60A5FA" };
  if (n.includes("rain") || n.includes("drizzle") || n.includes("shower")) return { emoji: "🌧️", color: "#60A5FA" };
  if (n.includes("fog") || n.includes("mist") || n.includes("haze")) return { emoji: "🌫️", color: "#94a3b8" };
  if (n.includes("wind"))                            return { emoji: "💨", color: "#94a3b8" };
  return { emoji: "☁️", color: "#94a3b8" };
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function WeatherModal({ visible, locationName, locationQuery, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [unit, setUnit] = useState("C");
  const [tab, setTab] = useState("temperature");

  useEffect(() => {
    if (!visible || !locationQuery) return;
    setData(null);
    setError(null);
    setLoading(true);
    fetchWeather();
  }, [visible, locationQuery]);

  async function fetchWeather() {
    try {
      const url =
        `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/` +
        `${encodeURIComponent(locationQuery)}` +
        `?key=${VISUAL_CROSSING_API_KEY}` +
        `&unitGroup=us&include=days&contentType=json` +
        `&elements=datetime,tempmax,tempmin,temp,conditions,description,icon,precipprob,humidity,windspeed` +
        `&iconSet=icons2`;

      const resp = await fetch(url);
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `Weather API error ${resp.status}`);
      }
      const json = await resp.json();
      setData(json);
    } catch (e) {
      setError(e.message || "Failed to load weather");
    } finally {
      setLoading(false);
    }
  }

  const days = (data?.days ?? []).slice(0, 7);
  const today = days[0];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.sheet} collapsable={false}>
          {/* ── Header ── */}
          <View style={styles.header}>
            <View>
              <Text style={styles.headerTitle}>Weather Forecast</Text>
              <Text style={styles.headerSub}>{locationName}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={scaleFontSize(22)} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* ── Body ── */}
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.loadingText}>Loading weather…</Text>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <Ionicons name="cloud-offline-outline" size={48} color={COLORS.muted} />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => { setError(null); setLoading(true); fetchWeather(); }}>
                <Text style={styles.retryText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : !data ? null : (
            <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent} showsVerticalScrollIndicator={false}>

              {/* ── Today hero ── */}
              {today && (
                <View style={styles.heroCard}>
                  {/* Left: icon */}
                  <Text style={styles.heroEmoji}>{weatherEmoji(today.icon, 64).emoji}</Text>

                  {/* Middle: temp + condition */}
                  <View style={styles.heroMiddle}>
                    <View style={styles.heroTempRow}>
                      <Text style={styles.heroTemp}>{fmtTemp(today.temp, unit)}°</Text>
                      <View style={styles.unitToggle}>
                        <TouchableOpacity onPress={() => setUnit("C")}>
                          <Text style={[styles.unitBtn, unit === "C" && styles.unitBtnActive]}>C</Text>
                        </TouchableOpacity>
                        <Text style={styles.unitSep}>|</Text>
                        <TouchableOpacity onPress={() => setUnit("F")}>
                          <Text style={[styles.unitBtn, unit === "F" && styles.unitBtnActive]}>F</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                    <Text style={styles.heroConditions}>{today.conditions}</Text>
                    <Text style={styles.heroDate}>{shortDay(today.datetime)}, {shortDate(today.datetime)}</Text>
                  </View>

                  {/* Right: stats */}
                  <View style={styles.heroStats}>
                    <Text style={styles.heroStatRow}>
                      <Text style={styles.heroStatLabel}>Precipitation: </Text>
                      <Text style={styles.heroStatValue}>{Math.round(today.precipprob ?? 0)}%</Text>
                    </Text>
                    <Text style={styles.heroStatRow}>
                      <Text style={styles.heroStatLabel}>Humidity: </Text>
                      <Text style={styles.heroStatValue}>{Math.round(today.humidity ?? 0)}%</Text>
                    </Text>
                    <Text style={styles.heroStatRow}>
                      <Text style={styles.heroStatLabel}>Wind: </Text>
                      <Text style={styles.heroStatValue}>{Math.round((today.windspeed ?? 0) * 1.609)} km/h</Text>
                    </Text>
                  </View>
                </View>
              )}

              {/* ── Tabs ── */}
              <View style={styles.tabs}>
                {["temperature", "precipitation", "wind"].map((t) => (
                  <TouchableOpacity key={t} style={styles.tabItem} onPress={() => setTab(t)}>
                    <Text style={[styles.tabLabel, tab === t && styles.tabLabelActive]}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </Text>
                    {tab === t && <View style={styles.tabUnderline} />}
                  </TouchableOpacity>
                ))}
              </View>

              {/* ── 7-day forecast ── */}
              <View style={styles.forecast}>
                {days.map((day) => {
                  const { emoji } = weatherEmoji(day.icon);
                  return (
                    <View key={day.datetime} style={styles.forecastRow}>
                      {/* Day */}
                      <Text style={styles.forecastDay}>{shortDay(day.datetime)}</Text>

                      {/* Icon */}
                      <Text style={styles.forecastEmoji}>{emoji}</Text>

                      {/* Condition */}
                      <Text style={styles.forecastConditions} numberOfLines={1}>{day.conditions}</Text>

                      {/* Tab value */}
                      {tab === "temperature" && (
                        <View style={styles.forecastTemps}>
                          <Text style={styles.forecastTempHigh}>{fmtTemp(day.tempmax, unit)}°</Text>
                          <Text style={styles.forecastTempLow}>/ {fmtTemp(day.tempmin, unit)}°</Text>
                        </View>
                      )}
                      {tab === "precipitation" && (
                        <View style={styles.precipRow}>
                          <View style={styles.precipBar}>
                            <View style={[styles.precipFill, { width: `${Math.round(day.precipprob ?? 0)}%` }]} />
                          </View>
                          <Text style={styles.precipPct}>{Math.round(day.precipprob ?? 0)}%</Text>
                        </View>
                      )}
                      {tab === "wind" && (
                        <Text style={styles.windValue}>{Math.round((day.windspeed ?? 0) * 1.609)} km/h</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Description */}
              {data?.description ? (
                <Text style={styles.description}>{data.description}</Text>
              ) : null}
            </ScrollView>
          )}
        </SafeAreaView>
      </View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: "60%",
    maxHeight: "90%",
    overflow: "hidden",
  },

  // Header
  header: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.md),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "700",
    color: "#fff",
  },
  headerSub: {
    fontSize: scaleFontSize(13),
    color: "rgba(255,255,255,0.8)",
    marginTop: 2,
  },

  // Loading / error
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: scaleSpacing(SPACING.xl),
    minHeight: 200,
  },
  loadingText: {
    marginTop: scaleSpacing(SPACING.sm),
    fontSize: scaleFontSize(14),
    color: "#64748b",
  },
  errorText: {
    marginTop: scaleSpacing(SPACING.sm),
    fontSize: scaleFontSize(13),
    color: "#dc2626",
    textAlign: "center",
    lineHeight: scaleFontSize(18),
  },
  retryBtn: {
    marginTop: scaleSpacing(SPACING.md),
    backgroundColor: COLORS.primary,
    paddingHorizontal: scaleSpacing(SPACING.lg),
    paddingVertical: scaleSpacing(SPACING.sm),
    borderRadius: 8,
  },
  retryText: {
    color: "#fff",
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: scaleSpacing(SPACING.md),
    paddingBottom: scaleSpacing(SPACING.xl),
  },

  // Hero card
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
    paddingBottom: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
  },
  heroEmoji: {
    fontSize: scaleFontSize(56),
    flexShrink: 0,
  },
  heroMiddle: {
    flex: 1,
  },
  heroTempRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(6),
    marginBottom: 2,
  },
  heroTemp: {
    fontSize: scaleFontSize(40),
    fontWeight: "800",
    color: "#1e293b",
    lineHeight: scaleFontSize(46),
  },
  unitToggle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 2,
  },
  unitBtn: {
    fontSize: scaleFontSize(13),
    fontWeight: "700",
    color: "#94a3b8",
    paddingHorizontal: 3,
  },
  unitBtnActive: {
    color: COLORS.primary,
  },
  unitSep: {
    color: "#cbd5e1",
    fontSize: scaleFontSize(13),
  },
  heroConditions: {
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: "#475569",
  },
  heroDate: {
    fontSize: scaleFontSize(12),
    color: "#94a3b8",
    marginTop: 2,
  },
  heroStats: {
    alignItems: "flex-end",
    flexShrink: 0,
  },
  heroStatRow: {
    fontSize: scaleFontSize(11),
    lineHeight: scaleFontSize(18),
  },
  heroStatLabel: {
    color: "#94a3b8",
  },
  heroStatValue: {
    fontWeight: "700",
    color: "#334155",
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#f1f5f9",
    marginBottom: scaleSpacing(SPACING.sm),
  },
  tabItem: {
    marginRight: scaleSpacing(SPACING.lg),
    paddingBottom: scaleSpacing(SPACING.sm),
    position: "relative",
  },
  tabLabel: {
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: "#94a3b8",
  },
  tabLabelActive: {
    color: "#1e293b",
  },
  tabUnderline: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: "#F59E0B",
    borderRadius: 1,
  },

  // Forecast rows
  forecast: {
    gap: 2,
  },
  forecastRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scaleSpacing(6),
    gap: scaleSpacing(SPACING.sm),
  },
  forecastDay: {
    width: scaleFontSize(32),
    fontSize: scaleFontSize(12),
    fontWeight: "700",
    color: "#64748b",
    flexShrink: 0,
  },
  forecastEmoji: {
    fontSize: scaleFontSize(22),
    flexShrink: 0,
    width: scaleFontSize(28),
    textAlign: "center",
  },
  forecastConditions: {
    flex: 1,
    fontSize: scaleFontSize(12),
    color: "#64748b",
  },
  forecastTemps: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    flexShrink: 0,
  },
  forecastTempHigh: {
    fontSize: scaleFontSize(13),
    fontWeight: "700",
    color: "#f97316",
  },
  forecastTempLow: {
    fontSize: scaleFontSize(13),
    color: "#94a3b8",
  },
  precipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.xs),
    flexShrink: 0,
  },
  precipBar: {
    width: scaleFontSize(60),
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f1f5f9",
    overflow: "hidden",
  },
  precipFill: {
    height: "100%",
    borderRadius: 3,
    backgroundColor: "#60A5FA",
  },
  precipPct: {
    fontSize: scaleFontSize(12),
    fontWeight: "700",
    color: "#475569",
    width: scaleFontSize(28),
    textAlign: "right",
  },
  windValue: {
    fontSize: scaleFontSize(12),
    fontWeight: "700",
    color: "#475569",
    flexShrink: 0,
  },

  // Description
  description: {
    marginTop: scaleSpacing(SPACING.md),
    paddingTop: scaleSpacing(SPACING.md),
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
    fontSize: scaleFontSize(12),
    color: "#94a3b8",
    lineHeight: scaleFontSize(18),
  },
});
