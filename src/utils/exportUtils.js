export function downloadBlob(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function escapeCsv(value) {
  const text = value == null ? "" : String(value);
  const escaped = text.replace(/"/g, '""');
  return `"${escaped}"`;
}

function sanitizeValue(value) {
  if (value == null) return "";
  return String(value);
}

export function exportTableCSV(filename, headers, rows) {
  const csvRows = [headers.map(escapeCsv).join(",")];
  rows.forEach((row) => {
    csvRows.push(row.map(escapeCsv).join(","));
  });
  const content = csvRows.join("\r\n");
  downloadBlob(`${filename}.csv`, content, "text/csv;charset=utf-8;");
}

export function exportTableExcel(filename, headers, rows) {
  const htmlRows = [
    `<tr>${headers.map((header) => `<th>${sanitizeValue(header)}</th>`).join("")}</tr>`,
    ...rows.map(
      (row) => `<tr>${row.map((cell) => `<td>${sanitizeValue(cell)}</td>`).join("")}</tr>`,
    ),
  ];
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%;}th,td{border:1px solid #ddd;padding:8px;text-align:left;}th{background:#f8fafc;color:#475569;}</style></head><body><table>${htmlRows.join("")}</table></body></html>`;
  downloadBlob(`${filename}.xls`, html, "application/vnd.ms-excel;charset=utf-8;");
}

export function copyTableData(headers, rows) {
  const text = [headers.join("\t"), ...rows.map((row) => row.map(sanitizeValue).join("\t"))].join(
    "\n",
  );
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).catch(() => {
      window.prompt("Copy the table data", text);
    });
  } else {
    window.prompt("Copy the table data", text);
  }
}

export function printTable(title, headers, rows) {
  const tableRows = [
    `<tr>${headers.map((header) => `<th>${sanitizeValue(header)}</th>`).join("")}</tr>`,
    ...rows.map(
      (row) => `<tr>${row.map((cell) => `<td>${sanitizeValue(cell)}</td>`).join("")}</tr>`,
    ),
  ].join("");

  const printWindow = window.open("", "_blank");
  if (!printWindow) return;

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${sanitizeValue(title)}</title><style>body{font-family:Arial,Helvetica,sans-serif;color:#111;background:#fff;padding:24px;}h1{font-size:20px;margin-bottom:16px;}table{width:100%;border-collapse:collapse;margin-top:16px;}th,td{border:1px solid #ddd;padding:10px;text-align:left;}th{background:#f3f4f6;color:#111;text-transform:uppercase;font-size:12px;}td{font-size:12px;color:#111;}</style></head><body><h1>${sanitizeValue(title)}</h1><table>${tableRows}</table></body></html>`;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 300);
}
