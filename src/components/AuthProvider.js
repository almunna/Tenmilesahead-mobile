import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { Platform } from "react-native";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc, onSnapshot } from "firebase/firestore";
import Purchases from "react-native-purchases";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  signOutNow: async () => {},
  refreshProfile: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep the latest profile unsubscribe so we can tear it down properly
  const profileUnsubRef = useRef(null);
  const rcListenerRef = useRef(null);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      // Tear down any prior profile listener when auth changes
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }

      // Tear down RevenueCat listener
      if (rcListenerRef.current) {
        rcListenerRef.current.remove();
        rcListenerRef.current = null;
      }

      setUser(u);
      setProfile(null);
      setLoading(true);

      if (!u) {
        // Signed out: nothing to read
        setLoading(false);
        return;
      }

      try {
        const ref = doc(db, "users", u.uid);

        // Ensure the profile doc exists BEFORE we attach onSnapshot
        const snap = await getDoc(ref);
        if (!snap.exists()) {
          const p = {
            uid: u.uid,
            email: u.email || null,
            username: "", // filled later by user
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          await setDoc(ref, p);
        }

        // Now safe to listen live
        profileUnsubRef.current = onSnapshot(
          ref,
          (s) => {
            if (s.exists()) setProfile(s.data());
            setLoading(false);
          },
          (err) => {
            setLoading(false);
          }
        );

        // Set up RevenueCat listener on iOS to sync subscription state
        if (Platform.OS === "ios") {
          setupRevenueCatListener(u.uid);
        }
      } catch (e) {
        setLoading(false);
      }
    });

    // On unmount, also tear down profile listener
    return () => {
      unsubAuth();
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
      }
      if (rcListenerRef.current) {
        rcListenerRef.current.remove();
        rcListenerRef.current = null;
      }
    };
  }, []);

  function setupRevenueCatListener(uid) {
    rcListenerRef.current = Purchases.addCustomerInfoUpdateListener(
      async (customerInfo) => {
        try {
          const proEntitlement = customerInfo.entitlements.active["pro"];
          const userRef = doc(db, "users", uid);

          if (proEntitlement) {
            // Subscription is active - sync to Firebase
            const expirationDate = proEntitlement.expirationDate
              ? new Date(proEntitlement.expirationDate).getTime()
              : null;

            const productId = proEntitlement.productIdentifier || "";
            const plan = productId.includes("annual") ? "annual" : "monthly";

            await updateDoc(userRef, {
              "subscription.status": "active",
              "subscription.plan": plan,
              "subscription.cancelAtPeriodEnd": proEntitlement.willRenew === false,
              ...(expirationDate && { "subscription.currentPeriodEnd": expirationDate }),
              "subscription.purchaseSource": "apple",
              updatedAt: Date.now(),
            });
          } else {
            // No active entitlement - check if subscription previously existed from Apple
            const snap = await getDoc(userRef);
            const data = snap.data();
            if (data?.subscription?.purchaseSource === "apple" && data?.subscription?.status === "active") {
              // Subscription expired or was canceled through Apple
              await updateDoc(userRef, {
                "subscription.status": "canceled",
                "subscription.cancelAtPeriodEnd": true,
                updatedAt: Date.now(),
              });
            }
          }
        } catch (error) {
        }
      }
    );
  }

  async function refreshProfile() {
    if (!user) return;
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    if (snap.exists()) setProfile(snap.data());
  }

  async function signOutNow() {
    try {
      await signOut(auth);
    } catch (error) {
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signOutNow,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
