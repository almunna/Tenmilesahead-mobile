import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";

const HOME_TZ_KEY = "tma_home_tz";

// ── Timezone data ─────────────────────────────────────────────────────────────
const TIMEZONES = [
  // Americas
  { value: "America/New_York",               label: "New York",           region: "Americas", flag: "🇺🇸" },
  { value: "America/Chicago",                label: "Chicago",            region: "Americas", flag: "🇺🇸" },
  { value: "America/Denver",                 label: "Denver",             region: "Americas", flag: "🇺🇸" },
  { value: "America/Los_Angeles",            label: "Los Angeles",        region: "Americas", flag: "🇺🇸" },
  { value: "America/Anchorage",              label: "Anchorage",          region: "Americas", flag: "🇺🇸" },
  { value: "Pacific/Honolulu",               label: "Honolulu",           region: "Americas", flag: "🇺🇸" },
  { value: "America/Toronto",                label: "Toronto",            region: "Americas", flag: "🇨🇦" },
  { value: "America/Vancouver",              label: "Vancouver",          region: "Americas", flag: "🇨🇦" },
  { value: "America/Sao_Paulo",              label: "São Paulo",          region: "Americas", flag: "🇧🇷" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires",       region: "Americas", flag: "🇦🇷" },
  { value: "America/Mexico_City",            label: "Mexico City",        region: "Americas", flag: "🇲🇽" },
  { value: "America/Bogota",                 label: "Bogotá",             region: "Americas", flag: "🇨🇴" },
  { value: "America/Lima",                   label: "Lima",               region: "Americas", flag: "🇵🇪" },
  { value: "America/Santiago",               label: "Santiago",           region: "Americas", flag: "🇨🇱" },
  { value: "America/Caracas",                label: "Caracas",            region: "Americas", flag: "🇻🇪" },
  { value: "America/Halifax",                label: "Halifax",            region: "Americas", flag: "🇨🇦" },
  // Europe
  { value: "Europe/London",                  label: "London",             region: "Europe",   flag: "🇬🇧" },
  { value: "Europe/Dublin",                  label: "Dublin",             region: "Europe",   flag: "🇮🇪" },
  { value: "Europe/Lisbon",                  label: "Lisbon",             region: "Europe",   flag: "🇵🇹" },
  { value: "Europe/Paris",                   label: "Paris",              region: "Europe",   flag: "🇫🇷" },
  { value: "Europe/Madrid",                  label: "Madrid",             region: "Europe",   flag: "🇪🇸" },
  { value: "Europe/Rome",                    label: "Rome",               region: "Europe",   flag: "🇮🇹" },
  { value: "Europe/Berlin",                  label: "Berlin",             region: "Europe",   flag: "🇩🇪" },
  { value: "Europe/Amsterdam",               label: "Amsterdam",          region: "Europe",   flag: "🇳🇱" },
  { value: "Europe/Vienna",                  label: "Vienna",             region: "Europe",   flag: "🇦🇹" },
  { value: "Europe/Zurich",                  label: "Zurich",             region: "Europe",   flag: "🇨🇭" },
  { value: "Europe/Stockholm",               label: "Stockholm",          region: "Europe",   flag: "🇸🇪" },
  { value: "Europe/Copenhagen",              label: "Copenhagen",         region: "Europe",   flag: "🇩🇰" },
  { value: "Europe/Helsinki",                label: "Helsinki",           region: "Europe",   flag: "🇫🇮" },
  { value: "Europe/Warsaw",                  label: "Warsaw",             region: "Europe",   flag: "🇵🇱" },
  { value: "Europe/Prague",                  label: "Prague",             region: "Europe",   flag: "🇨🇿" },
  { value: "Europe/Budapest",                label: "Budapest",           region: "Europe",   flag: "🇭🇺" },
  { value: "Europe/Bucharest",               label: "Bucharest",          region: "Europe",   flag: "🇷🇴" },
  { value: "Europe/Athens",                  label: "Athens",             region: "Europe",   flag: "🇬🇷" },
  { value: "Europe/Istanbul",                label: "Istanbul",           region: "Europe",   flag: "🇹🇷" },
  { value: "Europe/Moscow",                  label: "Moscow",             region: "Europe",   flag: "🇷🇺" },
  // Middle East
  { value: "Asia/Dubai",                     label: "Dubai",              region: "Middle East", flag: "🇦🇪" },
  { value: "Asia/Riyadh",                    label: "Riyadh",             region: "Middle East", flag: "🇸🇦" },
  { value: "Asia/Qatar",                     label: "Doha",               region: "Middle East", flag: "🇶🇦" },
  { value: "Asia/Kuwait",                    label: "Kuwait City",        region: "Middle East", flag: "🇰🇼" },
  { value: "Asia/Beirut",                    label: "Beirut",             region: "Middle East", flag: "🇱🇧" },
  { value: "Asia/Jerusalem",                 label: "Tel Aviv",           region: "Middle East", flag: "🇮🇱" },
  { value: "Asia/Tehran",                    label: "Tehran",             region: "Middle East", flag: "🇮🇷" },
  // Asia
  { value: "Asia/Karachi",                   label: "Karachi",            region: "Asia",     flag: "🇵🇰" },
  { value: "Asia/Kolkata",                   label: "Mumbai / Kolkata",   region: "Asia",     flag: "🇮🇳" },
  { value: "Asia/Kathmandu",                 label: "Kathmandu",          region: "Asia",     flag: "🇳🇵" },
  { value: "Asia/Dhaka",                     label: "Dhaka",              region: "Asia",     flag: "🇧🇩" },
  { value: "Asia/Colombo",                   label: "Colombo",            region: "Asia",     flag: "🇱🇰" },
  { value: "Asia/Yangon",                    label: "Yangon",             region: "Asia",     flag: "🇲🇲" },
  { value: "Asia/Bangkok",                   label: "Bangkok",            region: "Asia",     flag: "🇹🇭" },
  { value: "Asia/Ho_Chi_Minh",               label: "Ho Chi Minh City",   region: "Asia",     flag: "🇻🇳" },
  { value: "Asia/Jakarta",                   label: "Jakarta",            region: "Asia",     flag: "🇮🇩" },
  { value: "Asia/Kuala_Lumpur",              label: "Kuala Lumpur",       region: "Asia",     flag: "🇲🇾" },
  { value: "Asia/Singapore",                 label: "Singapore",          region: "Asia",     flag: "🇸🇬" },
  { value: "Asia/Manila",                    label: "Manila",             region: "Asia",     flag: "🇵🇭" },
  { value: "Asia/Shanghai",                  label: "Beijing / Shanghai", region: "Asia",     flag: "🇨🇳" },
  { value: "Asia/Taipei",                    label: "Taipei",             region: "Asia",     flag: "🇹🇼" },
  { value: "Asia/Hong_Kong",                 label: "Hong Kong",          region: "Asia",     flag: "🇭🇰" },
  { value: "Asia/Seoul",                     label: "Seoul",              region: "Asia",     flag: "🇰🇷" },
  { value: "Asia/Tokyo",                     label: "Tokyo",              region: "Asia",     flag: "🇯🇵" },
  { value: "Asia/Tashkent",                  label: "Tashkent",           region: "Asia",     flag: "🇺🇿" },
  // Africa
  { value: "Africa/Casablanca",              label: "Casablanca",         region: "Africa",   flag: "🇲🇦" },
  { value: "Africa/Cairo",                   label: "Cairo",              region: "Africa",   flag: "🇪🇬" },
  { value: "Africa/Lagos",                   label: "Lagos",              region: "Africa",   flag: "🇳🇬" },
  { value: "Africa/Accra",                   label: "Accra",              region: "Africa",   flag: "🇬🇭" },
  { value: "Africa/Nairobi",                 label: "Nairobi",            region: "Africa",   flag: "🇰🇪" },
  { value: "Africa/Johannesburg",            label: "Johannesburg",       region: "Africa",   flag: "🇿🇦" },
  { value: "Africa/Tunis",                   label: "Tunis",              region: "Africa",   flag: "🇹🇳" },
  // Pacific / Oceania
  { value: "Australia/Perth",                label: "Perth",              region: "Pacific",  flag: "🇦🇺" },
  { value: "Australia/Brisbane",             label: "Brisbane",           region: "Pacific",  flag: "🇦🇺" },
  { value: "Australia/Sydney",               label: "Sydney",             region: "Pacific",  flag: "🇦🇺" },
  { value: "Australia/Melbourne",            label: "Melbourne",          region: "Pacific",  flag: "🇦🇺" },
  { value: "Pacific/Auckland",               label: "Auckland",           region: "Pacific",  flag: "🇳🇿" },
  { value: "Pacific/Fiji",                   label: "Suva (Fiji)",        region: "Pacific",  flag: "🇫🇯" },
  // UTC
  { value: "UTC",                            label: "UTC",                region: "UTC",      flag: "🌐" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDeviceTz() {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return "UTC"; }
}

function getTzOffsetMinutes(tz, date) {
  // Use formatToParts — avoids new Date(localeString) which fails on Android/Hermes
  try {
    const getParts = (timezone) => {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
        hour12: false,
      }).formatToParts(date);
      const get = (type) => parseInt(parts.find((p) => p.type === type)?.value ?? "0", 10);
      let h = get("hour");
      if (h === 24) h = 0; // midnight edge case
      return Date.UTC(get("year"), get("month") - 1, get("day"), h, get("minute"), get("second"));
    };
    return (getParts(tz) - getParts("UTC")) / 60000;
  } catch {
    return 0;
  }
}

