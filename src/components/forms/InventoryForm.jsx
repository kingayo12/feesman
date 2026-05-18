/**
 * InventoryPaymentForm.jsx
 * Place in: src/components/forms/InventoryForm.jsx
 *
 * Renders as plain form content — no modal wrapper.
 * StudentDetails wraps it in <FormModal> itself.
 */

import { useState } from "react";
import { recordPayment } from "../../pages/fees/paymentService";
import { markAssignmentPaid } from "../../pages/inventory/inventoryService";
import { HiCreditCard, HiExclamationCircle } from "react-icons/hi";
import { HiOutlineCash } from "react-icons/hi";
import CustomInput from "../common/Input";
import CustomSelect from "../common/SelectInput";

export default function InventoryPaymentForm({ assignment, student, session, onClose, onSuccess }) {
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

      // Mark fully paid if the payment clears the balance
      const newTotal = Number(assignment.amountPaid || 0) + paid;
      if (newTotal >= Number(assignment.totalAmount)) {
        await markAssignmentPaid(assignment.id, true);
      }

      onSuccess?.();
    } catch (err) {
      setError(err.message || "Failed to record payment.");
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Item total vs outstanding summary */}
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

      {/* Error */}
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--bg-danger)",
            color: "var(--text-danger)",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "0.6rem 0.875rem",
            fontSize: 13,
          }}
        >
          <HiExclamationCircle style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Amount */}
      <CustomInput
        name='amount'
        type='number'
        labelName='Amount Paying (₦)'
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        icon={<HiOutlineCash />}
        min='1'
        max={outstanding}
        step='0.01'
        required
      />

      {/* Method */}
      <CustomSelect
        icon={<HiCreditCard />}
        labelName='Payment Method'
        value={method}
        onChange={(e) => setMethod(e.target.value)}
        options={[
          { value: "Cash", label: "Cash" },
          { value: "Bank Transfer", label: "Bank Transfer" },
          { value: "POS", label: "POS" },
          { value: "Cheque", label: "Cheque" },
          { value: "Online", label: "Online" },
        ]}
        required
      />

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 4 }}>
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
