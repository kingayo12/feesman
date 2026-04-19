import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useLocation } from "react-router-dom";
import {
  HiPrinter,
  HiDocumentText,
  HiPlus,
  HiOutlinePencil,
  HiTrash,
  HiSparkles,
  HiX,
  HiEye,
  HiDuplicate,
  HiOfficeBuilding,
  HiMail,
  HiPhone,
  HiLightningBolt,
  HiUsers,
  HiCheckCircle,
  HiDownload,
  HiChevronLeft,
  HiChevronRight,
  HiSearch,
  HiPhotograph,
  HiArchive,
} from "react-icons/hi";
import { getSettings } from "../settings/settingService";
import {
  exportLetterAsDocx,
  exportLetterAsImage,
  exportBulkAsZip,
} from "../../utils/letterExportUtils";
import { getAllStudents } from "../students/studentService";
import { getClasses } from "../classes/classService";
import { getFamilies } from "../families/familyService";
import { getFeesByClass } from "../fees/feesService";
import { getPaymentsByStudent } from "../fees/paymentService";
import { getStudentFeeOverrides } from "../students/studentFeeOverrideService";
import { getPreviousBalanceAmount } from "../previous_balance/Previousbalanceservice";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
/* ─────────────────────────────────────────────────────────────
   STORAGE & CONSTANTS
───────────────────────────────────────────────────────────── */
const STORAGE_KEY = "feesman_letter_templates_v2";

const DEFAULT_PLACEHOLDER_VALUES = {
  schoolName: "Your School Name",
  schoolAddress: "123 School Lane",
  recipientName: "Parent / Guardian",
  parentName: "Parent / Guardian",
  studentName: "Jane Doe",
  className: "Primary 3A",
  amountDue: "₦40,000",
  amountPaid: "₦0",
  balance: "₦40,000",
  dueDate: new Date().toLocaleDateString("en-GB"),
  eventName: "Annual Sports Day",
  eventDate: new Date(Date.now() + 86400000 * 14).toLocaleDateString("en-GB"),
  venue: "Main Hall",
  message: "Please find the details of your outstanding balance below.",
  senderName: "School Administrator",
  subject: "Important School Notice",
  openingLine: "We hope this letter finds you well.",
  closingLine: "Thank you for your continued support and cooperation.",
  rsvp: new Date(Date.now() + 86400000 * 7).toLocaleDateString("en-GB"),
  currentTerm: "1st Term",
  academicYear: `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`,
};

const DEFAULT_TEMPLATES = [
  {
    id: "fees_reminder",
    name: "Fees Reminder",
    category: "Finance",
    description: "Notify parents about outstanding school fees with the exact balance owed.",
    subject: "Outstanding School Fees — {{currentTerm}} {{academicYear}}",
    body: `Dear {{recipientName}},

We write to bring to your attention that the school fees for {{studentName}} ({{className}}) for {{currentTerm}} of the {{academicYear}} academic session remain outstanding.

Amount Due: {{amountDue}}
Amount Paid: {{amountPaid}}
Balance Owing: {{balance}}

Kindly ensure that the outstanding balance is cleared on or before {{dueDate}} to avoid any disruption to your child's academic activities.

If you have recently made payment, please disregard this notice and present your receipt to the bursar's office for reconciliation.

{{closingLine}}`,
  },
  {
    id: "event_invite",
    name: "Event Invitation",
    category: "Events",
    description: "Invite parents and students to a school event or celebration.",
    subject: "Invitation: {{eventName}}",
    body: `Dear {{recipientName}},

We are delighted to invite you to {{eventName}}, which will be held on {{eventDate}} at {{venue}}.

{{message}}

Kindly confirm your attendance on or before {{rsvp}} by contacting the school office.

We look forward to your presence at this special occasion.

{{closingLine}}`,
  },
  {
    id: "general_notice",
    name: "General Notice",
    category: "General",
    description: "A flexible template for announcements, notices, or personalized correspondence.",
    subject: "Important Notice — {{schoolName}}",
    body: `Dear {{recipientName}},

{{openingLine}}

{{message}}

{{closingLine}}`,
  },
  {
    id: "partial_payment",
    name: "Partial Payment Acknowledgement",
    category: "Finance",
    description: "Acknowledge a partial payment and remind about the outstanding balance.",
    subject: "Payment Received — Balance Outstanding",
    body: `Dear {{recipientName}},

We acknowledge receipt of your recent payment of {{amountPaid}} towards the school fees for {{studentName}} ({{className}}).

However, a balance of {{balance}} remains outstanding for {{currentTerm}}.

Please endeavour to clear the remaining balance by {{dueDate}}.

Thank you for your prompt attention to this matter.

{{closingLine}}`,
  },
];

const CATEGORY_META = {
  Finance: { bg: "#fef9c3", text: "#92400e", border: "#fde68a", dot: "#d97706" },
  Events: { bg: "#dbeafe", text: "#1e3a8a", border: "#bfdbfe", dot: "#2563eb" },
  General: { bg: "#d1fae5", text: "#065f46", border: "#6ee7b7", dot: "#059669" },
  Admin: { bg: "#ede9fe", text: "#4c1d95", border: "#c4b5fd", dot: "#7c3aed" },
};
const defaultCat = { bg: "#f3f4f6", text: "#374151", border: "#d1d5db", dot: "#6b7280" };
const getCatMeta = (cat) => CATEGORY_META[cat] ?? defaultCat;

