import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  ActivityIndicator,
} from "react-native";
import { doc, updateDoc, deleteDoc, collection, query, where, getDocs, writeBatch } from "firebase/firestore";
import { deleteUser } from "firebase/auth";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import Protected from "../components/Protected";
import FeedbackModal from "../components/modals/FeedbackModal";
import { COLORS, SPACING, SCREENS, scaleFontSize, scaleSpacing } from "../lib/constants";

export default function ProfileScreen({ navigation }) {
  return (
    <Protected>
      <ProfileInner navigation={navigation} />
    </Protected>
  );
}

function ProfileInner({ navigation }) {
  const { user, profile, signOutNow, refreshProfile } = useAuth();
  const [editing, setEditing] = useState(false);
  const [username, setUsername] = useState(profile?.username || "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [feedbackVisible, setFeedbackVisible] = useState(false);

  async function handleSave() {
    if (!username.trim()) {
      Alert.alert("Error", "Username cannot be empty");
      return;
    }

    if (username.length < 3) {
      Alert.alert("Error", "Username must be at least 3 characters");
      return;
    }

    setSaving(true);
    try {
      await updateDoc(doc(db, "users", user.uid), {
        username: username.trim(),
        updatedAt: Date.now(),
      });
      await refreshProfile();
      setEditing(false);
      Alert.alert("Success", "Profile updated successfully");
    } catch (error) {
      Alert.alert("Error", "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAccount() {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This will remove all your data including trips, photos, and subscription. This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              // Delete user's trips
              const tripsQuery = query(
                collection(db, "trips"),
                where("userId", "==", user.uid)
              );
              const tripsSnapshot = await getDocs(tripsQuery);
              const batch = writeBatch(db);
              tripsSnapshot.forEach((doc) => batch.delete(doc.ref));
              await batch.commit();

              // Delete user profile document
              await deleteDoc(doc(db, "users", user.uid));

              // Delete Firebase Auth account
              await deleteUser(user);

              Alert.alert("Account Deleted", "Your account and all data have been permanently deleted.");
            } catch (error) {
              if (error.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Re-authentication Required",
                  "For security, please sign out and sign back in, then try deleting your account again."
                );
              } else {
                Alert.alert("Error", "Failed to delete account. Please try again.");
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  // Check subscription (must have valid status AND not expired)
  const subscription = profile?.subscription;
  const subscriptionStatus = subscription?.status || "none";
  const isActive =
    (subscriptionStatus === "active" || subscriptionStatus === "trialing") &&
    subscription?.currentPeriodEnd > Date.now();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile?.photoURL ? (
            <Image source={{ uri: profile.photoURL }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>
                {(profile?.username || "U")[0].toUpperCase()}
              </Text>
            </View>
          )}
        </View>
        <Text style={styles.username}>{profile?.username || "username"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      {/* Edit Profile */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Profile</Text>

        {editing ? (
          <>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              placeholder="Enter username"
              placeholderTextColor={COLORS.muted}
              autoCapitalize="none"
            />
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setEditing(false);
                  setUsername(profile?.username || "");
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveButtonText}>
                  {saving ? "Saving..." : "Save"}
                </Text>
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Username</Text>
              <Text style={styles.infoValue}>{profile?.username}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{user?.email}</Text>
            </View>
            <TouchableOpacity
              style={styles.editButton}
              onPress={() => setEditing(true)}
            >
              <Text style={styles.editButtonText}>Edit Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Subscription */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Subscription</Text>

        <View style={styles.subscriptionCard}>
          <View style={styles.subscriptionHeader}>
            <Text style={styles.subscriptionPlan}>
              {subscription?.plan
                ? subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)
                : "No Plan"}
            </Text>
            <View
              style={[
                styles.statusBadge,
                isActive ? styles.statusActive : styles.statusInactive,
              ]}
            >
              <Text style={styles.statusText}>
                {subscriptionStatus.charAt(0).toUpperCase() + subscriptionStatus.slice(1)}
              </Text>
            </View>
          </View>

          {subscription?.currentPeriodEnd && (
            <Text style={styles.subscriptionInfo}>
              {subscription.cancelAtPeriodEnd
                ? "Cancels on: "
                : "Renews on: "}
              {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={styles.manageButton}
          onPress={() => navigation.navigate(SCREENS.SUBSCRIBE)}
        >
          <Text style={styles.manageButtonText}>Manage Subscription</Text>
        </TouchableOpacity>
      </View>

      {/* Account Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate(SCREENS.PRIVACY)}
        >
          <Text style={styles.linkButtonText}>Privacy Policy</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate(SCREENS.TERMS)}
        >
          <Text style={styles.linkButtonText}>Terms of Service</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate(SCREENS.FAQS)}
        >
          <Text style={styles.linkButtonText}>FAQs</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.linkButton}
          onPress={() => navigation.navigate(SCREENS.HELP_SUPPORT)}
        >
          <Text style={styles.linkButtonText}>Help & Support</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkButton, styles.linkButtonLast]}
          onPress={() => setFeedbackVisible(true)}
        >
          <Text style={styles.linkButtonText}>Send Feedback</Text>
          <Text style={styles.linkArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Sign Out */}
      <TouchableOpacity style={styles.signOutButton} onPress={signOutNow}>
        <Text style={styles.signOutButtonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Delete Account */}
      <TouchableOpacity
        style={[styles.deleteAccountButton, deleting && styles.buttonDisabled]}
        onPress={handleDeleteAccount}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator color={COLORS.error} />
        ) : (
          <Text style={styles.deleteAccountText}>Delete My Account</Text>
        )}
      </TouchableOpacity>

      <Text style={styles.versionText}>Ten Miles Ahead v1.0.0</Text>

      <FeedbackModal
        visible={feedbackVisible}
        onClose={() => setFeedbackVisible(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 10,
    backgroundColor: COLORS.background,
  },
  content: {
    padding: scaleSpacing(SPACING.md),
  },
  header: {
    alignItems: "center",
    marginBottom: scaleSpacing(SPACING.xl),
    paddingVertical: scaleSpacing(SPACING.lg),
  },
  avatarContainer: {
    marginBottom: scaleSpacing(SPACING.md),
  },
  avatar: {
    width: scaleFontSize(100),
    height: scaleFontSize(100),
    borderRadius: scaleFontSize(50),
  },
  avatarPlaceholder: {
    width: scaleFontSize(100),
    height: scaleFontSize(100),
    borderRadius: scaleFontSize(50),
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: scaleFontSize(40),
    fontWeight: "bold",
    color: COLORS.white,
  },
  username: {
    fontSize: scaleFontSize(24),
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: scaleSpacing(SPACING.xs),
  },
  email: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },
  section: {
    backgroundColor: COLORS.surface,
    borderRadius: scaleFontSize(12),
    padding: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.md),
  },
  sectionTitle: {
    fontSize: scaleFontSize(16),
    fontWeight: "600",
    color: COLORS.foreground,
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
    marginBottom: scaleSpacing(SPACING.md),
  },
  buttonRow: {
    flexDirection: "row",
    gap: scaleSpacing(SPACING.sm),
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
  },
  saveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
    alignItems: "center",
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: scaleSpacing(SPACING.sm),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  infoLabel: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },
  infoValue: {
    fontSize: scaleFontSize(14),
    color: COLORS.foreground,
  },
  editButton: {
    marginTop: scaleSpacing(SPACING.md),
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  editButtonText: {
    color: COLORS.primary,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  subscriptionCard: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: scaleFontSize(8),
    padding: scaleSpacing(SPACING.md),
    marginBottom: scaleSpacing(SPACING.md),
  },
  subscriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scaleSpacing(SPACING.sm),
  },
  subscriptionPlan: {
    fontSize: scaleFontSize(18),
    fontWeight: "600",
    color: COLORS.foreground,
  },
  statusBadge: {
    paddingVertical: scaleSpacing(SPACING.xs),
    paddingHorizontal: scaleSpacing(SPACING.sm),
    borderRadius: scaleFontSize(4),
  },
  statusActive: {
    backgroundColor: COLORS.success,
  },
  statusInactive: {
    backgroundColor: COLORS.muted,
  },
  statusText: {
    fontSize: scaleFontSize(12),
    color: COLORS.white,
    fontWeight: "600",
  },
  subscriptionInfo: {
    fontSize: scaleFontSize(14),
    color: COLORS.muted,
  },
  manageButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
    alignItems: "center",
  },
  manageButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  linkButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: scaleSpacing(SPACING.md),
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  linkButtonText: {
    fontSize: scaleFontSize(16),
    color: COLORS.foreground,
  },
  linkArrow: {
    fontSize: scaleFontSize(20),
    color: COLORS.muted,
  },
  linkButtonLast: {
    borderBottomWidth: 0,
  },
  signOutButton: {
    backgroundColor: COLORS.error,
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
    alignItems: "center",
    marginTop: scaleSpacing(SPACING.md),
  },
  signOutButtonText: {
    color: COLORS.white,
    fontSize: scaleFontSize(16),
    fontWeight: "600",
  },
  deleteAccountButton: {
    paddingVertical: scaleSpacing(SPACING.md),
    borderRadius: scaleFontSize(8),
    alignItems: "center",
    marginTop: scaleSpacing(SPACING.sm),
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  deleteAccountText: {
    color: COLORS.error,
    fontSize: scaleFontSize(14),
    fontWeight: "500",
  },
  versionText: {
    textAlign: "center",
    color: COLORS.muted,
    fontSize: scaleFontSize(12),
    marginTop: scaleSpacing(SPACING.lg),
    marginBottom: scaleSpacing(SPACING.xl),
  },
});
