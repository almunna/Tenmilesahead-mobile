import React, { useEffect, useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";

const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAY_SHORT = ["Su","Mo","Tu","We","Th","Fr","Sa"];

/**
 * CalendarPickerModal
 *
 * Props:
 *   visible  {boolean}
 *   value    {Date}          currently selected date (used to pre-open to the right month)
 *   onSelect {(Date) => void} called when user taps a day
 *   onClose  {() => void}
 *   title    {string}        optional header title
 */
export default function CalendarPickerModal({ visible, value, onSelect, onClose, title = "Select Date" }) {
  const safeValue = value instanceof Date && !isNaN(value) ? value : new Date();

  const [viewYear,  setViewYear]  = useState(safeValue.getFullYear());
  const [viewMonth, setViewMonth] = useState(safeValue.getMonth());

  useEffect(() => {
    if (visible) {
      const d = value instanceof Date && !isNaN(value) ? value : new Date();
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [visible]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDow    = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const selDay   = safeValue.getDate();
  const selMonth = safeValue.getMonth();
  const selYear  = safeValue.getFullYear();
  const now      = new Date();

  const isSelected = (d) => d === selDay && viewMonth === selMonth && viewYear === selYear;
  const isToday    = (d) => d === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

  function pickDay(d) {
    if (!d) return;
    const next = new Date(value instanceof Date && !isNaN(value) ? value : new Date());
    next.setFullYear(viewYear, viewMonth, d);
    onSelect(next);
    onClose();
  }

  function goToday() {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    const next = new Date(value instanceof Date && !isNaN(value) ? value : new Date());
    next.setFullYear(n.getFullYear(), n.getMonth(), n.getDate());
    onSelect(next);
    onClose();
  }

  const CELL = scaleFontSize(40);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          {/* Title bar */}
          <View style={styles.titleRow}>
            <Text style={styles.titleText}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Month navigation */}
          <View style={styles.navRow}>
            <TouchableOpacity onPress={prevMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Text style={styles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.monthYear}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={styles.navBtn} activeOpacity={0.7}>
              <Text style={styles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day name headers */}
          <View style={styles.dayNamesRow}>
            {DAY_SHORT.map(d => (
              <Text key={d} style={[styles.dayName, { width: CELL }]}>{d}</Text>
            ))}
          </View>

          {/* Weeks */}
          {rows.map((row, ri) => (
            <View key={ri} style={styles.weekRow}>
              {row.map((d, ci) => (
                <TouchableOpacity
                  key={ci}
                  onPress={() => pickDay(d)}
                  activeOpacity={d ? 0.7 : 1}
                  disabled={!d}
                  style={[
                    styles.dayCell,
                    { width: CELL, height: CELL, borderRadius: CELL / 2 },
                    d && isSelected(d) && styles.dayCellSelected,
                    d && isToday(d) && !isSelected(d) && styles.dayCellToday,
                  ]}
                >
                  <Text style={[
                    styles.dayText,
                    !d                             && styles.dayTextEmpty,
                    d && isToday(d) && !isSelected(d) && styles.dayTextToday,
                    d && isSelected(d)             && styles.dayTextSelected,
                  ]}>
                    {d ?? ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.footerBtn} activeOpacity={0.8}>
              <Text style={styles.footerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToday} style={[styles.footerBtn, styles.footerTodayBtn]} activeOpacity={0.8}>
              <Text style={styles.footerTodayText}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay:    { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: scaleSpacing(SPACING.md) },
  container:  { backgroundColor: COLORS.surface, borderRadius: scaleFontSize(16), borderWidth: 1, borderColor: COLORS.border, padding: scaleSpacing(SPACING.md), width: "100%", maxWidth: 360 },

  titleRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSpacing(SPACING.sm) },
  titleText:  { fontSize: scaleFontSize(16), fontWeight: "700", color: COLORS.foreground },
  closeBtn:   { width: scaleFontSize(28), height: scaleFontSize(28), borderRadius: scaleFontSize(14), backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  closeBtnText:{ fontSize: scaleFontSize(12), color: COLORS.muted },

  navRow:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSpacing(SPACING.sm) },
  navBtn:     { width: scaleFontSize(36), height: scaleFontSize(36), borderRadius: scaleFontSize(8), backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  navArrow:   { fontSize: scaleFontSize(22), color: COLORS.foreground, lineHeight: scaleFontSize(26) },
  monthYear:  { fontSize: scaleFontSize(15), fontWeight: "700", color: COLORS.foreground },

  dayNamesRow:{ flexDirection: "row", marginBottom: scaleSpacing(4) },
  dayName:    { textAlign: "center", fontSize: scaleFontSize(11), fontWeight: "600", color: COLORS.muted },

  weekRow:    { flexDirection: "row", marginBottom: scaleSpacing(2) },
  dayCell:    { alignItems: "center", justifyContent: "center" },
  dayCellSelected: { backgroundColor: COLORS.primary },
  dayCellToday:    { borderWidth: 1.5, borderColor: COLORS.primary },
  dayText:         { fontSize: scaleFontSize(14), color: COLORS.foreground },
  dayTextEmpty:    { color: "transparent" },
  dayTextToday:    { color: COLORS.primary, fontWeight: "700" },
  dayTextSelected: { color: "#fff", fontWeight: "700" },

  footer:         { flexDirection: "row", justifyContent: "flex-end", gap: scaleSpacing(SPACING.sm), marginTop: scaleSpacing(SPACING.sm), paddingTop: scaleSpacing(SPACING.sm), borderTopWidth: 1, borderTopColor: COLORS.border },
  footerBtn:      { paddingVertical: scaleSpacing(8), paddingHorizontal: scaleSpacing(16), borderRadius: scaleFontSize(8), borderWidth: 1, borderColor: COLORS.border },
  footerCancelText:{ fontSize: scaleFontSize(14), color: COLORS.muted },
  footerTodayBtn:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  footerTodayText: { fontSize: scaleFontSize(14), color: "#fff", fontWeight: "600" },
});
