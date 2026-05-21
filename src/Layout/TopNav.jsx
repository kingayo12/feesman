import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../hooks/useRole";
import { PERMISSIONS } from "../config/permissions";
import { getAllStudents } from "../services/students/studentService";
import { getEnrollmentsByFilter } from "../services/students/enrollmentService";
import { getFamilies } from "../services/families/familyService";
import { getClasses } from "../services/class/classService";
import { getSettings } from "../services/settings/settingService";
import { getPreviousBalanceAmount } from "../services/previous_balance/Previousbalanceservice";
import { calculateStudentBalance } from "../hooks/Usestudentbalance";
import { FaBell } from "react-icons/fa";
import {
  HiSearch,
  HiX,
  HiAcademicCap,
  HiOutlineUsers,
  HiArrowRight,
  HiExclamationCircle,
  HiCurrencyDollar,
  HiTrendingUp,
  HiTrendingDown,
  HiCheckCircle,
  HiClock,
  HiRefresh,
  HiChevronDown,
  HiChevronRight,
  HiFilter,
  HiInformationCircle,
  HiReceiptTax,
  HiUserGroup,
  HiCalendar,
  HiStar,
  HiLightningBolt,
  HiWifi,
} from "react-icons/hi";
import { LuMoon, LuSun } from "react-icons/lu";
import { BiWifiOff } from "react-icons/bi";

/* ─────────────────────────────────────────────────────────────
   HOOKS
───────────────────────────────────────────────────────────── */
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("themePreference", theme);
    localStorage.setItem("theme", theme);
  } catch {}
}

