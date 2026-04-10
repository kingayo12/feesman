/**
 * StudentReceipt.jsx
 * Per-payment receipt modal with PDF, image, WhatsApp, share, and print.
 * Place in: src/pages/students/StudentReceipt.jsx
 */

import { useRef } from "react";
import Logo from "../../assets/logo.png";
import ReceiptToolbar from "../../components/common/ReceiptToolbar"; // ✅ fixed: was Receipttoolbar
import { useReceiptExport } from "../../hooks/UseReceipt"; // ✅ fixed: was UseReceipt

export default function StudentReceipt({
  payment,
  student,
  settings,
  fees,
  allPayments,
  prevBalance = 0, // carried-forward arrears
  discountBreakdown = [], // [{ discountId, discountName, type, scope, amount }]
  onClose,
}) {
  const receiptRef = useRef(null);

  const filename = `receipt_${student?.firstName}_${student?.lastName}_${payment?.term}`
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const { exportPDF, exportImage, shareNative, shareWhatsApp, exporting, canShare, error, toast } =
    useReceiptExport(
      receiptRef,
      filename,
      `Fee Receipt – ${student?.firstName} ${student?.lastName}`,
    );

  // ── Calculations ──────────────────────────────────────────────────────────
  const receiptNo = `STU-${payment.id?.slice(0, 8).toUpperCase()}`;

  const fmt = (d) =>
    d
      ? (d.toDate ? d.toDate() : new Date(d)).toLocaleDateString("en-NG", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      : "—";

  const payDate = fmt(payment.date);
  const today = fmt(new Date());

  const termPayments = (allPayments || []).filter((p) => p.term === payment.term);
  const sorted = [...termPayments].sort((a, b) => {
    const da = a.date?.toDate ? a.date.toDate() : new Date(a.date || 0);
    const db = b.date?.toDate ? b.date.toDate() : new Date(b.date || 0);
    return da - db;
  });
  const idx = sorted.findIndex((p) => p.id === payment.id);
  const paidSoFar = sorted.slice(0, idx + 1).reduce((s, p) => s + Number(p.amount || 0), 0);

  const currentTermFees = (fees || []).reduce((s, f) => s + Number(f.amount || 0), 0);
  const totalDiscount = (discountBreakdown || []).reduce((s, b) => s + Number(b.amount || 0), 0);
  // termTotal = fees + arrears − discounts
  const termTotal = Math.max(currentTermFees + Number(prevBalance || 0) - totalDiscount, 0);
  const balance = Math.max(termTotal - paidSoFar, 0);
  const isPaid = balance === 0;

  const hasExtras = fees?.length > 0 || prevBalance > 0 || discountBreakdown?.length > 0;

  return (
    <>
      <div className='sr-overlay'>
        <div className='sr-modal'>
          <ReceiptToolbar
            title={`Receipt — ${student.firstName} ${student.lastName}`}
            onClose={onClose}
            exportPDF={exportPDF}
            exportImage={exportImage}
            shareNative={shareNative}
            shareWhatsApp={shareWhatsApp}
            exporting={exporting}
            canShare={canShare}
            error={error}
            toast={toast}
          />

          <div ref={receiptRef} className='sr-receipt'>
            {Logo && <img src={Logo} alt='' className='sr-watermark' />}

            {/* ── Header ─────────────────────────────────────────── */}
            <div className='sr-header'>
              <div className='sr-header-left'>
                {Logo && <img src={Logo} alt='logo' className='sr-logo' />}
                <div>
                  <h1 className='sr-school'>{settings?.name}</h1>
                  {settings?.tagline && <p className='sr-line sr-muted'>{settings.tagline}</p>}
                  {settings?.address && <p className='sr-line sr-muted'>{settings.address}</p>}
                  <p className='sr-line sr-muted'>
                    {[settings?.contactPhone, settings?.contactEmail].filter(Boolean).join("  ·  ")}
                  </p>
                </div>
              </div>
              <div className='sr-header-right'>
                <p className='sr-doc-label'>Payment Receipt</p>
                <table className='sr-meta'>
                  <tbody>
                    <tr>
                      <td>Receipt No.</td>
                      <td>
                        <strong>{receiptNo}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Issued</td> <td>{today}</td>
                    </tr>
                    <tr>
                      <td>Payment Date</td>
                      <td>{payDate}</td>
                    </tr>
                    <tr>
                      <td>Session</td> <td>{settings?.academicYear}</td>
                    </tr>
                    <tr>
                      <td>Term</td> <td>{payment.term}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className='sr-rule' />

            {/* ── Student + amount badge ────────────────────────── */}
            <div className='sr-student-row'>
              <div>
                <p className='sr-cap-label'>Received From</p>
                <p className='sr-big-name'>
                  {student.firstName}
                  {student.otherName ? " " + student.otherName : ""} {student.lastName}
                </p>
                {student.admissionNo && (
                  <p className='sr-line sr-muted'>Admission No: {student.admissionNo}</p>
                )}
              </div>
              <div className='sr-amount-card'>
                <p className='sr-amount-label'>Amount Paid</p>
                <p className='sr-amount-value'>₦{Number(payment.amount).toLocaleString()}</p>
                <span className='sr-method-pill'>{payment.method}</span>
              </div>
            </div>

            {/* ── Fee breakdown table ───────────────────────────── */}
            {hasExtras && (
              <>
                <p className='sr-cap-label' style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
                  Fee Breakdown — {payment.term}
                </p>
                <table className='sr-table'>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Description</th>
                      <th className='n'>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Previous balance / arrears row */}
                    {prevBalance > 0 && (
                      <tr className='sr-arrears-row'>
                        <td className='idx'>—</td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#92400e" }}>
                            Previous Balance (Arrears)
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: "#b45309" }}>
                            Carried forward from earlier sessions
                          </span>
                        </td>
                        <td className='n' style={{ color: "#b45309", fontWeight: 700 }}>
                          ₦{Number(prevBalance).toLocaleString()}
                        </td>
                      </tr>
                    )}

                    {/* Regular fee line items */}
                    {(fees || []).map((f, i) => (
                      <tr key={f.id} className={i % 2 === 0 ? "alt" : ""}>
                        <td className='idx'>{i + 1}</td>
                        <td>{f.feeType}</td>
                        <td className='n'>₦{Number(f.amount).toLocaleString()}</td>
                      </tr>
                    ))}

                    {/* Discount line items — green with minus sign */}
                    {(discountBreakdown || []).map((b) => (
                      <tr key={b.discountId} className='sr-discount-row'>
                        <td className='idx'>—</td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#166534" }}>
                            {b.discountName}
                          </span>
                          <span style={{ display: "block", fontSize: 10, color: "#16a34a" }}>
                            Discount —{" "}
                            {b.scope === "school_fees"
                              ? "applied to school fees"
                              : b.scope === "all_fees"
                                ? "applied to all fees"
                                : "applied to selected fees"}
                          </span>
                        </td>
                        <td className='n' style={{ color: "#16a34a", fontWeight: 700 }}>
                          −₦{Number(b.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className='tf'>
                      <td colSpan='2'>
                        <strong>Net Total</strong>
                      </td>
                      <td className='n'>
                        <strong>₦{termTotal.toLocaleString()}</strong>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}

            {/* ── Payment summary box ───────────────────────────── */}
            <div className='sr-summary'>
              <div className='sr-srow'>
                <span>Term fees</span>
                <span>₦{currentTermFees.toLocaleString()}</span>
              </div>
              {prevBalance > 0 && (
                <div className='sr-srow' style={{ color: "#b45309" }}>
                  <span style={{ paddingLeft: "1rem" }}>+ Previous arrears</span>
                  <span>₦{Number(prevBalance).toLocaleString()}</span>
                </div>
              )}
              {totalDiscount > 0 && (
                <div className='sr-srow' style={{ color: "#16a34a" }}>
                  <span style={{ paddingLeft: "1rem" }}>− Discount(s)</span>
                  <span>₦{totalDiscount.toLocaleString()}</span>
                </div>
              )}
              {(prevBalance > 0 || totalDiscount > 0) && (
                <div
                  className='sr-srow'
                  style={{ fontWeight: 600, borderTop: "1px solid #e2e8f0", paddingTop: 6 }}
                >
                  <span>Net amount due</span>
                  <span>₦{termTotal.toLocaleString()}</span>
                </div>
              )}
              <div className='sr-sdiv' />
              <div className='sr-srow g'>
                <span>This payment</span>
                <span>₦{Number(payment.amount).toLocaleString()}</span>
              </div>
              <div className='sr-srow g'>
                <span>Total paid to date ({payment.term})</span>
                <span>₦{paidSoFar.toLocaleString()}</span>
              </div>
              <div className='sr-sdiv' />
              <div className={`sr-srow bold ${isPaid ? "cl" : "ow"}`}>
                <span>Outstanding balance</span>
                <span>₦{balance.toLocaleString()}</span>
              </div>
            </div>

            {/* ── Footer ────────────────────────────────────────── */}
            <div className='sr-footer'>
              <div>
                <p className='sr-line sr-muted'>
                  Computer-generated receipt — no signature required.
                </p>
                <p className='sr-line sr-muted'>
                  Thank you — <strong style={{ color: "#475569" }}>{settings?.name}</strong>
                </p>
              </div>
              <div className={`sr-stamp ${isPaid ? "sp" : "sd"}`}>
                {isPaid ? "PAID\nIN FULL" : "PARTIAL\nPAYMENT"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
