import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  doc,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { getSettings } from "../settings/settingService";

const enrollmentRef = collection(db, "studentEnrollments");

/* =========================
   ENROLL STUDENT IN A TERM
========================= */
export const enrollStudent = async (studentId, classId, session, term) => {
  // Prevent duplicate enrollments for same student/session/term
  const existing = await getDocs(
    query(
      enrollmentRef,
      where("studentId", "==", studentId),
      where("session", "==", session),
      where("term", "==", term),
    ),
  );

  if (!existing.empty) {
    throw new Error(`Student already enrolled for ${term} ${session}`);
  }

  return await addDoc(enrollmentRef, {
    studentId,
    classId,
    session,
    term,
    status: "active",
    enrolledAt: serverTimestamp(),
    promotedAt: null,
  });
};

/* =========================
   GET CURRENT ENROLLMENT
========================= */
export const getCurrentEnrollment = async (studentId) => {
  const settings = await getSettings();
  const session = settings?.academicYear;
  const term = settings?.currentTerm;

  const q = query(
    enrollmentRef,
    where("studentId", "==", studentId),
    where("session", "==", session),
    where("term", "==", term),
  );

  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;

  const d = snapshot.docs[0];
  return { id: d.id, ...d.data() };
};

/* =========================
   GET ALL ENROLLMENTS FOR STUDENT (full history)
========================= */
export const getStudentEnrollmentHistory = async (studentId) => {
  const q = query(enrollmentRef, where("studentId", "==", studentId), orderBy("session", "desc"));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/* =========================
   GET ALL STUDENTS IN A CLASS/SESSION/TERM
========================= */
export const getEnrollmentsByFilter = async ({ classId, session, term } = {}) => {
  let q = query(enrollmentRef, where("status", "==", "active"));

  if (classId) q = query(q, where("classId", "==", classId));
  if (session) q = query(q, where("session", "==", session));
  if (term) q = query(q, where("term", "==", term));

  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

/* =========================
   PROMOTE STUDENTS
   Creates new enrollment docs — old ones preserved as history
========================= */
export const promoteStudents = async (studentIds, targetClassId, newSession, newTerm) => {
  if (!studentIds?.length || !targetClassId || !newSession?.trim()) {
    throw new Error("studentIds, targetClassId, and newSession are required.");
  }

  const settings = await getSettings();
  const term = newTerm || settings?.currentTerm;

  const promoted = [];
  const failed = [];
  const CHUNK_SIZE = 249; // 2 writes per student (update old + add new)

  for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
    const chunk = studentIds.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const studentId of chunk) {
      try {
        // 1️⃣ Mark old active enrollment as promoted
        const oldQ = await getDocs(
          query(
            enrollmentRef,
            where("studentId", "==", studentId),
            where("status", "==", "active"),
          ),
        );

        oldQ.forEach((oldDoc) => {
          batch.update(oldDoc.ref, {
            status: "promoted",
            promotedAt: serverTimestamp(),
          });
        });

        // 2️⃣ Create new enrollment in target class/session/term
        const newRef = doc(enrollmentRef); // auto-id
        batch.set(newRef, {
          studentId,
          classId: targetClassId,
          session: newSession.trim(),
          term,
          status: "active",
          enrolledAt: serverTimestamp(),
          promotedAt: null,
        });

        promoted.push(studentId);
      } catch (err) {
        console.error(`Failed student ${studentId}:`, err);
        failed.push(studentId);
      }
    }

    await batch.commit();
  }

  return { promoted, failed };
};
