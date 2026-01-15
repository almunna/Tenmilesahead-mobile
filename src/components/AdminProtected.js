import React from "react";
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useAuth } from "./AuthProvider";
import { useNavigation } from "@react-navigation/native";
import { COLORS, SPACING, SCREENS } from "../lib/constants";

export default function AdminProtected({ children }) {
  const { user, loading, profile } = useAuth();
  const navigation = useNavigation();

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Sign in required</Text>
          <Text style={styles.description}>Please sign in to continue.</Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate(SCREENS.ADMIN_LOGIN)}
          >
            <Text style={styles.buttonText}>Admin Login</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Check for admin role
  if (profile?.role !== "admin") {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.title}>Access Denied</Text>
          <Text style={styles.description}>
            You don't have permission to access this area.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate(SCREENS.HOME)}
          >
            <Text style={styles.buttonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  description: {
    fontSize: 16,
    color: COLORS.muted,
    marginBottom: SPACING.lg,
  },
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    color: COLORS.muted,
    marginTop: SPACING.md,
    fontSize: 16,
  },
});
