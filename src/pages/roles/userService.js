/**
 * userService.js
 * Firestore helpers for user profile + role management.
 * Place in: src/pages/roles/userService.js
 *
 * Firestore collection: users
 * Document shape:
 *   {
 *     uid:         string,
 *     email:       string,
 *     displayName: string,
 *     role:        "super_admin"|"admin"|"it_admin"|"admin_officer"|"accountant"|"user",
 *     createdAt:   Timestamp,
 *     updatedAt:   Timestamp,
 *   }
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";

const COL = "users";

// ── Called from AuthContext after registration ────────────────────────────
export const createUserProfile = async (uid, { email, displayName = "" }) => {
  await setDoc(
    doc(db, COL, uid),
    {
      uid,
      email,
      displayName,
      role: "user", // every new user starts as "user"
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

// ── Read ──────────────────────────────────────────────────────────────────
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, COL, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getAllUsers = async () => {
  const snap = await getDocs(query(collection(db, COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ── Assign role ───────────────────────────────────────────────────────────
export const assignRole = async (uid, newRole, assignedBy) => {
  await updateDoc(doc(db, COL, uid), {
    role: newRole,
    assignedBy,
    updatedAt: serverTimestamp(),
  });
};
