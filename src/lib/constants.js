// lib/constants.js
// App-wide constants

import { Dimensions, PixelRatio } from "react-native";

// Screen dimensions for responsive scaling
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Base dimensions (iPhone 11 Pro)
const baseWidth = 375;
const baseHeight = 812;

// Check if device is a tablet (screen width > 600)
export const isTablet = SCREEN_WIDTH > 600;

// Scale factor based on screen width
const scale = SCREEN_WIDTH / baseWidth;

// Moderate scale - phones stay normal, tablets get larger
export const moderateScale = (size, factor = 0.5) => {
  if (isTablet) {
    return Math.round(size * 1.5); // 50% larger on tablets
  }
  return size; // Normal size on phones
};

// Font scaling - phones stay normal, tablets get larger text
export const scaleFontSize = (size) => {
  if (isTablet) {
    return Math.round(size * 1.5); // 50% larger fonts on tablets
  }
  return size; // Normal size on phones
};

// Spacing scaling - phones stay normal, tablets get larger spacing
export const scaleSpacing = (size) => {
  if (isTablet) {
    return Math.round(size * 1.3); // 30% larger spacing on tablets
  }
  return size; // Normal size on phones
};

// Transportation options
export const TRANSPORT_OPTIONS = [
  "Airplane",
  "Bus",
  "Car",
  "Cruise",
  "RV",
  "Train",
  "Uber/Taxi",
  "Walk",
];

// Color palette (matching web app)
export const COLORS = {
  primary: "#5eb9b3",
  primaryDark: "#4ea9a3",
  background: "#1a2332",
  surface: "#2a3544",
  surfaceLight: "#3a4557",
  foreground: "#ffffff",
  muted: "#94a3b8",
  border: "#3a4557",
  error: "#ef4444",
  success: "#22c55e",
  warning: "#f59e0b",
  white: "#ffffff",
  black: "#000000",
};

// Typography
export const FONTS = {
  regular: "System",
  medium: "System",
  semibold: "System",
  bold: "System",
};

// Spacing
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

// Border radius
export const RADIUS = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Screen names for navigation
export const SCREENS = {
  // Auth stack
  LANDING: "Landing",
  SIGNIN: "Signin",
  SIGNUP: "Signup",

  // Main tab screens
  HOME: "Home",
  TRIPS: "Trips",
  GLOBAL_REVIEWS: "GlobalReviews",
  PROFILE: "Profile",

  // Stack screens
  TRIP_DETAIL: "TripDetail",
  PHOTOBOOK_EDITOR: "PhotobookEditor",
  SUBSCRIBE: "Subscribe",
  SUBSCRIPTION_SUCCESS: "SubscriptionSuccess",
  SUBSCRIPTION_MANAGE: "SubscriptionManage",
  FAQS: "FAQs",
  TUTORIALS: "Tutorials",
  PRIVACY: "Privacy",
  TERMS: "Terms",
  SHARE_TRIP: "ShareTrip",
  REVIEWS: "Reviews",

};

// ============================================
// STRIPE CONFIGURATION (Android only)
// ============================================

// Your deployed web app URL
export const API_BASE_URL = "https://tenmilesahead.com";

// Stripe publishable key (used on Android)
export const STRIPE_PUBLISHABLE_KEY = "pk_test_51RHzInLfV8BTXj9A0YEedXrCH1S3vigKBqYEGvNXt0GIzSQa1mEGBHTWmUqsn5IAFxLRTN4t64S3qpmC7Oo8nLSZ00KzGjpk59";

// ============================================
// REVENUECAT CONFIGURATION (iOS In-App Purchase)
// ============================================

// Replace with your RevenueCat Public API Key from the RevenueCat dashboard
export const REVENUECAT_API_KEY_IOS = "appl_srrrvckwndOBIovzWfMQIFouHar";

// RevenueCat product identifiers (must match App Store Connect product IDs)
export const RC_PRODUCT_IDS = {
  MONTHLY: "tma_monthly_pro",
  ANNUAL: "tma_annual_pro",
};

// API endpoints (for Stripe and other services)
export const API_ENDPOINTS = {
  CREATE_CHECKOUT_SESSION: `${API_BASE_URL}/api/stripe/create-checkout-session`,
  CREATE_SUBSCRIPTION: `${API_BASE_URL}/api/stripe/create-subscription`,
  CANCEL_SUBSCRIPTION: `${API_BASE_URL}/api/stripe/cancel-subscription`,
  VERIFY_SESSION: `${API_BASE_URL}/api/stripe/verify-session`,
  GEOCODE: `${API_BASE_URL}/api/geocode`,
};

// Subscription plans
export const SUBSCRIPTION_PLANS = {
  TRIAL: {
    id: "trial",
    name: "Free Trial",
    price: 0,
    duration: "7 days",
    features: [
      "Unlimited trips",
      "Photo uploads",
      "Trip sharing",
    ],
  },
  MONTHLY: {
    id: "monthly",
    name: "Monthly",
    price: 3.99,
    duration: "month",
    features: [
      "Everything in Free Trial",
      "Unlimited photobooks",
      "Priority support",
      "No watermarks",
    ],
  },
  ANNUAL: {
    id: "annual",
    name: "Annual",
    price: 39.99,
    duration: "year",
    savings: "Save $8",
    features: [
      "Everything in Monthly",
      "2 months free",
      "Early access to features",
    ],
  },
};
