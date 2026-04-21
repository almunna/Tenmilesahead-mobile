import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Image,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../components/AuthProvider";
import FeedbackModal from "../components/modals/FeedbackModal";
import { COLORS, SPACING, SCREENS, scaleFontSize, scaleSpacing } from "../lib/constants";

/* Mirrors web NAV_DROPDOWNS */
const SECTIONS = [
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
      { label: "Budget",            screen: SCREENS.BUDGET },
      { label: "Currency Exchange", screen: SCREENS.CURRENCY_EXCHANGE },
      { label: "Packing List",      screen: SCREENS.PACKING_LIST },
      { label: "Time Zones",        screen: SCREENS.TIME_ZONES },
      { label: "Tipping Guide",     screen: SCREENS.TIPPING_GUIDE },
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

export default function MoreScreen() {
  const navigation = useNavigation();
  const { user, profile, signOutNow } = useAuth();
  const [expanded, setExpanded] = useState(null);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  const toggle = (id) => setExpanded((v) => (v === id ? null : id));

  const goTo = (screen) => navigation.navigate(screen);
  const openUrl = (url) => Linking.openURL(url);

  const initials = (() => {
    const name = profile?.username || "";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2)
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name[0]?.toUpperCase() ?? "?";
  })();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* ── User card (logged in) ── */}
      {user && (
        <TouchableOpacity
          style={styles.userCard}
          onPress={() => goTo(SCREENS.PROFILE)}
          activeOpacity={0.8}
        >
          <View style={styles.avatar}>
            {profile?.photoURL ? (
              <Image source={{ uri: profile.photoURL }} style={styles.avatarImg} />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.userInfo}>
            <Text style={styles.username}>@{profile?.username || "your profile"}</Text>
            <Text style={styles.email} numberOfLines={1}>{user.email}</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── Direct links (mirrors web top-level nav) ── */}
      <View style={styles.navGroup}>
        <NavLink label="Trips"          onPress={() => user ? goTo(SCREENS.TRIPS) : goTo(SCREENS.SIGNIN)} />
        <NavLink label="Global Reviews" onPress={() => user ? goTo(SCREENS.GLOBAL_REVIEWS) : goTo(SCREENS.SIGNIN)} />
        <NavLink label="Blog"           onPress={() => openUrl("https://tenmilesahead.com/blog")} external />
        {user && (
          <NavLink label="Bookings"     onPress={() => goTo(SCREENS.BOOKINGS)} />
        )}
      </View>

      {/* ── Accordion sections (mirrors web dropdowns) ── */}
      <View style={styles.navGroup}>
        {SECTIONS.map((section) => {
          const isOpen = expanded === section.id;
          return (
            <View key={section.id}>
              <TouchableOpacity
                style={styles.navItem}
                onPress={() => toggle(section.id)}
                activeOpacity={0.7}
              >
                <Text style={styles.navLabel}>{section.label}</Text>
                <Text style={[styles.chevron, isOpen && styles.chevronOpen]}>›</Text>
              </TouchableOpacity>

              {isOpen && (
                <View style={styles.subList}>
                  {section.items.map((item) => (
                    <TouchableOpacity
                      key={item.label}
                      style={styles.subItem}
                      onPress={() => item.screen ? goTo(item.screen) : openUrl(item.url)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.subDot} />
                      <Text style={styles.subLabel}>{item.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* ── Auth / account actions ── */}
      <View style={styles.navGroup}>
        {user ? (
          <>
            <NavLink
              label="Subscribe"
              onPress={() => goTo(SCREENS.SUBSCRIBE)}
              accent={COLORS.primary}
            />
            <NavLink
              label="Feedback"
              onPress={() => setFeedbackVisible(true)}
            />
            <NavLink
              label="Sign out"
              onPress={() => signOutNow()}
              accent={COLORS.error}
            />
          </>
        ) : (
          <>
            <NavLink label="Sign in"     onPress={() => goTo(SCREENS.SIGNIN)} />
            <NavLink
              label="Get started"
              onPress={() => goTo(SCREENS.SIGNUP)}
              accent={COLORS.primary}
            />
          </>
        )}
      </View>

      <Text style={styles.copyright}>
        © {new Date().getFullYear()} Ten Miles Ahead
      </Text>

      <FeedbackModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />
    </ScrollView>
  );
}

function NavLink({ label, onPress, accent, external }) {
  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.navLabel, accent && { color: accent }]}>{label}</Text>
      <Text style={[styles.chevron, external && styles.externalIcon]}>
        {external ? "↗" : "›"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingVertical: scaleSpacing(SPACING.md),
    paddingBottom: scaleSpacing(SPACING.xxl),
  },

  /* User card */
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    marginHorizontal: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(14),
    padding: scaleSpacing(SPACING.md),
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: scaleSpacing(SPACING.md),
  },
  avatar: {
    width: scaleFontSize(44),
    height: scaleFontSize(44),
    borderRadius: scaleFontSize(22),
    backgroundColor: `${COLORS.primary}33`,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    flexShrink: 0,
  },
  avatarImg: { width: "100%", height: "100%" },
  avatarText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(15),
    fontWeight: "700",
  },
  userInfo: { flex: 1 },
  username: {
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: COLORS.foreground,
  },
  email: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
    marginTop: scaleSpacing(2),
  },

  /* Nav groups */
  navGroup: {
    backgroundColor: COLORS.surface,
    marginHorizontal: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(14),
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(14),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
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
  chevronOpen: {
    color: COLORS.primary,
    transform: [{ rotate: "90deg" }],
  },
  externalIcon: {
    fontSize: scaleFontSize(15),
  },

  /* Sub-items (accordion) */
  subList: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingVertical: scaleSpacing(SPACING.xs),
  },
  subItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scaleSpacing(SPACING.lg),
    paddingVertical: scaleSpacing(11),
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

  copyright: {
    textAlign: "center",
    fontSize: scaleFontSize(11),
    color: COLORS.muted,
    marginTop: scaleSpacing(SPACING.sm),
  },
});
