/**
 * letterExportUtils.js  —  browser-only letter export helpers
 *
 * KEY FIX: Packer.toBuffer() is Node.js only and throws
 * "nodebuffer is not supported by this platform" in the browser.
 * Use Packer.toBlob() instead — it works in all modern browsers.
 *
 * Exports:
 *   exportLetterAsDocx(values, template, schoolMeta)   → .docx download
 *   exportLetterAsImage(sheetElement)                  → .png  download
 *   exportBulkAsZip(generatedLetters, template, schoolMeta) → .zip download
 *
 * Install dependencies (if not already present):
 *   npm install docx jszip html-to-image
 */

// ── Lazy dynamic imports (keeps initial bundle light) ────────────────────────
const loadDocx = () => import("docx");
const loadJSZip = () => import("jszip");
const loadH2Image = () => import("html-to-image");

/* ─────────────────────────────────────────────────────────────
   INTERNAL — build a Document object (no packing here)
───────────────────────────────────────────────────────────── */
async function buildDocxDocument(values, template, schoolMeta) {
  const { Document, Paragraph, TextRun, AlignmentType, BorderStyle, ImageRun } = await loadDocx();

  const {
    schoolName = "Your School Name",
    schoolAddress = "School Address",
    schoolPhone = "",
    schoolEmail = "",
    logoBase64 = null, // full data-URL, e.g. "data:image/png;base64,..."
    logoMediaType = "png", // "png" | "jpeg"
  } = schoolMeta ?? {};

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const subject = _fill(template.subject ?? "", values);
  const bodyText = _fill(template.body ?? "", values);
  const recipient = values.recipientName ?? "Parent / Guardian";
  const sender = values.senderName ?? "School Administrator";
  const bodyLines = bodyText.split(/\r?\n/);

  // ── Letterhead ────────────────────────────────────────────
  const headerChildren = [];

  // Optional logo
  if (logoBase64) {
    try {
      const b64 = logoBase64.replace(/^data:image\/[a-z+]+;base64,/, "");
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);

      headerChildren.push(
        new Paragraph({
          children: [
            new ImageRun({
              data: bytes.buffer,
              transformation: { width: 70, height: 50 },
              type: logoMediaType === "jpeg" ? "jpg" : "png",
            }),
          ],
          spacing: { after: 80 },
        }),
      );
    } catch (_) {
      /* logo embed failed — continue without it */
    }
  }

  // School name
  headerChildren.push(
    new Paragraph({
      children: [
        new TextRun({ text: schoolName, bold: true, size: 32, font: "Arial", color: "0f172a" }),
      ],
      spacing: { after: 60 },
    }),
  );

  // Address
  if (schoolAddress) {
    headerChildren.push(
      new Paragraph({
        children: [new TextRun({ text: schoolAddress, size: 20, font: "Arial", color: "475569" })],
        spacing: { after: 40 },
      }),
    );
  }

  // Contact line
  const contactLine = [schoolPhone, schoolEmail].filter(Boolean).join("   |   ");
  if (contactLine) {
    headerChildren.push(
      new Paragraph({
        children: [new TextRun({ text: contactLine, size: 18, font: "Arial", color: "64748b" })],
        spacing: { after: 200 },
      }),
    );
  }

  // Horizontal rule
  headerChildren.push(
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "1e293b", space: 1 } },
      spacing: { after: 200 },
      children: [],
    }),
  );

  // Date — right-aligned
  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: today, size: 20, font: "Arial", color: "475569" })],
      spacing: { after: 240 },
    }),
  );

  // ── To / Re ───────────────────────────────────────────────
  const addressChildren = [
    new Paragraph({
      children: [
        new TextRun({ text: "To:  ", bold: true, size: 22, font: "Arial" }),
        new TextRun({ text: recipient, size: 22, font: "Arial" }),
      ],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [
        new TextRun({ text: "Re:  ", bold: true, size: 22, font: "Arial" }),
        new TextRun({ text: subject, bold: true, size: 22, font: "Arial" }),
      ],
      spacing: { after: 320 },
    }),
  ];

  // ── Body ─────────────────────────────────────────────────
  const bodyChildren = bodyLines.map((line) => {
    if (!line.trim()) {
      return new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } });
    }
    return new Paragraph({
      children: [new TextRun({ text: line, size: 22, font: "Georgia" })],
      spacing: { after: 160, line: 276 },
    });
  });

  // ── Signature ─────────────────────────────────────────────
  const signatureChildren = [
    new Paragraph({ children: [], spacing: { before: 480 } }),
    new Paragraph({
      children: [new TextRun({ text: "Yours faithfully,", size: 22, font: "Georgia" })],
      spacing: { after: 600 },
    }),
    new Paragraph({
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: "374151", space: 1 } },
      children: [],
      spacing: { after: 80 },
    }),
    new Paragraph({
      children: [new TextRun({ text: sender, bold: true, size: 22, font: "Arial" })],
      spacing: { after: 40 },
    }),
    new Paragraph({
      children: [new TextRun({ text: schoolName, size: 20, font: "Arial", color: "64748b" })],
    }),
  ];

  return new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4 in DXA
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: [...headerChildren, ...addressChildren, ...bodyChildren, ...signatureChildren],
      },
    ],
  });
}

