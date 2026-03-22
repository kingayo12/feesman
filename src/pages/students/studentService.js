import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  serverTimestamp,
  getDoc,
  doc,
  orderBy,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { getSettings } from "../settings/settingService";

const studentRef = collection(db, "students");

/**
 * Create a new student.
 * ✅ FIXED: was using settings.session (undefined). Now uses settings.academicYear.
 */
export const createStudent = async (data) => {
  try {
    const settings = await getSettings();

    return await addDoc(studentRef, {
      ...data,
      status: "active",
      session: data.session || settings?.academicYear || "", // ✅ correct field name
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error creating student:", error);
    throw error;
  }
};

export const getStudentById = async (id) => {
  try {
    const ref = doc(db, "students", id);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) {
      console.warn("No student found with ID:", id);
      return null;
    }

    return { id: snapshot.id, ...snapshot.data() };
  } catch (error) {
    console.error("Error fetching student:", error);
    throw error;
  }
};

export const getStudentsBySession = async (session) => {
  try {
    const settings = await getSettings();
    const currentSession = session || settings?.academicYear;

    const q = query(
      studentRef,
      where("session", "==", currentSession),
      where("status", "==", "active"),
      orderBy("lastName", "asc"),
    );

    const snapshot = await getDocs(q);

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error("Error fetching students by session:", error);
    throw error;
  }
};

export const getStudentsByFamily = async (familyId, session) => {
  const q = query(
    studentRef,
    where("familyId", "==", familyId),
    where("session", "==", session),
    where("status", "==", "active"),
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

export const deleteStudent = async (id) => {
  const ref = doc(db, "students", id);
  await deleteDoc(ref);
};

export const getAllStudents = async () => {
  const snapshot = await getDocs(query(studentRef, orderBy("lastName", "asc")));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};