/* ─────────────────────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────────────────────── */
const loadTemplates = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_TEMPLATES));
      return DEFAULT_TEMPLATES;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_TEMPLATES;
  } catch {
    return DEFAULT_TEMPLATES;
  }
};
const saveTemplates = (t) => localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
const newTemplate = () => ({
  id: `tpl_${Date.now()}`,
  name: "New Template",
  category: "General",
  description: "Describe this template.",
  subject: "Letter Subject",
  body: "Dear {{recipientName}},\n\n{{message}}\n\n{{closingLine}}",
});
const extractTokens = (text) =>
  Array.from(
    new Set(
      (text.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) || []).map((t) => t.replace(/{{\s*|\s*}}/g, "")),
    ),
  );
const fmtToken = (t) => t.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
const fill = (template, values) =>
  template.replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (_m, k) => values[k] ?? DEFAULT_PLACEHOLDER_VALUES[k] ?? `{{${k}}}`,
  );
const naira = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;
const toParagraphs = (text) =>
  text.split(/\r?\n/).map((line, i) =>
    !line.trim() ? (
      <br key={i} />
    ) : (
      <p key={i} className='lp-para'>
        {line}
      </p>
    ),
  );

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
export default function LetterTemplates() {
  const location = useLocation();

  const [settings, setSettings] = useState({});
  const [templates, setTemplates] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [manualValues, setManualValues] = useState({});
  const [draft, setDraft] = useState(null);
  const [modal, setModal] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [exportBusy, setExportBusy] = useState(false);
  const { can } = useRole();

  // Ref to the rendered live-preview letter sheet (for image export)
  const sheetRef = useRef(null);

  // Bulk state
  const [allStudents, setAllStudents] = useState([]);
  const [allClasses, setAllClasses] = useState([]);
  const [allFamilies, setAllFamilies] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkFilter, setBulkFilter] = useState("unpaid");
  const [bulkSearch, setBulkSearch] = useState("");
  const [bulkStudents, setBulkStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [bulkGenerated, setBulkGenerated] = useState([]);
  const [bulkLetterIdx, setBulkLetterIdx] = useState(0);

  /* Bootstrap */
  useEffect(() => {
    setTemplates(loadTemplates());
    getSettings().then((s) => {
      if (s) setSettings(s);
    });
    getAllStudents().then((s) => setAllStudents(s || []));
    getClasses().then((c) => setAllClasses(c || []));
    getFamilies().then((f) => setAllFamilies(f || []));
  }, []);

  useEffect(() => {
    if (!templates.length) return;
    if (!selectedId || !templates.some((t) => t.id === selectedId)) setSelectedId(templates[0].id);
  }, [templates]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tplId = params.get("template");
    if (tplId && templates.some((t) => t.id === tplId)) setSelectedId(tplId);
  }, [location.search, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedId) ?? templates[0],
    [templates, selectedId],
  );
  const tokens = useMemo(
    () =>
      selectedTemplate
        ? extractTokens(`${selectedTemplate.subject}\n${selectedTemplate.body}`)
        : [],
    [selectedTemplate],
  );

  const schoolDefaults = useMemo(
    () => ({
      schoolName: settings.name || settings.schoolName,
      schoolAddress: [settings.address, settings.city, settings.state].filter(Boolean).join(", "),
      schoolPhone: settings.contactPhone || settings.schoolPhone,
      schoolEmail: settings.contactEmail || settings.schoolEmail,
      schoolMotto: settings.motto || settings.schoolMotto,
      senderName:
        settings.adminName || settings.contactName || DEFAULT_PLACEHOLDER_VALUES.senderName,
      currentTerm: settings.currentTerm || DEFAULT_PLACEHOLDER_VALUES.currentTerm,
      academicYear: settings.academicYear || DEFAULT_PLACEHOLDER_VALUES.academicYear,
      logoDataUrl: settings.logo || settings.schoolLogo || settings.logoUrl,
    }),
    [settings],
  );

  const liveValues = useMemo(() => {
    const saved = manualValues[selectedTemplate?.id] ?? {};
    return tokens.reduce(
      (acc, tok) => ({
        ...acc,
        [tok]: saved[tok] ?? schoolDefaults[tok] ?? DEFAULT_PLACEHOLDER_VALUES[tok] ?? "",
      }),
      {},
    );
  }, [selectedTemplate, tokens, manualValues, schoolDefaults]);

  /* School branding — use schoolDefaults which already merges settings + SCHOOL_DEFAULTS fallbacks */
  const schoolName = schoolDefaults.schoolName;
  const schoolAddress = schoolDefaults.schoolAddress;
  const schoolPhone = schoolDefaults.schoolPhone;
  const schoolEmail = schoolDefaults.schoolEmail;
  const schoolMotto = schoolDefaults.schoolMotto;
  const logoUrl = schoolDefaults.logoDataUrl;
  const watermarkUrl = schoolDefaults.watermarkDataUrl;
  const today = new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // schoolMeta passed to docx exporter
  const schoolMeta = useMemo(
    () => ({
      schoolName,
      schoolAddress,
      schoolPhone,
      schoolEmail,
      schoolMotto,
    }),
    [schoolName, schoolAddress, schoolPhone, schoolEmail, schoolMotto],
  );

  /* Handlers */
  const updateValue = (tok, val) =>
    setManualValues((p) => ({
      ...p,
      [selectedTemplate.id]: { ...(p[selectedTemplate.id] ?? {}), [tok]: val },
    }));
  const openPreview = (id) => {
    setSelectedId(id);
    setModal("preview");
  };
  const openEdit = (tpl) => {
    setDraft({ ...tpl });
    setSelectedId(tpl.id);
    setModal("edit");
  };
  const openNew = () => {
    const t = newTemplate();
    setDraft(t);
    setSelectedId(t.id);
    setModal("edit");
  };
  const closeModal = () => {
    setModal(null);
    setDraft(null);
    setDeleteTarget(null);
  };
  const handleSave = () => {
    if (!draft) return;
    const next = templates.some((t) => t.id === draft.id)
      ? templates.map((t) => (t.id === draft.id ? draft : t))
      : [draft, ...templates];
    setTemplates(next);
    saveTemplates(next);
    setSelectedId(draft.id);
    closeModal();
  };
  const confirmDelete = (id) => {
    setDeleteTarget(id);
    setModal("delete");
  };
  const handleDelete = () => {
    if (!deleteTarget) return;
    const next = templates.filter((t) => t.id !== deleteTarget);
    setTemplates(next);
    saveTemplates(next);
    if (selectedId === deleteTarget && next.length) setSelectedId(next[0].id);
    closeModal();
  };
  const handleDuplicate = (tpl) => {
    const copy = { ...tpl, id: `tpl_${Date.now()}`, name: `${tpl.name} (Copy)` };
    const next = [...templates, copy];
    setTemplates(next);
    saveTemplates(next);
  };

  /* Export single letter as .docx */
  const handleExportDocx = async (values = liveValues, tpl = selectedTemplate) => {
    if (!tpl) return;
    setExportBusy(true);
    try {
      await exportLetterAsDocx(values, tpl, schoolMeta);
    } catch (e) {
      console.error("Export docx failed", e);
      alert("Export failed. Please try again.");
    } finally {
      setExportBusy(false);
    }
  };

  /* Export single letter as .png image */
  const handleExportImage = async () => {
    const el = sheetRef.current;
    if (!el) return;
    setExportBusy(true);
    try {
      await exportLetterAsImage(el);
    } catch (e) {
      console.error("Export image failed", e);
      alert("Image export failed. Please try again.");
    } finally {
      setExportBusy(false);
    }
  };

  /* Export bulk letters as .zip of .docx */
  const handleExportBulkZip = async () => {
    if (!bulkGenerated.length || !selectedTemplate) return;
    setExportBusy(true);
    try {
      await exportBulkAsZip(bulkGenerated, selectedTemplate, schoolMeta);
    } catch (e) {
      console.error("Bulk ZIP export failed", e);
      alert("ZIP export failed. Please try again.");
    } finally {
      setExportBusy(false);
    }
  };

  /* Print — isolate the letter sheet in a new window for clean printing */
  const handlePrint = (sheetEl) => {
    const node = sheetEl ?? sheetRef.current ?? document.querySelector(".lp-sheet");
    if (!node) {
      window.print();
      return;
    }
    const html = node.outerHTML;
    const win = window.open("", "_blank", "width=900,height=700");
    if (!win) {
      window.print();
      return;
    }
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Letter</title>
<style>
  @page { size: A4; margin: 15mm 20mm 20mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Georgia, "Times New Roman", serif; color: #1f2937; background: #fff; }
  .lp-sheet { max-width: 100%; padding: 0; box-shadow: none; border: none; border-radius: 0; }
  /* Letterhead */
  .lp-letterhead { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 8px; }
  .lp-letterhead-logo { flex-shrink: 0; }
  .lp-logo { width: 80px; height: 80px; object-fit: contain; }
  .lp-logo-ph { width: 80px; height: 80px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 1.5rem; }
  .lp-letterhead-info { flex: 1; text-align: center; }
  .lp-school-name { font-size: 18pt; font-weight: 900; color: #1a3799; font-family: Arial, sans-serif; text-transform: uppercase; letter-spacing: .02em; margin: 0 0 4px; }
  .lp-school-addr { font-size: 8pt; color: #111; font-family: Arial, sans-serif; text-transform: uppercase; margin: 0 0 3px; }
  .lp-school-contacts { font-size: 8pt; color: #111; font-family: Arial, sans-serif; margin: 0 0 3px; }
  .lp-sep { margin: 0 4px; }
  .lp-school-motto { font-size: 4px; font-weight: 500; marging-top: 5px; font-family: Arial, sans-serif; margin: 0; }
  /* Rule */
  .lp-rule { border: none; border-top: 2px solid #1a3799; margin: 8px 0 12px; }
  /* Date */
  .lp-date-row { text-align: right; margin-bottom: 12px; }
  .lp-date-chip { font-size: 9pt; color: #374151; font-family: Arial, sans-serif; }
  /* Address */
  .lp-addr-block { margin-bottom: 16px; font-family: Arial, sans-serif; }
  .lp-to-line, .lp-re-line { margin: 0 0 4px; font-size: 10pt; color: #111; }
  .lp-re-line { font-weight: 700; }
  /* Body + watermark */
  .lp-body-wrap { position: relative; min-height: 200px; margin-bottom: 20px; }
  .lp-watermark-wrap { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .lp-watermark { width: 320px; height: 320px; object-fit: contain; opacity: .10; }
  .lp-body { position: relative; font-size: 10pt; }
  .lp-para { margin: 0 0 10px; line-height: 1.85; color: #1f2937; }
  /* Signature */
  .lp-sig-block { margin-top: 20px; font-family: Arial, sans-serif; }
  .lp-closing { margin: 0 0 50px; font-size: 10pt; font-family: Georgia, serif; }
  .lp-sig-line { width: 180px; border-bottom: 1px solid #374151; margin-bottom: 5px; }
  .lp-sig-name { font-weight: 700; font-size: 10pt; margin: 0 0 2px; }
  .lp-sig-role { font-size: 8pt; color: #64748b; margin: 0; }
  svg { display: none !important; }
</style>
</head><body>${html}</body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => {
      win.print();
      win.close();
    }, 400);
  };

  /* Bulk generation */
  const loadBulkStudents = useCallback(async () => {
    if (!settings.academicYear || !settings.currentTerm) return;
    setBulkLoading(true);
    try {
      const enriched = await Promise.all(
        allStudents.map(async (student) => {
          const classObj = allClasses.find((c) => c.id === student.classId);
          const family = allFamilies.find((f) => f.id === student.familyId);
          try {
            const [fees, payments, overrides, prevBal] = await Promise.all([
              getFeesByClass(student.classId, settings.academicYear, settings.currentTerm),
              getPaymentsByStudent(student.id),
              getStudentFeeOverrides(student.id),
              getPreviousBalanceAmount(student.id, settings.academicYear),
            ]);
            const disabledIds = new Set(overrides.map((o) => o.feeId));
            const termFees = fees.filter((f) => !disabledIds.has(f.id));
            const totalDue =
              termFees.reduce((s, f) => s + Number(f.amount || 0), 0) + Number(prevBal || 0);
            const termPaid = payments
              .filter((p) => p.term === settings.currentTerm)
              .reduce((s, p) => s + Number(p.amount || 0), 0);
            const balance = totalDue - termPaid;
            return {
              ...student,
              className: classObj?.name || "Not Assigned",
              familyName: family?.familyName || "",
              parentName: family?.headName || student.parentName || "Parent/Guardian",
              totalDue,
              termPaid,
              balance,
              payStatus: balance <= 0 ? "paid" : termPaid > 0 ? "partial" : "unpaid",
            };
          } catch {
            return {
              ...student,
              className: classObj?.name || "—",
              familyName: family?.familyName || "",
              parentName: "Parent/Guardian",
              totalDue: 0,
              termPaid: 0,
              balance: 0,
              payStatus: "unknown",
            };
          }
        }),
      );
      setBulkStudents(enriched);
    } finally {
      setBulkLoading(false);
    }
  }, [allStudents, allClasses, allFamilies, settings]);

  const openBulk = () => {
    setModal("bulk");
    setBulkSearch("");
    setSelectedStudents(new Set());
    setBulkGenerated([]);
    if (!bulkStudents.length) loadBulkStudents();
  };

  const filteredBulk = useMemo(() => {
    let list = bulkStudents;
    if (bulkFilter === "unpaid") list = list.filter((s) => s.payStatus === "unpaid");
    if (bulkFilter === "partial")
      list = list.filter((s) => ["partial", "unpaid"].includes(s.payStatus));
    if (bulkSearch) {
      const q = bulkSearch.toLowerCase();
      list = list.filter((s) =>
        `${s.firstName} ${s.lastName} ${s.className} ${s.familyName}`.toLowerCase().includes(q),
      );
    }
    return list;
  }, [bulkStudents, bulkFilter, bulkSearch]);

  const toggleStudent = (id) =>
    setSelectedStudents((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  const selectAll = () => setSelectedStudents(new Set(filteredBulk.map((s) => s.id)));
  const clearAll = () => setSelectedStudents(new Set());

  const generateBulk = () => {
    const targets = filteredBulk.filter((s) => selectedStudents.has(s.id));
    const generated = targets.map((student) => ({
      student,
      values: {
        ...schoolDefaults,
        recipientName: student.parentName || "Parent/Guardian",
        parentName: student.parentName || "Parent/Guardian",
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.className,
        amountDue: naira(student.totalDue),
        amountPaid: naira(student.termPaid),
        balance: naira(student.balance),
        dueDate: new Date(Date.now() + 86400000 * 14).toLocaleDateString("en-GB"),
        ...DEFAULT_PLACEHOLDER_VALUES,
        // re-apply real values so they override defaults
        schoolName: schoolDefaults.schoolName,
        schoolAddress: schoolDefaults.schoolAddress,
        senderName: schoolDefaults.senderName,
        currentTerm: schoolDefaults.currentTerm,
        academicYear: schoolDefaults.academicYear,
        recipientName: student.parentName || "Parent/Guardian",
        studentName: `${student.firstName} ${student.lastName}`,
        className: student.className,
        amountDue: naira(student.totalDue),
        amountPaid: naira(student.termPaid),
        balance: naira(student.balance),
      },
    }));
    setBulkGenerated(generated);
    setBulkLetterIdx(0);
    setModal("bulkView");
  };

  /* Letter sheet renderer — matches Golden Light official letterhead */
  const renderSheet = (values = liveValues, tpl = selectedTemplate) => {
    if (!tpl) return null;
    const subject = fill(tpl.subject ?? "", values);
    const body = fill(tpl.body ?? "", values);
    const recipient = values.recipientName || DEFAULT_PLACEHOLDER_VALUES.recipientName;
    const sender = values.senderName || DEFAULT_PLACEHOLDER_VALUES.senderName;
    return (
      <div className='lp-sheet'>
        {/* ── Letterhead: logo left, school info centred ── */}
        <div className='lp-letterhead'>
          <div className='lp-letterhead-logo'>
            {logoUrl ? (
              <img src={logoUrl} alt='School crest' className='lp-logo' />
            ) : (
              <div className='lp-logo-ph'>
                <HiOfficeBuilding />
              </div>
            )}
          </div>
          <div className='lp-letterhead-info'>
            <h1 className='lp-school-name'>{schoolName}</h1>
            <p className='lp-school-addr'>{schoolAddress}</p>
            <p className='lp-school-contacts'>
              {schoolPhone && <span>TEL: {schoolPhone}</span>}
              {schoolPhone && schoolEmail && <span className='lp-sep'> | </span>}
              {schoolEmail && <span>EMAIL: {schoolEmail}</span>}
            </p>
            {schoolMotto && <p className='lp-school-motto'>MOTTO: {schoolMotto}</p>}
          </div>
        </div>

        {/* ── Divider rule ── */}
        <div className='lp-rule' />

        {/* ── Date right-aligned ── */}
        <div className='lp-date-row'>
          <span className='lp-date-chip'>{today}</span>
        </div>

        {/* ── To / Re ── */}
        <div className='lp-addr-block'>
          <p className='lp-to-line'>
            <b>To:</b> {recipient}
          </p>
          <p className='lp-re-line'>
            <b>Re:</b> {subject}
          </p>
        </div>

        {/* ── Body with watermark behind ── */}
        <div className='lp-body-wrap'>
          {watermarkUrl && (
            <div className='lp-watermark-wrap'>
              <img src={watermarkUrl} alt='' className='lp-watermark' aria-hidden='true' />
            </div>
          )}
          <div className='lp-body'>{toParagraphs(body)}</div>
        </div>

        {/* ── Signature ── */}
        <div className='lp-sig-block'>
          <p className='lp-closing'>Yours faithfully,</p>
          <div className='lp-sig-line' />
          <p className='lp-sig-name'>{sender}</p>
          <p className='lp-sig-role'>{schoolName}</p>
        </div>
      </div>
    );
  };

  /* ── JSX ── */
  return (
    <div className='lp-page'>
      {/* Header */}
      <div className='lp-page-header'>
        <div>
          <span className='lp-badge'>Letters</span>
          <h1 className='lp-h1'>Letter Templates</h1>
          <p className='lp-lead'>
            Manage reusable school letters. Use <code>{"{{studentName}}"}</code>,{" "}
            <code>{"{{balance}}"}</code>, <code>{"{{amountDue}}"}</code> as dynamic placeholders.
          </p>
        </div>
        <div className='lp-header-btns'>
          <button className='lp-btn lp-btn-ghost' onClick={() => handlePrint()}>
            <HiPrinter /> Print
          </button>
          <div className='lp-export-group'>
            <button
              className='lp-btn lp-btn-ghost'
              disabled={exportBusy}
              onClick={() => handleExportDocx()}
            >
              {exportBusy ? <span className='lp-spinner-inline' /> : <HiDocumentText />} Word
              (.docx)
            </button>
            <button
              className='lp-btn lp-btn-ghost'
              disabled={exportBusy}
              onClick={handleExportImage}
            >
              {exportBusy ? <span className='lp-spinner-inline' /> : <HiPhotograph />} Image (.png)
            </button>
          </div>
          <button className='lp-btn lp-btn-teal' onClick={openBulk}>
            <HiLightningBolt /> Auto-Generate Letters
          </button>
          {can(PERMISSIONS.MANAGE_LETERS) && (
            <button className='lp-btn lp-btn-primary' onClick={openNew}>
              <HiPlus /> New Template
            </button>
          )}
        </div>
      </div>

      {/* Main layout */}
      <div className='lp-layout'>
        {/* Sidebar */}
        <aside className='lp-sidebar'>
          <div className='lp-sidebar-top'>
            <span className='lp-sidebar-label'>
              Templates <span className='lp-cnt'>{templates.length}</span>
            </span>
            {can(PERMISSIONS.MANAGE_LETERS) && (
              <button className='lp-new-mini' onClick={openNew} title='New template'>
                <HiPlus />
              </button>
            )}
          </div>
          <div className='lp-tpl-list'>
            {templates.map((t) => {
              const cat = getCatMeta(t.category);
              return (
                <div
                  key={t.id}
                  className={`lp-tpl-item ${selectedId === t.id ? "active" : ""}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className='lp-tpl-row1'>
                    <span className='lp-tpl-dot' style={{ background: cat.dot }} />
                    <span className='lp-tpl-name'>{t.name}</span>
                    <span
                      className='lp-cat-chip'
                      style={{
                        background: cat.bg,
                        color: cat.text,
                        border: `1px solid ${cat.border}`,
                      }}
                    >
                      {t.category}
                    </span>
                  </div>
                  <p className='lp-tpl-desc'>{t.description}</p>
                  <div className='lp-tpl-btns'>
                    <button
                      className='lp-ib'
                      title='Preview'
                      onClick={(e) => {
                        e.stopPropagation();
                        openPreview(t.id);
                      }}
                    >
                      <HiEye />
                    </button>
                    {can(PERMISSIONS.MANAGE_LETERS) && (
                      <button
                        className='lp-ib'
                        title='Edit'
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(t);
                        }}
                      >
                        <HiOutlinePencil />
                      </button>
                    )}
                    {can(PERMISSIONS.MANAGE_LETERS) && (
                      <button
                        className='lp-ib'
                        title='Duplicate'
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDuplicate(t);
                        }}
                      >
                        <HiDuplicate />
                      </button>
                    )}
                    {can(PERMISSIONS.MANAGE_LETERS) && (
                      <button
                        className='lp-ib lp-ib--del'
                        title='Delete'
                        onClick={(e) => {
                          e.stopPropagation();
                          confirmDelete(t.id);
                        }}
                      >
                        <HiTrash />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </aside>

        {/* Content */}
        <div className='lp-content'>
          <div className='lp-content-top'>
            <div>
              <h3 className='lp-content-title'>{selectedTemplate?.name ?? "Select a template"}</h3>
              <p className='lp-content-sub'>Adjust the fields below to preview a filled letter.</p>
            </div>
            {selectedTemplate && (
              <div className='lp-content-actions'>
                {can(PERMISSIONS.MANAGE_LETERS) && (
                  <button
                    className='lp-btn lp-btn-ghost lp-btn-sm'
                    onClick={() => openEdit(selectedTemplate)}
                  >
                    <HiOutlinePencil /> Edit
                  </button>
                )}
                <button
                  className='lp-btn lp-btn-primary lp-btn-sm'
                  onClick={() => openPreview(selectedId)}
                >
                  <HiEye /> Full Preview
                </button>
              </div>
            )}
          </div>
          {tokens.length > 0 && (
            <div className='lp-fields-strip'>
              <p className='lp-fields-label'>Placeholder values</p>
              <div className='lp-fields-grid'>
                {tokens.map((tok) => (
                  <div className='lp-field' key={tok}>
                    <label>{fmtToken(tok)}</label>
                    <input
                      value={liveValues[tok] ?? ""}
                      placeholder={DEFAULT_PLACEHOLDER_VALUES[tok] ?? tok}
                      onChange={(e) => updateValue(tok, e.target.value)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className='lp-live-preview'>
            <div className='lp-live-label'>
              <HiDocumentText /> Live Preview
            </div>
            <div ref={sheetRef}>{renderSheet()}</div>
          </div>
        </div>
      </div>

      {/* Hint */}
      <div className='lp-hint'>
        <HiSparkles />
        <span>
          Tip: Click <strong>Auto-Generate Letters</strong> to instantly create personalised letters
          for all students with outstanding fees — no manual filling needed.
        </span>
      </div>

      {/* ══ MODALS ══ */}

      {/* Preview */}
      {modal === "preview" && selectedTemplate && (
        <div className='lp-overlay' onClick={closeModal}>
          <div className='lp-modal lp-modal-preview' onClick={(e) => e.stopPropagation()}>
            <div className='lp-modal-hdr'>
              <div>
                <h3>Preview — {selectedTemplate.name}</h3>
                <p>Adjust values on the left to see changes live.</p>
              </div>
              <div className='lp-modal-hdr-btns'>
                <button
                  className='lp-btn lp-btn-ghost lp-btn-sm'
                  disabled={exportBusy}
                  onClick={() => handleExportDocx()}
                >
                  <HiDocumentText /> Word
                </button>
                <button
                  className='lp-btn lp-btn-ghost lp-btn-sm'
                  disabled={exportBusy}
                  onClick={handleExportImage}
                >
                  <HiPhotograph /> Image
                </button>
                <button className='lp-btn lp-btn-ghost lp-btn-sm' onClick={() => handlePrint()}>
                  <HiPrinter /> Print
                </button>
                <button className='lp-icon-close' onClick={closeModal}>
                  <HiX />
                </button>
              </div>
            </div>
            <div className='lp-preview-body'>
              <div className='lp-preview-fields'>
                <p className='lp-fields-label' style={{ marginBottom: "0.75rem" }}>
                  Adjust values
                </p>
                {tokens.map((tok) => (
                  <div className='lp-field lp-field-sm' key={tok}>
                    <label>{fmtToken(tok)}</label>
                    <input
                      value={liveValues[tok] ?? ""}
                      placeholder={DEFAULT_PLACEHOLDER_VALUES[tok] ?? tok}
                      onChange={(e) => updateValue(tok, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <div className='lp-preview-doc'>{renderSheet()}</div>
            </div>
          </div>
        </div>
      )}

      {/* Edit */}
      {modal === "edit" && draft && (
        <div className='lp-overlay' onClick={closeModal}>
          <div className='lp-modal lp-modal-edit' onClick={(e) => e.stopPropagation()}>
            <div className='lp-modal-hdr'>
              <div>
                <h3>
                  {templates.some((t) => t.id === draft.id)
                    ? `Edit — ${draft.name}`
                    : "New Template"}
                </h3>
                <p>Click any token chip below to insert it at the cursor position in the body.</p>
              </div>
              <button className='lp-icon-close' onClick={closeModal}>
                <HiX />
              </button>
            </div>
            <div className='lp-edit-body'>
              <div className='lp-edit-row2'>
                <div className='lp-field'>
                  <label>Template Name</label>
                  <input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                  />
                </div>
                <div className='lp-field'>
                  <label>Category</label>
                  <select
                    value={draft.category}
                    onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                  >
                    {["Finance", "Events", "General", "Admin"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className='lp-field'>
                <label>Description</label>
                <input
                  value={draft.description}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                />
              </div>
              <div className='lp-field'>
                <label>Subject Line</label>
                <input
                  value={draft.subject}
                  onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
                  placeholder='e.g. Outstanding Fees — {{currentTerm}}'
                />
              </div>
              <div className='lp-field'>
                <label>Letter Body</label>
                <textarea
                  id='lp-body-ta'
                  rows={14}
                  value={draft.body}
                  onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                  placeholder='Write your letter here. Use {{tokens}} for dynamic content.'
                />
              </div>
              <div className='lp-token-ref'>
                <p className='lp-token-ref-title'>Click to insert placeholder</p>
                <div className='lp-token-chips'>
                  {Object.keys(DEFAULT_PLACEHOLDER_VALUES).map((tok) => (
                    <code
                      key={tok}
                      className='lp-chip'
                      onClick={() => {
                        const ta = document.getElementById("lp-body-ta");
                        if (ta) {
                          const pos = ta.selectionStart ?? draft.body.length;
                          const val =
                            draft.body.slice(0, pos) + `{{${tok}}}` + draft.body.slice(pos);
                          setDraft((d) => ({ ...d, body: val }));
                          setTimeout(() => {
                            ta.focus();
                            ta.setSelectionRange(pos + tok.length + 4, pos + tok.length + 4);
                          }, 0);
                        } else {
                          setDraft((d) => ({ ...d, body: d.body + `{{${tok}}}` }));
                        }
                      }}
                    >{`{{${tok}}}`}</code>
                  ))}
                </div>
              </div>
              <div className='lp-edit-footer'>
                <button className='lp-btn lp-btn-ghost' onClick={closeModal}>
                  Cancel
                </button>
                <button className='lp-btn lp-btn-primary' onClick={handleSave}>
                  Save Template
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {modal === "delete" && (
        <div className='lp-overlay' onClick={closeModal}>
          <div className='lp-confirm-box' onClick={(e) => e.stopPropagation()}>
            <div className='lp-confirm-icon-wrap'>
              <HiTrash />
            </div>
            <h4>Delete this template?</h4>
            <p>
              "<strong>{templates.find((t) => t.id === deleteTarget)?.name}</strong>" will be
              permanently removed. This cannot be undone.
            </p>
            <div className='lp-confirm-btns'>
              <button className='lp-btn lp-btn-ghost' onClick={closeModal}>
                Keep it
              </button>
              <button className='lp-btn lp-btn-danger' onClick={handleDelete}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk picker */}
      {modal === "bulk" && (
        <div className='lp-overlay' onClick={closeModal}>
          <div className='lp-modal lp-modal-bulk' onClick={(e) => e.stopPropagation()}>
            <div className='lp-modal-hdr'>
              <div>
                <h3>
                  <HiLightningBolt style={{ verticalAlign: "middle", marginRight: 6 }} />
                  Auto-Generate Letters
                </h3>
                <p>
                  Select students to generate personalised letters from the{" "}
                  <strong>{selectedTemplate?.name}</strong> template.
                </p>
              </div>
              <button className='lp-icon-close' onClick={closeModal}>
                <HiX />
              </button>
            </div>

            <div className='lp-bulk-filters'>
              <div className='lp-bulk-filter-tabs'>
                {[
                  {
                    key: "unpaid",
                    label: "Not Paid",
                    emoji: "🔴",
                    count: bulkStudents.filter((s) => s.payStatus === "unpaid").length,
                  },
                  {
                    key: "partial",
                    label: "Partial / Unpaid",
                    emoji: "🟡",
                    count: bulkStudents.filter((s) => ["partial", "unpaid"].includes(s.payStatus))
                      .length,
                  },
                  { key: "all", label: "All Students", emoji: "👥", count: bulkStudents.length },
                ].map((f) => (
                  <button
                    key={f.key}
                    className={`lp-ftab ${bulkFilter === f.key ? "active" : ""}`}
                    onClick={() => setBulkFilter(f.key)}
                  >
                    {f.emoji} {f.label} <span className='lp-ftab-cnt'>{f.count}</span>
                  </button>
                ))}
              </div>
              <div className='lp-bulk-search'>
                <HiSearch className='lp-search-ic' />
                <input
                  placeholder='Search student, class, family…'
                  value={bulkSearch}
                  onChange={(e) => setBulkSearch(e.target.value)}
                />
              </div>
            </div>

            <div className='lp-bulk-sel-bar'>
              <span className='lp-sel-info'>
                {selectedStudents.size > 0
                  ? `${selectedStudents.size} selected`
                  : `${filteredBulk.length} shown`}
              </span>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button className='lp-btn lp-btn-ghost lp-btn-xs' onClick={selectAll}>
                  Select all ({filteredBulk.length})
                </button>
                {selectedStudents.size > 0 && (
                  <button className='lp-btn lp-btn-ghost lp-btn-xs' onClick={clearAll}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className='lp-bulk-list'>
              {bulkLoading ? (
                <div className='lp-bulk-loading'>
                  <div className='lp-spinner' />
                  <p>Loading student balances…</p>
                </div>
              ) : filteredBulk.length === 0 ? (
                <div className='lp-bulk-empty'>
                  <HiCheckCircle
                    style={{ fontSize: "2rem", color: "#10b981", marginBottom: ".5rem" }}
                  />
                  <p>No students match this filter.</p>
                </div>
              ) : (
                filteredBulk.map((s) => {
                  const checked = selectedStudents.has(s.id);
                  return (
                    <label key={s.id} className={`lp-srow ${checked ? "checked" : ""}`}>
                      <input
                        type='checkbox'
                        checked={checked}
                        onChange={() => toggleStudent(s.id)}
                        className='lp-srow-check'
                      />
                      <div className='lp-srow-info'>
                        <span className='lp-srow-name'>
                          {s.firstName} {s.lastName}
                        </span>
                        <span className='lp-srow-meta'>
                          {s.className} · {s.familyName || "No family"}
                        </span>
                      </div>
                      <div className='lp-srow-fin'>
                        <span className='lp-srow-bal'>{naira(s.balance)} owing</span>
                        <span className={`lp-srow-status ${s.payStatus}`}>
                          {s.payStatus === "paid"
                            ? "Paid"
                            : s.payStatus === "partial"
                              ? "Partial"
                              : "Not Paid"}
                        </span>
                      </div>
                    </label>
                  );
                })
              )}
            </div>

            <div className='lp-bulk-footer'>
              <div className='lp-bulk-tpl-sel'>
                <label>Template:</label>
                <select value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: ".5rem" }}>
                <button className='lp-btn lp-btn-ghost' onClick={closeModal}>
                  Cancel
                </button>
                <button
                  className='lp-btn lp-btn-teal'
                  disabled={selectedStudents.size === 0}
                  onClick={generateBulk}
                >
                  <HiLightningBolt /> Generate{" "}
                  {selectedStudents.size > 0 ? selectedStudents.size + " " : ""}Letter
                  {selectedStudents.size !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk view */}
      {modal === "bulkView" &&
        bulkGenerated.length > 0 &&
        (() => {
          const cur = bulkGenerated[bulkLetterIdx];
          return (
            <div className='lp-overlay' onClick={closeModal}>
              <div className='lp-modal lp-modal-bulkview' onClick={(e) => e.stopPropagation()}>
                <div className='lp-modal-hdr'>
                  <div>
                    <h3>
                      Generated Letters <span className='lp-cnt'>{bulkGenerated.length}</span>
                    </h3>
                    <p>
                      Browse with arrows or click a name chip. Print or export each letter
                      individually.
                    </p>
                  </div>
                  <div className='lp-modal-hdr-btns'>
                    <button
                      className='lp-btn lp-btn-ghost lp-btn-sm'
                      disabled={exportBusy}
                      onClick={() => handleExportDocx(cur.values)}
                    >
                      <HiDocumentText /> Word
                    </button>
                    <button
                      className='lp-btn lp-btn-ghost lp-btn-sm'
                      disabled={exportBusy}
                      onClick={() => handlePrint()}
                    >
                      <HiPrinter /> Print
                    </button>
                    <button
                      className='lp-btn lp-btn-teal lp-btn-sm'
                      disabled={exportBusy}
                      onClick={handleExportBulkZip}
                    >
                      {exportBusy ? <span className='lp-spinner-inline' /> : <HiArchive />}
                      {exportBusy ? "Preparing…" : `Download all (${bulkGenerated.length}) as ZIP`}
                    </button>
                    <button className='lp-icon-close' onClick={closeModal}>
                      <HiX />
                    </button>
                  </div>
                </div>

                <div className='lp-bulk-nav'>
                  <div className='lp-bulk-chips'>
                    {bulkGenerated.map((g, i) => (
                      <button
                        key={g.student.id}
                        className={`lp-student-chip ${i === bulkLetterIdx ? "active" : ""}`}
                        onClick={() => setBulkLetterIdx(i)}
                      >
                        {g.student.firstName} {g.student.lastName[0]}.
                      </button>
                    ))}
                  </div>
                  <div className='lp-bulk-nav-btns'>
                    <button
                      className='lp-nav-btn'
                      disabled={bulkLetterIdx === 0}
                      onClick={() => setBulkLetterIdx((i) => i - 1)}
                    >
                      <HiChevronLeft />
                    </button>
                    <span className='lp-nav-counter'>
                      {bulkLetterIdx + 1} / {bulkGenerated.length}
                    </span>
                    <button
                      className='lp-nav-btn'
                      disabled={bulkLetterIdx === bulkGenerated.length - 1}
                      onClick={() => setBulkLetterIdx((i) => i + 1)}
                    >
                      <HiChevronRight />
                    </button>
                  </div>
                </div>

                <div className='lp-bulkview-doc'>{renderSheet(cur.values)}</div>

                <div className='lp-bulkview-footer'>
                  <div className='lp-bulkview-student-info'>
                    <HiUsers className='lp-bvfi' />
                    <span>
                      <b>
                        {cur.student.firstName} {cur.student.lastName}
                      </b>{" "}
                      · {cur.student.className}
                    </span>
                    <span className={`lp-srow-status ${cur.student.payStatus}`}>
                      {naira(cur.student.balance)} owing
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                    <button
                      className='lp-btn lp-btn-ghost lp-btn-sm'
                      disabled={exportBusy}
                      onClick={() => handleExportDocx(cur.values)}
                    >
                      <HiDocumentText /> This letter
                    </button>
                    <button
                      className='lp-btn lp-btn-ghost lp-btn-sm'
                      disabled={bulkLetterIdx === 0}
                      onClick={() => setBulkLetterIdx((i) => i - 1)}
                    >
                      <HiChevronLeft /> Prev
                    </button>
                    <button
                      className='lp-btn lp-btn-primary lp-btn-sm'
                      disabled={bulkLetterIdx === bulkGenerated.length - 1}
                      onClick={() => setBulkLetterIdx((i) => i + 1)}
                    >
                      Next <HiChevronRight />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
