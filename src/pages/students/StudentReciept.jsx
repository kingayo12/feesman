import { useRef } from "react";
import Logo from "../../assets/logo.png";
import ReceiptToolbar from "../../components/common/ReceiptToolbar";
import { useReceiptExport } from "../../hooks/UseReceipt";
import { fmt } from "../../constants";

export default function StudentReceipt({
  payment,
  student,
  settings,
  fees = [], // This will now contain either school fees or inventory items
  allPayments = [],
  prevBalance = 0,
  discountBreakdown = [],
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

  // ── Logic Switches ────────────────────────────────────────────────────────
  const isInventory = payment?.type === "inventory";

  // ── Calculations ──────────────────────────────────────────────────────────
  const receiptNo = `STU-${payment?.id?.slice(0, 8).toUpperCase() || "N/A"}`;
  const payDate = fmt(payment?.date);
  const today = fmt(new Date());

  // Filter and sort payments for this term to calculate "Paid so Far"
  const termPayments = allPayments.filter((p) => p.term === payment?.term);
  const sorted = [...termPayments].sort((a, b) => (a.date?.seconds || 0) - (b.date?.seconds || 0));

  const currentIdx = sorted.findIndex((p) => p.id === payment?.id);
  const paidSoFar = sorted.slice(0, currentIdx + 1).reduce((s, p) => s + Number(p.amount || 0), 0);

  const currentTermFees = fees.reduce((s, f) => s + Number(f.amount || 0), 0);
  const totalDiscount = isInventory
    ? 0
    : discountBreakdown.reduce((s, b) => s + Number(b.amount || 0), 0);

  const termTotal = Math.max(currentTermFees + Number(prevBalance || 0) - totalDiscount, 0);
  const balance = Math.max(termTotal - paidSoFar, 0);
  const isPaid = balance <= 0;

  const hasBreakdown = fees.length > 0 || prevBalance > 0 || discountBreakdown.length > 0;

  return (
    <div className='sr-overlay'>
      <div className='sr-modal'>
        <ReceiptToolbar
          title={`Receipt — ${student?.firstName} ${student?.lastName}`}
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
              <p className='sr-doc-label'>{isInventory ? "Inventory Receipt" : "Fee Receipt"}</p>
              <table className='sr-meta'>
                <tbody>
                  <tr>
                    <td>Receipt No.</td>
                    <td>
                      <strong>{receiptNo}</strong>
                    </td>
                  </tr>
                  <tr>
                    <td>Issued</td>
                    <td>{today}</td>
                  </tr>
                  <tr>
                    <td>Payment Date</td>
                    <td>{payDate}</td>
                  </tr>
                  <tr>
                    <td>Session</td>
                    <td>{settings?.academicYear}</td>
                  </tr>
                  <tr>
                    <td>Term</td>
                    <td>{payment?.term}</td>
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
                {student?.firstName} {student?.otherName || ""} {student?.lastName}
              </p>
              {student?.admissionNo && (
                <p className='sr-line sr-muted'>Admission No: {student.admissionNo}</p>
              )}
            </div>
            <div className='sr-amount-card'>
              <span className='sr-method-pill' style={{ marginBottom: 4 }}>
                {isInventory ? "Inventory Sale" : "School Fees"}
              </span>
              <p className='sr-amount-label'>Amount Paid</p>
              <p className='sr-amount-value'>₦{Number(payment?.amount || 0).toLocaleString()}</p>
              <span className='sr-method-pill'>{payment?.method}</span>
            </div>
          </div>

          {/* ── Table Breakdown ────────────────────────────────── */}
          {hasBreakdown && (
            <>
              <p className='sr-cap-label' style={{ marginTop: "1.5rem", marginBottom: "0.5rem" }}>
                {isInventory ? "Purchased Items" : `Fee Breakdown — ${payment?.term}`}
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
                  {/* Previous Arrears (Only for Fees) */}
                  {!isInventory && prevBalance > 0 && (
                    <tr className='sr-arrears-row'>
                      <td className='idx'>—</td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#92400e" }}>
                          Previous Balance (Arrears)
                        </span>
                      </td>
                      <td className='n' style={{ color: "#b45309", fontWeight: 700 }}>
                        ₦{Number(prevBalance).toLocaleString()}
                      </td>
                    </tr>
                  )}

                  {/* Line Items (Either Fees or Inventory Items) */}
                  {fees.map((f, i) => (
                    <tr key={f.id || i} className={i % 2 === 0 ? "alt" : ""}>
                      <td className='idx'>{i + 1}</td>
                      <td>{f.feeType || f.note || "Item"}</td>
                      <td className='n'>₦{Number(f.amount || 0).toLocaleString()}</td>
                    </tr>
                  ))}

                  {/* Discounts (Only for Fees) */}
                  {!isInventory &&
                    discountBreakdown.map((b) => (
                      <tr key={b.discountId} className='sr-discount-row'>
                        <td className='idx'>—</td>
                        <td>
                          <span style={{ fontWeight: 600, color: "#166534" }}>
                            {b.discountName}
                          </span>
                        </td>
                        <td className='n' style={{ color: "#16a34a", fontWeight: 700 }}>
                          −₦{Number(b.amount || 0).toLocaleString()}
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

          {/* ── Summary ────────────────────────────────────────── */}
          <div className='sr-summary'>
            <div className='sr-srow'>
              <span>{isInventory ? "Items Total" : "Term Fees"}</span>
              <span>₦{currentTermFees.toLocaleString()}</span>
            </div>
            {!isInventory && prevBalance > 0 && (
              <div className='sr-srow' style={{ color: "#b45309" }}>
                <span>+ Previous Arrears</span>
                <span>₦{Number(prevBalance).toLocaleString()}</span>
              </div>
            )}
            {!isInventory && totalDiscount > 0 && (
              <div className='sr-srow' style={{ color: "#16a34a" }}>
                <span>− Discounts</span>
                <span>₦{totalDiscount.toLocaleString()}</span>
              </div>
            )}
            <div className='sr-sdiv' />
            <div className='sr-srow g'>
              <span>
                <strong>This Payment</strong>
              </span>
              <span>
                <strong>₦{Number(payment?.amount || 0).toLocaleString()}</strong>
              </span>
            </div>
            <div className={`sr-srow bold ${isPaid ? "cl" : "ow"}`}>
              <span>Balance Outstanding</span>
              <span>₦{balance.toLocaleString()}</span>
            </div>
          </div>

          {/* ── Footer ────────────────────────────────────────── */}
          <div className='sr-footer'>
            <div>
              <p className='sr-line sr-muted small'>
                Computer-generated receipt — no signature required.
              </p>
              <p className='sr-line sr-muted'>
                Thank you — <strong>{settings?.name}</strong>
              </p>
            </div>
            <div className={`sr-stamp ${isPaid ? "sp" : "sd"}`}>
              {isPaid ? "PAID\nIN FULL" : "PARTIAL\nPAYMENT"}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
