import { useState, useRef, useCallback, useEffect } from "react";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { FormModal, SuccessModal } from "../../components/common/Modal";
import {
  parseEnrolmentFile,
  validateRows,
  importRows,
} from "../../pages/students/BulkEnrolmentService";
import { getAllStudents } from "../../pages/students/studentService";
import { getFamilies } from "../../pages/families/familyService";
import { getEnrollmentsByFilter } from "../../pages/students/enrollmentService";
import { getSettings } from "../../pages/settings/settingService";
import {
  HiDownload,
  HiUpload,
  HiCheckCircle,
  HiExclamationCircle,
  HiRefresh,
  HiDocumentText,
  HiInformationCircle,
  HiXCircle,
} from "react-icons/hi";

/**
 * Generates the Template using ExcelJS
 */
async function downloadTemplate() {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Students");

  const headers = [
    "First Name *",
    "Last Name *",
    "Other Name",
    "Date of Birth (YYYY-MM-DD)",
    "Gender *",
    "Admission No.",
    "Family Name *",
    "Parent/Guardian *",
    "Phone Number *",
    "Alt. Phone",
    "Email",
    "Address",
    "Class Name *",
    "Academic Year *",
    "Term *",
    "Religion",
    "State of Origin",
    "Blood Group",
    "Notes",
  ];

  // 1. Add visual instructions
  sheet.mergeCells("A1:S1");
  const instruction = sheet.getCell("A1");
  instruction.value =
    "FEESMAN BULK IMPORT TEMPLATE - Fill from row 5 onwards. Columns with * are required.";
  instruction.font = { bold: true, color: { argb: "FFFFFFFF" } };
  instruction.alignment = { horizontal: "center" };
  instruction.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };

  // 2. Set Headers
  const headerRow = sheet.getRow(4);
  headerRow.values = headers;
  headerRow.font = { bold: true };

  // 3. Set Example Row
  sheet.getRow(5).values = [
    "Chukwuemeka",
    "Okafor",
    "James",
    "2015-04-12",
    "Male",
    "ADM-001",
    "Okafor Family",
    "Mr. Emeka Okafor",
    "08012345678",
    "",
    "emeka@email.com",
    "Lagos",
    "Primary 3A",
    "2024/2025",
    "1st Term",
    "Christian",
    "Lagos",
    "O+",
    "Example Row",
  ];

  // 4. Formatting
  sheet.columns = headers.map((h) => ({ header: h, width: 20 }));

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  saveAs(blob, "feesman_bulk_enrolment_template.xlsx");
}

// ... StepIndicator Component remains the same as your original ...