/* ─────────────────────────────────────────────────────────────
   INTERNAL helpers
───────────────────────────────────────────────────────────── */
function _fill(tmpl, values) {
  return tmpl.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, k) => values[k] ?? `{{${k}}}`);
}

function _safeName(str) {
  return (str ?? "letter")
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
}

function _download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC: single .docx
   FIX: Packer.toBlob() is the browser-safe API.
        Packer.toBuffer() is Node-only and throws in the browser.
───────────────────────────────────────────────────────────── */
export async function exportLetterAsDocx(values, template, schoolMeta) {
  const { Packer } = await loadDocx();
  const doc = await buildDocxDocument(values, template, schoolMeta);

  // ✅ toBlob() — works in every modern browser
  const blob = await Packer.toBlob(doc);

  const filename = _safeName(values.studentName || template?.name || "letter") + ".docx";
  _download(blob, filename);
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC: single .png screenshot of the rendered DOM node
───────────────────────────────────────────────────────────── */
export async function exportLetterAsImage(sheetElement) {
  if (!sheetElement) {
    console.warn("exportLetterAsImage: sheetElement is null — make sure ref is attached");
    return;
  }

  const { toPng } = await loadH2Image();

  const dataUrl = await toPng(sheetElement, {
    quality: 1,
    pixelRatio: 2, // 2× retina resolution
    backgroundColor: "#ffffff",
    skipFonts: false,
  });

  const a = Object.assign(document.createElement("a"), { href: dataUrl, download: "letter.png" });
  a.click();
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC: bulk .zip of .docx files
   FIX: Packer.toBlob() → convert to ArrayBuffer for JSZip,
        because JSZip.file() accepts ArrayBuffer in the browser.
───────────────────────────────────────────────────────────── */
export async function exportBulkAsZip(generatedLetters, template, schoolMeta) {
  if (!generatedLetters?.length) return;

  const { Packer } = await loadDocx();
  const JSZipMod = await loadJSZip();
  // Handle both ESM default export and CJS interop
  const JSZip = JSZipMod.default ?? JSZipMod;

  const zip = new JSZip();
  const folder = zip.folder("letters");

  for (const { student, values } of generatedLetters) {
    const doc = await buildDocxDocument(values, template, schoolMeta);

    // ✅ toBlob() is browser-safe; then convert to ArrayBuffer for JSZip
    const blob = await Packer.toBlob(doc);
    const buffer = await blob.arrayBuffer();

    const name =
      _safeName(
        `${student.firstName ?? ""}_${student.lastName ?? ""}_${template?.name ?? "letter"}`,
      ) + ".docx";

    folder.file(name, buffer);
  }

  const zipBlob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const zipName =
    _safeName(template?.name || "letters") + "_" + new Date().toISOString().slice(0, 10) + ".zip";

  _download(zipBlob, zipName);
}
