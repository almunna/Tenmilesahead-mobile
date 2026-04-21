import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";

// ── Currency metadata ────────────────────────────────────────────────────────
const CURRENCY_INFO = {
  // Major
  USD: { symbol: "$",      flag: "🇺🇸", name: "US Dollar" },
  EUR: { symbol: "€",      flag: "🇪🇺", name: "Euro" },
  GBP: { symbol: "£",      flag: "🇬🇧", name: "British Pound" },
  JPY: { symbol: "¥",      flag: "🇯🇵", name: "Japanese Yen" },
  CAD: { symbol: "$",      flag: "🇨🇦", name: "Canadian Dollar" },
  AUD: { symbol: "$",      flag: "🇦🇺", name: "Australian Dollar" },
  CHF: { symbol: "Fr",     flag: "🇨🇭", name: "Swiss Franc" },
  CNY: { symbol: "¥",      flag: "🇨🇳", name: "Chinese Yuan" },
  // Asia
  INR: { symbol: "₹",      flag: "🇮🇳", name: "Indian Rupee" },
  KRW: { symbol: "₩",      flag: "🇰🇷", name: "South Korean Won" },
  SGD: { symbol: "$",      flag: "🇸🇬", name: "Singapore Dollar" },
  HKD: { symbol: "$",      flag: "🇭🇰", name: "Hong Kong Dollar" },
  TWD: { symbol: "NT$",    flag: "🇹🇼", name: "Taiwan Dollar" },
  THB: { symbol: "฿",      flag: "🇹🇭", name: "Thai Baht" },
  MYR: { symbol: "RM",     flag: "🇲🇾", name: "Malaysian Ringgit" },
  IDR: { symbol: "Rp",     flag: "🇮🇩", name: "Indonesian Rupiah" },
  PHP: { symbol: "₱",      flag: "🇵🇭", name: "Philippine Peso" },
  VND: { symbol: "₫",      flag: "🇻🇳", name: "Vietnamese Dong" },
  PKR: { symbol: "₨",      flag: "🇵🇰", name: "Pakistani Rupee" },
  BDT: { symbol: "৳",      flag: "🇧🇩", name: "Bangladeshi Taka" },
  LKR: { symbol: "₨",      flag: "🇱🇰", name: "Sri Lankan Rupee" },
  NPR: { symbol: "₨",      flag: "🇳🇵", name: "Nepalese Rupee" },
  MMK: { symbol: "K",      flag: "🇲🇲", name: "Myanmar Kyat" },
  KHR: { symbol: "៛",      flag: "🇰🇭", name: "Cambodian Riel" },
  LAK: { symbol: "₭",      flag: "🇱🇦", name: "Lao Kip" },
  MNT: { symbol: "₮",      flag: "🇲🇳", name: "Mongolian Tugrik" },
  KZT: { symbol: "₸",      flag: "🇰🇿", name: "Kazakhstani Tenge" },
  UZS: { symbol: "so'm",   flag: "🇺🇿", name: "Uzbekistani Som" },
  AFN: { symbol: "؋",      flag: "🇦🇫", name: "Afghan Afghani" },
  // Middle East
  AED: { symbol: "د.إ",    flag: "🇦🇪", name: "UAE Dirham" },
  SAR: { symbol: "ر.س",    flag: "🇸🇦", name: "Saudi Riyal" },
  QAR: { symbol: "ر.ق",    flag: "🇶🇦", name: "Qatari Riyal" },
  KWD: { symbol: "د.ك",    flag: "🇰🇼", name: "Kuwaiti Dinar" },
  BHD: { symbol: ".د.ب",   flag: "🇧🇭", name: "Bahraini Dinar" },
  OMR: { symbol: "ر.ع.",   flag: "🇴🇲", name: "Omani Rial" },
  JOD: { symbol: "د.ا",    flag: "🇯🇴", name: "Jordanian Dinar" },
  ILS: { symbol: "₪",      flag: "🇮🇱", name: "Israeli Shekel" },
  IQD: { symbol: "ع.د",    flag: "🇮🇶", name: "Iraqi Dinar" },
  IRR: { symbol: "﷼",      flag: "🇮🇷", name: "Iranian Rial" },
  LBP: { symbol: "ل.ل",    flag: "🇱🇧", name: "Lebanese Pound" },
  YER: { symbol: "﷼",      flag: "🇾🇪", name: "Yemeni Rial" },
  // Europe
  NOK: { symbol: "kr",     flag: "🇳🇴", name: "Norwegian Krone" },
  SEK: { symbol: "kr",     flag: "🇸🇪", name: "Swedish Krona" },
  DKK: { symbol: "kr",     flag: "🇩🇰", name: "Danish Krone" },
  PLN: { symbol: "zł",     flag: "🇵🇱", name: "Polish Zloty" },
  CZK: { symbol: "Kč",     flag: "🇨🇿", name: "Czech Koruna" },
  HUF: { symbol: "Ft",     flag: "🇭🇺", name: "Hungarian Forint" },
  RON: { symbol: "lei",    flag: "🇷🇴", name: "Romanian Leu" },
  BGN: { symbol: "лв",     flag: "🇧🇬", name: "Bulgarian Lev" },
  HRK: { symbol: "kn",     flag: "🇭🇷", name: "Croatian Kuna" },
  RSD: { symbol: "дин.",   flag: "🇷🇸", name: "Serbian Dinar" },
  UAH: { symbol: "₴",      flag: "🇺🇦", name: "Ukrainian Hryvnia" },
  ISK: { symbol: "kr",     flag: "🇮🇸", name: "Icelandic Krona" },
  ALL: { symbol: "L",      flag: "🇦🇱", name: "Albanian Lek" },
  MKD: { symbol: "ден",    flag: "🇲🇰", name: "Macedonian Denar" },
  BAM: { symbol: "KM",     flag: "🇧🇦", name: "Bosnia-Herzegovina Mark" },
  MDL: { symbol: "L",      flag: "🇲🇩", name: "Moldovan Leu" },
  GEL: { symbol: "₾",      flag: "🇬🇪", name: "Georgian Lari" },
  AMD: { symbol: "֏",      flag: "🇦🇲", name: "Armenian Dram" },
  AZN: { symbol: "₼",      flag: "🇦🇿", name: "Azerbaijani Manat" },
  BYN: { symbol: "Br",     flag: "🇧🇾", name: "Belarusian Ruble" },
  // Americas
  MXN: { symbol: "$",      flag: "🇲🇽", name: "Mexican Peso" },
  BRL: { symbol: "R$",     flag: "🇧🇷", name: "Brazilian Real" },
  CLP: { symbol: "$",      flag: "🇨🇱", name: "Chilean Peso" },
  COP: { symbol: "$",      flag: "🇨🇴", name: "Colombian Peso" },
  ARS: { symbol: "$",      flag: "🇦🇷", name: "Argentine Peso" },
  PEN: { symbol: "S/.",    flag: "🇵🇪", name: "Peruvian Sol" },
  BOB: { symbol: "Bs.",    flag: "🇧🇴", name: "Bolivian Boliviano" },
  PYG: { symbol: "₲",      flag: "🇵🇾", name: "Paraguayan Guarani" },
  UYU: { symbol: "$U",     flag: "🇺🇾", name: "Uruguayan Peso" },
  VES: { symbol: "Bs.S",   flag: "🇻🇪", name: "Venezuelan Bolivar" },
  GTQ: { symbol: "Q",      flag: "🇬🇹", name: "Guatemalan Quetzal" },
  HNL: { symbol: "L",      flag: "🇭🇳", name: "Honduran Lempira" },
  NIO: { symbol: "C$",     flag: "🇳🇮", name: "Nicaraguan Cordoba" },
  CRC: { symbol: "₡",      flag: "🇨🇷", name: "Costa Rican Colon" },
  PAB: { symbol: "B/.",    flag: "🇵🇦", name: "Panamanian Balboa" },
  DOP: { symbol: "RD$",    flag: "🇩🇴", name: "Dominican Peso" },
  CUP: { symbol: "$",      flag: "🇨🇺", name: "Cuban Peso" },
  JMD: { symbol: "J$",     flag: "🇯🇲", name: "Jamaican Dollar" },
  TTD: { symbol: "TT$",    flag: "🇹🇹", name: "Trinidad & Tobago Dollar" },
  BBD: { symbol: "Bds$",   flag: "🇧🇧", name: "Barbadian Dollar" },
  GYD: { symbol: "$",      flag: "🇬🇾", name: "Guyanese Dollar" },
  SRD: { symbol: "$",      flag: "🇸🇷", name: "Surinamese Dollar" },
  BZD: { symbol: "BZ$",    flag: "🇧🇿", name: "Belize Dollar" },
  // Africa
  ZAR: { symbol: "R",      flag: "🇿🇦", name: "South African Rand" },
  NGN: { symbol: "₦",      flag: "🇳🇬", name: "Nigerian Naira" },
  EGP: { symbol: "£",      flag: "🇪🇬", name: "Egyptian Pound" },
  KES: { symbol: "KSh",    flag: "🇰🇪", name: "Kenyan Shilling" },
  MAD: { symbol: "د.م.",   flag: "🇲🇦", name: "Moroccan Dirham" },
  GHS: { symbol: "₵",      flag: "🇬🇭", name: "Ghanaian Cedi" },
  ETB: { symbol: "Br",     flag: "🇪🇹", name: "Ethiopian Birr" },
  TZS: { symbol: "TSh",    flag: "🇹🇿", name: "Tanzanian Shilling" },
  UGX: { symbol: "USh",    flag: "🇺🇬", name: "Ugandan Shilling" },
  XOF: { symbol: "CFA",    flag: "🌍", name: "West African CFA Franc" },
  XAF: { symbol: "FCFA",   flag: "🌍", name: "Central African CFA Franc" },
  DZD: { symbol: "دج",     flag: "🇩🇿", name: "Algerian Dinar" },
  TND: { symbol: "د.ت",    flag: "🇹🇳", name: "Tunisian Dinar" },
  LYD: { symbol: "ل.د",    flag: "🇱🇾", name: "Libyan Dinar" },
  SDG: { symbol: "ج.س.",   flag: "🇸🇩", name: "Sudanese Pound" },
  AOA: { symbol: "Kz",     flag: "🇦🇴", name: "Angolan Kwanza" },
  ZMW: { symbol: "ZK",     flag: "🇿🇲", name: "Zambian Kwacha" },
  MWK: { symbol: "MK",     flag: "🇲🇼", name: "Malawian Kwacha" },
  MZN: { symbol: "MT",     flag: "🇲🇿", name: "Mozambican Metical" },
  BWP: { symbol: "P",      flag: "🇧🇼", name: "Botswana Pula" },
  NAD: { symbol: "$",      flag: "🇳🇦", name: "Namibian Dollar" },
  MUR: { symbol: "₨",      flag: "🇲🇺", name: "Mauritian Rupee" },
  SCR: { symbol: "₨",      flag: "🇸🇨", name: "Seychellois Rupee" },
  RWF: { symbol: "Fr",     flag: "🇷🇼", name: "Rwandan Franc" },
  BIF: { symbol: "Fr",     flag: "🇧🇮", name: "Burundian Franc" },
  DJF: { symbol: "Fr",     flag: "🇩🇯", name: "Djiboutian Franc" },
  ERN: { symbol: "Nfk",    flag: "🇪🇷", name: "Eritrean Nakfa" },
  SOS: { symbol: "Sh",     flag: "🇸🇴", name: "Somali Shilling" },
  GMD: { symbol: "D",      flag: "🇬🇲", name: "Gambian Dalasi" },
  SLL: { symbol: "Le",     flag: "🇸🇱", name: "Sierra Leonean Leone" },
  LRD: { symbol: "$",      flag: "🇱🇷", name: "Liberian Dollar" },
  GNF: { symbol: "Fr",     flag: "🇬🇳", name: "Guinean Franc" },
  CVE: { symbol: "$",      flag: "🇨🇻", name: "Cape Verdean Escudo" },
  STN: { symbol: "Db",     flag: "🇸🇹", name: "Sao Tome Dobra" },
  MGA: { symbol: "Ar",     flag: "🇲🇬", name: "Malagasy Ariary" },
  KMF: { symbol: "Fr",     flag: "🇰🇲", name: "Comorian Franc" },
  // Oceania
  NZD: { symbol: "$",      flag: "🇳🇿", name: "New Zealand Dollar" },
  FJD: { symbol: "$",      flag: "🇫🇯", name: "Fijian Dollar" },
  PGK: { symbol: "K",      flag: "🇵🇬", name: "Papua New Guinean Kina" },
  SBD: { symbol: "$",      flag: "🇸🇧", name: "Solomon Islands Dollar" },
  VUV: { symbol: "Vt",     flag: "🇻🇺", name: "Vanuatu Vatu" },
  WST: { symbol: "T",      flag: "🇼🇸", name: "Samoan Tala" },
  TOP: { symbol: "T$",     flag: "🇹🇴", name: "Tongan Paanga" },
  // Russia & Central Asia
  RUB: { symbol: "₽",      flag: "🇷🇺", name: "Russian Ruble" },
  TRY: { symbol: "₺",      flag: "🇹🇷", name: "Turkish Lira" },
  TJS: { symbol: "SM",     flag: "🇹🇯", name: "Tajikistani Somoni" },
  TMT: { symbol: "T",      flag: "🇹🇲", name: "Turkmenistani Manat" },
  KGS: { symbol: "с",      flag: "🇰🇬", name: "Kyrgyzstani Som" },
};

