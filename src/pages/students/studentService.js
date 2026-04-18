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
  writeBatch,
  deleteDoc,
  updateDoc,
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

export const updateStudent = async (id, data) => {
  try {
    if (!id) throw new Error("Student ID is required");

    const ref = doc(db, "students", id);

    await updateDoc(ref, {
      ...data,
      updatedAt: serverTimestamp(), // ✅ track edits
    });

    return true;
  } catch (error) {
    console.error("Error updating student:", error);
    throw error;
  }
};

export const getAllStudents = async () => {
  const snapshot = await getDocs(query(studentRef, orderBy("lastName", "asc")));

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
};

/**
 * Promote a list of students to a new class and new academic session.
 *
 * Data model assumptions (from your codebase):
 *  - Classes are separate Firestore docs, each with { name, section, session }.
 *  - "Section/arm" = the letter suffix on a class (e.g. "A" in "Primary 1A").
 *  - A full section = one academic year covering 1st, 2nd and 3rd terms.
 *  - After completing all 3 terms, students in e.g. "Primary 1A" are promoted
 *    to "Primary 2A" and their session moves from e.g. 2024/2025 → 2025/2026.
 *  - Old fee/payment records are keyed by (studentId, session, term) and are
 *    NOT touched — historical data is fully preserved.
 *
 * @param {string[]} studentIds    - Firestore IDs of students to promote.
 * @param {string}   targetClassId - Firestore ID of the destination class.
 * @param {string}   newSession    - New session string e.g. "2025/2026".
 * @returns {Promise<{ promoted: string[], failed: string[] }>}
 */
export const promoteStudents = async (studentIds, targetClassId, newSession) => {
  if (!studentIds?.length || !targetClassId || !newSession?.trim()) {
    throw new Error("studentIds, targetClassId, and newSession are all required.");
  }

  const promoted = [];
  const failed = [];

  // Firestore batches allow max 500 writes — chunk conservatively at 499
  const CHUNK_SIZE = 499;
  for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
    const chunk = studentIds.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const studentId of chunk) {
      try {
        const ref = doc(db, "students", studentId);
        batch.update(ref, {
          classId: targetClassId,
          session: newSession.trim(),
          promotedAt: new Date().toISOString(), // audit trail
        });
        promoted.push(studentId);
      } catch (err) {
        console.error(`Failed to queue student ${studentId}:`, err);
        failed.push(studentId);
      }
    }

    await batch.commit();
  }

  return { promoted, failed };
};
