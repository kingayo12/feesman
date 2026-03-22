import { useState } from "react";
import { recordPayment } from "../../pages/fees/paymentService";
import { HiCurrencyDollar, HiCreditCard, HiCheckCircle, HiClock } from "react-icons/hi";

export default function PaymentForm({ studentId, familyId, term, session, onSuccess }) {
  const [form, setForm] = useState({
    amount: "",
    method: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await recordPayment({
        studentId,
        familyId,
        amount: Number(form.amount),
        method: form.method,
        term, // ✅ enforced from parent
        session, // ✅ enforced from settings
      });

      setForm({ amount: "", method: "" });
      onSuccess();
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Error saving payment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className='modern-form payment-form-card' onSubmit={handleSubmit}>
      <div className='form-header'>
        <h3>Record Payment</h3>
        <p>
          Payment will be recorded for
          <strong> {term}</strong> ({session})
        </p>
      </div>

      <div className='form-grid'>
        {/* Amount */}
        <div className='input-group full-width'>
          <label>Amount (₦)</label>
          <div className='input-wrapper'>
            <HiCurrencyDollar className='input-icon' />
            <input
              type='number'
              placeholder='0.00'
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
              required
              min='1'
            />
          </div>
        </div>

        {/* Term (Read Only Display) */}
        <div className='input-group'>
          <label>Academic Term</label>
          <div className='input-wrapper'>
            <HiClock className='input-icon' />
            <input value={term} disabled />
          </div>
        </div>

        {/* Payment Method */}
        <div className='input-group'>
          <label>Payment Method</label>
          <div className='input-wrapper'>
            <HiCreditCard className='input-icon' />
            <select
              value={form.method}
              onChange={(e) => setForm({ ...form, method: e.target.value })}
              required
            >
              <option value='' disabled>
                Select Method
              </option>
              <option value='Cash'>Cash</option>
              <option value='Transfer'>Bank Transfer</option>
              <option value='POS'>POS</option>
            </select>
          </div>
        </div>
      </div>

      <button type='submit' className='submit-btn' disabled={isSubmitting}>
        {isSubmitting ? (
          "Processing..."
        ) : (
          <>
            <HiCheckCircle /> Confirm Payment
          </>
        )}
      </button>
    </form>
  );
}
