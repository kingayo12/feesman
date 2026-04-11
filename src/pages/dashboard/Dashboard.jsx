import { useEffect, useState, useCallback } from "react";
import { getDashboardFinanceStats } from "./dashboardService";
import { getSettings } from "../settings/settingService";
import StatsCards from "./StatsCards";
import {
  HiRefresh,
  HiArrowRight,
  HiTrendingUp,
  HiCash,
  HiChartBar,
  HiUserGroup,
  HiCog,
  HiShieldCheck,
  HiDocumentReport,
  HiAcademicCap,
  HiCollection,
  HiOfficeBuilding,
  HiCurrencyDollar,
  HiClipboardList,
  HiStar,
} from "react-icons/hi";
import { formatDate } from "../../utils/helpers";
import { useNavigate } from "react-router-dom";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS, ROLE_META, ROLES } from "../../config/permissions";

const EMPTY_STATS = {
  totalFees: 0,
  totalPayments: 0,
  outstanding: 0,
  recentPayments: [],
  classBreakdown: [],
  termTrend: [],
  collectionByMethod: [],
};

// ── Skeleton ──────────────────────────────────────────────────────────────
function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function DashboardSkeleton() {
  return (
    <div className='dashboard-wrapper'>
      <div className='dashboard-header' style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Bone w={220} h={28} r={6} />
          <Bone w={300} h={16} r={6} />
        </div>
        <Bone w={36} h={36} r={8} />
      </div>
      <div className='stats-grid'>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className='stat-card' style={{ gap: "1rem" }}>
            <div className='stat-card-inner' style={{ flex: 1 }}>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Bone w='60%' h={13} />
                <Bone w='80%' h={28} r={4} />
                <Bone w='50%' h={11} />
              </div>
              <Bone w={50} h={50} r={10} />
            </div>
          </div>
        ))}
      </div>
      <div className='dashboard-main-grid' style={{ marginTop: "2rem" }}>
        <div className='insight-card'>
          <Bone w='100%' h={200} r={8} />
        </div>
        <div className='recent-activity'>
          <Bone w='100%' h={200} r={8} />
        </div>
      </div>
    </div>
  );
}

