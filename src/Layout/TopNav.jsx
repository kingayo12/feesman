import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAllStudents } from "../pages/students/studentService";
import { getFamilies } from "../pages/families/familyService";
import { getClasses } from "../pages/classes/classService";
import { getSettings } from "../pages/settings/settingService";
import { getFeesByClass } from "../pages/fees/feesService";
import { getPaymentsByStudent } from "../pages/fees/paymentService";
import { getPreviousBalanceAmount } from "../pages/previous_balance/Previousbalanceservice";
import { getStudentFeeOverrides } from "../pages/students/studentFeeOverrideService";
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
  HiChevronRight,
  HiFilter,
  HiInformationCircle,
  HiReceiptTax,
  HiUserGroup,
  HiCalendar,
  HiStar,
  HiLightningBolt,
} from "react-icons/hi";
import { LuMoon, LuSun } from "react-icons/lu";

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

function getInitialTheme() {
  try {
    const s = localStorage.getItem("theme");
    if (s) return s;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}
function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem("theme", theme);
  } catch {}
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

  const [students, families, classes] = await Promise.all([
    getAllStudents(),
    getFamilies(),
    getClasses(),
  ]);

  if (!students?.length) return [];

  /* Enrich every student with fee/payment data */
  const enriched = await Promise.all(
    students.map(async (student) => {
      try {
        const [fees, payments, overrides, prevBal] = await Promise.all([
          getFeesByClass(student.classId, session, term),
          getPaymentsByStudent(student.id),
          getStudentFeeOverrides(student.id),
          getPreviousBalanceAmount(student.id, session),
        ]);
        const disabledIds = new Set(overrides.map((o) => o.feeId));
        const effectiveFees = fees.filter((f) => !disabledIds.has(f.id));
        const totalDue =
          effectiveFees.reduce((s, f) => s + Number(f.amount || 0), 0) + Number(prevBal || 0);
        const termPaid = payments
          .filter((p) => p.term === term)
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        const allPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
        const balance = totalDue - termPaid;
        const family = families?.find((f) => f.id === student.familyId);
        const cls = classes?.find((c) => c.id === student.classId);
        return {
          ...student,
          totalDue,
          termPaid,
          allPaid,
          balance,
          prevBal: Number(prevBal || 0),
          payStatus: balance <= 0 ? "paid" : termPaid > 0 ? "partial" : "unpaid",
          familyName: family?.familyName || "",
          className: cls?.name || "",
          recentPayments: payments.filter((p) => {
            const d = p.date?.toDate ? p.date.toDate() : new Date(p.date);
            return Date.now() - d.getTime() < 7 * 86400000;
          }),
        };
      } catch {
        return {
          ...student,
          totalDue: 0,
          termPaid: 0,
          allPaid: 0,
          balance: 0,
          prevBal: 0,
          payStatus: "unknown",
          recentPayments: [],
        };
      }
    }),
  );

  const notifications = [];
  const now = Date.now();

  /* ── 1. COLLECTION SUMMARY ── */
  const totalDueAll = enriched.reduce((s, st) => s + st.totalDue, 0);
  const totalPaidAll = enriched.reduce((s, st) => s + st.termPaid, 0);
  const collRate = totalDueAll > 0 ? Math.round((totalPaidAll / totalDueAll) * 100) : 0;
  const fullyPaid = enriched.filter((s) => s.payStatus === "paid").length;
  const partialPay = enriched.filter((s) => s.payStatus === "partial").length;
  const notPaid = enriched.filter((s) => s.payStatus === "unpaid").length;

  notifications.push({
    id: `summary_${session}_${term}`,
    category: "summary",
    priority: 1,
    icon: "chart",
    title: `${term} Collection Summary`,
    body: `${naira(totalPaidAll)} collected of ${naira(totalDueAll)} total (${collRate}% rate)`,
    detail: {
      totalDue: totalDueAll,
      totalPaid: totalPaidAll,
      collRate,
      fullyPaid,
      partialPay,
      notPaid,
      total: enriched.length,
    },
    timestamp: now,
    action: null,
  });

  /* ── 2. WEEKLY PAYMENTS (last 7 days) ── */
  const weeklyPayments = enriched.flatMap((s) =>
    s.recentPayments.map((p) => ({
      ...p,
      studentName: `${s.firstName} ${s.lastName}`,
      familyName: s.familyName,
    })),
  );
  const weeklyTotal = weeklyPayments.reduce((s, p) => s + Number(p.amount || 0), 0);
  if (weeklyPayments.length > 0) {
    notifications.push({
      id: `weekly_${Math.floor(now / (86400000 * 7))}`,
      category: "weekly",
      priority: 2,
      icon: "trending-up",
      title: "This Week's Collections",
      body: `${naira(weeklyTotal)} received across ${weeklyPayments.length} payment${weeklyPayments.length !== 1 ? "s" : ""}`,
      detail: { weeklyTotal, weeklyPayments: weeklyPayments.slice(0, 10) },
      timestamp: now,
      action: null,
    });
  }

  /* ── 3. FAMILIES WITH ZERO PAYMENT ── */
  const familyMap = {};
  enriched.forEach((s) => {
    if (!s.familyId) return;
    if (!familyMap[s.familyId]) familyMap[s.familyId] = { name: s.familyName, students: [] };
    familyMap[s.familyId].students.push(s);
  });

  const zeroPayFamilies = Object.values(familyMap)
    .filter(
      (f) =>
        f.students.every((s) => s.payStatus === "unpaid") && f.students.some((s) => s.totalDue > 0),
    )
    .map((f) => ({
      name: f.name,
      totalOwed: f.students.reduce((s, st) => s + st.balance, 0),
      count: f.students.length,
    }))
    .sort((a, b) => b.totalOwed - a.totalOwed);

  if (zeroPayFamilies.length > 0) {
    const topOwed = zeroPayFamilies.slice(0, 5);
    notifications.push({
      id: `zero_pay_${session}_${term}`,
      category: "alert",
      priority: 1,
      icon: "warning",
      title: `${zeroPayFamilies.length} Famil${zeroPayFamilies.length === 1 ? "y" : "ies"} Haven't Paid`,
      body: `${zeroPayFamilies.length} families have made zero payment this term`,
      detail: { families: topOwed, total: zeroPayFamilies.length },
      timestamp: now,
      action: { label: "View all", path: "/families" },
    });
  }

  /* ── 4. HIGHEST DEBTORS ── */
  const highDebtors = enriched
    .filter((s) => s.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, 5);

  if (highDebtors.length > 0) {
    const totalOutstanding = enriched.reduce((s, st) => s + Math.max(st.balance, 0), 0);
    notifications.push({
      id: `debtors_${session}_${term}`,
      category: "alert",
      priority: 2,
      icon: "debt",
      title: `${naira(totalOutstanding)} Outstanding`,
      body: `${enriched.filter((s) => s.balance > 0).length} students still owe fees this term`,
      detail: { students: highDebtors, totalOutstanding },
      timestamp: now,
      action: { label: "View all", path: "/students" },
    });
  }

  /* ── 5. FULLY PAID FAMILIES (celebrate!) ── */
  const paidFamilies = Object.values(familyMap).filter(
    (f) => f.students.length > 0 && f.students.every((s) => s.payStatus === "paid"),
  ).length;

  if (paidFamilies > 0) {
    notifications.push({
      id: `paid_families_${session}_${term}`,
      category: "success",
      priority: 3,
      icon: "check",
      title: `${paidFamilies} Famil${paidFamilies === 1 ? "y" : "ies"} Fully Settled`,
      body: `${paidFamilies} famil${paidFamilies === 1 ? "y has" : "ies have"} cleared all fees for ${term}`,
      detail: { count: paidFamilies },
      timestamp: now,
      action: null,
    });
  }

  /* ── 6. STUDENTS WITH ARREARS ── */
  const arrearsStudents = enriched.filter((s) => s.prevBal > 0);
  if (arrearsStudents.length > 0) {
    const totalArrears = arrearsStudents.reduce((s, st) => s + st.prevBal, 0);
    notifications.push({
      id: `arrears_${session}_${term}`,
      category: "alert",
      priority: 3,
      icon: "clock",
      title: `${arrearsStudents.length} Students with Arrears`,
      body: `${naira(totalArrears)} in carried-forward balances from previous sessions`,
      detail: {
        students: arrearsStudents.slice(0, 5).map((s) => ({
          name: `${s.firstName} ${s.lastName}`,
          amount: s.prevBal,
          className: s.className,
        })),
        total: arrearsStudents.length,
        totalArrears,
      },
      timestamp: now,
      action: null,
    });
  }

  /* ── 7. CLASS-BY-CLASS BREAKDOWN ── */
  const classStats = {};
  enriched.forEach((s) => {
    if (!s.classId) return;
    if (!classStats[s.classId])
      classStats[s.classId] = { name: s.className, due: 0, paid: 0, count: 0 };
    classStats[s.classId].due += s.totalDue;
    classStats[s.classId].paid += s.termPaid;
    classStats[s.classId].count++;
  });
  const classBreakdown = Object.values(classStats)
    .filter((c) => c.due > 0)
    .map((c) => ({ ...c, rate: Math.round((c.paid / c.due) * 100) }))
    .sort((a, b) => b.rate - a.rate);

  if (classBreakdown.length > 0) {
    const bestClass = classBreakdown[0];
    const worstClass = classBreakdown[classBreakdown.length - 1];
    notifications.push({
      id: `class_perf_${session}_${term}`,
      category: "info",
      priority: 4,
      icon: "school",
      title: "Class Performance",
      body: `Best: ${bestClass.name} (${bestClass.rate}%) · Needs attention: ${worstClass.name} (${worstClass.rate}%)`,
      detail: { classes: classBreakdown },
      timestamp: now,
      action: null,
    });
  }

  /* ── 8. TERM DATE ALERT ── */
  if (settings?.termEndDate) {
    const termEnd = new Date(settings.termEndDate);
    const daysLeft = Math.ceil((termEnd - new Date()) / 86400000);
    if (daysLeft > 0 && daysLeft <= 30) {
      notifications.push({
        id: `term_end_${settings.termEndDate}`,
        category: daysLeft <= 7 ? "alert" : "info",
        priority: daysLeft <= 7 ? 1 : 3,
        icon: "calendar",
        title: `Term Ends in ${daysLeft} Day${daysLeft !== 1 ? "s" : ""}`,
        body: `${enriched.filter((s) => s.balance > 0).length} students still have outstanding balances`,
        detail: {
          daysLeft,
          termEndDate: settings.termEndDate,
          outstanding: enriched.filter((s) => s.balance > 0).length,
        },
        timestamp: now,
        action: null,
      });
    }
  }

  /* ── 9. COLLECTION MILESTONE ── */
  const milestones = [25, 50, 75, 90, 100];
  const milestone = milestones.filter((m) => collRate >= m).pop();
  if (milestone) {
    notifications.push({
      id: `milestone_${milestone}_${session}_${term}`,
      category: "success",
      priority: 4,
      icon: "star",
      title: `${milestone}% Collection Milestone Reached!`,
      body: `The school has collected ${milestone}% of expected fees for ${term}`,
      detail: { milestone, collRate, totalPaid: totalPaidAll, totalDue: totalDueAll },
      timestamp: now,
      action: null,
    });
  }

  return notifications.sort((a, b) => a.priority - b.priority);
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
function NotificationPanel({ onClose, navigate }) {
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
      setNotifications(notifs);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
      setError("Could not load notifications. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

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
          {d.students.map((s, i) => (
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
          {d.students.map((s, i) => (
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
  const navigate = useNavigate();

  // Theme
  const [theme, setTheme] = useState(getInitialTheme);
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);
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

  // Compute badge count on mount
  useEffect(() => {
    const compute = async () => {
      try {
        const s = await getSettings();
        const notifs = await buildNotifications(s);
        const readIds = getReadIds();
        setNotifBadge(notifs.filter((n) => !readIds.has(n.id)).length);
      } catch {}
    };
    compute();
  }, []);

  // Close notif panel on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  // Search data loading
  const loadData = useCallback(async () => {
    if (allStudents && allFamilies) return;
    setSearching(true);
    setSearchError(null);
    try {
      const [s, f] = await Promise.all([getAllStudents(), getFamilies()]);
      setAllStudents(s || []);
      setAllFamilies(f || []);
    } catch {
      setSearchError("Failed to load data. Please try again.");
    } finally {
      setSearching(false);
    }
  }, [allStudents, allFamilies]);

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
        e.preventDefault();
        openSearch();
      }
      if (e.key === "Escape" && searchOpen) closeSearch();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [searchOpen]);

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

  return (
    <>
      {/* ── Top bar ── */}
      <header className='top-nav'>
        <h1 className='app-title'>School Fees System</h1>
        <div className='top-nav-actions'>
          {/* Search */}
          <button className='nav-search-btn' onClick={openSearch} title='Search (Ctrl+K)'>
            <HiSearch />
            <span className='nav-search-label'>Search…</span>
            <kbd className='nav-search-kbd'>⌘K</kbd>
          </button>

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
              <NotificationPanel onClose={() => setNotifOpen(false)} navigate={navigate} />
            )}
          </div>

          {/* User */}
          <div className='user-profile'>
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
            <button onClick={logout} className='logout-btn'>
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Search modal ── */}
      {searchOpen && (
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

      {/* ── Styles ── */}
      <style>{`
        /* ── CSS variables ── */
        :root {
          --bg-primary:#fff; --bg-secondary:#f8fafc; --bg-tertiary:#f1f5f9;
          --text-primary:#1e293b; --text-secondary:#64748b; --text-tertiary:#94a3b8;
          --border-color:#e2e8f0; --border-light:#f1f5f9; --nav-bg:#fff;
          --shadow-sm:0 1px 3px rgba(0,0,0,.07); --shadow-md:0 4px 20px rgba(0,0,0,.08);
          --shadow-lg:0 20px 60px rgba(0,0,0,.12);
          --accent:#4f46e5; --accent-light:#eef2ff;
          --overlay:rgba(15,23,42,.6); --modal-bg:#fff;
        }
        [data-theme="dark"] {
          --bg-primary:#0f172a; --bg-secondary:#1e293b; --bg-tertiary:#1e293b;
          --text-primary:#f1f5f9; --text-secondary:#94a3b8; --text-tertiary:#64748b;
          --border-color:#334155; --border-light:#1e293b; --nav-bg:#0f172a;
          --shadow-sm:0 1px 3px rgba(0,0,0,.3); --shadow-md:0 4px 20px rgba(0,0,0,.4);
          --shadow-lg:0 20px 60px rgba(0,0,0,.5);
          --accent:#818cf8; --accent-light:#1e1b4b;
          --overlay:rgba(0,0,0,.75); --modal-bg:#1e293b;
        }

        /* Dark mode global overrides (preserved from original) */
        [data-theme="dark"] body,[data-theme="dark"] main,[data-theme="dark"] aside,
        [data-theme="dark"] .top-nav,[data-theme="dark"] .table-card,[data-theme="dark"] .finance-card,
        [data-theme="dark"] .profile-hero,[data-theme="dark"] .content-card,[data-theme="dark"] .billing-card,
        [data-theme="dark"] .history-card,[data-theme="dark"] .form-container,[data-theme="dark"] .stat-card,
        [data-theme="dark"] .insight-card,[data-theme="dark"] .recent-activity,
        [data-theme="dark"] .data-table th,[data-theme="dark"] .settings-content,
        [data-theme="dark"] .info-card,[data-theme="dark"] .modal-content {
          background-color:var(--bg-secondary)!important; color:var(--text-primary)!important;
        }
        [data-theme="dark"] body { background:var(--bg-primary); color:var(--text-primary); }
        [data-theme="dark"] .top-nav { border-bottom-color:var(--border-color)!important; }
        [data-theme="dark"] .data-table th,[data-theme="dark"] .card-header,
        [data-theme="dark"] .ledger-table th,[data-theme="dark"] .table-card { background:var(--bg-secondary)!important; }
        [data-theme="dark"] .data-table td,[data-theme="dark"] .ledger-table td,
        [data-theme="dark"] .mini-table td { border-color:var(--border-color)!important; color:var(--text-primary)!important; }
        [data-theme="dark"] .input-wrapper input,[data-theme="dark"] .input-wrapper select,
        [data-theme="dark"] .input-wrapper textarea { background:var(--bg-primary)!important; border-color:var(--border-color)!important; color:var(--text-primary)!important; }
        [data-theme="dark"] h1,[data-theme="dark"] h2,[data-theme="dark"] h3,
        [data-theme="dark"] h4,[data-theme="dark"] h5,[data-theme="dark"] p,
        [data-theme="dark"] span,[data-theme="dark"] label,[data-theme="dark"] td,
        [data-theme="dark"] th { color:var(--text-primary); }
        [data-theme="dark"] .text-secondary,[data-theme="dark"] .stat-label,
        [data-theme="dark"] .sub-info,[data-theme="dark"] .user-role,
        [data-theme="dark"] .id-sub { color:var(--text-secondary)!important; }
        [data-theme="dark"] .class-tag,[data-theme="dark"] .section-badge,
        [data-theme="dark"] .count-badge,[data-theme="dark"] .method-tag { background:var(--bg-primary)!important; color:var(--text-secondary)!important; }
        [data-theme="dark"] .term-tab { color:var(--text-secondary); }
        [data-theme="dark"] .term-tab.active { background:var(--bg-primary); color:var(--accent); }
        [data-theme="dark"] .term-selector-tabs { background:var(--bg-primary); }
        [data-theme="dark"] .search-box input,[data-theme="dark"] .filter-btn { background:var(--bg-primary)!important; border-color:var(--border-color)!important; color:var(--text-primary)!important; }
        [data-theme="dark"] .logout-btn { background:var(--bg-secondary); border-color:var(--border-color); color:var(--text-primary); }
        [data-theme="dark"] .back-btn,[data-theme="dark"] .back-link { color:var(--text-secondary); }
        [data-theme="dark"] .pill { background:var(--bg-primary); color:var(--text-secondary); }
        [data-theme="dark"] .summary-item { border-color:var(--border-color); }
        [data-theme="dark"] .summary-item label { color:var(--text-secondary); }
        [data-theme="dark"] .toggle-row { border-color:var(--border-color); }
        [data-theme="dark"] .section-divider { border-color:var(--border-color); }
        [data-theme="dark"] .academic-status-card { border-color:var(--border-color); }
        [data-theme="dark"] .academic-status-divider { background:var(--border-color); }
        [data-theme="dark"] .settings-nav { border-color:var(--border-color); }
        [data-theme="dark"] .settings-nav-item { color:var(--text-secondary); }
        [data-theme="dark"] .settings-nav-item:hover { background:var(--bg-primary); }
        [data-theme="dark"] .outline-btn { border-color:var(--border-color); color:var(--text-primary); }
        [data-theme="dark"] .data-action-card { border-color:var(--border-color); }
        [data-theme="dark"] .logo-upload-area { border-color:var(--border-color); }
        [data-theme="dark"] .upload-btn { background:var(--bg-primary); border-color:var(--border-color); color:var(--text-primary); }
        [data-theme="dark"] .total-row td { background:var(--bg-primary)!important; }
        [data-theme="dark"] .student-item:hover { background:var(--bg-primary); }
        [data-theme="dark"] .app-title { color:var(--accent)!important; }
        [data-theme="dark"] .nav-search-btn { background:var(--bg-secondary)!important; border-color:var(--border-color)!important; color:var(--text-secondary)!important; }
        [data-theme="dark"] .notification-btn { color:var(--text-secondary)!important; }
        [data-theme="dark"] .user-name { color:var(--text-primary)!important; }
        [data-theme="dark"] .user-profile { border-color:var(--border-color)!important; }
        [data-theme="dark"] .avatar { background:var(--accent-light)!important; color:var(--accent)!important; }

        /* ── Nav search button ── */
        .nav-search-btn { display:flex; align-items:center; gap:8px; padding:7px 14px; border-radius:8px; border:1px solid var(--border-color); background:var(--bg-secondary); color:var(--text-secondary); font-size:13px; cursor:pointer; transition:border-color .2s,box-shadow .2s; }
        .nav-search-btn:hover { border-color:#4f46e5; box-shadow:0 0 0 3px rgba(79,70,229,.1); }
        .nav-search-label { display:none; }
        .nav-search-kbd   { display:none; }
        @media(min-width:640px) { .nav-search-label { display:inline; } .nav-search-kbd { display:inline; font-size:10px; padding:2px 5px; background:var(--border-color); border-radius:4px; } }

        /* ── Icon buttons ── */
        .icon-btn { display:flex; align-items:center; padding:5px; justify-content:center; border-radius:8px; border:none; background:transparent; cursor:pointer; font-size:18px; color:var(--text-secondary); transition:background .15s,color .15s; }
        .icon-btn:hover { background:var(--bg-tertiary); color:var(--text-primary); }
        [data-theme="dark"] .icon-btn:hover { background:var(--bg-secondary); color:var(--text-primary); }

        /* ── Notification trigger ── */
        .np-trigger-wrap { position:relative; }
        .np-live-badge { position:absolute; top:-4px; right:-4px; min-width:18px; height:18px; background:#ef4444; color:#fff; font-size:10px; font-weight:700; border-radius:99px; display:flex; align-items:center; justify-content:center; padding:0 4px; border:2px solid var(--nav-bg,#fff); pointer-events:none; }

        /* ── Notification panel ── */
        .np-panel {
          position:absolute; top:calc(100% + 10px); right:0; z-index:8000;
          width:420px; max-width:calc(100vw - 2rem);
          background:var(--modal-bg,#fff); border:1px solid var(--border-color);
          border-radius:16px; box-shadow:0 24px 64px rgba(0,0,0,.18);
          display:flex; flex-direction:column; max-height:min(600px, 80vh);
          animation:npIn .18s ease;
        }
        @keyframes npIn { from { opacity:0; transform:translateY(-8px) scale(.98); } to { opacity:1; transform:none; } }
        [data-theme="dark"] .np-panel { background:var(--modal-bg); border-color:var(--border-color); }

        /* Header */
        .np-header { display:flex; align-items:center; justify-content:space-between; padding:1rem 1rem .75rem; border-bottom:1px solid var(--border-color); flex-shrink:0; }
        .np-header-left { display:flex; align-items:center; gap:.5rem; }
        .np-title { margin:0; font-size:.95rem; font-weight:700; color:var(--text-primary); }
        .np-unread-badge { background:#ef4444; color:#fff; font-size:.65rem; font-weight:700; padding:2px 7px; border-radius:99px; }
        .np-header-right { display:flex; align-items:center; gap:.35rem; }
        .np-mark-read-btn { display:flex; align-items:center; gap:.3rem; font-size:.73rem; color:#4f46e5; background:none; border:none; cursor:pointer; padding:.25rem .5rem; border-radius:6px; white-space:nowrap; }
        .np-mark-read-btn:hover { background:var(--bg-tertiary); }
        .np-refresh-btn { display:flex; align-items:center; justify-content:center; border-radius:7px; border:1px solid var(--border-color); background:transparent; color:var(--text-secondary); cursor:pointer; font-size:.9rem; }
        .np-refresh-btn:hover { background:var(--bg-secondary); }
        .np-refresh-btn:disabled { opacity:.5; cursor:not-allowed; }
        .np-close-btn { display:flex; align-items:center; justify-content:center;  border-radius:7px; border:1px solid var(--border-color); background:transparent; color:var(--text-secondary); cursor:pointer; font-size:.95rem; }
        .np-close-btn:hover { background:var(--bg-secondary); }
        .np-spin { animation:npSpin .7s linear infinite; }
        @keyframes npSpin { to { transform:rotate(360deg); } }

        /* Context */
        .np-context { display:flex; align-items:center; gap:.4rem; padding:.45rem 1rem; font-size:.73rem; color:var(--text-secondary); background:var(--bg-secondary); border-bottom:1px solid var(--border-color); flex-shrink:0; }
        .np-refresh-time { color:var(--text-tertiary); }

        /* Filter tabs */
        .np-filters { display:flex; gap:.3rem; padding:.6rem 1rem; border-bottom:1px solid var(--border-color); flex-shrink:0; overflow-x:auto; scrollbar-width:none; }
        .np-filters::-webkit-scrollbar { display:none; }
        .np-filter-tab { display:inline-flex; align-items:center; gap:.3rem; padding:.3rem .7rem; border-radius:7px; border:1px solid transparent; background:transparent; color:var(--text-secondary); font-size:.75rem; font-weight:500; cursor:pointer; white-space:nowrap; transition:all .14s; }
        .np-filter-tab:hover { background:var(--bg-secondary); }
        .np-filter-tab.active { background:#4f46e5; color:#fff; border-color:#4338ca; }
        .np-filter-cnt { background:rgba(255,255,255,.25); padding:0 5px; border-radius:99px; font-size:.65rem; font-weight:700; }
        .np-filter-tab:not(.active) .np-filter-cnt { background:var(--bg-tertiary); color:var(--text-secondary); }

        /* Body */
        .np-body { flex:1; overflow-y:auto; scrollbar-width:thin; }
        .np-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:.6rem; padding:2.5rem 1rem; color:var(--text-secondary); font-size:.875rem; text-align:center; }
        .np-state-error { color:#dc2626; }
        .np-state-error svg { font-size:1.75rem; }
        .np-spinner { width:26px; height:26px; border:3px solid var(--border-color); border-top-color:#4f46e5; border-radius:50%; animation:npSpin .7s linear infinite; }
        .np-retry-btn { padding:.4rem .85rem; background:#4f46e5; color:#fff; border:none; border-radius:7px; font-size:.8rem; cursor:pointer; }

        /* List */
        .np-list { padding:.5rem; display:flex; flex-direction:column; gap:2px; }
        .np-item { border-radius:10px; overflow:hidden; transition:background .12s; }
        .np-item.unread .np-item-header { background:transparent; }
        .np-item-header { display:flex; align-items:flex-start; gap:.65rem; width:100%; padding:.75rem .7rem; border:none; background:transparent; cursor:pointer; text-align:left; border-radius:10px; transition:background .12s; }
        .np-item-header:hover { background:var(--bg-secondary); }
        .np-item.expanded .np-item-header { background:var(--bg-secondary); border-radius:10px 10px 0 0; }

        .np-item-dot { width:7px; height:7px; border-radius:50%; flex-shrink:0; margin-top:6px; }
        .np-item.read .np-item-dot { opacity:.35; }
        .np-item-icon { display:flex; align-items:center; justify-content:center; width:34px; height:34px; border-radius:9px; font-size:1rem; flex-shrink:0; }
        .np-item-text { flex:1; display:flex; flex-direction:column; gap:.18rem; min-width:0; }
        .np-item-title { font-size:.83rem; font-weight:600; color:var(--text-primary); }
        .np-item.read .np-item-title { font-weight:500; }
        .np-item-body { font-size:.76rem; color:var(--text-secondary); line-height:1.4; }
        .np-item-chevron { width:15px; height:15px; color:var(--text-tertiary); flex-shrink:0; margin-top:4px; transition:transform .18s; }
        .np-item-chevron.open { transform:rotate(90deg); }

        /* Detail */
        .np-item-detail { background:var(--bg-secondary); border-radius:0 0 10px 10px; padding:.75rem .85rem; }

        /* Footer */
        .np-footer { padding:.7rem 1rem; border-top:1px solid var(--border-color); flex-shrink:0; }
        .np-footer-link { display:flex; align-items:center; gap:.4rem; background:none; border:none; color:#4f46e5; font-size:.8rem; font-weight:500; cursor:pointer; padding:0; }
        .np-footer-link:hover { text-decoration:underline; }

        /* ── Detail views ── */
        .nd-summary { display:flex; flex-direction:column; gap:.65rem; }
        .nd-stat-row { display:flex; gap:0; }
        .nd-stat { flex:1; text-align:center; padding:.4rem; }
        .nd-stat-val { display:block; font-size:1.05rem; font-weight:700; color:var(--text-primary); }
        .nd-stat-label { display:block; font-size:.68rem; color:var(--text-secondary); margin-top:.1rem; }
        .nd-blue { color:#2563eb; }
        .nd-green { color:#16a34a; }
        .nd-red { color:#dc2626; }
        .nd-amber { color:#d97706; }
        .nd-progress-wrap { height:6px; background:var(--border-color); border-radius:99px; overflow:hidden; }
        .nd-progress-bar { height:100%; border-radius:99px; transition:width .5s ease; }
        .nd-pill-row { display:flex; gap:.4rem; flex-wrap:wrap; }
        .nd-pill { display:inline-flex; align-items:center; gap:.3rem; font-size:.7rem; font-weight:600; padding:3px 9px; border-radius:99px; }
        .nd-pill-green { background:#dcfce7; color:#15803d; }
        .nd-pill-amber { background:#fef9c3; color:#92400e; }
        .nd-pill-red   { background:#fee2e2; color:#991b1b; }
        .nd-pill svg   { font-size:.75rem; }

        .nd-list-wrap { display:flex; flex-direction:column; gap:.5rem; }
        .nd-sub-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:.3rem; }
        .nd-sub-label { font-size:.73rem; color:var(--text-secondary); font-weight:500; }
        .nd-sub-val { font-size:.85rem; font-weight:700; }
        .nd-mini-list { display:flex; flex-direction:column; gap:2px; }
        .nd-mini-row { display:flex; align-items:center; gap:.5rem; padding:.3rem 0; border-bottom:1px solid var(--border-light); }
        .nd-mini-row:last-child { border-bottom:none; }
        .nd-mini-name { font-size:.78rem; font-weight:600; color:var(--text-primary); flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
        .nd-mini-sub  { font-size:.7rem; color:var(--text-secondary); white-space:nowrap; }
        .nd-mini-amt  { font-size:.78rem; font-weight:700; white-space:nowrap; margin-left:auto; }
        .nd-more { font-size:.71rem; color:var(--text-tertiary); margin:.3rem 0 0; }
        .nd-action-btn { display:inline-flex; align-items:center; gap:.35rem; margin-top:.5rem; padding:.4rem .85rem; background:#4f46e5; color:#fff; border:none; border-radius:7px; font-size:.77rem; cursor:pointer; }
        .nd-action-btn:hover { background:#4338ca; }
        .nd-tip { font-size:.75rem; color:var(--text-secondary); font-style:italic; margin:.25rem 0; }

        .nd-class-row { display:flex; align-items:center; gap:.65rem; padding:.35rem 0; border-bottom:1px solid var(--border-light); }
        .nd-class-row:last-child { border-bottom:none; }
        .nd-class-info { min-width:0; flex:1; }
        .nd-class-bar-wrap { width:60px; height:5px; background:var(--border-color); border-radius:99px; overflow:hidden; flex-shrink:0; }
        .nd-class-bar { height:100%; border-radius:99px; }
        .nd-class-rate { font-size:.75rem; font-weight:700; width:30px; text-align:right; flex-shrink:0; }

        .nd-celebrate { display:flex; flex-direction:column; align-items:center; gap:.4rem; padding:.5rem; text-align:center; }
        .nd-celebrate-icon { font-size:1.75rem; }
        .nd-celebrate-text { font-size:.8rem; color:var(--text-secondary); }
        .nd-generic { font-size:.8rem; color:var(--text-secondary); margin:0; }

        /* ── Search overlay (preserved) ── */
        .search-overlay { position:fixed; inset:0; z-index:9000; background:var(--overlay); backdrop-filter:blur(4px); display:flex; align-items:flex-start; justify-content:center; padding-top:80px; animation:overlayIn .15s ease; }
        @keyframes overlayIn { from{opacity:0} to{opacity:1} }
        .search-modal { width:100%; max-width:580px; margin:0 1rem; background:var(--modal-bg); border-radius:16px; overflow:hidden; box-shadow:var(--shadow-lg); border:1px solid var(--border-color); animation:modalIn .18s ease; max-height:calc(100vh - 120px); display:flex; flex-direction:column; }
        @keyframes modalIn { from{opacity:0;transform:scale(.97) translateY(-8px)} to{opacity:1;transform:none} }
        [data-theme="dark"] .search-modal { background:var(--modal-bg)!important; border-color:var(--border-color)!important; }
        .search-input-row { display:flex; align-items:center; gap:10px; padding:14px 16px; border-bottom:1px solid var(--border-color); }
        .search-modal-icon { font-size:20px; color:var(--text-secondary); flex-shrink:0; }
        .search-modal-input { flex:1; border:none; outline:none; font-size:15px; background:transparent; color:var(--text-primary); }
        .search-modal-input::placeholder { color:var(--text-tertiary); }
        .search-clear-btn,.search-close-btn { background:none; border:none; cursor:pointer; padding:4px; color:var(--text-tertiary); display:flex; align-items:center; border-radius:4px; font-size:13px; }
        .search-clear-btn svg { width:16px; height:16px; }
        .search-close-btn kbd { font-size:11px; padding:2px 6px; background:var(--bg-tertiary); border-radius:4px; color:var(--text-secondary); }
        [data-theme="dark"] .search-close-btn kbd { background:var(--bg-primary); }
        .search-modal-body { flex:1; overflow-y:auto; }
        .search-state { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:10px; padding:3rem 1.5rem; color:var(--text-secondary); font-size:14px; text-align:center; }
        .search-state svg { font-size:28px; }
        .search-state.error { color:#dc2626; }
        .search-spinner { width:28px; height:28px; border:3px solid var(--border-color); border-top-color:#4f46e5; border-radius:50%; animation:npSpin .7s linear infinite; }
        .search-hints { padding:1.5rem; }
        .search-hint-title { font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:var(--text-tertiary); margin:0 0 .75rem; }
        .search-hint-list { display:flex; flex-wrap:wrap; gap:8px; margin-bottom:1.25rem; }
        .search-hint-chip { font-size:12px; padding:4px 10px; background:var(--bg-tertiary); border-radius:99px; color:var(--text-secondary); }
        [data-theme="dark"] .search-hint-chip { background:var(--bg-primary); }
        .search-hint-tip { font-size:12px; color:var(--text-tertiary); margin:0; }
        .search-hint-tip kbd { font-size:11px; padding:2px 5px; background:var(--bg-tertiary); border-radius:4px; }
        .search-results { padding:8px 0; }
        .search-group { padding:0 8px 8px; }
        .search-group-label { display:flex; align-items:center; gap:6px; font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:var(--text-tertiary); padding:8px 8px 6px; margin:0; }
        .search-group-label svg { width:14px; height:14px; }
        .search-result-item { display:flex; align-items:center; gap:12px; width:100%; padding:10px 8px; border-radius:8px; border:none; background:transparent; cursor:pointer; text-align:left; transition:background .12s; }
        .search-result-item:hover { background:var(--bg-secondary); }
        [data-theme="dark"] .search-result-item:hover { background:var(--bg-primary); }
        .result-avatar { width:36px; height:36px; border-radius:10px; flex-shrink:0; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:13px; }
        .student-avatar-sm { background:#eef2ff; color:#4f46e5; }
        .family-avatar-sm  { background:#ecfdf5; color:#059669; }
        [data-theme="dark"] .student-avatar-sm { background:#1e1b4b; color:#818cf8; }
        [data-theme="dark"] .family-avatar-sm  { background:#052e16; color:#4ade80; }
        .result-info { flex:1; display:flex; flex-direction:column; min-width:0; }
        .result-name { font-size:14px; font-weight:600; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .result-meta { display:flex; gap:8px; margin-top:2px; }
        .result-meta span { font-size:12px; color:var(--text-secondary); }
        .result-arrow { width:16px; height:16px; color:var(--text-tertiary); flex-shrink:0; opacity:0; transition:opacity .15s; }
        .search-result-item:hover .result-arrow { opacity:1; }
        .search-modal-footer { display:flex; justify-content:space-between; align-items:center; padding:10px 16px; border-top:1px solid var(--border-color); font-size:11px; color:var(--text-tertiary); }
      `}</style>
    </>
  );
}
