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
    </>
  );
}
