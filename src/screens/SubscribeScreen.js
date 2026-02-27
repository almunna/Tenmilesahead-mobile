import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { doc, updateDoc } from "firebase/firestore";
import Purchases from "react-native-purchases";
import { db } from "../lib/firebase";
import { useAuth } from "../components/AuthProvider";
import Protected from "../components/Protected";
import { COLORS, SPACING, SCREENS, API_ENDPOINTS } from "../lib/constants";

// Only import Stripe on Android
const useStripeHook = Platform.OS === "android"
  ? require("@stripe/stripe-react-native").useStripe
  : () => ({});

const plans = [
  {
    id: "trial",
    name: "7-Day Free Trial",
    description: "Try all premium features free for 7 days. No credit card required!",
    price: "$0",
    period: "/7 days",
    badge: "100% Free",
    features: [
      "Smart Trip Management",
      "Photo Uploader with captions",
      "Flipbook Viewer",
      "Flexible Date Editing",
      "Advanced Exports (CSV, PDF)",
      "Private Share Links",
      "Global Reviews",
      "Multi-Device Access",
    ],
    buttonText: "Start Free Trial",
  },
  {
    id: "monthly",
    name: "Monthly Pro",
    description: "Perfect for trying out our premium features with full flexibility.",
    price: "$3.99",
    period: "/month",
    features: [
      "Smart Trip Management",
      "Photo Uploader with captions",
      "Flipbook Viewer",
      "Flexible Date Editing",
      "Advanced Exports (CSV, PDF)",
      "Private Share Links",
      "Global Reviews",
      "Multi-Device Access",
    ],
    buttonText: "Get Started - $3.99/month",
  },
  {
    id: "annual",
    name: "Annual Pro",
    description: "Best value plan with significant savings for committed users.",
    price: "$39.99",
    period: "/year",
    badge: "Save 17%",
    highlighted: true,
    features: [
      "Smart Trip Management",
      "Photo Uploader with captions",
      "Flipbook Viewer",
      "Flexible Date Editing",
      "Advanced Exports (CSV, PDF)",
      "Private Share Links",
      "Global Reviews",
      "Multi-Device Access",
    ],
    buttonText: "Get Started - $39.99/year",
  },
];

const PLAN_DETAILS = {
  trial: { name: "Free Trial", price: "$0.00" },
  monthly: { name: "Monthly Pro", price: "$3.99" },
  annual: { name: "Annual Pro", price: "$39.99" },
};

const BENEFITS = [
  "Smart Trip Management",
  "Photo Uploader with captions",
  "Flipbook Viewer",
  "Flexible Date Editing",
  "Advanced Exports (CSV, PDF)",
  "Private Share Links",
  "Global Reviews",
  "Multi-Device Access",
];

export default function SubscribeScreen({ navigation }) {
  return (
    <Protected>
      <SubscribeInner navigation={navigation} />
    </Protected>
  );
}