function offsetLabel(minutes) {
  const sign = minutes >= 0 ? "+" : "−";
  const abs  = Math.abs(minutes);
  const h    = Math.floor(abs / 60);
  const m    = abs % 60;
  return `UTC${sign}${h}${m ? `:${String(m).padStart(2, "0")}` : ""}`;
}

function convertTz(year, month, day, hours, minutes, fromTz, toTz) {
  const approx     = new Date(Date.UTC(year, month - 1, day, hours, minutes));
  const fromOffset = getTzOffsetMinutes(fromTz, approx);
  const utcMs      = approx.getTime() - fromOffset * 60000;
  const utcDate    = new Date(utcMs);
  const toOffset   = getTzOffsetMinutes(toTz, utcDate);

  const timeStr = new Intl.DateTimeFormat("en-US", {
    timeZone: toTz, hour: "2-digit", minute: "2-digit", hour12: true,
  }).format(utcDate);
  const dateStr = new Intl.DateTimeFormat("en-US", {
    timeZone: toTz, weekday: "short", month: "short", day: "numeric", year: "numeric",
  }).format(utcDate);

  const fromDateStr = new Date(Date.UTC(year, month - 1, day)).toISOString().slice(0, 10);
  const toDateStr   = new Intl.DateTimeFormat("en-CA", { timeZone: toTz }).format(utcDate);
  const dayDiff     = Math.round(
    (new Date(toDateStr).getTime() - new Date(fromDateStr).getTime()) / 86400000,
  );

  return { timeStr, dateStr, dayDiff, offsetStr: offsetLabel(toOffset) };
}

function getLiveTime(tz) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true,
  }).format(new Date());
}

