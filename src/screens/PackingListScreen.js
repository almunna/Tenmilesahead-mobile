import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
} from "react-native";
import {
  collection,
  query,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, SCREENS, scaleFontSize, scaleSpacing } from "../lib/constants";

// ─── Packing data (ported from web packingData.ts) ───────────────────────────
const PACKING_CATEGORIES = [
  { id: "bags-luggage", name: "Bags & Luggage", defaultItems: ["Backpack", "Carry-on bag", "Checked luggage", "Daypack", "Laundry bag", "Luggage lock", "Luggage tags", "Packing cubes"] },
  { id: "clothing-bottoms", name: "Clothing-Bottoms", defaultItems: ["Casual pants", "Dress pants", "Jeans", "Leggings", "Shorts", "Skirt"] },
  { id: "clothing-dressier", name: "Clothing-Dressier", defaultItems: ["Dress", "Nicer outfit", "Scarf", "Wrap"] },
  { id: "clothing-outerwear", name: "Clothing-Outerwear", defaultItems: ["Coat", "Fleece", "Jacket", "Rain jacket", "Vest", "Windbreaker"] },
  { id: "clothing-sleepwear", name: "Clothing-Sleepwear", defaultItems: ["Eye mask", "Pajamas", "Robe", "Sleep socks"] },
  { id: "clothing-swim-active", name: "Clothing-Swim/Active", defaultItems: ["Athletic shorts", "Goggles", "Sports bra", "Swim cap", "Swimsuit", "Workout clothes"] },
  { id: "clothing-tops", name: "Clothing-Tops", defaultItems: ["Blouse", "Button-down shirt", "Long-sleeve shirt", "Polo shirt", "Sweater", "T-shirts", "Tank tops"] },
  { id: "clothing-underlayers", name: "Clothing-Underlayers", defaultItems: ["Socks", "Sports socks", "Thermal underwear", "Undershirts", "Underwear"] },
  { id: "documents", name: "Documents", defaultItems: ["Driver's license", "Emergency contacts", "Flight tickets", "Hotel confirmations", "Passport", "Travel insurance", "Travel itinerary", "Vaccination records", "Visa documents"] },
  { id: "electronics-audio", name: "Electronics-Audio", defaultItems: ["Earbuds", "Headphones", "Portable speaker"] },
  { id: "electronics-cameras", name: "Electronics-Cameras", defaultItems: ["Camera", "Camera bag", "Camera charger", "Extra batteries", "Lens cleaning kit", "Memory cards", "Tripod"] },
  { id: "electronics-computers", name: "Electronics-Computers", defaultItems: ["Laptop", "Laptop case", "Laptop charger", "Mouse", "USB drive"] },
  { id: "electronics-phones", name: "Electronics-Phones", defaultItems: ["Phone", "Phone case", "Phone charger", "Screen protector", "SIM card"] },
  { id: "electronics-power", name: "Electronics-Power", defaultItems: ["Charging cables", "Extension cord", "Power bank", "Universal adapter", "USB hub"] },
  { id: "electronics-wearables", name: "Electronics-Wearables", defaultItems: ["Fitness tracker", "Smart watch", "Watch charger"] },
  { id: "footwear", name: "Footwear", defaultItems: ["Dress shoes", "Flip flops", "Hiking boots", "Rain boots", "Sandals", "Sneakers"] },
  { id: "health-safety", name: "Health & Safety", defaultItems: ["Band-aids", "Bug spray", "Emergency whistle", "Face masks", "First aid kit", "Hand sanitizer", "Motion sickness medication", "Sunscreen", "Thermometer"] },
  { id: "medication", name: "Medication", defaultItems: ["Allergy medication", "Antacids", "Cold medicine", "Eye drops", "Pain reliever", "Prescription medications", "Vitamins"] },
  { id: "money", name: "Money", defaultItems: ["Cash (local currency)", "Credit cards", "Debit cards", "Money belt", "Small bills for tips", "Travel money card"] },
  { id: "snacks-entertainment", name: "Snacks & Entertainment", defaultItems: ["Books/e-reader", "Gum", "Journal", "Playing cards", "Reusable water bottle", "Snack bars", "Snacks"] },
  { id: "toiletries", name: "Toiletries / Personal Care", defaultItems: ["Body wash", "Comb/brush", "Conditioner", "Contact solution", "Contacts/glasses", "Deodorant", "Face wash", "Feminine products", "Hair ties", "Makeup", "Moisturizer", "Nail clippers", "Razor", "Shampoo", "Shaving cream", "Toothbrush", "Toothpaste", "Tweezers"] },
  { id: "weather-specific", name: "Weather-Specific Items", defaultItems: ["Cooling towel", "Gloves", "Hand warmers", "Hat", "Neck gaiter", "Rain poncho", "Scarf", "Sunglasses", "Umbrella"] },
];

function genId() {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

function buildWorkingCats(catIds, travs) {
  return catIds.map((id) => {
    const def = PACKING_CATEGORIES.find((c) => c.id === id);
    return {
      categoryId: def.id,
      categoryName: def.name,
      items: [...def.defaultItems]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ id: genId(), name, travelers: [...travs] })),
      addRowTravelers: [...travs],
    };
  });
}

