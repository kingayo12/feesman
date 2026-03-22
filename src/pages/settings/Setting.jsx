import { useEffect, useState } from "react";
import { getSettings, updateSettings } from "./settingService";
import {
  HiOfficeBuilding,
  HiCalendar,
  HiMail,
  HiPhone,
  HiSave,
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

  useEffect(() => {
    async function load() {
      const data = await getSettings();
      if (data) setSettings((prev) => ({ ...prev, ...data }));
      setLoading(false);
    }
    load();
  }, []);

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
                <div className='danger-card'>
                  <div>
                    <p className='danger-title'>Clear all fee overrides</p>
                    <p className='danger-desc'>
                      Remove all per-student fee exclusions. This cannot be undone.
                    </p>
                  </div>
                  {confirmClear ? (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className='danger-btn'
                        onClick={() => {
                          setConfirmClear(false);
                          alert("Overrides cleared.");
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Inline CSS ────────────────────────────────────────────── */}
      <style>{`
       
      `}</style>
    </div>
  );
}
