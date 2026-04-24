import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import Svg, { Circle, G } from "react-native-svg";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocsFromServer,
  orderBy,
  query,
  updateDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";

// ── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { value: "flight",        label: "Flights",          color: "#3b82f6", hex: "#3b82f6", emoji: "✈️" },
  { value: "accommodation", label: "Hotels & Stays",   color: "#6366f1", hex: "#6366f1", emoji: "🏨" },
  { value: "food",          label: "Food & Dining",    color: "#f97316", hex: "#f97316", emoji: "🍽️" },
  { value: "activities",    label: "Activities",       color: "#10b981", hex: "#10b981", emoji: "🎯" },
  { value: "sightseeing",   label: "Destinations",     color: "#06b6d4", hex: "#06b6d4", emoji: "📍" },
  { value: "transport",     label: "Ground Transport", color: "#14b8a6", hex: "#14b8a6", emoji: "🚌" },
  { value: "insurance",     label: "Insurance",        color: "#a855f7", hex: "#a855f7", emoji: "🛡️" },
  { value: "shopping",      label: "Shopping",         color: "#ec4899", hex: "#ec4899", emoji: "🛍️" },
  { value: "rental_car",    label: "Car Rental",       color: "#f59e0b", hex: "#f59e0b", emoji: "🚗" },
  { value: "other",         label: "Other",            color: "#94a3b8", hex: "#94a3b8", emoji: "📦" },
];

const CAT_MAP = Object.fromEntries(EXPENSE_CATEGORIES.map((c) => [c.value, c]));

const CURRENCIES = ["USD", "EUR", "GBP", "CAD", "AUD", "JPY", "MXN", "CHF", "BRL", "INR"];
const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", GBP: "£", CAD: "CA$", AUD: "A$", JPY: "¥", MXN: "MX$", CHF: "Fr", BRL: "R$", INR: "₹" };

const EXTRA_TYPE_CATEGORY = {
  flight: "flight", rental_car: "rental_car", insurance: "insurance",
  parking: "transport", transfer: "transport", tour: "activities",
  esim: "other", visa: "other", other: "other",
};

const PLACE_SUBCOL_CATEGORY = {
  destinations: "sightseeing", accommodations: "accommodation",
  activities: "activities", restaurants: "food",
};

const PLACE_SUBCOLS = ["destinations", "accommodations", "activities", "restaurants"];

// ── Helpers ──────────────────────────────────────────────────────────────────

