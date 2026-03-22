/**
 * useReceiptExport.js
 * Capture any receipt <div> and export as PDF, PNG image, or share it.
 *
 * Place in: src/hooks/useReceiptExport.js
 *
 * Libraries loaded from CDN on first use (cached — no npm install):
 *   html2canvas 1.4.1  –  renders the DOM node to a <canvas>
 *   jsPDF 2.5.1        –  wraps the canvas as a PDF page
 */

import { useState, useCallback, useRef } from "react";

// ─── CDN script loader ─────────────────────────────────────────────────────
const CDN = {
  html2canvas: {
    url: "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js",
    key: "html2canvas",
  },
  jspdf: {
    url: "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
    key: "jspdf",
  },
};

const scriptPromises = {};

function loadLib(name) {
  const { url, key } = CDN[name];
  if (window[key]) return Promise.resolve(window[key]);
  if (scriptPromises[name]) return scriptPromises[name];

  scriptPromises[name] = new Promise((resolve, reject) => {
    const tag = document.createElement("script");
    tag.src = url;
    tag.onload = () => {
      delete scriptPromises[name];
      resolve(window[key]);
    };
    tag.onerror = () => {
      delete scriptPromises[name];
      reject(new Error(`Failed to load ${name}`));
    };
    document.head.appendChild(tag);
  });

  return scriptPromises[name];
}

// Preload both libs as soon as the hook is imported so exports are instant.
if (typeof window !== "undefined") {
  loadLib("html2canvas").catch(() => {});
  loadLib("jspdf").catch(() => {});
}

// ─── Canvas capture ────────────────────────────────────────────────────────
async function captureElement(el) {
  const html2canvas = await loadLib("html2canvas");

  // Elements to hide during capture (toolbar buttons, close icons, etc.)
  const toHide = el.querySelectorAll(
    ".sr-no-print, .fr-no-print, .rtb-bar, .receipt-controls, [data-no-capture]",
  );
  const saved = [];
  toHide.forEach((n) => {
    saved.push([n, n.style.display]);
    n.style.display = "none";
  });

  // Force white background so the captured image isn't transparent
  const prevBg = el.style.background;
  el.style.background = "#ffffff";

  let canvas;
  try {
    canvas = await html2canvas(el, {
      scale: 2, // 2× = retina / crisp PDF
      useCORS: true, // allows cross-origin logo images
      allowTaint: false,
      backgroundColor: "#ffffff",
      logging: false,
      // Use the actual rendered size, not the viewport
      width: el.scrollWidth,
      height: el.scrollHeight,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    });
  } finally {
    // Always restore visibility even if capture throws
    el.style.background = prevBg;
    saved.forEach(([n, d]) => {
      n.style.display = d;
    });
  }

  return canvas;
}

// ─── Blob helper ──────────────────────────────────────────────────────────
function canvasToBlob(canvas, type = "image/png") {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("toBlob returned null"));
    }, type);
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────
/**
 * @param {React.RefObject} receiptRef  - ref attached to the printable receipt div
 * @param {string}          filename    - base filename without extension
 * @param {string}          shareTitle  - title shown in the share sheet
 */
