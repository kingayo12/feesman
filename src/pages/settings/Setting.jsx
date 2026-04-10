import { useEffect, useState, useCallback } from "react";
import { getSettings, updateSettings } from "./settingService";
import { useAuth } from "../../context/AuthContext";
import { Bone } from "../../components/common/Skeleton";
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
    localStorage.setItem("themePreference", theme);
    localStorage.setItem("theme", resolved);
  } catch {}
  try {
    window.dispatchEvent(
      new CustomEvent("feesman-theme-change", {
        detail: { themePreference: theme, resolvedTheme: resolved },
      }),
    );
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

  const navTermClass = settings.currentTerm === "3rd Term" ? "sp-term-warn" : "sp-term-ok";
  const termEndClass = !settings.termEndDate
    ? "sp-term-muted"
    : termEndPassed
      ? "sp-term-danger"
      : (() => {
          const daysLeft = Math.ceil((new Date(settings.termEndDate) - new Date()) / 86400000);
          return daysLeft <= 7 ? "sp-term-warn" : "sp-term-ok";
        })();

  /* ─────────────────────────────────────────────────────────────
     LOADING STATE
  ───────────────────────────────────────────────────────────── */
  if (loading)
    return (
      <div className='settings-page'>
        <div className='settings-header'>
          <div>
            <Bone w={160} h={26} style={{ marginBottom: 8 }} />
            <Bone w={320} h={14} />
          </div>
          <Bone w={130} h={40} r={10} />
        </div>

        <div className='settings-layout'>
          <nav className='settings-nav'>
            {Array.from({ length: 6 }).map((_, i) => (
              <Bone key={`set-nav-skel-${i}`} w='100%' h={38} r={8} style={{ marginBottom: 8 }} />
            ))}
          </nav>

          <div className='settings-content'>
            <div className='settings-section'>
              <Bone w={170} h={20} style={{ marginBottom: 10 }} />
              <Bone w='60%' h={13} style={{ marginBottom: 18 }} />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={`set-field-skel-${i}`}>
                    <Bone w={90} h={11} style={{ marginBottom: 6 }} />
                    <Bone w='100%' h={40} r={8} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
                <strong className={navTermClass}>{settings.currentTerm || "—"}</strong>
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
                  <div className='sp-inline-actions'>
                    <label className='upload-btn'>
                      <HiPhotograph /> Upload Logo
                      <input
                        type='file'
                        accept='image/*'
                        className='sp-file-input-hidden'
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
                      className='sp-uppercase-input'
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
                    <HiStar className='input-icon sp-star-icon' />
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
                  <span className={`status-value ${termEndClass}`}>
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
                    <small className={`hint ${termEndClass}`}>
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
                  <div className='input-group sp-inline-setting-input'>
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
                {ACCENT_COLORS.map(({ id, label }) => (
                  <button
                    key={id}
                    type='button'
                    title={label}
                    className={`accent-dot accent-dot-${id} ${settings.accentColor === id ? "active" : ""}`}
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
                  <div className='input-group sp-inline-setting-input'>
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
                  <div className='input-group sp-inline-setting-input'>
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
                  <div className='input-group sp-inline-setting-input'>
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
              <div className='sp-inline-actions-lg'>
                <button className='outline-btn' onClick={handlePasswordReset}>
                  <HiLockClosed /> Send Password Reset Email
                </button>
              </div>
              <p className='sp-sub-desc sp-sub-desc-top'>
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
              <h3 className='sub-section-title danger-title'>Danger Zone</h3>
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
                    <div className='sp-inline-actions'>
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
                <div className='danger-card wipe-card sp-wipe-card'>
                  <div className='sp-grow'>
                    <p className='danger-title'>Clear all data (keep families)</p>
                    <p className='danger-desc'>
                      Permanently deletes all{" "}
                      <strong>students, fees, payments, classes, balances, discounts</strong> and
                      overrides. <strong>Families are preserved.</strong>
                    </p>

                    {wipeStep === "idle" && (
                      <button
                        className='danger-btn-outline wipe-trigger-btn'
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
                        <div className='sp-inline-actions sp-inline-actions-top'>
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
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   WipeConfirmInput — isolated component to keep state separate
───────────────────────────────────────────────────────────── */
function WipeConfirmInput({ onConfirm, onCancel }) {
  const [val, setVal] = useState("");
  return (
    <div className='wipe-confirm-controls'>
      <input
        className='wipe-confirm-input'
        type='text'
        placeholder='Type DELETE to confirm'
        value={val}
        onChange={(e) => setVal(e.target.value)}
        autoComplete='off'
        spellCheck={false}
      />
      <button
        className='danger-btn'
        disabled={val !== "DELETE"}
        data-disabled={val !== "DELETE"}
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
