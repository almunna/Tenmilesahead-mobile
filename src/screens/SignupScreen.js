import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithCredential } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { COLORS, SPACING, SCREENS, scaleFontSize, scaleSpacing, GOOGLE_OAUTH_CONFIG } from "../lib/constants";
import * as Google from "expo-auth-session/providers/google";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";

WebBrowser.maybeCompleteAuthSession();

const EXPO_REDIRECT_URI = "https://auth.expo.io/@almunna/ten-miles-ahead";
// Dev-only client secret for Expo Go testing (move to server for production)
const GOOGLE_CLIENT_SECRET = "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";

export default function SignupScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

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
      setError("Google sign up failed. Please try again.");
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
      const userCredential = await signInWithCredential(auth, credential);
      const user = userCredential.user;

      // Create profile only if it doesn't already exist
      const ref = doc(db, "users", user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          email: user.email || null,
          username: user.displayName || "",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      // Navigation handled by auth state change in AuthProvider
    } catch (err) {
      let message = "Google sign up failed. Please try again.";
      if (err.code === "auth/account-exists-with-different-credential") {
        message = "An account already exists with this email. Sign in with email & password.";
      }
      setError(message);
    } finally {
      setGoogleLoading(false);
    }
  }

  async function handleGoogleSignUp() {
    if (!agreedToTerms) {
      setError("You must agree to the Privacy Policy and Terms of Service");
      return;
    }
    setError(null);
    setGoogleLoading(true);
    await promptAsync();
  }

  async function handleSignUp() {
    if (!email || !username || !password || !confirmPassword) {
      setError("Please fill in all fields");
      return;
    }

    if (!agreedToTerms) {
      setError("You must agree to the Privacy Policy and Terms of Service");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const user = userCredential.user;

      // Create user profile document
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        username: username,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Navigation will be handled by auth state change
    } catch (err) {
      let message = "Sign up failed. Please try again.";
      if (err.code === "auth/email-already-in-use") {
        message = "An account with this email already exists.";
      } else if (err.code === "auth/invalid-email") {
        message = "Invalid email address.";
      } else if (err.code === "auth/weak-password") {
        message = "Password is too weak.";
      }
      setError(message);
    } finally {
      setLoading(false);
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
          <Text style={styles.title}>Create Account</Text>

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
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Choose a username"
              placeholderTextColor={COLORS.muted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Create a password"
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

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Confirm Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Confirm your password"
                placeholderTextColor={COLORS.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Text style={styles.eyeIcon}>{showConfirmPassword ? "👁" : "👁‍🗨"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {error && <Text style={styles.errorText}>{error}</Text>}

          {/* Privacy & Terms Consent */}
          <TouchableOpacity
            style={styles.consentRow}
            onPress={() => setAgreedToTerms(!agreedToTerms)}
            activeOpacity={0.7}
          >
            <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
              {agreedToTerms && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={styles.consentText}>
              I agree to the{" "}
              <Text
                style={styles.consentLink}
                onPress={() => navigation.navigate(SCREENS.PRIVACY)}
              >
                Privacy Policy
              </Text>
              {" "}and{" "}
              <Text
                style={styles.consentLink}
                onPress={() => navigation.navigate(SCREENS.TERMS)}
              >
                Terms of Service
              </Text>
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, (loading || !agreedToTerms) && styles.buttonDisabled]}
            onPress={handleSignUp}
            disabled={loading || !agreedToTerms}
          >
            <Text style={styles.buttonText}>
              {loading ? "Creating account..." : "Create Account"}
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google Sign-Up Button */}
          <TouchableOpacity
            style={[styles.googleButton, (googleLoading || !request) && styles.buttonDisabled]}
            onPress={handleGoogleSignUp}
            disabled={googleLoading || !request}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleButtonText}>
              {googleLoading ? "Signing up with Google..." : "Continue with Google"}
            </Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate(SCREENS.SIGNIN)}>
              <Text style={styles.linkText}>Sign in</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    marginTop: scaleSpacing(SPACING.sm),
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
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: scaleSpacing(SPACING.md),
    gap: scaleSpacing(SPACING.sm),
  },
  checkbox: {
    width: scaleFontSize(22),
    height: scaleFontSize(22),
    borderRadius: scaleFontSize(4),
    borderWidth: 2,
    borderColor: COLORS.muted,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: scaleFontSize(14),
    fontWeight: "bold",
  },
  consentText: {
    flex: 1,
    fontSize: scaleFontSize(13),
    color: COLORS.muted,
    lineHeight: scaleFontSize(20),
  },
  consentLink: {
    color: COLORS.primary,
    textDecorationLine: "underline",
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