function sym(currency) { return CURRENCY_SYMBOLS[currency] ?? (currency + " "); }
function fmtAmt(amount, currency) {
  return `${sym(currency)}${Math.abs(Number(amount)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}
function todayISO() { return new Date().toISOString().slice(0, 10); }
function parseExtraAmount(str) {
  if (!str) return 0;
  const n = parseFloat(String(str).replace(/[^0-9.]/g, ""));
  return isNaN(n) || n <= 0 ? 0 : n;
}
function getTripBudget(trip) { return trip?.budgetTotal ?? trip?.budget ?? null; }

// ── Donut Chart ───────────────────────────────────────────────────────────────

function DonutChart({ segments, total, currency }) {
  const SIZE = 110;
  const R = 38;
  const SW = 13;
  const C = 2 * Math.PI * R;
  const center = SIZE / 2;

  const validSegs = segments.filter((s) => s.value > 0);

  if (total === 0 || validSegs.length === 0) {
    return (
      <View style={s.donutWrap}>
        <View style={[s.donutEmptyCircle, { width: SIZE, height: SIZE, borderRadius: SIZE / 2, borderWidth: SW }]}>
          <Text style={s.donutEmptyText}>No{"\n"}expenses</Text>
        </View>
      </View>
    );
  }

  let cum = 0;
  const arcs = validSegs.map((seg) => {
    const dash = (seg.value / total) * C;
    const offset = -cum;
    cum += dash;
    return { ...seg, dash, offset };
  });

  const label = total >= 1000
    ? `${sym(currency)}${(total / 1000).toFixed(1)}k`
    : `${sym(currency)}${total.toFixed(0)}`;

  return (
    <View style={[s.donutWrap, { width: SIZE, height: SIZE }]}>
      <Svg width={SIZE} height={SIZE}>
        <G rotation="-90" origin={`${center}, ${center}`}>
          <Circle cx={center} cy={center} r={R} fill="none" stroke={COLORS.border} strokeWidth={SW} />
          {arcs.map((arc, i) => (
            <Circle
              key={i}
              cx={center}
              cy={center}
              r={R}
              fill="none"
              stroke={arc.hex}
              strokeWidth={SW}
              strokeDasharray={`${arc.dash} ${C - arc.dash}`}
              strokeDashoffset={arc.offset}
            />
          ))}
        </G>
      </Svg>
      <View style={s.donutCenter}>
        <Text style={s.donutAmount} numberOfLines={1}>{label}</Text>
        <Text style={s.donutSub}>spent</Text>
      </View>
    </View>
  );
}

// ── Inline Expense Form ───────────────────────────────────────────────────────

function ExpenseFormInline({ initial, tripCurrency, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [amount, setAmount] = useState(initial?.amount != null ? String(initial.amount) : "");
  const [currency, setCurrency] = useState(initial?.currency ?? tripCurrency ?? "USD");
  const [category, setCategory] = useState(initial?.category ?? "other");
  const [dateObj, setDateObj] = useState(() => {
    const d = initial?.date ? new Date(initial.date + "T12:00:00") : new Date();
    return isNaN(d.getTime()) ? new Date() : d;
  });
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [catOpen, setCatOpen] = useState(false);
  const [currOpen, setCurrOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const dateISO = dateObj.toISOString().slice(0, 10);
  const catCfg = CAT_MAP[category] ?? CAT_MAP.other;
  const isValid = name.trim().length > 0 && !isNaN(parseFloat(amount)) && parseFloat(amount) > 0;

  function handleSave() {
    if (!isValid || saving) return;
    onSave({ name: name.trim(), amount: parseFloat(amount), currency, category, date: dateISO, notes: notes.trim() || null });
  }

  return (
    <View style={s.expFormInline}>
      <Text style={s.expFormLabel}>Expense Name *</Text>
      <TextInput style={s.expFormInput} value={name} onChangeText={setName} placeholder="e.g. Delta Flight to NYC" placeholderTextColor={COLORS.muted} autoFocus />

      <Text style={s.expFormLabel}>Category</Text>
      <TouchableOpacity style={[s.dropBtn, catOpen && s.dropBtnOpen]} onPress={() => { setCatOpen(v => !v); setCurrOpen(false); setDateOpen(false); }} activeOpacity={0.8}>
        <Text style={s.dropBtnText}>{catCfg.emoji}  {catCfg.label}</Text>
        <Text style={s.dropBtnChevron}>{catOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {catOpen && (
        <View style={s.dropList}>
          {EXPENSE_CATEGORIES.map((cat) => (
            <TouchableOpacity key={cat.value} style={[s.dropItem, category === cat.value && s.dropItemSelected]} onPress={() => { setCategory(cat.value); setCatOpen(false); }} activeOpacity={0.7}>
              <Text style={s.dropItemEmoji}>{cat.emoji}</Text>
              <Text style={[s.dropItemText, category === cat.value && s.dropItemTextSel]}>{cat.label}</Text>
              {category === cat.value && <Text style={s.dropCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={s.expFormLabel}>Currency</Text>
      <TouchableOpacity style={[s.dropBtn, currOpen && s.dropBtnOpen]} onPress={() => { setCurrOpen(v => !v); setCatOpen(false); setDateOpen(false); }} activeOpacity={0.8}>
        <Text style={s.dropBtnText}>{currency}  {CURRENCY_SYMBOLS[currency] ?? ""}</Text>
        <Text style={s.dropBtnChevron}>{currOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {currOpen && (
        <View style={s.dropList}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity key={c} style={[s.dropItem, currency === c && s.dropItemSelected]} onPress={() => { setCurrency(c); setCurrOpen(false); }} activeOpacity={0.7}>
              <Text style={[s.dropItemText, currency === c && s.dropItemTextSel]}>{c}  {CURRENCY_SYMBOLS[c] ?? ""}</Text>
              {currency === c && <Text style={s.dropCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={s.expFormLabel}>Amount *</Text>
      <TextInput style={s.expFormInput} value={amount} onChangeText={setAmount} placeholder="0.00" placeholderTextColor={COLORS.muted} keyboardType="decimal-pad" />

      <Text style={s.expFormLabel}>Date</Text>
      <TouchableOpacity style={[s.dropBtn, dateOpen && s.dropBtnOpen]} onPress={() => { setDateOpen(v => !v); setCatOpen(false); setCurrOpen(false); }} activeOpacity={0.8}>
        <Text style={s.dropBtnText}>📅  {fmtDate(dateISO)}</Text>
        <Text style={s.dropBtnChevron}>{dateOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {dateOpen && (
        <View style={s.dateWrap}>
          <DateTimePicker
            value={dateObj}
            mode="date"
            display={Platform.OS === "ios" ? "inline" : "calendar"}
            themeVariant="dark"
            onChange={(_, selected) => {
              if (Platform.OS === "android") setDateOpen(false);
              if (selected) setDateObj(selected);
            }}
            style={Platform.OS === "ios" ? s.iosDatePicker : undefined}
          />
          {Platform.OS === "ios" && (
            <TouchableOpacity style={s.dateDoneBtn} onPress={() => setDateOpen(false)} activeOpacity={0.8}>
              <Text style={s.dateDoneBtnText}>Done</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <Text style={s.expFormLabel}>Notes (optional)</Text>
      <TextInput style={s.expFormInput} value={notes} onChangeText={setNotes} placeholder="Confirmation #, merchant, etc." placeholderTextColor={COLORS.muted} />

      <View style={s.expFormActions}>
        <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.saveBtn, (!isValid || saving) && { opacity: 0.5 }]} onPress={handleSave} disabled={!isValid || saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Expense</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Budget Settings Inline ───────────────────────────────────────────────────

function BudgetSettingsInline({ current, currentCurrency, onSave, onCancel, saving }) {
  const [amount, setAmount] = useState(current != null ? String(current) : "");
  const [currency, setCurrency] = useState(currentCurrency ?? "USD");
  const [currOpen, setCurrOpen] = useState(false);

  return (
    <View style={s.budgetSettingsInline}>
      <Text style={s.expFormLabel}>Currency</Text>
      <TouchableOpacity style={[s.dropBtn, currOpen && s.dropBtnOpen]} onPress={() => setCurrOpen(v => !v)} activeOpacity={0.8}>
        <Text style={s.dropBtnText}>{currency}  {CURRENCY_SYMBOLS[currency] ?? ""}</Text>
        <Text style={s.dropBtnChevron}>{currOpen ? "▲" : "▼"}</Text>
      </TouchableOpacity>
      {currOpen && (
        <View style={s.dropList}>
          {CURRENCIES.map((c) => (
            <TouchableOpacity key={c} style={[s.dropItem, currency === c && s.dropItemSelected]} onPress={() => { setCurrency(c); setCurrOpen(false); }} activeOpacity={0.7}>
              <Text style={[s.dropItemText, currency === c && s.dropItemTextSel]}>{c}  {CURRENCY_SYMBOLS[c] ?? ""}</Text>
              {currency === c && <Text style={s.dropCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <Text style={s.expFormLabel}>Total Budget</Text>
      <TextInput style={s.expFormInput} value={amount} onChangeText={setAmount} placeholder="e.g. 3000" placeholderTextColor={COLORS.muted} keyboardType="decimal-pad" autoFocus />

      <View style={s.expFormActions}>
        <TouchableOpacity style={s.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
          <Text style={s.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.saveBtn, saving && { opacity: 0.5 }]} onPress={() => onSave(amount ? parseFloat(amount) : null, currency)} disabled={saving} activeOpacity={0.8}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveBtnText}>Save Budget</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Main TripBudgetModal ─────────────────────────────────────────────────────

export default function TripBudgetModal({ trip: tripProp, onClose, onDataChange }) {
  const tripId = tripProp?.id;

  const [trip, setTrip] = useState(tripProp);
  const [expenses, setExpenses] = useState([]);
  const [extras, setExtras] = useState([]);
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [expenseSaving, setExpenseSaving] = useState(false);
  const [budgetSaving, setBudgetSaving] = useState(false);

  // Load all trip data
  async function loadData() {
    if (!tripId) return;
    setLoading(true);
    try {
      const tripSnap = await getDoc(doc(db, "trips", tripId));
      if (tripSnap.exists()) setTrip({ id: tripSnap.id, ...tripSnap.data() });

      const expSnap = await getDocsFromServer(
        collection(db, "trips", tripId, "expenses")
      );
      const exps = expSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
      exps.sort((a, b) => { const da = a.date ?? ""; const db2 = b.date ?? ""; return db2 > da ? 1 : db2 < da ? -1 : 0; });
      setExpenses(exps);

      const extSnap = await getDocsFromServer(
        query(collection(db, "trips", tripId, "extras"), orderBy("createdAt", "desc"))
      );
      setExtras(extSnap.docs.map((d) => ({ id: d.id, ...d.data() })));

      const allPlaces = [];
      for (const sub of PLACE_SUBCOLS) {
        try {
          const snap = await getDocsFromServer(collection(db, "trips", tripId, sub));
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
              allPlaces.push({
                id: d.id, name: data.name ?? sub,
                budgetAmount: Number(amt),
                budgetExpenseId: data.budgetExpenseId ?? null,
                subcollection: sub,
                budgetCurrency: data.budgetCurrency ?? "USD",
              });
            }
          });
        } catch (_) {}
      }
      setPlaces(allPlaces);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [tripId]);

  // ── Derived values ───────────────────────────────────────────────────────

  const currency = trip?.budgetCurrency ?? "USD";

  const extrasWithAmount = useMemo(
    () => extras.filter((ex) => parseExtraAmount(ex.amount) > 0),
    [extras]
  );

  const totalExtras = useMemo(
    () => extrasWithAmount.reduce((s, ex) => s + parseExtraAmount(ex.amount), 0),
    [extrasWithAmount]
  );

  const placesUnlinked = useMemo(() => {
    const linkedIds = new Set(expenses.map((e) => e.id));
    const expAmts = new Set(expenses.map((e) => Math.round((e.amount ?? 0) * 100)));
    return places.filter((p) => {
      if ((p.budgetCurrency ?? "USD") !== currency) return false;
      if (p.budgetExpenseId && linkedIds.has(p.budgetExpenseId)) return false;
      if (!p.budgetExpenseId && expAmts.has(Math.round(p.budgetAmount * 100))) return false;
      return true;
    });
  }, [places, expenses, currency]);

  const matchedExpenses = useMemo(
    () => expenses.filter((e) => (e.currency ?? "USD") === currency),
    [expenses, currency]
  );

  const totalPlaces = useMemo(
    () => placesUnlinked.reduce((s, p) => s + p.budgetAmount, 0),
    [placesUnlinked]
  );

  const totalSpent = useMemo(
    () => matchedExpenses.reduce((s, e) => s + (e.amount ?? 0), 0) + totalExtras + totalPlaces,
    [matchedExpenses, totalExtras, totalPlaces]
  );

  const budgetTotal = getTripBudget(trip);
  const budgetPct = budgetTotal && budgetTotal > 0 ? Math.min((totalSpent / budgetTotal) * 100, 100) : null;
  const remaining = budgetTotal != null ? budgetTotal - totalSpent : null;

  const categoryTotals = useMemo(() => {
    const map = {};
    matchedExpenses.forEach((e) => { map[e.category] = (map[e.category] ?? 0) + (e.amount ?? 0); });
    extrasWithAmount.forEach((ex) => {
      const cat = EXTRA_TYPE_CATEGORY[ex.extraType ?? "other"] ?? "other";
      map[cat] = (map[cat] ?? 0) + parseExtraAmount(ex.amount);
    });
    placesUnlinked.forEach((p) => {
      const cat = PLACE_SUBCOL_CATEGORY[p.subcollection] ?? "other";
      map[cat] = (map[cat] ?? 0) + p.budgetAmount;
    });
    return map;
  }, [matchedExpenses, extrasWithAmount, placesUnlinked]);

  const donutSegments = useMemo(
    () => EXPENSE_CATEGORIES.filter((c) => (categoryTotals[c.value] ?? 0) > 0)
      .map((c) => ({ label: c.label, value: categoryTotals[c.value] ?? 0, hex: c.hex })),
    [categoryTotals]
  );

  // ── Actions ──────────────────────────────────────────────────────────────

  async function handleSaveBudget(total, cur) {
    setBudgetSaving(true);
    try {
      await updateDoc(doc(db, "trips", tripId), { budget: total, budgetTotal: total, budgetCurrency: cur, updatedAt: Date.now() });
      setTrip((t) => ({ ...t, budget: total, budgetTotal: total, budgetCurrency: cur }));
      setShowBudgetForm(false);
      onDataChange?.();
    } finally {
      setBudgetSaving(false);
    }
  }

  async function handleAddExpense(form) {
    setExpenseSaving(true);
    try {
      const now = Date.now();
      await addDoc(collection(db, "trips", tripId, "expenses"), { ...form, source: "manual", linkedBookingId: null, createdAt: now, updatedAt: now });
      setShowAddForm(false);
      await loadData();
      onDataChange?.();
    } finally {
      setExpenseSaving(false);
    }
  }

  async function handleUpdateExpense(expId, form) {
    setExpenseSaving(true);
    try {
      await updateDoc(doc(db, "trips", tripId, "expenses", expId), { ...form, updatedAt: Date.now() });
      setEditingExpense(null);
      await loadData();
      onDataChange?.();
    } finally {
      setExpenseSaving(false);
    }
  }

  function confirmDelete(expId, name) {
    Alert.alert("Delete Expense", `Delete "${name}"? This cannot be undone.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => doDelete(expId) },
    ]);
  }

  async function doDelete(expId) {
    try {
      await deleteDoc(doc(db, "trips", tripId, "expenses", expId));
      await loadData();
      onDataChange?.();
    } catch (_) {}
  }

  // ── Progress bar color ───────────────────────────────────────────────────

  const progressColor = budgetPct == null ? COLORS.primary
    : budgetPct >= 100 ? "#ef4444"
    : budgetPct >= 80 ? "#f59e0b"
    : "#10b981";

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <Modal visible animationType="slide" onRequestClose={onClose}>
      <View style={s.container}>
        {/* Header */}
        <View style={s.header}>
          <View style={s.headerLeft}>
            <Text style={s.headerTitle} numberOfLines={1}>{trip?.name ?? "Trip Budget"}</Text>
            {trip?.city || trip?.country
              ? <Text style={s.headerSub}>{[trip?.city, trip?.country].filter(Boolean).join(", ")}</Text>
              : null}
          </View>
          <TouchableOpacity style={s.closeBtn} onPress={onClose} activeOpacity={0.8}>
            <Text style={s.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={s.loader}>
            <ActivityIndicator color={COLORS.primary} size="large" />
            <Text style={s.loaderText}>Loading budget…</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

            {/* ── Top row: Overview + By Category ── */}
            <View style={s.topRow}>

              {/* Budget Overview Card */}
              <View style={s.card}>
                <View style={s.cardHeaderRow}>
                  <Text style={s.cardTitle}>Budget Overview</Text>
                  <TouchableOpacity onPress={() => { setShowBudgetForm(v => !v); setShowAddForm(false); }} activeOpacity={0.8}>
                    <Text style={s.editLink}>{budgetTotal != null ? "Edit Budget" : "Set Budget"}</Text>
                  </TouchableOpacity>
                </View>

                {showBudgetForm ? (
                  <BudgetSettingsInline
                    current={budgetTotal}
                    currentCurrency={currency}
                    onSave={handleSaveBudget}
                    onCancel={() => setShowBudgetForm(false)}
                    saving={budgetSaving}
                  />
                ) : (
                  <View style={s.overviewBody}>
                    {/* Spent + remaining */}
                    <View style={s.overviewAmtRow}>
                      <View>
                        <Text style={s.bigAmount}>{fmtAmt(totalSpent, currency)}</Text>
                        <Text style={s.bigAmountSub}>
                          {budgetTotal != null ? `of ${fmtAmt(budgetTotal, currency)} budget` : "spent so far"}
                        </Text>
                      </View>
                      {remaining != null && (
                        <View style={s.remainingBlock}>
                          <Text style={[s.remainingAmt, { color: remaining < 0 ? "#ef4444" : "#10b981" }]}>
                            {remaining < 0 ? "-" : ""}{fmtAmt(Math.abs(remaining), currency)}
                          </Text>
                          <Text style={s.remainingSub}>{remaining < 0 ? "over budget" : "remaining"}</Text>
                        </View>
                      )}
                    </View>

                    {/* Progress bar */}
                    {budgetPct != null && (
                      <View style={s.progressSection}>
                        <View style={s.progressTrack}>
                          <View style={[s.progressFill, { width: `${budgetPct}%`, backgroundColor: progressColor }]} />
                        </View>
                        <View style={s.progressLabels}>
                          <Text style={s.progressLabel}>{budgetPct.toFixed(0)}% used</Text>
                          <Text style={s.progressLabel}>{(100 - budgetPct).toFixed(0)}% left</Text>
                        </View>
                      </View>
                    )}

                    {/* Stats chips */}
                    {(() => {
                      const totalItems = matchedExpenses.length + placesUnlinked.length + extrasWithAmount.length;
                      return (
                        <View style={s.statsRow}>
                          <View style={s.statChip}>
                            <Text style={s.statChipVal}>{matchedExpenses.length + placesUnlinked.length}</Text>
                            <Text style={s.statChipLbl}>Expenses</Text>
                          </View>
                          <View style={s.statChip}>
                            <Text style={s.statChipVal}>{extrasWithAmount.length}</Text>
                            <Text style={s.statChipLbl}>Others</Text>
                          </View>
                          <View style={s.statChip}>
                            <Text style={s.statChipVal} numberOfLines={1}>
                              {totalItems > 0 ? fmtAmt(totalSpent / totalItems, currency) : "—"}
                            </Text>
                            <Text style={s.statChipLbl}>Avg. item</Text>
                          </View>
                        </View>
                      );
                    })()}

                    {budgetTotal == null && (
                      <Text style={s.noBudgetHint}>Set a budget to track your spending progress.</Text>
                    )}
                  </View>
                )}
              </View>

              {/* By Category Card */}
              <View style={s.card}>
                <Text style={s.cardTitle}>By Category</Text>
                <View style={s.categoryRow}>
                  <DonutChart segments={donutSegments} total={totalSpent} currency={currency} />
                  <View style={s.categoryList}>
                    {EXPENSE_CATEGORIES.filter((c) => (categoryTotals[c.value] ?? 0) > 0)
                      .sort((a, b) => (categoryTotals[b.value] ?? 0) - (categoryTotals[a.value] ?? 0))
                      .slice(0, 6)
                      .map((c) => {
                        const val = categoryTotals[c.value] ?? 0;
                        const pct = totalSpent > 0 ? (val / totalSpent) * 100 : 0;
                        return (
                          <View key={c.value} style={s.categoryItem}>
                            <View style={[s.catDot, { backgroundColor: c.hex }]} />
                            <Text style={s.catName} numberOfLines={1}>{c.label}</Text>
                            <Text style={s.catAmt}>{sym(currency)}{val.toFixed(0)}</Text>
                            <Text style={s.catPct}>{pct.toFixed(0)}%</Text>
                          </View>
                        );
                      })}
                    {donutSegments.length === 0 && (
                      <Text style={s.noCatText}>Add expenses to see breakdown.</Text>
                    )}
                  </View>
                </View>
              </View>
            </View>

            {/* ── Add Expense inline form ── */}
            {showAddForm && !editingExpense && (
              <View style={s.formCard}>
                <Text style={s.formCardTitle}>Add Expense</Text>
                <ExpenseFormInline
                  tripCurrency={currency}
                  onSave={handleAddExpense}
                  onCancel={() => setShowAddForm(false)}
                  saving={expenseSaving}
                />
              </View>
            )}

            {/* ── Expenses section ── */}
            <View style={s.section}>
              <View style={s.sectionHeaderRow}>
                <Text style={s.sectionTitle}>Expenses</Text>
                {!showAddForm && (
                  <TouchableOpacity style={s.addExpBtn} onPress={() => { setShowAddForm(true); setEditingExpense(null); setShowBudgetForm(false); }} activeOpacity={0.8}>
                    <Text style={s.addExpBtnText}>+ Add Expense</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Place budget items */}
              {placesUnlinked.map((place) => {
                const cat = CAT_MAP[PLACE_SUBCOL_CATEGORY[place.subcollection] ?? "other"] ?? CAT_MAP.other;
                return (
                  <View key={`place-${place.id}`} style={s.expRow}>
                    <View style={[s.expCatIcon, { backgroundColor: cat.hex }]}>
                      <Text style={s.expCatEmoji}>{cat.emoji}</Text>
                    </View>
                    <View style={s.expInfo}>
                      <Text style={s.expName} numberOfLines={1}>{place.name}</Text>
                      <Text style={s.expMeta}>{cat.label} · {place.subcollection.slice(0, -1)}</Text>
                    </View>
                    <Text style={s.expAmt}>{fmtAmt(place.budgetAmount, currency)}</Text>
                  </View>
                );
              })}

              {/* Manual expenses */}
              {expenses.length === 0 && placesUnlinked.length === 0 && !showAddForm && (
                <View style={s.emptyExpenses}>
                  <Text style={s.emptyExpensesTitle}>No expenses yet.</Text>
                  <Text style={s.emptyExpensesSub}>Tap "+ Add Expense" to log your first expense.</Text>
                </View>
              )}

              {expenses.map((exp) =>
                editingExpense?.id === exp.id ? (
                  <View key={exp.id} style={s.formCard}>
                    <Text style={s.formCardTitle}>Edit Expense</Text>
                    <ExpenseFormInline
                      initial={exp}
                      tripCurrency={currency}
                      onSave={(form) => handleUpdateExpense(exp.id, form)}
                      onCancel={() => setEditingExpense(null)}
                      saving={expenseSaving}
                    />
                  </View>
                ) : (
                  <View key={exp.id} style={s.expRow}>
                    <View style={[s.expCatIcon, { backgroundColor: (CAT_MAP[exp.category] ?? CAT_MAP.other).hex }]}>
                      <Text style={s.expCatEmoji}>{(CAT_MAP[exp.category] ?? CAT_MAP.other).emoji}</Text>
                    </View>
                    <View style={s.expInfo}>
                      <View style={s.expNameRow}>
                        <Text style={s.expName} numberOfLines={1}>{exp.name}</Text>
                        {exp.source === "email_parsed" && <View style={s.autoBadge}><Text style={s.autoBadgeText}>auto</Text></View>}
                      </View>
                      <Text style={s.expMeta}>
                        {(CAT_MAP[exp.category] ?? CAT_MAP.other).label}
                        {exp.date ? ` · ${fmtDate(exp.date)}` : ""}
                        {exp.notes ? ` · ${exp.notes}` : ""}
                      </Text>
                    </View>
                    <Text style={s.expAmt}>{fmtAmt(exp.amount, exp.currency)}</Text>
                    <TouchableOpacity style={s.expActionBtn} onPress={() => { setEditingExpense(exp); setShowAddForm(false); setShowBudgetForm(false); }} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <Text style={s.editIcon}>✎</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.expActionBtn} onPress={() => confirmDelete(exp.id, exp.name)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
                      <Text style={s.deleteIcon}>✕</Text>
                    </TouchableOpacity>
                  </View>
                )
              )}
            </View>

            {/* ── Others (extras) section ── */}
            {extrasWithAmount.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionHeaderRow}>
                  <Text style={s.sectionTitle}>Others</Text>
                  <Text style={s.sectionHint}>{fmtAmt(totalExtras, currency)} total · managed in trip</Text>
                </View>
                {extrasWithAmount.map((ex) => {
                  const cat = CAT_MAP[EXTRA_TYPE_CATEGORY[ex.extraType ?? "other"] ?? "other"] ?? CAT_MAP.other;
                  const typeLabel = (ex.extraType ?? "other").replace(/_/g, " ");
                  return (
                    <View key={ex.id} style={s.expRow}>
                      <View style={[s.expCatIcon, { backgroundColor: cat.hex }]}>
                        <Text style={s.expCatEmoji}>{cat.emoji}</Text>
                      </View>
                      <View style={s.expInfo}>
                        <View style={s.expNameRow}>
                          <Text style={s.expName} numberOfLines={1}>{ex.name}</Text>
                          <View style={s.typeBadge}><Text style={s.typeBadgeText}>{typeLabel}</Text></View>
                        </View>
                        <Text style={s.expMeta}>{cat.label}{ex.startDate ? ` · ${fmtDate(ex.startDate)}` : ""}</Text>
                      </View>
                      <Text style={s.expAmt}>{ex.amount}</Text>
                    </View>
                  );
                })}
              </View>
            )}

          </ScrollView>
        )}
      </View>
    </Modal>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  /* Header */
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(SPACING.sm),
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  headerLeft:  { flex: 1, marginRight: scaleSpacing(SPACING.sm) },
  headerTitle: { fontSize: scaleFontSize(18), fontWeight: "700", color: COLORS.foreground },
  headerSub:   { fontSize: scaleFontSize(12), color: COLORS.muted, marginTop: scaleSpacing(2) },
  closeBtn:    { backgroundColor: COLORS.primary, borderRadius: scaleFontSize(8), paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(7) },
  closeBtnText:{ fontSize: scaleFontSize(14), fontWeight: "600", color: "#fff" },

  /* Loader */
  loader:     { flex: 1, alignItems: "center", justifyContent: "center", gap: scaleSpacing(SPACING.sm) },
  loaderText: { fontSize: scaleFontSize(14), color: COLORS.muted },

  /* Content */
  content: { padding: scaleSpacing(SPACING.md), gap: scaleSpacing(SPACING.md), paddingBottom: scaleSpacing(SPACING.xxl) },

  /* Top row (two cards stacked) */
  topRow: { gap: scaleSpacing(SPACING.md) },

  /* Cards */
  card: {
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(16),
    borderWidth: 1, borderColor: COLORS.border,
    padding: scaleSpacing(SPACING.md),
  },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSpacing(SPACING.sm) },
  cardTitle:     { fontSize: scaleFontSize(15), fontWeight: "600", color: COLORS.foreground },
  editLink:      { fontSize: scaleFontSize(13), color: COLORS.primary },

  /* Budget overview */
  overviewBody:   { gap: scaleSpacing(SPACING.sm) },
  overviewAmtRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  bigAmount:      { fontSize: scaleFontSize(30), fontWeight: "700", color: COLORS.foreground, letterSpacing: -0.5 },
  bigAmountSub:   { fontSize: scaleFontSize(12), color: COLORS.muted, marginTop: scaleSpacing(2) },
  remainingBlock: { alignItems: "flex-end" },
  remainingAmt:   { fontSize: scaleFontSize(18), fontWeight: "600" },
  remainingSub:   { fontSize: scaleFontSize(11), color: COLORS.muted },

  /* Progress */
  progressSection: { gap: scaleSpacing(4) },
  progressTrack: { height: scaleFontSize(10), borderRadius: 100, backgroundColor: COLORS.border, overflow: "hidden" },
  progressFill:  { height: "100%", borderRadius: 100 },
  progressLabels:{ flexDirection: "row", justifyContent: "space-between" },
  progressLabel: { fontSize: scaleFontSize(11), color: COLORS.muted },

  /* Stat chips */
  statsRow: { flexDirection: "row", gap: scaleSpacing(SPACING.sm) },
  statChip: { flex: 1, backgroundColor: COLORS.background, borderRadius: scaleFontSize(10), padding: scaleSpacing(SPACING.sm) },
  statChipVal: { fontSize: scaleFontSize(16), fontWeight: "700", color: COLORS.foreground },
  statChipLbl: { fontSize: scaleFontSize(11), color: COLORS.muted, marginTop: scaleSpacing(2) },

  noBudgetHint: { fontSize: scaleFontSize(12), color: COLORS.muted, fontStyle: "italic" },

  /* By category */
  categoryRow:  { flexDirection: "row", alignItems: "flex-start", gap: scaleSpacing(SPACING.md), marginTop: scaleSpacing(SPACING.sm) },
  categoryList: { flex: 1, gap: scaleSpacing(6) },
  categoryItem: { flexDirection: "row", alignItems: "center", gap: scaleSpacing(6) },
  catDot:       { width: scaleFontSize(8), height: scaleFontSize(8), borderRadius: 4, flexShrink: 0 },
  catName:      { flex: 1, fontSize: scaleFontSize(12), color: COLORS.muted },
  catAmt:       { fontSize: scaleFontSize(12), fontWeight: "500", color: COLORS.foreground, tabularNums: true },
  catPct:       { fontSize: scaleFontSize(11), color: COLORS.muted, width: scaleFontSize(28), textAlign: "right" },
  noCatText:    { fontSize: scaleFontSize(12), color: COLORS.muted },

  /* Donut */
  donutWrap:       { position: "relative", alignItems: "center", justifyContent: "center" },
  donutCenter:     { position: "absolute", alignItems: "center", justifyContent: "center" },
  donutAmount:     { fontSize: scaleFontSize(11), fontWeight: "700", color: COLORS.foreground, maxWidth: 60, textAlign: "center" },
  donutSub:        { fontSize: scaleFontSize(9), color: COLORS.muted },
  donutEmptyCircle:{ alignItems: "center", justifyContent: "center", borderColor: COLORS.border },
  donutEmptyText:  { fontSize: scaleFontSize(9), color: COLORS.muted, textAlign: "center" },

  /* Section */
  section: { gap: scaleSpacing(SPACING.sm) },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  sectionTitle:     { fontSize: scaleFontSize(16), fontWeight: "600", color: COLORS.foreground },
  sectionHint:      { fontSize: scaleFontSize(12), color: COLORS.muted },

  addExpBtn:     { backgroundColor: COLORS.primary, borderRadius: scaleFontSize(8), paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(6), flexDirection: "row", alignItems: "center", gap: scaleSpacing(4) },
  addExpBtnText: { fontSize: scaleFontSize(13), fontWeight: "600", color: "#fff" },

  /* Empty expenses */
  emptyExpenses:     { alignItems: "center", paddingVertical: scaleSpacing(SPACING.xl), gap: scaleSpacing(6) },
  emptyExpensesTitle:{ fontSize: scaleFontSize(14), fontWeight: "600", color: COLORS.foreground },
  emptyExpensesSub:  { fontSize: scaleFontSize(12), color: COLORS.muted, textAlign: "center" },

  /* Expense row */
  expRow: {
    flexDirection: "row", alignItems: "center", gap: scaleSpacing(10),
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(12),
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(12), paddingVertical: scaleSpacing(10),
  },
  expCatIcon:  { width: scaleFontSize(36), height: scaleFontSize(36), borderRadius: scaleFontSize(10), alignItems: "center", justifyContent: "center", flexShrink: 0 },
  expCatEmoji: { fontSize: scaleFontSize(16) },
  expInfo:     { flex: 1, minWidth: 0 },
  expNameRow:  { flexDirection: "row", alignItems: "center", gap: scaleSpacing(6), flexWrap: "wrap" },
  expName:     { fontSize: scaleFontSize(13), fontWeight: "500", color: COLORS.foreground, flexShrink: 1 },
  expMeta:     { fontSize: scaleFontSize(11), color: COLORS.muted, marginTop: scaleSpacing(2) },
  expAmt:      { fontSize: scaleFontSize(13), fontWeight: "600", color: COLORS.foreground, flexShrink: 0 },
  expActionBtn:{ padding: scaleSpacing(4), flexShrink: 0 },
  editIcon:    { fontSize: scaleFontSize(15), color: COLORS.muted },
  deleteIcon:  { fontSize: scaleFontSize(15), color: "#ef4444" },

  autoBadge:     { backgroundColor: `${COLORS.primary}20`, borderRadius: scaleFontSize(4), paddingHorizontal: scaleSpacing(4), paddingVertical: scaleSpacing(1) },
  autoBadgeText: { fontSize: scaleFontSize(9), color: COLORS.primary, fontWeight: "600" },
  typeBadge:     { backgroundColor: COLORS.border, borderRadius: scaleFontSize(4), paddingHorizontal: scaleSpacing(4), paddingVertical: scaleSpacing(1) },
  typeBadgeText: { fontSize: scaleFontSize(9), color: COLORS.muted, textTransform: "capitalize" },

  /* Form card */
  formCard:      { backgroundColor: `${COLORS.primary}0D`, borderRadius: scaleFontSize(14), borderWidth: 1, borderColor: `${COLORS.primary}30`, padding: scaleSpacing(SPACING.md) },
  formCardTitle: { fontSize: scaleFontSize(14), fontWeight: "600", color: COLORS.foreground, marginBottom: scaleSpacing(SPACING.sm) },

  /* Budget settings inline */
  budgetSettingsInline: { gap: scaleSpacing(4) },

  /* Inline expense form */
  expFormInline: { gap: scaleSpacing(4) },
  expFormLabel:  { fontSize: scaleFontSize(12), fontWeight: "600", color: COLORS.muted, marginBottom: scaleSpacing(4), marginTop: scaleSpacing(10) },
  expFormInput: {
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(8),
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(10),
    fontSize: scaleFontSize(14), color: COLORS.foreground,
  },

  /* Dropdown button */
  dropBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.surface, borderRadius: scaleFontSize(8),
    borderWidth: 1, borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(10),
  },
  dropBtnOpen:    { borderColor: COLORS.primary, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dropBtnText:    { fontSize: scaleFontSize(14), color: COLORS.foreground, flex: 1 },
  dropBtnChevron: { fontSize: scaleFontSize(11), color: COLORS.muted, marginLeft: scaleSpacing(6) },

  /* Dropdown list */
  dropList: {
    borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.primary,
    borderBottomLeftRadius: scaleFontSize(8), borderBottomRightRadius: scaleFontSize(8),
    backgroundColor: COLORS.surface, overflow: "hidden",
  },
  dropItem: {
    flexDirection: "row", alignItems: "center", gap: scaleSpacing(8),
    paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(11),
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  dropItemSelected: { backgroundColor: `${COLORS.primary}12` },
  dropItemEmoji:    { fontSize: scaleFontSize(16), width: scaleFontSize(22) },
  dropItemText:     { fontSize: scaleFontSize(14), color: COLORS.foreground, flex: 1 },
  dropItemTextSel:  { color: COLORS.primary, fontWeight: "600" },
  dropCheck:        { fontSize: scaleFontSize(14), color: COLORS.primary, fontWeight: "700" },

  /* Date picker */
  dateWrap: {
    borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.primary,
    borderBottomLeftRadius: scaleFontSize(8), borderBottomRightRadius: scaleFontSize(8),
    backgroundColor: COLORS.surface, overflow: "hidden",
  },
  iosDatePicker: { height: 320, backgroundColor: COLORS.surface },
  dateDoneBtn:   { alignItems: "center", paddingVertical: scaleSpacing(10), borderTopWidth: 1, borderTopColor: COLORS.border },
  dateDoneBtnText: { fontSize: scaleFontSize(14), fontWeight: "600", color: COLORS.primary },

  /* Form actions */
  expFormActions: { flexDirection: "row", gap: scaleSpacing(SPACING.sm), marginTop: scaleSpacing(SPACING.md), justifyContent: "flex-end" },
  cancelBtn: {
    paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(10),
    borderRadius: scaleFontSize(8), borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  cancelBtnText: { fontSize: scaleFontSize(14), fontWeight: "600", color: COLORS.foreground },
  saveBtn: {
    flex: 1, paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(10),
    borderRadius: scaleFontSize(8), backgroundColor: COLORS.primary,
    alignItems: "center", justifyContent: "center",
  },
  saveBtnText: { fontSize: scaleFontSize(14), fontWeight: "600", color: "#fff" },
});
