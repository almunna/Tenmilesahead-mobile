import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { COLORS, SPACING } from "../lib/constants";

export default function PrivacyScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Privacy Policy</Text>

      <Text style={styles.meta}>
        <Text style={styles.bold}>Effective Date:</Text> July 2025{"\n"}
        <Text style={styles.bold}>Last Updated:</Text> July 2025
      </Text>

      <Text style={styles.paragraph}>
        TenMilesAhead.com is committed to protecting your privacy. This Privacy
        Policy describes how we collect, use, and protect your personal
        information when you use our software-as-a-service (SaaS) platform for
        tracking and managing travel data (the "Service"). By using
        the Service, you agree to the terms of this Privacy Policy.
      </Text>

      <Text style={styles.sectionTitle}>1. Information We Collect</Text>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Information You Provide:</Text> Account details (name, email
        address, password)
      </Text>
      <Text style={styles.paragraph}>
        <Text style={styles.bold}>Automatically Collected Information:</Text> Log data (IP
        address, browser type, operating system, usage timestamps), device
        identifiers, cookies and usage tracking data (see "Cookies" below)
      </Text>

      <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
      <View style={styles.list}>
        <Text style={styles.listItem}>• Provide and maintain the Service</Text>
        <Text style={styles.listItem}>• Send you important updates or notifications</Text>
        <Text style={styles.listItem}>• Improve functionality and performance</Text>
        <Text style={styles.listItem}>• Respond to user inquiries and support requests</Text>
        <Text style={styles.listItem}>• Ensure data security and prevent misuse</Text>
      </View>

      <Text style={styles.sectionTitle}>3. Data Storage and Backups</Text>
      <Text style={styles.paragraph}>
        We use secure cloud-based infrastructure to store your data. However, we
        do not guarantee data retention and recommend you maintain regular
        personal backups of all critical information.
      </Text>

      <Text style={styles.sectionTitle}>4. Data Sharing and Disclosure</Text>
      <Text style={styles.paragraph}>
        We do not sell or rent your personal data. We may share your data only
        in these limited situations: with service providers (under
        confidentiality), to comply with legal obligations, or to protect the
        rights or safety of users or the public.
      </Text>

      <Text style={styles.sectionTitle}>5. Cookies and Tracking Technologies</Text>
      <Text style={styles.paragraph}>
        We use cookies and similar technologies to analyze usage and improve
        user experience. You can control cookie settings through your browser.
      </Text>

      <Text style={styles.sectionTitle}>6. Data Retention</Text>
      <Text style={styles.paragraph}>
        We retain your information as long as your account is active or as
        necessary to comply with legal obligations. You can request deletion at
        any time.
      </Text>

      <Text style={styles.sectionTitle}>7. Your Rights</Text>
      <Text style={styles.paragraph}>
        Depending on your location, you may have rights to access, update, or
        delete your data; object to or restrict certain uses; and withdraw
        consent (where applicable). To exercise your rights, contact us at
        admin@TenMilesAhead.com.
      </Text>

      <Text style={styles.sectionTitle}>8. Data Security</Text>
      <Text style={styles.paragraph}>
        We implement industry-standard safeguards, including encryption and
        access controls. However, no system is 100% secure.
      </Text>

      <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
      <Text style={styles.paragraph}>
        Our Service is not intended for children. We do not knowingly collect
        personal data from minors.
      </Text>

      <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
      <Text style={styles.paragraph}>
        We may update this Privacy Policy. We will notify you of material
        changes via email or through the Service.
      </Text>

      <Text style={styles.sectionTitle}>11. Contact Us</Text>
      <Text style={styles.paragraph}>Email: admin@TenMilesAhead.com</Text>

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
  list: {
    marginBottom: SPACING.sm,
  },
  listItem: {
    fontSize: 14,
    color: COLORS.muted,
    lineHeight: 24,
    paddingLeft: SPACING.sm,
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
