import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Platform,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, SCREENS } from "../lib/constants";

// FAQs data
const faqs = [
  {
    q: "What is Ten Miles Ahead?",
    a: "Ten Miles Ahead is a dynamic travel journal app designed for modern explorers to log trips, create photo stories, and share adventures with a global community.",
  },
  {
    q: "How do I log a new trip?",
    a: "From your dashboard, tap 'Add Trip', fill destination and dates, then save.",
  },
  {
    q: "Can I add photos to my trips?",
    a: "Yes—upload photos and add notes. Your trip becomes a beautiful flipbook.",
  },
  {
    q: "How do I share my trip?",
    a: "Generate a private share link. Anyone with the link can view—no account needed.",
  },
  {
    q: "Is my data secure?",
    a: "We use robust authentication and Firestore rules to protect your data.",
  },
  {
    q: "Does my subscription include updates?",
    a: "Yes—new features and improvements are included while subscribed.",
  },
];

// Features data
const features = [
  {
    title: "Smart Trip Management",
    bullets: [
      "Create trips in seconds",
      "Edit details anytime",
      "Archive when you're done",
    ],
  },
  {
    title: "Photo Uploader",
    bullets: [
      "Drag & drop bulk upload",
      "Per-photo captions",
      "Set trip cover",
    ],
  },
  {
    title: "Flipbook Viewer",
    bullets: [
      "All media in one place",
      "Smooth navigation",
      "Mobile & desktop ready",
    ],
  },
  {
    title: "Flexible Date Editing",
    bullets: ["Adjust if plans shift", "Clean timeline", "Stay consistent"],
  },
  {
    title: "Advanced Exports",
    bullets: ["CSV export (soon)", "PDF flipbook (soon)", "Media backups"],
  },
  {
    title: "Share Privately",
    bullets: [
      "Private share links",
      "No account required to view",
      "Control visibility",
    ],
  },
  {
    title: "Global Reviews",
    bullets: [
      "Discover places to go",
      "See what travelers love",
      "Get inspired",
    ],
  },
  {
    title: "Multi-Device Access",
    bullets: ["Seamless sync", "Fast on mobile", "Works anywhere"],
  },
];

