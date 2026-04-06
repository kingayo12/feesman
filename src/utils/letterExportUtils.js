/**
 * letterExportUtils.js  —  browser-only letter export helpers
 *
 * Fully generic — works for ANY school.
 * All school identity (name, address, logo, watermark, motto, etc.)
 * is passed in via the `schoolMeta` argument, which is built from
 * the school's own settings in Firestore.
 *
 * schoolMeta shape:
 * {
 *   schoolName:       string,
 *   schoolAddress:    string,
 *   schoolPhone:      string,
 *   schoolEmail:      string,
 *   schoolMotto:      string,   // optional
 *   logoDataUrl:      string,   // "data:image/png;base64,..." or null
 *   watermarkDataUrl: string,   // same image used faintly, or null
 * }
 *
 * KEY: Uses Packer.toBlob() — the browser-safe docx API.
 *      Packer.toBuffer() is Node.js only and throws in browsers.
 *
 * Install:  npm install docx jszip html-to-image
 */

// ── Lazy imports (keep initial bundle light) ─────────────────────────────────
const loadDocx = () => import("docx");
const loadJSZip = () => import("jszip");
const loadH2Image = () => import("html-to-image");

/* ─────────────────────────────────────────────────────────────
   INTERNAL — convert a data-URL or plain base64 string → Uint8Array
───────────────────────────────────────────────────────────── */
function dataUrlToBytes(dataUrl) {
  if (!dataUrl) return null;
  try {
    const b64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/* ─────────────────────────────────────────────────────────────
   INTERNAL — detect image type from data-URL
───────────────────────────────────────────────────────────── */
function detectImageType(dataUrl) {
  if (!dataUrl) return "png";
  if (dataUrl.includes("image/jpeg") || dataUrl.includes("image/jpg")) return "jpg";
  if (dataUrl.includes("image/gif")) return "gif";
  if (dataUrl.includes("image/bmp")) return "bmp";
  return "png";
}

/* ─────────────────────────────────────────────────────────────
   INTERNAL — fill {{token}} placeholders
───────────────────────────────────────────────────────────── */
function _fill(tmpl, values) {
  return (tmpl ?? "").replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_m, k) => values[k] ?? `{{${k}}}`);
}

/* ─────────────────────────────────────────────────────────────
   INTERNAL — safe filename
───────────────────────────────────────────────────────────── */
function _safeName(str) {
  return (str ?? "letter")
    .replace(/[^a-zA-Z0-9_\-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 60);
}

/* ─────────────────────────────────────────────────────────────
   INTERNAL — trigger a browser file download
───────────────────────────────────────────────────────────── */
function _download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), {
    href: url,
    download: filename,
  });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 8000);
}

