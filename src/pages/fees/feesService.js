import { db } from "../../firebase/firestore";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
} from "firebase/firestore";

const feesRef = collection(db, "fees");

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

/**
 * Check if a fee already exists for the same class/session/term/feeType.
 * Queries by classId + session + feeType, then filters term client-side
 * to handle old docs that stored "Second Term" vs "2nd Term".
 */
const feeExists = async ({ classId, session, term, feeType }) => {
  const q = query(
    feesRef,
    where("classId", "==", classId),
    where("session", "==", session),
    where("feeType", "==", feeType),
  );
  const snapshot = await getDocs(q);
  const normalizedTerm = normalizeTerm(term);
  return snapshot.docs.some((d) => normalizeTerm(d.data().term) === normalizedTerm);
};

// ─── Exports ──────────────────────────────────────────────────────────────────

export const createFee = async (feeData) => {
  const exists = await feeExists(feeData);
  if (exists) {
    console.warn("Duplicate fee skipped:", feeData);
    return null;
  }

  return await addDoc(feesRef, {
    ...feeData,
    term: normalizeTerm(feeData.term),
    createdAt: new Date(),
  });
};

/**
 * Create multiple fees in parallel.
 * Duplicate-checks run concurrently; only non-duplicate fees are written.
 */
export const createBulkFees = async (feesArray) => {
  // Check all fees for duplicates concurrently
  const existsFlags = await Promise.all(feesArray.map((fee) => feeExists(fee)));

  // Write non-duplicate fees concurrently
  const writePromises = feesArray
    .filter((_, i) => !existsFlags[i])
    .map((fee) =>
      addDoc(feesRef, {
        ...fee,
        term: normalizeTerm(fee.term),
        createdAt: new Date(),
      }),
    );

  const skipped = existsFlags.filter(Boolean).length;
  if (skipped > 0) console.warn(`Skipped ${skipped} duplicate fee(s).`);

  return await Promise.all(writePromises);
};

export const getFees = async () => {
  const q = query(feesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    term: normalizeTerm(d.data().term),
    session: d.data().session || d.data().academicYear || "",
  }));
};

export const updateFee = async (id, updatedData) => {
  const feeDoc = doc(db, "fees", id);
  return await updateDoc(feeDoc, {
    ...updatedData,
    term: normalizeTerm(updatedData.term),
    updatedAt: new Date(),
  });
};

export const deleteFee = async (id) => {
  const feeDoc = doc(db, "fees", id);
  return await deleteDoc(feeDoc);
};

/**
 * Get fees for a specific class, session, and term.
 *
 * Queries by classId + session only, then filters term client-side.
 * This handles old docs where term may be stored as "Second Term".
 *
 * Returns [] immediately if classId is null/undefined — a student with
 * no active enrollment this term has no classId and should show no fees.
 */
export const getFeesByClass = async (classId, session, term) => {
  if (!classId || !session || !term) return [];

  const normalizedTerm = normalizeTerm(term);

  const q = query(feesRef, where("classId", "==", classId), where("session", "==", session));

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      term: normalizeTerm(d.data().term),
      session: d.data().session || d.data().academicYear || "",
    }))
    .filter((fee) => fee.term === normalizedTerm);
};
