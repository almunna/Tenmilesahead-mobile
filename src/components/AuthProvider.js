import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
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

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      // Tear down any prior profile listener when auth changes
      if (profileUnsubRef.current) {
        profileUnsubRef.current();
        profileUnsubRef.current = null;
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
            console.error("Profile listener error:", err);
            setLoading(false);
          }
        );
      } catch (e) {
        console.error("Auth/profile bootstrap error:", e);
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
    };
  }, []);

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
      console.error("Sign out error:", error);
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