function StepIndicator({ step }) {
  const steps = ["Upload file", "Review rows", "Import"];
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

/**
 * UploadStep Component - File upload with drag-and-drop support
 */
function UploadStep({ onFileParsed, classes, onDownload, existingData }) {
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
      const parsed = await parseEnrolmentFile(file);
      const validated = validateRows(parsed, classes, {
        existingStudents: existingData.students || [],
        existingFamilies: existingData.families || [],
        existingEnrollments: existingData.enrollments || [],
        schoolAbbr: existingData.settings?.abbr || "SCH",
        schoolState: existingData.settings?.state || "NG",
      });
      onFileParsed(validated, file.name);
    } catch (err) {
      setError(`Error reading file: ${err.message}`);
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
          <HiDocumentText style={{ display: "inline" }} />
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

/**
 * PreviewStep Component - Review rows before import
 */
function PreviewStep({ rows, fileName, onBack, onImport, importing, importProgress }) {
  const validRows = rows.filter((r) => r._valid);
  const errorRows = rows.filter((r) => !r._valid);
  const rowsWithWarnings = rows.filter((r) => r._valid && r._warnings?.length > 0);

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
          <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>
            {validRows.filter((r) => !r._warnings?.length).length}
          </div>
        </div>
        <div
          style={{
            padding: "1rem",
            borderRadius: "0.375rem",
            backgroundColor: "#fef3c7",
            borderLeft: "3px solid #f59e0b",
          }}
        >
          <div style={{ fontSize: 12, color: "#b45309" }}>⚠ Duplicates detected</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>
            {rowsWithWarnings.length}
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

      {/* Rows with Warnings */}
      {rowsWithWarnings.length > 0 && (
        <div
          style={{
            maxHeight: "250px",
            overflow: "auto",
            padding: "1rem",
            backgroundColor: "#fef3c7",
            borderRadius: "0.375rem",
            border: "1px solid #fcd34d",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              marginBottom: "0.75rem",
              color: "#b45309",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <HiInformationCircle /> Duplicate Records Found
          </p>
          {rowsWithWarnings.map((row, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "0.75rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid #fde68a",
              }}
            >
              <div
                style={{ fontSize: 11, fontWeight: 600, color: "#92400e", marginBottom: "0.25rem" }}
              >
                Row {row._rowIndex}: {row.firstName} {row.lastName}
              </div>
              {row._warnings?.map((w, widx) => (
                <div key={widx} style={{ fontSize: 11, color: "#b45309", marginLeft: "1rem" }}>
                  • {w}
                </div>
              ))}
            </div>
          ))}
          <div
            style={{ fontSize: 11, color: "#b45309", marginTop: "0.75rem", fontStyle: "italic" }}
          >
            💡 These rows will be processed but may skip enrollment if it already exists.
          </div>
        </div>
      )}

      {/* Rows with Errors */}
      {errorRows.length > 0 && (
        <div
          style={{
            maxHeight: "250px",
            overflow: "auto",
            padding: "1rem",
            backgroundColor: "#fef2f2",
            borderRadius: "0.375rem",
            border: "1px solid #fecaca",
          }}
        >
          <p
            style={{
              fontSize: 12,
              fontWeight: 500,
              marginBottom: "0.75rem",
              color: "#991b1b",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <HiXCircle /> Validation Errors
          </p>
          {errorRows.map((row, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: "0.75rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid #fee2e2",
              }}
            >
              <div
                style={{ fontSize: 11, fontWeight: 600, color: "#7f1d1d", marginBottom: "0.25rem" }}
              >
                Row {row._rowIndex}
              </div>
              {row._errors?.map((e, eidx) => (
                <div key={eidx} style={{ fontSize: 11, color: "#991b1b", marginLeft: "1rem" }}>
                  • {e}
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
          {importing ? "Importing..." : `Import ${validRows.length} Rows`}
        </button>
      </div>
    </div>
  );
}

export default function BulkEnrolmentModal({ classes, onClose, onComplete }) {
  const [step, setStep] = useState(1);
  const [rows, setRows] = useState([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [existingData, setExistingData] = useState({
    students: [],
    families: [],
    enrollments: [],
    settings: {},
  });
  const [loading, setLoading] = useState(true);

  // Load existing data on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [students, families, enrollments, settings] = await Promise.all([
          getAllStudents(),
          getFamilies(),
          getEnrollmentsByFilter({}),
          getSettings(),
        ]);
        setExistingData({
          students: students || [],
          families: families || [],
          enrollments: enrollments || [],
          settings: settings || {},
        });
      } catch (err) {
        console.error("Error loading existing data:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleFileParsed = (validatedRows, name) => {
    setRows(validatedRows);
    setFileName(name);
    setStep(2);
  };

  const handleImport = async () => {
    setImporting(true);
    try {
      const res = await importRows(rows, {
        onProgress: (p) => setImportProgress(p),
      });
      setResult(res);
      setStep(3);
    } catch (err) {
      setResult({
        imported: 0,
        skipped: 0,
        errors: [{ row: "System", error: err.message }],
        warnings: [],
      });
      setStep(3);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <FormModal title='Bulk Student Enrolment' onClose={onClose} maxWidth='720px'>
        <div style={{ textAlign: "center", padding: "2rem" }}>
          <p>Loading existing data...</p>
        </div>
      </FormModal>
    );
  }

  return (
    <>
      {step < 3 && (
        <FormModal title='Bulk Student Enrolment' onClose={onClose} maxWidth='720px'>
          <StepIndicator step={step} />
          {step === 1 && (
            <UploadStep
              onFileParsed={handleFileParsed}
              classes={classes}
              onDownload={downloadTemplate}
              existingData={existingData}
            />
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
          title={result.imported > 0 ? "Import Complete!" : "Import Finished"}
          message={`${result.imported} students imported. ${result.skipped} skipped.`}
          onClose={onComplete}
          onAction={onComplete}
          actionLabel='View Students'
        />
      )}
    </>
  );
}

// NOTE: Ensure your UploadStep component calls the 'onDownload' prop for the download button.
