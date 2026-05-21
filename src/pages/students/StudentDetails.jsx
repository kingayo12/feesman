import { useEffect, useState } from "react";
import {
  HiArrowLeft,
  HiCalendar,
  HiCheckCircle,
  HiClock,
  HiCreditCard,
  HiCurrencyDollar,
  HiDocumentText,
  HiExclamationCircle,
  HiMinusCircle,
  HiReceiptTax,
  HiTag,
  HiUserCircle,
} from "react-icons/hi";
import { HiArchiveBox } from "react-icons/hi2";
import { useNavigate, useParams } from "react-router-dom";
import CustomButton from "../../components/common/CustomButton";
import { FormModal } from "../../components/common/Modal";
import { StudentDetailsSkeleton } from "../../components/common/Skeleton";
import PaymentForm from "../../components/forms/PaymentForm";
import { PERMISSIONS } from "../../config/permissions";
import { useRole } from "../../hooks/useRole";
import { getClasses } from "../../services/class/classService";
import {
  computeStudentDiscount,
  getActiveDiscounts,
  getAssignmentsForFamily,
  getAssignmentsForStudent,
} from "../../services/discount/Discountservice";
import { getFeesByClass } from "../../services/fees/feesService";
import {
  getStudentAssignments,
  markAssignmentPaid,
} from "../../services/inventory/inventoryService";
import { getPaymentsByStudent, recordPayment } from "../../services/payment-history/paymentService";
import { getPreviousBalance } from "../../services/previous_balance/Previousbalanceservice";
import { getSettings } from "../../services/settings/settingService";
import { getCurrentEnrollment } from "../../services/students/enrollmentService";
import {
  disableStudentFee,
  enableStudentFee,
  getStudentFeeOverrides,
} from "../../services/students/studentFeeOverrideService";
import { getStudentById, getStudentsByFamily } from "../../services/students/studentService";
import { formatDate } from "../../utils/helpers";
import StudentReceipt from "./StudentReciept";

// ─── Inventory payment form — rendered inside FormModal ───────────────────
function InventoryPaymentForm({ assignment, student, session, onClose, onSuccess }) {
  const outstanding = Number(assignment.totalAmount || 0) - Number(assignment.amountPaid || 0);

  const [amount, setAmount] = useState(String(outstanding));
  const [method, setMethod] = useState("Cash");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    const paid = Number(amount);
    if (!paid || paid <= 0) return setError("Enter a valid amount.");
    if (paid > outstanding)
      return setError(`Amount exceeds outstanding balance of ₦${outstanding.toLocaleString()}.`);

    setSaving(true);
    try {
      await recordPayment({
        studentId: student.id,
        familyId: student.familyId || null,
        amount: paid,
        method,
        term: assignment.term || "",
        session: session || assignment.academicYear || "",
        note: `Inventory: ${assignment.itemName}`,
        type: "inventory",
        inventoryAssignmentId: assignment.id,
      });

      // Mark paid if fully settled
      const newTotal = Number(assignment.amountPaid || 0) + paid;
      if (newTotal >= Number(assignment.totalAmount)) {
        await markAssignmentPaid(assignment.id, true);
      }

      onSuccess();
    } catch (err) {
      setError(err.message || "Failed to record payment.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Item + outstanding summary */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          background: "var(--bg-secondary)",
          borderRadius: 10,
          padding: "0.75rem 1rem",
          fontSize: 13,
        }}
      >
        <div>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>Item total</p>
          <p style={{ margin: 0, fontWeight: 700 }}>
            ₦{Number(assignment.totalAmount).toLocaleString()}
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ margin: 0, color: "var(--text-secondary)" }}>Outstanding</p>
          <p style={{ margin: 0, fontWeight: 700, color: "#dc2626" }}>
            ₦{outstanding.toLocaleString()}
          </p>
        </div>
      </div>

      {error && (
        <div
          style={{
            background: "var(--bg-danger)",
            color: "var(--text-danger)",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "0.6rem 0.875rem",
            fontSize: 13,
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <HiExclamationCircle style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Amount */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 6,
            color: "var(--text-secondary)",
          }}
        >
          Amount Paying (₦)
        </label>
        <input
          type='number'
          min='1'
          max={outstanding}
          step='0.01'
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "0.65rem 0.875rem",
            borderRadius: 8,
            border: "1px solid var(--border-muted)",
            fontSize: 15,
            fontWeight: 600,
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            boxSizing: "border-box",
          }}
        />
      </div>

      {/* Method */}
      <div>
        <label
          style={{
            display: "block",
            fontSize: 12,
            fontWeight: 600,
            marginBottom: 6,
            color: "var(--text-secondary)",
          }}
        >
          Payment Method
        </label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          style={{
            width: "100%",
            padding: "0.65rem 0.875rem",
            borderRadius: 8,
            border: "1px solid var(--border-muted)",
            fontSize: 14,
            background: "var(--bg-primary)",
            color: "var(--text-primary)",
            boxSizing: "border-box",
          }}
        >
          {["Cash", "Bank Transfer", "POS", "Cheque", "Online"].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
        <button type='button' className='btn btn-secondary' onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type='submit' className='btn btn-primary' disabled={saving}>
          {saving ? "Saving…" : "Record Payment"}
        </button>
      </div>
    </form>
  );
}

