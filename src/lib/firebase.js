import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, initializeAuth, getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Firebase configuration for Ten Miles Ahead
const firebaseConfig = {
  apiKey: "AIzaSyDpQjubjGOUPAgXUFt9-BtesF649AMWdeM",
  authDomain: "ten-miles-ahead-85052.firebaseapp.com",
  projectId: "ten-miles-ahead-85052",
  storageBucket: "ten-miles-ahead-85052.firebasestorage.app",
  messagingSenderId: "1093797651517",
  appId: "1:1093797651517:web:703d7b9c7546a1840d7654",
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

// Initialize Firestore and Storage first
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Auth with AsyncStorage persistence for React Native
let auth;
try {
  // Check if auth is already initialized
  const apps = getApps();
  if (apps.length > 0 && apps[0]._options) {
    try {
      auth = getAuth(app);
    } catch (e) {
      // If getAuth fails, try initializeAuth
      auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
    }
  } else {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  }
} catch (error) {
  console.log("Auth initialization error:", error.message);
  // Fallback to getAuth
  try {
    auth = getAuth(app);
  } catch (e) {
    console.error("Failed to initialize auth:", e);
  }
}

export { auth };
export default app;
