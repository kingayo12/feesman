import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";

const paymentRef = collection(db, "payments");

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize term strings so old data ("Second Term") matches new data ("2nd Term").
 * All reads and writes go through here — single fix point.
 */
function normalizeTerm(term) {
  if (!term) return "";
  const map = {
    "first term": "1st Term",
    "second term": "2nd Term",
    "third term": "3rd Term",
    "1st term": "1st Term",
    "2nd term": "2nd Term",
    "3rd term": "3rd Term",
  };
  return map[term.toLowerCase()] ?? term;
}

/** Map a Firestore payment doc to a plain object with normalized fields. */
function mapPayment(d) {
  return {
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate() || new Date(),
    term: normalizeTerm(d.data().term),
  };
}

// ─── Exports ──────────────────────────────────────────────────────────────────

export const recordPayment = async (data) => {
  return await addDoc(paymentRef, {
    studentId: data.studentId,
    familyId: data.familyId,
    amount: Number(data.amount),
    method: data.method,
    term: normalizeTerm(data.term),
    session: data.session,
    date: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
};

export const getPaymentsByTerm = async (session, term) => {
  if (!session || !term) return [];

  const q = query(
    paymentRef,
    where("session", "==", session),
    where("term", "==", normalizeTerm(term)),
    orderBy("date", "desc"),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapPayment);
};

export const getRecentPaymentsByTerm = async (session, term, count = 5) => {
  if (!session || !term) return [];

  const q = query(
    paymentRef,
    where("session", "==", session),
    where("term", "==", normalizeTerm(term)),
    orderBy("date", "desc"),
    limit(count),
  );

  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapPayment);
};

/**
 * Get all payments for a family in a given session + term.
 *
 * Queries by familyId + session only, then filters term client-side
 * after normalizing — this catches payments stored as "Second Term"
 * OR "2nd Term" without needing a composite Firestore index.
 */
export const getPaymentsByFamily = async (familyId, session, term) => {
  if (!familyId || !session || !term) return [];

  const normalizedTerm = normalizeTerm(term);

  const q = query(paymentRef, where("familyId", "==", familyId), where("session", "==", session));

  const snapshot = await getDocs(q);

  return snapshot.docs.map(mapPayment).filter((p) => p.term === normalizedTerm);
};

/**
 * Get all payments for a student, optionally filtered by session and/or term.
 *
 * FIX: Firestore SDK v9 does not support chaining where() onto an existing
 * query reference — all constraints must be passed to query() in one call.
 * We build the constraints array dynamically then spread into query().
 */
export const getPaymentsByStudent = async (studentId, session = null, term = null) => {
  if (!studentId) return [];

  // Build constraints array dynamically
  const constraints = [where("studentId", "==", studentId)];

  if (session) constraints.push(where("session", "==", session));

  // If term is provided, query directly (data is normalized on write).
  // We still normalize on read via mapPayment for any legacy docs.
  if (term) constraints.push(where("term", "==", normalizeTerm(term)));

  constraints.push(orderBy("date", "desc"));

  const q = query(paymentRef, ...constraints);
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapPayment);
};
