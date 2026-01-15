import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from "react-native";
import { COLORS, SPACING } from "../lib/constants";

export default function TermsScreen({ navigation }) {
  const handleEmailPress = () => {
    Linking.openURL("mailto:admin@TenMilesAhead.com");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Terms of Service</Text>

      <Text style={styles.meta}>
        <Text style={styles.bold}>Effective Date:</Text> July 2025{"\n"}
        <Text style={styles.bold}>Last Updated:</Text> July 2025
      </Text>

      <Text style={styles.paragraph}>
        Welcome to TenMilesAhead.com. These Terms of Service ("Terms") govern
        your access to and use of our software-as-a-service (SaaS) platform
        ("Service"), which provides tools for tracking and managing recreational
        vehicle (RV) data and maintenance schedules. By accessing or using the
        Service, you agree to be bound by these Terms.
      </Text>

      <Text style={styles.sectionTitle}>1. Eligibility</Text>
      <Text style={styles.paragraph}>
        You must be at least 18 years old and capable of entering into legally
        binding agreements to use the Service.
      </Text>

      <Text style={styles.sectionTitle}>2. Account Registration</Text>
      <Text style={styles.paragraph}>
        You are required to create an account to access certain features of the
        Service. You are responsible for maintaining the confidentiality of your
        login credentials and all activities that occur under your account.
      </Text>

      <Text style={styles.sectionTitle}>3. User Responsibilities</Text>
      <Text style={styles.paragraph}>
        Provide accurate information; comply with laws; regularly back up your
        data. We are not liable for any loss of information.
      </Text>

      <Text style={styles.sectionTitle}>4. Data Storage and Backups</Text>
      <Text style={styles.paragraph}>
        We strongly advise users to maintain regular personal backups. We are
        not responsible for any loss, corruption, or inaccessibility of data.
      </Text>

      <Text style={styles.sectionTitle}>5. Subscription & Payment</Text>
      <Text style={styles.paragraph}>
        Access may require subscription fees. All fees are non-refundable except
        as required by law. We may change pricing at any time with notice.
      </Text>

      <Text style={styles.sectionTitle}>6. Intellectual Property</Text>
      <Text style={styles.paragraph}>
        All content, trademarks, and technology used in the Service are the
        property of Ten Miles Ahead or its licensors. You may not copy, modify,
        or distribute any part of the Service without our prior written consent.
      </Text>

      <Text style={styles.sectionTitle}>7. Termination</Text>
      <Text style={styles.paragraph}>
        We may suspend or terminate your account if you violate these Terms.
      </Text>

      <Text style={styles.sectionTitle}>8. Disclaimers</Text>
      <Text style={styles.paragraph}>
        The Service is provided "as is" and "as available." We disclaim all
        warranties, express or implied.
      </Text>

      <Text style={styles.sectionTitle}>9. Limitation of Liability</Text>
      <Text style={styles.paragraph}>
        To the maximum extent permitted by law, we are not liable for indirect,
        incidental, or consequential damages, including data loss, loss of
        profits, or business interruption.
      </Text>

      <Text style={styles.sectionTitle}>10. Modifications to the Terms</Text>
      <Text style={styles.paragraph}>
        We may update these Terms from time to time. Continued use after changes
        are posted constitutes acceptance.
      </Text>

      <Text style={styles.sectionTitle}>11. Governing Law</Text>
      <Text style={styles.paragraph}>
        These Terms are governed by and construed under the laws of St. Johns
        County, Florida, U.S.A.
      </Text>

      <Text style={styles.sectionTitle}>12. Contact</Text>
      <TouchableOpacity onPress={handleEmailPress}>
        <Text style={[styles.paragraph, styles.link]}>
          Email: admin@TenMilesAhead.com
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: SPACING.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  meta: {
    fontSize: 14,
    color: COLORS.foreground,
    marginBottom: SPACING.lg,
    lineHeight: 22,
  },
  bold: {
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.foreground,
    marginTop: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  paragraph: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 22,
    marginBottom: SPACING.sm,
  },
  link: {
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
  backButton: {
    alignItems: "center",
    paddingVertical: SPACING.lg,
    marginTop: SPACING.xl,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
  },
});
