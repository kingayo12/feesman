/**
 * AuthContext.jsx
 * Place in: src/context/AuthContext.jsx
 */

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
} from "firebase/auth";

import { doc, getDoc, getFirestore, setDoc, serverTimestamp } from "firebase/firestore";

import { auth } from "../firebase/auth";
import { db } from "../firebase/firestore";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const firestore = db ?? getFirestore();

  // 🔥 Listen to auth state + merge Firestore data
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(firestore, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          let firestoreData = {};

          if (userSnap.exists()) {
            firestoreData = userSnap.data();
          } else {
            console.warn("No Firestore user document found");
          }

          // ✅ Merge Auth + Firestore
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,

            ...firestoreData, // 🔥 role comes from here
          });
        } catch (error) {
          console.error("Error fetching user data:", error);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, [firestore]);

  // 🔐 Login
  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  // 🆕 Register
  const register = async (email, password, displayName = "") => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name in Firebase Auth
    if (displayName) {
      await updateProfile(credential.user, { displayName });
    }

    // ✅ Create Firestore user profile with role
    await setDoc(doc(firestore, "users", credential.user.uid), {
      uid: credential.user.uid,
      email,
      displayName,
      role: "user", // 🔥 default role
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return credential.user;
  };

  // 🚪 Logout
  const logout = () => signOut(auth);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 🔁 Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
