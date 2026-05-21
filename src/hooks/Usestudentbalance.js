import { getFeesByClass } from "../services/fees/feesService";
import { getStudentFeeOverrides } from "../services/students/studentFeeOverrideService";
import { getPaymentsByStudent } from "../services/payment-history/paymentService";
import { getStudentAssignments } from "../services/inventory/inventoryService";
import { computeStudentDiscount } from "../services/discount/Discountservice";
import {
  getCachedDiscounts,
  getCachedPreviousBalanceAmount,
  getCachedAssignmentsForFamily,
  getCachedAssignmentsForStudent,
} from "../utils/offlineDataManager";

/**
 * Calculate the net balance for a single student for a given session + term.
 *
 * Formula:
 *   effectiveFees  = classFees - overriddenFees
 *   netFees        = effectiveFees + previousBalance - discounts
 *   balance        = netFees - paymentsForTerm
 *
 * @param {string} studentId
 * @param {string} classId
 * @param {string} session      e.g. "2024/2025"
 * @param {string} term         e.g. "1st Term"
 * @param {object} [opts]
 * @param {string} [opts.familyId]        - pass in for discount calculation
 * @param {number} [opts.siblingCount]    - pass in for sibling discounts
 * @param {object[]} [opts.activeDiscounts]     - pre-loaded to avoid repeat fetches
 * @param {object[]} [opts.familyAssignments]   - pre-loaded to avoid repeat fetches
 * @returns {{ totalFees, totalPaid, balance, effectiveFees, totalDiscount, previousBalance }}
 */
export async function calculateStudentBalance(studentId, classId, session, term, opts = {}) {
  const {
    familyId = null,
    siblingCount = 1,
    activeDiscounts: preloadedDiscounts = null,
    familyAssignments: preloadedFamilyAssignments = null,
  } = opts;

  const [classFees, overrides, allPayments, previousBalance, stuAssignments] = await Promise.all([
    getFeesByClass(classId, session, term),
    getStudentFeeOverrides(studentId),
    getPaymentsByStudent(studentId, session, term),
    getCachedPreviousBalanceAmount(studentId, session).catch(() => 0),
    getCachedAssignmentsForStudent(studentId, session).catch(() => []),
  ]);

  // ── Inventory assignments (studentInventory) ─────────────────────────
  let invTotal = 0;
  try {
    const invAssignments = await getStudentAssignments(studentId, { academicYear: session, term });
    invTotal = (invAssignments || []).reduce((s, a) => s + Number(a.totalAmount || 0), 0);
  } catch (err) {
    // ignore inventory fetch errors — don't block balance calc
    invTotal = 0;
  }

  // ── Effective fees (minus overrides) ──────────────────────────────────
  const disabledFeeIds = new Set(overrides.map((o) => o.feeId));
  const effectiveFees = classFees.filter((f) => !disabledFeeIds.has(f.id));
  const termFees = effectiveFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  // ── Discounts ─────────────────────────────────────────────────────────
  let totalDiscount = 0;
  try {
    const activeDiscounts =
      preloadedDiscounts ?? (await getCachedDiscounts(session).catch(() => []));

    const famAssignments =
      preloadedFamilyAssignments ??
      (familyId ? await getCachedAssignmentsForFamily(familyId, session).catch(() => []) : []);

    const result = computeStudentDiscount({
      studentId,
      familyId,
      session,
      fees: effectiveFees,
      siblingCount,
      activeDiscounts,
      familyAssignments: famAssignments,
      studentAssignments: stuAssignments,
    });

    totalDiscount = result.totalDiscount ?? 0;
  } catch (err) {}

  // ── Net fees = term fees + arrears - discounts ────────────────────────
  const totalFees = Math.max(termFees + Number(previousBalance || 0) + invTotal - totalDiscount, 0);
  const totalPaid = allPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return {
    totalFees,
    totalPaid,
    balance: totalFees - totalPaid,
    effectiveFees,
    termPayments: allPayments,
    totalDiscount,
    previousBalance: Number(previousBalance || 0),
    inventoryTotal: invTotal,
  };
}
