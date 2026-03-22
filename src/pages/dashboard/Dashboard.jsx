import { useEffect, useState, useCallback, useRef } from "react";
import { getDashboardFinanceStats } from "./dashboardService";
import { getSettings } from "../settings/settingService";
import StatsCards from "./StatsCards";
import { HiRefresh, HiArrowRight, HiTrendingUp, HiCash, HiChartBar } from "react-icons/hi";
import { formatDate } from "../../utils/helpers";
import { useNavigate } from "react-router-dom";

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
      <style>{`
        .skel-bone { background: linear-gradient(90deg,var(--skel-base,#e2e8f0) 25%,var(--skel-shine,#f1f5f9) 50%,var(--skel-base,#e2e8f0) 75%); background-size:200% 100%; animation:skel-shimmer 1.4s ease-in-out infinite; flex-shrink:0; display:block; }
        @keyframes skel-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        [data-theme="dark"] .skel-bone { --skel-base:#1e293b; --skel-shine:#334155; }
      `}</style>
    </div>
  );
}

// ── Mini bar chart (pure CSS/SVG — no library) ────────────────────────────
function BarChart({ data, valueKey, labelKey, color = "#4f46e5", height = 120 }) {
  if (!data?.length)
    return (
      <div
        style={{
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
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

  return (
    <div className='dashboard-wrapper'>
      {/* ── Header ────────────────────────────────────────────── */}
      <header className='dashboard-header'>
        <div>
          <h1>Executive Overview</h1>
          <p>
            Financial performance for <strong>{currentTerm}</strong>,{" "}
            <strong>{academicYear}</strong>
          </p>
        </div>
        <button className='icon-btn refresh-btn' onClick={loadStats} title='Refresh'>
          <HiRefresh />
        </button>
      </header>

      {/* ── Stat cards ────────────────────────────────────────── */}
      <StatsCards stats={stats} />

      {/* ── Row 1: Collection progress + Term trend ───────────── */}
      <div className='db-grid-2' style={{ marginTop: "1.5rem" }}>
        {/* Collection progress */}
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiTrendingUp /> Collection Progress
            </div>
            <span className='db-badge' style={{ background: rateColor + "22", color: rateColor }}>
              {collectionRate}%
            </span>
          </div>
          {/* Big donut */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ position: "relative", flexShrink: 0 }}>
              <svg width='100' height='100' viewBox='0 0 100 100'>
                <circle
                  cx='50'
                  cy='50'
                  r='38'
                  fill='none'
                  stroke='var(--color-border-tertiary)'
                  strokeWidth='16'
                />
                <circle
                  cx='50'
                  cy='50'
                  r='38'
                  fill='none'
                  stroke={rateColor}
                  strokeWidth='16'
                  strokeDasharray={`${collectionRate * 2.388} 238.8`}
                  strokeLinecap='round'
                  style={{
                    transform: "rotate(-90deg)",
                    transformOrigin: "50% 50%",
                    transition: "stroke-dasharray 0.8s ease",
                  }}
                />
                <text
                  x='50'
                  y='46'
                  textAnchor='middle'
                  fontSize='16'
                  fontWeight='800'
                  fill='var(--color-text-primary)'
                >
                  {collectionRate}%
                </text>
                <text
                  x='50'
                  y='60'
                  textAnchor='middle'
                  fontSize='8'
                  fill='var(--color-text-secondary)'
                >
                  collected
                </text>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <ProgressBar
                value={stats.totalPayments}
                max={stats.totalFees}
                color={rateColor}
                label='Collected'
                sublabel={`₦${stats.totalPayments.toLocaleString()}`}
              />
              <ProgressBar
                value={stats.outstanding}
                max={stats.totalFees}
                color='#ef444466'
                label='Outstanding'
                sublabel={`₦${stats.outstanding.toLocaleString()}`}
              />
            </div>
          </div>
          <div style={{ display: "flex", gap: "1rem" }}>
            <div className='db-mini-stat'>
              <span className='db-mini-label'>Expected</span>
              <span className='db-mini-val'>₦{stats.totalFees.toLocaleString()}</span>
            </div>
            <div className='db-mini-stat'>
              <span className='db-mini-label'>Students</span>
              <span className='db-mini-val'>{stats.totalStudents}</span>
            </div>
          </div>
        </div>

        {/* Term trend bar chart */}
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiChartBar /> Payments by Term
            </div>
            <span className='db-badge'>{academicYear}</span>
          </div>
          <BarChart
            data={stats.termTrend}
            valueKey='paid'
            labelKey='term'
            color='#4f46e5'
            height={110}
          />
          <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem", flexWrap: "wrap" }}>
            {stats.termTrend.map((t) => (
              <div key={t.term} className='db-mini-stat' style={{ flex: 1, minWidth: 80 }}>
                <span className='db-mini-label'>{t.term}</span>
                <span className='db-mini-val' style={{ fontSize: 13 }}>
                  ₦{t.paid.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Row 2: Class breakdown + Payment methods ──────────── */}
      <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
        {/* Class collection breakdown */}
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiChartBar /> Collection by Class
            </div>
            <span className='db-badge'>{currentTerm}</span>
          </div>
          {stats.classBreakdown.length ? (
            <div>
              {stats.classBreakdown.map((cls, i) => {
                const pct = cls.fees > 0 ? Math.round((cls.paid / cls.fees) * 100) : 0;
                const col = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
                return (
                  <div key={cls.classId} style={{ marginBottom: "0.625rem" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: 12,
                        marginBottom: 3,
                      }}
                    >
                      <span style={{ fontWeight: 500, color: "var(--color-text-primary)" }}>
                        {cls.name}
                      </span>
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        ₦{cls.paid.toLocaleString()} / ₦{cls.fees.toLocaleString()} ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 5,
                        background: "var(--color-border-tertiary)",
                        borderRadius: 3,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background: col,
                          borderRadius: 3,
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ color: "var(--color-text-tertiary)", fontSize: 13, margin: "1.5rem 0" }}>
              No class data available
            </p>
          )}
        </div>

        {/* Payment methods */}
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiCash /> Payment Methods
            </div>
          </div>
          {stats.collectionByMethod.length ? (
            <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
              <DonutChart data={stats.collectionByMethod} valueKey='amount' labelKey='method' />
              <div style={{ flex: 1 }}>
                {stats.collectionByMethod.map((m, i) => {
                  const total = stats.collectionByMethod.reduce((s, x) => s + x.amount, 0);
                  const pct = total > 0 ? Math.round((m.amount / total) * 100) : 0;
                  return (
                    <div
                      key={m.method}
                      style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}
                    >
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: DONUT_COLORS[i % DONUT_COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ flex: 1, fontSize: 13, color: "var(--color-text-primary)" }}>
                        {m.method}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {pct}%
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                        }}
                      >
                        ₦{m.amount.toLocaleString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p style={{ color: "var(--color-text-tertiary)", fontSize: 13, margin: "1.5rem 0" }}>
              No payments this term
            </p>
          )}
        </div>
      </div>

      {/* ── Row 3: Recent transactions ────────────────────────── */}
      <div style={{ marginTop: "1.25rem" }}>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>Recent Transactions</div>
            <button className='view-all-btn' onClick={() => navigate("/payment-history")}>
              View All <HiArrowRight />
            </button>
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
      </div>

      <style>{`
        .db-grid-2 { display:grid; grid-template-columns:1fr 1fr; gap:1.25rem; }
        @media(max-width:768px) { .db-grid-2 { grid-template-columns:1fr; } }

        .db-card {
          background:var(--color-background-primary,#fff);
          border:1px solid var(--color-border-tertiary,#f1f5f9);
          border-radius:16px; padding:1.25rem;
          box-shadow:0 2px 8px rgba(0,0,0,0.04);
        }
        [data-theme="dark"] .db-card { background:#1e293b; border-color:#334155; }

        .db-card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:1rem; }
        .db-card-title { display:flex; align-items:center; gap:6px; font-size:14px; font-weight:600; color:var(--color-text-primary); }
        .db-card-title svg { width:16px; height:16px; color:#4f46e5; }

        .db-badge {
          font-size:11px; font-weight:600; padding:3px 10px; border-radius:99px;
          background:#eef2ff; color:#4f46e5;
        }
        [data-theme="dark"] .db-badge { background:#1e1b4b; color:#818cf8; }

        .db-mini-stat { background:var(--color-background-secondary,#f8fafc); border-radius:8px; padding:8px 12px; }
        .db-mini-label { display:block; font-size:10px; text-transform:uppercase; letter-spacing:.05em; color:var(--color-text-secondary); margin-bottom:3px; }
        .db-mini-val { display:block; font-size:15px; font-weight:700; color:var(--color-text-primary); }
        [data-theme="dark"] .db-mini-stat { background:#0f172a; }

        .refresh-btn svg { width:18px; height:18px; }
      `}</style>
    </div>
  );
}