// Feature Card Component
function FeatureCard({ title, bullets }) {
  return (
    <View style={styles.featureCard}>
      <View style={styles.featureIconContainer}>
        <View style={styles.featureIconDot} />
      </View>
      <View style={styles.featureContent}>
        <Text style={styles.featureTitle}>{title}</Text>
        <View style={styles.bulletList}>
          {bullets.map((bullet, index) => (
            <View key={index} style={styles.bulletItem}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{bullet}</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

// Value Item Component
function ValueItem({ title, text }) {
  return (
    <View style={styles.valueItem}>
      <View style={styles.valueIconContainer}>
        <View style={styles.valueIconDot} />
      </View>
      <Text style={styles.valueTitle}>{title}</Text>
      <Text style={styles.valueText}>{text}</Text>
    </View>
  );
}

// Pricing Card Component
function PricingCard({ label, badge, price, period, savings, bullets, highlight, onPress }) {
  return (
    <View style={[styles.pricingCard, highlight && styles.pricingCardHighlight]}>
      {badge && (
        <View style={styles.pricingBadge}>
          <Text style={styles.pricingBadgeText}>{badge}</Text>
        </View>
      )}
      <Text style={styles.pricingLabel}>{label}</Text>
      <View style={styles.pricingPriceRow}>
        <Text style={styles.pricingPrice}>{price}</Text>
        <Text style={styles.pricingPeriod}>{period}</Text>
      </View>
      {savings && <Text style={styles.pricingSavings}>{savings}</Text>}
      <View style={styles.pricingBullets}>
        {bullets.map((bullet, index) => (
          <View key={index} style={styles.bulletItem}>
            <View style={styles.bulletDot} />
            <Text style={styles.pricingBulletText}>{bullet}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity style={styles.pricingButton} onPress={onPress}>
        <Text style={styles.pricingButtonText}>Choose {label.split(" ")[0]}</Text>
      </TouchableOpacity>
    </View>
  );
}

// FAQ Item Component
function FAQItem({ question, answer }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={styles.faqItem}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.faqHeader}>
        <Text style={styles.faqQuestion}>{question}</Text>
        <Text style={styles.faqArrow}>{expanded ? "−" : "+"}</Text>
      </View>
      {expanded && <Text style={styles.faqAnswer}>{answer}</Text>}
    </TouchableOpacity>
  );
}

export default function LandingScreen() {
  const navigation = useNavigation();

  const handleStartJourney = () => {
    navigation.navigate(SCREENS.SIGNIN);
  };

  const handleSignIn = () => {
    navigation.navigate(SCREENS.SIGNIN);
  };

  const handleSubscribe = () => {
    navigation.navigate(SCREENS.SIGNUP);
  };

  const openGooglePlay = () => {
    Linking.openURL("https://play.google.com/store/apps/details?id=com.tenmilesahead");
  };

  const openAppStore = () => {
    Linking.openURL("https://apps.apple.com/app/ten-miles-ahead");
  };

  const openEmail = () => {
    Linking.openURL("mailto:admin@tenmilesahead.com");
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero Section */}
      <View style={styles.heroSection}>
        <View style={styles.logoContainer}>
          <Image
            source={require("../../assets/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heroTitle}>
          Your Adventure <Text style={styles.heroTitleHighlight}>Awaits</Text>
        </Text>
        <Text style={styles.heroSubtitle}>
          Ten Miles Ahead is the ultimate travel journal for modern explorers.
          Log your trips, create beautiful photo stories, and share your journey
          with the world
        </Text>
        <View style={styles.heroButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleStartJourney}>
            <Text style={styles.primaryButtonText}>Start Your Journey!</Text>
          </TouchableOpacity>
          <View style={styles.storeButtons}>
            <TouchableOpacity style={styles.storeButton} onPress={openGooglePlay}>
              <Text style={styles.storeButtonText}>Google Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.storeButton} onPress={openAppStore}>
              <Text style={styles.storeButtonText}>App Store</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Features Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Everything You Need to Manage Your Trips</Text>
        <Text style={styles.sectionSubtitle}>
          Effortlessly document all your journeys, from weekend getaways to epic
          adventures across the globe.
        </Text>
        <View style={styles.featuresGrid}>
          {features.map((feature, index) => (
            <FeatureCard key={index} title={feature.title} bullets={feature.bullets} />
          ))}
        </View>
      </View>

      {/* Why Travelers Love Section */}
      <View style={styles.valueSection}>
        <View style={styles.valueCard}>
          <Text style={styles.valueSectionTitle}>Why Travelers Love Ten Miles Ahead</Text>
          <View style={styles.valueItems}>
            <ValueItem
              title="Save Time"
              text="Bulk uploads and clear organization so you can focus on your adventures."
            />
            <ValueItem
              title="Better Insights"
              text="Flipbooks and timelines help you remember, reflect, and share."
            />
            <ValueItem
              title="Stay Organized"
              text="Your trips, photos, and notes are always tidy and easy to access."
            />
          </View>
        </View>
      </View>

      {/* Pricing Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Simple, Affordable Pricing</Text>
        <Text style={styles.sectionSubtitle}>Choose the plan that works for you</Text>
        <View style={styles.pricingContainer}>
          <PricingCard
            label="Monthly Plan"
            price="$4.99"
            period="/mo"
            bullets={[
              "Unlimited trips & flipbooks",
              "Private share links",
              "Sync across all your devices",
              "Early access to new features",
              "Offline flipbook (soon)",
              "Export PDF/CSV (soon)",
            ]}
            onPress={handleSubscribe}
          />
          <PricingCard
            label="Annual Plan"
            badge="Best value"
            price="$39.99"
            period="/yr"
            savings="Save $19.89 annually"
            bullets={[
              "Everything in Monthly",
              "Priority support for creators",
              "Bonus: 2 months free vs monthly",
              "Perfect for frequent travelers",
              "Advanced media backups",
              "Early access to experimental features",
            ]}
            highlight
            onPress={handleSubscribe}
          />
        </View>
        <Text style={styles.pricingNote}>Launch pricing — secure your rate.</Text>
      </View>

      {/* FAQ Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <Text style={styles.sectionSubtitle}>Get answers to common questions</Text>
        <View style={styles.faqContainer}>
          {faqs.map((faq, index) => (
            <FAQItem key={index} question={faq.q} answer={faq.a} />
          ))}
          <View style={styles.faqContact}>
            <Text style={styles.faqContactTitle}>Still have questions?</Text>
            <Text style={styles.faqContactSubtitle}>We're here to help.</Text>
            <View style={styles.faqContactButtons}>
              <TouchableOpacity onPress={openEmail}>
                <Text style={styles.linkText}>Contact Us</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate(SCREENS.FAQS)}>
                <Text style={styles.linkText}>View All FAQs</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      {/* CTA Section */}
      <View style={styles.ctaSection}>
        <Text style={styles.ctaTitle}>Ready to Transform Your Travel Journal?</Text>
        <Text style={styles.ctaSubtitle}>
          Join travelers already saving time and staying organized with Ten Miles Ahead.
        </Text>
        <View style={styles.ctaButtons}>
          <TouchableOpacity style={styles.primaryButton} onPress={handleSubscribe}>
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={styles.linkText}>Sign in</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.ctaNote}>No setup. Cancel anytime. Secure payments.</Text>
      </View>

      {/* Bottom Spacing */}
      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Hero Section
  heroSection: {
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.lg,
    paddingTop: 60,
    paddingBottom: SPACING.xl,
    alignItems: "center",
  },
  logoContainer: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  logo: {
    width: 100,
    height: 100,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  heroTitleHighlight: {
    color: COLORS.primary,
  },
  heroSubtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: SPACING.lg,
  },
  heroButtons: {
    width: "100%",
    alignItems: "center",
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  primaryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  storeButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  storeButton: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  storeButtonText: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "500",
  },
  // Section Styles
  section: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  // Features Grid
  featuresGrid: {
    gap: SPACING.md,
  },
  featureCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    gap: SPACING.md,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}33`,
    alignItems: "center",
    justifyContent: "center",
  },
  featureIconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: `${COLORS.primary}cc`,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  bulletList: {
    gap: SPACING.xs,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  bulletDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: `${COLORS.primary}cc`,
    marginTop: 5,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  // Value Section
  valueSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
  },
  valueCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: `${COLORS.primary}33`,
  },
  valueSectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  valueItems: {
    gap: SPACING.lg,
  },
  valueItem: {
    alignItems: "center",
  },
  valueIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}33`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.sm,
  },
  valueIconDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: `${COLORS.primary}cc`,
  },
  valueTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  valueText: {
    fontSize: 14,
    color: COLORS.foreground,
    textAlign: "center",
    lineHeight: 20,
  },
  // Pricing Section
  pricingContainer: {
    gap: SPACING.md,
  },
  pricingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: "relative",
  },
  pricingCardHighlight: {
    borderWidth: 2,
    borderColor: `${COLORS.primary}b3`,
  },
  pricingBadge: {
    position: "absolute",
    top: -12,
    right: SPACING.md,
    backgroundColor: `${COLORS.primary}e6`,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pricingBadgeText: {
    color: COLORS.foreground,
    fontSize: 11,
    fontWeight: "600",
  },
  pricingLabel: {
    fontSize: 14,
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  pricingPriceRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: SPACING.xs,
  },
  pricingPrice: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  pricingPeriod: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: 4,
  },
  pricingSavings: {
    fontSize: 13,
    color: `${COLORS.primary}cc`,
    marginTop: SPACING.xs,
  },
  pricingBullets: {
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  pricingBulletText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.muted,
    lineHeight: 18,
  },
  pricingButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: 8,
    alignItems: "center",
    marginTop: SPACING.lg,
  },
  pricingButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  pricingNote: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    marginTop: SPACING.md,
  },
  // FAQ Section
  faqContainer: {
    gap: SPACING.sm,
  },
  faqItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    paddingRight: SPACING.sm,
  },
  faqArrow: {
    fontSize: 20,
    color: COLORS.muted,
    fontWeight: "300",
  },
  faqAnswer: {
    fontSize: 14,
    color: COLORS.foreground,
    marginTop: SPACING.sm,
    lineHeight: 20,
  },
  faqContact: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  faqContactTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  faqContactSubtitle: {
    fontSize: 13,
    color: COLORS.muted,
    marginTop: SPACING.xs,
  },
  faqContactButtons: {
    flexDirection: "row",
    gap: SPACING.lg,
    marginTop: SPACING.md,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.primary,
    fontWeight: "500",
  },
  // CTA Section
  ctaSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xl,
    alignItems: "center",
  },
  ctaTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: SPACING.sm,
  },
  ctaSubtitle: {
    fontSize: 14,
    color: COLORS.muted,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  ctaButtons: {
    alignItems: "center",
    width: "100%",
    gap: SPACING.md,
  },
  ctaNote: {
    fontSize: 12,
    color: COLORS.muted,
    marginTop: SPACING.md,
  },
  bottomSpacer: {
    height: SPACING.xxl,
  },
});