function getLiveDate(tz) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz, weekday: "long", month: "long", day: "numeric", year: "numeric",
  }).format(new Date());
}

function getTzInfo(tz) {
  return TIMEZONES.find((t) => t.value === tz) ?? {
    label: tz.split("/").pop()?.replace(/_/g, " ") ?? tz,
    flag: "🌐",
    region: "",
  };
}

function fmtDate(d) {
  // MM/DD/YYYY to match web display
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = d.getFullYear();
  return `${mm}/${dd}/${yy}`;
}

function fmtTime(d) {
  // hh:mm AM/PM to match web display
  return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

// ── Timezone Picker Modal ─────────────────────────────────────────────────────
function TzPicker({ visible, value, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [visible]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TIMEZONES;
    return TIMEZONES.filter(
      (t) => t.label.toLowerCase().includes(q) || t.region.toLowerCase().includes(q) || t.value.toLowerCase().includes(q)
    );
  }, [query]);

  const renderItem = ({ item: tz, index }) => {
    const selected = tz.value === value;
    const listData = query.trim() ? filtered : TIMEZONES;
    const prev = listData[index - 1];
    const showHeader = !query.trim() && (!prev || prev.region !== tz.region);
    return (
      <>
        {showHeader && (
          <View style={styles.pickerGroupHeader}>
            <Text style={styles.pickerGroupLabel}>{tz.region}</Text>
          </View>
        )}
        <TouchableOpacity
          style={[styles.pickerItem, selected && styles.pickerItemSelected]}
          onPress={() => { onSelect(tz.value); onClose(); }}
          activeOpacity={0.7}
        >
          <Text style={styles.pickerFlag}>{tz.flag}</Text>
          <View style={styles.pickerTextCol}>
            <Text style={[styles.pickerLabel, selected && styles.pickerLabelSelected]} numberOfLines={1}>{tz.label}</Text>
            <Text style={styles.pickerRegion}>{tz.region}</Text>
          </View>
          {selected && <Text style={styles.pickerCheck}>✓</Text>}
        </TouchableOpacity>
      </>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.pickerModal}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select Time Zone</Text>
          <TouchableOpacity style={styles.pickerClose} onPress={onClose}>
            <Text style={styles.pickerCloseText}>✕</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.pickerSearchRow}>
          <Text style={styles.pickerSearchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.pickerSearch}
            value={query}
            onChangeText={setQuery}
            placeholder="Search city or region…"
            placeholderTextColor={COLORS.muted}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Text style={styles.pickerClearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        {filtered.length === 0 ? (
          <View style={styles.pickerEmpty}>
            <Text style={styles.pickerEmptyText}>No results for "{query}"</Text>
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </View>
    </Modal>
  );
}

// ── Live Clock Card ───────────────────────────────────────────────────────────
function LiveClock({ tz, label, icon, isHome, onSetHome }) {
  const info = getTzInfo(tz);
  return (
    <View style={[styles.clockCard, isHome && styles.clockCardHome]}>
      <View style={styles.clockHeader}>
        <View style={styles.clockHeaderLeft}>
          <Text style={styles.clockFlag}>{info.flag}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.clockHeaderLabel}>{icon} {label.toUpperCase()}</Text>
            <Text style={styles.clockCity} numberOfLines={1}>{info.label}</Text>
          </View>
        </View>
        {isHome ? (
          <View style={styles.homeBadge}>
            <Text style={styles.homeBadgeText}>Home</Text>
          </View>
        ) : onSetHome ? (
          <TouchableOpacity style={styles.setHomeBadge} onPress={onSetHome}>
            <Text style={styles.setHomeBadgeText}>Set as Home</Text>
          </TouchableOpacity>
        ) : null}
      </View>
      <Text style={styles.clockTime}>{getLiveTime(tz)}</Text>
      <Text style={styles.clockDate}>{getLiveDate(tz)}</Text>
    </View>
  );
}

// ── Timezone Selector Button ──────────────────────────────────────────────────
function TzButton({ value, onPress }) {
  const info = getTzInfo(value);
  return (
    <TouchableOpacity style={styles.tzBtn} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.tzBtnFlag}>{info.flag}</Text>
      <Text style={styles.tzBtnLabel} numberOfLines={1}>{info.label}</Text>
      <Text style={styles.tzBtnChevron}>▾</Text>
    </TouchableOpacity>
  );
}

// ── Calendar Modal ────────────────────────────────────────────────────────────
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const DAY_SHORT   = ["Su","Mo","Tu","We","Th","Fr","Sa"];

