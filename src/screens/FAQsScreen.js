import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { COLORS, SPACING, scaleFontSize, scaleSpacing } from "../lib/constants";

const FAQS = [
  {
    q: "What is Ten Miles Ahead?",
    a: "Ten Miles Ahead is a dynamic travel journal app designed for modern explorers to log their trips, create photo stories, and share their adventures with a global community.",
  },
  {
    q: "How do I log a new trip?",
    a: "Click on the 'Add Trip' button from your dashboard, fill in the details like destination, dates, and description, and save it.",
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
    q: "How do I contact support?",
    a: "Email us at admin@tenmilesahead.com.",
  },
];

export default function FAQsScreen({ navigation }) {
  const [expandedIndex, setExpandedIndex] = useState(null);

  const toggleExpand = (index) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Frequently Asked Questions</Text>

      {FAQS.map((item, index) => (
        <TouchableOpacity
          key={index}
          style={styles.card}
          onPress={() => toggleExpand(index)}
          activeOpacity={0.7}
        >
          <View style={styles.questionRow}>
            <Text style={styles.question}>{item.q}</Text>
            <Text style={styles.arrow}>
              {expandedIndex === index ? "−" : "+"}
            </Text>
          </View>
          {expandedIndex === index && (
            <Text style={styles.answer}>{item.a}</Text>
          )}
        </TouchableOpacity>
      ))}

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
    padding: scaleSpacing(SPACING.md),
  },
  title: {
    fontSize: scaleFontSize(28),
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.lg),
    marginTop: 20,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(12),
    padding: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.sm),
  },
  questionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  question: {
    flex: 1,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
    color: COLORS.foreground,
    paddingRight: scaleSpacing(SPACING.sm),
  },
  arrow: {
    fontSize: scaleFontSize(20),
    color: COLORS.muted,
  },
  answer: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginTop: scaleSpacing(SPACING.md),
    lineHeight: scaleFontSize(22),
  },
  backButton: {
    alignItems: "center",
    paddingVertical: scaleSpacing(SPACING.lg),
    marginTop: scaleSpacing(SPACING.md),
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(16),
  },
});