// ─── SelectCell (green checkbox for item-select) ─────────────────────────────
function SelectCell({ checked, onChange }) {
  return (
    <TouchableOpacity onPress={onChange} style={[styles.cell, checked && styles.cellChecked]} activeOpacity={0.7}>
      {checked && <Text style={styles.cellCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

// ─── PackCell (green checkbox for packing) ───────────────────────────────────
function PackCell({ checked, onChange, visible }) {
  if (!visible) return <View style={styles.cell} />;
  return (
    <TouchableOpacity onPress={onChange} style={[styles.cell, checked && styles.cellChecked]} activeOpacity={0.7}>
      {checked && <Text style={styles.cellCheck}>✓</Text>}
    </TouchableOpacity>
  );
}

// ─── ProgressBar ──────────────────────────────────────────────────────────────
function ProgressBar({ pct }) {
  return (
    <View style={styles.progressRow}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.min(pct, 100)}%` }]} />
      </View>
      <Text style={styles.progressPct}>{Math.round(pct)}%</Text>
    </View>
  );
}

// ─── WizardStep ───────────────────────────────────────────────────────────────
function WizardStep({ title, children, onBack, onNext, nextDisabled = false, nextLabel = "Next" }) {
  return (
    <View style={styles.wizardWrap}>
      <Text style={styles.wizardTitle}>{title}</Text>
      {children}
      <View style={styles.wizardActions}>
        <TouchableOpacity style={styles.wizardBack} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.wizardBackText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.wizardNext, nextDisabled && styles.wizardNextDisabled]}
          onPress={onNext}
          disabled={nextDisabled}
          activeOpacity={0.7}
        >
          <Text style={styles.wizardNextText}>{nextLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── CategoryItemTable ────────────────────────────────────────────────────────
function CategoryItemTable({ cat, travelers, isAddingHere, newItemName, onToggleTraveler, onToggleAddRow, onDeleteItem, onStartAdd, onNewItemChange, onConfirmAdd, onCancelAdd }) {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isAddingHere && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isAddingHere]);

  return (
    <View style={styles.catTable}>
      {/* Category header */}
      <View style={styles.catTableHeader}>
        <Text style={styles.catTableHeaderText}>{cat.categoryName}</Text>
      </View>

      {/* Scrollable table */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={{ minWidth: 200 + travelers.length * 80 }}>
          {/* Column headers */}
          <View style={styles.tableRow}>
            <View style={styles.itemNameCol} />
            {travelers.map((t) => (
              <View key={t} style={styles.travelerCol}>
                <Text style={styles.travelerColText} numberOfLines={1}>{t}</Text>
              </View>
            ))}
            <View style={styles.actionCol} />
          </View>

          {/* Inline add row */}
          {isAddingHere && (
            <View style={[styles.tableRow, styles.addRowHighlight]}>
              <View style={styles.itemNameCol}>
                <TextInput
                  ref={inputRef}
                  style={styles.inlineInput}
                  value={newItemName}
                  onChangeText={onNewItemChange}
                  placeholder="Item name…"
                  placeholderTextColor={COLORS.muted}
                  onSubmitEditing={onConfirmAdd}
                  onBlur={onConfirmAdd}
                  returnKeyType="done"
                />
              </View>
              {travelers.map((t) => (
                <View key={t} style={styles.travelerCol}>
                  <SelectCell
                    checked={cat.addRowTravelers.includes(t)}
                    onChange={() => onToggleAddRow(t)}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.actionCol} onPress={onCancelAdd}>
                <Text style={styles.cancelAddText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Existing items */}
          {cat.items.map((item, idx) => (
            <View key={item.id} style={[styles.tableRow, idx < cat.items.length - 1 && styles.tableRowBorder]}>
              <View style={styles.itemNameCol}>
                <Text style={styles.itemNameText}>{item.name}</Text>
              </View>
              {travelers.map((t) => (
                <View key={t} style={styles.travelerCol}>
                  <SelectCell
                    checked={item.travelers.includes(t)}
                    onChange={() => onToggleTraveler(item.id, t)}
                  />
                </View>
              ))}
              <TouchableOpacity style={styles.actionCol} onPress={() => onDeleteItem(item.id)}>
                <Text style={styles.deleteText}>🗑</Text>
              </TouchableOpacity>
            </View>
          ))}

          {/* Add item footer row */}
          <View style={[styles.tableRow, styles.addItemRow]}>
            <View style={styles.itemNameCol}>
              <Text style={styles.addItemLabel}>Add item</Text>
            </View>
            {travelers.map((t) => (
              <View key={t} style={styles.travelerCol}>
                <SelectCell
                  checked={cat.addRowTravelers.includes(t)}
                  onChange={() => onToggleAddRow(t)}
                />
              </View>
            ))}
            <TouchableOpacity style={styles.actionCol} onPress={onStartAdd}>
              <Text style={styles.addItemBtn}>＋</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── SaveModal ────────────────────────────────────────────────────────────────
function SaveModal({ listName, onListNameChange, onSave, onSkip, saving }) {
  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onSkip} activeOpacity={1} />
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Save for future use?</Text>
          <Text style={styles.modalSubtitle}>
            Give this list a name to reuse it on future trips. Or tap "Use Once" to skip saving.
          </Text>
          <TextInput
            style={styles.modalInput}
            value={listName}
            onChangeText={onListNameChange}
            placeholder="e.g. Family Beach Trip"
            placeholderTextColor={COLORS.muted}
            autoFocus
            onSubmitEditing={() => listName.trim() && onSave()}
            returnKeyType="done"
          />
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalSkip}
              onPress={onSkip}
              disabled={saving}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSkipText}>Use Once</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalSave, (!listName.trim() || saving) && styles.modalSaveDisabled]}
              onPress={onSave}
              disabled={!listName.trim() || saving}
              activeOpacity={0.7}
            >
              <Text style={styles.modalSaveText}>{saving ? "Saving…" : "Save & Pack"}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function PackingListScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();

  const [view, setView] = useState("landing");

  // Wizard state
  const [travelerCount, setTravelerCount] = useState(2);
  const [travelers, setTravelers] = useState(["", ""]);
  const [selectedCatIds, setSelectedCatIds] = useState([]);

  // Working list
  const [workingCats, setWorkingCats] = useState([]);

  // Inline add-item
  const [addingToCatId, setAddingToCatId] = useState(null);
  const [newItemName, setNewItemName] = useState("");

  // Packing state
  const [packedItems, setPackedItems] = useState({});
  const [collapsedCats, setCollapsedCats] = useState(new Set());
  const [editingItemId, setEditingItemId] = useState(null);
  const [editingItemName, setEditingItemName] = useState("");

  // Save / load
  const [savedLists, setSavedLists] = useState([]);
  const [currentSavedId, setCurrentSavedId] = useState(null);
  const [listName, setListName] = useState("");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingSaved, setLoadingSaved] = useState(false);

  const originalTravelersRef = useRef([]);

  const trimmedTravelers = travelers.map((t) => t.trim());

  // ── Load saved lists ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    setLoadingSaved(true);
    getDocs(query(collection(db, "users", user.uid, "packingLists"), orderBy("updatedAt", "desc")))
      .then((snap) => {
        const arr = [];
        snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
        setSavedLists(arr);
      })
      .catch(console.error)
      .finally(() => setLoadingSaved(false));
  }, [user]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  function resetToLanding() {
    setView("landing");
    setWorkingCats([]);
    setPackedItems({});
    setCollapsedCats(new Set());
    setCurrentSavedId(null);
    setListName("");
    setAddingToCatId(null);
    setEditingItemId(null);
  }

  // ── Step: traveler count ───────────────────────────────────────────────────
  function handleCountNext() {
    setTravelers(Array.from({ length: travelerCount }, (_, i) => travelers[i] ?? ""));
    setView("traveler-names");
  }

  // ── Step: traveler names ───────────────────────────────────────────────────
  function handleNamesNext() {
    if (travelers.some((t) => !t.trim())) return;
    setView("category-select");
  }

  // ── Step: category select ──────────────────────────────────────────────────
  function toggleCategory(id) {
    setSelectedCatIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }

  function handleCategoriesNext() {
    if (selectedCatIds.length === 0) return;
    const ordered = PACKING_CATEGORIES.filter((c) => selectedCatIds.includes(c.id)).map((c) => c.id);
    setSelectedCatIds(ordered);
    setWorkingCats(buildWorkingCats(ordered, trimmedTravelers));
    setView("item-select");
  }

  // ── Item select ────────────────────────────────────────────────────────────
  function toggleItemTraveler(catId, itemId, trav) {
    setWorkingCats((prev) =>
      prev.map((cat) => {
        if (cat.categoryId !== catId) return cat;
        return {
          ...cat,
          items: cat.items.map((item) => {
            if (item.id !== itemId) return item;
            const has = item.travelers.includes(trav);
            return { ...item, travelers: has ? item.travelers.filter((t) => t !== trav) : [...item.travelers, trav] };
          }),
        };
      })
    );
  }

  function toggleAddRow(catId, trav) {
    setWorkingCats((prev) =>
      prev.map((cat) => {
        if (cat.categoryId !== catId) return cat;
        const has = cat.addRowTravelers.includes(trav);
        return { ...cat, addRowTravelers: has ? cat.addRowTravelers.filter((t) => t !== trav) : [...cat.addRowTravelers, trav] };
      })
    );
  }

  function deleteItem(catId, itemId) {
    setWorkingCats((prev) =>
      prev.map((cat) => cat.categoryId !== catId ? cat : { ...cat, items: cat.items.filter((i) => i.id !== itemId) })
    );
  }

  function confirmAddItem(catId) {
    const name = newItemName.trim();
    setAddingToCatId(null);
    setNewItemName("");
    if (!name) return;
    setWorkingCats((prev) =>
      prev.map((cat) => {
        if (cat.categoryId !== catId) return cat;
        const newItem = { id: genId(), name, travelers: [...cat.addRowTravelers] };
        return { ...cat, items: [...cat.items, newItem].sort((a, b) => a.name.localeCompare(b.name)) };
      })
    );
  }

  // ── Save flow ──────────────────────────────────────────────────────────────
  function handleSaveList() {
    setWorkingCats((prev) =>
      prev.map((cat) => ({ ...cat, items: [...cat.items].sort((a, b) => a.name.localeCompare(b.name)) }))
    );
    setShowSaveModal(true);
  }

  async function saveListForFuture() {
    if (!user || !listName.trim()) return;
    setSaving(true);
    try {
      const cats = workingCats.map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        items: cat.items.map(({ id, name, travelers: t }) => ({ id, name, travelers: t })),
      }));
      const now = Date.now();
      if (currentSavedId) {
        await updateDoc(doc(db, "users", user.uid, "packingLists", currentSavedId), {
          name: listName.trim(), travelers: trimmedTravelers, categories: cats, packedItems: {}, updatedAt: now,
        });
        setSavedLists((prev) =>
          prev.map((s) => s.id === currentSavedId
            ? { ...s, name: listName.trim(), travelers: trimmedTravelers, categories: cats, updatedAt: now }
            : s)
        );
      } else {
        const data = { name: listName.trim(), travelers: trimmedTravelers, categories: cats, packedItems: {}, createdAt: now, updatedAt: now };
        const ref = await addDoc(collection(db, "users", user.uid, "packingLists"), data);
        setCurrentSavedId(ref.id);
        setSavedLists((prev) => [{ ...data, id: ref.id }, ...prev]);
      }
      setPackedItems({});
      setShowSaveModal(false);
      setView("packing");
    } finally {
      setSaving(false);
    }
  }

  function startPackingWithoutSave() {
    setPackedItems({});
    setShowSaveModal(false);
    setView("packing");
  }

  // ── Open saved list ────────────────────────────────────────────────────────
  function openSavedList(saved) {
    originalTravelersRef.current = [...saved.travelers];
    setCurrentSavedId(saved.id);
    setListName(saved.name);
    setTravelers([...saved.travelers]);
    setTravelerCount(saved.travelers.length);
    setWorkingCats(
      saved.categories.map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        items: cat.items.map((i) => ({ ...i })),
        addRowTravelers: [...saved.travelers],
      }))
    );
    setPackedItems(saved.packedItems ?? {});
    setCollapsedCats(new Set());
    setView("open-saved-travelers");
  }

  async function deleteSavedList(id) {
    if (!user) return;
    Alert.alert("Delete list?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteDoc(doc(db, "users", user.uid, "packingLists", id));
          setSavedLists((prev) => prev.filter((s) => s.id !== id));
        },
      },
    ]);
  }

  function applyUpdatedTravelers() {
    if (travelers.some((t) => !t.trim())) return;
    const oldNames = originalTravelersRef.current;
    const newNames = trimmedTravelers;
    setWorkingCats((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((item) => {
          const mapped = item.travelers
            .map((t) => { const idx = oldNames.indexOf(t); return idx >= 0 && idx < newNames.length ? newNames[idx] : null; })
            .filter((t) => t !== null);
          const added = newNames.slice(oldNames.length);
          return { ...item, travelers: [...mapped, ...added] };
        }),
        addRowTravelers: [...newNames],
      }))
    );
    setView("packing");
  }

  // ── Reset progress ─────────────────────────────────────────────────────────
  function confirmResetProgress() {
    Alert.alert(
      "Reset Progress?",
      "This will uncheck all packed items so you can reuse this list for a new trip. Your list and items will not be deleted.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: () => {
            setPackedItems({});
            if (currentSavedId && user) {
              updateDoc(doc(db, "users", user.uid, "packingLists", currentSavedId), {
                packedItems: {},
                updatedAt: Date.now(),
              }).catch(console.error);
            }
          },
        },
      ]
    );
  }

  // ── Packing helpers ────────────────────────────────────────────────────────
  function togglePacked(itemId, trav) {
    setPackedItems((prev) => {
      const current = prev[itemId] ?? [];
      const has = current.includes(trav);
      const updated = has ? current.filter((t) => t !== trav) : [...current, trav];
      const next = { ...prev, [itemId]: updated };
      if (currentSavedId && user) {
        updateDoc(doc(db, "users", user.uid, "packingLists", currentSavedId), { packedItems: next, updatedAt: Date.now() }).catch(console.error);
      }
      return next;
    });
  }

  function toggleCollapse(catId) {
    setCollapsedCats((prev) => {
      const next = new Set(prev);
      next.has(catId) ? next.delete(catId) : next.add(catId);
      return next;
    });
  }

  function confirmEditItem() {
    const name = editingItemName.trim();
    const id = editingItemId;
    setEditingItemId(null);
    if (!name || !id) return;
    setWorkingCats((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items
          .map((i) => (i.id === id ? { ...i, name } : i))
          .sort((a, b) => a.name.localeCompare(b.name)),
      }))
    );
  }

  // ── Progress ───────────────────────────────────────────────────────────────
  const { totalPairs, packedPairs } = useMemo(() => {
    let total = 0;
    let packed = 0;
    for (const cat of workingCats) {
      for (const item of cat.items) {
        for (const t of item.travelers) {
          total++;
          if ((packedItems[item.id] ?? []).includes(t)) packed++;
        }
      }
    }
    return { totalPairs: total, packedPairs: packed };
  }, [workingCats, packedItems]);

  const progressPct = totalPairs > 0 ? (packedPairs / totalPairs) * 100 : 0;

  function isCatComplete(cat) {
    if (cat.items.length === 0) return false;
    return cat.items.every((item) =>
      item.travelers.every((t) => (packedItems[item.id] ?? []).includes(t))
    );
  }

  // ── Auth guard ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={styles.authWrap}>
        <Text style={styles.authIcon}>🧳</Text>
        <Text style={styles.authTitle}>Packing List</Text>
        <Text style={styles.authSubtitle}>Sign in to create and save your packing lists.</Text>
        <TouchableOpacity style={styles.authBtn} onPress={() => navigation.navigate(SCREENS.SIGNIN)} activeOpacity={0.8}>
          <Text style={styles.authBtnText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ─── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ─── LANDING ────────────────────────────────────────────────────── */}
        {view === "landing" && (
          <View>
            <Text style={styles.pageTitle}>Packing List</Text>
            <Text style={styles.pageSubtitle}>Create a personalized packing list for your travelers.</Text>

            <TouchableOpacity
              style={styles.createBtn}
              onPress={() => {
                setTravelerCount(2);
                setTravelers(["", ""]);
                setSelectedCatIds([]);
                setWorkingCats([]);
                setPackedItems({});
                setCollapsedCats(new Set());
                setCurrentSavedId(null);
                setListName("");
                setView("traveler-count");
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.createBtnText}>+ Create New List</Text>
            </TouchableOpacity>

            {loadingSaved && (
              <View style={styles.loadingWrap}>
                <ActivityIndicator color={COLORS.primary} />
                <Text style={styles.loadingText}>Loading saved lists…</Text>
              </View>
            )}

            {!loadingSaved && savedLists.length > 0 && (
              <View style={styles.savedSection}>
                <Text style={styles.savedHeading}>Saved Lists</Text>
                {savedLists.map((sl) => (
                  <TouchableOpacity
                    key={sl.id}
                    style={styles.savedCard}
                    onPress={() => openSavedList(sl)}
                    activeOpacity={0.75}
                  >
                    <View style={styles.savedCardInfo}>
                      <Text style={styles.savedCardName} numberOfLines={1}>{sl.name}</Text>
                      <Text style={styles.savedCardMeta} numberOfLines={1}>
                        {sl.travelers.join(", ")} · {sl.categories.length} categories
                      </Text>
                    </View>
                    <View style={styles.savedCardActions}>
                      <TouchableOpacity
                        style={styles.savedDeleteBtn}
                        onPress={() => deleteSavedList(sl.id)}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.savedDeleteIcon}>🗑</Text>
                      </TouchableOpacity>
                      <Text style={styles.savedChevron}>›</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ─── TRAVELER COUNT ─────────────────────────────────────────────── */}
        {view === "traveler-count" && (
          <WizardStep
            title="How many travelers?"
            onBack={() => setView("landing")}
            onNext={handleCountNext}
            nextDisabled={travelerCount < 1}
          >
            <View style={styles.countRow}>
              <TouchableOpacity
                style={styles.countBtn}
                onPress={() => setTravelerCount((n) => Math.max(1, n - 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.countBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.countNum}>{travelerCount}</Text>
              <TouchableOpacity
                style={styles.countBtn}
                onPress={() => setTravelerCount((n) => Math.min(10, n + 1))}
                activeOpacity={0.7}
              >
                <Text style={styles.countBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </WizardStep>
        )}

        {/* ─── TRAVELER NAMES ─────────────────────────────────────────────── */}
        {view === "traveler-names" && (
          <WizardStep
            title="Enter traveler names"
            onBack={() => setView("traveler-count")}
            onNext={handleNamesNext}
            nextDisabled={travelers.some((t) => !t.trim())}
          >
            <View style={styles.namesWrap}>
              {travelers.map((name, i) => (
                <View key={i} style={styles.nameRow}>
                  <Text style={styles.nameLabelText}>Traveler {i + 1}</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={(v) => {
                      const arr = [...travelers];
                      arr[i] = v;
                      setTravelers(arr);
                    }}
                    placeholder="First name"
                    placeholderTextColor={COLORS.muted}
                    autoFocus={i === 0}
                    returnKeyType={i === travelers.length - 1 ? "done" : "next"}
                    onSubmitEditing={() => { if (i === travelers.length - 1) handleNamesNext(); }}
                  />
                </View>
              ))}
            </View>
          </WizardStep>
        )}

        {/* ─── CATEGORY SELECT ────────────────────────────────────────────── */}
        {view === "category-select" && (
          <WizardStep
            title="Select categories"
            onBack={() => setView("traveler-names")}
            onNext={handleCategoriesNext}
            nextDisabled={selectedCatIds.length === 0}
            nextLabel="Build List"
          >
            <View style={styles.catSelectActions}>
              <TouchableOpacity onPress={() => setSelectedCatIds(PACKING_CATEGORIES.map((c) => c.id))}>
                <Text style={styles.selectAllText}>Select all</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setSelectedCatIds([])}>
                <Text style={styles.clearAllText}>Clear all</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.catGrid}>
              {PACKING_CATEGORIES.map((cat) => {
                const sel = selectedCatIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.catChip, sel && styles.catChipSelected]}
                    onPress={() => toggleCategory(cat.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.catChipBox, sel && styles.catChipBoxSelected]}>
                      {sel && <Text style={styles.catChipCheck}>✓</Text>}
                    </View>
                    <Text style={[styles.catChipLabel, sel && styles.catChipLabelSelected]}>{cat.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </WizardStep>
        )}

        {/* ─── ITEM SELECT ────────────────────────────────────────────────── */}
        {view === "item-select" && (
          <View>
            <View style={styles.itemSelectHeader}>
              <View style={styles.itemSelectTitleWrap}>
                <Text style={styles.itemSelectTitle}>Review Items</Text>
                <Text style={styles.itemSelectSubtitle}>Check travelers who need each item. Delete items nobody needs. Add your own.</Text>
              </View>
              <View style={styles.itemSelectBtns}>
                <TouchableOpacity style={styles.itemSelectBack} onPress={() => setView("category-select")} activeOpacity={0.7}>
                  <Text style={styles.itemSelectBackText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.itemSelectSave} onPress={handleSaveList} activeOpacity={0.7}>
                  <Text style={styles.itemSelectSaveText}>Save List</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.catTableList}>
              {workingCats.map((cat) => (
                <CategoryItemTable
                  key={cat.categoryId}
                  cat={cat}
                  travelers={trimmedTravelers}
                  isAddingHere={addingToCatId === cat.categoryId}
                  newItemName={newItemName}
                  onToggleTraveler={(itemId, trav) => toggleItemTraveler(cat.categoryId, itemId, trav)}
                  onToggleAddRow={(trav) => toggleAddRow(cat.categoryId, trav)}
                  onDeleteItem={(itemId) => deleteItem(cat.categoryId, itemId)}
                  onStartAdd={() => { setAddingToCatId(cat.categoryId); setNewItemName(""); }}
                  onNewItemChange={setNewItemName}
                  onConfirmAdd={() => confirmAddItem(cat.categoryId)}
                  onCancelAdd={() => { setAddingToCatId(null); setNewItemName(""); }}
                />
              ))}
            </View>

            <TouchableOpacity style={styles.saveListBtnBottom} onPress={handleSaveList} activeOpacity={0.8}>
              <Text style={styles.saveListBtnBottomText}>Save List →</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─── OPEN SAVED: EDIT TRAVELERS ─────────────────────────────────── */}
        {view === "open-saved-travelers" && (
          <WizardStep
            title="Update travelers"
            onBack={() => setView("landing")}
            onNext={applyUpdatedTravelers}
            nextDisabled={travelers.some((t) => !t.trim())}
            nextLabel={`Open "${listName}"`}
          >
            <Text style={styles.openSavedHint}>Update traveler names for this trip. Item assignments update by position.</Text>
            <View style={styles.countRowSmall}>
              <TouchableOpacity
                style={styles.countBtnSmall}
                onPress={() => {
                  const n = Math.max(1, travelerCount - 1);
                  setTravelerCount(n);
                  setTravelers((prev) => prev.slice(0, n));
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.countBtnSmallText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.countNumSmall}>{travelerCount}</Text>
              <TouchableOpacity
                style={styles.countBtnSmall}
                onPress={() => {
                  const n = Math.min(10, travelerCount + 1);
                  setTravelerCount(n);
                  setTravelers((prev) => [...prev, ""]);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.countBtnSmallText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.countSmallLabel}>travelers</Text>
            </View>
            <View style={styles.namesWrap}>
              {travelers.map((name, i) => (
                <View key={i} style={styles.nameRow}>
                  <Text style={styles.nameLabelText}>Traveler {i + 1}</Text>
                  <TextInput
                    style={styles.nameInput}
                    value={name}
                    onChangeText={(v) => {
                      const arr = [...travelers];
                      arr[i] = v;
                      setTravelers(arr);
                    }}
                    placeholder="First name"
                    placeholderTextColor={COLORS.muted}
                    returnKeyType="next"
                  />
                </View>
              ))}
            </View>
          </WizardStep>
        )}

        {/* ─── PACKING VIEW ───────────────────────────────────────────────── */}
        {view === "packing" && (
          <View>
            <View style={styles.packingHeader}>
              <Text style={styles.packingTitle} numberOfLines={1}>{listName || "Packing List"}</Text>
              <View style={styles.packingHeaderActions}>
                <TouchableOpacity onPress={confirmResetProgress} activeOpacity={0.7}>
                  <Text style={styles.packingResetText}>Reset Progress</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.progressCard}>
              <View style={styles.progressCardHeader}>
                <Text style={styles.progressCardLabel}>Overall Progress</Text>
                <Text style={styles.progressCardCount}>{packedPairs} of {totalPairs} packed</Text>
              </View>
              <ProgressBar pct={progressPct} />
            </View>

            <View style={styles.catAccordionList}>
              {workingCats.map((cat) => {
                const complete = isCatComplete(cat);
                const collapsed = collapsedCats.has(cat.categoryId);
                const catTotal = cat.items.reduce((s, i) => s + i.travelers.length, 0);
                const catPacked = cat.items.reduce(
                  (s, i) => s + i.travelers.filter((t) => (packedItems[i.id] ?? []).includes(t)).length, 0
                );

                return (
                  <View key={cat.categoryId} style={styles.catAccordion}>
                    <TouchableOpacity
                      style={styles.catAccordionHeader}
                      onPress={() => toggleCollapse(cat.categoryId)}
                      activeOpacity={0.75}
                    >
                      <View style={[styles.catStatusDot, complete ? styles.catStatusDotComplete : styles.catStatusDotPending]} />
                      <Text style={styles.catAccordionName} numberOfLines={1}>{cat.categoryName}</Text>
                      <Text style={styles.catAccordionCount}>{catPacked}/{catTotal}</Text>
                      <Text style={[styles.catAccordionChevron, collapsed && styles.catAccordionChevronCollapsed]}>▼</Text>
                    </TouchableOpacity>

                    {!collapsed && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.packTableScroll}>
                        <View style={{ minWidth: 200 + trimmedTravelers.length * 80 }}>
                          <View style={[styles.tableRow, styles.packTableHeaderRow]}>
                            <View style={styles.itemNameCol} />
                            {trimmedTravelers.map((t) => (
                              <View key={t} style={styles.travelerCol}>
                                <Text style={styles.travelerColText} numberOfLines={1}>{t}</Text>
                              </View>
                            ))}
                            <View style={styles.actionCol} />
                          </View>

                          {cat.items.map((item, idx) => (
                            <View key={item.id} style={[styles.tableRow, idx < cat.items.length - 1 && styles.tableRowBorder]}>
                              <View style={styles.itemNameCol}>
                                {editingItemId === item.id ? (
                                  <TextInput
                                    style={styles.inlineInput}
                                    value={editingItemName}
                                    onChangeText={setEditingItemName}
                                    onSubmitEditing={confirmEditItem}
                                    onBlur={confirmEditItem}
                                    autoFocus
                                    returnKeyType="done"
                                  />
                                ) : (
                                  <TouchableOpacity
                                    onPress={() => { setEditingItemId(item.id); setEditingItemName(item.name); }}
                                    activeOpacity={0.6}
                                  >
                                    <Text style={styles.itemNameText}>{item.name}</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                              {trimmedTravelers.map((t) => (
                                <View key={t} style={styles.travelerCol}>
                                  <PackCell
                                    checked={(packedItems[item.id] ?? []).includes(t)}
                                    onChange={() => togglePacked(item.id, t)}
                                    visible={item.travelers.includes(t)}
                                  />
                                </View>
                              ))}
                              <View style={styles.actionCol} />
                            </View>
                          ))}
                        </View>
                      </ScrollView>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}
      </ScrollView>

      {/* ─── SAVE MODAL ──────────────────────────────────────────────────────── */}
      {showSaveModal && (
        <SaveModal
          listName={listName}
          onListNameChange={setListName}
          onSave={saveListForFuture}
          onSkip={startPackingWithoutSave}
          saving={saving}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1 },
  content: { padding: scaleSpacing(SPACING.md), paddingBottom: scaleSpacing(SPACING.xxl) },

  // Auth
  authWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: scaleSpacing(SPACING.xl), backgroundColor: COLORS.background },
  authIcon: { fontSize: scaleFontSize(48), marginBottom: scaleSpacing(SPACING.sm) },
  authTitle: { fontSize: scaleFontSize(22), fontWeight: "700", color: COLORS.foreground, marginBottom: scaleSpacing(SPACING.xs) },
  authSubtitle: { fontSize: scaleFontSize(14), color: COLORS.muted, textAlign: "center", marginBottom: scaleSpacing(SPACING.lg) },
  authBtn: { backgroundColor: COLORS.primary, paddingHorizontal: scaleSpacing(SPACING.xl), paddingVertical: scaleSpacing(12), borderRadius: scaleFontSize(12) },
  authBtnText: { color: "#fff", fontWeight: "700", fontSize: scaleFontSize(15) },

  // Landing
  pageTitle: { fontSize: scaleFontSize(26), fontWeight: "700", color: COLORS.foreground, marginBottom: scaleSpacing(4) },
  pageSubtitle: { fontSize: scaleFontSize(14), color: COLORS.muted, marginBottom: scaleSpacing(SPACING.md) },
  createBtn: { backgroundColor: COLORS.primary, borderRadius: scaleFontSize(14), paddingVertical: scaleSpacing(16), alignItems: "center", marginBottom: scaleSpacing(SPACING.md) },
  createBtnText: { color: "#fff", fontWeight: "700", fontSize: scaleFontSize(16) },
  loadingWrap: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: scaleSpacing(SPACING.sm), marginTop: scaleSpacing(SPACING.lg) },
  loadingText: { fontSize: scaleFontSize(13), color: COLORS.muted },
  savedSection: { marginTop: scaleSpacing(SPACING.md) },
  savedHeading: { fontSize: scaleFontSize(15), fontWeight: "600", color: COLORS.foreground, marginBottom: scaleSpacing(SPACING.sm) },
  savedCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: scaleFontSize(14), borderWidth: 1, borderColor: COLORS.border, padding: scaleSpacing(SPACING.md), marginBottom: scaleSpacing(SPACING.sm) },
  savedCardInfo: { flex: 1, minWidth: 0 },
  savedCardName: { fontSize: scaleFontSize(14), fontWeight: "600", color: COLORS.foreground },
  savedCardMeta: { fontSize: scaleFontSize(12), color: COLORS.muted, marginTop: scaleSpacing(2) },
  savedCardActions: { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.sm), marginLeft: scaleSpacing(SPACING.sm) },
  savedDeleteBtn: { padding: scaleSpacing(4) },
  savedDeleteIcon: { fontSize: scaleFontSize(14) },
  savedChevron: { fontSize: scaleFontSize(20), color: COLORS.muted },

  // Wizard
  wizardWrap: {},
  wizardTitle: { fontSize: scaleFontSize(22), fontWeight: "700", color: COLORS.foreground, marginBottom: scaleSpacing(SPACING.md) },
  wizardActions: { flexDirection: "row", gap: scaleSpacing(SPACING.sm), marginTop: scaleSpacing(SPACING.xl) },
  wizardBack: { flex: 1, paddingVertical: scaleSpacing(14), borderRadius: scaleFontSize(14), borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  wizardBackText: { fontSize: scaleFontSize(14), fontWeight: "500", color: COLORS.foreground },
  wizardNext: { flex: 1, paddingVertical: scaleSpacing(14), borderRadius: scaleFontSize(14), backgroundColor: COLORS.primary, alignItems: "center" },
  wizardNextDisabled: { opacity: 0.4 },
  wizardNextText: { fontSize: scaleFontSize(14), fontWeight: "700", color: "#fff" },

  // Traveler count
  countRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: scaleSpacing(SPACING.xl), paddingVertical: scaleSpacing(SPACING.xl) },
  countBtn: { width: scaleFontSize(56), height: scaleFontSize(56), borderRadius: scaleFontSize(28), borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  countBtnText: { fontSize: scaleFontSize(28), color: COLORS.foreground, lineHeight: scaleFontSize(32) },
  countNum: { fontSize: scaleFontSize(60), fontWeight: "700", color: COLORS.foreground, width: scaleFontSize(80), textAlign: "center" },

  // Names
  namesWrap: { gap: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(SPACING.md) },
  nameRow: { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.sm) },
  nameLabelText: { fontSize: scaleFontSize(13), color: COLORS.muted, width: scaleFontSize(80), flexShrink: 0 },
  nameInput: { flex: 1, paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(10), borderRadius: scaleFontSize(10), borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, fontSize: scaleFontSize(14), color: COLORS.foreground },

  // Category select
  catSelectActions: { flexDirection: "row", gap: scaleSpacing(SPACING.lg), marginBottom: scaleSpacing(SPACING.sm) },
  selectAllText: { fontSize: scaleFontSize(13), color: COLORS.primary },
  clearAllText: { fontSize: scaleFontSize(13), color: COLORS.muted },
  catGrid: { gap: scaleSpacing(SPACING.sm) },
  catChip: { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.sm), padding: scaleSpacing(12), borderRadius: scaleFontSize(14), borderWidth: 2, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  catChipSelected: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}0D` },
  catChipBox: { width: scaleFontSize(20), height: scaleFontSize(20), borderRadius: scaleFontSize(4), borderWidth: 2, borderColor: COLORS.muted, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  catChipBoxSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  catChipCheck: { color: "#fff", fontSize: scaleFontSize(12), fontWeight: "700" },
  catChipLabel: { fontSize: scaleFontSize(13), fontWeight: "500", color: COLORS.muted, flex: 1 },
  catChipLabelSelected: { color: COLORS.foreground },

  // Item select
  itemSelectHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.md) },
  itemSelectTitleWrap: { flex: 1 },
  itemSelectTitle: { fontSize: scaleFontSize(22), fontWeight: "700", color: COLORS.foreground },
  itemSelectSubtitle: { fontSize: scaleFontSize(12), color: COLORS.muted, marginTop: scaleSpacing(2) },
  itemSelectBtns: { flexDirection: "row", gap: scaleSpacing(SPACING.xs), flexShrink: 0 },
  itemSelectBack: { paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(8), borderRadius: scaleFontSize(10), borderWidth: 1, borderColor: COLORS.border },
  itemSelectBackText: { fontSize: scaleFontSize(13), fontWeight: "500", color: COLORS.foreground },
  itemSelectSave: { paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(8), borderRadius: scaleFontSize(10), backgroundColor: COLORS.primary },
  itemSelectSaveText: { fontSize: scaleFontSize(13), fontWeight: "700", color: "#fff" },
  catTableList: { gap: scaleSpacing(SPACING.md) },
  saveListBtnBottom: { marginTop: scaleSpacing(SPACING.lg), alignSelf: "flex-end", paddingHorizontal: scaleSpacing(SPACING.lg), paddingVertical: scaleSpacing(14), borderRadius: scaleFontSize(14), backgroundColor: COLORS.primary },
  saveListBtnBottomText: { fontSize: scaleFontSize(15), fontWeight: "700", color: "#fff" },

  // Category item table
  catTable: { borderRadius: scaleFontSize(14), borderWidth: 1, borderColor: COLORS.border, overflow: "hidden", backgroundColor: COLORS.surface },
  catTableHeader: { paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(10), backgroundColor: `${COLORS.surface}99`, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  catTableHeaderText: { fontSize: scaleFontSize(13), fontWeight: "600", color: COLORS.foreground },
  tableRow: { flexDirection: "row", alignItems: "center", paddingVertical: scaleSpacing(8) },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: `${COLORS.border}88` },
  addRowHighlight: { backgroundColor: `${COLORS.primary}08` },
  addItemRow: { borderTopWidth: 1, borderTopColor: COLORS.border },
  itemNameCol: { flex: 1, paddingHorizontal: scaleSpacing(SPACING.md), minWidth: 140 },
  travelerCol: { width: scaleFontSize(70), alignItems: "center", paddingHorizontal: scaleSpacing(4) },
  travelerColText: { fontSize: scaleFontSize(10), fontWeight: "500", color: COLORS.muted, textAlign: "center" },
  actionCol: { width: scaleFontSize(44), alignItems: "center", justifyContent: "center" },
  itemNameText: { fontSize: scaleFontSize(13), color: COLORS.foreground },
  addItemLabel: { fontSize: scaleFontSize(13), color: COLORS.muted, fontStyle: "italic" },
  addItemBtn: { fontSize: scaleFontSize(20), color: "#059669", lineHeight: scaleFontSize(24) },
  deleteText: { fontSize: scaleFontSize(14) },
  cancelAddText: { fontSize: scaleFontSize(14), color: COLORS.muted },
  inlineInput: { flex: 1, fontSize: scaleFontSize(13), color: COLORS.foreground, borderWidth: 1, borderColor: COLORS.primary, borderRadius: scaleFontSize(6), paddingHorizontal: scaleSpacing(6), paddingVertical: scaleSpacing(4), backgroundColor: COLORS.background },

  // Select/Pack cell
  cell: { width: scaleFontSize(26), height: scaleFontSize(26), borderRadius: scaleFontSize(5), borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface },
  cellChecked: { backgroundColor: "#10b981", borderColor: "#10b981" },
  cellCheck: { color: "#fff", fontSize: scaleFontSize(14), fontWeight: "700", lineHeight: scaleFontSize(18) },

  // Open saved travelers
  openSavedHint: { fontSize: scaleFontSize(13), color: COLORS.muted, marginBottom: scaleSpacing(SPACING.md) },
  countRowSmall: { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.md) },
  countBtnSmall: { width: scaleFontSize(38), height: scaleFontSize(38), borderRadius: scaleFontSize(19), borderWidth: 2, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  countBtnSmallText: { fontSize: scaleFontSize(20), color: COLORS.foreground, lineHeight: scaleFontSize(24) },
  countNumSmall: { fontSize: scaleFontSize(22), fontWeight: "700", color: COLORS.foreground, width: scaleFontSize(36), textAlign: "center" },
  countSmallLabel: { fontSize: scaleFontSize(13), color: COLORS.muted },

  // Packing view
  packingHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSpacing(SPACING.md), gap: scaleSpacing(SPACING.sm) },
  packingTitle: { flex: 1, fontSize: scaleFontSize(22), fontWeight: "700", color: COLORS.foreground },
  packingHeaderActions: { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.md), flexShrink: 0 },
  packingResetText: { fontSize: scaleFontSize(13), color: "#ef4444" },
  packingBackText: { fontSize: scaleFontSize(13), color: COLORS.muted },
  progressCard: { backgroundColor: COLORS.surface, borderRadius: scaleFontSize(14), borderWidth: 1, borderColor: COLORS.border, padding: scaleSpacing(SPACING.md), marginBottom: scaleSpacing(SPACING.md) },
  progressCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: scaleSpacing(SPACING.xs) },
  progressCardLabel: { fontSize: scaleFontSize(13), fontWeight: "500", color: COLORS.foreground },
  progressCardCount: { fontSize: scaleFontSize(12), color: COLORS.muted },
  progressRow: { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.sm) },
  progressTrack: { flex: 1, height: scaleFontSize(10), borderRadius: scaleFontSize(5), backgroundColor: COLORS.border, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: scaleFontSize(5), backgroundColor: "#10b981" },
  progressPct: { fontSize: scaleFontSize(13), fontWeight: "600", color: COLORS.foreground, minWidth: scaleFontSize(40), textAlign: "right" },
  catAccordionList: { gap: scaleSpacing(SPACING.sm) },
  catAccordion: { borderRadius: scaleFontSize(14), borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  catAccordionHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(12), backgroundColor: COLORS.surface, gap: scaleSpacing(SPACING.sm) },
  catStatusDot: { width: scaleFontSize(10), height: scaleFontSize(10), borderRadius: scaleFontSize(5), flexShrink: 0 },
  catStatusDotComplete: { backgroundColor: "#10b981" },
  catStatusDotPending: { backgroundColor: "#f59e0b" },
  catAccordionName: { flex: 1, fontSize: scaleFontSize(13), fontWeight: "600", color: COLORS.foreground },
  catAccordionCount: { fontSize: scaleFontSize(11), color: COLORS.muted },
  catAccordionChevron: { fontSize: scaleFontSize(12), color: COLORS.muted },
  catAccordionChevronCollapsed: { transform: [{ rotate: "-90deg" }] },
  packTableScroll: { borderTopWidth: 1, borderTopColor: COLORS.border },
  packTableHeaderRow: { borderBottomWidth: 1, borderBottomColor: `${COLORS.border}80` },

  // Save modal
  modalOverlay: { flex: 1, alignItems: "center", justifyContent: "center", padding: scaleSpacing(SPACING.md), backgroundColor: "rgba(0,0,0,0.5)" },
  modalCard: { width: "100%", maxWidth: 360, backgroundColor: COLORS.background, borderRadius: scaleFontSize(20), borderWidth: 1, borderColor: COLORS.border, padding: scaleSpacing(SPACING.lg) },
  modalTitle: { fontSize: scaleFontSize(17), fontWeight: "700", color: COLORS.foreground, marginBottom: scaleSpacing(4) },
  modalSubtitle: { fontSize: scaleFontSize(13), color: COLORS.muted, marginBottom: scaleSpacing(SPACING.md) },
  modalInput: { paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(10), borderRadius: scaleFontSize(10), borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface, fontSize: scaleFontSize(14), color: COLORS.foreground, marginBottom: scaleSpacing(SPACING.md) },
  modalActions: { flexDirection: "row", gap: scaleSpacing(SPACING.sm) },
  modalSkip: { flex: 1, paddingVertical: scaleSpacing(12), borderRadius: scaleFontSize(12), borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  modalSkipText: { fontSize: scaleFontSize(14), fontWeight: "500", color: COLORS.foreground },
  modalSave: { flex: 1, paddingVertical: scaleSpacing(12), borderRadius: scaleFontSize(12), backgroundColor: COLORS.primary, alignItems: "center" },
  modalSaveDisabled: { opacity: 0.4 },
  modalSaveText: { fontSize: scaleFontSize(14), fontWeight: "700", color: "#fff" },
});
