/**
 * FamilyReceipt.jsx — Professional family financial statement with full export.
 * Place in: src/pages/families/FamilyReceipt.jsx
 */

import { useRef } from "react";
import Logo from "../../assets/logo.png";
import ReceiptToolbar from "../../components/common/ReceiptToolbar";
import { useReceiptExport } from "../../hooks/UseReceipt";

export default function FamilyReceipt({
  family,
  students,
  payments,
  settings,
  feesByStudent, // { studentId: termFee + prevBal (pre-discount total) }
  prevByStudent = {}, // { studentId: prevBalanceAmount }
  discountByStudent = {}, // { studentId: totalDiscountAmount }
  onClose,
}) {
  const receiptRef = useRef(null);

  const filename = `statement_${family?.familyName}_${settings?.currentTerm}`
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_-]/g, "");

  const { exportPDF, exportImage, shareNative, shareWhatsApp, exporting, canShare, error, toast } =
    useReceiptExport(receiptRef, filename, `Financial Statement – ${family?.familyName} Family`);

  // ── Calculations ──────────────────────────────────────────────────────────
  // feesByStudent already includes prevBal but is pre-discount; subtract discounts here
  const netByStudent = (id) => Math.max((feesByStudent[id] || 0) - (discountByStudent[id] || 0), 0);

  const totalFees = students.reduce((s, st) => s + netByStudent(st.id), 0);
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalArrears = students.reduce((s, st) => s + (prevByStudent[st.id] || 0), 0);
  const totalDiscount = students.reduce((s, st) => s + (discountByStudent[st.id] || 0), 0);
  const balance = totalFees - totalPaid;
  const isPaid = balance <= 0;

  const refNo = `FAM-${family.id?.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
  const today = new Date().toLocaleDateString("en-NG", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const fmtDate = (d) =>
    d
      ? (d.toDate ? d.toDate() : new Date(d)).toLocaleDateString("en-NG", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "—";

  const hasDiscounts = totalDiscount > 0;
  const hasArrears = totalArrears > 0;

  return (
    <>
      <div className='fr-overlay' onClick={onClose}>
        <div className='fr-modal' onClick={(e) => e.stopPropagation()}>
          <ReceiptToolbar
            title={`Statement — ${family.familyName} Family`}
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

          <div ref={receiptRef} className='fr-receipt'>
            {Logo && <img src={Logo} alt='' className='fr-watermark' />}

            {/* ── Header ─────────────────────────────────────────── */}
            <div className='fr-header'>
              <div className='fr-hl'>
                {Logo && <img src={Logo} alt='logo' className='fr-logo' />}
                <div>
                  <h1 className='fr-school'>{settings?.name}</h1>
                  {settings?.tagline && <p className='fr-line fr-muted'>{settings.tagline}</p>}
                  {settings?.address && <p className='fr-line fr-muted'>{settings.address}</p>}
                  <p className='fr-line fr-muted'>
                    {[settings?.contactPhone, settings?.contactEmail].filter(Boolean).join("  ·  ")}
                  </p>
                  {settings?.website && <p className='fr-line fr-muted'>{settings.website}</p>}
                </div>
              </div>
              <div className='fr-hr'>
                <p className='fr-doc-label'>Financial Statement</p>
                <table className='fr-meta'>
                  <tbody>
                    <tr>
                      <td>Reference</td>
                      <td>
                        <strong>{refNo}</strong>
                      </td>
                    </tr>
                    <tr>
                      <td>Date</td> <td>{today}</td>
                    </tr>
                    <tr>
                      <td>Session</td> <td>{settings?.academicYear}</td>
                    </tr>
                    <tr>
                      <td>Term</td> <td>{settings?.currentTerm}</td>
                    </tr>
                  </tbody>
                </table>
                <span className={`fr-badge ${isPaid ? "bp" : "bo"}`}>
                  {isPaid ? "FULLY PAID" : "OUTSTANDING"}
                </span>
              </div>
            </div>

            <div className='fr-rule' />

            {/* ── Bill-to + summary box ─────────────────────────── */}
            <div className='fr-bill-row'>
              <div>
                <p className='fr-cap-label'>Bill To</p>
                <p className='fr-fam-name'>{family.familyName} Family</p>
                {family.address && <p className='fr-line fr-muted'>{family.address}</p>}
                {family.phone && <p className='fr-line fr-muted'>{family.phone}</p>}
                {family.email && <p className='fr-line fr-muted'>{family.email}</p>}
              </div>
              <div className='fr-sumbox'>
                {/* Term fees (before arrears/discount) */}
                <div className='fr-sr'>
                  <span>Term fees</span>
                  <span>₦{(totalFees - totalArrears + totalDiscount).toLocaleString()}</span>
                </div>
                {/* Arrears */}
                {hasArrears && (
                  <div className='fr-sr fr-arrears-row'>
                    <span>+ Previous arrears</span>
                    <span>₦{totalArrears.toLocaleString()}</span>
                  </div>
                )}
                {/* Discount */}
                {hasDiscounts && (
                  <div className='fr-sr fr-discount-row'>
                    <span>− Discount(s)</span>
                    <span>₦{totalDiscount.toLocaleString()}</span>
                  </div>
                )}
                {(hasArrears || hasDiscounts) && (
                  <div className='fr-sr fr-sr-net'>
                    <span>Net amount due</span>
                    <span>₦{totalFees.toLocaleString()}</span>
                  </div>
                )}
                <div className='fr-sr g'>
                  <span>Total paid</span>
                  <span>₦{totalPaid.toLocaleString()}</span>
                </div>
                <div className='fr-sdiv' />
                <div className={`fr-sr bold ${isPaid ? "cl" : "ow"}`}>
                  <span>Balance due</span>
                  <span>₦{balance.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* ── Student breakdown table ───────────────────────── */}
            <p className='fr-cap-label' style={{ marginTop: "2rem", marginBottom: "0.6rem" }}>
              Student Breakdown — {settings?.currentTerm}
            </p>
            <table className='fr-table'>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Student</th>
                  <th>Description</th>
                  <th className='n'>Term Fees</th>
                  {hasArrears && <th className='n'>Arrears</th>}
                  {hasDiscounts && <th className='n'>Discount</th>}
                  <th className='n'>Net</th>
                  <th className='n'>Paid</th>
                  <th className='n'>Balance</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, i) => {
                  const rawFee = feesByStudent[s.id] || 0;
                  const prev = prevByStudent[s.id] || 0;
                  const disc = discountByStudent[s.id] || 0;
                  const termFee = rawFee - prev; // just the current-term portion
                  const net = netByStudent(s.id);
                  const paid = payments
                    .filter((p) => p.studentId === s.id)
                    .reduce((a, p) => a + Number(p.amount), 0);
                  const bal = net - paid;

                  return (
                    <tr key={s.id} className={i % 2 === 0 ? "alt" : ""}>
                      <td className='idx'>{i + 1}</td>
                      <td>
                        <strong>
                          {s.firstName} {s.lastName}
                        </strong>
                      </td>
                      <td className='fr-muted'>Tuition &amp; Compulsory Levies</td>
                      <td className='n'>₦{termFee.toLocaleString()}</td>
                      {hasArrears && (
                        <td className={`n ${prev > 0 ? "fr-arrears-cell" : ""}`}>
                          {prev > 0 ? `₦${prev.toLocaleString()}` : "—"}
                        </td>
                      )}
                      {hasDiscounts && (
                        <td className={`n ${disc > 0 ? "fr-discount-cell" : ""}`}>
                          {disc > 0 ? `−₦${disc.toLocaleString()}` : "—"}
                        </td>
                      )}
                      <td className='n'>
                        <strong>₦{net.toLocaleString()}</strong>
                      </td>
                      <td className='n g'>₦{paid.toLocaleString()}</td>
                      <td className={`n ${bal > 0 ? "r" : "g"}`}>₦{bal.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className='tf'>
                  <td colSpan='3'>
                    <strong>TOTAL</strong>
                  </td>
                  <td className='n'>
                    <strong>₦{(totalFees - totalArrears + totalDiscount).toLocaleString()}</strong>
                  </td>
                  {hasArrears && (
                    <td className='n fr-arrears-cell'>
                      <strong>₦{totalArrears.toLocaleString()}</strong>
                    </td>
                  )}
                  {hasDiscounts && (
                    <td className='n fr-discount-cell'>
                      <strong>−₦{totalDiscount.toLocaleString()}</strong>
                    </td>
                  )}
                  <td className='n'>
                    <strong>₦{totalFees.toLocaleString()}</strong>
                  </td>
                  <td className='n g'>
                    <strong>₦{totalPaid.toLocaleString()}</strong>
                  </td>
                  <td className={`n ${isPaid ? "g" : "r"}`}>
                    <strong>₦{balance.toLocaleString()}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* ── Payment history ───────────────────────────────── */}
            {payments.length > 0 && (
              <>
                <p className='fr-cap-label' style={{ marginTop: "2rem", marginBottom: "0.6rem" }}>
                  Payment History
                </p>
                <table className='fr-table fr-sm'>
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Student</th>
                      <th>Date</th>
                      <th>Method</th>
                      <th className='n'>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((p, i) => {
                      const stu = students.find((s) => s.id === p.studentId);
                      return (
                        <tr key={p.id} className={i % 2 === 0 ? "alt" : ""}>
                          <td className='idx'>{i + 1}</td>
                          <td>{stu ? `${stu.firstName} ${stu.lastName}` : "—"}</td>
                          <td>{fmtDate(p.date)}</td>
                          <td>
                            <span className='fr-method'>{p.method}</span>
                          </td>
                          <td className='n g'>₦{Number(p.amount).toLocaleString()}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </>
            )}

            {/* ── Footer ────────────────────────────────────────── */}
            <div className='fr-footer'>
              <div>
                <p className='fr-line fr-muted'>
                  Computer-generated document. No signature required.
                </p>
                <p className='fr-line fr-muted'>
                  Thank you for your partnership with{" "}
                  <strong style={{ color: "#475569" }}>{settings?.name}</strong>.
                </p>
              </div>
              <div className={`fr-stamp ${isPaid ? "sp" : "sd"}`}>
                {isPaid ? "PAID" : "BALANCE\nDUE"}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .fr-overlay {
          position:fixed; inset:0; z-index:3000;
          background:rgba(0,0,0,0.78); backdrop-filter:blur(4px);
          display:flex; align-items:flex-start; justify-content:center;
          padding:32px 16px 48px; overflow-y:auto; cursor:pointer;
        }
        .fr-modal {
          background:#fff; border-radius:12px; overflow:hidden;
          width:100%; max-width:800px;
          box-shadow:0 32px 80px rgba(0,0,0,0.4); cursor:default;
        }
        [data-theme="dark"] .fr-modal { background:#1e293b; }
        .fr-receipt {
          position:relative; background:#fff; color:#1e293b;
          font-family:"Segoe UI",Arial,sans-serif;
          font-size:13px; line-height:1.55; padding:40px;
        }
        .fr-watermark { position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); width:54%; opacity:0.04; pointer-events:none; z-index:0; }
        .fr-header { display:flex; justify-content:space-between; gap:2rem; position:relative; z-index:1; }
        .fr-hl { display:flex; gap:12px; align-items:flex-start; }
        .fr-logo { width:60px; height:60px; object-fit:contain; flex-shrink:0; }
        .fr-school { font-size:18px; font-weight:700; margin:0 0 3px; color:#0f172a; }
        .fr-line { font-size:11px; margin:1px 0; }
        .fr-muted { color:#64748b; }
        .fr-hr { text-align:right; flex-shrink:0; }
        .fr-doc-label { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:8px; }
        .fr-meta { margin-left:auto; border-collapse:collapse; }
        .fr-meta td { padding:2px 0 2px 16px; font-size:12px; color:#334155; }
        .fr-meta td:first-child { color:#94a3b8; text-align:right; padding-left:0; }
        .fr-badge { display:inline-block; margin-top:10px; padding:3px 12px; border-radius:99px; font-size:10px; font-weight:700; letter-spacing:.07em; text-transform:uppercase; }
        .fr-badge.bp { background:#dcfce7; color:#15803d; border:1px solid #bbf7d0; }
        .fr-badge.bo { background:#fee2e2; color:#b91c1c; border:1px solid #fecaca; }
        .fr-rule { height:2px; background:linear-gradient(90deg,#1e40af,#3b82f6,#93c5fd); margin:18px 0; border-radius:2px; }
        .fr-bill-row { display:flex; justify-content:space-between; gap:2rem; position:relative; z-index:1; }
        .fr-cap-label { font-size:10px; font-weight:700; letter-spacing:.1em; text-transform:uppercase; color:#94a3b8; margin-bottom:5px; }
        .fr-fam-name { font-size:15px; font-weight:700; color:#0f172a; margin:0 0 4px; }
        .fr-sumbox { min-width:230px; background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:13px 17px; }
        .fr-sr { display:flex; justify-content:space-between; font-size:12px; padding:5px 0; color:#475569; }
        .fr-sr.g span:last-child { color:#16a34a; font-weight:600; }
        .fr-sdiv { height:1px; background:#e2e8f0; margin:5px 0; }
        .fr-sr.bold { font-weight:700; font-size:13px; }
        .fr-sr.ow span:last-child { color:#dc2626; }
        .fr-sr.cl span:last-child { color:#16a34a; }
        .fr-arrears-row span:last-child { color:#b45309; font-weight:600; }
        .fr-discount-row span:last-child { color:#16a34a; font-weight:600; }
        .fr-sr-net { border-top:1px solid #e2e8f0; padding-top:8px; font-weight:600; }
        .fr-table { width:100%; border-collapse:collapse; position:relative; z-index:1; }
        .fr-table th { background:#1e40af; color:#fff; padding:9px 12px; font-size:11px; font-weight:600; text-align:left; }
        .fr-table th.n { text-align:right; }
        .fr-table td { padding:9px 12px; font-size:12px; color:#334155; border-bottom:1px solid #f1f5f9; }
        .fr-table tr.alt td { background:#f8fafc; }
        .fr-table tr.tf td { background:#eff6ff !important; border-top:2px solid #bfdbfe; }
        .fr-table td.idx { color:#94a3b8; width:26px; }
        .fr-table td.n { text-align:right; }
        .fr-table td.g { color:#16a34a !important; font-weight:600; }
        .fr-table td.r { color:#dc2626 !important; font-weight:600; }
        .fr-arrears-cell  { color:#b45309 !important; font-weight:600; }
        .fr-discount-cell { color:#16a34a !important; font-weight:600; }
        .fr-sm th, .fr-sm td { padding:7px 12px !important; }
        .fr-method { background:#f1f5f9; color:#475569; padding:2px 8px; border-radius:4px; font-size:11px; }
        .fr-footer { display:flex; justify-content:space-between; align-items:flex-end; margin-top:2.5rem; padding-top:1.5rem; border-top:1px solid #e2e8f0; position:relative; z-index:1; }
        .fr-stamp { width:86px; height:86px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:10px; font-weight:800; letter-spacing:.06em; text-transform:uppercase; border:3px solid; transform:rotate(-15deg); opacity:.8; text-align:center; white-space:pre-line; line-height:1.35; }
        .fr-stamp.sp { border-color:#16a34a; color:#16a34a; }
        .fr-stamp.sd { border-color:#dc2626; color:#dc2626; }
        @media print {
          .fr-overlay { position:static; background:none; padding:0; cursor:default; }
          .fr-modal   { box-shadow:none; border-radius:0; }
          .fr-receipt { padding:0; }
          .fr-watermark { opacity:.07; }
        }
      `}</style>
    </>
  );
}
