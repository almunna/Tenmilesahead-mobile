import React, { useState, useEffect } from "react";
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
import { signInWithEmailAndPassword, sendPasswordResetEmail, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { auth } from "../lib/firebase";
import { COLORS, SPACING, SCREENS, scaleFontSize, scaleSpacing, GOOGLE_OAUTH_CONFIG } from "../lib/constants";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const EXPO_REDIRECT_URI = "https://auth.expo.io/@almunna/ten-miles-ahead";
// Dev-only client secret for Expo Go testing (move to server for production)
const GOOGLE_CLIENT_SECRET = "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";

export default function SigninScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Forgot password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Google OAuth
  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_OAUTH_CONFIG.webClientId,
    iosClientId: GOOGLE_OAUTH_CONFIG.iosClientId,
    androidClientId: GOOGLE_OAUTH_CONFIG.androidClientId,
    redirectUri: EXPO_REDIRECT_URI,
  });

  useEffect(() => {
    if (response?.type === "success") {
      handleGoogleResponse(response);
    } else if (response?.type === "error") {
      setGoogleLoading(false);
      setError("Google sign in failed. Please try again.");
    }
  }, [response]);

  async function handleGoogleResponse(authResponse) {
    try {
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: GOOGLE_OAUTH_CONFIG.webClientId,
          clientSecret: GOOGLE_CLIENT_SECRET,
          code: authResponse.params.code,
          redirectUri: EXPO_REDIRECT_URI,
          codeVerifier: request?.codeVerifier,
        },
        { tokenEndpoint: "https://oauth2.googleapis.com/token" }
      );
      const credential = GoogleAuthProvider.credential(
        tokenResult.idToken,
        tokenResult.accessToken
      );
      await signInWithCredential(auth, credential);
      // Navigation handled by auth state change in AuthProvider
    } catch (err) {
      let message = "Google sign in failed. Please try again.";
      if (err.code === "auth/account-exists-with-different-credential") {
        message = "An account already exists with the same email. Sign in with email & password.";
      }
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    await promptAsync();
  }

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
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor={COLORS.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeIcon}>{showPassword ? "👁" : "👁‍🗨"}</Text>
              </TouchableOpacity>
            </View>
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

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, (googleLoading || !request) && styles.buttonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading || !request}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>
              {googleLoading ? "Signing in with Google..." : "Continue with Google"}
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
    paddingTop: 10,
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
  passwordContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceLight,
    borderRadius: scaleFontSize(8),
  },
  passwordInput: {
    flex: 1,
    padding: scaleSpacing(SPACING.md),
    color: COLORS.foreground,
    fontSize: scaleFontSize(16),
  },
  eyeButton: {
    padding: scaleSpacing(SPACING.md),
  },
  eyeIcon: {
    fontSize: scaleFontSize(18),
    color: COLORS.muted,
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: scaleSpacing(SPACING.md),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.muted,
    fontSize: scaleFontSize(13),
    marginHorizontal: scaleSpacing(SPACING.sm),
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
    gap: scaleSpacing(SPACING.sm),
  },
  googleIcon: {
    fontSize: scaleFontSize(18),
    fontWeight: "700",
    color: "#4285F4",
  },
  googleButtonText: {
    color: COLORS.foreground,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
});
