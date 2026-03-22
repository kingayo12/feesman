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

      <style>{`
        .sr-overlay {
          position:fixed; inset:0; z-index:3000;
          background:rgba(0,0,0,0.78); backdrop-filter:blur(4px);
          display:flex; align-items:flex-start; justify-content:center;
          padding:32px 16px 48px; overflow-y:auto;
        }
        .sr-modal {
          background:#fff; border-radius:12px; overflow:hidden;
          width:100%; max-width:660px;
          box-shadow:0 32px 80px rgba(0,0,0,0.4);
        }
        [data-theme="dark"] .sr-modal { background:#1e293b; }
 
        .sr-receipt {
          position:relative; background:#fff; color:#1e293b;
          font-family:"Segoe UI",Arial,sans-serif;
          font-size:13px; line-height:1.55; padding:36px 40px;
        }
        .sr-watermark {
          position:absolute; top:50%; left:50%;
          transform:translate(-50%,-50%);
          width:48%; opacity:0.04; pointer-events:none; z-index:0;
        }
        .sr-header { display:flex; justify-content:space-between; gap:1.5rem; position:relative; z-index:1; }
        .sr-header-left { display:flex; gap:12px; align-items:flex-start; }
        .sr-logo { width:54px; height:54px; object-fit:contain; flex-shrink:0; }
        .sr-school { font-size:17px; font-weight:700; margin:0 0 3px; color:#0f172a; }
        .sr-line { font-size:11px; margin:1px 0; }
        .sr-muted { color:#64748b; }
        .sr-header-right { text-align:right; flex-shrink:0; }
        .sr-doc-label { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:8px; }
        .sr-meta { margin-left:auto; border-collapse:collapse; }
        .sr-meta td { padding:2px 0 2px 14px; font-size:12px; color:#334155; }
        .sr-meta td:first-child { color:#94a3b8; text-align:right; padding-left:0; }
        .sr-rule { height:2px; background:linear-gradient(90deg,#1e40af,#3b82f6,#93c5fd); margin:18px 0; border-radius:2px; }
        .sr-student-row { display:flex; justify-content:space-between; align-items:flex-start; gap:1rem; position:relative; z-index:1; }
        .sr-cap-label { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#94a3b8; margin:0 0 4px; }
        .sr-big-name { font-size:16px; font-weight:700; color:#0f172a; margin:0 0 3px; }
        .sr-amount-card { background:#eff6ff; border:1px solid #bfdbfe; border-radius:10px; padding:14px 20px; text-align:center; min-width:158px; }
        .sr-amount-label { font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:#3b82f6; margin:0 0 4px; font-weight:600; }
        .sr-amount-value { font-size:24px; font-weight:800; color:#1e40af; margin:0; }
        .sr-method-pill { display:inline-block; margin-top:5px; font-size:11px; color:#1d4ed8; background:#dbeafe; padding:2px 10px; border-radius:99px; }
        .sr-table { width:100%; border-collapse:collapse; position:relative; z-index:1; margin-top:2px; }
        .sr-table th { background:#1e40af; color:#fff; padding:9px 12px; font-size:11px; font-weight:600; text-align:left; }
        .sr-table th.n { text-align:right; }
        .sr-table td { padding:9px 12px; font-size:12px; color:#334155; border-bottom:1px solid #f1f5f9; }
        .sr-table tr.alt td { background:#f8fafc; }
        .sr-table tr.tf td { background:#eff6ff !important; border-top:2px solid #bfdbfe; font-size:12px; }
        .sr-table td.idx { color:#94a3b8; width:26px; }
        .sr-table td.n { text-align:right; }
        /* Arrears row */
        .sr-arrears-row td { background:#fffbeb !important; border-bottom:1px solid #fde68a !important; }
        /* Discount row */
        .sr-discount-row td { background:#f0fdf4 !important; border-bottom:1px solid #bbf7d0 !important; }
        .sr-summary { background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:14px 18px; margin-top:1.25rem; position:relative; z-index:1; }
        .sr-srow { display:flex; justify-content:space-between; font-size:12px; padding:5px 0; color:#475569; }
        .sr-srow.g span:last-child { color:#16a34a; font-weight:600; }
        .sr-sdiv { height:1px; background:#e2e8f0; margin:5px 0; }
        .sr-srow.bold { font-weight:700; font-size:13px; }
        .sr-srow.ow span:last-child { color:#dc2626; }
        .sr-srow.cl span:last-child { color:#16a34a; }
        .sr-footer { display:flex; justify-content:space-between; align-items:flex-end; margin-top:2rem; padding-top:1.25rem; border-top:1px solid #e2e8f0; position:relative; z-index:1; }
        .sr-stamp { width:78px; height:78px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:9.5px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; border:3px solid; transform:rotate(-15deg); opacity:.78; text-align:center; white-space:pre-line; line-height:1.35; }
        .sr-stamp.sp { border-color:#16a34a; color:#16a34a; }
        .sr-stamp.sd { border-color:#d97706; color:#d97706; }
        @media print {
          .sr-overlay { position:static; background:none; padding:0; }
          .sr-modal   { box-shadow:none; border-radius:0; }
          .sr-receipt { padding:0; }
          .sr-watermark { opacity:.07; }
        }
      `}</style>
    </>
  );
}
