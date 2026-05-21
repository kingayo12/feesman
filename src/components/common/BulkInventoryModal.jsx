import { useEffect, useRef, useState } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useAuth } from "../../context/AuthContext";
import { FormModal, SuccessModal } from "./Modal";
import {
  parseInventoryFile,
  validateRows,
  importRows,
  loadExistingItems,
} from "../../services/inventory/BulkInventoryService";
import {
  HiCloudUpload,
  HiDownload,
  HiDocumentText,
  HiExclamationCircle,
  HiCheckCircle,
  HiInformationCircle,
  HiXCircle,
} from "react-icons/hi";

function StepIndicator({ step }) {
  const steps = ["Upload file", "Review items", "Import"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: "1.5rem" }}>
      {steps.map((label, i) => {
        const idx = i + 1;
        const done = step > idx;
        const active = step === idx;
        return (
          <div
            key={label}
            style={{
              display: "flex",
              alignItems: "center",
              flex: i < steps.length - 1 ? 1 : "none",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  background: done ? "#16a34a" : active ? "#4f46e5" : "#f3f4f6",
                  color: done || active ? "#fff" : "#6b7280",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                  fontWeight: 700,
                }}
              >
                {done ? <HiCheckCircle /> : idx}
              </div>
              <span style={{ fontSize: 11, color: active ? "#4f46e5" : "#6b7280" }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div
                style={{
                  flex: 1,
                  height: 2,
                  background: done ? "#16a34a" : "#e5e7eb",
                  margin: "0 8px",
                  marginBottom: 18,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

async function downloadTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Inventory Items");

  const headers = ["Name *", "Description", "Category *", "Unit *", "Price *", "Stock"];

  sheet.mergeCells("A1:F1");
  const instruction = sheet.getCell("A1");
  instruction.value =
    "FEESMAN INVENTORY BULK UPLOAD TEMPLATE - Fill from row 5 onwards. Required fields are marked with *.";
  instruction.font = { bold: true, color: { argb: "FFFFFFFF" } };
  instruction.alignment = { horizontal: "center" };
  instruction.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };

  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.font = { bold: true };

  sheet.getRow(5).values = [
    "Uniform Shirt",
    "White school shirt for junior students",
    "Uniform",
    "piece",
    "1500",
    "25",
  ];

  sheet.columns = headers.map((h) => ({ header: h, width: 22 }));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, "feesman_bulk_inventory_template.xlsx");
}

function UploadStep({ onFileParsed, onDownload }) {
  const fileInputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file) => {
    setError("");
    if (!file) return;
    if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      setError("Please upload an Excel file (.xlsx or .xls)");
      return;
    }

    try {
      setUploading(true);
      const rows = await parseInventoryFile(file);
      onFileParsed(rows, file.name);
    } catch (err) {
      setError(`Error reading file: ${err.message || String(err)}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    const files = e.dataTransfer?.files;
    if (files?.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleChange = (e) => {
    if (e.target.files?.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          border: dragActive ? "2px dashed #4f46e5" : "2px dashed #d1d5db",
          borderRadius: "0.5rem",
          padding: "2rem",
          textAlign: "center",
          cursor: "pointer",
          backgroundColor: dragActive ? "#eef2ff" : "#f9fafb",
          transition: "all 0.2s ease",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: "0.5rem" }}>
          <HiCloudUpload style={{ display: "inline" }} />
        </div>
        <p style={{ fontWeight: 500, marginBottom: "0.25rem" }}>
          Drag and drop your Excel file here or click to select
        </p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
          Supported formats: .xlsx, .xls (max 10,000 rows)
        </p>
        <input
          ref={fileInputRef}
          type='file'
          accept='.xlsx,.xls'
          onChange={handleChange}
          style={{ display: "none" }}
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div style={{ textAlign: "center", color: "var(--text-secondary)" }}>Loading file...</div>
      )}

      {error && (
        <div
          style={{
            padding: "0.75rem 1rem",
            borderRadius: "0.375rem",
            backgroundColor: "#fee2e2",
            color: "#991b1b",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
          }}
        >
          <HiExclamationCircle />
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem" }}>
        <button
          onClick={onDownload}
          style={{
            flex: 1,
            padding: "0.75rem 1rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            backgroundColor: "#fff",
            color: "var(--text-primary)",
            fontWeight: 500,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.5rem",
          }}
        >
          <HiDownload /> Download Template
        </button>
      </div>
    </div>
  );
}

function PreviewStep({ rows, fileName, onBack, onImport, importing, importProgress }) {
  const validRows = rows.filter((r) => r._valid);
  const errorRows = rows.filter((r) => !r._valid && r._errors?.length);
  const skippedRows = rows.filter((r) => !r._valid && !r._errors?.length);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>
        File: <strong>{fileName}</strong>
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
        <div
          style={{
            padding: "1rem",
            borderRadius: "0.375rem",
            backgroundColor: "#f0fdf4",
            borderLeft: "3px solid #22c55e",
          }}
        >
          <div style={{ fontSize: 12, color: "#16a34a" }}>✓ Ready to import</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{validRows.length}</div>
        </div>
        <div
          style={{
            padding: "1rem",
            borderRadius: "0.375rem",
            backgroundColor: "#fef3c7",
            borderLeft: "3px solid #f59e0b",
          }}
        >
          <div style={{ fontSize: 12, color: "#b45309" }}>⚠ Skipped / warnings</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>
            {skippedRows.length}
          </div>
        </div>
        <div
          style={{
            padding: "1rem",
            borderRadius: "0.375rem",
            backgroundColor: "#fef2f2",
            borderLeft: "3px solid #ef4444",
          }}
        >
          <div style={{ fontSize: 12, color: "#991b1b" }}>✗ Errors</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444" }}>{errorRows.length}</div>
        </div>
      </div>

      {importing && (
        <div style={{ padding: "1rem", backgroundColor: "#f0f9ff", borderRadius: "0.375rem" }}>
          <p style={{ fontSize: 12, marginBottom: "0.5rem" }}>
            Importing... ({importProgress.current} of {importProgress.total})
          </p>
          <div
            style={{
              width: "100%",
              height: 8,
              backgroundColor: "#e0e7ff",
              borderRadius: "999px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${importProgress.total ? (importProgress.current / importProgress.total) * 100 : 0}%`,
                backgroundColor: "#4f46e5",
                transition: "width 0.2s ease",
              }}
            />
          </div>
        </div>
      )}

      <div style={{ overflowX: "auto", border: "1px solid var(--border-muted)", borderRadius: 12 }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {["Row", "Name", "Category", "Unit", "Price", "Stock", "Status"].map((label) => (
                <th
                  key={label}
                  style={{
                    textAlign: "left",
                    padding: "0.75rem 0.75rem",
                    fontSize: 12,
                    color: "var(--text-secondary)",
                    borderBottom: "1px solid var(--border-muted)",
                  }}
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row._rowIndex}>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-muted)" }}>
                  {row._rowIndex}
                </td>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-muted)" }}>
                  {row.name || "—"}
                </td>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-muted)" }}>
                  {row.category || "—"}
                </td>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-muted)" }}>
                  {row.unit || "—"}
                </td>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-muted)" }}>
                  {row.price !== "" ? `₦${Number(row.price).toLocaleString()}` : "—"}
                </td>
                <td style={{ padding: "0.75rem", borderBottom: "1px solid var(--border-muted)" }}>
                  {row.stock === "" ? "Unlimited" : row.stock}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    borderBottom: "1px solid var(--border-muted)",
                    color:
                      row._status === "Error"
                        ? "#991b1b"
                        : row._status === "Skipped"
                          ? "#b45309"
                          : "#166534",
                    fontWeight: 600,
                  }}
                >
                  {row._status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {errorRows.length > 0 && (
        <div style={{ padding: "1rem", backgroundColor: "#fef2f2", borderRadius: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "0.75rem",
              color: "#991b1b",
            }}
          >
            <HiXCircle /> Validation Errors
          </div>
          {errorRows.map((row) => (
            <div key={row._rowIndex} style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Row {row._rowIndex}</div>
              {row._errors.map((error, idx) => (
                <div key={idx} style={{ fontSize: 12, marginLeft: "1rem" }}>
                  • {error}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {skippedRows.length > 0 && (
        <div style={{ padding: "1rem", backgroundColor: "#fef3c7", borderRadius: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: "0.75rem",
              color: "#92400e",
            }}
          >
            <HiInformationCircle /> Skipped rows
          </div>
          {skippedRows.map((row) => (
            <div key={row._rowIndex} style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontWeight: 600, marginBottom: "0.35rem" }}>Row {row._rowIndex}</div>
              {row._warnings.map((warning, idx) => (
                <div key={idx} style={{ fontSize: 12, marginLeft: "1rem" }}>
                  • {warning}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
        <button
          onClick={onBack}
          disabled={importing}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.375rem",
            border: "1px solid #d1d5db",
            backgroundColor: "#fff",
            color: "var(--text-primary)",
            fontWeight: 500,
            cursor: importing ? "not-allowed" : "pointer",
            opacity: importing ? 0.5 : 1,
          }}
        >
          Back
        </button>
        <button
          onClick={onImport}
          disabled={importing || validRows.length === 0}
          style={{
            padding: "0.5rem 1.25rem",
            borderRadius: "0.375rem",
            border: "none",
            backgroundColor: validRows.length > 0 ? "#4f46e5" : "#d1d5db",
            color: "#fff",
            fontWeight: 500,
            cursor: validRows.length > 0 && !importing ? "pointer" : "not-allowed",
          }}
        >
          {importing
            ? "Importing..."
            : `Import ${validRows.length} item${validRows.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}

export default function BulkInventoryModal({ onClose, onComplete }) {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [existingItems, setExistingItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadItems() {
      try {
        const inventory = await loadExistingItems();
        setExistingItems(inventory || []);
      } catch (err) {
        console.error("Error loading existing inventory:", err);
      } finally {
        setLoading(false);
      }
    }
    loadItems();
  }, []);

  const handleFileParsed = (parsedRows, name) => {
    const validated = validateRows(parsedRows, existingItems);
    setRows(validated);
    setFileName(name);
    setStep(2);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await importRows(rows, user?.uid, {
        onProgress: (progress) => setImportProgress(progress),
      });
      setResult(res);
      setStep(3);
    } catch (err) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [{ row: "System", error: err.message || String(err) }],
        warnings: [],
      });
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <FormModal title='Bulk Inventory Upload' onClose={onClose} maxWidth='760px'>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading inventory data…</p>
        </div>
      </FormModal>
    );
  }

  return (
    <>
      {step < 3 && (
        <FormModal title='Bulk Inventory Upload' onClose={onClose} maxWidth='760px'>
          <StepIndicator step={step} />
          {step === 1 && (
            <UploadStep onFileParsed={handleFileParsed} onDownload={downloadTemplate} />
          )}
          {step === 2 && (
            <PreviewStep
              rows={rows}
              fileName={fileName}
              onBack={() => setStep(1)}
              onImport={handleImport}
              importing={importing}
              importProgress={importProgress}
            />
          )}
        </FormModal>
      )}

      {step === 3 && result && (
        <SuccessModal
          title={result.imported > 0 ? "Inventory upload complete" : "Inventory import finished"}
          message={`${result.imported} item${result.imported !== 1 ? "s" : ""} imported. ${result.skipped} skipped.`}
          onClose={onComplete}
          onAction={onComplete}
          actionLabel='View Inventory'
        />
      )}
    </>
  );
}
