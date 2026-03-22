import {
  collection,
  addDoc,
  getDocs,
  serverTimestamp,
  deleteDoc,
  doc,
  getDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";

const classRef = collection(db, "classes");

export const createClass = async (data) => {
  return await addDoc(classRef, {
    ...data,
    createdAt: serverTimestamp(),
  });
};

export const getClasses = async () => {
  const snapshot = await getDocs(classRef);
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

// ✅ NEW: Get class details
export const getClassById = async (id) => {
  const ref = doc(db, "classes", id);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
};

// ✅ NEW: Delete class
export const deleteClass = async (id) => {
  const ref = doc(db, "classes", id);
  await deleteDoc(ref);
};
