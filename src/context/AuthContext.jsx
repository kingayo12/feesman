import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth";

import { doc, getDoc, getFirestore, setDoc, serverTimestamp } from "firebase/firestore";

import { auth } from "../firebase/auth";
import { db } from "../firebase/firestore";

const AuthContext = createContext(null);

const googleProvider = new GoogleAuthProvider();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const firestore = db ?? getFirestore();

  // 🔥 Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(firestore, "users", firebaseUser.uid);
          const userSnap = await getDoc(userRef);

          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            ...(userSnap.exists() ? userSnap.data() : {}),
          });
        } catch (err) {
          console.error("Error fetching user:", err);
        }
      } else {
        setUser(null);
      }

      setLoading(false);
    });

    return () => unsub();
  }, [firestore]);

  // 🔐 Email login
  const login = (email, password) => signInWithEmailAndPassword(auth, email, password);

  // 🆕 Register
  const register = async (email, password, displayName = "") => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);

    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    await setDoc(doc(firestore, "users", cred.user.uid), {
      uid: cred.user.uid,
      email,
      displayName,
      role: "user",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return cred.user;
  };

  // 🚪 Logout
  const logout = () => signOut(auth);

  // 🔵 Google login (FIXED)
  const loginWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = doc(firestore, "users", user.uid);
    const snap = await getDoc(userRef);

    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: "user",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return user;
  };

  const registerWithGoogle = async () => {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;

    const userRef = doc(firestore, "users", user.uid);
    const snap = await getDoc(userRef);

    // create Firestore profile if new user
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: "user",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    return user;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        register,
        logout,
        loginWithGoogle,
        registerWithGoogle,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

// 🔁 Hook
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