/* ─────────────────────────────────────────────────────────────
   INTERNAL — build a Document object
   Letterhead layout mirrors a professional school letter:
     • Logo top-left  (if provided)
     • School name bold centred  (or left if no logo)
     • Address / phone / email / motto centred below
     • Horizontal rule
     • Date right-aligned
     • To / Re addressing block
     • Body paragraphs
     • Signature block
     • School logo as faint watermark behind body (if logo provided)
───────────────────────────────────────────────────────────── */
async function buildDocxDocument(values, template, schoolMeta) {
  const {
    Document,
    Paragraph,
    TextRun,
    ImageRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    BorderStyle,
    WidthType,
    HorizontalPositionRelativeFrom,
    VerticalPositionRelativeFrom,
    HorizontalPositionAlign,
    VerticalPositionAlign,
    TextWrappingType,
    TextWrappingSide,
  } = await loadDocx();

  // ── School identity from settings (no hardcoded fallbacks) ───
  const schoolName = schoolMeta?.schoolName || "";
  const schoolAddress = schoolMeta?.schoolAddress || "";
  const schoolPhone = schoolMeta?.schoolPhone || "";
  const schoolEmail = schoolMeta?.schoolEmail || "";
  const schoolMotto = schoolMeta?.schoolMotto || "";
  const logoDataUrl = schoolMeta?.logoDataUrl || null;
  const watermarkDataUrl = schoolMeta?.watermarkDataUrl || logoDataUrl; // reuse logo as watermark if separate not provided

  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const subject = _fill(template?.subject ?? "", values);
  const bodyText = _fill(template?.body ?? "", values);
  const recipient = values.recipientName || "Parent / Guardian";
  const sender = values.senderName || "School Administrator";
  const bodyLines = bodyText.split(/\r?\n/);

  // ── Convert logo/watermark to bytes if available ─────────────
  const logoBytes = logoDataUrl ? dataUrlToBytes(logoDataUrl) : null;
  const watermarkBytes = watermarkDataUrl ? dataUrlToBytes(watermarkDataUrl) : null;
  const logoType = detectImageType(logoDataUrl);
  const watermarkType = detectImageType(watermarkDataUrl);

  // ── No-border style for table cells ─────────────────────────
  const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
  const noBorders = {
    top: noBorder,
    bottom: noBorder,
    left: noBorder,
    right: noBorder,
    insideHorizontal: noBorder,
    insideVertical: noBorder,
  };

  // ── Letterhead: logo-left + info-centre table ────────────────
  // If no logo, just use centred paragraphs directly.
  let letterheadChildren = [];

  if (logoBytes) {
    // Two-column no-border table: [logo | info]
    const logoColWidth = 1440; // ~1 inch
    const infoColWidth = 7920; // rest of A4 content width
    const letterheadTable = new Table({
      width: { size: logoColWidth + infoColWidth, type: WidthType.DXA },
      columnWidths: [logoColWidth, infoColWidth],
      borders: {
        top: noBorder,
        bottom: noBorder,
        left: noBorder,
        right: noBorder,
        insideH: noBorder,
        insideV: noBorder,
      },
      rows: [
        new TableRow({
          children: [
            // Logo cell
            new TableCell({
              borders: noBorders,
              margins: { top: 0, bottom: 0, left: 0, right: 120 },
              width: { size: logoColWidth, type: WidthType.DXA },
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: logoBytes.buffer,
                      transformation: { width: 80, height: 80 },
                      type: logoType,
                    }),
                  ],
                  spacing: { after: 0 },
                }),
              ],
            }),
            // School info cell
            new TableCell({
              borders: noBorders,
              margins: { top: 60, bottom: 0, left: 0, right: 0 },
              width: { size: infoColWidth, type: WidthType.DXA },
              children: [
                schoolName &&
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: schoolName.toUpperCase(),
                        bold: true,
                        size: 34,
                        font: "Arial",
                        color: "1F3A8A",
                      }),
                    ],
                    spacing: { after: 60 },
                  }),
                schoolAddress &&
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: schoolAddress,
                        size: 18,
                        font: "Arial",
                        color: "111111",
                      }),
                    ],
                    spacing: { after: 40 },
                  }),
                (schoolPhone || schoolEmail) &&
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      schoolPhone &&
                        new TextRun({
                          text: `Tel: ${schoolPhone}`,
                          size: 18,
                          font: "Arial",
                          color: "111111",
                        }),
                      schoolPhone &&
                        schoolEmail &&
                        new TextRun({ text: "   |   ", size: 18, font: "Arial", color: "9ca3af" }),
                      schoolEmail &&
                        new TextRun({
                          text: `Email: ${schoolEmail}`,
                          size: 18,
                          font: "Arial",
                          color: "111111",
                        }),
                    ].filter(Boolean),
                    spacing: { after: 40 },
                  }),
                schoolMotto &&
                  new Paragraph({
                    alignment: AlignmentType.CENTER,
                    children: [
                      new TextRun({
                        text: `MOTTO: ${schoolMotto}`,
                        size: 18,
                        font: "Arial",
                        color: "111111",
                        bold: true,
                      }),
                    ],
                    spacing: { after: 0 },
                  }),
              ].filter(Boolean),
            }),
          ],
        }),
      ],
    });
    letterheadChildren = [letterheadTable];
  } else {
    // No logo — centred text only
    if (schoolName) {
      letterheadChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: schoolName.toUpperCase(),
              bold: true,
              size: 34,
              font: "Arial",
              color: "1F3A8A",
            }),
          ],
          spacing: { after: 60 },
        }),
      );
    }
    if (schoolAddress) {
      letterheadChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: schoolAddress, size: 18, font: "Arial", color: "111111" }),
          ],
          spacing: { after: 40 },
        }),
      );
    }
    if (schoolPhone || schoolEmail) {
      letterheadChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            schoolPhone && new TextRun({ text: `Tel: ${schoolPhone}`, size: 18, font: "Arial" }),
            schoolPhone &&
              schoolEmail &&
              new TextRun({ text: "   |   ", size: 18, font: "Arial", color: "9ca3af" }),
            schoolEmail && new TextRun({ text: `Email: ${schoolEmail}`, size: 18, font: "Arial" }),
          ].filter(Boolean),
          spacing: { after: 40 },
        }),
      );
    }
    if (schoolMotto) {
      letterheadChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: `MOTTO: ${schoolMotto}`, size: 18, font: "Arial", bold: true }),
          ],
          spacing: { after: 0 },
        }),
      );
    }
  }

  // ── Divider rule ──────────────────────────────────────────────
  const rule = new Paragraph({
    border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: "1F3A8A", space: 1 } },
    spacing: { after: 240, before: 120 },
    children: [],
  });

  // ── Date right-aligned ────────────────────────────────────────
  const datePara = new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: today, size: 20, font: "Arial" })],
    spacing: { after: 280 },
  });

  // ── To / Re block ─────────────────────────────────────────────
  const addrBlock = [
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

  // ── Watermark (floating, behind text) ────────────────────────
  // Only added if the school has a logo/watermark image.
  const watermarkPara = watermarkBytes
    ? new Paragraph({
        children: [
          new ImageRun({
            data: watermarkBytes.buffer,
            transformation: { width: 370, height: 370 },
            type: watermarkType,
            floating: {
              horizontalPosition: {
                relative: HorizontalPositionRelativeFrom.PAGE,
                align: HorizontalPositionAlign.CENTER,
              },
              verticalPosition: {
                relative: VerticalPositionRelativeFrom.PAGE,
                align: VerticalPositionAlign.CENTER,
              },
              wrap: {
                type: TextWrappingType.NONE,
                side: TextWrappingSide.BOTH_SIDES,
              },
              behindDocument: true,
              allowOverlap: true,
            },
          }),
        ],
        spacing: { after: 0 },
      })
    : null;

  // ── Body paragraphs ───────────────────────────────────────────
  const bodyParas = bodyLines.map((line) => {
    if (!line.trim()) {
      return new Paragraph({ children: [new TextRun("")], spacing: { after: 120 } });
    }
    return new Paragraph({
      children: [new TextRun({ text: line, size: 22, font: "Georgia" })],
      spacing: { after: 160, line: 276 },
    });
  });

  // ── Signature block ───────────────────────────────────────────
  const sigBlock = [
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
    schoolName &&
      new Paragraph({
        children: [new TextRun({ text: schoolName, size: 20, font: "Arial", color: "64748b" })],
      }),
  ].filter(Boolean);

  // ── Assemble ──────────────────────────────────────────────────
  return new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: 720, right: 1080, bottom: 1080, left: 1080 },
          },
        },
        children: [
          ...letterheadChildren,
          rule,
          datePara,
          ...addrBlock,
          ...(watermarkPara ? [watermarkPara] : []),
          ...bodyParas,
          ...sigBlock,
        ],
      },
    ],
  });
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC: export single letter as .docx
───────────────────────────────────────────────────────────── */
export async function exportLetterAsDocx(values, template, schoolMeta) {
  const { Packer } = await loadDocx();
  const doc = await buildDocxDocument(values, template, schoolMeta);
  const blob = await Packer.toBlob(doc); // ✅ browser-safe (not toBuffer)
  const filename = _safeName(values?.studentName || template?.name || "letter") + ".docx";
  _download(blob, filename);
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC: export single letter as .png screenshot of DOM node
───────────────────────────────────────────────────────────── */
export async function exportLetterAsImage(sheetElement) {
  if (!sheetElement) {
    console.warn("exportLetterAsImage: sheetElement is null — ensure ref is attached");
    return;
  }
  const { toPng } = await loadH2Image();
  const dataUrl = await toPng(sheetElement, {
    quality: 1,
    pixelRatio: 2,
    backgroundColor: "#ffffff",
  });
  const a = Object.assign(document.createElement("a"), { href: dataUrl, download: "letter.png" });
  a.click();
}

/* ─────────────────────────────────────────────────────────────
   PUBLIC: export multiple letters as a ZIP of .docx files
───────────────────────────────────────────────────────────── */
export async function exportBulkAsZip(generatedLetters, template, schoolMeta) {
  if (!generatedLetters?.length) return;

  const { Packer } = await loadDocx();
  const JSZipMod = await loadJSZip();
  const JSZip = JSZipMod.default ?? JSZipMod;

  const zip = new JSZip();
  const folder = zip.folder("letters");

  for (const { student, values } of generatedLetters) {
    const doc = await buildDocxDocument(values, template, schoolMeta);
    const blob = await Packer.toBlob(doc); // ✅ browser-safe
    const buffer = await blob.arrayBuffer(); // ArrayBuffer for JSZip
    const name =
      _safeName(
        `${student?.firstName ?? ""}_${student?.lastName ?? ""}_${template?.name ?? "letter"}`,
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
