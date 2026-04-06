import { useEffect, useState, useCallback } from "react";
import { getSettings, updateSettings } from "./settingService";
import { useAuth } from "../../context/AuthContext";
import { collection, getDocs, deleteDoc, writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { getAllStudents } from "../students/studentService";
import { getFamilies } from "../families/familyService";
import { getClasses } from "../classes/classService";
import {
  HiOfficeBuilding,
  HiCalendar,
  HiMail,
  HiPhone,
  HiSave,
  HiIdentification,
  HiClock,
  HiUser,
  HiColorSwatch,
  HiBell,
  HiShieldCheck,
  HiDatabase,
  HiGlobe,
  HiLocationMarker,
  HiPhotograph,
  HiCheckCircle,
  HiExclamationCircle,
  HiEye,
  HiEyeOff,
  HiDownload,
  HiTrash,
  HiRefresh,
  HiLockClosed,
  HiAcademicCap,
  HiChartBar,
  HiInformationCircle,
  HiStar,
  HiUserGroup,
  HiCurrencyDollar,
  HiDocumentText,
} from "react-icons/hi";

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────── */
const TABS = [
  { id: "school", label: "School Profile", icon: HiOfficeBuilding },
  { id: "academic", label: "Academic", icon: HiCalendar },
  { id: "appearance", label: "Appearance", icon: HiColorSwatch },
  { id: "notifications", label: "Notifications", icon: HiBell },
  { id: "security", label: "Security", icon: HiShieldCheck },
  { id: "data", label: "Data & Export", icon: HiDatabase },
];

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const CURRENCIES = ["NGN (₦)", "USD ($)", "GBP (£)", "GHS (₵)", "KES (Ksh)"];
const TIMEZONES = [
  "Africa/Lagos",
  "Africa/Accra",
  "Africa/Nairobi",
  "Europe/London",
  "America/New_York",
];
const THEMES = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
  { id: "system", label: "System" },
];
const ACCENT_COLORS = [
  { id: "indigo", label: "Indigo", hex: "#4F46E5" },
  { id: "blue", label: "Blue", hex: "#2563EB" },
  { id: "teal", label: "Teal", hex: "#0D9488" },
  { id: "green", label: "Green", hex: "#16A34A" },
  { id: "amber", label: "Amber", hex: "#D97706" },
  { id: "red", label: "Red", hex: "#DC2626" },
  { id: "pink", label: "Pink", hex: "#DB2777" },
  { id: "purple", label: "Purple", hex: "#9333EA" },
];

const COLLECTIONS_TO_WIPE = [
  "students",
  "fees",
  "payments",
  "classes",
  "previousBalances",
  "previous_balance",
  "discounts",
  "discountAssignments",
  "studentFeeOverrides",
];

const DEFAULT_SETTINGS = {
  // School Profile
  name: "",
  abbr: "",
  state: "",
  tagline: "",
  motto: "",
  address: "",
  website: "",
  contactEmail: "",
  contactPhone: "",
  timezone: "Africa/Lagos",
  currency: "NGN (₦)",
  logo: "",
  // Academic
  academicYear: "",
  currentTerm: "",
  termStartDate: "",
  termEndDate: "",
  nextTermStart: "",
  allowPartialPayment: true,
  lateFeeEnabled: false,
  lateFeeAmount: "",
  // Appearance
  theme: "light",
  accentColor: "indigo",
  sidebarCompact: false,
  // Notifications
  emailNotifications: true,
  paymentAlerts: true,
  overdueReminders: true,
  reminderDaysBefore: 3,
  weeklyReport: false,
  // Security
  requirePin: false,
  sessionTimeout: "30",
  autoLogout: true,
  pin: "",
};

/* ─────────────────────────────────────────────────────────────
   THEME / ACCENT HELPERS
───────────────────────────────────────────────────────────── */
function applyTheme(theme) {
  const resolved =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  document.documentElement.setAttribute("data-theme", resolved);
  try {
    localStorage.setItem("theme", resolved);
  } catch {}
}

function applyAccentColor(accentId) {
  const color = ACCENT_COLORS.find((c) => c.id === accentId);
  if (!color) return;
  // Inject or update a <style> tag for the accent variable
  const styleId = "feesman-accent-style";
  let el = document.getElementById(styleId);
  if (!el) {
    el = document.createElement("style");
    el.id = styleId;
    document.head.appendChild(el);
  }
  el.textContent = `:root { --primary-color: ${color.hex}; --accent: ${color.hex}; }`;
  try {
    localStorage.setItem("accentColor", accentId);
  } catch {}
}