function resolveThemePreference(themePreference) {
  if (themePreference === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return themePreference === "dark" ? "dark" : "light";
}

function getInitialTheme() {
  try {
    const preference = localStorage.getItem("themePreference");
    if (preference) return resolveThemePreference(preference);
    const storedTheme = localStorage.getItem("theme");
    if (storedTheme === "dark" || storedTheme === "light") return storedTheme;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" && navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}

function canAccessNotification(notification, access) {
  if (!access?.canUseNotifications) return false;
  const id = notification?.id || "";

  if (id.startsWith("summary") || id.startsWith("weekly") || id.startsWith("class_perf")) {
    return access.canViewReports;
  }
  if (id.startsWith("milestone")) {
    return access.canViewReports || access.canViewPayments;
  }
  if (id.startsWith("zero_pay") || id.startsWith("paid_families")) {
    return access.canViewFamilies || access.canViewPayments;
  }
  if (id.startsWith("debtors") || id.startsWith("arrears")) {
    return access.canViewStudents || access.canViewPayments;
  }
  if (id.startsWith("term_end")) {
    return access.canViewPayments || access.canViewReports;
  }

  return access.canViewPayments || access.canViewReports;
}

function filterNotificationsByAccess(notifications, access) {
  return (notifications || []).filter((n) => canAccessNotification(n, access));
}

/* ─────────────────────────────────────────────────────────────
   NOTIFICATION ENGINE
   Pulls live data and produces categorised notification objects.
───────────────────────────────────────────────────────────── */
const NOTIF_STORAGE_KEY = "feesman_notif_read_v1";

function getReadIds() {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIF_STORAGE_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function markRead(ids) {
  try {
    const existing = getReadIds();
    ids.forEach((id) => existing.add(id));
    localStorage.setItem(NOTIF_STORAGE_KEY, JSON.stringify([...existing].slice(-500)));
  } catch {}
}

const naira = (n) => `₦${Number(n || 0).toLocaleString("en-NG")}`;

async function buildNotifications(settings) {
  const session = settings?.academicYear;
  const term = settings?.currentTerm;

  if (!session || !term) return [];

  const [students, families, classes, enrollments] = await Promise.all([
    getAllStudents(),
    getFamilies(),
    getClasses(),
    getEnrollmentsByFilter({
      session,
      term,
    }),
  ]);

  if (!students?.length) return [];

  const classMap = (classes || []).reduce((map, cls) => {
    if (cls?.id) map[cls.id] = cls;
    return map;
  }, {});

  const familyMap = (families || []).reduce((map, family) => {
    if (family?.id) map[family.id] = family;
    return map;
  }, {});

  const enrollmentMap = (enrollments || []).reduce((map, enrollment) => {
    if (enrollment?.studentId) map[enrollment.studentId] = enrollment;
    return map;
  }, {});

  const enrichedStudents = await Promise.all(
    students.map(async (student) => {
      const enrollment = enrollmentMap[student.id] || {};
      const studentClass = classMap[enrollment.classId] || {};
      const family = familyMap[student.familyId] || {};
      const name =
        [student.firstName, student.lastName].filter(Boolean).join(" ") ||
        student.admissionNo ||
        student.id ||
        "Student";

      const balanceData =
        student.classId || enrollment.classId
          ? await calculateStudentBalance(student.id, enrollment.classId, session, term, {
              familyId: student.familyId,
              siblingCount: 1,
            })
          : {
              totalFees: 0,
              totalPaid: 0,
              balance: 0,
              previousBalance: await getPreviousBalanceAmount(student.id, session).catch(() => 0),
            };

      return {
        ...student,
        ...balanceData,
        classId: enrollment.classId || null,
        className: studentClass.name || studentClass.label || "Unknown class",
        familyName: family.familyName || family.name || "Unknown family",
        name,
        firstName: student.firstName || name,
        lastName: student.lastName || "",
        session: enrollment.session || null,
        term: enrollment.term || null,
      };
    }),
  );

  const studentsWithDebt = enrichedStudents.filter((student) => student.balance > 0);
  const studentsWithArrears = enrichedStudents.filter((student) => student.previousBalance > 0);

  const totalPaid = enrichedStudents.reduce(
    (sum, student) => sum + Number(student.totalPaid || 0),
    0,
  );
  const totalDue = enrichedStudents.reduce(
    (sum, student) => sum + Math.max(Number(student.totalFees || 0), 0),
    0,
  );
  const fullyPaid = enrichedStudents.filter(
    (student) => Number(student.totalFees || 0) > 0 && Number(student.balance || 0) <= 0,
  ).length;
  const partialPay = enrichedStudents.filter(
    (student) => Number(student.totalPaid || 0) > 0 && Number(student.balance || 0) > 0,
  ).length;
  const notPaid = enrichedStudents.filter(
    (student) => Number(student.totalPaid || 0) === 0 && Number(student.totalFees || 0) > 0,
  ).length;
  const collRate = totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 0;

  const classPerformance = (classes || [])
    .map((cls) => {
      const studentsInClass = enrichedStudents.filter((student) => student.classId === cls.id);
      const paid = studentsInClass.reduce(
        (sum, student) => sum + Number(student.totalPaid || 0),
        0,
      );
      const due = studentsInClass.reduce(
        (sum, student) => sum + Math.max(Number(student.totalFees || 0), 0),
        0,
      );
      const rate = due > 0 ? Math.round((paid / due) * 100) : 0;
      return {
        name: cls.name || cls.label || "Unnamed class",
        count: studentsInClass.length,
        paid,
        due,
        rate,
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return [
    {
      id: "summary_fees",
      title: "Fees collection summary",
      body: `${enrichedStudents.length} students enrolled for ${term} ${session}.`,
      category: "summary",
      icon: "chart",
      detail: {
        totalPaid,
        totalDue,
        collRate,
        fullyPaid,
        partialPay,
        notPaid,
      },
    },
    {
      id: "debtors_top_students",
      title: "Students with outstanding balances",
      body: `${studentsWithDebt.length} students currently owe fees this term.`,
      category: "alert",
      icon: "debt",
      detail: {
        totalOutstanding: studentsWithDebt.reduce(
          (sum, student) => sum + Number(student.balance || 0),
          0,
        ),
        enrichedStudents: studentsWithDebt
          .sort((a, b) => Number(b.balance || 0) - Number(a.balance || 0))
          .slice(0, 5),
      },
    },
    {
      id: "arrears_carried_forward",
      title: "Carried-forward arrears",
      body: `${studentsWithArrears.length} students still have previous balances.`,
      category: "alert",
      icon: "warning",
      detail: {
        totalArrears: studentsWithArrears.reduce(
          (sum, student) => sum + Number(student.previousBalance || 0),
          0,
        ),
        total: studentsWithArrears.length,
        students: studentsWithArrears,
        enrichedStudents: studentsWithArrears
          .sort((a, b) => Number(b.previousBalance || 0) - Number(a.previousBalance || 0))
          .slice(0, 5),
      },
    },
    {
      id: "class_perf_summary",
      title: "Class performance overview",
      body: "See how each class is collecting fees this term.",
      category: "info",
      icon: "school",
      detail: {
        classes: classPerformance,
      },
    },
  ];
}

/* ─────────────────────────────────────────────────────────────
   ICON COMPONENTS for notifications
───────────────────────────────────────────────────────────── */
function NotifIcon({ type, category }) {
  const icons = {
    chart: HiReceiptTax,
    "trending-up": HiTrendingUp,
    warning: HiExclamationCircle,
    debt: HiCurrencyDollar,
    check: HiCheckCircle,
    clock: HiClock,
    school: HiAcademicCap,
    calendar: HiCalendar,
    star: HiStar,
    info: HiInformationCircle,
  };
  const Ic = icons[type] || HiBell;
  return <Ic />;
}

/* ─────────────────────────────────────────────────────────────
   NOTIFICATION PANEL COMPONENT
───────────────────────────────────────────────────────────── */
function NotificationPanel({ onClose, navigate, access }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readIds, setReadIds] = useState(getReadIds);
  const [filter, setFilter] = useState("all");
  const [expanded, setExpanded] = useState(null);
  const [settings, setSettings] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await getSettings();
      setSettings(s);
      const notifs = await buildNotifications(s);
      setNotifications(filterNotificationsByAccess(notifs, access));
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
      setError("Could not load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [access]);

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return notifications;
    return notifications.filter((n) => n.category === filter);
  }, [notifications, filter]);

  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAllRead = () => {
    const ids = notifications.map((n) => n.id);
    markRead(ids);
    setReadIds(new Set([...readIds, ...ids]));
  };

  const handleExpand = (id) => {
    setExpanded((prev) => (prev === id ? null : id));
    // Mark as read on expand
    markRead([id]);
    setReadIds((prev) => new Set([...prev, id]));
  };

  const catColors = {
    summary: { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe", dot: "#3b82f6" },
    weekly: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", dot: "#22c55e" },
    alert: { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca", dot: "#ef4444" },
    success: { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0", dot: "#22c55e" },
    info: { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff", dot: "#a855f7" },
  };

  const filterTabs = [
    { key: "all", label: "All" },
    { key: "alert", label: "Alerts" },
    { key: "summary", label: "Reports" },
    { key: "success", label: "Good News" },
    { key: "info", label: "Insights" },
  ];

  return (
    <div className='np-panel' onClick={(e) => e.stopPropagation()}>
      {/* Header */}
      <div className='np-header'>
        <div className='np-header-left'>
          <h3 className='np-title'>Notifications</h3>
          {unreadCount > 0 && <span className='np-unread-badge'>{unreadCount} new</span>}
        </div>
        <div className='np-header-right'>
          {unreadCount > 0 && (
            <button className='np-mark-read-btn' onClick={markAllRead} title='Mark all as read'>
              <HiCheckCircle /> Mark all read
            </button>
          )}
          <button className='np-refresh-btn' onClick={load} title='Refresh' disabled={loading}>
            <HiRefresh className={loading ? "np-spin" : ""} />
          </button>
          <button className='np-close-btn' onClick={onClose}>
            <HiX />
          </button>
        </div>
      </div>

      {/* Context line */}
      {settings?.academicYear && (
        <div className='np-context'>
          <HiCalendar />
          {settings.academicYear} · {settings.currentTerm}
          {lastRefresh && (
            <span className='np-refresh-time'>
              · Updated{" "}
              {lastRefresh.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>
      )}

      {/* Filter tabs */}
      <div className='np-filters'>
        {filterTabs.map((tab) => (
          <button
            key={tab.key}
            className={`np-filter-tab ${filter === tab.key ? "active" : ""}`}
            onClick={() => setFilter(tab.key)}
          >
            {tab.label}
            {tab.key !== "all" && (
              <span className='np-filter-cnt'>
                {notifications.filter((n) => n.category === tab.key).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Body */}
      <div className='np-body'>
        {loading && (
          <div className='np-state'>
            <div className='np-spinner' />
            <p>Calculating your school's financial overview…</p>
          </div>
        )}

        {error && !loading && (
          <div className='np-state np-state-error'>
            <HiExclamationCircle />
            <p>{error}</p>
            <button className='np-retry-btn' onClick={load}>
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className='np-state'>
            <HiCheckCircle style={{ fontSize: "2rem", color: "#22c55e" }} />
            <p>No {filter !== "all" ? filter + " " : ""}notifications right now.</p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className='np-list'>
            {filtered.map((n) => {
              const isRead = readIds.has(n.id);
              const isExpanded = expanded === n.id;
              const colors = catColors[n.category] || catColors.info;

              return (
                <div
                  key={n.id}
                  className={`np-item ${isRead ? "read" : "unread"} ${isExpanded ? "expanded" : ""}`}
                >
                  <button className='np-item-header' onClick={() => handleExpand(n.id)}>
                    <span className='np-item-dot' style={{ background: colors.dot }} />
                    <span
                      className='np-item-icon'
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      <NotifIcon type={n.icon} category={n.category} />
                    </span>
                    <div className='np-item-text'>
                      <span className='np-item-title'>{n.title}</span>
                      <span className='np-item-body'>{n.body}</span>
                    </div>
                    <HiChevronRight className={`np-item-chevron ${isExpanded ? "open" : ""}`} />
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className='np-item-detail'>
                      <NotifDetail notification={n} navigate={navigate} onClose={onClose} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {!loading && !error && (
        <div className='np-footer'>
          <button
            className='np-footer-link'
            onClick={() => {
              navigate("/");
              onClose();
            }}
          >
            Go to Dashboard <HiArrowRight />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   DETAIL VIEWS per notification type
───────────────────────────────────────────────────────────── */
function NotifDetail({ notification: n, navigate, onClose }) {
  const go = (path) => {
    navigate(path);
    onClose();
  };

  if (n.category === "summary") {
    const d = n.detail;
    return (
      <div className='nd-summary'>
        <div className='nd-stat-row'>
          <div className='nd-stat'>
            <span className='nd-stat-val nd-blue'>{naira(d.totalPaid)}</span>
            <span className='nd-stat-label'>Collected</span>
          </div>
          <div className='nd-stat'>
            <span className='nd-stat-val'>{naira(d.totalDue)}</span>
            <span className='nd-stat-label'>Expected</span>
          </div>
          <div className='nd-stat'>
            <span className='nd-stat-val nd-green'>{d.collRate}%</span>
            <span className='nd-stat-label'>Rate</span>
          </div>
        </div>
        <div className='nd-progress-wrap'>
          <div
            className='nd-progress-bar'
            style={{
              width: `${d.collRate}%`,
              background: d.collRate >= 75 ? "#22c55e" : d.collRate >= 50 ? "#f59e0b" : "#ef4444",
            }}
          />
        </div>
        <div className='nd-pill-row'>
          <span className='nd-pill nd-pill-green'>
            <HiCheckCircle /> {d.fullyPaid} paid
          </span>
          <span className='nd-pill nd-pill-amber'>⚡ {d.partialPay} partial</span>
          <span className='nd-pill nd-pill-red'>
            <HiExclamationCircle /> {d.notPaid} none
          </span>
        </div>
      </div>
    );
  }

  if (n.category === "weekly") {
    const d = n.detail;
    return (
      <div className='nd-list-wrap'>
        <div className='nd-sub-header'>
          <span className='nd-sub-label'>Total this week</span>
          <span className='nd-sub-val nd-green'>{naira(d.weeklyTotal)}</span>
        </div>
        <div className='nd-mini-list'>
          {d.weeklyPayments.slice(0, 6).map((p, i) => (
            <div key={i} className='nd-mini-row'>
              <span className='nd-mini-name'>{p.studentName}</span>
              <span className='nd-mini-sub'>
                {p.familyName} · {p.method || "Cash"}
              </span>
              <span className='nd-mini-amt nd-green'>{naira(p.amount)}</span>
            </div>
          ))}
        </div>
        {d.weeklyPayments.length > 6 && (
          <p className='nd-more'>+{d.weeklyPayments.length - 6} more payments</p>
        )}
      </div>
    );
  }

  if (n.id.startsWith("zero_pay")) {
    const d = n.detail;
    return (
      <div className='nd-list-wrap'>
        <div className='nd-sub-header'>
          <span className='nd-sub-label'>{d.total} families — no payment yet</span>
        </div>
        <div className='nd-mini-list'>
          {d.families.map((f, i) => (
            <div key={i} className='nd-mini-row'>
              <span className='nd-mini-name'>{f.name} Family</span>
              <span className='nd-mini-sub'>
                {f.count} student{f.count !== 1 ? "s" : ""}
              </span>
              <span className='nd-mini-amt nd-red'>{naira(f.totalOwed)}</span>
            </div>
          ))}
        </div>
        <button className='nd-action-btn' onClick={() => go("/families")}>
          View all families <HiArrowRight />
        </button>
      </div>
    );
  }

  if (n.id.startsWith("debtors")) {
    const d = n.detail;
    return (
      <div className='nd-list-wrap'>
        <div className='nd-sub-header'>
          <span className='nd-sub-label'>Highest outstanding balances</span>
          <span className='nd-sub-val nd-red'>{naira(d.totalOutstanding)}</span>
        </div>
        <div className='nd-mini-list'>
          {d.enrichedStudents.map((s, i) => (
            <div key={i} className='nd-mini-row'>
              <span className='nd-mini-name'>
                {s.firstName} {s.lastName}
              </span>
              <span className='nd-mini-sub'>
                {s.className} · {s.familyName}
              </span>
              <span className='nd-mini-amt nd-red'>{naira(s.balance)}</span>
            </div>
          ))}
        </div>
        <button className='nd-action-btn' onClick={() => go("/students")}>
          View all students <HiArrowRight />
        </button>
      </div>
    );
  }

  if (n.id.startsWith("arrears")) {
    const d = n.detail;
    return (
      <div className='nd-list-wrap'>
        <div className='nd-sub-header'>
          <span className='nd-sub-label'>Carried-forward arrears</span>
          <span className='nd-sub-val nd-amber'>{naira(d.totalArrears)}</span>
        </div>
        <div className='nd-mini-list'>
          {d.enrichedStudents.map((s, i) => (
            <div key={i} className='nd-mini-row'>
              <span className='nd-mini-name'>{s.name}</span>
              <span className='nd-mini-sub'>{s.className}</span>
              <span className='nd-mini-amt nd-amber'>{naira(s.amount)}</span>
            </div>
          ))}
        </div>
        {d.total > d.students.length && (
          <p className='nd-more'>+{d.total - d.students.length} more students with arrears</p>
        )}
      </div>
    );
  }

  if (n.id.startsWith("class_perf")) {
    const d = n.detail;
    return (
      <div className='nd-list-wrap'>
        {d.classes.map((c, i) => (
          <div key={i} className='nd-class-row'>
            <div className='nd-class-info'>
              <span className='nd-mini-name'>{c.name}</span>
              <span className='nd-mini-sub'>
                {c.count} students · {naira(c.paid)} of {naira(c.due)}
              </span>
            </div>
            <div className='nd-class-bar-wrap'>
              <div
                className='nd-class-bar'
                style={{
                  width: `${c.rate}%`,
                  background: c.rate >= 75 ? "#22c55e" : c.rate >= 50 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
            <span
              className={`nd-class-rate ${c.rate >= 75 ? "nd-green" : c.rate >= 50 ? "nd-amber" : "nd-red"}`}
            >
              {c.rate}%
            </span>
          </div>
        ))}
      </div>
    );
  }

  if (n.id.startsWith("term_end")) {
    const d = n.detail;
    return (
      <div className='nd-summary'>
        <div className='nd-stat-row'>
          <div className='nd-stat'>
            <span className={`nd-stat-val ${d.daysLeft <= 7 ? "nd-red" : "nd-amber"}`}>
              {d.daysLeft}
            </span>
            <span className='nd-stat-label'>Days left</span>
          </div>
          <div className='nd-stat'>
            <span className='nd-stat-val nd-red'>{d.outstanding}</span>
            <span className='nd-stat-label'>Students owing</span>
          </div>
        </div>
        <p className='nd-tip'>
          Consider sending fee reminder letters to families with outstanding balances.
        </p>
        <button className='nd-action-btn' onClick={() => go("/letters?template=fees_reminder")}>
          Generate reminder letters <HiArrowRight />
        </button>
      </div>
    );
  }

  if (n.id.startsWith("milestone") || n.id.startsWith("paid_families")) {
    return (
      <div className='nd-celebrate'>
        <div className='nd-celebrate-icon'>🎉</div>
        <p className='nd-celebrate-text'>{n.body}</p>
      </div>
    );
  }

  return <p className='nd-generic'>{n.body}</p>;
}

/* ─────────────────────────────────────────────────────────────
   MAIN TOPNAV EXPORT
───────────────────────────────────────────────────────────── */
export default function TopNav() {
  const { user, logout } = useAuth();
  const { can } = useRole();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();

  const canViewPayments = can(PERMISSIONS.VIEW_PAYMENTS);
  const canViewReports = can(PERMISSIONS.VIEW_REPORTS) || can(PERMISSIONS.VIEW_FULL_DASHBOARD);
  const canViewFamilies = can(PERMISSIONS.VIEW_FAMILIES);
  const canViewStudents = can(PERMISSIONS.VIEW_STUDENTS);
  const canUseNotifications =
    canViewPayments || canViewReports || canViewFamilies || canViewStudents;
  const canSearchStudents = can(PERMISSIONS.VIEW_STUDENTS);
  const canSearchFamilies = can(PERMISSIONS.VIEW_FAMILIES);
  const canUseSearch = canSearchStudents || canSearchFamilies;

  const notifAccess = useMemo(
    () => ({
      canUseNotifications,
      canViewPayments,
      canViewReports,
      canViewFamilies,
      canViewStudents,
    }),
    [canUseNotifications, canViewPayments, canViewReports, canViewFamilies, canViewStudents],
  );

  // Theme
  const [theme, setTheme] = useState(getInitialTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const syncTheme = async () => {
      try {
        const settings = await getSettings();
        if (!settings?.theme) return;
        const resolved = resolveThemePreference(settings.theme);
        setTheme(resolved);
      } catch {}
    };
    syncTheme();

    const onThemeChange = (event) => {
      const nextTheme = event?.detail?.resolvedTheme || event?.detail?.theme;
      if (nextTheme === "dark" || nextTheme === "light") setTheme(nextTheme);
    };
    window.addEventListener("feesman-theme-change", onThemeChange);
    return () => window.removeEventListener("feesman-theme-change", onThemeChange);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      try {
        const preference = localStorage.getItem("themePreference");
        if (preference === "system") setTheme(resolveThemePreference("system"));
      } catch {}
    };
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ students: [], families: [] });
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const [allStudents, setAllStudents] = useState(null);
  const [allFamilies, setAllFamilies] = useState(null);
  const inputRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Notifications
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifBadge, setNotifBadge] = useState(0);
  const notifRef = useRef(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  // Compute badge count on mount
  useEffect(() => {
    if (!canUseNotifications) {
      setNotifBadge(0);
      return;
    }
    const compute = async () => {
      try {
        const s = await getSettings();
        const notifs = await buildNotifications(s);
        const visibleNotifs = filterNotificationsByAccess(notifs, notifAccess);
        const readIds = getReadIds();
        setNotifBadge(visibleNotifs.filter((n) => !readIds.has(n.id)).length);
      } catch {}
    };
    compute();
  }, [canUseNotifications, notifAccess]);

  // Close notif panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [userMenuOpen]);

  // Search data loading
  const loadData = useCallback(async () => {
    if (allStudents && allFamilies) return;
    setSearching(true);
    setSearchError(null);
    try {
      const [s, f] = await Promise.all([
        canSearchStudents ? getAllStudents() : Promise.resolve([]),
        canSearchFamilies ? getFamilies() : Promise.resolve([]),
      ]);
      setAllStudents(s || []);
      setAllFamilies(f || []);
    } catch {
      setSearchError("Failed to load data. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [allStudents, allFamilies, canSearchStudents, canSearchFamilies]);

  const openSearch = () => {
    setSearchOpen(true);
    loadData();
    setTimeout(() => inputRef.current?.focus(), 50);
  };
  const closeSearch = () => {
    setSearchOpen(false);
    setQuery("");
    setResults({ students: [], families: [] });
  };

  useEffect(() => {
    if (!debouncedQuery.trim() || !allStudents || !allFamilies) {
      setResults({ students: [], families: [] });
      return;
    }
    const q = debouncedQuery.toLowerCase().trim();
    const matchedStudents = allStudents.filter((s) =>
      [s.firstName, s.lastName, s.admissionNo, s.id, s.session]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
    const matchedFamilies = allFamilies.filter((f) =>
      [f.familyName, f.phone, f.email, f.address]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
    setResults({ students: matchedStudents.slice(0, 8), families: matchedFamilies.slice(0, 5) });
  }, [debouncedQuery, allStudents, allFamilies]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        if (!canUseSearch) return;
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape" && searchOpen) closeSearch();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen, canUseSearch]);

  const goTo = (path) => {
    closeSearch();
    navigate(path);
  };
  const totalResults = results.students.length + results.families.length;
  const hasQuery = debouncedQuery.trim().length > 0;

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.split(" ");
    return parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : parts[0][0].toUpperCase();
  };

  const openProfileTab = (tab) => {
    setUserMenuOpen(false);
    navigate(`/profile?tab=${tab}`);
  };

  const openSettings = (tab) => {
    setUserMenuOpen(false);
    navigate(`/${tab}`);
  };

  const handleLogout = async () => {
    setUserMenuOpen(false);
    await logout();
    navigate("/");
  };

  return (
    <>
      {/* ── Top bar ── */}
      <header className='top-nav'>
        <h1 className='app-title'>Feesman</h1>
        <div className='top-nav-actions'>
          {/* Online Status Indicator */}
          <div
            className='online-status-indicator'
            title={isOnline ? "Connected" : "Offline - using cached data"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 8px",
              borderRadius: "6px",
              backgroundColor: isOnline ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
              color: isOnline ? "#22c55e" : "#ef4444",
              fontSize: "12px",
              fontWeight: "500",
            }}
          >
            {isOnline ? (
              <>
                <HiWifi size={14} title='Online' />
              </>
            ) : (
              <>
                <BiWifiOff size={14} title='Offline' />
              </>
            )}
          </div>

          {/* Search */}
          {canUseSearch && (
            <button className='nav-search-btn' onClick={openSearch} title='Search (Ctrl+K)'>
              <HiSearch />
              <span className='nav-search-label'>Search…</span>
              <kbd className='nav-search-kbd'>⌘K</kbd>
            </button>
          )}

          {/* Theme */}
          <button
            className='theme-toggle-btn icon-btn'
            onClick={toggleTheme}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? (
              <LuSun className='icon-color' size={18} />
            ) : (
              <LuMoon className='icon-color' size={18} />
            )}
          </button>

          {/* Notifications */}
          {canUseNotifications && (
            <div className='np-trigger-wrap' ref={notifRef}>
              <button
                className='notification-btn icon-btn'
                onClick={() => {
                  setNotifOpen((o) => !o);
                  setNotifBadge(0);
                }}
                title='Notifications'
              >
                <FaBell />
                {notifBadge > 0 && (
                  <span className='notification-badge np-live-badge'>
                    {notifBadge > 9 ? "9+" : notifBadge}
                  </span>
                )}
              </button>

              {notifOpen && (
                <NotificationPanel
                  onClose={() => setNotifOpen(false)}
                  navigate={navigate}
                  access={notifAccess}
                />
              )}
            </div>
          )}

          {/* User */}
          <div className='user-menu-wrap' ref={userMenuRef}>
            <button
              className='user-profile user-profile-trigger'
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-expanded={userMenuOpen}
              aria-haspopup='menu'
            >
              <div className='user-info'>
                <p className='user-name'>{user?.displayName || user?.name || "User"}</p>
                <p className='user-role'>{user?.role || "Staff"}</p>
              </div>
              <div className='avatar'>
                {user?.photoURL ? (
                  <img src={user.photoURL} alt='Profile' className='avatar-img' />
                ) : (
                  <span className='avatar-initials'>
                    {getInitials(user?.displayName || user?.email)}
                  </span>
                )}
              </div>
              <HiChevronDown
                className={`user-menu-caret ${userMenuOpen ? "open" : ""}`}
                aria-hidden='true'
              />
            </button>

            {userMenuOpen && (
              <div className='user-menu-dropdown' role='menu'>
                <button className='user-menu-item' onClick={() => openProfileTab("profile")}>
                  User Profile
                </button>
                <button className='user-menu-item' onClick={() => openProfileTab("password")}>
                  Change Password
                </button>
                <button className='user-menu-item' onClick={() => openProfileTab("theme")}>
                  Select Theme
                </button>
                <button className='user-menu-item' onClick={() => openSettings("settings")}>
                  settings
                </button>
                <button className='user-menu-item logout' onClick={handleLogout}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Search modal ── */}
      {searchOpen && canUseSearch && (
        <div className='search-overlay' onClick={closeSearch}>
          <div
            className='search-modal'
            onClick={(e) => e.stopPropagation()}
            role='dialog'
            aria-modal='true'
            aria-label='Search'
          >
            <div className='search-input-row'>
              <HiSearch className='search-modal-icon' />
              <input
                ref={inputRef}
                className='search-modal-input'
                type='text'
                placeholder='Search by name, admission no, family…'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoComplete='off'
              />
              {query && (
                <button className='search-clear-btn' onClick={() => setQuery("")}>
                  <HiX />
                </button>
              )}
              <button className='search-close-btn' onClick={closeSearch}>
                <kbd>Esc</kbd>
              </button>
            </div>
            <div className='search-modal-body'>
              {searching && (
                <div className='search-state'>
                  <div className='search-spinner' />
                  <p>Loading records…</p>
                </div>
              )}
              {searchError && !searching && (
                <div className='search-state error'>
                  <HiExclamationCircle />
                  <p>{searchError}</p>
                </div>
              )}
              {!searching && !searchError && !hasQuery && (
                <div className='search-hints'>
                  <p className='search-hint-title'>Quick search</p>
                  <div className='search-hint-list'>
                    <span className='search-hint-chip'>Student name</span>
                    <span className='search-hint-chip'>Admission no</span>
                    <span className='search-hint-chip'>Family name</span>
                    <span className='search-hint-chip'>Phone number</span>
                  </div>
                  <p className='search-hint-tip'>
                    Tip: Press <kbd>Ctrl+K</kbd> anywhere to open search
                  </p>
                </div>
              )}
              {!searching && !searchError && hasQuery && totalResults === 0 && (
                <div className='search-state'>
                  <p>
                    No results for "<strong>{debouncedQuery}</strong>"
                  </p>
                </div>
              )}
              {!searching && !searchError && totalResults > 0 && (
                <div className='search-results'>
                  {results.students.length > 0 && (
                    <div className='search-group'>
                      <p className='search-group-label'>
                        <HiAcademicCap /> Students ({results.students.length})
                      </p>
                      {results.students.map((s) => (
                        <button
                          key={s.id}
                          className='search-result-item'
                          onClick={() => goTo(`/students/${s.id}`)}
                        >
                          <div className='result-avatar student-avatar-sm'>
                            {s.firstName?.[0]}
                            {s.lastName?.[0]}
                          </div>
                          <div className='result-info'>
                            <span className='result-name'>
                              {s.firstName} {s.otherName ? s.otherName + " " : ""}
                              {s.lastName}
                            </span>
                            <span className='result-meta'>
                              {s.admissionNo && <span>No. {s.admissionNo}</span>}
                              {s.session && <span>{s.session}</span>}
                            </span>
                          </div>
                          <HiArrowRight className='result-arrow' />
                        </button>
                      ))}
                    </div>
                  )}
                  {results.families.length > 0 && (
                    <div className='search-group'>
                      <p className='search-group-label'>
                        <HiOutlineUsers /> Families ({results.families.length})
                      </p>
                      {results.families.map((f) => (
                        <button
                          key={f.id}
                          className='search-result-item'
                          onClick={() => goTo(`/families/${f.id}`)}
                        >
                          <div className='result-avatar family-avatar-sm'>{f.familyName?.[0]}</div>
                          <div className='result-info'>
                            <span className='result-name'>{f.familyName} Family</span>
                            <span className='result-meta'>
                              {f.phone && <span>{f.phone}</span>}
                              {f.email && <span>{f.email}</span>}
                            </span>
                          </div>
                          <HiArrowRight className='result-arrow' />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {totalResults > 0 && (
              <div className='search-modal-footer'>
                <span>
                  {totalResults} result{totalResults !== 1 ? "s" : ""}
                </span>
                <span>↑↓ navigate · Enter select · Esc close</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
