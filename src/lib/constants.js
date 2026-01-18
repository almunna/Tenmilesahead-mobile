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

// Moderate scale - less aggressive scaling for tablets
export const moderateScale = (size, factor = 0.5) => {
  const newSize = size + (scale - 1) * size * factor;
  // For tablets, apply additional scaling
  if (isTablet) {
    return Math.round(PixelRatio.roundToNearestPixel(newSize * 1.3));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Font scaling with tablet support
export const scaleFontSize = (size) => {
  const newSize = size * scale;
  if (isTablet) {
    // Tablets get 40% larger fonts
    return Math.round(PixelRatio.roundToNearestPixel(newSize * 1.4));
  }
  return Math.round(PixelRatio.roundToNearestPixel(newSize));
};

// Spacing scaling
export const scaleSpacing = (size) => {
  if (isTablet) {
    return Math.round(size * 1.5);
  }
  return size;
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

  // Admin screens
  ADMIN: "Admin",
  ADMIN_LOGIN: "AdminLogin",
  ADMIN_USERS: "AdminUsers",
  ADMIN_ANALYTICS: "AdminAnalytics",
  ADMIN_TUTORIALS: "AdminTutorials",
};

// API endpoints (for Stripe and other services)
export const API_ENDPOINTS = {
  // These would typically point to your backend server
  CREATE_CHECKOUT_SESSION: "YOUR_API_URL/stripe/create-checkout-session",
  CREATE_SUBSCRIPTION: "YOUR_API_URL/stripe/create-subscription",
  CANCEL_SUBSCRIPTION: "YOUR_API_URL/stripe/cancel-subscription",
  VERIFY_SESSION: "YOUR_API_URL/stripe/verify-session",
  GEOCODE: "YOUR_API_URL/geocode",
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
      "Basic analytics",
    ],
  },
  MONTHLY: {
    id: "monthly",
    name: "Monthly",
    price: 3.99,
    priceId: "YOUR_STRIPE_MONTHLY_PRICE_ID",
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
    priceId: "YOUR_STRIPE_ANNUAL_PRICE_ID",
    duration: "year",
    savings: "Save $8",
    features: [
      "Everything in Monthly",
      "2 months free",
      "Early access to features",
    ],
  },
};
