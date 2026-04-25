import { collection, getDocs, query, where, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { getStudentById } from "../students/studentService";
import {
  getCachedStudentFeeOverrides,
  getCachedPreviousBalanceAmount,
  getCachedAssignmentsForFamily,
  getCachedAssignmentsForStudent,
  getCachedDiscounts,
} from "../../utils/offlineDataManager";
import { computeStudentDiscount } from "../discount/Discountservice";

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
        where("term", "==", normalizeTerm(selectedTerm)),
      ),
    ),
    getDocs(
      query(
        collection(db, "payments"),
        where("session", "==", selectedSession),
        where("term", "==", normalizeTerm(selectedTerm)),
        orderBy("date", "desc"),
        limit(5),
      ),
    ),
    getDocs(query(collection(db, "payments"), where("session", "==", selectedSession))),
  ]);

  const students = studentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const payments = paymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const allPayments = allTermPaymentsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Pre-load active discounts once for the whole session using the cached import
  const activeDiscounts = await getCachedDiscounts(selectedSession);

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
    try {
      familyAssignmentCache[familyId] = await getCachedAssignmentsForFamily(
        familyId,
        selectedSession,
      );
    } catch (err) {
      console.warn(
        "[dashboardService] Failed to load family discount assignments for",
        familyId,
        err,
      );
      familyAssignmentCache[familyId] = [];
    }
  }

  for (const student of students) {
    const feeQuery = student.classId
      ? query(
          collection(db, "fees"),
          where("classId", "==", student.classId),
          where("session", "==", selectedSession),
          where("term", "==", normalizeTerm(selectedTerm)),
        )
      : null;

    const [feesSnap, overrides, prevBal, stuAssignments] = await Promise.all([
      feeQuery
        ? getDocs(feeQuery).catch((err) => {
            console.warn("[dashboardService] Failed to load class fees for", student.classId, err);
            return { docs: [] };
          })
        : { docs: [] },
      getCachedStudentFeeOverrides(student.id).catch((err) => {
        console.warn("[dashboardService] Failed to load fee overrides for", student.id, err);
        return [];
      }),
      getCachedPreviousBalanceAmount(student.id, selectedSession).catch((err) => {
        console.warn("[dashboardService] Failed to load previous balance for", student.id, err);
        return 0;
      }),
      getCachedAssignmentsForStudent(student.id, selectedSession).catch((err) => {
        console.warn(
          "[dashboardService] Failed to load student discount assignments for",
          student.id,
          err,
        );
        return [];
      }),
    ]);

    const classFees = feesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const disabledFeeIds = new Set(overrides.map((o) => o.feeId));
    const effectiveFees = classFees.filter((f) => !disabledFeeIds.has(f.id));
    const termFees = effectiveFees.reduce((s, f) => s + Number(f.amount || 0), 0);

    const siblings = familyGroups[student.familyId] || [student];
    const famAssignments = familyAssignmentCache[student.familyId] || [];
    const studentClassKey = student.classId || "unknown";

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
    if (!classTotalsMap[studentClassKey]) {
      classTotalsMap[studentClassKey] = { classId: studentClassKey, fees: 0, paid: 0 };
    }
    classTotalsMap[studentClassKey].fees += netFees;
    const studentPaid = payments
      .filter((p) => p.studentId === student.id)
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    classTotalsMap[studentClassKey].paid += studentPaid;
  }

  // ── Class names ───────────────────────────────────────────────────────────
  let classNames = {};
  try {
    const classSnap = await getDocs(collection(db, "classes"));
    classSnap.docs.forEach((d) => {
      classNames[d.id] = d.data().name;
    });
  } catch (err) {
    console.warn("[dashboardService] Failed to load classes:", err);
    classNames = {};
  }

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
    totalFees: totalExpectedRevenue,
    totalPayments: totalPaymentsReceived,
    outstanding: Math.max(totalExpectedRevenue - totalPaymentsReceived, 0),
    totalDiscounts: totalDiscountsSum,
    totalArrears: totalArrearsSum,
    recentPayments,
    classBreakdown,
    termTrend,
    collectionByMethod,
  };
};

export async function getTodayPayments(academicYear, currentTerm) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  try {
    const snap = await getDocs(
      query(
        collection(db, "payments"),
        where("session", "==", academicYear),
        where("term", "==", normalizeTerm(currentTerm)),
        where("createdAt", ">=", Timestamp.fromDate(today)),
        where("date", "<", Timestamp.fromDate(tomorrow)),
        orderBy("createdAt", "desc"),
      ),
    );

    const payments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const total = payments.reduce((s, p) => s + (p.amount || 0), 0);
    const studentsPaid = new Set(payments.map((p) => p.studentId)).size;
    const methodsUsed = new Set(payments.map((p) => p.method)).size;

    // Fetch student names for recent payments
    const recentPaymentsSlice = payments.slice(0, 10);
    const uniqueStudentIds = [
      ...new Set(recentPaymentsSlice.map((p) => p.studentId).filter(Boolean)),
    ];
    const studentPromises = uniqueStudentIds.map((id) => getStudentById(id));
    const students = await Promise.all(studentPromises);
    const studentMap = new Map(
      students.filter(Boolean).map((s) => [s.id, `${s.firstName} ${s.lastName}`]),
    );

    const recentPayments = recentPaymentsSlice.map((p) => ({
      id: p.id,
      studentName: studentMap.get(p.studentId) || "Unknown",
      method: p.method,
      amount: p.amount,
    }));

    return { total, count: payments.length, studentsPaid, methodsUsed, recentPayments };
  } catch (err) {
    console.warn("[dashboardService] Failed to load today payments:", err);
    return { total: 0, count: 0, studentsPaid: 0, methodsUsed: 0, recentPayments: [] };
  }
}
