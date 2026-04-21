import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  collection,
  doc,
  getDocsFromServer,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { useNavigation } from "@react-navigation/native";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import { COLORS, SCREENS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";

const SUBCOLLECTIONS = [
  { key: "destinations",   label: "Destinations" },
  { key: "activities",     label: "Activities" },
  { key: "accommodations", label: "Accommodations" },
  { key: "restaurants",    label: "Restaurants" },
  { key: "cruises",        label: "Cruises" },
];

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
  const [categoryByTrip, setCategoryByTrip] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedTripId, setSelectedTripId] = useState("all");
  const [pickerVisible, setPickerVisible] = useState(false);

  // Budget editing
  const [editingId, setEditingId] = useState(null);
  const [budgetInput, setBudgetInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Real-time trips — use server source to bypass stale cache
  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "trips"),
      where("ownerId", "==", user.uid),
      orderBy("startDate", "desc")
    );
    // Force initial fetch from server so budget/price fields are never stale
    getDocsFromServer(q)
      .then((snap) => setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => {});
    // Then keep live updates
    const unsub = onSnapshot(q, (snap) => {
      setTrips(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [user]);

  // Load prices from subcollections whenever trips change
  useEffect(() => {
    if (!user || trips.length === 0) { setLoading(false); return; }

    async function loadExpenses() {
      setLoading(true);
      try {
        const catMap = {};
        for (const trip of trips) {
          const cats = [];
          for (const sub of SUBCOLLECTIONS) {
            try {
              const snap = await getDocsFromServer(collection(db, "trips", trip.id, sub.key));
              let total = 0, count = 0;
              snap.forEach((d) => {
                const price = d.data().price;
                if (price != null && !isNaN(Number(price))) {
                  total += Number(price);
                  count += 1;
                }
              });
              if (count > 0) cats.push({ label: sub.label, total, count });
            } catch (_) {
              // subcollection read denied or missing — skip
            }
          }
          catMap[trip.id] = cats;
        }
        setCategoryByTrip(catMap);
      } finally {
        setLoading(false);
      }
    }

    loadExpenses();
  }, [user, trips]);

  const spentByTrip = useMemo(() => {
    const map = {};
    for (const [id, cats] of Object.entries(categoryByTrip)) {
      map[id] = cats.reduce((s, c) => s + c.total, 0);
    }
    return map;
  }, [categoryByTrip]);

  const expenseCountByTrip = useMemo(() => {
    const map = {};
    for (const [id, cats] of Object.entries(categoryByTrip)) {
      map[id] = cats.reduce((s, c) => s + c.count, 0);
    }
    return map;
  }, [categoryByTrip]);

  const displayedTrips = useMemo(
    () => selectedTripId === "all" ? trips : trips.filter((t) => t.id === selectedTripId),
    [selectedTripId, trips]
  );

  const stats = useMemo(() => {
    const totalBudgeted = displayedTrips.reduce((s, t) => s + (t.budget ?? 0), 0);
    const totalSpent = displayedTrips.reduce((s, t) => s + (spentByTrip[t.id] ?? 0), 0);
    const remaining = totalBudgeted - totalSpent;
    const usage = totalBudgeted > 0 ? Math.min((totalSpent / totalBudgeted) * 100, 100) : 0;
    const tripsWithBudget = displayedTrips.filter((t) => t.budget != null && t.budget > 0).length;
    const expenseCount = displayedTrips.reduce((s, t) => s + (expenseCountByTrip[t.id] ?? 0), 0);
    return { totalBudgeted, totalSpent, remaining, usage, tripsWithBudget, expenseCount };
  }, [displayedTrips, spentByTrip, expenseCountByTrip]);

  async function saveBudget(tripId) {
    if (saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "trips", tripId), {
        budget: budgetInput !== "" ? Number(budgetInput) : null,
        updatedAt: Date.now(),
      });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  }

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
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
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
          {/* Total Budgeted */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>TOTAL BUDGETED</Text>
            <Text style={styles.cardValue}>{fmt(stats.totalBudgeted)}</Text>
            <Text style={styles.cardSub}>
              {selectedTripId === "all"
                ? `${stats.tripsWithBudget} ${stats.tripsWithBudget === 1 ? "trip" : "trips"} with budget`
                : (displayedTrips[0]?.budget ? "budget set" : "no budget set")}
            </Text>
          </View>

          {/* Total Spent */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>TOTAL SPENT</Text>
            <Text style={styles.cardValue}>{fmt(stats.totalSpent)}</Text>
            <Text style={styles.cardSub}>{stats.expenseCount} {stats.expenseCount === 1 ? "expense" : "expenses"}</Text>
          </View>

          {/* Remaining */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>REMAINING</Text>
            <Text style={[styles.cardValue, { color: stats.remaining >= 0 ? COLORS.success : COLORS.error }]}>
              {fmt(stats.remaining)}
            </Text>
            <Text style={styles.cardSub}>
              {stats.totalBudgeted === 0 ? "no budget set" : stats.remaining >= 0 ? "under budget" : "over budget"}
            </Text>
          </View>

          {/* Overall Usage */}
          <View style={styles.summaryCard}>
            <Text style={styles.cardLabel}>OVERALL USAGE</Text>
            <Text style={[styles.cardValue, { color: stats.usage > 90 ? COLORS.error : COLORS.success }]}>
              {stats.usage.toFixed(0)}%
            </Text>
            <View style={styles.usageBarTrack}>
              <View
                style={[styles.usageBarFill, {
                  width: `${stats.usage}%`,
                  backgroundColor: stats.usage > 90 ? COLORS.error : COLORS.success,
                }]}
              />
            </View>
          </View>
        </View>
      )}

      {/* ── Trip cards ── */}
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

      {!loading && displayedTrips.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Trips</Text>
          {displayedTrips.map((trip) => {
            const budgeted = trip.budget ?? 0;
            const spent = spentByTrip[trip.id] ?? 0;
            const remaining = budgeted - spent;
            const pct = budgeted > 0 ? Math.min((spent / budgeted) * 100, 100) : 0;
            const cats = categoryByTrip[trip.id] ?? [];
            const isEditing = editingId === trip.id;

            return (
              <View key={trip.id} style={styles.tripCard}>
                {/* Top row */}
                <View style={styles.tripTopRow}>
                  <View style={styles.tripInfo}>
                    <Text style={styles.tripName}>{trip.name}</Text>
                    <Text style={styles.tripMeta}>
                      {[trip.city, trip.country].filter(Boolean).join(", ")}
                      {trip.startDate ? `  ·  ${fmtDate(trip.startDate)} – ${fmtDate(trip.endDate)}` : ""}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.manageBudgetBtn}
                    onPress={() => {
                      if (isEditing) {
                        setEditingId(null);
                      } else {
                        setEditingId(trip.id);
                        setBudgetInput(trip.budget != null ? String(trip.budget) : "");
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.manageBudgetText}>{isEditing ? "Cancel" : "Manage Budget"}</Text>
                  </TouchableOpacity>
                </View>

                {/* Inline budget editor */}
                {isEditing && (
                  <View style={styles.budgetEditor}>
                    <Text style={styles.budgetEditorLabel}>Trip Budget ($)</Text>
                    <TextInput
                      style={styles.budgetEditorInput}
                      value={budgetInput}
                      onChangeText={setBudgetInput}
                      placeholder="e.g. 5000"
                      placeholderTextColor={COLORS.muted}
                      keyboardType="decimal-pad"
                      autoFocus
                    />
                    <TouchableOpacity
                      style={[styles.saveBudgetBtn, saving && { opacity: 0.6 }]}
                      onPress={() => saveBudget(trip.id)}
                      disabled={saving}
                      activeOpacity={0.8}
                    >
                      {saving ? (
                        <ActivityIndicator color="#fff" size="small" />
                      ) : (
                        <Text style={styles.saveBudgetText}>Save</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                )}

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

                {/* Category breakdown chips */}
                {cats.length > 0 ? (
                  <View style={styles.chipsRow}>
                    {cats.map((c) => (
                      <View key={c.label} style={styles.chip}>
                        <Text style={styles.chipText}>
                          {c.label}: {fmt(c.total)} from {c.count} {c.count === 1 ? "item" : "items"}
                        </Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={styles.noCatsText}>
                    No priced items yet (add prices to activities, accommodations, restaurants, or destinations)
                  </Text>
                )}
              </View>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: scaleSpacing(SPACING.md), paddingBottom: scaleSpacing(SPACING.xxl) },

  /* Header */
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

  /* Loader */
  loader:     { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(SPACING.md) },
  loaderText: { fontSize: scaleFontSize(14), color: COLORS.muted },

  /* Summary cards — 2x2 grid */
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

  /* Progress bar (per-trip) */
  progressTrack: { height: scaleFontSize(6), borderRadius: 100, backgroundColor: COLORS.border, overflow: "hidden", marginVertical: scaleSpacing(SPACING.sm) },
  progressFill:  { height: "100%", borderRadius: 100 },

  /* Section */
  section:      { gap: scaleSpacing(SPACING.sm) },
  sectionTitle: { fontSize: scaleFontSize(17), fontWeight: "600", color: COLORS.foreground, marginBottom: scaleSpacing(4) },

  /* Trip cards */
  tripCard: {
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(14),
    borderWidth: 1, borderColor: COLORS.border,
    padding: scaleSpacing(SPACING.md), marginBottom: scaleSpacing(SPACING.sm),
    gap: scaleSpacing(SPACING.xs),
  },
  tripTopRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: scaleSpacing(SPACING.sm), flexWrap: "wrap" },
  tripInfo:   { flex: 1 },
  tripName:   { fontSize: scaleFontSize(15), fontWeight: "600", color: COLORS.foreground },
  tripMeta:   { fontSize: scaleFontSize(11), color: COLORS.muted, marginTop: scaleSpacing(2) },

  manageBudgetBtn: {
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(8),
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(6),
  },
  manageBudgetText: { fontSize: scaleFontSize(12), fontWeight: "600", color: COLORS.foreground },

  /* Budget editor */
  budgetEditor: {
    flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.sm),
    backgroundColor: `${COLORS.primary}0D`, borderRadius: scaleFontSize(10),
    padding: scaleSpacing(SPACING.sm), flexWrap: "wrap",
  },
  budgetEditorLabel: { fontSize: scaleFontSize(12), fontWeight: "500", color: COLORS.foreground, flexShrink: 0 },
  budgetEditorInput: {
    flex: 1, minWidth: 100, maxWidth: 160,
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(8),
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(7),
    fontSize: scaleFontSize(14), color: COLORS.foreground,
  },
  saveBudgetBtn: {
    backgroundColor: COLORS.primary, borderRadius: scaleFontSize(8),
    paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(7),
    alignItems: "center", justifyContent: "center",
  },
  saveBudgetText: { fontSize: scaleFontSize(13), fontWeight: "600", color: "#fff" },

  /* Stats row */
  statsRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: scaleSpacing(4) },
  statText:     { fontSize: scaleFontSize(12), color: COLORS.muted },
  statTextBold: { fontSize: scaleFontSize(12), fontWeight: "600" },

  /* Category chips */
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: scaleSpacing(6), marginTop: scaleSpacing(4) },
  chip: {
    paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(4),
    borderRadius: scaleFontSize(20), borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  chipText:   { fontSize: scaleFontSize(11), color: COLORS.muted },
  noCatsText: { fontSize: scaleFontSize(11), color: COLORS.muted, lineHeight: scaleFontSize(17) },

  /* Auth prompt */
  authPrompt: { flex: 1, justifyContent: "center", alignItems: "center", padding: scaleSpacing(SPACING.lg), backgroundColor: COLORS.background },
  authIcon:   { fontSize: scaleFontSize(48), marginBottom: scaleSpacing(SPACING.md) },
  authTitle:  { fontSize: scaleFontSize(20), fontWeight: "700", color: COLORS.foreground, textAlign: "center" },
  authSub:    { fontSize: scaleFontSize(14), color: COLORS.muted, textAlign: "center", marginTop: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.lg) },
  authBtn:    { backgroundColor: COLORS.primary, paddingVertical: scaleSpacing(SPACING.sm), paddingHorizontal: scaleSpacing(SPACING.xl), borderRadius: scaleFontSize(10) },
  authBtnText:{ fontSize: scaleFontSize(15), fontWeight: "600", color: "#fff" },

  /* Empty state */
  emptyState: { alignItems: "center", paddingVertical: scaleSpacing(SPACING.xxl), gap: scaleSpacing(SPACING.sm) },
  emptyIcon:  { fontSize: scaleFontSize(40) },
  emptyTitle: { fontSize: scaleFontSize(18), fontWeight: "600", color: COLORS.foreground },
  emptySub:   { fontSize: scaleFontSize(13), color: COLORS.muted, textAlign: "center" },
  emptyBtn:   { backgroundColor: COLORS.primary, paddingVertical: scaleSpacing(SPACING.sm), paddingHorizontal: scaleSpacing(SPACING.lg), borderRadius: scaleFontSize(10), marginTop: scaleSpacing(SPACING.sm) },
  emptyBtnText: { fontSize: scaleFontSize(14), fontWeight: "600", color: "#fff" },

  /* Trip picker modal */
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
