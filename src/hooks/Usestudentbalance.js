import { getFeesByClass } from "../pages/fees/feesService";
import { getStudentFeeOverrides } from "../pages/students/studentFeeOverrideService";
import { getPaymentsByStudent } from "../pages/fees/paymentService";

/**
 * Calculate the net balance for a single student for a given session + term.
 *
 * This is the single source of truth for the formula:
 *   effectiveFees = classFees - overriddenFees
 *   balance = effectiveFees - paymentsForTerm
 *
 * Previously this logic was duplicated in:
 *   - FamilyList.jsx (calculateFamilyFinancials)
 *   - FamilyDetails.jsx (feeMap loop)
 *   - getDashboardFinanceStats (student loop)
 *   - StudentDetails.jsx (inline)
 *
 * @param {string} studentId
 * @param {string} classId
 * @param {string} session  e.g. "2024/2025"
 * @param {string} term     e.g. "1st Term"
 * @returns {{ totalFees, totalPaid, balance, effectiveFees }}
 */
export async function calculateStudentBalance(studentId, classId, session, term) {
  const [classFees, overrides, allPayments] = await Promise.all([
    getFeesByClass(classId, session, term),
    getStudentFeeOverrides(studentId),
    getPaymentsByStudent(studentId),
  ]);

  const disabledFeeIds = new Set(overrides.map((o) => o.feeId));

  const effectiveFees = classFees.filter((f) => !disabledFeeIds.has(f.id));

  const totalFees = effectiveFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  const termPayments = allPayments.filter((p) => p.term === term && p.session === session);
  const totalPaid = termPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return {
    totalFees,
    totalPaid,
    balance: totalFees - totalPaid,
    effectiveFees,
    termPayments,
  };
}