// ─── Main component ────────────────────────────────────────────────────────
export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState(null);
  const [enrollment, setEnrollment] = useState(null);
  const [fees, setFees] = useState([]);
  const [payments, setPayments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [inventoryPaySaving, setInventoryPaySaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [overrides, setOverrides] = useState([]);
  const [settings, setSettings] = useState({ academicYear: "", currentTerm: "" });
  const [selectedTerm, setSelectedTerm] = useState("");
  const [receiptPayment, setReceiptPayment] = useState(null);
  const [prevBalance, setPrevBalance] = useState(0);
  const [discountData, setDiscountData] = useState({ totalDiscount: 0, breakdown: [] });
  const [inventoryAssignments, setInventoryAssignments] = useState([]);
  const [inventoryPayModal, setInventoryPayModal] = useState(null); // assignment object
  const { can } = useRole();

  // ── Derived ───────────────────────────────────────────────────────────────
  const classId = enrollment?.classId || null;
  const session = enrollment?.session || settings?.academicYear || "";
  const getClassName = (cid) => classes.find((c) => c.id === cid)?.name ?? "Not Assigned";

  // ── Loaders ───────────────────────────────────────────────────────────────
  const loadPayments = async () => {
    try {
      setPayments((await getPaymentsByStudent(id)) || []);
    } catch (e) {
      console.error("loadPayments:", e);
    }
  };

  const loadInventory = async () => {
    try {
      setInventoryAssignments((await getStudentAssignments(id)) || []);
    } catch (e) {
      console.error("loadInventory:", e);
    }
  };

  const refreshOverrides = async () => {
    try {
      setOverrides((await getStudentFeeOverrides(id)) || []);
    } catch (e) {
      console.error("refreshOverrides:", e);
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
      console.error("loadFeesForTerm:", e);
      setFees([]);
    }
  };

  const handleToggleFee = async (feeId) => {
    try {
      const existing = overrides.find((o) => o.feeId === feeId);
      if (existing) await enableStudentFee(existing.id);
      else await disableStudentFee(id, feeId);
      await refreshOverrides();
    } catch (err) {
      console.error("Failed to update fee status.", err);
      alert("Failed to update fee status.");
    }
  };

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [appSettings, classData, studentData, enrollmentData, invAssignments] =
          await Promise.all([
            getSettings(),
            getClasses(),
            getStudentById(id),
            getCurrentEnrollment(id),
            getStudentAssignments(id),
          ]);

        setSettings(appSettings || {});
        setClasses(classData || []);
        setStudent(studentData);
        setEnrollment(enrollmentData);
        setInventoryAssignments(invAssignments || []);

        const activeSession = enrollmentData?.session || appSettings?.academicYear;
        const activeTerm = enrollmentData?.term || appSettings?.currentTerm || "1st Term";

        if (activeSession) {
          try {
            const pb = await getPreviousBalance(id, activeSession);
            setPrevBalance(pb ? Number(pb.amount || 0) : 0);
          } catch {
            setPrevBalance(0);
          }
        }

        if (activeSession && studentData?.familyId) {
          try {
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
            console.error("Discount load:", e);
          }
        }

        await Promise.all([refreshOverrides(), loadPayments()]);
        setSelectedTerm(activeTerm);
      } catch (e) {
        console.error("StudentDetails init:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [id]);

  useEffect(() => {
    if (classId && session && selectedTerm) loadFeesForTerm(classId, session, selectedTerm);
    else setFees([]);
  }, [selectedTerm, classId, session]);

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
  const discount = discountData.totalDiscount || 0;
  const netFees = Math.max(currentTermFees + prevBalance - discount, 0);

  // Exclude inventory payments from school fee totals
  const termSpecificPay = payments.filter((p) => p.term === selectedTerm && p.type !== "inventory");
  const termTotalPaid = termSpecificPay.reduce((s, p) => s + Number(p.amount || 0), 0);
  const termBalance = netFees - termTotalPaid;
  const totalPaidAllTime = payments
    .filter((p) => p.type !== "inventory")
    .reduce((s, p) => s + Number(p.amount || 0), 0);

  // ── Inventory derived (scoped to selected term) ───────────────────────────
  const termInventory = inventoryAssignments.filter(
    (a) => !selectedTerm || a.term === selectedTerm,
  );
  const inventoryTotal = termInventory.reduce((s, a) => s + Number(a.totalAmount || 0), 0);
  const inventoryUnpaidTotal = termInventory
    .filter((a) => !a.isPaid)
    .reduce((s, a) => s + Number(a.totalAmount || 0), 0);

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
            <CustomButton
              className='outline-btn rounded-lg'
              children='Generate Letter'
              icon={<HiDocumentText />}
              onClick={() => navigate(`/letters?context=student&id=${id}&template=fees`)}
            />
          )}
        </div>
      </div>

      {/* ── Alert Banners ── */}
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
            <strong>₦{discount.toLocaleString()}</strong> discount applied —{" "}
            {discountData.breakdown.map((b) => b.discountName).join(", ")}
          </span>
        </div>
      )}
      {inventoryUnpaidTotal > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            borderRadius: 8,
            background: "#eff6ff",
            border: "1px solid #bfdbfe",
            color: "#1e40af",
            fontSize: 13,
          }}
        >
          <HiArchiveBox style={{ flexShrink: 0 }} />
          <span>
            <strong>₦{inventoryUnpaidTotal.toLocaleString()}</strong> unpaid for items collected in{" "}
            {selectedTerm}. Use the Pay button below to record payment.
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
          they are enrolled.
        </div>
      )}

      {/* ── School Fees Payment Form ── */}
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

      {/* ── Finance Summary Cards ── */}
      <div className='finance-grid'>
        <div className='finance-card'>
          <div className='f-icon blue'>
            <HiReceiptTax />
          </div>
          <div className='f-data'>
            <label>{selectedTerm} Fees</label>
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

        {/* Only show inventory card if items exist for this term */}
        {inventoryTotal > 0 && (
          <div className='finance-card'>
            <div className='f-icon' style={{ background: "#eff6ff", color: "#1d4ed8" }}>
              <HiArchiveBox />
            </div>
            <div className='f-data'>
              <label>{selectedTerm} Items</label>
              <h3>₦{inventoryTotal.toLocaleString()}</h3>
              {inventoryUnpaidTotal > 0 ? (
                <small style={{ color: "#dc2626", fontSize: 11 }}>
                  ₦{inventoryUnpaidTotal.toLocaleString()} unpaid
                </small>
              ) : (
                <small style={{ color: "#16a34a", fontSize: 11 }}>All paid</small>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Main Detail Cards ── */}
      <div className='details-layout-grid'>
        {/* ── Items Collected ── */}
        <div className='history-card' style={{ marginTop: "1.25rem" }}>
          <div className='card-top'>
            <h4 style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <HiArchiveBox style={{ color: "#1d4ed8", fontSize: 16 }} />
              {selectedTerm} Items Collected
            </h4>
            <span className='count-badge'>{termInventory.length} items</span>
          </div>

          {termInventory.length === 0 ? (
            <p
              style={{
                padding: "1.5rem",
                color: "var(--text-secondary)",
                fontSize: 13,
                textAlign: "center",
                margin: 0,
              }}
            >
              No items collected in {selectedTerm}.
            </p>
          ) : (
            <table className='data-table display'>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th className='text-right'>Qty</th>
                  <th className='text-right'>Price</th>
                  <th className='text-right'>Total</th>
                  <th className='text-center'>Status</th>
                  {can(PERMISSIONS.EDIT_STUDENT) && <th className='text-center'>Action</th>}
                </tr>
              </thead>
              <tbody>
                {termInventory.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <span style={{ fontWeight: 500 }}>{a.itemName}</span>
                      {a.note && (
                        <small
                          style={{
                            display: "block",
                            color: "var(--text-secondary)",
                            fontSize: 11,
                            fontStyle: "italic",
                          }}
                        >
                          {a.note}
                        </small>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 99,
                          background: "var(--bg-secondary)",
                          color: "var(--text-secondary)",
                          fontWeight: 500,
                        }}
                      >
                        {a.category}
                      </span>
                    </td>
                    <td className='text-right'>
                      {a.quantity} {a.unit}
                    </td>
                    <td className='text-right'>₦{Number(a.priceSnapshot).toLocaleString()}</td>
                    <td className='text-right' style={{ fontWeight: 600 }}>
                      ₦{Number(a.totalAmount).toLocaleString()}
                    </td>
                    <td className='text-center'>
                      <span
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 600,
                          background: a.isPaid ? "#dcfce7" : "#fef3c7",
                          color: a.isPaid ? "#15803d" : "#92400e",
                        }}
                      >
                        {a.isPaid ? "✓ Paid" : "Unpaid"}
                      </span>
                    </td>
                    {can(PERMISSIONS.EDIT_STUDENT) && (
                      <td className='text-center'>
                        {!a.isPaid ? (
                          <button
                            className='receipt-btn-small'
                            style={{ color: "#1d4ed8", borderColor: "#bfdbfe" }}
                            onClick={() => setInventoryPayModal(a)}
                          >
                            <HiCurrencyDollar /> Pay
                          </button>
                        ) : (
                          <span style={{ fontSize: 12, color: "#15803d" }}>
                            <HiCheckCircle style={{ verticalAlign: "middle" }} /> Done
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}

                {/* Summary footer */}
                <tr className='total-row'>
                  <td colSpan={4}>
                    <strong>Total</strong>
                  </td>
                  <td className='text-right'>
                    <strong>₦{inventoryTotal.toLocaleString()}</strong>
                  </td>
                  <td className='text-center'>
                    {inventoryUnpaidTotal > 0 ? (
                      <span style={{ fontSize: 11, color: "#dc2626", fontWeight: 600 }}>
                        ₦{inventoryUnpaidTotal.toLocaleString()} unpaid
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, color: "#15803d", fontWeight: 600 }}>
                        All paid
                      </span>
                    )}
                  </td>
                  {can(PERMISSIONS.EDIT_STUDENT) && <td />}
                </tr>
              </tbody>
            </table>
          )}
        </div>
        <div className='main-content finance_details'>
          {/* ── Fee Breakdown ── */}
          <div className='billing-card'>
            <div className='card-top'>
              <h4>{selectedTerm} Fee Breakdown</h4>
              <span className='count-badge'>
                {effectiveFees.length +
                  (prevBalance > 0 ? 1 : 0) +
                  (discount > 0 ? discountData.breakdown.length : 0)}{" "}
                items
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
                {/* Arrears */}
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

          {/* ── School Fees Payment History ── */}
          <div className='history-card'>
            <div className='card-top'>
              <h4>{selectedTerm} Payments</h4>
              <span className='count-badge'>{termSpecificPay.length} records</span>
            </div>
            <table className='data-table display'>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Method</th>
                  <th className='text-right'>Amount</th>
                  <th className='text-center'>Receipt</th>
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
                          <HiReceiptTax /> View
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan='4' className='empty-ledger'>
                      No payments recorded for {selectedTerm}.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── School Fees Receipt Modal ── */}
      {receiptPayment && (
        <StudentReceipt
          payment={receiptPayment}
          student={student}
          settings={settings}
          fees={effectiveFees}
          allPayments={payments}
          prevBalance={prevBalance}
          discountBreakdown={discountData.breakdown}
          inventoryAssignments={termInventory}
          onClose={() => setReceiptPayment(null)}
        />
      )}

      {/* ── Inventory Payment Modal ── */}
      {inventoryPayModal && (
        <FormModal
          title='Record Item Payment'
          subtitle={`${inventoryPayModal.itemName} · ${inventoryPayModal.quantity} ${inventoryPayModal.unit}`}
          onClose={() => setInventoryPayModal(null)}
          maxWidth='420px'
          footer={
            <>
              <button
                type='button'
                className='btn btn-secondary'
                onClick={() => setInventoryPayModal(null)}
                disabled={inventoryPaySaving}
              >
                Cancel
              </button>
              <button
                type='submit'
                form='inventory-payment-form'
                className='btn btn-primary'
                disabled={inventoryPaySaving}
              >
                {inventoryPaySaving ? "Saving…" : "Record Payment"}
              </button>
            </>
          }
        >
          <InventoryPaymentForm
            formId='inventory-payment-form'
            assignment={inventoryPayModal}
            student={student}
            session={session}
            onClose={() => setInventoryPayModal(null)}
            onSuccess={() => {
              setInventoryPayModal(null);
              loadInventory();
              loadPayments();
            }}
            onSubmittingChange={setInventoryPaySaving}
          />
        </FormModal>
      )}
    </div>
  );
}