export function useReceiptExport(
  receiptRef,
  filename = "receipt",
  shareTitle = "School Fee Receipt",
) {
  const [status, setStatus] = useState("idle"); // idle | capturing | done | error
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null); // success message

  const safe = useCallback(async (label, fn) => {
    setStatus("capturing");
    setError(null);
    setToast(null);
    try {
      await fn();
      setStatus("done");
    } catch (err) {
      if (err?.name === "AbortError") {
        setStatus("idle");
        return;
      }
      console.error(`[useReceiptExport] ${label} failed:`, err);
      setError(`${label} failed — ${err.message || "please try again."}`);
      setStatus("error");
    }
  }, []);

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // ── PDF ──────────────────────────────────────────────────────────────────
  const exportPDF = useCallback(
    () =>
      safe("PDF export", async () => {
        const el = receiptRef.current;
        if (!el) throw new Error("Receipt element not mounted");

        const [canvas] = await Promise.all([captureElement(el), loadLib("jspdf")]);
        const { jsPDF } = window.jspdf;

        const imgData = canvas.toDataURL("image/png");
        // Fit to A4 width; height scales proportionally
        const mmWidth = 210;
        const mmHeight = (canvas.height / canvas.width) * mmWidth;

        const pdf = new jsPDF({
          orientation: mmHeight > mmWidth ? "portrait" : "landscape",
          unit: "mm",
          format: [mmWidth, mmHeight],
          compress: true,
        });

        pdf.addImage(imgData, "PNG", 0, 0, mmWidth, mmHeight);
        pdf.save(`${filename}.pdf`);
        showToast("PDF downloaded ✓");
      }),
    [receiptRef, filename, safe, showToast],
  );

  // ── PNG image ────────────────────────────────────────────────────────────
  const exportImage = useCallback(
    () =>
      safe("Image export", async () => {
        const el = receiptRef.current;
        if (!el) throw new Error("Receipt element not mounted");

        const canvas = await captureElement(el);
        const url = canvas.toDataURL("image/png");
        const link = document.createElement("a");
        link.href = url;
        link.download = `${filename}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Image downloaded ✓");
      }),
    [receiptRef, filename, safe, showToast],
  );

  // ── Native share (Web Share API) ─────────────────────────────────────────
  const shareNative = useCallback(
    () =>
      safe("Share", async () => {
        const el = receiptRef.current;
        if (!el) throw new Error("Receipt element not mounted");

        const canvas = await captureElement(el);
        const blob = await canvasToBlob(canvas);
        const file = new File([blob], `${filename}.png`, { type: "image/png" });

        if (navigator.share) {
          const shareData = { title: shareTitle, text: shareTitle };

          // Try with file attachment first (mobile)
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ ...shareData, files: [file] });
          } else {
            await navigator.share(shareData);
          }
        } else {
          // Fallback: copy image to clipboard
          try {
            await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
            showToast("Receipt copied to clipboard ✓");
          } catch {
            // Last resort: open as data URL in new tab
            window.open(canvas.toDataURL("image/png"), "_blank");
          }
        }
      }),
    [receiptRef, filename, shareTitle, safe, showToast],
  );

  // ── WhatsApp share ────────────────────────────────────────────────────────
  // Exports to PNG, uploads to a free temp image host, then opens WhatsApp
  // with the image URL. Falls back to just sharing the text if upload fails.
  const shareWhatsApp = useCallback(
    () =>
      safe("WhatsApp share", async () => {
        const el = receiptRef.current;
        if (!el) throw new Error("Receipt element not mounted");

        const canvas = await captureElement(el);
        const blob = await canvasToBlob(canvas);

        // Try to upload to freeimage.host (no API key needed for public uploads)
        let imageUrl = null;
        try {
          const form = new FormData();
          form.append("source", blob, `${filename}.png`);
          form.append("type", "file");

          const res = await fetch(
            "https://freeimage.host/api/1/upload?key=6d207e02198a847aa98d0a2a901485a2",
            {
              method: "POST",
              body: form,
            },
          );
          const json = await res.json();
          if (json?.status_code === 200) imageUrl = json.image?.url;
        } catch {
          // Upload failed — we'll send text only
        }

        const text = imageUrl
          ? `${shareTitle}\n${imageUrl}`
          : `${shareTitle}\n(See attached receipt)`;

        const waUrl = `https://wa.me/?text=${encodeURIComponent(text)}`;
        window.open(waUrl, "_blank", "noopener");
      }),
    [receiptRef, filename, shareTitle, safe],
  );

  const exporting = status === "capturing";
  const canShare = typeof navigator.share === "function";

  return {
    exportPDF,
    exportImage,
    shareNative,
    shareWhatsApp,
    exporting,
    canShare,
    error,
    toast,
    status,
  };
}
