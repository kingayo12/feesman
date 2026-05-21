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
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { getSettings } from "../settings/settingService";

const studentRef = collection(db, "students");

/* =========================
   NORMALIZER
========================= */
const normalize = (v) => String(v || "").trim();

/* =========================
   CREATE STUDENT
   - Stores identity only (no session/term/classId on student doc)
   - Auto-enrolls into current session/term via enrollmentService
========================= */
export const createStudent = async (data, { autoEnroll = true } = {}) => {
  try {
    const settings = await getSettings();

    // Pull enrollment fields out — they go into studentEnrollments, not students
    const { session, term, classId, ...identityData } = data;

    const studentDoc = await addDoc(studentRef, {
      ...identityData,
      status: "active",
      createdAt: serverTimestamp(),
    });

    // Auto-enroll in current session/term if classId was provided
    if (autoEnroll && classId) {
      const { enrollStudent } = await import("./enrollmentService");
      await enrollStudent(
        studentDoc.id,
        classId,
        normalize(session || settings?.academicYear),
        normalize(term || settings?.currentTerm),
      );
    }

    return studentDoc;
  } catch (error) {
    console.error("Error creating student:", error);
    throw error;
  }
};

/* =========================
   GET STUDENT BY ID
========================= */
export const getStudentById = async (id) => {
  try {
    const ref = doc(db, "students", id);
    const snapshot = await getDoc(ref);

    if (!snapshot.exists()) return null;

    return { id: snapshot.id, ...snapshot.data() };
  } catch (error) {
    console.error("Error fetching student:", error);
    throw error;
  }
};

/* =========================
   GET ALL STUDENTS (identity only, sorted by last name)
========================= */
export const getAllStudents = async () => {
  const snapshot = await getDocs(query(studentRef, orderBy("lastName", "asc")));

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

/* =========================
   GET STUDENTS BY FAMILY
========================= */
export const getStudentsByFamily = async (familyId) => {
  const q = query(studentRef, where("familyId", "==", familyId), where("status", "==", "active"));

  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};

/* =========================
   UPDATE STUDENT (identity fields only)
   To change class/session/term use enrollmentService
========================= */
export const updateStudent = async (id, data) => {
  try {
    if (!id) throw new Error("Student ID is required");

    // Do not allow overwriting session/term/classId on the identity doc
    const { session, term, classId, ...safeData } = data;

    const ref = doc(db, "students", id);

    await updateDoc(ref, {
      ...safeData,
      updatedAt: serverTimestamp(),
    });

    // If classId/session/term were included, update the active enrollment instead
    if (classId || session || term) {
      const { getCurrentEnrollment } = await import("./enrollmentService");
      const enrollment = await getCurrentEnrollment(id);

      if (enrollment) {
        const enrollRef = doc(db, "studentEnrollments", enrollment.id);
        const enrollUpdate = {};
        if (classId) enrollUpdate.classId = classId;
        if (session) enrollUpdate.session = normalize(session);
        if (term) enrollUpdate.term = normalize(term);
        enrollUpdate.updatedAt = serverTimestamp();

        await updateDoc(enrollRef, enrollUpdate);
      }
    }

    return true;
  } catch (error) {
    console.error("Error updating student:", error);
    throw error;
  }
};

/* =========================
   DELETE STUDENT
   NOTE: only deletes the identity doc.
   Use deleteStudentWithEnrollments for a full cleanup.
========================= */
export const deleteStudent = async (id) => {
  const ref = doc(db, "students", id);
  await deleteDoc(ref);
};

/* =========================
   DELETE STUDENT + ALL ENROLLMENTS
========================= */
export const deleteStudentWithEnrollments = async (id) => {
  // Delete all enrollment docs for this student
  const enrollQ = query(collection(db, "studentEnrollments"), where("studentId", "==", id));
  const enrollSnap = await getDocs(enrollQ);
  await Promise.all(enrollSnap.docs.map((e) => deleteDoc(doc(db, "studentEnrollments", e.id))));

  // Delete the student identity doc
  await deleteDoc(doc(db, "students", id));
};
