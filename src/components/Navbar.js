import React, { useRef, useState } from "react";
import {
  Animated,
  Image,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "./AuthProvider";
import {
  COLORS,
  SCREENS,
  SPACING,
  scaleFontSize,
  scaleSpacing,
} from "../lib/constants";

/* ── Mirrors web NAV_DROPDOWNS exactly ── */
const NAV_SECTIONS = [
  {
    id: "achievements",
    label: "Achievements",
    items: [
      { label: "Your Badges", screen: SCREENS.BADGES },
      { label: "Leaderboard", url: "https://tenmilesahead.com/leaderboard" },
    ],
  },
  {
    id: "travel-tools",
    label: "Travel Tools",
    items: [
      { label: "Budget", screen: SCREENS.BUDGET },
      { label: "Currency Exchange", screen: SCREENS.CURRENCY_EXCHANGE },
      { label: "Packing List", screen: SCREENS.PACKING_LIST },
      { label: "Time Zones", screen: SCREENS.TIME_ZONES },
      { label: "Tipping Guide", screen: SCREENS.TIPPING_GUIDE },
    ],
  },
  {
    id: "support",
    label: "Support",
    items: [
      { label: "FAQ", screen: SCREENS.FAQS },
      { label: "Help / Support", screen: SCREENS.HELP_SUPPORT },
      { label: "Tutorials", screen: SCREENS.TUTORIALS },
    ],
  },
];

/* ── Mirrors web FOOTER_MENU (Book Your Trip bar) ── */
const BOOK_ITEMS = [
  { label: "Cruises",      icon: "🚢", url: "https://www.cruisedirect.com/?utm_source=cj&utm_medium=affiliate&utm_content=101693012" },
  { label: "Flights",      icon: "✈️", url: "https://tidd.ly/4uqgGmU" },
  { label: "eSIMs",        icon: "📱", url: null }, // opens EsimQuiz modal
  { label: "Rental Cars",  icon: "🚗", url: "https://www.rentalcars.com/?aw_affid=2773070&source=aw" },
];

/* ── eSIM providers (mirrors web affiliates.ts) ── */
const ESIM_PROVIDERS = {
  airalo:    { name: "Airalo",      bestFor: "Lowest price",                deepLink: "https://airalo.pxf.io/0GJkJP" },
  saily:     { name: "Saily",       bestFor: "Easiest setup",               deepLink: "https://www.awin1.com/awclick.php?gid=514710&mid=115198&awinaffid=2773070&linkid=4543016&clickref=" },
  strongEsim:{ name: "Strong eSIM", bestFor: "Hotspot use & fastest speeds", deepLink: "https://www.awin1.com/awclick.php?gid=514710&mid=115198&awinaffid=2773070&linkid=4543016&clickref=" },
};

/* ── EsimQuiz component (mirrors web EsimQuiz.tsx) ── */
function EsimQuiz({ onClose }) {
  const [step, setStep] = useState("q1");
  const [result, setResult] = useState(null);

  function finish(providerKey) {
    setResult(providerKey);
    setStep("result");
  }
  function reset() { setStep("q1"); setResult(null); }

  const provider = result ? ESIM_PROVIDERS[result] : null;

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={esimStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        <View style={esimStyles.card}>
          {/* Header */}
          <View style={esimStyles.header}>
            <Text style={esimStyles.title}>Find Your eSIM</Text>
            <TouchableOpacity onPress={onClose} style={esimStyles.closeBtn} hitSlop={{ top:8,bottom:8,left:8,right:8 }}>
              <Text style={esimStyles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Result */}
          {step === "result" && provider ? (
            <View style={esimStyles.body}>
              <View style={esimStyles.resultIcon}>
                <Text style={{ fontSize: scaleFontSize(28) }}>✓</Text>
              </View>
              <Text style={esimStyles.recommendLabel}>We recommend</Text>
              <Text style={esimStyles.providerName}>{provider.name}</Text>
              <Text style={esimStyles.providerBest}>Best for: {provider.bestFor}</Text>
              <TouchableOpacity
                style={esimStyles.visitBtn}
                onPress={() => Linking.openURL(provider.deepLink)}
                activeOpacity={0.8}
              >
                <Text style={esimStyles.visitBtnText}>Visit {provider.name}</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={reset} style={esimStyles.startOverBtn}>
                <Text style={esimStyles.startOverText}>Start over</Text>
              </TouchableOpacity>
            </View>
          ) : step === "q1" ? (
            <QuizStep
              questionNum={1} totalQuestions={3}
              question="Will you need to use your phone as a hotspot?"
              options={[
                { label: "Yes",      onSelect: () => finish("strongEsim") },
                { label: "No",       onSelect: () => setStep("q2") },
                { label: "Not sure", onSelect: () => setStep("q2") },
              ]}
            />
          ) : step === "q2" ? (
            <QuizStep
              questionNum={2} totalQuestions={3}
              question="How much data will you use?"
              options={[
                { label: "Light",    onSelect: () => setStep("q3") },
                { label: "Moderate", onSelect: () => setStep("q3") },
                { label: "Heavy",    onSelect: () => finish("strongEsim") },
              ]}
              onBack={reset}
            />
          ) : (
            <QuizStep
              questionNum={3} totalQuestions={3}
              question="What matters most to you?"
              options={[
                { label: "Lowest price",   onSelect: () => finish("airalo") },
                { label: "Easiest setup",  onSelect: () => finish("saily") },
                { label: "Fastest speeds", onSelect: () => finish("strongEsim") },
              ]}
              onBack={reset}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}

function QuizStep({ questionNum, totalQuestions, question, options, onBack }) {
  return (
    <View style={esimStyles.body}>
      <Text style={esimStyles.questionCounter}>Question {questionNum} of {totalQuestions}</Text>
      <Text style={esimStyles.questionText}>{question}</Text>
      <View style={esimStyles.optionsList}>
        {options.map((opt) => (
          <TouchableOpacity
            key={opt.label}
            style={esimStyles.optionBtn}
            onPress={opt.onSelect}
            activeOpacity={0.8}
          >
            <Text style={esimStyles.optionBtnText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {onBack && (
        <TouchableOpacity onPress={onBack} style={esimStyles.startOverBtn}>
          <Text style={esimStyles.startOverText}>Start over</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function Navbar() {
  const { user, signOutNow, profile } = useAuth();
  const navigation = useNavigation();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showBookBar, setShowBookBar] = useState(true);
  const [expandedSection, setExpandedSection] = useState(null);
  const [esimQuizVisible, setEsimQuizVisible] = useState(false);

  const slideAnim = useRef(new Animated.Value(340)).current;

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 260,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(slideAnim, {
      toValue: 340,
      duration: 210,
      useNativeDriver: true,
    }).start(() => setDrawerOpen(false));
  };

  const goTo = (screen) => {
    closeDrawer();
    setTimeout(() => {
      if (!user && isProtected(screen)) {
        navigation.navigate(SCREENS.SIGNIN);
      } else {
        navigation.navigate(screen);
      }
    }, 220);
  };

  const openUrl = (url) => {
    closeDrawer();
    Linking.openURL(url);
  };

  const toggleSection = (id) =>
    setExpandedSection((v) => (v === id ? null : id));

  /* Protected screens require login */
  const PROTECTED = [
    SCREENS.TRIPS, SCREENS.BOOKINGS, SCREENS.PROFILE, SCREENS.BADGES,
    SCREENS.BUDGET, SCREENS.CURRENCY_EXCHANGE, SCREENS.PACKING_LIST,
    SCREENS.TIME_ZONES, SCREENS.TIPPING_GUIDE,
  ];
  const isProtected = (screen) => PROTECTED.includes(screen);

  /* Avatar initials */
  const initials = (() => {
    const name = profile?.username || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0]?.toUpperCase() ?? "?";
  })();

  return (
    <View>
      {/* ── Main top bar ── */}
      <View style={styles.navbar}>
        {/* Logo + Brand */}
        <TouchableOpacity
          style={styles.logoRow}
          onPress={() =>
            user ? navigation.navigate(SCREENS.HOME) : navigation.navigate("LandingMain")
          }
          activeOpacity={0.8}
        >
          <View style={styles.logoWrapper}>
            <Image
              source={require("../../assets/logo.png")}
              style={styles.logoImg}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.brandName}>Ten Miles Ahead</Text>
        </TouchableOpacity>

        {/* Right side */}
        <View style={styles.navRight}>
          {user ? (
            <>
              <TouchableOpacity
                style={styles.subscribePill}
                onPress={() => goTo(SCREENS.SUBSCRIBE)}
                activeOpacity={0.8}
              >
                <Text style={styles.subscribePillText}>Subscribe</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.avatarBtn}
                onPress={() => goTo(SCREENS.PROFILE)}
                activeOpacity={0.8}
              >
                {profile?.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={() => navigation.navigate(SCREENS.SIGNIN)}
                activeOpacity={0.8}
              >
                <Text style={styles.signInText}>Sign in</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.getStartedBtn}
                onPress={() => navigation.navigate(SCREENS.SIGNUP)}
                activeOpacity={0.8}
              >
                <Text style={styles.getStartedText}>Get started</Text>
              </TouchableOpacity>
            </>
          )}

          {/* Hamburger */}
          <TouchableOpacity
            style={styles.hamburger}
            onPress={openDrawer}
            activeOpacity={0.7}
          >
            <View style={styles.hLine} />
            <View style={styles.hLine} />
            <View style={styles.hLine} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Book Your Trip bar ── */}
      {showBookBar && (
        <View style={styles.bookBarWrap}>
          <View style={styles.bookBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.bookBarInner}
            >
              <View style={styles.bookBarLabel}>
                <Text style={styles.bookBarFlash}>⚡</Text>
                <Text style={styles.bookBarLabelText}>BOOK YOUR TRIP</Text>
              </View>
              <View style={styles.bookBarSep} />
              {BOOK_ITEMS.map((item) => (
                <TouchableOpacity
                  key={item.label}
                  style={styles.bookBarBtn}
                  onPress={() => item.url ? Linking.openURL(item.url) : setEsimQuizVisible(true)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.bookBarIcon}>{item.icon}</Text>
                  <Text style={styles.bookBarBtnText}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.bookBarClose}
              onPress={() => setShowBookBar(false)}
            >
              <Text style={styles.bookBarCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.bookBarDisclaimer}>
            TMA may receive a small commission for any booking made using the links above.
          </Text>
        </View>
      )}

      {/* ── eSIM Quiz Modal ── */}
      {esimQuizVisible && (
        <EsimQuiz onClose={() => setEsimQuizVisible(false)} />
      )}

      {/* ── Right-slide Drawer ── */}
      <Modal
        visible={drawerOpen}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={styles.overlay}>
          <TouchableOpacity
            style={styles.backdrop}
            activeOpacity={1}
            onPress={closeDrawer}
          />

          <Animated.View
            style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
          >
            {/* Drawer header */}
            <View style={styles.drawerHeader}>
              <View style={styles.logoRow}>
                <View style={styles.logoWrapper}>
                  <Image
                    source={require("../../assets/logo.png")}
                    style={styles.logoImg}
                    resizeMode="contain"
                  />
                </View>
                <Text style={styles.drawerBrand}>Ten Miles Ahead</Text>
              </View>
              <TouchableOpacity style={styles.drawerCloseBtn} onPress={closeDrawer}>
                <Text style={styles.drawerCloseIcon}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Drawer nav */}
            <ScrollView style={styles.drawerNav} showsVerticalScrollIndicator={false}>

              {/* ── Direct links ── */}
              <TouchableOpacity style={styles.navItem} onPress={() => goTo(SCREENS.TRIPS)}>
                <Text style={styles.navItemText}>Trips</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navItem} onPress={() => goTo(SCREENS.GLOBAL_REVIEWS)}>
                <Text style={styles.navItemText}>Global Reviews</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.navItem} onPress={() => openUrl("https://tenmilesahead.com/blog")}>
                <Text style={styles.navItemText}>Blog</Text>
                <Text style={styles.externalIcon}>↗</Text>
              </TouchableOpacity>

              {user && (
                <TouchableOpacity style={styles.navItem} onPress={() => goTo(SCREENS.BOOKINGS)}>
                  <Text style={styles.navItemText}>Bookings</Text>
                </TouchableOpacity>
              )}

              {/* ── Accordion sections ── */}
              {NAV_SECTIONS.map((section) => {
                const isOpen = expandedSection === section.id;
                return (
                  <View key={section.id}>
                    <TouchableOpacity
                      style={styles.navItem}
                      onPress={() => toggleSection(section.id)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.navItemText}>{section.label}</Text>
                      <Text style={[styles.chevron, isOpen ? styles.chevronUp : styles.chevronDown]}>›</Text>
                    </TouchableOpacity>

                    {isOpen && (
                      <View style={styles.subItems}>
                        {section.items.map((item) => (
                          <TouchableOpacity
                            key={item.label}
                            style={styles.subItem}
                            onPress={() =>
                              item.screen ? goTo(item.screen) : openUrl(item.url)
                            }
                          >
                            <View style={styles.subDot} />
                            <Text style={styles.subItemText}>{item.label}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* ── Divider ── */}
              <View style={styles.divider} />

              {/* ── Auth section ── */}
              {user ? (
                <>
                  <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => goTo(SCREENS.SUBSCRIBE)}
                  >
                    <Text style={[styles.navItemText, styles.primaryText]}>
                      Subscribe
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.navItem, styles.profileRow]}
                    onPress={() => goTo(SCREENS.PROFILE)}
                  >
                    <View style={styles.miniAvatar}>
                      <Text style={styles.miniAvatarText}>{initials}</Text>
                    </View>
                    <Text style={styles.navItemText}>
                      @{profile?.username || "you"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => { closeDrawer(); setTimeout(() => signOutNow(), 250); }}
                  >
                    <Text style={styles.signOutText}>Sign out</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => { closeDrawer(); setTimeout(() => navigation.navigate(SCREENS.SIGNIN), 220); }}
                  >
                    <Text style={styles.navItemText}>Sign in</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.getStartedDrawer}
                    onPress={() => { closeDrawer(); setTimeout(() => navigation.navigate(SCREENS.SIGNUP), 220); }}
                  >
                    <Text style={styles.getStartedDrawerText}>Get started</Text>
                  </TouchableOpacity>
                </>
              )}
            </ScrollView>

            {/* Drawer footer */}
            <View style={styles.drawerFooter}>
              <Text style={styles.drawerFooterText}>
                © {new Date().getFullYear()} Ten Miles Ahead
              </Text>
            </View>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  /* ── Top bar ── */
  navbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
  },
  logoWrapper: {
    width: scaleFontSize(32),
    height: scaleFontSize(32),
    borderRadius: scaleFontSize(8),
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  logoImg: {
    width: scaleFontSize(28),
    height: scaleFontSize(28),
  },
  brandName: {
    fontSize: scaleFontSize(14),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  navRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
  },
  signInText: {
    fontSize: scaleFontSize(13),
    color: COLORS.primary,
    fontWeight: "500",
  },
  getStartedBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: scaleSpacing(12),
    paddingVertical: scaleSpacing(6),
    borderRadius: scaleFontSize(8),
  },
  getStartedText: {
    color: "#ffffff",
    fontSize: scaleFontSize(12),
    fontWeight: "600",
  },
  subscribePill: {
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingHorizontal: scaleSpacing(10),
    paddingVertical: scaleSpacing(5),
    borderRadius: scaleFontSize(20),
  },
  subscribePillText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(12),
    fontWeight: "600",
  },
  avatarBtn: {
    width: scaleFontSize(32),
    height: scaleFontSize(32),
    borderRadius: scaleFontSize(16),
    backgroundColor: `${COLORS.primary}33`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(12),
    fontWeight: "700",
  },
  hamburger: {
    padding: scaleSpacing(SPACING.sm),
    borderRadius: scaleFontSize(8),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  hLine: {
    width: scaleFontSize(18),
    height: scaleFontSize(2),
    backgroundColor: COLORS.muted,
    borderRadius: scaleFontSize(1),
    marginVertical: scaleFontSize(1.5),
  },

  /* ── Book Your Trip bar ── */
  bookBarWrap: {
    backgroundColor: "#1d2d3a",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bookBar: {
    flexDirection: "row",
    alignItems: "center",
  },
  bookBarDisclaimer: {
    fontSize: scaleFontSize(10),
    color: COLORS.muted,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingBottom: scaleSpacing(6),
  },
  bookBarInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(8),
    gap: scaleSpacing(SPACING.sm),
  },
  bookBarLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(4),
    paddingRight: scaleSpacing(SPACING.xs),
  },
  bookBarFlash: { fontSize: scaleFontSize(12) },
  bookBarLabelText: {
    fontSize: scaleFontSize(10),
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.7,
  },
  bookBarSep: {
    width: 1,
    height: scaleFontSize(18),
    backgroundColor: COLORS.border,
    marginRight: scaleSpacing(SPACING.xs),
  },
  bookBarBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(5),
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: `${COLORS.primary}50`,
    paddingHorizontal: scaleSpacing(10),
    paddingVertical: scaleSpacing(5),
    borderRadius: scaleFontSize(20),
  },
  bookBarIcon: { fontSize: scaleFontSize(12) },
  bookBarBtnText: {
    fontSize: scaleFontSize(12),
    fontWeight: "600",
    color: COLORS.foreground,
  },
  bookBarClose: {
    paddingHorizontal: scaleSpacing(SPACING.sm),
    paddingVertical: scaleSpacing(SPACING.sm),
  },
  bookBarCloseText: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
  },

  /* ── Drawer ── */
  overlay: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  drawer: {
    width: "82%",
    maxWidth: 320,
    height: "100%",
    backgroundColor: COLORS.background,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border,
    shadowColor: "#000",
    shadowOffset: { width: -4, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 24,
    flexDirection: "column",
  },
  drawerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  drawerBrand: {
    fontSize: scaleFontSize(14),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  drawerCloseBtn: {
    padding: scaleSpacing(SPACING.sm),
    borderRadius: scaleFontSize(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  drawerCloseIcon: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },

  /* Nav items */
  drawerNav: {
    flex: 1,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingTop: scaleSpacing(SPACING.sm),
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: scaleSpacing(11),
    paddingHorizontal: scaleSpacing(SPACING.sm),
    borderRadius: scaleFontSize(8),
  },
  navItemText: {
    fontSize: scaleFontSize(14),
    color: COLORS.foreground,
    fontWeight: "500",
  },
  externalIcon: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },
  chevron: {
    fontSize: scaleFontSize(20),
    color: COLORS.muted,
    lineHeight: scaleFontSize(22),
  },
  chevronDown: {
    color: COLORS.muted,
    transform: [{ rotate: "90deg" }],
  },
  chevronUp: {
    color: COLORS.primary,
    transform: [{ rotate: "-90deg" }],
  },

  /* Sub-items */
  subItems: {
    marginLeft: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.xs),
    borderLeftWidth: 2,
    borderLeftColor: `${COLORS.primary}44`,
    paddingLeft: scaleSpacing(SPACING.md),
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scaleSpacing(9),
    gap: scaleSpacing(SPACING.sm),
  },
  subDot: {
    width: scaleFontSize(6),
    height: scaleFontSize(6),
    borderRadius: scaleFontSize(3),
    backgroundColor: `${COLORS.primary}99`,
  },
  subItemText: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: scaleSpacing(SPACING.sm),
  },

  primaryText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  profileRow: {
    gap: scaleSpacing(SPACING.sm),
    justifyContent: "flex-start",
  },
  miniAvatar: {
    width: scaleFontSize(34),
    height: scaleFontSize(34),
    borderRadius: scaleFontSize(17),
    backgroundColor: `${COLORS.primary}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  miniAvatarText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(12),
    fontWeight: "700",
  },
  signOutText: {
    fontSize: scaleFontSize(14),
    color: "#ef4444",
    fontWeight: "500",
  },
  getStartedDrawer: {
    backgroundColor: COLORS.primary,
    marginHorizontal: scaleSpacing(SPACING.sm),
    marginTop: scaleSpacing(4),
    paddingVertical: scaleSpacing(SPACING.sm),
    borderRadius: scaleFontSize(8),
    alignItems: "center",
  },
  getStartedDrawerText: {
    color: "#ffffff",
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },

  /* Footer */
  drawerFooter: {
    padding: scaleSpacing(SPACING.md),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  drawerFooterText: {
    fontSize: scaleFontSize(11),
    color: COLORS.muted,
    textAlign: "center",
  },
});

/* ── eSIM Quiz styles ── */
const esimStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: scaleSpacing(SPACING.md),
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: COLORS.background,
    borderRadius: scaleFontSize(20),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  title: {
    fontSize: scaleFontSize(16),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  closeBtn: {
    padding: scaleSpacing(4),
  },
  closeIcon: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },
  body: {
    alignItems: "center",
    paddingHorizontal: scaleSpacing(SPACING.lg),
    paddingVertical: scaleSpacing(SPACING.xl),
    gap: scaleSpacing(SPACING.md),
  },
  /* Quiz step */
  questionCounter: {
    fontSize: scaleFontSize(11),
    fontWeight: "700",
    color: COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  questionText: {
    fontSize: scaleFontSize(17),
    fontWeight: "600",
    color: COLORS.foreground,
    textAlign: "center",
    lineHeight: scaleFontSize(24),
  },
  optionsList: {
    width: "100%",
    gap: scaleSpacing(SPACING.sm),
    marginTop: scaleSpacing(SPACING.xs),
  },
  optionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: scaleFontSize(12),
    paddingVertical: scaleSpacing(13),
    alignItems: "center",
  },
  optionBtnText: {
    fontSize: scaleFontSize(15),
    fontWeight: "600",
    color: "#fff",
  },
  startOverBtn: {
    paddingVertical: scaleSpacing(SPACING.xs),
  },
  startOverText: {
    fontSize: scaleFontSize(13),
    color: COLORS.primary,
  },
  /* Result */
  resultIcon: {
    width: scaleFontSize(64),
    height: scaleFontSize(64),
    borderRadius: scaleFontSize(32),
    backgroundColor: `${COLORS.primary}22`,
    alignItems: "center",
    justifyContent: "center",
  },
  recommendLabel: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
  },
  providerName: {
    fontSize: scaleFontSize(24),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  providerBest: {
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
  },
  visitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: scaleFontSize(12),
    paddingVertical: scaleSpacing(13),
    paddingHorizontal: scaleSpacing(SPACING.xl),
    marginTop: scaleSpacing(SPACING.xs),
  },
  visitBtnText: {
    fontSize: scaleFontSize(16),
    fontWeight: "700",
    color: "#fff",
  },
});
