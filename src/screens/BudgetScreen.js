import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  collection,
  getDocsFromServer,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import { COLORS, SCREENS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";
import TripBudgetModal from "./TripBudgetModal";

// Read the trip budget from either field (web uses budgetTotal, mobile uses budget)
function getTripBudget(trip) {
  return trip.budgetTotal ?? trip.budget ?? null;
}

function fmt(n) {
  return "$" + Math.abs(Number(n)).toLocaleString("en-US", { maximumFractionDigits: 0 });
}

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

function ProgressBar({ pct }) {
  const color = pct > 90 ? COLORS.error : COLORS.success;
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

/* ── Trip picker modal ── */
function TripPickerModal({ visible, trips, selectedId, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerSheet}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Select Trip</Text>
            <TouchableOpacity onPress={onClose} style={styles.pickerClose}>
              <Text style={styles.pickerCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView>
            <TouchableOpacity
              style={[styles.pickerItem, selectedId === "all" && styles.pickerItemSelected]}
              onPress={() => { onSelect("all"); onClose(); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.pickerItemText, selectedId === "all" && styles.pickerItemTextSelected]}>
                All Trips
              </Text>
            </TouchableOpacity>
            {trips.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.pickerItem, selectedId === t.id && styles.pickerItemSelected]}
                onPress={() => { onSelect(t.id); onClose(); }}
                activeOpacity={0.7}
              >
                <Text style={[styles.pickerItemText, selectedId === t.id && styles.pickerItemTextSelected]}>
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export default function BudgetScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();

  const [trips, setTrips] = useState([]);
  const [expensesByTrip, setExpensesByTrip] = useState({});
  const [placesByTrip, setPlacesByTrip] = useState({});
  const [extrasByTrip, setExtrasByTrip] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState("all");
  const [pickerVisible, setPickerVisible] = useState(false);

  // Trip budget modal
  const [budgetModalTrip, setBudgetModalTrip] = useState(null);

  const loadAll = useCallback(async (isRefresh = false) => {
    if (!user) return;
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const q = query(
        collection(db, "trips"),
        where("ownerId", "==", user.uid),
        orderBy("startDate", "desc")
      );
      const tripsSnap = await getDocsFromServer(q);
      const tripsData = tripsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTrips(tripsData);

      const expMap = {};
      const placeMap = {};
      const extMap = {};
      const PLACE_SUBS = ["destinations", "accommodations", "activities", "restaurants"];

      for (const trip of tripsData) {
        try {
          const expSnap = await getDocsFromServer(collection(db, "trips", trip.id, "expenses"));
          expMap[trip.id] = expSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch (_) {
          expMap[trip.id] = [];
        }

        const tripPlaces = [];
        for (const sub of PLACE_SUBS) {
          try {
            const snap = await getDocsFromServer(collection(db, "trips", trip.id, sub));
            snap.forEach((d) => {
              const data = d.data();
              let amt = null;
              if (data.budgetAmount && data.budgetAmount > 0) {
                amt = data.budgetAmount;
              } else if (data.notes) {
                const m = /Amount:\s*\$?([\d,]+(?:\.\d+)?)/i.exec(data.notes);
                if (m) amt = parseFloat(m[1].replace(/,/g, ""));
              } else if (data.price && Number(data.price) > 0) {
                amt = Number(data.price);
              }
              if (amt && amt > 0) {
                tripPlaces.push({
                  id: d.id,
                  budgetAmount: Number(amt),
                  budgetExpenseId: data.budgetExpenseId ?? null,
                  budgetCurrency: data.budgetCurrency ?? "USD",
                });
              }
            });
          } catch (_) {}
        }
        placeMap[trip.id] = tripPlaces;

        // Extras (Others section)
        let extrasTotal = 0;
        try {
          const extSnap = await getDocsFromServer(collection(db, "trips", trip.id, "extras"));
          extSnap.forEach((d) => {
            const amt = d.data().amount;
            if (amt) {
              const cleaned = String(amt).replace(/[^0-9.]/g, "");
              const n = parseFloat(cleaned);
              if (!isNaN(n) && n > 0) extrasTotal += n;
            }
          });
        } catch (_) {}
        extMap[trip.id] = extrasTotal;
      }

      setExpensesByTrip(expMap);
      setPlacesByTrip(placeMap);
      setExtrasByTrip(extMap);
    } catch (_) {
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const spentByTrip = useMemo(() => {
    const map = {};
    for (const trip of trips) {
      const tripCurrency = trip.budgetCurrency ?? "USD";
      const exps = expensesByTrip[trip.id] ?? [];
      const matchedExps = exps.filter((e) => (e.currency ?? "USD") === tripCurrency);
      const expTotal = matchedExps.reduce((s, e) => s + (e.amount ?? 0), 0);

      // Add unlinked place amounts (same dedup logic as TripBudgetModal)
      const expIds = new Set(matchedExps.map((e) => e.id));
      const expAmts = new Set(matchedExps.map((e) => Math.round((e.amount ?? 0) * 100)));
      const places = placesByTrip[trip.id] ?? [];
      const placeTotal = places
        .filter((p) => {
          if ((p.budgetCurrency ?? "USD") !== tripCurrency) return false;
          if (p.budgetExpenseId && expIds.has(p.budgetExpenseId)) return false;
          if (!p.budgetExpenseId && expAmts.has(Math.round(p.budgetAmount * 100))) return false;
          return true;
        })
        .reduce((s, p) => s + p.budgetAmount, 0);

      map[trip.id] = expTotal + placeTotal + (extrasByTrip[trip.id] ?? 0);
    }
    return map;
  }, [trips, expensesByTrip, placesByTrip, extrasByTrip]);

  const expenseCountByTrip = useMemo(() => {
    const map = {};
    for (const trip of trips) {
      const tripCurrency = trip.budgetCurrency ?? "USD";
      const exps = expensesByTrip[trip.id] ?? [];
      const matchedExps = exps.filter((e) => (e.currency ?? "USD") === tripCurrency);
      const expIds = new Set(matchedExps.map((e) => e.id));
      const expAmts = new Set(matchedExps.map((e) => Math.round((e.amount ?? 0) * 100)));
      const places = placesByTrip[trip.id] ?? [];
      const unlinkedPlaces = places.filter((p) => {
        if ((p.budgetCurrency ?? "USD") !== tripCurrency) return false;
        if (p.budgetExpenseId && expIds.has(p.budgetExpenseId)) return false;
        if (!p.budgetExpenseId && expAmts.has(Math.round(p.budgetAmount * 100))) return false;
        return true;
      });
      map[trip.id] = matchedExps.length + unlinkedPlaces.length;
    }
    return map;
  }, [trips, expensesByTrip, placesByTrip]);

  const displayedTrips = useMemo(
    () => selectedTripId === "all" ? trips : trips.filter((t) => t.id === selectedTripId),
    [selectedTripId, trips]
  );

  const stats = useMemo(() => {
    const totalBudgeted = displayedTrips.reduce((s, t) => s + (getTripBudget(t) ?? 0), 0);
    const totalSpent = displayedTrips.reduce((s, t) => s + (spentByTrip[t.id] ?? 0), 0);
    const remaining = totalBudgeted - totalSpent;
    const usage = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
    const tripsWithBudget = displayedTrips.filter((t) => (getTripBudget(t) ?? 0) > 0).length;
    const expenseCount = displayedTrips.reduce((s, t) => s + (expenseCountByTrip[t.id] ?? 0), 0);
    return { totalBudgeted, totalSpent, remaining, usage, tripsWithBudget, expenseCount };
  }, [displayedTrips, spentByTrip, expenseCountByTrip]);

  if (!user) {
    return (
      <View style={styles.authPrompt}>
        <Text style={styles.authIcon}>💰</Text>
        <Text style={styles.authTitle}>Sign in to view Budget</Text>
        <Text style={styles.authSub}>Track your travel spending across all trips</Text>
        <TouchableOpacity style={styles.authBtn} onPress={() => navigation.navigate(SCREENS.SIGNIN)}>
          <Text style={styles.authBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedLabel = selectedTripId === "all"
    ? "All Trips"
    : trips.find((t) => t.id === selectedTripId)?.name ?? "All Trips";

  return (
    <>
      {/* Full trip budget modal */}
      {budgetModalTrip && (
        <TripBudgetModal
          trip={budgetModalTrip}
          onClose={() => setBudgetModalTrip(null)}
          onDataChange={() => loadAll(true)}
        />
      )}

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadAll(true)} tintColor={COLORS.primary} />}
      >
        {/* ── Header + trip selector ── */}
        <View style={styles.headerRow}>
          <View style={styles.headerText}>
            <Text style={styles.heading}>My Travel Budget</Text>
            <Text style={styles.subheading}>Track spending across all your trips</Text>
          </View>
          <TouchableOpacity style={styles.tripSelector} onPress={() => setPickerVisible(true)} activeOpacity={0.8}>
            <Text style={styles.tripSelectorText} numberOfLines={1}>{selectedLabel}</Text>
            <Text style={styles.tripSelectorChevron}>›</Text>
          </TouchableOpacity>
        </View>

        {/* ── Summary cards ── */}
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.primary} size="small" />
            <Text style={styles.loaderText}>Loading budget data…</Text>
          </View>
        ) : (
          <View style={styles.cardsGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.cardLabel}>TOTAL BUDGETED</Text>
              <Text style={styles.cardValue}>{fmt(stats.totalBudgeted)}</Text>
              <Text style={styles.cardSub}>
                {selectedTripId === "all"
                  ? `${stats.tripsWithBudget} ${stats.tripsWithBudget === 1 ? "trip" : "trips"} with budget`
                  : (getTripBudget(displayedTrips[0]) ? "budget set" : "no budget set")}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.cardLabel}>TOTAL SPENT</Text>
              <Text style={styles.cardValue}>{fmt(stats.totalSpent)}</Text>
              <Text style={styles.cardSub}>{stats.expenseCount} {stats.expenseCount === 1 ? "expense" : "expenses"}</Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.cardLabel}>REMAINING</Text>
              <Text style={[styles.cardValue, { color: stats.remaining >= 0 ? COLORS.success : COLORS.error }]}>
                {fmt(stats.remaining)}
              </Text>
              <Text style={styles.cardSub}>
                {stats.totalBudgeted === 0 ? "no budget set" : stats.remaining >= 0 ? "under budget" : "over budget"}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.cardLabel}>OVERALL USAGE</Text>
              <Text style={[styles.cardValue, { color: stats.usage > 90 ? COLORS.error : COLORS.success }]}>
                {stats.usage.toFixed(0)}%
              </Text>
              <View style={styles.usageBarTrack}>
                <View style={[styles.usageBarFill, { width: `${stats.usage}%`, backgroundColor: stats.usage > 90 ? COLORS.error : COLORS.success }]} />
              </View>
            </View>
          </View>
        )}

        {/* ── Empty state ── */}
        {!loading && trips.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✈️</Text>
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySub}>Add a trip to start tracking your budget</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate(SCREENS.TRIPS)}>
              <Text style={styles.emptyBtnText}>Go to Trips</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Trip cards — tap to open detail modal ── */}
        {!loading && displayedTrips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Your Trips</Text>
            {displayedTrips.map((trip) => {
              const budgeted = getTripBudget(trip) ?? 0;
              const spent = spentByTrip[trip.id] ?? 0;
              const remaining = budgeted - spent;
              const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
              const expCount = expenseCountByTrip[trip.id] ?? 0;

              return (
                <TouchableOpacity
                  key={trip.id}
                  style={styles.tripCard}
                  onPress={() => setBudgetModalTrip(trip)}
                  activeOpacity={0.75}
                >
                  {/* Top row */}
                  <View style={styles.tripTopRow}>
                    <View style={styles.tripInfo}>
                      <Text style={styles.tripName}>{trip.name}</Text>
                      <Text style={styles.tripMeta}>
                        {[trip.city, trip.country].filter(Boolean).join(", ")}
                        {trip.startDate ? `  ·  ${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}` : ""}
                      </Text>
                    </View>
                    <Text style={styles.tripChevron}>›</Text>
                  </View>

                  {/* Progress bar */}
                  <ProgressBar pct={pct} />

                  {/* Stats row */}
                  <View style={styles.statsRow}>
                    <Text style={styles.statText}>
                      {fmt(spent)}{budgeted > 0 ? ` of ${fmt(budgeted)}` : " (no budget set)"}
                    </Text>
                    {budgeted > 0 && <Text style={styles.statText}>{pct.toFixed(0)}% used</Text>}
                    {budgeted > 0 && (
                      <Text style={[styles.statTextBold, { color: remaining >= 0 ? COLORS.success : COLORS.error }]}>
                        {fmt(remaining)} {remaining >= 0 ? "left" : "over"}
                      </Text>
                    )}
                  </View>

                  {/* Expense count hint */}
                  <Text style={styles.expHint}>
                    {expCount > 0
                      ? `${expCount} expense${expCount === 1 ? "" : "s"} logged · tap to manage`
                      : "Tap to view details & add expenses"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Trip picker modal */}
        <TripPickerModal
          visible={pickerVisible}
          trips={trips}
          selectedId={selectedTripId}
          onSelect={setSelectedTripId}
          onClose={() => setPickerVisible(false)}
        />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: scaleSpacing(SPACING.md), paddingBottom: scaleSpacing(SPACING.xxl) },

  headerRow: {
    flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
    gap: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.md), flexWrap: "wrap",
  },
  headerText: { flex: 1 },
  heading:    { fontSize: scaleFontSize(22), fontWeight: "700", color: COLORS.foreground },
  subheading: { fontSize: scaleFontSize(13), color: COLORS.muted, marginTop: scaleSpacing(3) },

  tripSelector: {
    flexDirection: "row", alignItems: "center", gap: scaleSpacing(4),
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(8),
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(7),
    maxWidth: 140,
  },
  tripSelectorText:    { fontSize: scaleFontSize(13), color: COLORS.foreground, flex: 1 },
  tripSelectorChevron: { fontSize: scaleFontSize(18), color: COLORS.muted, lineHeight: scaleFontSize(20) },

  loader:     { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(SPACING.md) },
  loaderText: { fontSize: scaleFontSize(14), color: COLORS.muted },

  cardsGrid: { flexDirection: "row", flexWrap: "wrap", gap: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.md) },
  summaryCard: {
    width: "47.5%",
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(12),
    borderWidth: 1, borderColor: COLORS.border,
    padding: scaleSpacing(SPACING.sm),
  },
  cardLabel: { fontSize: scaleFontSize(9), fontWeight: "700", color: COLORS.muted, letterSpacing: 0.5, marginBottom: scaleSpacing(4) },
  cardValue: { fontSize: scaleFontSize(22), fontWeight: "700", color: COLORS.foreground },
  cardSub:   { fontSize: scaleFontSize(11), color: COLORS.muted, marginTop: scaleSpacing(3) },
  usageBarTrack: { height: scaleFontSize(6), borderRadius: 100, backgroundColor: COLORS.border, overflow: "hidden", marginTop: scaleSpacing(8) },
  usageBarFill:  { height: "100%", borderRadius: 100 },

  progressTrack: { height: scaleFontSize(6), borderRadius: 100, backgroundColor: COLORS.border, overflow: "hidden", marginVertical: scaleSpacing(SPACING.sm) },
  progressFill:  { height: "100%", borderRadius: 100 },

  section:      { gap: scaleSpacing(SPACING.sm) },
  sectionTitle: { fontSize: scaleFontSize(17), fontWeight: "600", color: COLORS.foreground, marginBottom: scaleSpacing(4) },

  tripCard: {
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(14),
    borderWidth: 1, borderColor: COLORS.border,
    padding: scaleSpacing(SPACING.md), marginBottom: scaleSpacing(SPACING.sm),
    gap: scaleSpacing(SPACING.xs),
  },
  tripTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: scaleSpacing(SPACING.sm) },
  tripInfo:   { flex: 1 },
  tripName:   { fontSize: scaleFontSize(15), fontWeight: "600", color: COLORS.foreground },
  tripMeta:   { fontSize: scaleFontSize(11), color: COLORS.muted, marginTop: scaleSpacing(2) },
  tripChevron:{ fontSize: scaleFontSize(22), color: COLORS.muted, lineHeight: scaleFontSize(22) },

  statsRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: scaleSpacing(4) },
  statText:     { fontSize: scaleFontSize(12), color: COLORS.muted },
  statTextBold: { fontSize: scaleFontSize(12), fontWeight: "600" },

  expHint: { fontSize: scaleFontSize(11), color: COLORS.muted, fontStyle: "italic", marginTop: scaleSpacing(2) },

  authPrompt: { flex: 1, justifyContent: "center", alignItems: "center", padding: scaleSpacing(SPACING.lg), backgroundColor: COLORS.background },
  authIcon:   { fontSize: scaleFontSize(48), marginBottom: scaleSpacing(SPACING.md) },
  authTitle:  { fontSize: scaleFontSize(20), fontWeight: "700", color: COLORS.foreground, textAlign: "center" },
  authSub:    { fontSize: scaleFontSize(14), color: COLORS.muted, textAlign: "center", marginTop: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.lg) },
  authBtn:    { backgroundColor: COLORS.primary, paddingVertical: scaleSpacing(SPACING.sm), paddingHorizontal: scaleSpacing(SPACING.xl), borderRadius: scaleFontSize(10) },
  authBtnText:{ fontSize: scaleFontSize(15), fontWeight: "600", color: "#fff" },

  emptyState: { alignItems: "center", paddingVertical: scaleSpacing(SPACING.xxl), gap: scaleSpacing(SPACING.sm) },
  emptyIcon:  { fontSize: scaleFontSize(40) },
  emptyTitle: { fontSize: scaleFontSize(18), fontWeight: "600", color: COLORS.foreground },
  emptySub:   { fontSize: scaleFontSize(13), color: COLORS.muted, textAlign: "center" },
  emptyBtn:   { backgroundColor: COLORS.primary, paddingVertical: scaleSpacing(SPACING.sm), paddingHorizontal: scaleSpacing(SPACING.lg), borderRadius: scaleFontSize(10), marginTop: scaleSpacing(SPACING.sm) },
  emptyBtnText: { fontSize: scaleFontSize(14), fontWeight: "600", color: "#fff" },

  pickerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  pickerSheet:   { backgroundColor: COLORS.background, borderTopLeftRadius: scaleFontSize(20), borderTopRightRadius: scaleFontSize(20), maxHeight: "60%", overflow: "hidden" },
  pickerHeader:  {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(SPACING.md),
    borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface,
  },
  pickerTitle:       { fontSize: scaleFontSize(17), fontWeight: "700", color: COLORS.foreground },
  pickerClose:       { width: scaleFontSize(32), height: scaleFontSize(32), borderRadius: scaleFontSize(16), backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  pickerCloseText:   { fontSize: scaleFontSize(14), color: COLORS.muted },
  pickerItem:        { paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(14), borderBottomWidth: 1, borderBottomColor: `${COLORS.border}66` },
  pickerItemSelected:{ backgroundColor: `${COLORS.primary}12` },
  pickerItemText:    { fontSize: scaleFontSize(15), color: COLORS.foreground },
  pickerItemTextSelected: { color: COLORS.primary, fontWeight: "600" },
});