// ── Mini bar chart (pure CSS/SVG — no library) ────────────────────────────
function BarChart({ data, valueKey, labelKey, color = "#4f46e5", height = 120 }) {
  if (!data?.length)
    return (
      <div
        style={{
          color: "var(--color-text-tertiary)",
          fontSize: 13,
        }}
      >
        No data
      </div>
    );
  const max = Math.max(...data.map((d) => d[valueKey]), 1);
  const barW = Math.floor(560 / data.length) - 8;

  return (
    <svg width='100%' viewBox={`0 0 580 ${height + 30}`} style={{ overflow: "visible" }}>
      {data.map((d, i) => {
        const barH = Math.max((d[valueKey] / max) * height, 2);
        const x = i * (560 / data.length) + 10;
        const y = height - barH;
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={Math.max(barW, 4)}
              height={barH}
              rx='3'
              fill={color}
              opacity='0.85'
            />
            <text
              x={x + barW / 2}
              y={height + 16}
              textAnchor='middle'
              fontSize='10'
              fill='var(--color-text-secondary)'
            >
              {String(d[labelKey]).replace(" Term", "").slice(0, 8)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Donut chart ───────────────────────────────────────────────────────────
const DONUT_COLORS = ["#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];
function DonutChart({ data, valueKey, labelKey, size = 140 }) {
  if (!data?.length) return null;
  const total = data.reduce((s, d) => s + d[valueKey], 0);
  const r = 50;
  const cx = 70;
  const cy = 70;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;

  return (
    <svg width={size} height={size} viewBox='0 0 140 140'>
      {data.map((d, i) => {
        const frac = d[valueKey] / total;
        const dash = frac * circumference;
        const offset = circumference - cumulative * circumference;
        cumulative += frac;
        return (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill='none'
            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
            strokeWidth='28'
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={offset}
            style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
          />
        );
      })}
      <circle cx={cx} cy={cy} r={r - 14} fill='var(--color-background-primary)' />
      <text
        x={cx}
        y={cy - 4}
        textAnchor='middle'
        fontSize='13'
        fontWeight='700'
        fill='var(--color-text-primary)'
      >
        {data.length}
      </text>
      <text x={cx} y={cy + 13} textAnchor='middle' fontSize='9' fill='var(--color-text-secondary)'>
        methods
      </text>
    </svg>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────
function ProgressBar({ value, max, color = "#4f46e5", label, sublabel }) {
  const pct = max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
  return (
    <div style={{ marginBottom: "0.875rem" }}>
      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}
      >
        <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>{label}</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{sublabel || `${pct}%`}</span>
      </div>
      <div
        style={{
          height: 6,
          background: "var(--color-border-tertiary)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: color,
            borderRadius: 3,
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const navigate = useNavigate();
  const { role, can } = useRole();
  const canViewFullDashboard = can(PERMISSIONS.VIEW_FULL_DASHBOARD);
  const roleMeta = ROLE_META[role] || null;

  const loadSettings = useCallback(async () => {
    try {
      const s = await getSettings();
      if (!s?.academicYear || !s?.currentTerm) throw new Error("not configured");
      setAcademicYear(s.academicYear);
      setCurrentTerm(s.currentTerm);
    } catch {
      setError("School settings are not properly configured. Please visit Settings.");
      setLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    if (!academicYear || !currentTerm) return;
    try {
      setLoading(true);
      setError(null);
      const data = await getDashboardFinanceStats(academicYear, currentTerm);
      setStats({ ...EMPTY_STATS, ...data });
    } catch {
      setError("Failed to load dashboard statistics.");
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, [academicYear, currentTerm]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);
  useEffect(() => {
    loadStats();
  }, [loadStats]);

  if (loading) return <DashboardSkeleton />;
  if (error)
    return (
      <div className='dashboard-error'>
        <p>{error}</p>
        <button
          onClick={loadSettings}
          className='submit-btn'
          style={{ marginTop: "1rem", width: "auto" }}
        >
          Retry
        </button>
      </div>
    );

  const collectionRate =
    stats.totalFees > 0 ? Math.round((stats.totalPayments / stats.totalFees) * 100) : 0;
  const rateColor = collectionRate >= 80 ? "#10b981" : collectionRate >= 50 ? "#f59e0b" : "#ef4444";

  const roleKey = role || ROLES.user;
  const roleHeadings = {
    [ROLES.super_admin]: {
      title: "Super Admin Command Center",
      sub: "Cross-role finance and operations intelligence",
    },
    [ROLES.admin]: {
      title: "Admin Operations Dashboard",
      sub: "Day-to-day collections and workflow tracking",
    },
    [ROLES.it_admin]: {
      title: "IT Admin Control Desk",
      sub: "System access, permissions, and data health overview",
    },
    [ROLES.accountant]: {
      title: "Accountant Finance Dashboard",
      sub: "Billing, collection, and outstanding balances",
    },
    [ROLES.admin_officer]: {
      title: "Admin Officer Workbench",
      sub: "Operational queues and student/family workload",
    },
    [ROLES.user]: {
      title: "Workspace Summary",
      sub: "Limited operational view for this account",
    },
  };

  const header = roleHeadings[roleKey] || roleHeadings[ROLES.user];

  const quickLinks = [
    {
      show: can(PERMISSIONS.VIEW_STUDENTS),
      label: "Students",
      to: "/students",
      icon: <HiAcademicCap />,
    },
    {
      show: can(PERMISSIONS.VIEW_FAMILIES),
      label: "Families",
      to: "/families",
      icon: <HiUserGroup />,
    },
    {
      show: can(PERMISSIONS.VIEW_FEES),
      label: "Fee Setup",
      to: "/fee-setup",
      icon: <HiCollection />,
    },
    {
      show: can(PERMISSIONS.VIEW_PAYMENTS),
      label: "Payments",
      to: "/payment-history",
      icon: <HiCurrencyDollar />,
    },
    {
      show: can(PERMISSIONS.VIEW_SETTINGS),
      label: "Settings",
      to: "/settings",
      icon: <HiCog />,
    },
    {
      show: can(PERMISSIONS.VIEW_ROLES),
      label: "Role Management",
      to: "/roles",
      icon: <HiShieldCheck />,
    },
  ].filter((item) => item.show);

  const renderRecentTransactions = (title = "Recent Transactions") => (
    <div className='db-card'>
      <div className='db-card-header'>
        <div className='db-card-title'>{title}</div>
        {can(PERMISSIONS.VIEW_PAYMENTS) && (
          <button className='view-all-btn' onClick={() => navigate("/payment-history")}>
            View All <HiArrowRight />
          </button>
        )}
      </div>
      <table className='mini-table' style={{ width: "100%" }}>
        <thead>
          <tr>
            <th>Student</th>
            <th>Method</th>
            <th>Term</th>
            <th className='text-right'>Amount</th>
          </tr>
        </thead>
        <tbody>
          {stats.recentPayments.length ? (
            stats.recentPayments.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className='student-name-small'>{p.studentName}</span>
                  <small className='block-date'>{formatDate(p.date)}</small>
                </td>
                <td>
                  <span className='method-tag'>{p.method}</span>
                </td>
                <td>
                  <span className='term-badge'>{p.term}</span>
                </td>
                <td className='text-right font-bold'>₦{Number(p.amount).toLocaleString()}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan='4' className='text-center py-4'>
                No transactions recorded yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  const renderQuickLinks = () => (
    <div className='db-card'>
      <div className='db-card-header'>
        <div className='db-card-title'>Quick Access</div>
      </div>
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
        {quickLinks.length ? (
          quickLinks.map((link) => (
            <button key={link.to} className='view-all-btn' onClick={() => navigate(link.to)}>
              {link.icon} {link.label}
            </button>
          ))
        ) : (
          <p style={{ color: "var(--color-text-secondary)" }}>No quick links available.</p>
        )}
      </div>
    </div>
  );

  let roleView = null;

  if (roleKey === ROLES.super_admin) {
    roleView = (
      <>
        <StatsCards stats={stats} />
        <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
          <div className='db-card'>
            <div className='db-card-header'>
              <div className='db-card-title'>
                <HiTrendingUp /> Strategic Collection Performance
              </div>
              <span className='db-badge' style={{ background: rateColor + "22", color: rateColor }}>
                {collectionRate}%
              </span>
            </div>
            <ProgressBar
              value={stats.totalPayments}
              max={stats.totalFees}
              color={rateColor}
              label='Collected vs Expected'
              sublabel={`₦${stats.totalPayments.toLocaleString()} / ₦${stats.totalFees.toLocaleString()}`}
            />
            <BarChart
              data={stats.termTrend}
              valueKey='paid'
              labelKey='term'
              color='#4f46e5'
              height={110}
            />
          </div>
          <div className='db-card'>
            <div className='db-card-header'>
              <div className='db-card-title'>
                <HiClipboardList /> Governance Snapshot
              </div>
              <span className='db-badge'>Executive</span>
            </div>
            <div className='db-grid-2'>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Term</span>
                <span className='db-mini-val'>{currentTerm}</span>
              </div>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Academic Year</span>
                <span className='db-mini-val'>{academicYear}</span>
              </div>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Classes with Billing</span>
                <span className='db-mini-val'>{stats.classBreakdown.length}</span>
              </div>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Payment Methods Used</span>
                <span className='db-mini-val'>{stats.collectionByMethod.length}</span>
              </div>
            </div>
          </div>
        </div>
        <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
          <div className='db-card'>
            <div className='db-card-header'>
              <div className='db-card-title'>
                <HiOfficeBuilding /> Class-by-Class Health
              </div>
            </div>
            {stats.classBreakdown.length ? (
              stats.classBreakdown.map((cls) => {
                const pct = cls.fees > 0 ? Math.round((cls.paid / cls.fees) * 100) : 0;
                return (
                  <ProgressBar
                    key={cls.classId}
                    value={cls.paid}
                    max={cls.fees}
                    color={pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444"}
                    label={cls.name}
                    sublabel={`${pct}%`}
                  />
                );
              })
            ) : (
              <p style={{ color: "var(--color-text-secondary)" }}>No class data available.</p>
            )}
          </div>
          {renderQuickLinks()}
        </div>
        <div style={{ marginTop: "1.25rem" }}>{renderRecentTransactions()}</div>
      </>
    );
  } else if (roleKey === ROLES.admin) {
    roleView = (
      <>
        <StatsCards stats={stats} />
        <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
          <div className='db-card'>
            <div className='db-card-header'>
              <div className='db-card-title'>
                <HiDocumentReport /> Admin Performance View
              </div>
              <span className='db-badge'>{collectionRate}% collected</span>
            </div>
            <ProgressBar
              value={stats.totalPayments}
              max={stats.totalFees}
              color={rateColor}
              label='Collections'
              sublabel={`₦${stats.totalPayments.toLocaleString()}`}
            />
            <ProgressBar
              value={stats.outstanding}
              max={stats.totalFees}
              color='#ef4444'
              label='Outstanding'
              sublabel={`₦${stats.outstanding.toLocaleString()}`}
            />
          </div>
          {renderQuickLinks()}
        </div>
        <div style={{ marginTop: "1.25rem" }}>{renderRecentTransactions("Recent Collections")}</div>
      </>
    );
  } else if (roleKey === ROLES.it_admin) {
    const securePaths = [
      can(PERMISSIONS.VIEW_ROLES),
      can(PERMISSIONS.ASSIGN_ROLES),
      can(PERMISSIONS.VIEW_SETTINGS),
      can(PERMISSIONS.EDIT_SETTINGS),
      can(PERMISSIONS.DANGER_ZONE),
    ].filter(Boolean).length;

    roleView = (
      <>
        <div className='db-grid-2'>
          <div className='db-card'>
            <div className='db-card-header'>
              <div className='db-card-title'>
                <HiShieldCheck /> Access & Security Focus
              </div>
              <span className='db-badge'>IT Admin</span>
            </div>
            <div className='db-grid-2'>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Secure Modules Enabled</span>
                <span className='db-mini-val'>{securePaths}</span>
              </div>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Academic Context</span>
                <span className='db-mini-val'>{currentTerm}</span>
              </div>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Users Impacted</span>
                <span className='db-mini-val'>{stats.totalStudents}</span>
              </div>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Classes Active</span>
                <span className='db-mini-val'>{stats.classBreakdown.length}</span>
              </div>
            </div>
          </div>
          <div className='db-card'>
            <div className='db-card-header'>
              <div className='db-card-title'>
                <HiCog /> Platform Health Signals
              </div>
            </div>
            <ProgressBar
              value={stats.totalPayments}
              max={Math.max(stats.totalFees, 1)}
              color='#06b6d4'
              label='Data Collection Throughput'
              sublabel={`${collectionRate}%`}
            />
            <ProgressBar
              value={stats.collectionByMethod.length}
              max={6}
              color='#8b5cf6'
              label='Payment Method Coverage'
              sublabel={`${stats.collectionByMethod.length} methods`}
            />
          </div>
        </div>
        <div style={{ marginTop: "1.25rem" }}>{renderQuickLinks()}</div>
      </>
    );
  } else if (roleKey === ROLES.accountant) {
    roleView = (
      <>
        <div className='stats-grid'>
          <div className='stat-card fees'>
            <div className='stat-card-inner'>
              <div className='stat-content'>
                <p className='stat-label'>Expected Revenue</p>
                <h2 className='stat-value'>₦{stats.totalFees.toLocaleString()}</h2>
                <span className='stat-desc'>Current term billing</span>
              </div>
              <div className='stat-icon-wrapper fees'>
                <HiCurrencyDollar />
              </div>
            </div>
          </div>
          <div className='stat-card payments'>
            <div className='stat-card-inner'>
              <div className='stat-content'>
                <p className='stat-label'>Collections</p>
                <h2 className='stat-value'>₦{stats.totalPayments.toLocaleString()}</h2>
                <span className='stat-desc'>Cash in flow</span>
              </div>
              <div className='stat-icon-wrapper payments'>
                <HiCash />
              </div>
            </div>
          </div>
          <div className='stat-card outstanding'>
            <div className='stat-card-inner'>
              <div className='stat-content'>
                <p className='stat-label'>Outstanding</p>
                <h2 className='stat-value'>₦{stats.outstanding.toLocaleString()}</h2>
                <span className='stat-desc'>Recoverable balance</span>
              </div>
              <div className='stat-icon-wrapper outstanding'>
                <HiTrendingUp />
              </div>
            </div>
          </div>
          <div className='stat-card students'>
            <div className='stat-card-inner'>
              <div className='stat-content'>
                <p className='stat-label'>Collection Rate</p>
                <h2 className='stat-value'>{collectionRate}%</h2>
                <span className='stat-desc'>Performance indicator</span>
              </div>
              <div className='stat-icon-wrapper students'>
                <HiStar />
              </div>
            </div>
          </div>
        </div>
        <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
          <div className='db-card'>
            <div className='db-card-header'>
              <div className='db-card-title'>
                <HiCash /> Payment Methods Mix
              </div>
            </div>
            {stats.collectionByMethod.length ? (
              stats.collectionByMethod.map((m) => (
                <ProgressBar
                  key={m.method}
                  value={m.amount}
                  max={stats.totalPayments || 1}
                  label={m.method}
                  sublabel={`₦${m.amount.toLocaleString()}`}
                />
              ))
            ) : (
              <p style={{ color: "var(--color-text-secondary)" }}>No payment method data.</p>
            )}
          </div>
          {renderQuickLinks()}
        </div>
        <div style={{ marginTop: "1.25rem" }}>{renderRecentTransactions("Recent Payments")}</div>
      </>
    );
  } else if (roleKey === ROLES.admin_officer) {
    roleView = (
      <>
        <div className='db-grid-2'>
          <div className='db-card'>
            <div className='db-card-header'>
              <div className='db-card-title'>
                <HiUserGroup /> Operations Queue
              </div>
            </div>
            <div className='db-grid-2'>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Active Students</span>
                <span className='db-mini-val'>{stats.totalStudents}</span>
              </div>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Classes Covered</span>
                <span className='db-mini-val'>{stats.classBreakdown.length}</span>
              </div>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Term in Focus</span>
                <span className='db-mini-val'>{currentTerm}</span>
              </div>
              <div className='db-mini-stat'>
                <span className='db-mini-label'>Year</span>
                <span className='db-mini-val'>{academicYear}</span>
              </div>
            </div>
          </div>
          {renderQuickLinks()}
        </div>
        <div style={{ marginTop: "1.25rem" }}>{renderRecentTransactions("Latest Activity")}</div>
      </>
    );
  } else {
    roleView = (
      <div className='db-card' style={{ marginTop: "1.5rem" }}>
        <div className='db-card-header'>
          <div className='db-card-title'>Workspace Summary</div>
          {roleMeta && (
            <span className='db-badge' style={{ background: roleMeta.bg, color: roleMeta.color }}>
              {roleMeta.label}
            </span>
          )}
        </div>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
          Your role can access operational pages. Financial analytics are limited for this account.
        </p>
        <div className='db-grid-2'>
          <div className='db-mini-stat'>
            <span className='db-mini-label'>Academic Year</span>
            <span className='db-mini-val'>{academicYear || "Not set"}</span>
          </div>
          <div className='db-mini-stat'>
            <span className='db-mini-label'>Current Term</span>
            <span className='db-mini-val'>{currentTerm || "Not set"}</span>
          </div>
        </div>
        <div style={{ marginTop: "1rem" }}>{renderQuickLinks()}</div>
      </div>
    );
  }

  return (
    <div className='dashboard-wrapper'>
      <header className='dashboard-header'>
        <div>
          <h1>{header.title}</h1>
          <p>
            {header.sub} for <strong>{currentTerm}</strong>, <strong>{academicYear}</strong>
          </p>
        </div>
        <button className='icon-btn refresh-btn' onClick={loadStats} title='Refresh'>
          <HiRefresh />
        </button>
      </header>
      {roleMeta && (
        <div style={{ marginBottom: "0.9rem" }}>
          <span className='db-badge' style={{ background: roleMeta.bg, color: roleMeta.color }}>
            {roleMeta.label}
          </span>
        </div>
      )}

      {!canViewFullDashboard && roleKey !== ROLES.user ? (
        <div className='db-card'>
          <p style={{ color: "var(--color-text-secondary)" }}>
            Your role has a restricted dashboard scope. Contact super admin to enable additional
            dashboard permissions.
          </p>
        </div>
      ) : (
        roleView
      )}
    </div>
  );
}
