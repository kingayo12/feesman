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

export const recordPayment = async (data) => {
  return await addDoc(paymentRef, {
    studentId: data.studentId,
    familyId: data.familyId,
    amount: Number(data.amount),
    method: data.method,
    term: normalizeTerm(data.term), // ✅ normalize before saving
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
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate() || new Date(),
  }));
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
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate() || new Date(),
  }));
};

/**
 * ✅ FIXED: normalizes term before querying so "Second Term" stored docs
 * are found when querying with "2nd Term" and vice versa.
 * Also fetches without term filter then filters client-side to catch
 * any payments still stored with the old long-form term string.
 */
export const getPaymentsByFamily = async (familyId, session, term) => {
  if (!familyId || !session || !term) return [];

  const normalizedTerm = normalizeTerm(term);

  // Query by familyId + session, filter term client-side after normalizing
  // This catches payments stored as "Second Term" OR "2nd Term"
  const q = query(paymentRef, where("familyId", "==", familyId), where("session", "==", session));

  const snapshot = await getDocs(q);

  return snapshot.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      date: d.data().date?.toDate() || new Date(),
      term: normalizeTerm(d.data().term), // normalize on read
    }))
    .filter((p) => p.term === normalizedTerm);
};

export const getPaymentsByStudent = async (studentId) => {
  const q = query(paymentRef, where("studentId", "==", studentId), orderBy("date", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
    date: d.data().date?.toDate() || new Date(),
    term: normalizeTerm(d.data().term),
  }));
};
