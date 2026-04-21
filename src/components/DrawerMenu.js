import React, { useEffect, useRef, useState } from "react";
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

const PROTECTED = [SCREENS.TRIPS, SCREENS.GLOBAL_REVIEWS, SCREENS.BOOKINGS, SCREENS.BADGES, SCREENS.PROFILE];

export default function DrawerMenu({ visible, onClose }) {
  const navigation = useNavigation();
  const { user, profile, signOutNow } = useAuth();
  const [expanded, setExpanded] = useState(null);
  const slideAnim = useRef(new Animated.Value(340)).current;

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(340);
      setExpanded(null);
    }
  }, [visible]);

  const close = () => {
    Animated.timing(slideAnim, {
      toValue: 340,
      duration: 210,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const goTo = (screen) => {
    close();
    setTimeout(() => {
      if (!user && PROTECTED.includes(screen)) {
        navigation.navigate(SCREENS.SIGNIN);
      } else {
        navigation.navigate("More", { screen });
      }
    }, 230);
  };

  const openUrl = (url) => {
    close();
    Linking.openURL(url);
  };

  const initials = (() => {
    const name = profile?.username || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0]?.toUpperCase() ?? "?";
  })();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={close}
    >
      <View style={styles.overlay}>
        {/* Backdrop */}
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={close}
        />

        {/* Drawer panel slides from right */}
        <Animated.View
          style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}
        >
          {/* ── Header ── */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Image
                  source={require("../../assets/logo.png")}
                  style={styles.logoImg}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.brand}>Ten Miles Ahead</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={close}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* ── Nav links ── */}
          <ScrollView
            style={styles.nav}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Achievements */}
            <NavItem
              label="Achievements"
              onPress={() => setExpanded(expanded === "achievements" ? null : "achievements")}
              chevronOpen={expanded === "achievements"}
              dropdown
            />
            {expanded === "achievements" && (
              <View style={styles.subList}>
                <TouchableOpacity style={styles.subItem} onPress={() => goTo(SCREENS.BADGES)} activeOpacity={0.7}>
                  <View style={styles.subDot} />
                  <Text style={styles.subLabel}>Your Badges</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.subItem} onPress={() => openUrl("https://tenmilesahead.com/leaderboard")} activeOpacity={0.7}>
                  <View style={styles.subDot} />
                  <Text style={styles.subLabel}>Leaderboard ↗</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* 2. Blog */}
            <NavItem label="Blog" onPress={() => openUrl("https://tenmilesahead.com/blog")} external />

            {/* 3. Bookings */}
            <NavItem label="Bookings" onPress={() => goTo(SCREENS.BOOKINGS)} />

            {/* 4. Travel Tools */}
            <NavItem
              label="Travel Tools"
              onPress={() => setExpanded(expanded === "travel-tools" ? null : "travel-tools")}
              chevronOpen={expanded === "travel-tools"}
              dropdown
            />
            {expanded === "travel-tools" && (
              <View style={styles.subList}>
                {[
                  { label: "Budget",           screen: SCREENS.BUDGET },
                  { label: "Currency Exchange", screen: SCREENS.CURRENCY_EXCHANGE },
                  { label: "Packing List",     screen: SCREENS.PACKING_LIST },
                  { label: "Time Zones",       screen: SCREENS.TIME_ZONES },
                  { label: "Tipping Guide",    screen: SCREENS.TIPPING_GUIDE },
                ].map((item) => (
                  <TouchableOpacity key={item.label} style={styles.subItem} onPress={() => goTo(item.screen)} activeOpacity={0.7}>
                    <View style={styles.subDot} />
                    <Text style={styles.subLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* 5. Profile */}
            {user && <NavItem label="Profile" onPress={() => goTo(SCREENS.PROFILE)} />}

            {/* 6. Support / Learning */}
            <NavItem
              label="Support / Learning"
              onPress={() => setExpanded(expanded === "support" ? null : "support")}
              chevronOpen={expanded === "support"}
              dropdown
            />
            {expanded === "support" && (
              <View style={styles.subList}>
                {[
                  { label: "FAQ",            screen: SCREENS.FAQS },
                  { label: "Help / Support", screen: SCREENS.HELP_SUPPORT },
                  { label: "Tutorials",      screen: SCREENS.TUTORIALS },
                ].map((item) => (
                  <TouchableOpacity key={item.label} style={styles.subItem} onPress={() => goTo(item.screen)} activeOpacity={0.7}>
                    <View style={styles.subDot} />
                    <Text style={styles.subLabel}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.divider} />

            {/* Auth section */}
            {user ? (
              <>
                <NavItem
                  label="Subscribe"
                  onPress={() => goTo(SCREENS.SUBSCRIBE)}
                  accent={COLORS.primary}
                />
                <TouchableOpacity
                  style={[styles.navItem, styles.profileRow]}
                  onPress={() => goTo(SCREENS.PROFILE)}
                  activeOpacity={0.7}
                >
                  <View style={styles.miniAvatar}>
                    {profile?.photoURL ? (
                      <Image source={{ uri: profile.photoURL }} style={styles.miniAvatarImg} />
                    ) : (
                      <Text style={styles.miniAvatarText}>{initials}</Text>
                    )}
                  </View>
                  <Text style={styles.navLabel}>@{profile?.username || "you"}</Text>
                </TouchableOpacity>
                <NavItem label="Sign out" onPress={() => { close(); setTimeout(() => signOutNow(), 250); }} accent={COLORS.error} />
              </>
            ) : (
              <>
                <NavItem
                  label="Sign in"
                  onPress={() => { close(); setTimeout(() => navigation.navigate(SCREENS.SIGNIN), 230); }}
                />
                <TouchableOpacity
                  style={styles.getStartedBtn}
                  onPress={() => { close(); setTimeout(() => navigation.navigate(SCREENS.SIGNUP), 230); }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.getStartedText}>Get started</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>

          {/* ── Footer ── */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © {new Date().getFullYear()} Ten Miles Ahead
            </Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function NavItem({ label, onPress, external, chevronOpen, accent, dropdown }) {
  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.navLabel, accent && { color: accent }]}>{label}</Text>
      <Text
        style={[
          styles.chevron,
          dropdown && !chevronOpen && styles.chevronDown,
          dropdown && chevronOpen && styles.chevronUp,
          external && styles.externalChevron,
        ]}
      >
        {external ? "↗" : "›"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
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
    shadowOpacity: 0.45,
    shadowRadius: 20,
    elevation: 24,
  },

  /* Header */
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
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scaleSpacing(SPACING.sm),
  },
  logoBox: {
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
  brand: {
    fontSize: scaleFontSize(14),
    fontWeight: "700",
    color: COLORS.foreground,
  },
  closeBtn: {
    padding: scaleSpacing(SPACING.sm),
    borderRadius: scaleFontSize(8),
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  closeIcon: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },

  /* Nav */
  nav: {
    flex: 1,
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingTop: scaleSpacing(SPACING.xs),
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: scaleSpacing(13),
    paddingHorizontal: scaleSpacing(SPACING.xs),
    borderBottomWidth: 1,
    borderBottomColor: `${COLORS.border}88`,
  },
  navLabel: {
    fontSize: scaleFontSize(15),
    color: COLORS.foreground,
    fontWeight: "500",
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
  externalChevron: {
    fontSize: scaleFontSize(15),
  },

  /* Sub-items */
  subList: {
    marginLeft: scaleSpacing(SPACING.md),
    borderLeftWidth: 2,
    borderLeftColor: `${COLORS.primary}55`,
    paddingLeft: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.xs),
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: scaleSpacing(10),
    gap: scaleSpacing(SPACING.sm),
  },
  subDot: {
    width: scaleFontSize(6),
    height: scaleFontSize(6),
    borderRadius: scaleFontSize(3),
    backgroundColor: `${COLORS.primary}99`,
  },
  subLabel: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: scaleSpacing(SPACING.sm),
  },

  /* Profile row */
  profileRow: {
    justifyContent: "flex-start",
    gap: scaleSpacing(SPACING.sm),
  },
  miniAvatar: {
    width: scaleFontSize(34),
    height: scaleFontSize(34),
    borderRadius: scaleFontSize(17),
    backgroundColor: `${COLORS.primary}22`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  miniAvatarImg: { width: "100%", height: "100%" },
  miniAvatarText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(12),
    fontWeight: "700",
  },

  /* Get started button */
  getStartedBtn: {
    backgroundColor: COLORS.primary,
    marginHorizontal: scaleSpacing(SPACING.xs),
    marginTop: scaleSpacing(SPACING.sm),
    paddingVertical: scaleSpacing(SPACING.sm),
    borderRadius: scaleFontSize(8),
    alignItems: "center",
  },
  getStartedText: {
    color: "#ffffff",
    fontSize: scaleFontSize(14),
    fontWeight: "600",
  },

  /* Footer */
  footer: {
    paddingVertical: scaleSpacing(SPACING.md),
    paddingHorizontal: scaleSpacing(SPACING.md),
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.surface,
  },
  footerText: {
    fontSize: scaleFontSize(11),
    color: COLORS.muted,
    textAlign: "center",
  },
});