function CalendarModal({ visible, value, onSelect, onClose }) {
  const [viewYear,  setViewYear]  = useState(() => value.getFullYear());
  const [viewMonth, setViewMonth] = useState(() => value.getMonth());

  useEffect(() => {
    if (visible) { setViewYear(value.getFullYear()); setViewMonth(value.getMonth()); }
  }, [visible]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  const firstDow   = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  const selDay   = value.getDate();
  const selMonth = value.getMonth();
  const selYear  = value.getFullYear();
  const now      = new Date();
  const isSelected = (d) => d === selDay && viewMonth === selMonth && viewYear === selYear;
  const isToday    = (d) => d === now.getDate() && viewMonth === now.getMonth() && viewYear === now.getFullYear();

  function pickDay(d) {
    if (!d) return;
    const next = new Date(value);
    next.setFullYear(viewYear, viewMonth, d);
    onSelect(next);
    onClose();
  }

  function goToday() {
    const n = new Date();
    setViewYear(n.getFullYear());
    setViewMonth(n.getMonth());
    const next = new Date(value);
    next.setFullYear(n.getFullYear(), n.getMonth(), n.getDate());
    onSelect(next);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={calStyles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={calStyles.container} onStartShouldSetResponder={() => true}>
          {/* Month nav */}
          <View style={calStyles.header}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn} activeOpacity={0.7}>
              <Text style={calStyles.navArrow}>‹</Text>
            </TouchableOpacity>
            <Text style={calStyles.monthYear}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn} activeOpacity={0.7}>
              <Text style={calStyles.navArrow}>›</Text>
            </TouchableOpacity>
          </View>
          {/* Day name headers */}
          <View style={calStyles.dayNamesRow}>
            {DAY_SHORT.map(d => (
              <Text key={d} style={calStyles.dayName}>{d}</Text>
            ))}
          </View>
          {/* Weeks */}
          {rows.map((row, ri) => (
            <View key={ri} style={calStyles.weekRow}>
              {row.map((d, ci) => (
                <TouchableOpacity
                  key={ci}
                  onPress={() => pickDay(d)}
                  activeOpacity={d ? 0.7 : 1}
                  disabled={!d}
                  style={[
                    calStyles.dayCell,
                    d && isSelected(d) && calStyles.dayCellSelected,
                    d && isToday(d) && !isSelected(d) && calStyles.dayCellToday,
                  ]}
                >
                  <Text style={[
                    calStyles.dayText,
                    !d              && calStyles.dayTextEmpty,
                    d && isToday(d) && !isSelected(d) && calStyles.dayTextToday,
                    d && isSelected(d) && calStyles.dayTextSelected,
                  ]}>
                    {d ?? ""}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          {/* Footer */}
          <View style={calStyles.footer}>
            <TouchableOpacity onPress={onClose} style={calStyles.footerBtn}>
              <Text style={calStyles.footerCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={goToday} style={[calStyles.footerBtn, calStyles.footerTodayBtn]}>
              <Text style={calStyles.footerTodayText}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Time Picker Modal ─────────────────────────────────────────────────────────
function TimeModal({ visible, value, onSelect, onClose }) {
  const toH12 = (h) => h % 12 === 0 ? 12 : h % 12;
  const [h12,  setH12]  = useState(() => toH12(value.getHours()));
  const [mins, setMins] = useState(() => value.getMinutes());
  const [pm,   setPm]   = useState(() => value.getHours() >= 12);

  useEffect(() => {
    if (visible) {
      setH12(toH12(value.getHours()));
      setMins(value.getMinutes());
      setPm(value.getHours() >= 12);
    }
  }, [visible]);

  function confirm() {
    let finalH = h12 % 12;
    if (pm) finalH += 12;
    const next = new Date(value);
    next.setHours(finalH, mins, 0, 0);
    onSelect(next);
    onClose();
  }

  const incH   = () => setH12(h => h === 12 ? 1 : h + 1);
  const decH   = () => setH12(h => h === 1  ? 12 : h - 1);
  const incM   = () => setMins(m => (m + 1) % 60);
  const decM   = () => setMins(m => m === 0 ? 59 : m - 1);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={calStyles.overlay} onPress={onClose} activeOpacity={1}>
        <View style={tmStyles.container} onStartShouldSetResponder={() => true}>
          <Text style={tmStyles.title}>Select Time</Text>
          <View style={tmStyles.timeRow}>
            {/* Hour */}
            <View style={tmStyles.spinCol}>
              <TouchableOpacity onPress={incH} style={tmStyles.spinBtn} activeOpacity={0.7}>
                <Text style={tmStyles.spinArrow}>▲</Text>
              </TouchableOpacity>
              <View style={tmStyles.spinValBox}>
                <Text style={tmStyles.spinVal}>{String(h12).padStart(2, "0")}</Text>
              </View>
              <TouchableOpacity onPress={decH} style={tmStyles.spinBtn} activeOpacity={0.7}>
                <Text style={tmStyles.spinArrow}>▼</Text>
              </TouchableOpacity>
            </View>
            <Text style={tmStyles.colon}>:</Text>
            {/* Minute */}
            <View style={tmStyles.spinCol}>
              <TouchableOpacity onPress={incM} style={tmStyles.spinBtn} activeOpacity={0.7}>
                <Text style={tmStyles.spinArrow}>▲</Text>
              </TouchableOpacity>
              <View style={tmStyles.spinValBox}>
                <Text style={tmStyles.spinVal}>{String(mins).padStart(2, "0")}</Text>
              </View>
              <TouchableOpacity onPress={decM} style={tmStyles.spinBtn} activeOpacity={0.7}>
                <Text style={tmStyles.spinArrow}>▼</Text>
              </TouchableOpacity>
            </View>
            {/* AM / PM */}
            <View style={tmStyles.ampmCol}>
              <TouchableOpacity
                style={[tmStyles.ampmBtn, !pm && tmStyles.ampmBtnActive]}
                onPress={() => setPm(false)}
                activeOpacity={0.8}
              >
                <Text style={[tmStyles.ampmText, !pm && tmStyles.ampmTextActive]}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[tmStyles.ampmBtn, pm && tmStyles.ampmBtnActive]}
                onPress={() => setPm(true)}
                activeOpacity={0.8}
              >
                <Text style={[tmStyles.ampmText, pm && tmStyles.ampmTextActive]}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Buttons */}
          <View style={tmStyles.btnRow}>
            <TouchableOpacity onPress={onClose} style={tmStyles.cancelBtn} activeOpacity={0.8}>
              <Text style={tmStyles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={confirm} style={tmStyles.confirmBtn} activeOpacity={0.8}>
              <Text style={tmStyles.confirmText}>Set Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function TimeZonesScreen() {
  const deviceTz  = useMemo(() => getDeviceTz(), []);
  const defaultTo = deviceTz === "America/New_York" ? "Europe/London" : "America/New_York";

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [fromTz,  setFromTz]   = useState(deviceTz);
  const [toTz,    setToTz]     = useState(defaultTo);
  const [homeTz,  setHomeTz]   = useState(deviceTz);
  const [pickerFor,  setPickerFor]  = useState(null); // "from"|"to"
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [, setTick] = useState(0);

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // Load persisted home tz
  useEffect(() => {
    AsyncStorage.getItem(HOME_TZ_KEY).then((saved) => {
      if (saved && TIMEZONES.some((t) => t.value === saved)) setHomeTz(saved);
    });
  }, []);

  function saveHome(tz) {
    setHomeTz(tz);
    AsyncStorage.setItem(HOME_TZ_KEY, tz);
  }

  function swap() { setFromTz(toTz); setToTz(fromTz); }

  // Compute conversion
  const year    = selectedDate.getFullYear();
  const month   = selectedDate.getMonth() + 1;
  const day     = selectedDate.getDate();
  const hours   = selectedDate.getHours();
  const minutes = selectedDate.getMinutes();

  let result = null;
  let convError = "";
  try {
    result = convertTz(year, month, day, hours, minutes, fromTz, toTz);
  } catch (e) {
    convError = String(e);
  }

  const fromInfo = getTzInfo(fromTz);
  const toInfo   = getTzInfo(toTz);

  const dayDiffLabel =
    result?.dayDiff === 1  ? "+1 day"
    : result?.dayDiff === -1 ? "−1 day"
    : result?.dayDiff ? `${result.dayDiff > 0 ? "+" : ""}${result.dayDiff} days`
    : null;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Header ── */}
      <View style={styles.headerBlock}>
        <Text style={styles.heading}>Time Zone Converter</Text>
        <Text style={styles.subheading}>Plan calls, meetings, or arrivals across cities worldwide</Text>
      </View>

      {/* ── Live Clocks ── */}
      <View style={styles.clocksRow}>
        <View style={styles.clockCol}>
          <LiveClock tz={homeTz}   label="Home"        icon="🏠" isHome />
        </View>
        <View style={styles.clockCol}>
          <LiveClock
            tz={deviceTz}
            label="You Are Here"
            icon="📍"
            isHome={deviceTz === homeTz}
            onSetHome={deviceTz !== homeTz ? () => saveHome(deviceTz) : null}
          />
        </View>
      </View>
      <Text style={styles.clockNote}>
        "You Are Here" is auto-detected from your device · Home is saved in your app
      </Text>

      {/* ── Converter Card ── */}
      <View style={styles.card}>

        {/* Date + Time */}
        <View style={styles.dateTimeRow}>
          {/* Date picker trigger */}
          <View style={styles.dateTimeField}>
            <Text style={styles.fieldLabel}>DATE (MM/DD/YYYY)</Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, showDatePicker && styles.pickerTriggerActive]}
              onPress={() => setShowDatePicker(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.pickerTriggerIcon}>📅</Text>
              <Text style={styles.pickerTriggerText}>{fmtDate(selectedDate)}</Text>
            </TouchableOpacity>
          </View>

          {/* Time picker trigger */}
          <View style={styles.dateTimeField}>
            <Text style={styles.fieldLabel}>TIME (HH:MM)</Text>
            <TouchableOpacity
              style={[styles.pickerTrigger, showTimePicker && styles.pickerTriggerActive]}
              onPress={() => setShowTimePicker(true)}
              activeOpacity={0.75}
            >
              <Text style={styles.pickerTriggerIcon}>🕐</Text>
              <Text style={styles.pickerTriggerText}>{fmtTime(selectedDate)}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* From / Swap / To */}
        <View style={styles.pickersRow}>
          <View style={styles.pickerCol}>
            <Text style={styles.fieldLabel}>From</Text>
            <TzButton value={fromTz} onPress={() => setPickerFor("from")} />
          </View>
          <TouchableOpacity style={styles.swapBtn} onPress={swap} activeOpacity={0.75}>
            <Text style={styles.swapIcon}>⇄</Text>
          </TouchableOpacity>
          <View style={styles.pickerCol}>
            <Text style={styles.fieldLabel}>To</Text>
            <TzButton value={toTz} onPress={() => setPickerFor("to")} />
          </View>
        </View>

        {/* Result */}
        <View style={[styles.resultCard, convError && styles.resultCardError]}>
          {convError ? (
            <Text style={styles.errorText}>{convError}</Text>
          ) : result ? (
            <>
              <View style={styles.resultRow}>
                <View>
                  <Text style={styles.resultTime}>{result.timeStr}</Text>
                  <Text style={styles.resultDate}>{result.dateStr}</Text>
                </View>
                <View style={styles.resultBadges}>
                  {dayDiffLabel && (
                    <View style={[styles.dayDiffBadge, result.dayDiff > 0 ? styles.dayDiffPlus : styles.dayDiffMinus]}>
                      <Text style={[styles.dayDiffText, result.dayDiff > 0 ? styles.dayDiffTextPlus : styles.dayDiffTextMinus]}>
                        {dayDiffLabel}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.offsetText}>{result.offsetStr}</Text>
                </View>
              </View>
              <View style={styles.resultFooter}>
                <Text style={styles.resultRoute}>
                  {fromInfo.flag} {fromInfo.label}  →  {toInfo.flag} {toInfo.label}
                </Text>
              </View>
            </>
          ) : (
            <Text style={styles.resultPlaceholder}>Select a date and time above to convert</Text>
          )}
        </View>

        {/* Set as Home shortcuts */}
        <View style={styles.homeRow}>
          <TouchableOpacity
            style={[styles.homeBtn, homeTz === fromTz && styles.homeBtnActive]}
            onPress={() => saveHome(fromTz)}
          >
            <Text style={[styles.homeBtnText, homeTz === fromTz && styles.homeBtnTextActive]}>
              {homeTz === fromTz ? "🏠 Home (From)" : "Set From as Home"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.homeBtn, homeTz === toTz && styles.homeBtnActive]}
            onPress={() => saveHome(toTz)}
          >
            <Text style={[styles.homeBtnText, homeTz === toTz && styles.homeBtnTextActive]}>
              {homeTz === toTz ? "🏠 Home (To)" : "Set To as Home"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Live — Both Zones ── */}
      {fromTz !== toTz && (
        <View style={styles.bothZones}>
          <Text style={styles.sectionLabel}>LIVE — BOTH ZONES</Text>
          <View style={styles.clocksRow}>
            <View style={styles.clockCol}>
              <LiveClock
                tz={fromTz}
                label="From"
                icon="🕐"
                isHome={homeTz === fromTz}
                onSetHome={homeTz !== fromTz ? () => saveHome(fromTz) : null}
              />
            </View>
            <View style={styles.clockCol}>
              <LiveClock
                tz={toTz}
                label="To"
                icon="🕐"
                isHome={homeTz === toTz}
                onSetHome={homeTz !== toTz ? () => saveHome(toTz) : null}
              />
            </View>
          </View>
        </View>
      )}

      {/* TZ Pickers */}
      <TzPicker visible={pickerFor === "from"} value={fromTz} onSelect={setFromTz} onClose={() => setPickerFor(null)} />
      <TzPicker visible={pickerFor === "to"}   value={toTz}   onSelect={setToTz}   onClose={() => setPickerFor(null)} />

      {/* Date & Time modals */}
      <CalendarModal
        visible={showDatePicker}
        value={selectedDate}
        onSelect={(d) => setSelectedDate(d)}
        onClose={() => setShowDatePicker(false)}
      />
      <TimeModal
        visible={showTimePicker}
        value={selectedDate}
        onSelect={(d) => setSelectedDate(d)}
        onClose={() => setShowTimePicker(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content:   { padding: scaleSpacing(SPACING.md), paddingBottom: scaleSpacing(SPACING.xxl) },

  headerBlock: { marginBottom: scaleSpacing(SPACING.md) },
  heading:     { fontSize: scaleFontSize(24), fontWeight: "700", color: COLORS.foreground },
  subheading:  { fontSize: scaleFontSize(13), color: COLORS.muted, marginTop: scaleSpacing(4) },

  /* Live Clocks */
  clocksRow:       { flexDirection: "row", gap: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.sm) },
  clockCol:        { flex: 1 },
  clockCard:       { backgroundColor: COLORS.surface, borderRadius: scaleFontSize(12), borderWidth: 1, borderColor: COLORS.border, padding: scaleSpacing(SPACING.sm), gap: scaleSpacing(4) },
  clockCardHome:   { borderColor: `${COLORS.primary}55` },
  clockHeader:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  clockHeaderLeft: { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.xs), flex: 1 },
  clockFlag:       { fontSize: scaleFontSize(18) },
  clockHeaderLabel:{ fontSize: scaleFontSize(9), fontWeight: "600", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  clockCity:       { fontSize: scaleFontSize(11), fontWeight: "600", color: COLORS.foreground },
  clockTime:       { fontSize: scaleFontSize(16), fontWeight: "700", color: COLORS.foreground, letterSpacing: 0.5 },
  clockDate:       { fontSize: scaleFontSize(9), color: COLORS.muted },
  homeBadge:       { backgroundColor: `${COLORS.primary}22`, borderRadius: 100, paddingHorizontal: scaleSpacing(6), paddingVertical: scaleSpacing(2) },
  homeBadgeText:   { fontSize: scaleFontSize(9), fontWeight: "600", color: COLORS.primary },
  setHomeBadge:    { backgroundColor: COLORS.background, borderRadius: 100, paddingHorizontal: scaleSpacing(6), paddingVertical: scaleSpacing(2), borderWidth: 1, borderColor: COLORS.border },
  setHomeBadgeText:{ fontSize: scaleFontSize(9), color: COLORS.muted },
  clockNote:       { fontSize: scaleFontSize(10), color: COLORS.muted, textAlign: "center", marginBottom: scaleSpacing(SPACING.md) },

  /* Converter Card */
  card: { backgroundColor: COLORS.surface, borderRadius: scaleFontSize(16), borderWidth: 1, borderColor: COLORS.border, padding: scaleSpacing(SPACING.md), gap: scaleSpacing(SPACING.md), marginBottom: scaleSpacing(SPACING.lg) },

  /* Date/Time pickers */
  dateTimeRow:    { flexDirection: "row", gap: scaleSpacing(SPACING.sm) },
  dateTimeField:  { flex: 1, gap: scaleSpacing(4) },
  fieldLabel:     { fontSize: scaleFontSize(11), fontWeight: "600", color: COLORS.muted },
  pickerTrigger:       { flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.xs), backgroundColor: COLORS.background, borderRadius: scaleFontSize(10), borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: scaleSpacing(10), paddingVertical: scaleSpacing(11) },
  pickerTriggerActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}10` },
  pickerTriggerText:   { fontSize: scaleFontSize(14), color: COLORS.foreground, fontWeight: "500", flex: 1 },
  pickerTriggerIcon:   { fontSize: scaleFontSize(14) },

  /* From/To pickers */
  pickersRow:  { flexDirection: "row", alignItems: "flex-end", gap: scaleSpacing(SPACING.sm) },
  pickerCol:   { flex: 1, gap: scaleSpacing(4) },
  tzBtn:       { backgroundColor: COLORS.background, borderRadius: scaleFontSize(10), borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: scaleSpacing(10), paddingVertical: scaleSpacing(10), flexDirection: "row", alignItems: "center", gap: scaleSpacing(SPACING.xs) },
  tzBtnFlag:   { fontSize: scaleFontSize(16) },
  tzBtnLabel:  { flex: 1, fontSize: scaleFontSize(13), fontWeight: "600", color: COLORS.foreground },
  tzBtnChevron:{ fontSize: scaleFontSize(12), color: COLORS.muted },
  swapBtn:     { width: scaleFontSize(40), height: scaleFontSize(40), borderRadius: scaleFontSize(10), borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center", marginBottom: scaleSpacing(2) },
  swapIcon:    { fontSize: scaleFontSize(18), color: COLORS.primary },

  /* Result */
  resultCard:       { backgroundColor: `${COLORS.primary}18`, borderRadius: scaleFontSize(12), borderWidth: 1, borderColor: `${COLORS.primary}30`, padding: scaleSpacing(SPACING.md) },
  resultCardError:  { backgroundColor: "#fee2e2", borderColor: "#fca5a5" },
  errorText:        { fontSize: scaleFontSize(13), color: "#ef4444" },
  resultRow:        { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  resultTime:       { fontSize: scaleFontSize(28), fontWeight: "700", color: COLORS.foreground },
  resultDate:       { fontSize: scaleFontSize(12), color: COLORS.muted, marginTop: scaleSpacing(2) },
  resultBadges:     { alignItems: "flex-end", gap: scaleSpacing(4) },
  dayDiffBadge:     { borderRadius: 100, paddingHorizontal: scaleSpacing(8), paddingVertical: scaleSpacing(3) },
  dayDiffPlus:      { backgroundColor: "#fef3c7" },
  dayDiffMinus:     { backgroundColor: "#dbeafe" },
  dayDiffText:      { fontSize: scaleFontSize(11), fontWeight: "600" },
  dayDiffTextPlus:  { color: "#92400e" },
  dayDiffTextMinus: { color: "#1e40af" },
  offsetText:       { fontSize: scaleFontSize(11), color: COLORS.muted },
  resultFooter:     { marginTop: scaleSpacing(SPACING.sm), paddingTop: scaleSpacing(SPACING.sm), borderTopWidth: 1, borderTopColor: `${COLORS.primary}20` },
  resultRoute:      { fontSize: scaleFontSize(11), color: COLORS.muted },
  resultPlaceholder:{ fontSize: scaleFontSize(13), color: COLORS.muted },

  /* Home shortcuts */
  homeRow:          { flexDirection: "row", flexWrap: "wrap", gap: scaleSpacing(SPACING.sm) },
  homeBtn:          { paddingVertical: scaleSpacing(6), paddingHorizontal: scaleSpacing(12), borderRadius: scaleFontSize(8), borderWidth: 1, borderColor: COLORS.border },
  homeBtnActive:    { backgroundColor: `${COLORS.primary}18`, borderColor: `${COLORS.primary}55` },
  homeBtnText:      { fontSize: scaleFontSize(12), fontWeight: "500", color: COLORS.muted },
  homeBtnTextActive:{ color: COLORS.primary },

  /* Both Zones */
  bothZones:    { marginBottom: scaleSpacing(SPACING.md) },
  sectionLabel: { fontSize: scaleFontSize(10), fontWeight: "600", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: scaleSpacing(SPACING.sm) },

  /* TZ Picker Modal */
  pickerModal:      { flex: 1, backgroundColor: COLORS.background },
  pickerHeader:     { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(SPACING.md), borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.surface },
  pickerTitle:      { fontSize: scaleFontSize(17), fontWeight: "700", color: COLORS.foreground },
  pickerClose:      { width: scaleFontSize(32), height: scaleFontSize(32), borderRadius: scaleFontSize(16), backgroundColor: COLORS.background, alignItems: "center", justifyContent: "center" },
  pickerCloseText:  { fontSize: scaleFontSize(14), color: COLORS.muted },
  pickerSearchRow:  { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, margin: scaleSpacing(SPACING.md), borderRadius: scaleFontSize(10), borderWidth: 1, borderColor: COLORS.border, paddingHorizontal: scaleSpacing(SPACING.sm), paddingVertical: scaleSpacing(SPACING.xs), gap: scaleSpacing(SPACING.sm) },
  pickerSearchIcon: { fontSize: scaleFontSize(14) },
  pickerSearch:     { flex: 1, fontSize: scaleFontSize(14), color: COLORS.foreground, paddingVertical: scaleSpacing(4) },
  pickerClearIcon:  { fontSize: scaleFontSize(12), color: COLORS.muted, padding: scaleSpacing(4) },
  pickerEmpty:      { padding: scaleSpacing(SPACING.lg), alignItems: "center" },
  pickerEmptyText:  { fontSize: scaleFontSize(14), color: COLORS.muted },
  pickerGroupHeader:{ paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(6), backgroundColor: `${COLORS.surface}cc` },
  pickerGroupLabel: { fontSize: scaleFontSize(10), fontWeight: "700", color: COLORS.muted, textTransform: "uppercase", letterSpacing: 1 },
  pickerItem:       { flexDirection: "row", alignItems: "center", paddingHorizontal: scaleSpacing(SPACING.md), paddingVertical: scaleSpacing(12), borderBottomWidth: 1, borderBottomColor: `${COLORS.border}55`, gap: scaleSpacing(SPACING.sm) },
  pickerItemSelected:{ backgroundColor: `${COLORS.primary}15` },
  pickerFlag:       { fontSize: scaleFontSize(18), width: scaleFontSize(26) },
  pickerTextCol:    { flex: 1 },
  pickerLabel:      { fontSize: scaleFontSize(14), fontWeight: "500", color: COLORS.foreground },
  pickerLabelSelected:{ color: COLORS.primary, fontWeight: "600" },
  pickerRegion:     { fontSize: scaleFontSize(11), color: COLORS.muted },
  pickerCheck:      { fontSize: scaleFontSize(14), color: COLORS.primary, fontWeight: "700" },
});

// ── Calendar styles ───────────────────────────────────────────────────────────
const CELL_SIZE = scaleFontSize(38);

const calStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", alignItems: "center", padding: scaleSpacing(SPACING.md) },
  container:   { backgroundColor: COLORS.surface, borderRadius: scaleFontSize(16), borderWidth: 1, borderColor: COLORS.border, padding: scaleSpacing(SPACING.md), width: "100%" },
  header:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: scaleSpacing(SPACING.sm) },
  navBtn:      { width: scaleFontSize(36), height: scaleFontSize(36), borderRadius: scaleFontSize(8), backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  navArrow:    { fontSize: scaleFontSize(22), color: COLORS.foreground, lineHeight: scaleFontSize(26) },
  monthYear:   { fontSize: scaleFontSize(16), fontWeight: "700", color: COLORS.foreground },
  dayNamesRow: { flexDirection: "row", marginBottom: scaleSpacing(4) },
  dayName:     { width: CELL_SIZE, textAlign: "center", fontSize: scaleFontSize(11), fontWeight: "600", color: COLORS.muted },
  weekRow:     { flexDirection: "row", marginBottom: scaleSpacing(2) },
  dayCell:     { width: CELL_SIZE, height: CELL_SIZE, borderRadius: scaleFontSize(19), alignItems: "center", justifyContent: "center" },
  dayCellSelected: { backgroundColor: COLORS.primary },
  dayCellToday:    { borderWidth: 1, borderColor: COLORS.primary },
  dayText:         { fontSize: scaleFontSize(14), color: COLORS.foreground },
  dayTextEmpty:    { color: "transparent" },
  dayTextToday:    { color: COLORS.primary, fontWeight: "700" },
  dayTextSelected: { color: "#fff", fontWeight: "700" },
  footer:          { flexDirection: "row", justifyContent: "flex-end", gap: scaleSpacing(SPACING.sm), marginTop: scaleSpacing(SPACING.sm), paddingTop: scaleSpacing(SPACING.sm), borderTopWidth: 1, borderTopColor: COLORS.border },
  footerBtn:       { paddingVertical: scaleSpacing(8), paddingHorizontal: scaleSpacing(16), borderRadius: scaleFontSize(8), borderWidth: 1, borderColor: COLORS.border },
  footerCancelText:{ fontSize: scaleFontSize(14), color: COLORS.muted },
  footerTodayBtn:  { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  footerTodayText: { fontSize: scaleFontSize(14), color: "#fff", fontWeight: "600" },
});

// ── Time picker styles ────────────────────────────────────────────────────────
const tmStyles = StyleSheet.create({
  container: { backgroundColor: COLORS.surface, borderRadius: scaleFontSize(16), borderWidth: 1, borderColor: COLORS.border, padding: scaleSpacing(SPACING.lg), width: "80%", alignSelf: "center" },
  title:     { fontSize: scaleFontSize(16), fontWeight: "700", color: COLORS.foreground, textAlign: "center", marginBottom: scaleSpacing(SPACING.md) },
  timeRow:   { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: scaleSpacing(SPACING.sm), marginBottom: scaleSpacing(SPACING.lg) },
  spinCol:   { alignItems: "center", gap: scaleSpacing(4) },
  spinBtn:   { width: scaleFontSize(44), height: scaleFontSize(36), alignItems: "center", justifyContent: "center", backgroundColor: COLORS.background, borderRadius: scaleFontSize(8), borderWidth: 1, borderColor: COLORS.border },
  spinArrow: { fontSize: scaleFontSize(16), color: COLORS.primary },
  spinValBox:{ width: scaleFontSize(60), height: scaleFontSize(52), backgroundColor: COLORS.background, borderRadius: scaleFontSize(10), borderWidth: 1, borderColor: COLORS.border, alignItems: "center", justifyContent: "center" },
  spinVal:   { fontSize: scaleFontSize(28), fontWeight: "700", color: COLORS.foreground },
  colon:     { fontSize: scaleFontSize(28), fontWeight: "700", color: COLORS.foreground, marginBottom: scaleSpacing(4) },
  ampmCol:   { gap: scaleSpacing(6), marginLeft: scaleSpacing(SPACING.xs) },
  ampmBtn:   { paddingVertical: scaleSpacing(8), paddingHorizontal: scaleSpacing(12), borderRadius: scaleFontSize(8), borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background },
  ampmBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ampmText:      { fontSize: scaleFontSize(13), fontWeight: "600", color: COLORS.muted },
  ampmTextActive:{ color: "#fff" },
  btnRow:    { flexDirection: "row", gap: scaleSpacing(SPACING.sm) },
  cancelBtn: { flex: 1, paddingVertical: scaleSpacing(11), borderRadius: scaleFontSize(10), borderWidth: 1, borderColor: COLORS.border, alignItems: "center" },
  cancelText:{ fontSize: scaleFontSize(14), color: COLORS.muted },
  confirmBtn:{ flex: 1, paddingVertical: scaleSpacing(11), borderRadius: scaleFontSize(10), backgroundColor: COLORS.primary, alignItems: "center" },
  confirmText:{ fontSize: scaleFontSize(14), fontWeight: "700", color: "#fff" },
});
