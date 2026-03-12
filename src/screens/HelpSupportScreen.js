import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import { COLORS, SPACING, SCREENS, scaleFontSize, scaleSpacing } from "../lib/constants";

const FAQS = [
  {
    q: "What is Ten Miles Ahead?",
    a: "Ten Miles Ahead is a dynamic travel journal app designed for modern explorers to log their trips, create photo stories, and share their adventures with a global community.",
  },
  {
    q: "How do I log a new trip?",
    a: "Tap the 'Add Trip' button from your dashboard, fill in the details like destination, dates, and description, and save it.",
  },
  {
    q: "Can I add photos to my trips?",
    a: "Absolutely! Upload your favorite pictures and add notes to capture every memory.",
  },
  {
    q: "How do I share my trip with friends and family?",
    a: "Generate a private, shareable link—anyone with the link can view, even without an account.",
  },
  {
    q: "What are 'Global Reviews'?",
    a: "Explore ratings and reviews from other travelers on accommodations, restaurants, and activities worldwide.",
  },
  {
    q: "Is my data secure?",
    a: "Yes. We use robust authentication and database security to keep your travel memories safe.",
  },
  {
    q: "Can I edit my trip details after saving?",
    a: "Of course! You can edit any trip details, photos, or reviews later.",
  },
  {
    q: "Do I need an account to use Ten Miles Ahead?",
    a: "You can browse landing/FAQs/Tutorials without an account, but you must log in to create and manage trips.",
  },
  {
    q: "What devices are compatible?",
    a: "Ten Miles Ahead works beautifully across desktops, tablets, and mobile devices.",
  },
  {
    q: "What subscription plans are available?",
    a: "We offer a free trial, a monthly plan, and an annual plan. Visit the Subscribe page to see current pricing and choose the plan that works best for you.",
  },
  {
    q: "How do I cancel my subscription?",
    a: "You can manage or cancel your subscription from your Profile page. Your access will continue until the end of your current billing period.",
  },
  {
    q: "Can I sign in with Google?",
    a: "Yes! You can sign in using your Google account for a quick and easy login, or create an account with your email and password.",
  },
  {
    q: "How do I reset my password?",
    a: "On the Sign In page, tap 'Forgot Password?' and enter your email. You'll receive a link to reset your password.",
  },
  {
    q: "What are Flipbooks and Photobooks?",
    a: "Flipbooks are interactive photo stories you can create from your trip media. Photobooks let you design custom page layouts with your photos and text—perfect for preserving and sharing your travel memories.",
  },
  {
    q: "How does the World Map work?",
    a: "The World Map on your dashboard shows pins for every destination you've visited. Countries you've been to are shaded in pink. Tap any pin to see details or view the trip's flipbook.",
  },
  {
    q: "How do I add destinations, restaurants, or activities to a trip?",
    a: "Open a trip and use the tabs to add destinations, restaurants, activities, accommodations, or cruises. Each category has its own section where you can add details and reviews.",
  },
  {
    q: "What types of media can I upload?",
    a: "You can upload photos (JPG, PNG, HEIC, WebP) and videos. Use the uploader or tap to browse files from your device.",
  },
  {
    q: "How is 'Total Miles' calculated?",
    a: "Total Miles is calculated based on the distance between your origin location and your trip destinations using geographic coordinates.",
  },
  {
    q: "Can I delete a trip?",
    a: "Yes. Open the trip you want to remove and use the delete option. Please note that deleting a trip will permanently remove all associated photos, reviews, and details.",
  },
  {
    q: "How do I contact support?",
    a: "Visit our Help & Support page or email us at admin@tenmilesahead.com.",
  },
];