function SubscribeInner({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();

  // Check subscription (must have valid status AND not expired)
  const subscription = profile?.subscription;
  const isActive =
    (subscription?.status === "active" || subscription?.status === "trialing") &&
    !subscription?.cancelAtPeriodEnd &&
    subscription?.currentPeriodEnd > Date.now();

  if (isActive) {
    return <SubscriptionManagement navigation={navigation} />;
  }

  return <PricingPlans navigation={navigation} />;
}

function SubscriptionManagement({ navigation }) {
  const { profile, refreshProfile } = useAuth();
  const [canceling, setCanceling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const subscription = profile?.subscription;
  const planDetails = PLAN_DETAILS[subscription?.plan || "monthly"];

  const getValidUntilDate = () => {
    if (subscription?.currentPeriodEnd) {
      return new Date(subscription.currentPeriodEnd);
    }
    const now = new Date();
    switch (subscription?.plan) {
      case "trial":
        return new Date(now.setDate(now.getDate() + 7));
      case "annual":
        return new Date(now.setFullYear(now.getFullYear() + 1));
      case "monthly":
      default:
        return new Date(now.setMonth(now.getMonth() + 1));
    }
  };

  const validUntilDate = getValidUntilDate();
  const validUntil = validUntilDate.toLocaleDateString("en-US", {
    month: "2-digit",
    day: "2-digit",
    year: "numeric",
  });

  const handleCancelSubscription = async () => {
    // On iOS, redirect to Apple's subscription management
    if (Platform.OS === "ios" && subscription?.plan !== "trial") {
      Linking.openURL("https://apps.apple.com/account/subscriptions");
      setShowCancelConfirm(false);
      return;
    }

    // For Android (Stripe) and trial plans, handle locally
    setCanceling(true);
    try {
      if (profile?.uid) {
        const userRef = doc(db, "users", profile.uid);
        await updateDoc(userRef, {
          "subscription.cancelAtPeriodEnd": true,
          updatedAt: Date.now(),
        });
        await refreshProfile();
        Alert.alert("Subscription Canceled", `Your subscription will end on ${validUntil}`);
        setShowCancelConfirm(false);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to cancel subscription. Please try again.");
    } finally {
      setCanceling(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.headerCard}>
        <View style={styles.headerRow}>
          <View style={styles.headerIconContainer}>
            <Text style={styles.headerIcon}>✓</Text>
          </View>
          <Text style={styles.headerLabel}>Active Subscription</Text>
        </View>
        <Text style={styles.headerTitle}>Your Subscription</Text>
        <Text style={styles.headerSubtitle}>Manage your current plan and billing details</Text>
      </View>

      {/* Main Card */}
      <View style={styles.card}>
        <View style={styles.planHeader}>
          <View>
            <View style={styles.premiumRow}>
              <View style={styles.statusDot} />
              <Text style={styles.premiumLabel}>Premium Member</Text>
            </View>
            <Text style={styles.planName}>{planDetails.name}</Text>
          </View>
        </View>

        <View style={styles.detailsGrid}>
          <View style={styles.detailCard}>
            <Text style={styles.detailLabel}>Current Plan</Text>
            <Text style={styles.detailValue}>{planDetails.name}</Text>
          </View>
          <View style={[styles.detailCard, styles.detailCardHighlight]}>
            <Text style={styles.detailLabel}>Last Payment</Text>
            <Text style={[styles.detailValue, styles.primaryText]}>{planDetails.price}</Text>
          </View>
        </View>

        <View style={styles.detailCard}>
          <Text style={styles.detailLabel}>Valid Until</Text>
          <Text style={styles.detailValue}>{validUntil}</Text>
        </View>

        {subscription?.cancelAtPeriodEnd ? (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>
              Your subscription will be canceled on {validUntil}. You can continue using all features until then.
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelConfirm(true)}
          >
            <Text style={styles.cancelButtonText}>
              {Platform.OS === "ios" && subscription?.plan !== "trial"
                ? "Manage Subscription"
                : "Cancel Subscription"}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Benefits Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Your Benefits</Text>
        {BENEFITS.map((benefit, idx) => (
          <View key={idx} style={styles.benefitRow}>
            <View style={styles.benefitDot} />
            <Text style={styles.benefitText}>{benefit}</Text>
          </View>
        ))}
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>

      {/* Cancel Confirmation Modal */}
      {showCancelConfirm && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {Platform.OS === "ios" && subscription?.plan !== "trial"
                ? "Manage Subscription"
                : "Cancel Subscription?"}
            </Text>
            <Text style={styles.modalText}>
              {Platform.OS === "ios" && subscription?.plan !== "trial"
                ? "You'll be redirected to Apple's subscription management where you can cancel or modify your subscription."
                : `Are you sure you want to cancel your subscription? You'll continue to have access until ${validUntil}, but your subscription won't renew.`}
            </Text>
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalKeepButton}
                onPress={() => setShowCancelConfirm(false)}
                disabled={canceling}
              >
                <Text style={styles.modalKeepButtonText}>Go Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalCancelButton, canceling && styles.buttonDisabled]}
                onPress={handleCancelSubscription}
                disabled={canceling}
              >
                {canceling ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.modalCancelButtonText}>
                    {Platform.OS === "ios" && subscription?.plan !== "trial"
                      ? "Continue"
                      : "Yes, Cancel"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function PricingPlans({ navigation }) {
  const { user, profile, refreshProfile } = useAuth();
  const [loading, setLoading] = useState(null);
  const [rcOfferings, setRcOfferings] = useState(null);
  const [restoringPurchases, setRestoringPurchases] = useState(false);

  // Stripe hook (only used on Android)
  const { initPaymentSheet, presentPaymentSheet } = useStripeHook();

  // Check if user has already used their free trial
  const hasUsedTrial = profile?.hasUsedTrial === true;

  // Filter out trial plan if already used
  const availablePlans = hasUsedTrial
    ? plans.filter((plan) => plan.id !== "trial")
    : plans;

  // Fetch RevenueCat offerings on iOS
  useEffect(() => {
    if (Platform.OS === "ios") {
      fetchOfferings();
    }
  }, []);

  const fetchOfferings = async () => {
    try {
      const offerings = await Purchases.getOfferings();
      if (offerings.current) {
        setRcOfferings(offerings.current);
      }
    } catch (error) {
    }
  };

  // Get the RevenueCat package for a plan ID
  const getRcPackage = (planId) => {
    if (!rcOfferings) return null;
    if (planId === "monthly") {
      return rcOfferings.availablePackages.find(
        (pkg) => pkg.packageType === "MONTHLY" || pkg.product.identifier === "tma_monthly_pro"
      );
    }
    if (planId === "annual") {
      return rcOfferings.availablePackages.find(
        (pkg) => pkg.packageType === "ANNUAL" || pkg.product.identifier === "tma_annual_pro"
      );
    }
    return null;
  };

  // Get display price from RevenueCat (localized) or fallback to static
  const getDisplayPrice = (plan) => {
    if (Platform.OS === "ios" && rcOfferings) {
      const pkg = getRcPackage(plan.id);
      if (pkg) {
        return pkg.product.priceString;
      }
    }
    return plan.price;
  };

  // Get button text with localized price on iOS
  const getButtonText = (plan) => {
    if (plan.id === "trial") return plan.buttonText;
    if (Platform.OS === "ios" && rcOfferings) {
      const pkg = getRcPackage(plan.id);
      if (pkg) {
        return `Get Started - ${pkg.product.priceString}${plan.period}`;
      }
    }
    return plan.buttonText;
  };

  // Handle iOS purchase via RevenueCat
  const handleIOSPurchase = async (planId) => {
    const pkg = getRcPackage(planId);
    if (!pkg) {
      Alert.alert("Error", "Subscription package not available. Please try again later.");
      return;
    }

    setLoading(planId);
    try {
      // Identify the user in RevenueCat with their Firebase UID
      await Purchases.logIn(user.uid);

      // Initiate the purchase
      const { customerInfo } = await Purchases.purchasePackage(pkg);

      // Check if the purchase granted the "pro" entitlement
      const isProActive = customerInfo.entitlements.active["pro"] !== undefined;

      if (isProActive) {
        // Get expiration date from the entitlement
        const proEntitlement = customerInfo.entitlements.active["pro"];
        const expirationDate = proEntitlement.expirationDate
          ? new Date(proEntitlement.expirationDate).getTime()
          : planId === "annual"
            ? Date.now() + 365 * 24 * 60 * 60 * 1000
            : Date.now() + 30 * 24 * 60 * 60 * 1000;

        // Update Firebase with subscription data
        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          subscription: {
            status: "active",
            plan: planId,
            currentPeriodEnd: expirationDate,
            cancelAtPeriodEnd: false,
            purchaseSource: "apple",
          },
          updatedAt: Date.now(),
        });

        await refreshProfile();
        Alert.alert(
          "Success!",
          `Your ${planId === "annual" ? "annual" : "monthly"} subscription is now active!`
        );
      }
    } catch (error) {
      if (error.userCancelled) {
        // User cancelled - not an error
        return;
      }
      Alert.alert("Error", error.message || "Failed to process purchase. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  // Handle Android purchase via Stripe (existing flow)
  const handleAndroidPurchase = async (planId) => {
    setLoading(planId);
    try {
      // 1. Create subscription on backend and get client secret
      const response = await fetch(API_ENDPOINTS.CREATE_SUBSCRIPTION, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: planId,
          userId: user.uid,
          userEmail: user.email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create subscription");
      }

      const { clientSecret, subscriptionId, customerId } = data;

      // 2. Initialize the Payment Sheet
      const { error: initError } = await initPaymentSheet({
        paymentIntentClientSecret: clientSecret,
        merchantDisplayName: "Ten Miles Ahead",
        style: "automatic",
      });

      if (initError) {
        throw new Error(initError.message);
      }

      // 3. Present the Payment Sheet
      const { error: paymentError } = await presentPaymentSheet();

      if (paymentError) {
        if (paymentError.code === "Canceled") {
          return;
        }
        throw new Error(paymentError.message);
      }

      // 4. Payment successful - update local profile
      const userRef = doc(db, "users", user.uid);
      const periodEnd = planId === "annual"
        ? Date.now() + 365 * 24 * 60 * 60 * 1000
        : Date.now() + 30 * 24 * 60 * 60 * 1000;

      await updateDoc(userRef, {
        subscription: {
          status: "active",
          plan: planId,
          stripeCustomerId: customerId,
          stripeSubscriptionId: subscriptionId,
          currentPeriodEnd: periodEnd,
          cancelAtPeriodEnd: false,
          purchaseSource: "stripe",
        },
        updatedAt: Date.now(),
      });

      await refreshProfile();
      Alert.alert(
        "Success!",
        `Your ${planId === "annual" ? "annual" : "monthly"} subscription is now active!`
      );
    } catch (error) {
      Alert.alert("Error", error.message || "Failed to process payment. Please try again.");
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async (planId) => {
    if (!user) {
      navigation.navigate(SCREENS.SIGNIN);
      return;
    }

    if (planId === "trial") {
      // Double-check: prevent trial if already used
      if (hasUsedTrial) {
        Alert.alert(
          "Trial Already Used",
          "You have already used your free trial. Please choose a paid plan to continue."
        );
        return;
      }

      setLoading(planId);
      try {
        const userRef = doc(db, "users", user.uid);
        const trialEndDate = Date.now() + 7 * 24 * 60 * 60 * 1000;

        await updateDoc(userRef, {
          subscription: {
            status: "trialing",
            plan: "trial",
            currentPeriodEnd: trialEndDate,
            cancelAtPeriodEnd: false,
          },
          hasUsedTrial: true,
          updatedAt: Date.now(),
        });

        await refreshProfile();
        Alert.alert("Success", "Your free trial has started!");
      } catch (error) {
        Alert.alert("Error", "Failed to start trial. Please try again.");
      } finally {
        setLoading(null);
      }
      return;
    }

    // For paid plans: use RevenueCat on iOS, Stripe on Android
    if (Platform.OS === "ios") {
      await handleIOSPurchase(planId);
    } else {
      await handleAndroidPurchase(planId);
    }
  };

  // Restore purchases (iOS only - Apple requires this)
  const handleRestorePurchases = async () => {
    setRestoringPurchases(true);
    try {
      await Purchases.logIn(user.uid);
      const customerInfo = await Purchases.restorePurchases();
      const isProActive = customerInfo.entitlements.active["pro"] !== undefined;

      if (isProActive) {
        const proEntitlement = customerInfo.entitlements.active["pro"];
        const expirationDate = proEntitlement.expirationDate
          ? new Date(proEntitlement.expirationDate).getTime()
          : Date.now() + 30 * 24 * 60 * 60 * 1000;

        // Determine plan type from the product identifier
        const productId = proEntitlement.productIdentifier;
        const plan = productId.includes("annual") ? "annual" : "monthly";

        const userRef = doc(db, "users", user.uid);
        await updateDoc(userRef, {
          subscription: {
            status: "active",
            plan,
            currentPeriodEnd: expirationDate,
            cancelAtPeriodEnd: false,
            purchaseSource: "apple",
          },
          updatedAt: Date.now(),
        });

        await refreshProfile();
        Alert.alert("Restored!", "Your subscription has been restored successfully.");
      } else {
        Alert.alert("No Subscription Found", "No active subscription was found to restore.");
      }
    } catch (error) {
      Alert.alert("Error", "Failed to restore purchases. Please try again.");
    } finally {
      setRestoringPurchases(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.pricingHeader}>
        <Text style={styles.pricingTitle}>Choose Your Plan</Text>
        <Text style={styles.pricingSubtitle}>
          Unlock the full potential of Ten Miles Ahead with our premium features.
        </Text>
      </View>

      {/* Pricing Cards - trial plan hidden if already used */}
      {availablePlans.map((plan) => (
        <View
          key={plan.id}
          style={[
            styles.pricingCard,
            plan.highlighted && styles.pricingCardHighlighted,
          ]}
        >
          {plan.highlighted && (
            <View style={styles.bestValueBadge}>
              <Text style={styles.bestValueText}>⭐ Best Value</Text>
            </View>
          )}

          <View style={styles.planCardHeader}>
            <Text style={styles.planCardName}>{plan.name}</Text>
            {plan.badge && !plan.highlighted && (
              <View style={styles.planBadge}>
                <Text style={styles.planBadgeText}>{plan.badge}</Text>
              </View>
            )}
          </View>

          <Text style={styles.planDescription}>{plan.description}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceAmount}>{getDisplayPrice(plan)}</Text>
            <Text style={styles.pricePeriod}>{plan.period}</Text>
          </View>

          {plan.features.map((feature, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Text style={styles.featureCheck}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={[
              styles.planButton,
              plan.highlighted && styles.planButtonHighlighted,
              loading === plan.id && styles.buttonDisabled,
            ]}
            onPress={() => handleSubscribe(plan.id)}
            disabled={loading !== null || restoringPurchases}
          >
            {loading === plan.id ? (
              <ActivityIndicator color={plan.highlighted ? COLORS.background : COLORS.primary} />
            ) : (
              <Text
                style={[
                  styles.planButtonText,
                  plan.highlighted && styles.planButtonTextHighlighted,
                ]}
              >
                {getButtonText(plan)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ))}

      {/* Restore Purchases - iOS only (Apple requires this) */}
      {Platform.OS === "ios" && (
        <TouchableOpacity
          style={styles.restoreButton}
          onPress={handleRestorePurchases}
          disabled={restoringPurchases || loading !== null}
        >
          {restoringPurchases ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <Text style={styles.restoreButtonText}>Restore Purchases</Text>
          )}
        </TouchableOpacity>
      )}

      {/* Trust Badges */}
      <View style={styles.trustCard}>
        <Text style={styles.trustTitle}>Why Choose Ten Miles Ahead?</Text>
        <View style={styles.trustGrid}>
          <View style={styles.trustItem}>
            <View style={styles.trustIcon}>
              <Text style={styles.trustIconText}>🔒</Text>
            </View>
            <Text style={styles.trustItemTitle}>Secure Payments</Text>
            <Text style={styles.trustItemText}>
              {Platform.OS === "ios"
                ? "Secure payments through Apple"
                : "Bank-level security with encrypted transactions"}
            </Text>
          </View>
          <View style={styles.trustItem}>
            <View style={styles.trustIcon}>
              <Text style={styles.trustIconText}>✕</Text>
            </View>
            <Text style={styles.trustItemTitle}>Cancel Anytime</Text>
            <Text style={styles.trustItemText}>No long-term commitments or hidden fees</Text>
          </View>
        </View>
      </View>

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back to Home</Text>
      </TouchableOpacity>
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
    padding: SPACING.md,
  },
  headerCard: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  headerIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerIcon: {
    fontSize: 20,
    color: COLORS.white,
  },
  headerLabel: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: SPACING.xs,
  },
  headerSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 14,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  planHeader: {
    marginBottom: SPACING.md,
  },
  premiumRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.success,
  },
  premiumLabel: {
    fontSize: 12,
    color: COLORS.muted,
  },
  planName: {
    fontSize: 22,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detailCard: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: 12,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
  },
  detailCardHighlight: {
    backgroundColor: `${COLORS.primary}20`,
    borderWidth: 1,
    borderColor: `${COLORS.primary}40`,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.muted,
    marginBottom: SPACING.xs,
  },
  detailValue: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
  },
  primaryText: {
    color: COLORS.primary,
  },
  warningBanner: {
    backgroundColor: "#FEF3C7",
    borderColor: "#FDE68A",
    borderWidth: 1,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  warningText: {
    color: "#92400E",
    fontSize: 14,
  },
  cancelButton: {
    borderWidth: 2,
    borderColor: "#FCA5A5",
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  cancelButtonText: {
    color: COLORS.error,
    fontSize: 16,
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.md,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  benefitText: {
    fontSize: 14,
    color: COLORS.muted,
  },
  backButton: {
    alignItems: "center",
    paddingVertical: SPACING.md,
    marginTop: SPACING.md,
  },
  backButtonText: {
    color: COLORS.primary,
    fontSize: 16,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.md,
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    width: "100%",
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
  },
  modalText: {
    color: COLORS.muted,
    fontSize: 14,
    marginBottom: SPACING.lg,
  },
  modalButtons: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  modalKeepButton: {
    flex: 1,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  modalKeepButtonText: {
    color: COLORS.foreground,
    fontSize: 14,
    fontWeight: "500",
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.error,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  modalCancelButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "500",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  pricingHeader: {
    alignItems: "center",
    marginBottom: SPACING.xl,
  },
  pricingTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: COLORS.foreground,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  pricingSubtitle: {
    fontSize: 16,
    color: COLORS.muted,
    textAlign: "center",
  },
  pricingCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  pricingCardHighlighted: {
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 16,
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
  },
  bestValueText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: "600",
  },
  planCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  planCardName: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  planBadge: {
    backgroundColor: `${COLORS.primary}20`,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    borderRadius: 12,
  },
  planBadgeText: {
    color: COLORS.primary,
    fontSize: 12,
    fontWeight: "500",
  },
  planDescription: {
    fontSize: 14,
    color: COLORS.muted,
    marginBottom: SPACING.md,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: SPACING.lg,
  },
  priceAmount: {
    fontSize: 36,
    fontWeight: "bold",
    color: COLORS.foreground,
  },
  pricePeriod: {
    fontSize: 16,
    color: COLORS.muted,
    marginLeft: SPACING.xs,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  featureCheck: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: "bold",
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.muted,
  },
  planButton: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.md,
  },
  planButtonHighlighted: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  planButtonText: {
    color: COLORS.foreground,
    fontSize: 16,
    fontWeight: "600",
  },
  planButtonTextHighlighted: {
    color: COLORS.background,
  },
  restoreButton: {
    alignItems: "center",
    paddingVertical: SPACING.md,
    marginBottom: SPACING.md,
  },
  restoreButtonText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
  trustCard: {
    backgroundColor: `${COLORS.primary}15`,
    borderRadius: 12,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
  },
  trustTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.foreground,
    textAlign: "center",
    marginBottom: SPACING.lg,
  },
  trustGrid: {
    flexDirection: "row",
    gap: SPACING.md,
  },
  trustItem: {
    flex: 1,
    alignItems: "center",
  },
  trustIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: `${COLORS.primary}20`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  trustIconText: {
    fontSize: 24,
  },
  trustItemTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.foreground,
    marginBottom: SPACING.xs,
  },
  trustItemText: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
  },
});