const POPULAR = [
  "USD","EUR","GBP","JPY","CAD","AUD","CHF","CNY",
  "INR","MXN","BRL","KRW","SGD","HKD","NZD","ZAR",
  "AED","THB","TRY","PHP","MYR","SAR","QAR","EGP",
  "NOK","SEK","DKK","PLN","CZK","HUF","TWD","VND",
  "NGN","KES","GHS","PKR","BDT","ILS","CLP","COP",
];

const API_KEY = "cbd6847f09b317143d69397c";
const ALL_CODES = Object.keys(CURRENCY_INFO).sort();

function fmt(value) {
  if (value >= 100) return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (value >= 1)   return value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

// ── Currency Picker Modal ────────────────────────────────────────────────────
function CurrencyPicker({ visible, value, codes, onSelect, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (visible) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible]);

  const q = query.trim().toLowerCase();
  const filtered = codes.filter((code) => {
    if (!q) return true;
    const c = CURRENCY_INFO[code];
    return code.toLowerCase().includes(q) || (c?.name.toLowerCase().includes(q) ?? false);
  });

  const renderItem = ({ item: code }) => {
    const c = CURRENCY_INFO[code];
    const selected = code === value;
    return (
      <TouchableOpacity
        style={[styles.pickerItem, selected && styles.pickerItemSelected]}
        onPress={() => { onSelect(code); onClose(); }}
        activeOpacity={0.7}
      >
        <Text style={styles.pickerFlag}>{c?.flag ?? "🌐"}</Text>
        <Text style={[styles.pickerCode, selected && styles.pickerCodeSelected]}>{code}</Text>
        <Text style={styles.pickerName} numberOfLines={1}>{c?.name ?? ""}</Text>
        {selected && <Text style={styles.pickerCheck}>✓</Text>}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.pickerModal}>
        <View style={styles.pickerHeader}>
          <Text style={styles.pickerTitle}>Select Currency</Text>
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
            placeholder="Search currency…"
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
            keyExtractor={(item) => item}
            renderItem={renderItem}
            keyboardShouldPersistTaps="handled"
            initialNumToRender={20}
          />
        )}
      </View>
    </Modal>
  );
}