export default function HelpSupportScreen({ navigation }) {
  const { user, profile } = useAuth();
  const [expandedIndex, setExpandedIndex] = useState(null);

  // Contact form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Pre-fill from auth
  const displayName = name || profile?.username || "";
  const displayEmail = email || user?.email || "";

  function toggleExpand(index) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  async function handleSubmit() {
    const finalName = displayName.trim();
    const finalEmail = displayEmail.trim();
    if (!finalName || !finalEmail || !subject.trim() || !message.trim()) {
      Alert.alert("Missing Fields", "Please fill in all fields before sending.");
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, "support"), {
        name: finalName,
        email: finalEmail,
        subject: subject.trim(),
        message: message.trim(),
        ...(user?.uid ? { userId: user.uid } : {}),
        status: "new",
        createdAt: Date.now(),
      });
      setSubmitted(true);
    } catch (err) {
      Alert.alert("Error", "Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>Help & Support</Text>
      <Text style={styles.pageSubtitle}>
        Find answers, watch tutorials, or reach out to our team.
      </Text>

      {/* Section 1: Video Tutorials */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Video Tutorials</Text>
        <Text style={styles.sectionSubtitle}>
          Watch step-by-step videos to get the most out of Ten Miles Ahead.
        </Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => navigation.navigate(SCREENS.TUTORIALS)}
        >
          <Text style={styles.primaryButtonText}>Browse Tutorials</Text>
        </TouchableOpacity>
      </View>

      {/* Section 2: FAQs */}
      <View style={styles.faqSection}>
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        <View style={styles.faqList}>
          {FAQS.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.faqCard, index === FAQS.length - 1 && styles.faqCardLast]}
              onPress={() => toggleExpand(index)}
              activeOpacity={0.7}
            >
              <View style={styles.faqRow}>
                <Text style={styles.faqQuestion}>{item.q}</Text>
                <Text style={styles.faqToggle}>
                  {expandedIndex === index ? "▲" : "▶"}
                </Text>
              </View>
              {expandedIndex === index && (
                <Text style={styles.faqAnswer}>{item.a}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Section 3: Contact Support */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Contact Support</Text>

        {submitted ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successTitle}>Message sent!</Text>
            <Text style={styles.successText}>
              We'll get back to you as soon as possible.
            </Text>
            <TouchableOpacity
              style={styles.outlineButton}
              onPress={() => {
                setSubmitted(false);
                setSubject("");
                setMessage("");
              }}
            >
              <Text style={styles.outlineButtonText}>Send another message</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={COLORS.muted}
            />

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={displayEmail}
              onChangeText={setEmail}
              placeholder="your@email.com"
              placeholderTextColor={COLORS.muted}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <Text style={styles.label}>Subject</Text>
            <TextInput
              style={styles.input}
              value={subject}
              onChangeText={setSubject}
              placeholder="What do you need help with?"
              placeholderTextColor={COLORS.muted}
            />

            <Text style={styles.label}>Message</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={message}
              onChangeText={setMessage}
              placeholder="Describe your issue or question..."
              placeholderTextColor={COLORS.muted}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />

            <TouchableOpacity
              style={[styles.primaryButton, styles.fullWidth, submitting && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Message</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>
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
  pageTitle: {
    fontSize: scaleFontSize(28),
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(4),
    marginTop: scaleSpacing(SPACING.sm),
  },
  pageSubtitle: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.lg),
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(12),
    padding: scaleSpacing(SPACING.lg),
    marginBottom: scaleSpacing(SPACING.lg),
  },
  faqSection: {
    marginBottom: scaleSpacing(SPACING.lg),
  },
  faqList: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(12),
    overflow: "hidden",
    marginTop: scaleSpacing(SPACING.md),
  },
  sectionTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  sectionSubtitle: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.md),
    lineHeight: scaleFontSize(20),
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.md),
    paddingHorizontal: scaleSpacing(SPACING.lg),
    borderRadius: scaleFontSize(8),
    alignSelf: "flex-start",
  },
  fullWidth: {
    alignSelf: "stretch",
    alignItems: "center",
    marginTop: scaleSpacing(SPACING.sm),
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(15),
    fontWeight: "600",
  },
  outlineButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: scaleSpacing(SPACING.md),
    paddingHorizontal: scaleSpacing(SPACING.lg),
    borderRadius: scaleFontSize(8),
    alignSelf: "flex-start",
    marginTop: scaleSpacing(SPACING.md),
  },
  outlineButtonText: {
    color: COLORS.foreground,
    fontSize: scaleFontSize(14),
    fontWeight: "500",
  },
  faqCard: {
    padding: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  faqCardLast: {
    borderBottomWidth: 0,
  },
  faqRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    flex: 1,
    fontSize: scaleFontSize(14),
    fontWeight: "600",
    color: COLORS.foreground,
    paddingRight: scaleSpacing(SPACING.sm),
  },
  faqToggle: {
    fontSize: scaleFontSize(12),
    color: COLORS.muted,
  },
  faqAnswer: {
    fontSize: scaleFontSize(14),
    color: "#374151",
    marginTop: scaleSpacing(SPACING.sm),
    lineHeight: scaleFontSize(22),
  },
  label: {
    fontSize: scaleFontSize(13),
    fontWeight: "500",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(4),
    marginTop: scaleSpacing(SPACING.sm),
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: scaleFontSize(8),
    paddingHorizontal: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.sm),
    fontSize: scaleFontSize(15),
    color: COLORS.foreground,
  },
  textArea: {
    minHeight: scaleFontSize(120),
    textAlignVertical: "top",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: scaleSpacing(SPACING.xl),
  },
  successIcon: {
    fontSize: scaleFontSize(40),
    color: COLORS.primary,
    marginBottom: scaleSpacing(SPACING.sm),
  },
  successTitle: {
    fontSize: scaleFontSize(18),
    fontWeight: "700",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  successText: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    textAlign: "center",
  },
});
