import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from "react-native";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../lib/firebase";
import { COLORS, SPACING, SCREENS, scaleFontSize, scaleSpacing } from "../lib/constants";

export default function SigninScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSignIn() {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigation will be handled by auth state change
    } catch (err) {
      let message = "Sign in failed. Please try again.";
      if (err.code === "auth/user-not-found") {
        message = "No account found with this email.";
      } else if (err.code === "auth/wrong-password") {
        message = "Incorrect password.";
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email address.";
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    if (!resetEmail) {
      Alert.alert("Error", "Please enter your email address.");
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail);
      Alert.alert("Success", "Password reset email sent! Check your inbox.");
      setShowForgotPassword(false);
      setResetEmail("");
    } catch (err) {
      let message = "Failed to send reset email. Please try again.";
      if (err.code === "auth/user-not-found") {
        message = "No account found with this email address.";
      } else if (err.code === "auth/invalid-email") {
        message = "Please enter a valid email address.";
      }
      Alert.alert("Error", message);
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.title}>Sign In</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={COLORS.muted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>

          <TouchableOpacity
            style={styles.forgotButton}
            onPress={() => {
              setShowForgotPassword(true);
              setResetEmail(email);
            }}
          >
            <Text style={styles.forgotButtonText}>Forgot password?</Text>
          </TouchableOpacity>

          {error && <Text style={styles.errorText}>{error}</Text>}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? "Signing in..." : "Sign In"}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>No account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.SIGNUP)}>
              <Text style={styles.linkText}>Create one</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        animationType="fade"
        transparent
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <TouchableOpacity onPress={() => setShowForgotPassword(false)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.modalDescription}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={COLORS.muted}
              value={resetEmail}
              onChangeText={setResetEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowForgotPassword(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, resetLoading && styles.buttonDisabled]}
                onPress={handleForgotPassword}
                disabled={resetLoading}
              >
                <Text style={styles.buttonText}>
                  {resetLoading ? "Sending..." : "Send Reset Link"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: scaleSpacing(SPACING.lg),
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(16),
    padding: scaleSpacing(SPACING.lg),
  },
  title: {
    fontSize: scaleFontSize(28),
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.lg),
  },
  inputGroup: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  label: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  input: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: scaleFontSize(8),
    padding: scaleSpacing(SPACING.md),
    color: COLORS.foreground,
    fontSize: scaleFontSize(16),
  },
  forgotButton: {
    alignSelf: "flex-end",
    marginBottom: scaleSpacing(SPACING.md),
  },
  forgotButtonText: {
    fontSize: scaleFontSize(14),
    color: COLORS.primary,
  },
  errorText: {
    color: COLORS.error,
    fontSize: scaleFontSize(14),
    marginBottom: scaleSpacing(SPACING.md),
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: scaleSpacing(SPACING.lg),
  },
  footerText: {
    color: COLORS.muted,
    fontSize: scaleFontSize(14),
  },
  linkText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(14),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: scaleSpacing(SPACING.lg),
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(16),
    padding: scaleSpacing(SPACING.lg),
    width: "100%",
    maxWidth: scaleFontSize(400),
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleSpacing(SPACING.md),
  },
  modalTitle: {
    fontSize: scaleFontSize(20),
    fontWeight: "600",
    color: COLORS.foreground,
  },
  closeButton: {
    fontSize: scaleFontSize(20),
    color: COLORS.muted,
    padding: scaleSpacing(SPACING.xs),
  },
  modalDescription: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
    marginBottom: scaleSpacing(SPACING.lg),
    lineHeight: scaleFontSize(20),
  },
  modalButtons: {
    flexDirection: "row",
    gap: scaleSpacing(SPACING.sm),
    marginTop: scaleSpacing(SPACING.md),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cancelButtonText: {
    color: COLORS.foreground,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
});
