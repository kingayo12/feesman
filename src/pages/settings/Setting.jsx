import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "./settingService";
import { collection, getDocs, deleteDoc, writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase/firestore";
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
} from "react-icons/hi";

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

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("school");
  const [settings, setSettings] = useState({
    // School Profile
    name: "",
    abbr: "",
    state: "",
    tagline: "",
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
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type: "success"|"error", msg }
  const [showPin, setShowPin] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false); // "idle" | "confirm1" | "confirm2" | "wiping" | "done"
  const [wipeStep, setWipeStep] = useState("idle");
  const [wipeProgress, setWipeProgress] = useState("");

  useEffect(() => {
    async function load() {
      const data = await getSettings();
      if (data) setSettings((prev) => ({ ...prev, ...data }));
      setLoading(false);
    }
    load();
  }, []);

  // ── Clear all data except families ────────────────────────────────────
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

  const clearAllData = async () => {
    setWipeStep("wiping");
    try {
      for (const col of COLLECTIONS_TO_WIPE) {
        setWipeProgress(`Clearing ${col}...`);
        const snap = await getDocs(collection(db, col));
        if (snap.empty) continue;
        // Delete in batches of 499 (Firestore limit is 500)
        const chunks = [];
        for (let i = 0; i < snap.docs.length; i += 499) {
          chunks.push(snap.docs.slice(i, i + 499));
        }
        for (const chunk of chunks) {
          const batch = writeBatch(db);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
      setWipeStep("done");
      setWipeProgress("");
      showToast("success", "All data cleared. Families have been kept.");
    } catch (err) {
      console.error("Clear data error:", err);
      setWipeStep("idle");
      setWipeProgress("");
      showToast("error", "Failed to clear data: " + (err.message || "Unknown error"));
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setSettings((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSettings(settings);
      showToast("success", "Settings saved successfully.");
    } catch {
      showToast("error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const generateSessions = () => {
    const out = [];
    const start = new Date().getFullYear() - 3;
    for (let y = start; y <= 2035; y++) out.push(`${y}/${y + 1}`);
    return out;
  };

  if (loading)
    return (
      <div className='loading-state'>
        <div className='spinner'></div>
        <p>Loading settings…</p>
      </div>
    );

  return (
    <div className='settings-page'>
      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div className={`settings-toast ${toast.type}`}>
          {toast.type === "success" ? <HiCheckCircle /> : <HiExclamationCircle />}
          {toast.msg}
        </div>
      )}

      {/* ── Page header ───────────────────────────────────────────── */}
      <div className='settings-header'>
        <div>
          <h1>Settings</h1>
          <p>Manage your school configuration and preferences</p>
        </div>
        <button className='submit-btn' onClick={handleSave} disabled={saving}>
          {saving ? (
            "Saving…"
          ) : (
            <>
              <HiSave /> Save Changes
            </>
          )}
        </button>
      </div>

      <div className='settings-layout'>
        {/* ── Sidebar tabs ─────────────────────────────────────────── */}
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
        </nav>

        {/* ── Tab content ──────────────────────────────────────────── */}
        <div className='settings-content'>
          {/* ══ SCHOOL PROFILE ══════════════════════════════════════ */}
          {activeTab === "school" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>School Profile</h2>
                <p>Basic information about your school displayed on receipts and reports.</p>
              </div>

              {/* Logo upload area */}
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
                  <p className='logo-hint'>Appears on receipts, reports, and the login screen.</p>
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
                </div>
              </div>

              <div className='form-grid settings-grid'>
                <div className='input-group full-width'>
                  <label>School Name</label>
                  <div className='input-wrapper'>
                    <HiOfficeBuilding className='input-icon' />
                    <input
                      name='name'
                      value={settings.name}
                      onChange={handleChange}
                      placeholder='e.g. Excellence International School'
                      required
                    />
                  </div>
                </div>

                <div className='input-group'>
                  <label>School Abbreviation</label>
                  <div className='input-wrapper'>
                    <HiIdentification className='input-icon' />
                    <input
                      name='abbr'
                      value={settings.abbr || ""}
                      onChange={handleChange}
                      placeholder='e.g. GCI, EIS, FGCI'
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
                      placeholder='e.g. Oyo, Lagos, Abuja'
                      maxLength={12}
                    />
                  </div>
                  <small className='hint'>Used in admission number (first 2–3 letters)</small>
                </div>

                <div className='input-group full-width'>
                  <label>
                    Tagline / Motto <span className='optional'>(optional)</span>
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
                  <label>Address</label>
                  <div className='input-wrapper'>
                    <HiLocationMarker className='input-icon' />
                    <input
                      name='address'
                      value={settings.address || ""}
                      onChange={handleChange}
                      placeholder='Street address, City, State'
                    />
                  </div>
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
                      placeholder='+234...'
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
                  <label>Timezone</label>
                  <div className='input-wrapper'>
                    <HiClock className='input-icon' />
                    <select
                      name='timezone'
                      value={settings.timezone || "Africa/Lagos"}
                      onChange={handleChange}
                    >
                      {TIMEZONES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className='input-group'>
                  <label>Currency</label>
                  <div className='input-wrapper'>
                    <select
                      name='currency'
                      value={settings.currency || "NGN (₦)"}
                      onChange={handleChange}
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ══ ACADEMIC ════════════════════════════════════════════ */}
          {activeTab === "academic" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Academic Settings</h2>
                <p>
                  Configure the current session and term. All fee calculations use these values.
                </p>
              </div>

              {/* Current status card */}
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
                  <span className='status-value'>{settings.termEndDate || "Not set"}</span>
                </div>
              </div>

              <div className='form-grid settings-grid'>
                <div className='input-group'>
                  <label>Academic Year</label>
                  <div className='input-wrapper'>
                    <HiCalendar className='input-icon' />
                    <select
                      name='academicYear'
                      value={settings.academicYear}
                      onChange={handleChange}
                      required
                    >
                      <option value=''>Select year</option>
                      {generateSessions().map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className='input-group'>
                  <label>Current Term</label>
                  <div className='input-wrapper'>
                    <HiClock className='input-icon' />
                    <select
                      name='currentTerm'
                      value={settings.currentTerm}
                      onChange={handleChange}
                      required
                    >
                      <option value=''>Select term</option>
                      {TERMS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
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

              {/* Payment behaviour */}
              <div className='section-divider' />
              <h3 className='sub-section-title'>Payment Behaviour</h3>

              <div className='toggle-list'>
                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Allow partial payments</p>
                    <p className='toggle-desc'>Students can pay part of their fee balance</p>
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
                    <p className='toggle-label'>Enable late fee</p>
                    <p className='toggle-desc'>Add a surcharge for overdue balances</p>
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
                  <div className='input-group' style={{ maxWidth: 260, marginTop: "0.5rem" }}>
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

          {/* ══ APPEARANCE ══════════════════════════════════════════ */}
          {activeTab === "appearance" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Appearance</h2>
                <p>Personalise how the app looks for your school.</p>
              </div>

              <h3 className='sub-section-title'>Theme</h3>
              <div className='theme-options'>
                {THEMES.map(({ id, label }) => (
                  <button
                    key={id}
                    type='button'
                    className={`theme-option ${settings.theme === id ? "active" : ""}`}
                    onClick={() => setSettings((prev) => ({ ...prev, theme: id }))}
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
              <div className='accent-colors'>
                {ACCENT_COLORS.map(({ id, label, hex }) => (
                  <button
                    key={id}
                    type='button'
                    title={label}
                    className={`accent-dot ${settings.accentColor === id ? "active" : ""}`}
                    style={{ background: hex }}
                    onClick={() => setSettings((prev) => ({ ...prev, accentColor: id }))}
                  >
                    {settings.accentColor === id && <HiCheckCircle />}
                  </button>
                ))}
              </div>

              <div className='section-divider' />
              <h3 className='sub-section-title'>Layout</h3>
              <div className='toggle-list'>
                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Compact sidebar</p>
                    <p className='toggle-desc'>Show icons only, hide labels</p>
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

          {/* ══ NOTIFICATIONS ═══════════════════════════════════════ */}
          {activeTab === "notifications" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Notifications</h2>
                <p>Choose what alerts and reports you receive.</p>
              </div>

              <div className='toggle-list'>
                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Email notifications</p>
                    <p className='toggle-desc'>Master switch for all email alerts</p>
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
                    <p className='toggle-desc'>Notify when a payment is recorded</p>
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
                    <p className='toggle-desc'>Alert for students with outstanding balances</p>
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
                  <div className='input-group' style={{ maxWidth: 260, marginLeft: "1rem" }}>
                    <label>Remind this many days before term end</label>
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
                    <p className='toggle-desc'>Email a collection summary every Monday</p>
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
            </div>
          )}

          {/* ══ SECURITY ════════════════════════════════════════════ */}
          {activeTab === "security" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Security</h2>
                <p>Protect access to sensitive financial data.</p>
              </div>

              <div className='toggle-list'>
                <div className='toggle-row'>
                  <div>
                    <p className='toggle-label'>Require PIN to view balances</p>
                    <p className='toggle-desc'>
                      Prompt for a 4-digit PIN before showing financial data
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
                  <div className='input-group' style={{ maxWidth: 260, marginLeft: "1rem" }}>
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
                      Sign out automatically after a period of no activity
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
                  <div className='input-group' style={{ maxWidth: 260, marginLeft: "1rem" }}>
                    <label>Timeout (minutes)</label>
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
                  <p className='info-value'>{settings.contactEmail || "admin@school.com"}</p>
                </div>
              </div>
              <button
                className='outline-btn'
                style={{ marginTop: "1rem" }}
                onClick={() => alert("Password reset email sent.")}
              >
                <HiLockClosed /> Change Password
              </button>
            </div>
          )}

          {/* ══ DATA & EXPORT ════════════════════════════════════════ */}
          {activeTab === "data" && (
            <div className='settings-section'>
              <div className='section-header'>
                <h2>Data & Export</h2>
                <p>Export records or perform maintenance on your data.</p>
              </div>

              <h3 className='sub-section-title'>Export</h3>
              <div className='data-action-grid'>
                <div className='data-action-card'>
                  <HiDownload className='data-action-icon' />
                  <div>
                    <p className='data-action-title'>Export Payments</p>
                    <p className='data-action-desc'>Download all payment records as CSV</p>
                  </div>
                  <button className='outline-btn' onClick={() => alert("Exporting payments…")}>
                    Export
                  </button>
                </div>

                <div className='data-action-card'>
                  <HiDownload className='data-action-icon' />
                  <div>
                    <p className='data-action-title'>Export Students</p>
                    <p className='data-action-desc'>Download full student list as CSV</p>
                  </div>
                  <button className='outline-btn' onClick={() => alert("Exporting students…")}>
                    Export
                  </button>
                </div>

                <div className='data-action-card'>
                  <HiDownload className='data-action-icon' />
                  <div>
                    <p className='data-action-title'>Export Families</p>
                    <p className='data-action-desc'>Download family directory with balances</p>
                  </div>
                  <button className='outline-btn' onClick={() => alert("Exporting families…")}>
                    Export
                  </button>
                </div>

                <div className='data-action-card'>
                  <HiDownload className='data-action-icon' />
                  <div>
                    <p className='data-action-title'>Full Backup</p>
                    <p className='data-action-desc'>Download everything as JSON</p>
                  </div>
                  <button className='outline-btn' onClick={() => alert("Preparing backup…")}>
                    Backup
                  </button>
                </div>
              </div>

              <div className='section-divider' />
              <h3 className='sub-section-title'>Maintenance</h3>
              <div className='data-action-grid'>
                <div className='data-action-card'>
                  <HiRefresh className='data-action-icon' />
                  <div>
                    <p className='data-action-title'>Recalculate Balances</p>
                    <p className='data-action-desc'>
                      Force-refresh all outstanding balance figures
                    </p>
                  </div>
                  <button className='outline-btn' onClick={() => alert("Recalculating…")}>
                    Run
                  </button>
                </div>
              </div>

              <div className='section-divider' />
              <h3 className='sub-section-title danger-title'>Danger Zone</h3>
              <div className='danger-zone'>
                {/* ── Card 1: Clear fee overrides (existing) ── */}
                <div className='danger-card'>
                  <div>
                    <p className='danger-title'>Clear all fee overrides</p>
                    <p className='danger-desc'>
                      Remove all per-student fee exclusions. Cannot be undone.
                    </p>
                  </div>
                  {confirmClear ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className='danger-btn'
                        onClick={() => {
                          setConfirmClear(false);
                          showToast("success", "Overrides cleared.");
                        }}
                      >
                        Confirm
                      </button>
                      <button className='cancel-btn' onClick={() => setConfirmClear(false)}>
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button className='danger-btn-outline' onClick={() => setConfirmClear(true)}>
                      <HiTrash /> Clear
                    </button>
                  )}
                </div>

                {/* ── Card 2: Wipe all data except families ── */}
                <div className='danger-card wipe-card'>
                  <div style={{ flex: 1 }}>
                    <p className='danger-title'>Clear all data (keep families)</p>
                    <p className='danger-desc'>
                      Permanently deletes all{" "}
                      <strong>students, fees, payments, classes, balances, discounts</strong> and
                      overrides. <strong>Families are preserved.</strong> This action cannot be
                      undone.
                    </p>

                    {/* Step 1 — initial warning */}
                    {wipeStep === "idle" && (
                      <button
                        className='danger-btn-outline wipe-trigger-btn'
                        style={{ marginTop: "0.75rem" }}
                        onClick={() => setWipeStep("confirm1")}
                      >
                        <HiTrash /> Clear all data
                      </button>
                    )}

                    {/* Step 2 — first confirmation */}
                    {wipeStep === "confirm1" && (
                      <div className='wipe-confirm-box'>
                        <p className='wipe-warning-text'>
                          ⚠ You are about to delete all records except families. Are you sure?
                        </p>
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
                          <button className='danger-btn' onClick={() => setWipeStep("confirm2")}>
                            Yes, continue
                          </button>
                          <button className='cancel-btn' onClick={() => setWipeStep("idle")}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Step 3 — final confirmation */}
                    {wipeStep === "confirm2" && (
                      <div className='wipe-confirm-box wipe-final'>
                        <p className='wipe-warning-text'>
                          This is your <strong>final warning</strong>. All students, fees, payments,
                          classes, discounts and balances will be permanently deleted. Type{" "}
                          <code>DELETE</code> to confirm.
                        </p>
                        <WipeConfirmInput
                          onConfirm={clearAllData}
                          onCancel={() => setWipeStep("idle")}
                        />
                      </div>
                    )}

                    {/* Wiping in progress */}
                    {wipeStep === "wiping" && (
                      <div className='wipe-progress'>
                        <span className='wipe-spinner' />
                        <span>{wipeProgress || "Clearing data…"}</span>
                      </div>
                    )}

                    {/* Done */}
                    {wipeStep === "done" && (
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          marginTop: "0.75rem",
                          color: "var(--color-text-success)",
                          fontSize: 13,
                        }}
                      >
                        <HiCheckCircle style={{ width: 16, height: 16 }} />
                        All data cleared successfully. Families were preserved.
                        <button
                          className='cancel-btn'
                          style={{ marginLeft: "auto" }}
                          onClick={() => setWipeStep("idle")}
                        >
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

      {/* ── Inline CSS ────────────────────────────────────────────── */}
      <style>{`
        .settings-page { max-width: 1100px; margin: 0 auto; padding: 0 1.5rem 3rem; }

        .settings-header {
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; padding-bottom: 1.5rem;
          border-bottom: 1px solid var(--color-border-tertiary);
        }
        .settings-header h1 { font-size: 1.5rem; font-weight: 600; margin: 0; }
        .settings-header p  { color: var(--color-text-secondary); margin: 0.25rem 0 0; font-size: 0.9rem; }

        .settings-layout { display: grid; grid-template-columns: 220px 1fr; gap: 2rem; }
        @media (max-width: 680px) { .settings-layout { grid-template-columns: 1fr; } }

        /* ── Nav ── */
        .settings-nav {
          display: flex; flex-direction: column; gap: 0.25rem;
          position: sticky; top: 1rem; align-self: start;
        }
        .settings-nav-item {
          display: flex; align-items: center; gap: 0.625rem;
          padding: 0.625rem 0.875rem; border-radius: var(--border-radius-md);
          border: none; background: transparent; cursor: pointer; width: 100%;
          text-align: left; font-size: 0.875rem; color: var(--color-text-secondary);
          transition: background 0.15s, color 0.15s;
        }
        .settings-nav-item:hover { background: var(--color-background-secondary); color: var(--color-text-primary); }
        .settings-nav-item.active { background: var(--color-background-info); color: var(--color-text-info); font-weight: 500; }
        .settings-nav-item svg { width: 18px; height: 18px; flex-shrink: 0; }

        /* ── Content ── */
        .settings-content {
          background: var(--color-background-primary);
          border: 1px solid var(--color-border-tertiary);
          border-radius: var(--border-radius-lg);
          padding: 2rem; min-height: 500px;
        }
        .settings-section { max-width: 680px; }
        .section-header { margin-bottom: 1.75rem; }
        .section-header h2 { font-size: 1.125rem; font-weight: 600; margin: 0 0 0.375rem; }
        .section-header p  { color: var(--color-text-secondary); margin: 0; font-size: 0.875rem; }

        .sub-section-title { font-size: 0.9rem; font-weight: 600; margin: 0 0 1rem; color: var(--color-text-primary); }
        .section-divider   { border: none; border-top: 1px solid var(--color-border-tertiary); margin: 1.75rem 0; }
        .optional          { font-weight: 400; color: var(--color-text-tertiary); font-size: 0.8rem; }

        .settings-grid { grid-template-columns: 1fr 1fr; }
        @media (max-width: 520px) { .settings-grid { grid-template-columns: 1fr; } }

        /* ── Logo ── */
        .logo-upload-area {
          display: flex; align-items: center; gap: 1.25rem;
          padding: 1.25rem; border: 1px dashed var(--color-border-secondary);
          border-radius: var(--border-radius-md); margin-bottom: 1.75rem;
        }
        .logo-preview {
          width: 72px; height: 72px; border-radius: var(--border-radius-md);
          background: var(--color-background-secondary);
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
        }
        .logo-preview img { width: 100%; height: 100%; object-fit: cover; }
        .logo-placeholder-icon { width: 32px; height: 32px; color: var(--color-text-tertiary); }
        .logo-label  { font-weight: 500; margin: 0 0 0.25rem; font-size: 0.875rem; }
        .logo-hint   { color: var(--color-text-secondary); font-size: 0.8rem; margin: 0 0 0.625rem; }
        .upload-btn  {
          display: inline-flex; align-items: center; gap: 0.375rem;
          padding: 0.4rem 0.875rem; border: 1px solid var(--color-border-secondary);
          border-radius: var(--border-radius-md); font-size: 0.8rem; cursor: pointer;
          background: var(--color-background-primary); color: var(--color-text-primary);
          transition: background 0.15s;
        }
        .upload-btn:hover { background: var(--color-background-secondary); }

        /* ── Academic status card ── */
        .academic-status-card {
          display: flex; gap: 0; border: 1px solid var(--color-border-tertiary);
          border-radius: var(--border-radius-md); overflow: hidden; margin-bottom: 1.75rem;
        }
        .academic-status-item  { flex: 1; padding: 1rem 1.25rem; }
        .academic-status-divider { width: 1px; background: var(--color-border-tertiary); }
        .status-label  { font-size: 0.75rem; color: var(--color-text-secondary); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.375rem; }
        .status-value  { font-size: 1rem; font-weight: 600; color: var(--color-text-primary); }
        .status-value.highlight { color: var(--color-text-info); }

        /* ── Toggle / switch ── */
        .toggle-list  { display: flex; flex-direction: column; gap: 0; }
        .toggle-row   {
          display: flex; align-items: center; justify-content: space-between;
          padding: 1rem 0; border-bottom: 1px solid var(--color-border-tertiary);
          gap: 1rem;
        }
        .toggle-row:last-child { border-bottom: none; }
        .toggle-label { font-size: 0.875rem; font-weight: 500; margin: 0 0 0.2rem; }
        .toggle-desc  { font-size: 0.8rem; color: var(--color-text-secondary); margin: 0; }

        .switch { position: relative; display: inline-block; width: 42px; height: 24px; flex-shrink: 0; }
        .switch input { opacity: 0; width: 0; height: 0; }
        .slider {
          position: absolute; cursor: pointer; inset: 0;
          background: var(--color-border-secondary);
          border-radius: 24px; transition: background 0.2s;
        }
        .slider::before {
          content: ""; position: absolute;
          height: 18px; width: 18px; left: 3px; bottom: 3px;
          background: white; border-radius: 50%; transition: transform 0.2s;
        }
        .switch input:checked + .slider { background: var(--color-text-info); }
        .switch input:checked + .slider::before { transform: translateX(18px); }

        /* ── Theme options ── */
        .theme-options { display: flex; gap: 1rem; flex-wrap: wrap; margin-bottom: 0.5rem; }
        .theme-option {
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          padding: 0.75rem; border: 2px solid var(--color-border-tertiary);
          border-radius: var(--border-radius-md); cursor: pointer; background: transparent;
          transition: border-color 0.15s; font-size: 0.8rem; color: var(--color-text-primary);
        }
        .theme-option.active { border-color: var(--color-text-info); }
        .theme-preview {
          width: 80px; height: 54px; border-radius: 6px; overflow: hidden;
          display: flex; border: 1px solid var(--color-border-tertiary);
        }
        .theme-preview-light { background: #f8f8f8; }
        .theme-preview-dark  { background: #1e1e1e; }
        .theme-preview-system { background: linear-gradient(135deg, #f8f8f8 50%, #1e1e1e 50%); }
        .preview-sidebar { width: 22px; background: rgba(0,0,0,0.08); height: 100%; }
        .theme-preview-dark .preview-sidebar { background: rgba(255,255,255,0.08); }
        .preview-content { flex: 1; padding: 6px; display: flex; flex-direction: column; gap: 4px; }
        .preview-bar { height: 6px; background: rgba(0,0,0,0.12); border-radius: 3px; }
        .theme-preview-dark .preview-bar { background: rgba(255,255,255,0.15); }
        .preview-bar.short { width: 60%; }

        /* ── Accent colours ── */
        .accent-colors { display: flex; gap: 0.625rem; flex-wrap: wrap; }
        .accent-dot {
          width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          transition: transform 0.15s, border-color 0.15s;
        }
        .accent-dot:hover { transform: scale(1.15); }
        .accent-dot.active { border-color: var(--color-border-primary); }
        .accent-dot svg { width: 16px; height: 16px; color: white; }

        /* ── Pin toggle ── */
        .pin-toggle {
          background: none; border: none; cursor: pointer; padding: 0 0.5rem;
          color: var(--color-text-secondary); display: flex; align-items: center;
        }

        /* ── Info row ── */
        .info-row { display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: var(--color-background-secondary); border-radius: var(--border-radius-md); }
        .info-icon { width: 20px; height: 20px; color: var(--color-text-secondary); }
        .info-label { font-size: 0.75rem; color: var(--color-text-secondary); margin: 0; }
        .info-value { font-size: 0.875rem; font-weight: 500; margin: 0.15rem 0 0; }

        .outline-btn {
          display: inline-flex; align-items: center; gap: 0.375rem;
          padding: 0.5rem 1rem; border: 1px solid var(--color-border-secondary);
          border-radius: var(--border-radius-md); background: transparent;
          color: var(--color-text-primary); font-size: 0.875rem; cursor: pointer;
          transition: background 0.15s;
        }
        .outline-btn:hover { background: var(--color-background-secondary); }

        /* ── Data actions ── */
        .data-action-grid { display: flex; flex-direction: column; gap: 0.75rem; }
        .data-action-card {
          display: flex; align-items: center; gap: 1rem;
          padding: 1rem 1.25rem; border: 1px solid var(--color-border-tertiary);
          border-radius: var(--border-radius-md); flex-wrap: wrap;
        }
        .data-action-icon { width: 22px; height: 22px; color: var(--color-text-secondary); flex-shrink: 0; }
        .data-action-card > div { flex: 1; }
        .data-action-title { font-size: 0.875rem; font-weight: 500; margin: 0 0 0.2rem; }
        .data-action-desc  { font-size: 0.8rem; color: var(--color-text-secondary); margin: 0; }

        /* ── Danger zone ── */
        .danger-title.sub-section-title { color: var(--color-text-danger); }
        .danger-zone { border: 1px solid var(--color-border-danger); border-radius: var(--border-radius-md); overflow: hidden; }
        .danger-card {
          display: flex; align-items: center; justify-content: space-between;
          gap: 1rem; padding: 1rem 1.25rem; flex-wrap: wrap;
        }
        .danger-card .danger-title { font-size: 0.875rem; font-weight: 500; margin: 0 0 0.2rem; color: var(--color-text-danger); }
        .danger-card .danger-desc  { font-size: 0.8rem; color: var(--color-text-secondary); margin: 0; }
        .danger-btn {
          padding: 0.5rem 1rem; background: var(--color-background-danger);
          color: var(--color-text-danger); border: 1px solid var(--color-border-danger);
          border-radius: var(--border-radius-md); cursor: pointer; font-size: 0.875rem;
        }
        .danger-btn-outline {
          display: inline-flex; align-items: center; gap: 0.375rem;
          padding: 0.5rem 1rem; border: 1px solid var(--color-border-danger);
          color: var(--color-text-danger); border-radius: var(--border-radius-md);
          background: transparent; cursor: pointer; font-size: 0.875rem; transition: background 0.15s;
        }
        .danger-btn-outline:hover { background: var(--color-background-danger); }

        /* ── Toast ── */
        .settings-toast {
          position: fixed; top: 1.25rem; right: 1.25rem; z-index: 9999;
          display: flex; align-items: center; gap: 0.625rem;
          padding: 0.75rem 1.25rem; border-radius: var(--border-radius-md);
          font-size: 0.875rem; font-weight: 500; box-shadow: 0 4px 16px rgba(0,0,0,0.12);
          animation: slideIn 0.2s ease;
        }
        .settings-toast.success { background: var(--color-background-success); color: var(--color-text-success); border: 1px solid var(--color-border-success); }
        .settings-toast.error   { background: var(--color-background-danger);  color: var(--color-text-danger);  border: 1px solid var(--color-border-danger);  }
        .settings-toast svg { width: 18px; height: 18px; flex-shrink: 0; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}

// ── WipeConfirmInput ───────────────────────────────────────────────────────
// Standalone mini-component to avoid state inside the settings render
function WipeConfirmInput({ onConfirm, onCancel }) {
  const [val, setVal] = useState("");
  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        marginTop: "0.75rem",
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
          border: "1px solid var(--color-border-danger)",
          borderRadius: 8,
          fontSize: 13,
          background: "var(--color-background-primary)",
          color: "var(--color-text-primary)",
          outline: "none",
        }}
        autoComplete='off'
        spellCheck={false}
      />
      <button
        className='danger-btn'
        disabled={val !== "DELETE"}
        style={{
          opacity: val !== "DELETE" ? 0.45 : 1,
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