// ── Currency Selector Button ─────────────────────────────────────────────────
function CurrencyButton({ value, onPress }) {
  const info = CURRENCY_INFO[value];
  return (
    <TouchableOpacity style={styles.currencyBtn} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.currencyBtnFlag}>{info?.flag ?? "🌐"}</Text>
      <View style={styles.currencyBtnText}>
        <Text style={styles.currencyBtnCode}>{value}</Text>
        <Text style={styles.currencyBtnName} numberOfLines={1}>{info?.name ?? ""}</Text>
      </View>
      <Text style={styles.currencyBtnChevron}>▾</Text>
    </TouchableOpacity>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function CurrencyExchangeScreen() {
  const [amount, setAmount]   = useState("100");
  const [from, setFrom]       = useState("USD");
  const [to, setTo]           = useState("EUR");
  const [rates, setRates]     = useState({});
  const [allCodes, setAllCodes] = useState(ALL_CODES);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [updated, setUpdated] = useState("");
  const [pickerFor, setPickerFor] = useState(null); // "from" | "to" | null

  const fetchRates = useCallback(async (base) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `https://v6.exchangerate-api.com/v6/${API_KEY}/latest/${base.toUpperCase()}`
      );
      const data = await res.json();
      if (!res.ok || data.result !== "success") {
        throw new Error(data["error-type"] || data.error || "API error");
      }
      setRates(data.conversion_rates);
      setUpdated(
        data.time_last_update_utc?.replace(" +0000", " UTC") ?? ""
      );
      const sorted = Object.keys(data.conversion_rates)
        .filter((c) => c in CURRENCY_INFO)
        .sort();
      setAllCodes(["USD", ...sorted.filter((c) => c !== "USD")]);
    } catch (err) {
      setError(`Could not load rates: ${String(err)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRates(from); }, [from]);

  const toRate    = rates[to] ?? 0;
  const numAmount = parseFloat(amount) || 0;
  const converted = numAmount * toRate;

  const popularRates = POPULAR.filter((c) => c !== from && rates[c]);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* ── Header ── */}
      <View style={styles.headerBlock}>
        <Text style={styles.heading}>Currency Converter</Text>
        <Text style={styles.subheading}>Real-time exchange rates for 160+ currencies</Text>
      </View>

      {/* ── Main converter card ── */}
      <View style={styles.card}>
        {/* Amount */}
        <View style={styles.fieldBlock}>
          <Text style={styles.label}>Amount</Text>
          <TextInput
            style={styles.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="100"
            placeholderTextColor={COLORS.muted}
          />
        </View>

        {/* From / Swap / To */}
        <View style={styles.pickersRow}>
          <View style={styles.pickerCol}>
            <Text style={styles.label}>From</Text>
            <CurrencyButton value={from} onPress={() => setPickerFor("from")} />
          </View>

          <TouchableOpacity style={styles.swapBtn} onPress={swap} activeOpacity={0.75}>
            <Text style={styles.swapIcon}>⇄</Text>
          </TouchableOpacity>

          <View style={styles.pickerCol}>
            <Text style={styles.label}>To</Text>
            <CurrencyButton value={to} onPress={() => setPickerFor("to")} />
          </View>
        </View>

        {/* Result */}
        <View style={[styles.resultCard, loading && styles.resultCardLoading]}>
          {error ? (
            <Text style={styles.errorText}>{error}</Text>
          ) : loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color={COLORS.primary} size="small" />
              <Text style={styles.loadingText}>Loading rates…</Text>
            </View>
          ) : (
            <>
              <View style={styles.resultMain}>
                <Text style={styles.resultValue}>
                  {CURRENCY_INFO[to]?.symbol}{fmt(converted)}
                </Text>
                <Text style={styles.resultCode}>{to}</Text>
              </View>
              <Text style={styles.resultSub}>
                {numAmount.toLocaleString()} {from} = {fmt(converted)} {to}
              </Text>
              <View style={styles.resultRates}>
                <Text style={styles.resultRate}>1 {from} = {fmt(toRate)} {to}</Text>
                <Text style={styles.resultRate}>
                  1 {to} = {toRate > 0 ? fmt(1 / toRate) : "—"} {from}
                </Text>
              </View>
            </>
          )}
        </View>

        {updated ? (
          <Text style={styles.updatedText}>Rates updated: {updated}</Text>
        ) : null}
      </View>

      {/* ── Popular rates grid ── */}
      {popularRates.length > 0 && !loading && (
        <View style={styles.popularSection}>
          <Text style={styles.popularHeading}>
            1 {from} {CURRENCY_INFO[from] ? `(${CURRENCY_INFO[from].name})` : ""} equals
          </Text>
          <View style={styles.grid}>
            {popularRates.map((code) => {
              const rate = rates[code];
              const info = CURRENCY_INFO[code];
              const isSelected = code === to;
              return (
                <TouchableOpacity
                  key={code}
                  style={[styles.gridCard, isSelected && styles.gridCardSelected]}
                  onPress={() => setTo(code)}
                  activeOpacity={0.75}
                >
                  <View style={styles.gridCardTop}>
                    <Text style={styles.gridFlag}>{info?.flag ?? "🌐"}</Text>
                    <Text style={[styles.gridCode, isSelected && styles.gridCodeSelected]}>
                      {code}
                    </Text>
                  </View>
                  <Text style={[styles.gridRate, isSelected && styles.gridRateSelected]}>
                    {info?.symbol}{fmt(rate)}
                  </Text>
                  <Text style={styles.gridName} numberOfLines={1}>{info?.name ?? code}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      )}

      {/* ── Currency Pickers ── */}
      <CurrencyPicker
        visible={pickerFor === "from"}
        value={from}
        codes={allCodes}
        onSelect={setFrom}
        onClose={() => setPickerFor(null)}
      />
      <CurrencyPicker
        visible={pickerFor === "to"}
        value={to}
        codes={allCodes}
        onSelect={setTo}
        onClose={() => setPickerFor(null)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: scaleSpacing(SPACING.md),
    paddingBottom: scaleSpacing(SPACING.xxl),
  },

  /* Header */
  headerBlock: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  heading: {
    fontSize: scaleFontSize(24),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  subheading: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
    marginTop: scaleSpacing(4),
  },

  /* Card */
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(16),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scaleSpacing(SPACING.md),
    gap: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.lg),
  },

  /* Amount field */
  fieldBlock: {
    gap: scaleSpacing(6),
  },
  label: {
    fontSize: scaleFontSize(12),
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountInput: {
    backgroundColor: COLORS.background,
    borderRadius: scaleFontSize(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.sm),
    fontSize: scaleFontSize(20),
    fontWeight: "600",
    color: COLORS.foreground,
  },

  /* Pickers row */
  pickersRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: scaleSpacing(SPACING.sm),
  },
  pickerCol: {
    flex: 1,
    gap: scaleSpacing(6),
  },

  /* Currency button */
  currencyBtn: {
    backgroundColor: COLORS.background,
    borderRadius: scaleFontSize(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.sm),
    paddingVertical: scaleSpacing(10),
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.xs),
  },
  currencyBtnFlag: {
    fontSize: scaleFontSize(18),
  },
  currencyBtnText: {
    flex: 1,
  },
  currencyBtnCode: {
    fontSize: scaleFontSize(13),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  currencyBtnName: {
    fontSize: scaleFontSize(10),
    color: COLORS.muted,
  },
  currencyBtnChevron: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
  },

  /* Swap button */
  swapBtn: {
    width: scaleFontSize(40),
    height: scaleFontSize(40),
    borderRadius: scaleFontSize(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: scaleSpacing(2),
  },
  swapIcon: {
    fontSize: scaleFontSize(18),
    color: COLORS.primary,
  },

  /* Result card */
  resultCard: {
    backgroundColor: `${COLORS.primary}18`,
    borderRadius: scaleFontSize(12),
    borderWidth: 1,
    borderColor: `${COLORS.primary}30`,
    padding: scaleSpacing(SPACING.md),
  },
  resultCardLoading: {
    opacity: 0.6,
    backgroundColor: COLORS.background,
    borderColor: COLORS.border,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
    paddingVertical: scaleSpacing(SPACING.sm),
  },
  loadingText: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },
  errorText: {
    fontSize: scaleFontSize(13),
    color: COLORS.error,
  },
  resultMain: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: scaleSpacing(SPACING.sm),
  },
  resultValue: {
    fontSize: scaleFontSize(28),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  resultCode: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    fontWeight: "400",
  },
  resultSub: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
    marginTop: scaleSpacing(4),
  },
  resultRates: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.md),
    marginTop: scaleSpacing(SPACING.sm),
    paddingTop: scaleSpacing(SPACING.sm),
    borderTopWidth: 1,
    borderTopColor: `${COLORS.primary}20`,
  },
  resultRate: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
  },

  /* Updated text */
  updatedText: {
    fontSize: scaleFontSize(11),
    color: COLORS.muted,
    textAlign: "right",
  },

  /* Popular rates section */
  popularSection: {
    gap: scaleSpacing(SPACING.sm),
  },
  popularHeading: {
    fontSize: scaleFontSize(11),
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scaleSpacing(SPACING.sm),
  },
  gridCard: {
    width: "47%",
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(12),
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: scaleSpacing(SPACING.sm),
  },
  gridCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}18`,
  },
  gridCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.xs),
    marginBottom: scaleSpacing(4),
  },
  gridFlag: {
    fontSize: scaleFontSize(14),
  },
  gridCode: {
    fontSize: scaleFontSize(11),
    fontWeight: "600",
    color: COLORS.muted,
  },
  gridCodeSelected: {
    color: COLORS.primary,
  },
  gridRate: {
    fontSize: scaleFontSize(15),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  gridRateSelected: {
    color: COLORS.primary,
  },
  gridName: {
    fontSize: scaleFontSize(10),
    color: COLORS.muted,
    marginTop: scaleSpacing(2),
  },

  /* Picker Modal */
  pickerModal: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  pickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  pickerTitle: {
    fontSize: scaleFontSize(17),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  pickerClose: {
    width: scaleFontSize(32),
    height: scaleFontSize(32),
    borderRadius: scaleFontSize(16),
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
  },
  pickerCloseText: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },
  pickerSearchRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    margin: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(10),
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.sm),
    paddingVertical: scaleSpacing(SPACING.xs),
    gap: scaleSpacing(SPACING.sm),
  },
  pickerSearchIcon: {
    fontSize: scaleFontSize(14),
  },
  pickerSearch: {
    flex: 1,
    fontSize: scaleFontSize(14),
    color: COLORS.foreground,
    paddingVertical: scaleSpacing(4),
  },
  pickerClearIcon: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
    padding: scaleSpacing(4),
  },
  pickerEmpty: {
    padding: scaleSpacing(SPACING.lg),
    alignItems: "center",
  },
  pickerEmptyText: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(12),
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}66`,
    gap: scaleSpacing(SPACING.sm),
  },
  pickerItemSelected: {
    backgroundColor: `${COLORS.primary}15`,
  },
  pickerFlag: {
    fontSize: scaleFontSize(18),
    width: scaleFontSize(26),
  },
  pickerCode: {
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: COLORS.foreground,
    width: scaleFontSize(44),
  },
  pickerCodeSelected: {
    color: COLORS.primary,
  },
  pickerName: {
    flex: 1,
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
  },
  pickerCheck: {
    fontSize: scaleFontSize(14),
    color: COLORS.primary,
    fontWeight: "700",
  },
});
