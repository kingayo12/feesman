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

/**
 * Normalize term strings so old data ("Second Term") matches new data ("2nd Term").
 * This is the single fix point — all reads go through here.
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

export const createFee = async (feeData) => {
  return await addDoc(feesRef, {
    ...feeData,
    // Normalize term before saving so all new docs use consistent format
    term: normalizeTerm(feeData.term),
    createdAt: new Date(),
  });
};

export const getFees = async () => {
  const q = query(feesRef, orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data(),
    // Normalize on read — fixes any docs saved with old "Second Term" format
    term: normalizeTerm(docSnap.data().term),
    // Normalize session field name — some docs may use "academicYear" vs "session"
    session: docSnap.data().session || docSnap.data().academicYear || "",
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
 * ✅ KEY FIX: getFeesByClass now tries both the normalized term AND a Firestore
 * query. Because Firestore can't query with OR on the same field without a
 * composite index trick, we fetch by session+class and filter term client-side.
 * This guarantees matches even if old fee docs used "Second Term".
 */
export const getFeesByClass = async (classId, session, term) => {
  if (!classId || !session || !term) return [];

  const normalizedTerm = normalizeTerm(term);

  // Query by classId + session only, then filter term client-side
  // This handles old docs where term may be stored as "Second Term"
  const q = query(feesRef, where("classId", "==", classId), where("session", "==", session));

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((docSnap) => ({
      id: docSnap.id,
      ...docSnap.data(),
      term: normalizeTerm(docSnap.data().term),
      session: docSnap.data().session || docSnap.data().academicYear || "",
    }))
    .filter((fee) => fee.term === normalizedTerm);
};
