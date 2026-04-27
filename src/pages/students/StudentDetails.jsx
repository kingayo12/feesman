import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStudentById, getStudentsByFamily } from "./studentService";
import { getFeesByClass } from "../fees/feesService";
import { getPaymentsByStudent } from "../fees/paymentService";
import { getClasses } from "../classes/classService";
import { getCurrentEnrollment } from "./enrollmentService";
import PaymentForm from "../../components/forms/PaymentForm";
import StudentReceipt from "./StudentReciept";
import { formatDate } from "../../utils/helpers";
import { getSettings } from "../settings/settingService";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import {
  disableStudentFee,
  enableStudentFee,
  getStudentFeeOverrides,
} from "./studentFeeOverrideService";
import { getPreviousBalance } from "../previous_balance/Previousbalanceservice";
import {
  getActiveDiscounts,
  getAssignmentsForFamily,
  getAssignmentsForStudent,
  computeStudentDiscount,
} from "../discount/Discountservice";
import { StudentDetailsSkeleton } from "../../components/common/Skeleton";
import {
  HiArrowLeft,
  HiCurrencyDollar,
  HiCreditCard,
  HiReceiptTax,
  HiCalendar,
  HiUserCircle,
  HiClock,
  HiCheckCircle,
  HiMinusCircle,
  HiExclamationCircle,
  HiTag,
  HiDocumentText,
} from "react-icons/hi";

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [enrollment, setEnrollment] = useState(null); // current active enrollment
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState([]);
  const [settings, setSettings] = useState({ academicYear: "", currentTerm: "" });
  const [selectedTerm, setSelectedTerm] = useState("");
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [prevBalance, setPrevBalance] = useState(0);
  const [discountData, setDiscountData] = useState({ totalDiscount: 0, breakdown: [] });
  const { can } = useRole();

  // ── Derived from enrollment (not student doc) ─────────────────────────────
  // classId and session now live in studentEnrollments, not the student doc.
  const classId = enrollment?.classId || null;
  const session = enrollment?.session || settings?.academicYear || "";

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getClassName = (cid) => classes.find((c) => c.id === cid)?.name ?? "Not Assigned";

  const loadPayments = async () => {
    try {
      setPayments((await getPaymentsByStudent(id)) || []);
    } catch (e) {
      console.error("loadPayments error:", e);
    }
  };

  const refreshOverrides = async () => {
    try {
      setOverrides((await getStudentFeeOverrides(id)) || []);
    } catch (e) {
      console.error("refreshOverrides error:", e);
    }
  };

  const loadFeesForTerm = async (cid, sess, term) => {
    try {
      if (!cid || !sess || !term) {
        setFees([]);
        return;
      }
      setFees((await getFeesByClass(cid, sess, term)) || []);
    } catch (e) {
      console.error("loadFeesForTerm error:", e);
      setFees([]);
    }
  };

  const handleToggleFee = async (feeId) => {
    try {
      const existing = overrides.find((o) => o.feeId === feeId);
      if (existing) await enableStudentFee(existing.id);
      else await disableStudentFee(id, feeId);
      await refreshOverrides();
    } catch (e) {
      console.error(e);
      alert("Failed to update fee status.");
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);

        const [appSettings, classData, studentData, enrollmentData] = await Promise.all([
          getSettings(),
          getClasses(),
          getStudentById(id),
          getCurrentEnrollment(id), // ← fetch active enrollment
        ]);

        setSettings(appSettings || {});
        setClasses(classData || []);
        setStudent(studentData);
        setEnrollment(enrollmentData); // may be null if not enrolled this term

        const activeSession = enrollmentData?.session || appSettings?.academicYear;
        const activeTerm = enrollmentData?.term || appSettings?.currentTerm || "1st Term";

        // Previous balance
        if (activeSession) {
          try {
            const pb = await getPreviousBalance(id, activeSession);
            setPrevBalance(pb ? Number(pb.amount || 0) : 0);
          } catch {
            setPrevBalance(0);
          }
        }

        // Discounts
        if (activeSession && studentData?.familyId) {
          try {
            // getStudentsByFamily accepts only familyId — no session arg
            const [siblings, activeDiscounts, famAssignments, stuAssignments] = await Promise.all([
              getStudentsByFamily(studentData.familyId),
              getActiveDiscounts(activeSession),
              getAssignmentsForFamily(studentData.familyId, activeSession),
              getAssignmentsForStudent(id, activeSession),
            ]);

            setDiscountData({
              _raw: {
                activeDiscounts,
                famAssignments,
                stuAssignments,
                siblingCount: siblings.length,
              },
              totalDiscount: 0,
              breakdown: [],
            });
          } catch (e) {
            console.error("Discount load error:", e);
          }
        }

        await Promise.all([refreshOverrides(), loadPayments()]);
        setSelectedTerm(activeTerm);
      } catch (e) {
        console.error("StudentDetails init error:", e);
      } finally {
        setLoading(false);
      }
    }

    init();
  }, [id]);

  // ── Reload fees when selected term changes ────────────────────────────────
  // Uses classId + session from enrollment doc, not student doc.
  useEffect(() => {
    if (classId && session && selectedTerm) {
      loadFeesForTerm(classId, session, selectedTerm);
    } else {
      setFees([]);
    }
  }, [selectedTerm, classId, session]);

  // ── Re-compute discount when fees or overrides change ────────────────────
  useEffect(() => {
    if (!discountData?._raw) return;
    const { activeDiscounts, famAssignments, stuAssignments, siblingCount } = discountData._raw;
    const effectiveFeeList = fees.filter((f) => !overrides.map((o) => o.feeId).includes(f.id));
    const result = computeStudentDiscount({
      studentId: id,
      familyId: student?.familyId,
      session,
      fees: effectiveFeeList,
      siblingCount,
      activeDiscounts,
      familyAssignments: famAssignments,
      studentAssignments: stuAssignments,
    });
    setDiscountData((prev) => ({ ...prev, ...result }));
  }, [fees, overrides, discountData?._raw]);

  // ── Derived financials ────────────────────────────────────────────────────
  const disabledFeeIds = overrides.map((o) => o.feeId);
  const effectiveFees = fees.filter((f) => !disabledFeeIds.includes(f.id));
  const currentTermFees = effectiveFees.reduce((s, f) => s + Number(f.amount || 0), 0);
  const termTotalFees = currentTermFees + prevBalance;
  const discount = discountData.totalDiscount || 0;
  const netFees = Math.max(termTotalFees - discount, 0);
  const termSpecificPay = payments.filter((p) => p.term === selectedTerm);
  const termTotalPaid = termSpecificPay.reduce((s, p) => s + Number(p.amount || 0), 0);
  const termBalance = netFees - termTotalPaid;
  const totalPaidAllTime = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <StudentDetailsSkeleton />;
  if (!student) return <div className='error-bar'>Student record not found.</div>;

  return (
    <div className='student-details-wrapper'>
      <button className='back-link' onClick={() => navigate(-1)}>
        <HiArrowLeft /> Student Directory
      </button>

      {/* ── Profile Hero ── */}
      <div className='profile-hero'>
        <div className='profile-main'>
          <div className='hero-avatar'>
            <HiUserCircle />
          </div>
          <div>
            <h1>
              {student.firstName} {student.lastName}
            </h1>
            <p className='sub-info'>
              <HiCalendar /> {session || "No session"} • <strong>{getClassName(classId)}</strong>
              {!enrollment && (
                <span style={{ color: "#f59e0b", fontSize: 12, marginLeft: 8 }}>
                  ⚠ Not enrolled this term
                </span>
              )}
              {prevBalance > 0 && (
                <span className='prev-bal-badge'>
                  <HiExclamationCircle /> ₦{prevBalance.toLocaleString()} arrears
                </span>
              )}
              {discount > 0 && (
                <span className='discount-badge'>
                  <HiTag /> ₦{discount.toLocaleString()} discount
                </span>
              )}
            </p>
          </div>
        </div>

        <div className='hero-actions'>
          {can(PERMISSIONS.EDIT_STUDENT) && (
            <button
              className={`pay-toggle-btn ${showPaymentForm ? "active" : ""}`}
              onClick={() => setShowPaymentForm((v) => !v)}
            >
              {showPaymentForm ? "Cancel" : "+ Record Payment"}
            </button>
          )}
          {can(PERMISSIONS.VIEW_LETTERS) && (
            <button
              className='outline-btn'
              onClick={() => navigate(`/letters?context=student&id=${id}&template=fees`)}
            >
              <HiDocumentText /> Generate Letter
            </button>
          )}
        </div>
      </div>

      {/* ── Banners ── */}
      {prevBalance > 0 && (
        <div className='pb-alert-banner'>
          <HiExclamationCircle />
          <span>
            This student has <strong>₦{prevBalance.toLocaleString()}</strong> in carried-forward
            arrears added to the current term total.
          </span>
        </div>
      )}
      {discount > 0 && (
        <div className='discount-alert-banner'>
          <HiTag />
          <span>
            <strong>₦{discount.toLocaleString()}</strong> discount applied.{" "}
            {discountData.breakdown.map((b) => b.discountName).join(", ")}
          </span>
        </div>
      )}

      {/* ── Not enrolled warning ── */}
      {!enrollment && !loading && (
        <div
          style={{
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            borderRadius: 8,
            background: "#fefce8",
            border: "1px solid #fde68a",
            color: "#854d0e",
            fontSize: 13,
          }}
        >
          <HiExclamationCircle style={{ marginRight: 6, verticalAlign: "middle" }} />
          This student has no active enrollment for the current term. Fees cannot be displayed until
          they are enrolled. Use the <strong>Edit Student</strong> or <strong>Promote</strong> flow
          to enroll them.
        </div>
      )}

      {/* ── Payment Form ── */}
      {showPaymentForm && (
        <div className='form-card animate-slide'>
          <PaymentForm
            studentId={id}
            familyId={student.familyId}
            term={selectedTerm}
            session={session}
            onSuccess={() => {
              loadPayments();
              setShowPaymentForm(false);
            }}
          />
        </div>
      )}

      {/* ── Term Tabs ── */}
      <div className='term-selector-tabs'>
        {["1st Term", "2nd Term", "3rd Term"].map((term) => (
          <button
            key={term}
            className={`term-tab ${selectedTerm === term ? "active" : ""}`}
            onClick={() => setSelectedTerm(term)}
          >
            <HiClock /> {term}
          </button>
        ))}
      </div>

      {/* ── Finance Cards ── */}
      <div className='finance-grid'>
        <div className='finance-card'>
          <div className='f-icon blue'>
            <HiReceiptTax />
          </div>
          <div className='f-data'>
            <label>{selectedTerm} Total</label>
            <h3>₦{netFees.toLocaleString()}</h3>
            {(prevBalance > 0 || discount > 0) && (
              <small style={{ color: "#64748b", fontSize: 11 }}>
                {prevBalance > 0 && `+₦${prevBalance.toLocaleString()} arrears`}
                {prevBalance > 0 && discount > 0 && " · "}
                {discount > 0 && (
                  <span style={{ color: "#16a34a" }}>−₦{discount.toLocaleString()} discount</span>
                )}
              </small>
            )}
          </div>
        </div>

        <div className='finance-card'>
          <div className='f-icon green'>
            <HiCreditCard />
          </div>
          <div className='f-data'>
            <label>Total Paid (All Time)</label>
            <h3>₦{totalPaidAllTime.toLocaleString()}</h3>
          </div>
        </div>

        <div className='finance-card'>
          <div className={`f-icon ${termBalance > 0 ? "red" : "green-solid"}`}>
            <HiCurrencyDollar />
          </div>
          <div className='f-data'>
            <label>{selectedTerm} Balance</label>
            <h3 className={termBalance > 0 ? "debt" : "cleared"}>
              ₦{termBalance.toLocaleString()}
            </h3>
          </div>
        </div>
      </div>

      <div className='details-layout-grid'>
        <div className='main-content finance_details'>
          {/* ── Fee Breakdown ── */}
          <div className='billing-card'>
            <div className='card-top'>
              <h4>{selectedTerm} Breakdown</h4>
              <span className='count-badge'>
                {effectiveFees.length +
                  (prevBalance > 0 ? 1 : 0) +
                  (discount > 0 ? discountData.breakdown.length : 0)}{" "}
                Items
              </span>
            </div>
            <table className='ledger-table'>
              <thead>
                <tr>
                  <th>Description</th>
                  <th className='text-right'>Amount</th>
                  {can(PERMISSIONS.MANAGE_DISCOUNTS) && <th className='text-center'>Status</th>}
                </tr>
              </thead>
              <tbody>
                {/* Arrears row */}
                {prevBalance > 0 && (
                  <tr style={{ background: "#fffbeb" }}>
                    <td>
                      <span style={{ fontWeight: 600 }}>Previous Balance (Arrears)</span>
                      <small style={{ display: "block", color: "#d97706", fontSize: 11 }}>
                        Carried forward from earlier sessions
                      </small>
                    </td>
                    <td className='text-right font-bold' style={{ color: "#d97706" }}>
                      ₦{prevBalance.toLocaleString()}
                    </td>
                    {can(PERMISSIONS.MANAGE_DISCOUNTS) && (
                      <td className='text-center'>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "#fef9c3",
                            color: "#854d0e",
                            fontWeight: 600,
                          }}
                        >
                          Arrears
                        </span>
                      </td>
                    )}
                  </tr>
                )}

                {/* Fee rows */}
                {fees.length ? (
                  fees.map((f) => {
                    const dis = disabledFeeIds.includes(f.id);
                    return (
                      <tr key={f.id} className={dis ? "row-disabled" : ""}>
                        <td
                          style={{
                            textDecoration: dis ? "line-through" : "none",
                            color: dis ? "#9ca3af" : "inherit",
                          }}
                        >
                          {f.feeType} {dis && <small>(Excluded)</small>}
                        </td>
                        <td className='text-right font-bold'>
                          ₦{Number(f.amount).toLocaleString()}
                        </td>
                        {can(PERMISSIONS.MANAGE_DISCOUNTS) && (
                          <td className='text-center'>
                            <button
                              className={`toggle-btn ${dis ? "btn-enable" : "btn-disable"}`}
                              onClick={() => handleToggleFee(f.id)}
                            >
                              {dis ? (
                                <>
                                  <HiCheckCircle /> Include
                                </>
                              ) : (
                                <>
                                  <HiMinusCircle /> Exclude
                                </>
                              )}
                            </button>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan='3' className='empty-ledger'>
                      {!enrollment
                        ? "Student is not enrolled this term."
                        : "No fees defined for this term."}
                    </td>
                  </tr>
                )}

                {/* Discount line items */}
                {discountData.breakdown.map((b) => (
                  <tr key={b.discountId} style={{ background: "#f0fdf4" }}>
                    <td>
                      <span
                        style={{
                          fontWeight: 600,
                          color: "#166534",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        <HiTag style={{ width: 13, height: 13 }} /> {b.discountName}
                      </span>
                      <small style={{ fontSize: 11, color: "#16a34a" }}>
                        {b.scope === "school_fees"
                          ? "Applied to school fees"
                          : b.scope === "all_fees"
                            ? "Applied to all fees"
                            : "Applied to selected fees"}
                      </small>
                    </td>
                    <td className='text-right font-bold' style={{ color: "#16a34a" }}>
                      −₦{b.amount.toLocaleString()}
                    </td>
                    {can(PERMISSIONS.MANAGE_DISCOUNTS) && (
                      <td className='text-center'>
                        <span
                          style={{
                            fontSize: 11,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: "#dcfce7",
                            color: "#15803d",
                            fontWeight: 600,
                          }}
                        >
                          Discount
                        </span>
                      </td>
                    )}
                  </tr>
                ))}

                {/* Net total row */}
                <tr className='total-row'>
                  <td>
                    <strong>Net Total</strong>
                  </td>
                  <td className='text-right'>
                    <strong>₦{netFees.toLocaleString()}</strong>
                  </td>
                  {can(PERMISSIONS.MANAGE_DISCOUNTS) && <td />}
                </tr>
              </tbody>
            </table>
          </div>

          {/* ── Payment History ── */}
          <div className='history-card'>
            <div className='card-top'>
              <h4>{selectedTerm} Payments</h4>
              <span className='count-badge'>{termSpecificPay.length} Items</span>
            </div>
            <table className='data-table display'>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th className='text-right'>Amount</th>
                  <th className='text-center'>Action</th>
                </tr>
              </thead>
              <tbody>
                {termSpecificPay.length ? (
                  termSpecificPay.map((p) => (
                    <tr key={p.id}>
                      <td>{formatDate(p.date)}</td>
                      <td>{p.method}</td>
                      <td className='text-right font-bold'>₦{Number(p.amount).toLocaleString()}</td>
                      <td className='text-center'>
                        <button className='receipt-btn-small' onClick={() => setReceiptPayment(p)}>
                          <HiReceiptTax /> Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='4' className='empty-ledger'>
                      No payments for this term.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Receipt Modal ── */}
      {receiptPayment && (
        <StudentReceipt
          payment={receiptPayment}
          student={student}
          settings={settings}
          fees={effectiveFees}
          allPayments={payments}
          prevBalance={prevBalance}
          discountBreakdown={discountData.breakdown}
          onClose={() => setReceiptPayment(null)}
        />
      )}
    </div>
  );
}
