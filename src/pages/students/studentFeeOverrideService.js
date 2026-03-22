import { collection, addDoc, getDocs, query, where, deleteDoc, doc } from "firebase/firestore";
import { db } from "../../firebase/firestore";

const overrideRef = collection(db, "studentFeeOverrides");

/**
 * Disable a fee for a specific student.
 * The existence of this document IS the override — no `disabled` field needed.
 * ✅ FIXED: removed `disabled: true` field to prevent inconsistency between
 *    components that check doc existence vs. components that filter by `disabled` field.
 */
export const disableStudentFee = async (studentId, feeId) => {
  return await addDoc(overrideRef, {
    studentId,
    feeId,
    createdAt: new Date(),
  });
};

/**
 * Re-enable a fee by deleting the override document.
 */
export const enableStudentFee = async (overrideId) => {
  return await deleteDoc(doc(db, "studentFeeOverrides", overrideId));
};

/**
 * Get all active overrides for a student.
 * Each returned object has { id, studentId, feeId, createdAt }.
 * A fee is "disabled" if its feeId appears in this list — no boolean field needed.
 */
export const getStudentFeeOverrides = async (studentId) => {
  const q = query(overrideRef, where("studentId", "==", studentId));
  const snapshot = await getDocs(q);

  return snapshot.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));
};