/* ─────────────────────────────────────────────────────────────
   CSV / JSON EXPORT UTILITIES
───────────────────────────────────────────────────────────── */
function downloadCSV(rows, filename) {
  const csvContent = rows
    .map((r) =>
      r
        .map((cell) => {
          const s = String(cell ?? "").replace(/"/g, '""');
          return s.includes(",") || s.includes('"') || s.includes("\n") ? `"${s}"` : s;
        })
        .join(","),
    )
    .join("\n");
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, filename);
}

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  triggerDownload(blob, filename);
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/* ─────────────────────────────────────────────────────────────
   SESSION GENERATOR
───────────────────────────────────────────────────────────── */
function generateSessions() {
  const out = [];
  const start = new Date().getFullYear() - 3;
  for (let y = start; y <= 2035; y++) out.push(`${y}/${y + 1}`);
  return out;
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */
export default function SettingsPage() {
  const { user, sendPasswordReset } = useAuth?.() ?? {};

  const [activeTab, setActiveTab] = useState("school");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  // Security
  const [showPin, setShowPin] = useState(false);

  // Data & Export
  const [exporting, setExporting] = useState({}); // { key: true }
  const [wipeStep, setWipeStep] = useState("idle");
  const [wipeProgress, setWipeProgress] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearingOverrides, setClearingOverrides] = useState(false);

  /* ── Load settings ── */
  useEffect(() => {
    (async () => {
      const data = await getSettings();
      if (data) {
        setSettings((prev) => ({ ...prev, ...data }));
        // Apply saved theme & accent immediately
        if (data.theme) applyTheme(data.theme);
        if (data.accentColor) applyAccentColor(data.accentColor);
      }
      setLoading(false);
    })();
  }, []);

  const showToast = useCallback((type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3800);
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      // Apply appearance changes immediately on save
      applyTheme(settings.theme);
      applyAccentColor(settings.accentColor);
      showToast("success", "Settings saved successfully.");
    } catch {
      showToast("error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ── Live preview for theme & accent ── */
  const handleThemeChange = (themeId) => {
    setSettings((prev) => ({ ...prev, theme: themeId }));
    applyTheme(themeId); // apply immediately for live preview
  };

  const handleAccentChange = (accentId) => {
    setSettings((prev) => ({ ...prev, accentColor: accentId }));
    applyAccentColor(accentId); // apply immediately for live preview
  };

  /* ════════════════════════════════════════════════════════════
     EXPORT FUNCTIONS — real implementations
  ════════════════════════════════════════════════════════════ */

  const exportStudents = async () => {
    setExporting((p) => ({ ...p, students: true }));
    try {
      const students = await getAllStudents();
      const rows = [
        [
          "ID",
          "First Name",
          "Last Name",
          "Admission No",
          "Class ID",
          "Family ID",
          "Session",
          "Status",
        ],
        ...students.map((s) => [
          s.id,
          s.firstName,
          s.lastName,
          s.admissionNo || "",
          s.classId || "",
          s.familyId || "",
          s.session || "",
          s.status || "active",
        ]),
      ];
      downloadCSV(rows, `students_${todayStr()}.csv`);
      showToast("success", `Exported ${students.length} students.`);
    } catch (err) {
      showToast("error", "Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExporting((p) => ({ ...p, students: false }));
    }
  };

  const exportFamilies = async () => {
    setExporting((p) => ({ ...p, families: true }));
    try {
      const families = await getFamilies();
      const rows = [
        ["ID", "Family Name", "Phone", "Email", "Address"],
        ...families.map((f) => [f.id, f.familyName, f.phone || "", f.email || "", f.address || ""]),
      ];
      downloadCSV(rows, `families_${todayStr()}.csv`);
      showToast("success", `Exported ${families.length} families.`);
    } catch (err) {
      showToast("error", "Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExporting((p) => ({ ...p, families: false }));
    }
  };

  const exportPayments = async () => {
    setExporting((p) => ({ ...p, payments: true }));
    try {
      const snap = await getDocs(collection(db, "payments"));
      const payments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const rows = [
        ["ID", "Student ID", "Family ID", "Amount", "Method", "Term", "Session", "Date"],
        ...payments.map((p) => [
          p.id,
          p.studentId || "",
          p.familyId || "",
          p.amount || 0,
          p.method || "",
          p.term || "",
          p.session || "",
          p.date?.toDate ? p.date.toDate().toISOString().slice(0, 10) : p.date || "",
        ]),
      ];
      downloadCSV(rows, `payments_${todayStr()}.csv`);
      showToast("success", `Exported ${payments.length} payment records.`);
    } catch (err) {
      showToast("error", "Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExporting((p) => ({ ...p, payments: false }));
    }
  };

  const exportClasses = async () => {
    setExporting((p) => ({ ...p, classes: true }));
    try {
      const classes = await getClasses();
      const rows = [
        ["ID", "Name", "Section", "Session"],
        ...classes.map((c) => [c.id, c.name, c.section || "", c.session || ""]),
      ];
      downloadCSV(rows, `classes_${todayStr()}.csv`);
      showToast("success", `Exported ${classes.length} classes.`);
    } catch (err) {
      showToast("error", "Export failed: " + (err.message || "Unknown error"));
    } finally {
      setExporting((p) => ({ ...p, classes: false }));
    }
  };

  const exportFullBackup = async () => {
    setExporting((p) => ({ ...p, backup: true }));
    try {
      const [students, families, classes] = await Promise.all([
        getAllStudents(),
        getFamilies(),
        getClasses(),
      ]);
      const paySnap = await getDocs(collection(db, "payments"));
      const feeSnap = await getDocs(collection(db, "fees"));
      const backup = {
        exportedAt: new Date().toISOString(),
        school: settings,
        counts: {
          students: students.length,
          families: families.length,
          classes: classes.length,
          payments: paySnap.size,
          fees: feeSnap.size,
        },
        data: {
          students,
          families,
          classes,
          payments: paySnap.docs.map((d) => ({ id: d.id, ...d.data() })),
          fees: feeSnap.docs.map((d) => ({ id: d.id, ...d.data() })),
        },
      };
      downloadJSON(backup, `full_backup_${todayStr()}.json`);
      showToast("success", "Full backup downloaded.");
    } catch (err) {
      showToast("error", "Backup failed: " + (err.message || "Unknown error"));
    } finally {
      setExporting((p) => ({ ...p, backup: false }));
    }
  };

  /* ── Clear fee overrides ── */
  const clearFeeOverrides = async () => {
    setClearingOverrides(true);
    try {
      const snap = await getDocs(collection(db, "studentFeeOverrides"));
      if (snap.empty) {
        showToast("success", "No overrides to clear.");
        return;
      }
      const batch = writeBatch(db);
      snap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
      showToast("success", `Cleared ${snap.size} fee override${snap.size !== 1 ? "s" : ""}.`);
    } catch (err) {
      showToast("error", "Failed to clear overrides: " + (err.message || "Unknown"));
    } finally {
      setClearingOverrides(false);
      setConfirmClear(false);
    }
  };

  /* ── Wipe all data ── */
  const clearAllData = async () => {
    setWipeStep("wiping");
    try {
      for (const col of COLLECTIONS_TO_WIPE) {
        setWipeProgress(`Clearing ${col}…`);
        const snap = await getDocs(collection(db, col));
        if (snap.empty) continue;
        for (let i = 0; i < snap.docs.length; i += 499) {
          const batch = writeBatch(db);
          snap.docs.slice(i, i + 499).forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
      setWipeStep("done");
      setWipeProgress("");
      showToast("success", "All data cleared. Families preserved.");
    } catch (err) {
      setWipeStep("idle");
      setWipeProgress("");
      showToast("error", "Failed to clear data: " + (err.message || "Unknown"));
    }
  };

  /* ── Password reset ── */
  const handlePasswordReset = async () => {
    if (!user?.email) {
      showToast("error", "No email address found.");
      return;
    }
    try {
      if (sendPasswordReset) {
        await sendPasswordReset(user.email);
      } else {
        // Fallback: use Firebase Auth directly
        const { getAuth, sendPasswordResetEmail } = await import("firebase/auth");
        await sendPasswordResetEmail(getAuth(), user.email);
      }
      showToast("success", `Password reset email sent to ${user.email}`);
    } catch (err) {
      showToast("error", "Failed to send reset email: " + (err.message || "Unknown"));
    }
  };

  /* ─────────────────────────────────────────────────────────────
     COMPUTED VALUES
  ───────────────────────────────────────────────────────────── */
  const termEndPassed = (() => {
    if (!settings.termEndDate) return false;
    return new Date(settings.termEndDate) < new Date();
  })();

  const isThirdTermEnded = settings.currentTerm === "3rd Term" && termEndPassed;

  const termStatusColor = !settings.termEndDate
    ? "#6b7280"
    : termEndPassed
      ? "#dc2626"
      : (() => {
          const daysLeft = Math.ceil((new Date(settings.termEndDate) - new Date()) / 86400000);
          return daysLeft <= 7 ? "#d97706" : "#16a34a";
        })();

  /* ─────────────────────────────────────────────────────────────
     LOADING STATE
  ───────────────────────────────────────────────────────────── */
  if (loading)
    return (
      <div className='sp-loading'>
        <div className='sp-spinner' />
        <p>Loading settings…</p>
      </div>
    );

  /* ─────────────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────────────── */
  return (
    <div className='settings-page'>
      {/* ── Toast ── */}
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === "success" ? <HiCheckCircle /> : <HiExclamationCircle />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ── */}
      <div className='settings-header'>
        <div>
          <h1>Settings</h1>
          <p>Manage your school configuration, appearance, and data</p>
        </div>
        <button className='sp-save-btn' onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <div className='sp-btn-spinner' /> Saving…
            </>
          ) : (
            <>
              <HiSave /> Save Changes
            </>
          )}
        </button>
      </div>

      <div className='settings-layout'>
        {/* ── Sidebar ── */}
        <nav className='settings-nav'>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={`settings-nav-item ${activeTab === id ? "active" : ""}`}
              onClick={() => setActiveTab(id)}
            >
              <Icon />
              <span>{label}</span>
            </button>
          ))}

          {/* Academic status mini-card */}
          {settings.academicYear && (
            <div className='sp-nav-status'>
              <div className='sp-nav-status-row'>
                <span>Session</span>
                <strong>{settings.academicYear}</strong>
              </div>
              <div className='sp-nav-status-row'>
                <span>Term</span>
                <strong
                  style={{ color: settings.currentTerm === "3rd Term" ? "#d97706" : "#16a34a" }}
                >
                  {settings.currentTerm || "—"}
                </strong>
              </div>
              {isThirdTermEnded && (
                <div className='sp-nav-promote-note'>
                  <HiStar /> 3rd term ended — students can be promoted
                </div>
              )}
            </div>
          )}
        </nav>

        {/* ── Content ── */}
        <div className='settings-content'>
          {/* ══════════════════════════════════════════
               SCHOOL PROFILE
          ══════════════════════════════════════════ */}
          {activeTab === "school" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>School Profile</h2>
                <p>This information appears on receipts, letters, and reports across the system.</p>
              </div>

              {/* Logo */}
              <div className='logo-upload-area'>
                <div className='logo-preview'>
                  {settings.logo ? (
                    <img src={settings.logo} alt='School logo' />
                  ) : (
                    <HiOfficeBuilding className='logo-placeholder-icon' />
                  )}
                </div>
                <div className='logo-upload-info'>
                  <p className='logo-label'>School Logo</p>
                  <p className='logo-hint'>
                    Used on letters, receipts, and the letterhead. PNG or JPEG, min 200×200px
                    recommended.
                  </p>
                  <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                    <label className='upload-btn'>
                      <HiPhotograph /> Upload Logo
                      <input
                        type='file'
                        accept='image/*'
                        style={{ display: "none" }}
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) =>
                            setSettings((prev) => ({ ...prev, logo: ev.target.result }));
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {settings.logo && (
                      <button
                        className='sp-clear-logo-btn'
                        onClick={() => setSettings((prev) => ({ ...prev, logo: "" }))}
                      >
                        <HiTrash /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className='form-grid settings-grid'>
                <div className='input-group full-width'>
                  <label>
                    School Name <span className='sp-required'>*</span>
                  </label>
                  <div className='input-wrapper'>
                    <HiOfficeBuilding className='input-icon' />
                    <input
                      name='name'
                      value={settings.name}
                      onChange={handleChange}
                      placeholder='e.g. Excellence International School'
                    />
                  </div>
                </div>

                <div className='input-group'>
                  <label>Abbreviation</label>
                  <div className='input-wrapper'>
                    <HiIdentification className='input-icon' />
                    <input
                      name='abbr'
                      value={settings.abbr || ""}
                      onChange={handleChange}
                      placeholder='e.g. EIS'
                      maxLength={6}
                      style={{ textTransform: "uppercase" }}
                      onInput={(e) => {
                        e.target.value = e.target.value.toUpperCase();
                      }}
                    />
                  </div>
                  <small className='hint'>
                    Used in auto-generating admission numbers (max 6 chars)
                  </small>
                </div>

                <div className='input-group'>
                  <label>State</label>
                  <div className='input-wrapper'>
                    <HiLocationMarker className='input-icon' />
                    <input
                      name='state'
                      value={settings.state || ""}
                      onChange={handleChange}
                      placeholder='e.g. Ogun, Lagos'
                      maxLength={12}
                    />
                  </div>
                  <small className='hint'>First 2–3 letters used in admission number prefix</small>
                </div>

                <div className='input-group full-width'>
                  <label>Address</label>
                  <div className='input-wrapper'>
                    <HiLocationMarker className='input-icon' />
                    <input
                      name='address'
                      value={settings.address || ""}
                      onChange={handleChange}
                      placeholder='Street, City, State'
                    />
                  </div>
                </div>

                <div className='input-group full-width'>
                  <label>
                    Tagline / Description <span className='optional'>(optional)</span>
                  </label>
                  <div className='input-wrapper'>
                    <input
                      name='tagline'
                      value={settings.tagline || ""}
                      onChange={handleChange}
                      placeholder='e.g. Excellence in Education'
                    />
                  </div>
                </div>

                <div className='input-group full-width'>
                  <label>
                    School Motto <span className='optional'>(optional)</span>
                  </label>
                  <div className='input-wrapper'>
                    <HiStar className='input-icon' style={{ color: "#f59e0b" }} />
                    <input
                      name='motto'
                      value={settings.motto || ""}
                      onChange={handleChange}
                      placeholder='e.g. Province of Knowledge'
                    />
                  </div>
                  <small className='hint'>
                    Printed on official letters and the document letterhead
                  </small>
                </div>

                <div className='input-group'>
                  <label>Official Email</label>
                  <div className='input-wrapper'>
                    <HiMail className='input-icon' />
                    <input
                      type='email'
                      name='contactEmail'
                      value={settings.contactEmail}
                      onChange={handleChange}
                      placeholder='admin@school.com'
                    />
                  </div>
                </div>

                <div className='input-group'>
                  <label>Phone Number</label>
                  <div className='input-wrapper'>
                    <HiPhone className='input-icon' />
                    <input
                      name='contactPhone'
                      value={settings.contactPhone}
                      onChange={handleChange}
                      placeholder='+234 800 000 0000'
                    />
                  </div>
                </div>

                <div className='input-group'>
                  <label>
                    Website <span className='optional'>(optional)</span>
                  </label>
                  <div className='input-wrapper'>
                    <HiGlobe className='input-icon' />
                    <input
                      name='website'
                      value={settings.website || ""}
                      onChange={handleChange}
                      placeholder='https://www.school.com'
                    />
                  </div>
                </div>

                <div className='input-group'>
                  <label>Currency</label>
                  <div className='input-wrapper'>
                    <HiCurrencyDollar className='input-icon' />
                    <select
                      name='currency'
                      value={settings.currency || "NGN (₦)"}
                      onChange={handleChange}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className='input-group'>
                  <label>Timezone</label>
                  <div className='input-wrapper'>
                    <HiClock className='input-icon' />
                    <select
                      name='timezone'
                      value={settings.timezone || "Africa/Lagos"}
                      onChange={handleChange}
                    >
                      {TIMEZONES.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Live preview of letterhead */}
              {(settings.name || settings.logo) && (
                <div className='sp-letterhead-preview'>
                  <p className='sp-preview-label'>Letterhead preview</p>
                  <div className='sp-letter-mock'>
                    <div className='sp-letter-mock-head'>
                      {settings.logo ? (
                        <img src={settings.logo} className='sp-mock-logo' alt='logo' />
                      ) : (
                        <div className='sp-mock-logo-ph'>
                          <HiOfficeBuilding />
                        </div>
                      )}
                      <div className='sp-mock-info'>
                        <strong>{settings.name || "School Name"}</strong>
                        {settings.address && <span>{settings.address}</span>}
                        {(settings.contactPhone || settings.contactEmail) && (
                          <span>
                            {settings.contactPhone && `Tel: ${settings.contactPhone}`}
                            {settings.contactPhone && settings.contactEmail && " · "}
                            {settings.contactEmail && `Email: ${settings.contactEmail}`}
                          </span>
                        )}
                        {settings.motto && (
                          <span className='sp-mock-motto'>Motto: {settings.motto}</span>
                        )}
                      </div>
                    </div>
                    <div className='sp-mock-rule' />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════
               ACADEMIC
          ══════════════════════════════════════════ */}
          {activeTab === "academic" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Academic Settings</h2>
                <p>
                  Current session and term drive all fee calculations, payment records, and student
                  promotion across the system.
                </p>
              </div>

              {/* Status card */}
              <div className='academic-status-card'>
                <div className='academic-status-item'>
                  <span className='status-label'>Current Session</span>
                  <span className='status-value'>{settings.academicYear || "—"}</span>
                </div>
                <div className='academic-status-divider' />
                <div className='academic-status-item'>
                  <span className='status-label'>Current Term</span>
                  <span className='status-value highlight'>{settings.currentTerm || "—"}</span>
                </div>
                <div className='academic-status-divider' />
                <div className='academic-status-item'>
                  <span className='status-label'>Term End</span>
                  <span className='status-value' style={{ color: termStatusColor }}>
                    {settings.termEndDate
                      ? new Date(settings.termEndDate).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "Not set"}
                  </span>
                </div>
              </div>

              {/* Promotion readiness banner */}
              {isThirdTermEnded ? (
                <div className='sp-promote-ready-banner'>
                  <HiAcademicCap />
                  <div>
                    <strong>3rd Term has ended — promotion window is open</strong>
                    <p>
                      The Promote button is now visible on class pages. Go to{" "}
                      <strong>Class Management</strong> to promote students to their next class.
                    </p>
                  </div>
                </div>
              ) : settings.currentTerm === "3rd Term" && !termEndPassed ? (
                <div className='sp-info-banner'>
                  <HiInformationCircle />
                  <span>
                    You are in the <strong>3rd Term</strong>. The Promote button will appear on
                    class pages once the term end date (
                    <strong>{settings.termEndDate || "not set"}</strong>) passes.
                  </span>
                </div>
              ) : settings.currentTerm && settings.currentTerm !== "3rd Term" ? (
                <div className='sp-info-banner'>
                  <HiInformationCircle />
                  <span>
                    Student promotion is only available after <strong>3rd Term</strong> ends.
                    Currently in <strong>{settings.currentTerm}</strong>.
                  </span>
                </div>
              ) : null}

              <div className='form-grid settings-grid'>
                <div className='input-group'>
                  <label>
                    Academic Year <span className='sp-required'>*</span>
                  </label>
                  <div className='input-wrapper'>
                    <HiCalendar className='input-icon' />
                    <select
                      name='academicYear'
                      value={settings.academicYear}
                      onChange={handleChange}
                    >
                      <option value=''>Select year</option>
                      {generateSessions().map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className='input-group'>
                  <label>
                    Current Term <span className='sp-required'>*</span>
                  </label>
                  <div className='input-wrapper'>
                    <HiClock className='input-icon' />
                    <select name='currentTerm' value={settings.currentTerm} onChange={handleChange}>
                      <option value=''>Select term</option>
                      {TERMS.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className='input-group'>
                  <label>Term Start Date</label>
                  <div className='input-wrapper'>
                    <HiCalendar className='input-icon' />
                    <input
                      type='date'
                      name='termStartDate'
                      value={settings.termStartDate || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className='input-group'>
                  <label>Term End Date</label>
                  <div className='input-wrapper'>
                    <HiCalendar className='input-icon' />
                    <input
                      type='date'
                      name='termEndDate'
                      value={settings.termEndDate || ""}
                      onChange={handleChange}
                    />
                  </div>
                  {settings.termEndDate && (
                    <small className='hint' style={{ color: termStatusColor }}>
                      {termEndPassed
                        ? "This term has ended"
                        : `${Math.ceil((new Date(settings.termEndDate) - new Date()) / 86400000)} days remaining`}
                    </small>
                  )}
                </div>

                <div className='input-group'>
                  <label>Next Term Start Date</label>
                  <div className='input-wrapper'>
                    <HiCalendar className='input-icon' />
                    <input
                      type='date'
                      name='nextTermStart'
                      value={settings.nextTermStart || ""}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </div>

              <div className='section-divider' />
              <h3 className='sub-section-title'>Payment Behaviour</h3>
              <div className='toggle-list'>
                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Allow partial payments</p>
                    <p className='toggle-desc'>Students can pay any portion of their fee balance</p>
                  </div>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      name='allowPartialPayment'
                      checked={!!settings.allowPartialPayment}
                      onChange={handleChange}
                    />
                    <span className='slider' />
                  </label>
                </div>

                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Enable late payment fee</p>
                    <p className='toggle-desc'>
                      Automatically add a surcharge for overdue balances
                    </p>
                  </div>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      name='lateFeeEnabled'
                      checked={!!settings.lateFeeEnabled}
                      onChange={handleChange}
                    />
                    <span className='slider' />
                  </label>
                </div>

                {settings.lateFeeEnabled && (
                  <div
                    className='input-group'
                    style={{ maxWidth: 260, marginLeft: "1rem", marginTop: ".25rem" }}
                  >
                    <label>Late Fee Amount (₦)</label>
                    <div className='input-wrapper'>
                      <input
                        type='number'
                        name='lateFeeAmount'
                        value={settings.lateFeeAmount || ""}
                        onChange={handleChange}
                        placeholder='e.g. 500'
                        min='0'
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
               APPEARANCE
          ══════════════════════════════════════════ */}
          {activeTab === "appearance" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Appearance</h2>
                <p>
                  Changes apply immediately as you select them. Save to persist across sessions.
                </p>
              </div>

              <h3 className='sub-section-title'>Theme</h3>
              <div className='theme-options'>
                {THEMES.map(({ id, label }) => (
                  <button
                    key={id}
                    type='button'
                    className={`theme-option ${settings.theme === id ? "active" : ""}`}
                    onClick={() => handleThemeChange(id)}
                  >
                    <div className={`theme-preview theme-preview-${id}`}>
                      <div className='preview-sidebar' />
                      <div className='preview-content'>
                        <div className='preview-bar' />
                        <div className='preview-bar short' />
                      </div>
                    </div>
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <div className='section-divider' />
              <h3 className='sub-section-title'>Accent Colour</h3>
              <p className='sp-sub-desc'>
                Sets the primary colour for buttons, links, and active states throughout the app.
              </p>
              <div className='accent-colors'>
                {ACCENT_COLORS.map(({ id, label, hex }) => (
                  <button
                    key={id}
                    type='button'
                    title={label}
                    className={`accent-dot ${settings.accentColor === id ? "active" : ""}`}
                    style={{ background: hex }}
                    onClick={() => handleAccentChange(id)}
                  >
                    {settings.accentColor === id && <HiCheckCircle />}
                  </button>
                ))}
              </div>
              {settings.accentColor && (
                <p className='sp-accent-label'>
                  Selected:{" "}
                  <strong>{ACCENT_COLORS.find((c) => c.id === settings.accentColor)?.label}</strong>
                </p>
              )}

              <div className='section-divider' />
              <h3 className='sub-section-title'>Layout</h3>
              <div className='toggle-list'>
                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Compact sidebar</p>
                    <p className='toggle-desc'>Show icons only, hide text labels</p>
                  </div>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      name='sidebarCompact'
                      checked={!!settings.sidebarCompact}
                      onChange={handleChange}
                    />
                    <span className='slider' />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
               NOTIFICATIONS
          ══════════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Notifications</h2>
                <p>
                  Control which alerts and reports are generated. The notification bell in the top
                  bar uses these preferences.
                </p>
              </div>

              <div className='toggle-list'>
                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Email notifications</p>
                    <p className='toggle-desc'>
                      Master switch — disabling this suppresses all email alerts
                    </p>
                  </div>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      name='emailNotifications'
                      checked={!!settings.emailNotifications}
                      onChange={handleChange}
                    />
                    <span className='slider' />
                  </label>
                </div>

                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Payment alerts</p>
                    <p className='toggle-desc'>
                      Show a notification each time a payment is recorded
                    </p>
                  </div>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      name='paymentAlerts'
                      checked={!!settings.paymentAlerts}
                      onChange={handleChange}
                    />
                    <span className='slider' />
                  </label>
                </div>

                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Overdue reminders</p>
                    <p className='toggle-desc'>
                      Alert when students have outstanding balances before term ends
                    </p>
                  </div>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      name='overdueReminders'
                      checked={!!settings.overdueReminders}
                      onChange={handleChange}
                    />
                    <span className='slider' />
                  </label>
                </div>

                {settings.overdueReminders && (
                  <div
                    className='input-group'
                    style={{ maxWidth: 260, marginLeft: "1rem", marginTop: ".25rem" }}
                  >
                    <label>Remind this many days before term ends</label>
                    <div className='input-wrapper'>
                      <HiBell className='input-icon' />
                      <input
                        type='number'
                        name='reminderDaysBefore'
                        value={settings.reminderDaysBefore || 3}
                        onChange={handleChange}
                        min='1'
                        max='30'
                      />
                    </div>
                  </div>
                )}

                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Weekly summary report</p>
                    <p className='toggle-desc'>
                      Include a weekly collection summary in the notification panel
                    </p>
                  </div>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      name='weeklyReport'
                      checked={!!settings.weeklyReport}
                      onChange={handleChange}
                    />
                    <span className='slider' />
                  </label>
                </div>
              </div>

              <div className='section-divider' />
              <div className='sp-info-banner'>
                <HiInformationCircle />
                <span>
                  The notification bell (🔔) in the top bar reads these settings and your live
                  Firestore data to generate real-time alerts about fee collections, unpaid
                  families, and term deadlines.
                </span>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════
               SECURITY
          ══════════════════════════════════════════ */}
          {activeTab === "security" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Security</h2>
                <p>Protect access to sensitive financial data and manage account settings.</p>
              </div>

              <div className='toggle-list'>
                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Require PIN to view balances</p>
                    <p className='toggle-desc'>
                      Prompt for a 4-digit PIN before displaying financial data
                    </p>
                  </div>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      name='requirePin'
                      checked={!!settings.requirePin}
                      onChange={handleChange}
                    />
                    <span className='slider' />
                  </label>
                </div>

                {settings.requirePin && (
                  <div
                    className='input-group'
                    style={{ maxWidth: 260, marginLeft: "1rem", marginTop: ".25rem" }}
                  >
                    <label>4-Digit PIN</label>
                    <div className='input-wrapper'>
                      <HiLockClosed className='input-icon' />
                      <input
                        type={showPin ? "text" : "password"}
                        name='pin'
                        value={settings.pin || ""}
                        onChange={handleChange}
                        placeholder='••••'
                        maxLength={4}
                        pattern='\d{4}'
                      />
                      <button
                        type='button'
                        className='pin-toggle'
                        onClick={() => setShowPin((v) => !v)}
                      >
                        {showPin ? <HiEyeOff /> : <HiEye />}
                      </button>
                    </div>
                  </div>
                )}

                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Auto log-out on inactivity</p>
                    <p className='toggle-desc'>
                      Automatically sign out after a period of no activity
                    </p>
                  </div>
                  <label className='switch'>
                    <input
                      type='checkbox'
                      name='autoLogout'
                      checked={!!settings.autoLogout}
                      onChange={handleChange}
                    />
                    <span className='slider' />
                  </label>
                </div>

                {settings.autoLogout && (
                  <div
                    className='input-group'
                    style={{ maxWidth: 260, marginLeft: "1rem", marginTop: ".25rem" }}
                  >
                    <label>Inactivity timeout</label>
                    <div className='input-wrapper'>
                      <HiClock className='input-icon' />
                      <select
                        name='sessionTimeout'
                        value={settings.sessionTimeout || "30"}
                        onChange={handleChange}
                      >
                        {["5", "10", "15", "30", "60", "120"].map((v) => (
                          <option key={v} value={v}>
                            {v} minutes
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className='section-divider' />
              <h3 className='sub-section-title'>Admin Account</h3>
              <div className='info-row'>
                <HiUser className='info-icon' />
                <div>
                  <p className='info-label'>Signed in as</p>
                  <p className='info-value'>{user?.email || settings.contactEmail || "—"}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: ".65rem", marginTop: "1rem", flexWrap: "wrap" }}>
                <button className='outline-btn' onClick={handlePasswordReset}>
                  <HiLockClosed /> Send Password Reset Email
                </button>
              </div>
              <p className='sp-sub-desc' style={{ marginTop: ".5rem" }}>
                A reset link will be sent to{" "}
                <strong>{user?.email || settings.contactEmail || "your email"}</strong>.
              </p>
            </div>
          )}

          {/* ══════════════════════════════════════════
               DATA & EXPORT
          ══════════════════════════════════════════ */}
          {activeTab === "data" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Data &amp; Export</h2>
                <p>Download records as CSV files or a full JSON backup, and manage your data.</p>
              </div>

              {/* ── Export ── */}
              <h3 className='sub-section-title'>Export Records</h3>
              <div className='data-action-grid'>
                <div className='data-action-card'>
                  <div className='sp-export-icon sp-icon-blue'>
                    <HiAcademicCap />
                  </div>
                  <div>
                    <p className='data-action-title'>Students</p>
                    <p className='data-action-desc'>
                      All enrolled students with class and family IDs
                    </p>
                  </div>
                  <button
                    className='sp-export-btn'
                    disabled={exporting.students}
                    onClick={exportStudents}
                  >
                    {exporting.students ? (
                      <>
                        <div className='sp-btn-spinner sp-btn-spinner--sm' /> Exporting…
                      </>
                    ) : (
                      <>
                        <HiDownload /> CSV
                      </>
                    )}
                  </button>
                </div>

                <div className='data-action-card'>
                  <div className='sp-export-icon sp-icon-green'>
                    <HiUserGroup />
                  </div>
                  <div>
                    <p className='data-action-title'>Families</p>
                    <p className='data-action-desc'>Family directory with contact information</p>
                  </div>
                  <button
                    className='sp-export-btn'
                    disabled={exporting.families}
                    onClick={exportFamilies}
                  >
                    {exporting.families ? (
                      <>
                        <div className='sp-btn-spinner sp-btn-spinner--sm' /> Exporting…
                      </>
                    ) : (
                      <>
                        <HiDownload /> CSV
                      </>
                    )}
                  </button>
                </div>

                <div className='data-action-card'>
                  <div className='sp-export-icon sp-icon-purple'>
                    <HiCurrencyDollar />
                  </div>
                  <div>
                    <p className='data-action-title'>Payments</p>
                    <p className='data-action-desc'>
                      All payment records with amounts, methods and dates
                    </p>
                  </div>
                  <button
                    className='sp-export-btn'
                    disabled={exporting.payments}
                    onClick={exportPayments}
                  >
                    {exporting.payments ? (
                      <>
                        <div className='sp-btn-spinner sp-btn-spinner--sm' /> Exporting…
                      </>
                    ) : (
                      <>
                        <HiDownload /> CSV
                      </>
                    )}
                  </button>
                </div>

                <div className='data-action-card'>
                  <div className='sp-export-icon sp-icon-amber'>
                    <HiChartBar />
                  </div>
                  <div>
                    <p className='data-action-title'>Classes</p>
                    <p className='data-action-desc'>
                      Class list with session and section information
                    </p>
                  </div>
                  <button
                    className='sp-export-btn'
                    disabled={exporting.classes}
                    onClick={exportClasses}
                  >
                    {exporting.classes ? (
                      <>
                        <div className='sp-btn-spinner sp-btn-spinner--sm' /> Exporting…
                      </>
                    ) : (
                      <>
                        <HiDownload /> CSV
                      </>
                    )}
                  </button>
                </div>

                <div className='data-action-card sp-backup-card'>
                  <div className='sp-export-icon sp-icon-teal'>
                    <HiDocumentText />
                  </div>
                  <div>
                    <p className='data-action-title'>Full Backup</p>
                    <p className='data-action-desc'>
                      All records — students, families, classes, payments, fees — in a single JSON
                      file. Use for data migration or disaster recovery.
                    </p>
                  </div>
                  <button
                    className='sp-export-btn sp-export-btn--primary'
                    disabled={exporting.backup}
                    onClick={exportFullBackup}
                  >
                    {exporting.backup ? (
                      <>
                        <div className='sp-btn-spinner sp-btn-spinner--sm' /> Preparing…
                      </>
                    ) : (
                      <>
                        <HiDownload /> Backup JSON
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className='section-divider' />
              {/* ── Maintenance ── */}
              <h3 className='sub-section-title'>Maintenance</h3>
              <div className='data-action-grid'>
                <div className='data-action-card'>
                  <div className='sp-export-icon sp-icon-blue'>
                    <HiRefresh />
                  </div>
                  <div>
                    <p className='data-action-title'>Recalculate Balances</p>
                    <p className='data-action-desc'>
                      Balances are calculated live from fee and payment records — no separate
                      recalculation is needed. Navigate to any student or family page to see the
                      latest figures.
                    </p>
                  </div>
                  <button
                    className='outline-btn'
                    onClick={() =>
                      showToast("success", "Balances are always computed live — no action needed.")
                    }
                  >
                    <HiInformationCircle /> How it works
                  </button>
                </div>
              </div>

              <div className='section-divider' />
              {/* ── Danger Zone ── */}
              <h3 className='sub-section-title' style={{ color: "var(--text-danger,#dc2626)" }}>
                Danger Zone
              </h3>
              <div className='danger-zone'>
                {/* Card 1: Clear fee overrides */}
                <div className='danger-card'>
                  <div>
                    <p className='danger-title'>Clear all fee overrides</p>
                    <p className='danger-desc'>
                      Remove all per-student fee exclusions. Students will revert to their full
                      class fee structure. Cannot be undone.
                    </p>
                  </div>
                  {confirmClear ? (
                    <div style={{ display: "flex", gap: ".5rem" }}>
                      <button
                        className='danger-btn'
                        disabled={clearingOverrides}
                        onClick={clearFeeOverrides}
                      >
                        {clearingOverrides ? "Clearing…" : "Confirm"}
                      </button>
                      <button className='cancel-btn' onClick={() => setConfirmClear(false)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className='danger-btn-outline' onClick={() => setConfirmClear(true)}>
                      <HiTrash /> Clear overrides
                    </button>
                  )}
                </div>

                {/* Card 2: Wipe all data */}
                <div className='danger-card wipe-card' style={{ alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <p className='danger-title'>Clear all data (keep families)</p>
                    <p className='danger-desc'>
                      Permanently deletes all{" "}
                      <strong>students, fees, payments, classes, balances, discounts</strong> and
                      overrides. <strong>Families are preserved.</strong>
                    </p>

                    {wipeStep === "idle" && (
                      <button
                        className='danger-btn-outline wipe-trigger-btn'
                        style={{ marginTop: ".65rem" }}
                        onClick={() => setWipeStep("confirm1")}
                      >
                        <HiTrash /> Clear all data
                      </button>
                    )}

                    {wipeStep === "confirm1" && (
                      <div className='wipe-confirm-box'>
                        <p className='wipe-warning-text'>
                          ⚠ You are about to delete all records except families. This cannot be
                          undone.
                        </p>
                        <div style={{ display: "flex", gap: ".5rem", marginTop: ".65rem" }}>
                          <button className='danger-btn' onClick={() => setWipeStep("confirm2")}>
                            Yes, continue
                          </button>
                          <button className='cancel-btn' onClick={() => setWipeStep("idle")}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {wipeStep === "confirm2" && (
                      <div className='wipe-confirm-box wipe-final'>
                        <p className='wipe-warning-text'>
                          <strong>Final warning.</strong> Students, fees, payments, classes,
                          discounts and balances will be permanently deleted. Type{" "}
                          <code>DELETE</code> to confirm.
                        </p>
                        <WipeConfirmInput
                          onConfirm={clearAllData}
                          onCancel={() => setWipeStep("idle")}
                        />
                      </div>
                    )}

                    {wipeStep === "wiping" && (
                      <div className='wipe-progress'>
                        <span className='wipe-spinner' />
                        <span>{wipeProgress || "Clearing data…"}</span>
                      </div>
                    )}

                    {wipeStep === "done" && (
                      <div className='sp-wipe-done'>
                        <HiCheckCircle />
                        All data cleared. Families preserved.
                        <button className='cancel-btn' onClick={() => setWipeStep("idle")}>
                          Dismiss
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Styles ── */}
      <style>{`
        /* Loading */
        .sp-loading { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:300px; gap:1rem; color:var(--text-secondary,#6b7280); }
        .sp-spinner, .sp-btn-spinner { border-radius:50%; animation:spSpin .7s linear infinite; }
        .sp-spinner { width:32px; height:32px; border:3px solid #e5e7eb; border-top-color:#4f46e5; }
        .sp-btn-spinner { width:14px; height:14px; border:2px solid rgba(255,255,255,.35); border-top-color:#fff; display:inline-block; }
        .sp-btn-spinner--sm { border-top-color:var(--primary-color,#4f46e5); border-color:#e5e7eb; }
        @keyframes spSpin { to { transform:rotate(360deg); } }

        /* Save button */
        .sp-save-btn { display:inline-flex; align-items:center; gap:.4rem; padding:.6rem 1.3rem; background:var(--primary-color,#4f46e5); color:#fff; border:none; border-radius:10px; font-size:.875rem; font-weight:600; cursor:pointer; transition:background .15s; }
        .sp-save-btn:hover { opacity:.92; }
        .sp-save-btn:disabled { opacity:.55; cursor:not-allowed; }

        /* Required star */
        .sp-required { color:#ef4444; }

        /* Clear logo button */
        .sp-clear-logo-btn { display:inline-flex; align-items:center; gap:.3rem; padding:.38rem .8rem; border:1px solid #fecaca; background:#fef2f2; color:#dc2626; border-radius:7px; font-size:.78rem; cursor:pointer; }
        .sp-clear-logo-btn:hover { background:#fee2e2; }

        /* Sub description */
        .sp-sub-desc { font-size:.8rem; color:var(--text-secondary,#6b7280); margin:.25rem 0 0; }
        .sp-accent-label { font-size:.78rem; color:var(--text-secondary,#6b7280); margin:.5rem 0 0; }

        /* Info banner */
        .sp-info-banner { display:flex; align-items:flex-start; gap:.55rem; padding:.75rem 1rem; background:#eff6ff; border:1px solid #bfdbfe; border-radius:9px; font-size:.8rem; color:#1d4ed8; line-height:1.5; margin-bottom:1rem; }
        .sp-info-banner svg { font-size:.95rem; flex-shrink:0; margin-top:2px; }

        /* Promotion ready banner */
        .sp-promote-ready-banner { display:flex; align-items:flex-start; gap:.75rem; padding:.9rem 1.1rem; background:#f0fdf4; border:1px solid #86efac; border-radius:10px; font-size:.83rem; color:#15803d; line-height:1.5; margin-bottom:1.25rem; }
        .sp-promote-ready-banner svg { font-size:1.3rem; flex-shrink:0; margin-top:1px; }
        .sp-promote-ready-banner p { margin:.2rem 0 0; }

        /* Nav status card */
        .sp-nav-status { margin-top:.75rem; padding:.75rem; background:var(--bg-secondary,#f8fafc); border-radius:8px; border:1px solid var(--border-color,#e2e8f0); font-size:.75rem; display:flex; flex-direction:column; gap:.3rem; }
        .sp-nav-status-row { display:flex; justify-content:space-between; align-items:center; }
        .sp-nav-status-row span { color:var(--text-secondary,#6b7280); }
        .sp-nav-promote-note { display:flex; align-items:center; gap:.3rem; color:#d97706; font-weight:600; margin-top:.2rem; font-size:.72rem; }

        /* Letterhead preview */
        .sp-letterhead-preview { margin-top:1.75rem; }
        .sp-preview-label { font-size:.72rem; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-secondary,#6b7280); margin:0 0 .65rem; }
        .sp-letter-mock { background:#fff; border:1px solid #e2e8f0; border-radius:8px; padding:1.25rem 1.5rem; max-width:520px; box-shadow:0 2px 12px rgba(0,0,0,.06); }
        [data-theme="dark"] .sp-letter-mock { background:#1e293b; border-color:#334155; }
        .sp-letter-mock-head { display:flex; align-items:flex-start; gap:.85rem; margin-bottom:.75rem; }
        .sp-mock-logo { width:52px; height:52px; object-fit:contain; border-radius:6px; border:1px solid #e5e7eb; padding:.2rem; flex-shrink:0; }
        .sp-mock-logo-ph { width:52px; height:52px; border-radius:6px; border:1px dashed #d1d5db; background:#f9fafb; display:flex; align-items:center; justify-content:center; color:#9ca3af; font-size:1.3rem; flex-shrink:0; }
        .sp-mock-info { display:flex; flex-direction:column; gap:.18rem; }
        .sp-mock-info strong { font-size:.95rem; color:#0f172a; font-family:Arial,sans-serif; }
        [data-theme="dark"] .sp-mock-info strong { color:#f1f5f9; }
        .sp-mock-info span { font-size:.72rem; color:#6b7280; font-family:Arial,sans-serif; }
        .sp-mock-motto { font-weight:600; color:#374151; }
        [data-theme="dark"] .sp-mock-motto { color:#d1d5db; }
        .sp-mock-rule { border:none; border-top:2px solid #1e293b; margin-top:.5rem; }
        [data-theme="dark"] .sp-mock-rule { border-color:#f1f5f9; }

        /* Export icons */
        .sp-export-icon { width:38px; height:38px; border-radius:9px; display:flex; align-items:center; justify-content:center; font-size:1.1rem; flex-shrink:0; }
        .sp-icon-blue   { background:#eff6ff; color:#2563eb; }
        .sp-icon-green  { background:#f0fdf4; color:#16a34a; }
        .sp-icon-purple { background:#faf5ff; color:#7c3aed; }
        .sp-icon-amber  { background:#fffbeb; color:#d97706; }
        .sp-icon-teal   { background:#f0fdfa; color:#0d9488; }

        .sp-export-btn { display:inline-flex; align-items:center; gap:.35rem; padding:.45rem .95rem; border:1px solid #d1d5db; background:#fff; color:#374151; border-radius:8px; font-size:.8rem; font-weight:500; cursor:pointer; white-space:nowrap; transition:background .14s; }
        .sp-export-btn:hover { background:#f3f4f6; }
        .sp-export-btn:disabled { opacity:.5; cursor:not-allowed; }
        .sp-export-btn--primary { background:var(--primary-color,#4f46e5); color:#fff; border-color:var(--primary-color,#4f46e5); }
        .sp-export-btn--primary:hover { opacity:.9; }
        [data-theme="dark"] .sp-export-btn { background:#334155; border-color:#475569; color:#e2e8f0; }
        [data-theme="dark"] .sp-export-btn--primary { background:var(--primary-color,#4f46e5); color:#fff; }

        .sp-backup-card { flex-wrap:nowrap; align-items:flex-start; }
        .sp-backup-card > div:nth-child(2) { flex:1; }

        /* Wipe done */
        .sp-wipe-done { display:flex; align-items:center; gap:.5rem; margin-top:.65rem; color:var(--text-success,#16a34a); font-size:.83rem; }
        .sp-wipe-done svg { flex-shrink:0; }

        /* ── Settings page structure (preserved from original) ── */
        .settings-page { max-width:1100px; margin:0 auto; padding:0 1.5rem 3rem; }
        .settings-header { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; margin-bottom:2rem; padding-bottom:1.5rem; border-bottom:1px solid var(--border-color,#e5e7eb); }
        .settings-header h1 { font-size:1.5rem; font-weight:700; margin:0; color:var(--text-primary,#111827); }
        .settings-header p { color:var(--text-secondary,#6b7280); margin:.25rem 0 0; font-size:.875rem; }
        .settings-layout { display:grid; grid-template-columns:220px 1fr; gap:2rem; }
        @media(max-width:680px) { .settings-layout { grid-template-columns:1fr; } }

        .settings-nav { display:flex; flex-direction:column; gap:.2rem; position:sticky; top:1rem; align-self:start; background:var(--bg-primary,#fff); border:1px solid var(--border-color,#e5e7eb); border-radius:12px; padding:.75rem .6rem; }
        .settings-nav-item { display:flex; align-items:center; gap:.6rem; padding:.6rem .8rem; border-radius:8px; border:none; background:transparent; cursor:pointer; width:100%; text-align:left; font-size:.855rem; color:var(--text-secondary,#6b7280); transition:background .14s,color .14s; }
        .settings-nav-item:hover { background:var(--bg-secondary,#f8fafc); color:var(--text-primary,#111827); }
        .settings-nav-item.active { background:var(--primary-color,#4f46e5); color:#fff; font-weight:600; }
        .settings-nav-item svg { width:17px; height:17px; flex-shrink:0; }

        .settings-content { background:var(--bg-primary,#fff); border:1px solid var(--border-color,#e5e7eb); border-radius:14px; padding:1.75rem; min-height:500px; }
        .settings-section { max-width:680px; }
        .section-header { margin-bottom:1.5rem; }
        .section-header h2 { font-size:1.1rem; font-weight:700; margin:0 0 .3rem; color:var(--text-primary,#111827); }
        .section-header p { color:var(--text-secondary,#6b7280); margin:0; font-size:.84rem; line-height:1.5; }
        .sub-section-title { font-size:.875rem; font-weight:600; margin:0 0 .85rem; color:var(--text-primary,#111827); }
        .section-divider { border:none; border-top:1px solid var(--border-color,#e5e7eb); margin:1.5rem 0; }
        .optional { font-weight:400; color:var(--text-tertiary,#9ca3af); font-size:.78rem; }
        .settings-grid { grid-template-columns:1fr 1fr; }
        @media(max-width:520px) { .settings-grid { grid-template-columns:1fr; } }

        /* Logo */
        .logo-upload-area { display:flex; align-items:flex-start; gap:1.1rem; padding:1.1rem; border:1px dashed var(--border-color,#d1d5db); border-radius:10px; margin-bottom:1.5rem; }
        .logo-preview { width:72px; height:72px; border-radius:10px; background:var(--bg-secondary,#f8fafc); display:flex; align-items:center; justify-content:center; overflow:hidden; flex-shrink:0; border:1px solid var(--border-color,#e5e7eb); }
        .logo-preview img { width:100%; height:100%; object-fit:cover; }
        .logo-placeholder-icon { width:30px; height:30px; color:var(--text-tertiary,#9ca3af); }
        .logo-label { font-weight:600; margin:0 0 .2rem; font-size:.875rem; color:var(--text-primary,#111827); }
        .logo-hint { color:var(--text-secondary,#6b7280); font-size:.78rem; margin:0 0 .65rem; line-height:1.4; }
        .upload-btn { display:inline-flex; align-items:center; gap:.35rem; padding:.38rem .85rem; border:1px solid var(--border-color,#d1d5db); border-radius:7px; font-size:.78rem; cursor:pointer; background:var(--bg-primary,#fff); color:var(--text-primary,#374151); transition:background .14s; }
        .upload-btn:hover { background:var(--bg-secondary,#f8fafc); }

        /* Academic status */
        .academic-status-card { display:flex; border:1px solid var(--border-color,#e5e7eb); border-radius:10px; overflow:hidden; margin-bottom:1.25rem; }
        .academic-status-item { flex:1; padding:.85rem 1.1rem; }
        .academic-status-divider { width:1px; background:var(--border-color,#e5e7eb); }
        .status-label { display:block; font-size:.7rem; color:var(--text-secondary,#6b7280); text-transform:uppercase; letter-spacing:.05em; margin-bottom:.3rem; }
        .status-value { display:block; font-size:.95rem; font-weight:600; color:var(--text-primary,#111827); }
        .status-value.highlight { color:var(--primary-color,#4f46e5); }

        /* Toggles */
        .toggle-list { display:flex; flex-direction:column; }
        .toggle-row { display:flex; align-items:center; justify-content:space-between; padding:.9rem 0; border-bottom:1px solid var(--border-color,#e5e7eb); gap:1rem; }
        .toggle-row:last-child { border-bottom:none; }
        .toggle-label { font-size:.875rem; font-weight:500; margin:0 0 .18rem; color:var(--text-primary,#111827); }
        .toggle-desc { font-size:.78rem; color:var(--text-secondary,#6b7280); margin:0; }
        .switch { position:relative; display:inline-block; width:42px; height:24px; flex-shrink:0; }
        .switch input { opacity:0; width:0; height:0; }
        .slider { position:absolute; cursor:pointer; inset:0; background:#d1d5db; border-radius:24px; transition:background .2s; }
        .slider::before { content:""; position:absolute; height:18px; width:18px; left:3px; bottom:3px; background:#fff; border-radius:50%; transition:transform .2s; box-shadow:0 1px 3px rgba(0,0,0,.2); }
        .switch input:checked + .slider { background:var(--primary-color,#4f46e5); }
        .switch input:checked + .slider::before { transform:translateX(18px); }

        /* Theme */
        .theme-options { display:flex; gap:.85rem; flex-wrap:wrap; margin-bottom:.5rem; }
        .theme-option { display:flex; flex-direction:column; align-items:center; gap:.4rem; padding:.65rem; border:2px solid var(--border-color,#e5e7eb); border-radius:10px; cursor:pointer; background:transparent; transition:border-color .14s; font-size:.78rem; color:var(--text-primary,#374151); }
        .theme-option.active { border-color:var(--primary-color,#4f46e5); }
        .theme-preview { width:78px; height:52px; border-radius:6px; overflow:hidden; display:flex; border:1px solid var(--border-color,#e5e7eb); }
        .theme-preview-light { background:#f8f8f8; }
        .theme-preview-dark  { background:#1e1e1e; }
        .theme-preview-system { background:linear-gradient(135deg,#f8f8f8 50%,#1e1e1e 50%); }
        .preview-sidebar { width:20px; background:rgba(0,0,0,.08); height:100%; }
        .theme-preview-dark .preview-sidebar { background:rgba(255,255,255,.08); }
        .preview-content { flex:1; padding:5px; display:flex; flex-direction:column; gap:3px; }
        .preview-bar { height:5px; background:rgba(0,0,0,.12); border-radius:3px; }
        .theme-preview-dark .preview-bar { background:rgba(255,255,255,.15); }
        .preview-bar.short { width:55%; }

        /* Accent */
        .accent-colors { display:flex; gap:.55rem; flex-wrap:wrap; }
        .accent-dot { width:30px; height:30px; border-radius:50%; border:3px solid transparent; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:transform .14s,border-color .14s; }
        .accent-dot:hover { transform:scale(1.18); }
        .accent-dot.active { border-color:var(--text-primary,#111827); }
        .accent-dot svg { width:14px; height:14px; color:#fff; }

        /* Pin toggle */
        .pin-toggle { background:none; border:none; cursor:pointer; padding:0 .45rem; color:var(--text-secondary,#6b7280); display:flex; align-items:center; }

        /* Info row */
        .info-row { display:flex; align-items:center; gap:.75rem; padding:.85rem 1rem; background:var(--bg-secondary,#f8fafc); border-radius:9px; }
        .info-icon { width:20px; height:20px; color:var(--text-secondary,#6b7280); }
        .info-label { font-size:.72rem; color:var(--text-secondary,#6b7280); margin:0; }
        .info-value { font-size:.875rem; font-weight:500; margin:.1rem 0 0; color:var(--text-primary,#111827); }

        /* Outline button */
        .outline-btn { display:inline-flex; align-items:center; gap:.35rem; padding:.48rem 1rem; border:1px solid var(--border-color,#d1d5db); border-radius:8px; background:transparent; color:var(--text-primary,#374151); font-size:.855rem; cursor:pointer; transition:background .14s; }
        .outline-btn:hover { background:var(--bg-secondary,#f8fafc); }

        /* Data actions */
        .data-action-grid { display:flex; flex-direction:column; gap:.65rem; }
        .data-action-card { display:flex; align-items:center; gap:.85rem; padding:.9rem 1.1rem; border:1px solid var(--border-color,#e5e7eb); border-radius:10px; flex-wrap:wrap; }
        .data-action-card > div:nth-child(2) { flex:1; min-width:140px; }
        .data-action-title { font-size:.875rem; font-weight:600; margin:0 0 .15rem; color:var(--text-primary,#111827); }
        .data-action-desc  { font-size:.77rem; color:var(--text-secondary,#6b7280); margin:0; line-height:1.45; }

        /* Danger zone */
        .danger-zone { border:1px solid #fecaca; border-radius:10px; overflow:hidden; }
        .danger-card { display:flex; align-items:center; justify-content:space-between; gap:1rem; padding:.9rem 1.1rem; flex-wrap:wrap; border-bottom:1px solid #fecaca; }
        .danger-card:last-child { border-bottom:none; }
        .danger-title { font-size:.875rem; font-weight:600; margin:0 0 .15rem; color:#dc2626; }
        .danger-desc  { font-size:.78rem; color:var(--text-secondary,#6b7280); margin:0; line-height:1.4; }
        .danger-btn { padding:.45rem .95rem; background:#fef2f2; color:#dc2626; border:1px solid #fecaca; border-radius:8px; cursor:pointer; font-size:.855rem; }
        .danger-btn:hover { background:#fee2e2; }
        .danger-btn:disabled { opacity:.5; cursor:not-allowed; }
        .danger-btn-outline { display:inline-flex; align-items:center; gap:.35rem; padding:.45rem .95rem; border:1px solid #fecaca; color:#dc2626; border-radius:8px; background:transparent; cursor:pointer; font-size:.855rem; transition:background .14s; }
        .danger-btn-outline:hover { background:#fef2f2; }
        .cancel-btn { padding:.45rem .95rem; border:1px solid var(--border-color,#d1d5db); border-radius:8px; background:transparent; cursor:pointer; font-size:.855rem; color:var(--text-primary,#374151); }
        .cancel-btn:hover { background:var(--bg-secondary,#f8fafc); }
        .wipe-trigger-btn { }
        .wipe-confirm-box { margin-top:.65rem; }
        .wipe-warning-text { font-size:.8rem; color:#92400e; line-height:1.5; margin:0; }
        .wipe-final .wipe-warning-text { color:#dc2626; }
        .wipe-progress { display:flex; align-items:center; gap:.5rem; font-size:.8rem; color:var(--text-secondary,#6b7280); margin-top:.65rem; }
        .wipe-spinner { width:14px; height:14px; border:2px solid #e5e7eb; border-top-color:#4f46e5; border-radius:50%; animation:spSpin .7s linear infinite; flex-shrink:0; }

        /* Toast */
        .settings-toast { position:fixed; top:1.1rem; right:1.1rem; z-index:9999; display:flex; align-items:center; gap:.55rem; padding:.7rem 1.1rem; border-radius:9px; font-size:.855rem; font-weight:500; box-shadow:0 8px 24px rgba(0,0,0,.14); animation:spToastIn .2s ease; max-width:360px; }
        .settings-toast.success { background:#f0fdf4; color:#15803d; border:1px solid #86efac; }
        .settings-toast.error   { background:#fef2f2; color:#b91c1c; border:1px solid #fecaca; }
        .settings-toast svg { width:17px; height:17px; flex-shrink:0; }
        @keyframes spToastIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:none} }

        /* Dark mode */
        [data-theme="dark"] .settings-nav { background:var(--bg-secondary); border-color:var(--border-color); }
        [data-theme="dark"] .settings-content { background:var(--bg-secondary); border-color:var(--border-color); }
        [data-theme="dark"] .section-header h2 { color:var(--text-primary); }
        [data-theme="dark"] .sub-section-title { color:var(--text-primary); }
        [data-theme="dark"] .toggle-label { color:var(--text-primary); }
        [data-theme="dark"] .toggle-row { border-color:var(--border-color); }
        [data-theme="dark"] .academic-status-card { border-color:var(--border-color); background:var(--bg-primary); }
        [data-theme="dark"] .academic-status-divider { background:var(--border-color); }
        [data-theme="dark"] .status-value { color:var(--text-primary); }
        [data-theme="dark"] .info-row { background:var(--bg-primary); }
        [data-theme="dark"] .info-value { color:var(--text-primary); }
        [data-theme="dark"] .data-action-card { border-color:var(--border-color); }
        [data-theme="dark"] .data-action-title { color:var(--text-primary); }
        [data-theme="dark"] .outline-btn { border-color:var(--border-color); color:var(--text-primary); }
        [data-theme="dark"] .cancel-btn { border-color:var(--border-color); color:var(--text-primary); }
        [data-theme="dark"] .logo-upload-area { border-color:var(--border-color); }
        [data-theme="dark"] .upload-btn { background:var(--bg-secondary); border-color:var(--border-color); color:var(--text-primary); }
        [data-theme="dark"] .sp-nav-status { background:var(--bg-primary); border-color:var(--border-color); }
        [data-theme="dark"] .theme-option { border-color:var(--border-color); color:var(--text-primary); }
        [data-theme="dark"] .sp-info-banner { background:#1e3a5f; border-color:#1d4ed8; color:#93c5fd; }
        [data-theme="dark"] .sp-promote-ready-banner { background:#052e16; border-color:#166534; color:#4ade80; }
        [data-theme="dark"] .settings-toast.success { background:#052e16; color:#4ade80; border-color:#166534; }
        [data-theme="dark"] .settings-toast.error   { background:#450a0a; color:#fca5a5; border-color:#991b1b; }
        [data-theme="dark"] .logo-preview { background:var(--bg-primary); border-color:var(--border-color); }
        [data-theme="dark"] .hint { color:var(--text-secondary); }
      `}</style>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   WipeConfirmInput — isolated component to keep state separate
───────────────────────────────────────────────────────────── */
function WipeConfirmInput({ onConfirm, onCancel }) {
  const [val, setVal] = useState("");
  return (
    <div
      style={{
        display: "flex",
        gap: ".5rem",
        marginTop: ".65rem",
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <input
        type='text'
        placeholder='Type DELETE to confirm'
        value={val}
        onChange={(e) => setVal(e.target.value)}
        style={{
          flex: 1,
          minWidth: 180,
          height: 36,
          padding: "0 12px",
          border: "1px solid #fecaca",
          borderRadius: 8,
          fontSize: 13,
          background: "var(--bg-primary,#fff)",
          color: "var(--text-primary,#111827)",
          outline: "none",
        }}
        autoComplete='off'
        spellCheck={false}
      />
      <button
        className='danger-btn'
        disabled={val !== "DELETE"}
        style={{
          opacity: val !== "DELETE" ? 0.42 : 1,
          cursor: val !== "DELETE" ? "not-allowed" : "pointer",
        }}
        onClick={onConfirm}
      >
        Delete everything
      </button>
      <button className='cancel-btn' onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}
