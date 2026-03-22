/**
 * ReceiptToolbar.jsx
 * Complete export action bar for receipt modals.
 * Place in: src/components/common/ReceiptToolbar.jsx
 */

import {
  HiX,
  HiPrinter,
  HiShare,
  HiPhotograph,
  HiDownload,
  HiCheckCircle,
  HiExclamationCircle,
} from "react-icons/hi";

// WhatsApp SVG icon (no react-icons entry for this)
function WhatsAppIcon() {
  return (
    <svg viewBox='0 0 24 24' width='16' height='16' fill='currentColor'>
      <path d='M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z' />
    </svg>
  );
}

export default function ReceiptToolbar({
  title = "Receipt",
  onClose,
  exportPDF,
  exportImage,
  shareNative,
  shareWhatsApp,
  exporting = false,
  canShare = false,
  error = null,
  toast = null,
}) {
  return (
    <div data-no-capture className='rtb-root'>
      {/* ── Main bar ─────────────────────────────────────────────── */}
      <div className='rtb-bar'>
        <span className='rtb-title'>{title}</span>

        <div className='rtb-actions'>
          {/* PDF */}
          <button
            className='rtb-btn rtb-pdf'
            onClick={exportPDF}
            disabled={exporting}
            title='Download PDF'
          >
            {exporting ? <Spinner /> : <HiDownload />}
            <span>PDF</span>
          </button>

          {/* PNG Image */}
          <button
            className='rtb-btn rtb-img'
            onClick={exportImage}
            disabled={exporting}
            title='Download as image'
          >
            {exporting ? <Spinner /> : <HiPhotograph />}
            <span>Image</span>
          </button>

          {/* WhatsApp */}
          <button
            className='rtb-btn rtb-wa'
            onClick={shareWhatsApp}
            disabled={exporting}
            title='Share on WhatsApp'
          >
            {exporting ? <Spinner /> : <WhatsAppIcon />}
            <span>WhatsApp</span>
          </button>

          {/* Native share / clipboard */}
          <button
            className='rtb-btn rtb-share'
            onClick={shareNative}
            disabled={exporting}
            title={canShare ? "Share…" : "Copy to clipboard"}
          >
            {exporting ? <Spinner /> : <HiShare />}
            <span>{canShare ? "Share" : "Copy"}</span>
          </button>

          {/* Print */}
          <button
            className='rtb-btn rtb-print'
            onClick={() => window.print()}
            disabled={exporting}
            title='Print / Save as PDF'
          >
            <HiPrinter />
            <span>Print</span>
          </button>

          {/* Close */}
          <button className='rtb-close' onClick={onClose} title='Close' disabled={exporting}>
            <HiX />
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {error && (
        <div className='rtb-banner rtb-error'>
          <HiExclamationCircle />
          <span>{error}</span>
        </div>
      )}

      {/* ── Success toast ─────────────────────────────────────────── */}
      {toast && (
        <div className='rtb-banner rtb-success'>
          <HiCheckCircle />
          <span>{toast}</span>
        </div>
      )}

      {/* ── Busy overlay hint ─────────────────────────────────────── */}
      {exporting && (
        <div className='rtb-busy'>
          <Spinner size={18} />
          <span>Preparing export…</span>
        </div>
      )}

      <style>{`
        .rtb-root { font-family: "Segoe UI", Arial, sans-serif; }

        /* Bar */
        .rtb-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 16px; gap: 12px; flex-wrap: wrap;
          background: #f8fafc; border-bottom: 1px solid #e2e8f0;
        }
        .rtb-title { font-size: 13px; font-weight: 600; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 220px; }

        /* Action group */
        .rtb-actions { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }

        /* Shared button base */
        .rtb-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 7px 12px; border-radius: 7px;
          border: 1px solid transparent; cursor: pointer;
          font-size: 12px; font-weight: 600; transition: filter 0.15s, opacity 0.15s;
          white-space: nowrap;
        }
        .rtb-btn svg { width: 15px; height: 15px; flex-shrink: 0; }
        .rtb-btn span { display: none; }
        @media (min-width: 520px) { .rtb-btn span { display: inline; } }
        .rtb-btn:disabled { opacity: 0.55; cursor: not-allowed; }
        .rtb-btn:not(:disabled):hover { filter: brightness(0.93); }

        /* Individual colours */
        .rtb-pdf   { background: #dbeafe; color: #1d4ed8; border-color: #bfdbfe; }
        .rtb-img   { background: #d1fae5; color: #065f46; border-color: #a7f3d0; }
        .rtb-wa    { background: #dcfce7; color: #15803d; border-color: #4ade80; }
        .rtb-share { background: #ede9fe; color: #6d28d9; border-color: #ddd6fe; }
        .rtb-print { background: #fff7ed; color: #c2410c; border-color: #fed7aa; }

        .rtb-close {
          width: 32px; height: 32px; border-radius: 7px;
          background: #fee2e2; color: #dc2626; border: 1px solid #fecaca;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 15px; flex-shrink: 0; transition: background 0.15s;
        }
        .rtb-close:hover:not(:disabled) { background: #fecaca; }
        .rtb-close:disabled { opacity: 0.5; cursor: not-allowed; }

        /* Banners */
        .rtb-banner {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 16px; font-size: 12px; font-weight: 500;
          border-bottom: 1px solid transparent;
          animation: rtb-fade-in 0.2s ease;
        }
        .rtb-banner svg { width: 16px; height: 16px; flex-shrink: 0; }
        .rtb-error   { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
        .rtb-success { background: #dcfce7; color: #166534; border-color: #bbf7d0; }

        /* Busy strip */
        .rtb-busy {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 16px; font-size: 12px; color: #64748b;
          background: #f1f5f9; border-bottom: 1px solid #e2e8f0;
          animation: rtb-fade-in 0.2s ease;
        }

        @keyframes rtb-fade-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
        @keyframes rtb-spin    { to { transform: rotate(360deg); } }

        /* Dark mode */
        [data-theme="dark"] .rtb-bar    { background: #0f172a; border-color: #1e293b; }
        [data-theme="dark"] .rtb-title  { color: #f1f5f9; }
        [data-theme="dark"] .rtb-pdf    { background: #1e3a5f; color: #93c5fd; border-color: #1e40af; }
        [data-theme="dark"] .rtb-img    { background: #052e16; color: #6ee7b7; border-color: #065f46; }
        [data-theme="dark"] .rtb-wa     { background: #052e16; color: #4ade80; border-color: #14532d; }
        [data-theme="dark"] .rtb-share  { background: #2e1065; color: #c4b5fd; border-color: #4c1d95; }
        [data-theme="dark"] .rtb-print  { background: #431407; color: #fdba74; border-color: #7c2d12; }
        [data-theme="dark"] .rtb-close  { background: #3f0000; color: #f87171; border-color: #7f1d1d; }
        [data-theme="dark"] .rtb-busy   { background: #0f172a; border-color: #1e293b; color: #64748b; }
        [data-theme="dark"] .rtb-error  { background: #3f0000; color: #f87171; border-color: #7f1d1d; }
        [data-theme="dark"] .rtb-success { background: #052e16; color: #4ade80; border-color: #14532d; }

        /* Print — hide the whole toolbar */
        @media print { .rtb-root { display: none !important; } }
      `}</style>
    </div>
  );
}

function Spinner({ size = 14 }) {
  return (
    <span
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        border: "2px solid currentColor",
        borderTopColor: "transparent",
        flexShrink: 0,
        animation: "rtb-spin 0.7s linear infinite",
      }}
    />
  );
}
