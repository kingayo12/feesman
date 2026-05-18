import { useState } from "react";
import { recordPayment } from "../../pages/fees/paymentService";

import { HiCurrencyDollar, HiCreditCard, HiExclamationCircle } from "react-icons/hi";

import { FormModal } from "../common/Modal";
import CustomInput from "../common/Input";
import CustomSelect from "../common/SelectInput";
import CustomButton from "../common/CustomButton";

export default function PaymentForm({ studentId, familyId, term, session, onSuccess, onClose }) {
  const [form, setForm] = useState({
    amount: "",
    method: "",
  });

  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.amount || Number(form.amount) <= 0) {
      return setError("Enter a valid amount.");
    }

    if (!form.method) {
      return setError("Select a payment method.");
    }

    setIsSubmitting(true);

    try {
      await recordPayment({
        studentId,
        familyId,
        amount: Number(form.amount),
        method: form.method,
        term,
        session,
      });

      setForm({ amount: "", method: "" });

      onSuccess?.();
      onClose?.();
    } catch (err) {
      console.error(err);
      setError("Payment failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal
      title='Record Payment'
      subtitle={`Payment for ${term} (${session})`}
      onClose={onClose}
      maxWidth='500px'
    >
      <form onSubmit={handleSubmit}>
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
            <HiExclamationCircle />
            {error}
          </div>
        )}
        <div className='form-grid'>
          <CustomInput
            name='amount'
            type='number'
            labelName='Amount (₦)'
            value={form.amount}
            onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
            icon={<HiCurrencyDollar />}
            placeholder='Enter amount'
            min='1'
            required
          />

          {/* Payment Method */}
          <CustomSelect
            icon={<HiCreditCard />}
            labelName='Payment Method'
            value={form.method}
            onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
            placeholder='Select method'
            options={[
              { value: "Cash", label: "Cash" },
              { value: "Transfer", label: "Bank Transfer" },
              { value: "POS", label: "POS" },
              { value: "Cheque", label: "Cheque" },
              { value: "Online", label: "Online" },
            ]}
            required
          />

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <CustomButton
              type='button'
              variant='secondary'
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </CustomButton>

            <CustomButton type='submit' variant='primary' loading={isSubmitting}>
              Confirm Payment
            </CustomButton>
          </div>
        </div>
      </form>
    </FormModal>
  );
}
