import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { getStudentFeeOverrides } from "../students/studentFeeOverrideService";
import { getPreviousBalanceAmount } from "../previous_balance/Previousbalanceservice";
import {
  getActiveDiscounts,
  getAssignmentsForFamily,
  getAssignmentsForStudent,
  computeStudentDiscount,
} from "../discount/Discountservice";

export const getDashboardFinanceStats = async (selectedSession, selectedTerm) => {
  const empty = {
    totalStudents: 0,
    totalFees: 0,
    totalPayments: 0,
    outstanding: 0,
    totalDiscounts: 0,
    totalArrears: 0,
    recentPayments: [],
    classBreakdown: [],
    termTrend: [],
    collectionByMethod: [],
  };
  if (!selectedSession || !selectedTerm) return empty;

  const [studentsSnap, paymentsSnap, recentSnap, allTermPaymentsSnap] = await Promise.all([
    getDocs(
      query(
        collection(db, "students"),
        where("session", "==", selectedSession),
        where("status", "==", "active"),
      ),
    ),
    getDocs(
      query(
        collection(db, "payments"),
        where("session", "==", selectedSession),
        where("term", "==", selectedTerm),
      ),
    ),
    getDocs(
      query(
        collection(db, "payments"),
        where("session", "==", selectedSession),
        where("term", "==", selectedTerm),
        orderBy("date", "desc"),
        limit(5),
      ),
    ),
    getDocs(query(collection(db, "payments"), where("session", "==", selectedSession))),
  ]);

  const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const allPayments = allTermPaymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Pre-load active discounts once for the whole session
  const activeDiscounts = await getActiveDiscounts(selectedSession);

  // ── Per-student fee + arrears + discount calculation ─────────────────────
  let totalExpectedRevenue = 0;
  let totalArrearsSum = 0;
  let totalDiscountsSum = 0;
  const classTotalsMap = {};

  // Group students by family to get sibling counts
  const familyGroups = {};
  students.forEach((s) => {
    if (s.familyId) familyGroups[s.familyId] = (familyGroups[s.familyId] || []).concat(s);
  });

  // Pre-load family-level assignments in bulk (one call per unique family)
  const familyAssignmentCache = {};
  for (const familyId of Object.keys(familyGroups)) {
    familyAssignmentCache[familyId] = await getAssignmentsForFamily(familyId, selectedSession);
  }

  for (const student of students) {
    const [feesSnap, overrides, prevBal, stuAssignments] = await Promise.all([
      getDocs(
        query(
          collection(db, "fees"),
          where("classId", "==", student.classId),
          where("session", "==", selectedSession),
          where("term", "==", selectedTerm),
        ),
      ),
      getStudentFeeOverrides(student.id),
      getPreviousBalanceAmount(student.id, selectedSession),
      getAssignmentsForStudent(student.id, selectedSession),
    ]);

    const classFees = feesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const disabledFeeIds = new Set(overrides.map((o) => o.feeId));
    const effectiveFees = classFees.filter((f) => !disabledFeeIds.has(f.id));
    const termFees = effectiveFees.reduce((s, f) => s + Number(f.amount || 0), 0);

    const siblings = familyGroups[student.familyId] || [student];
    const famAssignments = familyAssignmentCache[student.familyId] || [];

    const { totalDiscount } = computeStudentDiscount({
      studentId: student.id,
      familyId: student.familyId,
      session: selectedSession,
      fees: effectiveFees,
      siblingCount: siblings.length,
      activeDiscounts,
      familyAssignments: famAssignments,
      studentAssignments: stuAssignments,
    });

    const netFees = Math.max(termFees + Number(prevBal || 0) - totalDiscount, 0);

    totalExpectedRevenue += netFees;
    totalArrearsSum += Number(prevBal || 0);
    totalDiscountsSum += totalDiscount;

    // Per-class breakdown
    if (!classTotalsMap[student.classId]) {
      classTotalsMap[student.classId] = { classId: student.classId, fees: 0, paid: 0 };
    }
    classTotalsMap[student.classId].fees += netFees;
    const studentPaid = payments
      .filter((p) => p.studentId === student.id)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    classTotalsMap[student.classId].paid += studentPaid;
  }

  // ── Class names ───────────────────────────────────────────────────────────
  const classSnap = await getDocs(collection(db, "classes"));
  const classNames = {};
  classSnap.docs.forEach((d) => {
    classNames[d.id] = d.data().name;
  });

  const classBreakdown = Object.values(classTotalsMap)
    .map((c) => ({
      ...c,
      name: classNames[c.classId] || c.classId,
      outstanding: Math.max(c.fees - c.paid, 0),
    }))
    .sort((a, b) => b.fees - a.fees)
    .slice(0, 8);

  // ── Term trend ────────────────────────────────────────────────────────────
  const TERMS = ["1st Term", "2nd Term", "3rd Term"];
  const termTrend = TERMS.map((term) => ({
    term,
    paid: allPayments.filter((p) => p.term === term).reduce((s, p) => s + Number(p.amount || 0), 0),
  }));

  // ── Payment methods ───────────────────────────────────────────────────────
  const methodMap = {};
  payments.forEach((p) => {
    const m = p.method || "Other";
    methodMap[m] = (methodMap[m] || 0) + Number(p.amount || 0);
  });
  const collectionByMethod = Object.entries(methodMap)
    .map(([method, amount]) => ({ method, amount }))
    .sort((a, b) => b.amount - a.amount);

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalPaymentsReceived = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const recentPayments = recentSnap.docs.map((doc) => {
    const payment = doc.data();
    const student = students.find((s) => s.id === payment.studentId);
    return {
      id: doc.id,
      ...payment,
      studentName: student ? `${student.firstName} ${student.lastName}` : "Unknown",
      date: payment.date?.toDate() || new Date(),
    };
  });

  return {
    totalStudents: students.length,
    totalFees: totalExpectedRevenue, // net of discounts + arrears
    totalPayments: totalPaymentsReceived,
    outstanding: Math.max(totalExpectedRevenue - totalPaymentsReceived, 0),
    totalDiscounts: totalDiscountsSum, // ← new
    totalArrears: totalArrearsSum, // ← new
    recentPayments,
    classBreakdown,
    termTrend,
    collectionByMethod,
  };
};
