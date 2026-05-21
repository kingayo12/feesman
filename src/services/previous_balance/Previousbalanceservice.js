/**
 * previousBalanceService.js
 * Manages carried-forward balances from previous sessions.
 *
 * Firestore collection: previousBalances
 * Document shape:
 *   {
 *     studentId:   string,
 *     familyId:    string,
 *     session:     string,   // the session these balances are being brought INTO e.g. "2024/2025"
 *     amount:      number,   // amount owed from all prior sessions combined
 *     note:        string,   // optional e.g. "Arrears from 2023/2024"
 *     recordedBy:  string,   // uid of admin who entered it
 *     createdAt:   Timestamp,
 *     updatedAt:   Timestamp,
 *   }
 *
 * Place in: src/pages/previousBalances/previousBalanceService.js
 */

import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";

const COL = "previousBalances";
const ref = () => collection(db, COL);

// ── Write ──────────────────────────────────────────────────────────────────

/**
 * Set (create or overwrite) a previous balance for one student in one session.
 * Uses a deterministic document ID so there is never more than one record
 * per student+session — safe to call repeatedly.
 */
export const setPreviousBalance = async ({
  studentId,
  familyId,
  session,
  amount,
  note = "",
  recordedBy = "",
}) => {
  if (!studentId || !session) throw new Error("studentId and session are required");

  const docId = `${studentId}_${session.replace(/\//g, "-")}`;
  const docRef = doc(db, COL, docId);

  await setDoc(
    docRef,
    {
      studentId,
      familyId: familyId || "",
      session,
      amount: Number(amount) || 0,
      note: note.trim(),
      recordedBy,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(), // setDoc with merge keeps original createdAt on updates
    },
    { merge: true },
  );

  return docId;
};

/**
 * Delete a previous balance record.
 */
export const deletePreviousBalance = async (docId) => {
  await deleteDoc(doc(db, COL, docId));
};

// ── Read ───────────────────────────────────────────────────────────────────

/**
 * Get the previous balance for one student in one session.
 * Returns { id, studentId, session, amount, note, ... } or null.
 */
export const getPreviousBalance = async (studentId, session) => {
  const docId = `${studentId}_${session.replace(/\//g, "-")}`;
  const snap = await getDoc(doc(db, COL, docId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

/**
 * Get the previous balance AMOUNT for one student in one session.
 * Returns 0 if no record exists.
 */
export const getPreviousBalanceAmount = async (studentId, session) => {
  const record = await getPreviousBalance(studentId, session);
  return record ? Number(record.amount || 0) : 0;
};

/**
 * Get all previous balance records for a session (for the management page).
 */
export const getAllPreviousBalancesForSession = async (session) => {
  const q = query(ref(), where("session", "==", session));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/**
 * Get all previous balance records for a specific family.
 */
export const getPreviousBalancesByFamily = async (familyId, session) => {
  const q = query(ref(), where("familyId", "==", familyId), where("session", "==", session));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};
