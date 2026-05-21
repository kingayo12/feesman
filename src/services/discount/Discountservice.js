/**
 * discountService.js
 * Manages discount definitions and their assignments to families / students.
 *
 * Place in: src/pages/discounts/discountService.js
 *
 * ── Firestore: discounts ──────────────────────────────────────────────────
 * {
 *   name:         string,   // "Sibling discount – 3 children"
 *   description:  string,
 *   type:         "fixed" | "percentage" | "free_child",
 *   value:        number,   // ₦ amount, % value, or 0 for free_child (calculated at runtime)
 *   scope:        "school_fees" | "specific_types" | "all_fees",
 *   feeTypes:     string[], // only used when scope === "specific_types"
 *   triggerType:  "child_count" | "manual_family" | "manual_student",
 *   triggerCount: number,   // only used when triggerType === "child_count"
 *   session:      string,   // academic year it applies to, or "all"
 *   active:       boolean,
 *   createdAt:    Timestamp,
 * }
 *
 * ── Firestore: discountAssignments ───────────────────────────────────────
 * {
 *   discountId:   string,
 *   targetType:   "family" | "student",
 *   targetId:     string,   // familyId or studentId
 *   session:      string,
 *   note:         string,
 *   assignedBy:   string,
 *   createdAt:    Timestamp,
 * }
 */

import {
  collection,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";

const DISCOUNTS = "discounts";
const ASSIGNMENTS = "discountAssignments";

// ─── Discount CRUD ────────────────────────────────────────────────────────

export const createDiscount = async (data) => {
  const ref = await addDoc(collection(db, DISCOUNTS), {
    name: data.name || "",
    description: data.description || "",
    type: data.type || "fixed",
    value: Number(data.value || 0),
    scope: data.scope || "school_fees",
    feeTypes: data.feeTypes || [],
    triggerType: data.triggerType || "manual_family",
    triggerCount: Number(data.triggerCount || 0),
    session: data.session || "all",
    active: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
};

export const updateDiscount = async (id, data) => {
  await updateDoc(doc(db, DISCOUNTS, id), { ...data, updatedAt: serverTimestamp() });
};

export const deleteDiscount = async (id) => {
  // Also remove all assignments for this discount
  const snap = await getDocs(query(collection(db, ASSIGNMENTS), where("discountId", "==", id)));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, DISCOUNTS, id));
};

export const getAllDiscounts = async () => {
  const snap = await getDocs(collection(db, DISCOUNTS));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getActiveDiscounts = async (session) => {
  const q = query(collection(db, DISCOUNTS), where("active", "==", true));
  const snap = await getDocs(q);
  return snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((d) => d.session === "all" || d.session === session);
};

// ─── Assignments ──────────────────────────────────────────────────────────

export const assignDiscount = async ({
  discountId,
  targetType,
  targetId,
  session,
  note = "",
  assignedBy = "",
}) => {
  // Deterministic ID → prevents duplicate assignments
  const docId = `${discountId}_${targetType}_${targetId}_${session.replace(/\//g, "-")}`;
  await setDoc(
    doc(db, ASSIGNMENTS, docId),
    {
      discountId,
      targetType,
      targetId,
      session,
      note,
      assignedBy,
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );
  return docId;
};

export const removeAssignment = async (assignmentId) => {
  await deleteDoc(doc(db, ASSIGNMENTS, assignmentId));
};

export const getAssignmentsForFamily = async (familyId, session) => {
  const q = query(
    collection(db, ASSIGNMENTS),
    where("targetType", "==", "family"),
    where("targetId", "==", familyId),
    where("session", "==", session),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAssignmentsForStudent = async (studentId, session) => {
  const q = query(
    collection(db, ASSIGNMENTS),
    where("targetType", "==", "student"),
    where("targetId", "==", studentId),
    where("session", "==", session),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAllAssignmentsForSession = async (session) => {
  const q = query(collection(db, ASSIGNMENTS), where("session", "==", session));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

// ─── Calculation helper ────────────────────────────────────────────────────
/**
 * Compute total discount amount for one student.
 *
 * @param {string}   studentId
 * @param {string}   familyId
 * @param {string}   session
 * @param {object[]} fees          - effective (non-overridden) fee objects [{id, feeType, amount}]
 * @param {number}   siblingCount  - total active students in the same family this session
 * @param {object[]} activeDiscounts - from getActiveDiscounts()
 * @param {object[]} familyAssignments - from getAssignmentsForFamily()
 * @param {object[]} studentAssignments - from getAssignmentsForStudent()
 *
 * Returns { totalDiscount, breakdown[] }
 */
export const computeStudentDiscount = ({
  studentId,
  familyId,
  session,
  fees = [],
  siblingCount = 1,
  activeDiscounts = [],
  familyAssignments = [],
  studentAssignments = [],
}) => {
  const schoolFeeTypes = ["School Fees", "Tuition", "Tuition Fee", "school fees"];
  const breakdown = [];

  // Gather all applicable discounts for this student
  const applicable = activeDiscounts.filter((d) => {
    if (!d.active) return false;
    if (d.session !== "all" && d.session !== session) return false;

    if (d.triggerType === "child_count") {
      return siblingCount >= d.triggerCount;
    }
    if (d.triggerType === "manual_family") {
      return familyAssignments.some((a) => a.discountId === d.id);
    }
    if (d.triggerType === "manual_student") {
      return studentAssignments.some((a) => a.discountId === d.id);
    }
    return false;
  });

  let totalDiscount = 0;

  for (const discount of applicable) {
    // Determine eligible fees
    let eligibleFees = fees;
    if (discount.scope === "school_fees") {
      eligibleFees = fees.filter((f) =>
        schoolFeeTypes.some((t) => f.feeType?.toLowerCase().includes(t.toLowerCase())),
      );
      // If no fees match school_fees label, fall back to all fees
      if (!eligibleFees.length) eligibleFees = fees;
    } else if (discount.scope === "specific_types" && discount.feeTypes?.length) {
      eligibleFees = fees.filter((f) =>
        discount.feeTypes.some((t) => f.feeType?.toLowerCase().includes(t.toLowerCase())),
      );
    }

    const eligibleTotal = eligibleFees.reduce((s, f) => s + Number(f.amount || 0), 0);
    let amount = 0;

    if (discount.type === "fixed") {
      amount = Math.min(Number(discount.value), eligibleTotal);
    } else if (discount.type === "percentage") {
      amount = Math.round((Number(discount.value) / 100) * eligibleTotal);
    } else if (discount.type === "free_child") {
      // Waive the full eligible fees for this student (one child's fees)
      amount = eligibleTotal;
    }

    amount = Math.max(amount, 0);
    totalDiscount += amount;

    breakdown.push({
      discountId: discount.id,
      discountName: discount.name,
      type: discount.type,
      scope: discount.scope,
      amount,
    });
  }

  return { totalDiscount, breakdown };
};
