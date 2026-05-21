import {
  collection,
  addDoc,
  getDocs,
  getDoc,
  doc,
  serverTimestamp,
  query,
  where,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";

const familyRef = collection(db, "families");
const feeRef = collection(db, "fees");

export const createFamily = async (data) => {
  return await addDoc(familyRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
};

export const updateFamily = async (id, data) => {
  const ref = doc(db, "families", id);
  return await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
};

export const deleteFamily = async (id) => {
  const ref = doc(db, "families", id);
  return await deleteDoc(ref);
};

export const getFamilies = async () => {
  const snapshot = await getDocs(familyRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const getFamilyById = async (id) => {
  const ref = doc(db, "families", id);
  const snapshot = await getDoc(ref);
  return { id: snapshot.id, ...snapshot.data() };
};

/* ===============================
   GET FAMILY FINANCIAL SUMMARY
================================ */
export const getFamilyFeeSummary = async (familyId) => {
  const q = query(feeRef, where("familyId", "==", familyId));
  const snapshot = await getDocs(q);

  let totalAmount = 0;
  let totalPaid = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    totalAmount += Number(data.amount || 0);
    totalPaid += Number(data.paidAmount || 0);
  });

  let status = "Unpaid";
  if (totalPaid === 0) status = "Unpaid";
  else if (totalPaid < totalAmount) status = "Partial";
  else status = "Paid";

  return {
    totalAmount,
    totalPaid,
    status,
  };
};
