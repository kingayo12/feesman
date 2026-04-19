import { useEffect, useState, useCallback } from "react";
import { getDashboardFinanceStats } from "./dashboardService";
import { getSettings } from "../settings/settingService";
import {
  HiRefresh,
  HiArrowRight,
  HiTrendingUp,
  HiUserGroup,
  HiCog,
  HiShieldCheck,
  HiAcademicCap,
  HiCollection,
  HiOfficeBuilding,
  HiCurrencyDollar,
  HiCash,
  HiStar,
  HiChartBar,
  HiDocumentReport,
  HiClipboardList,
  HiDatabase,
  HiLockClosed,
  HiPresentationChartLine,
} from "react-icons/hi";
import { formatDate } from "../../utils/helpers";
import { useNavigate } from "react-router-dom";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS, ROLE_META, ROLES } from "../../config/permissions";
import QuestionsImage from "../../assets/money.svg";
import ProblemSolvingImage from "../../assets/Problem solving-rafiki.svg";
import HeroImage from "../../assets/web2.svg";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const EMPTY_STATS = {
  totalFees: 0,
  totalPayments: 0,
  outstanding: 0,
  recentPayments: [],
  classBreakdown: [],
  termTrend: [],
  collectionByMethod: [],
  totalStudents: 0,
};

const APP_SLIDES = [
  {
    title: "Track Every Naira in Real Time",
    body: "Monitor expected fees, collections, and outstanding balances across classes without waiting for manual reports.",
    ctaLabel: "View Payments",
    ctaTo: "/payment-history",
    image: QuestionsImage,
    imageAlt: "Illustration of school finance questions and analytics",
  },
  {
    title: "Manage Families and Students Faster",
    body: "Keep class enrollment, family records, and fee setup aligned so your staff can act quickly and accurately.",
    ctaLabel: "Open Students",
    ctaTo: "/students",
    image: ProblemSolvingImage,
    imageAlt: "Illustration of solving school operations workflow",
  },
  {
    title: "Run a Role-Based Finance Workflow",
    body: "Give each role the right dashboard visibility while keeping sensitive controls and settings protected.",
    ctaLabel: "Go to Settings",
    ctaTo: "/settings",
    image: HeroImage,
    imageAlt: "Feesman dashboard hero preview",
  },
];

const METHOD_COLORS = ["#378add", "#1d9e75", "#ef9f27", "#d4537e", "#534ab7", "#06b6d4"];
const METHOD_BADGE_CLASS = {
  "Bank Transfer": "method-tag method-blue",
  Cash: "method-tag method-teal",
  POS: "method-tag method-purple",
  Online: "method-tag method-amber",
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
function fmt(n) {
  return "\u20a6" + Math.round(n).toLocaleString();
}
function calcPct(a, b) {
  return b > 0 ? Math.min(Math.round((a / b) * 100), 100) : 0;
}
function getRateColor(rate) {
  return rate >= 80 ? "#1d9e75" : rate >= 50 ? "#ef9f27" : "#e24b4a";
}
function getRatePillClass(rate) {
  return rate >= 80 ? "pill pill-green" : rate >= 50 ? "pill pill-amber" : "pill pill-red";
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────
function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function DashboardSkeleton() {
  return (
    <div className='dashboard-wrapper'>
      <div className='right'>
        <div className='dashboard-header' style={{ marginBottom: "1.4rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Bone w={260} h={28} r={6} />
            <Bone w={320} h={16} r={6} />
          </div>
          <Bone w={36} h={36} r={8} />
        </div>
        <div className='db-metric-grid'>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className='db-metric-card'>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <Bone w='55%' h={12} />
                <Bone w={32} h={32} r={8} />
              </div>
              <Bone w='75%' h={26} r={4} style={{ marginBottom: 6 }} />
              <Bone w='50%' h={11} />
            </div>
          ))}
        </div>
        <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
          <div className='db-card'>
            <Bone w='45%' h={16} style={{ marginBottom: 14 }} />
            <Bone w='100%' h={12} style={{ marginBottom: 8 }} />
            <Bone w='88%' h={12} style={{ marginBottom: 8 }} />
            <Bone w='72%' h={12} />
          </div>
          <div className='db-card'>
            <Bone w='48%' h={16} style={{ marginBottom: 14 }} />
            <Bone w='100%' h={130} r={6} />
          </div>
        </div>
        <div className='db-card' style={{ marginTop: "1.25rem" }}>
          <Bone w='36%' h={16} style={{ marginBottom: 14 }} />
          <Bone w='100%' h={12} style={{ marginBottom: 8 }} />
          <Bone w='100%' h={12} style={{ marginBottom: 8 }} />
          <Bone w='100%' h={12} />
        </div>
      </div>
      <aside className='left dashboard-promo is-skeleton'>
        <div className='top'>
          <Bone w='55%' h={11} r={999} />
          <Bone w='100%' h={24} r={8} />
          <Bone w='94%' h={12} r={8} />
          <Bone w='85%' h={12} r={8} />
          <Bone w={130} h={34} r={999} />
        </div>
        <div className='promo-dots'>
          <Bone w={8} h={8} r={999} />
          <Bone w={8} h={8} r={999} />
          <Bone w={8} h={8} r={999} />
        </div>
        <div className='bottom'>
          <Bone w='100%' h={190} r={14} />
        </div>
      </aside>
    </div>
  );
}

// ─────────────────────────────────────────────
// Promo Slider
// ─────────────────────────────────────────────
function PromoSlider({ activeSlide, onSlideSelect, onSlideAction }) {
  const slide = APP_SLIDES[activeSlide];
  return (
    <aside className='left dashboard-promo'>
      <div className='top'>
        <span className='promo-chip'>Feesman Insights</span>
        <div className='promo-slide-content' key={slide.title}>
          <h3>{slide.title}</h3>
          <p>{slide.body}</p>
        </div>
        <button className='promo-cta-btn' onClick={() => onSlideAction(slide.ctaTo)}>
          {slide.ctaLabel} <HiArrowRight />
        </button>
      </div>
      <div className='promo-dots' aria-label='Slider indicators'>
        {APP_SLIDES.map((item, idx) => (
          <button
            key={item.title}
            type='button'
            className={`promo-dot ${idx === activeSlide ? "active" : ""}`}
            aria-label={`Show slide ${idx + 1}`}
            aria-current={idx === activeSlide ? "true" : "false"}
            onClick={() => onSlideSelect(idx)}
          />
        ))}
      </div>
      <div className='bottom'>
        <img key={slide.title} src={slide.image} alt={slide.imageAlt} />
      </div>
    </aside>
  );
}

// ─────────────────────────────────────────────
// Shared UI primitives
// ─────────────────────────────────────────────

function ProgressBar({ value, max, color = "#378add", label, sublabel }) {
  const p = calcPct(value, max);
  return (
    <div className='db-progress-row'>
      <div className='db-progress-labels'>
        <span>{label}</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{sublabel || `${p}%`}</span>
      </div>
      <div className='db-progress-track'>
        <div className='db-progress-fill' style={{ width: `${p}%`, background: color }} />
      </div>
    </div>
  );
}

// Metric card with icon badge
function MetricCard({ label, value, sub, pill, pillClass, icon, iconBg, iconColor }) {
  return (
    <div className='db-metric-card'>
      <div className='db-metric-card-top'>
        <p className='db-metric-label'>{label}</p>
        <div className='db-metric-icon' style={{ background: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
      <h2 className='db-metric-value'>{value}</h2>
      <span className='db-metric-sub'>{sub}</span>
      {pill && <span className={`pill ${pillClass}`}>{pill}</span>}
    </div>
  );
}

// Ring + progress bars card
function CollectionRateCard({ stats, collectionRate }) {
  const color = getRateColor(collectionRate);
  const outRate = calcPct(stats.outstanding, stats.totalFees);
  const circ = 2 * Math.PI * 28;
  const arcLen = (collectionRate / 100) * circ;
  return (
    <div className='db-card'>
      <div className='db-card-header'>
        <div className='db-card-title'>
          <HiTrendingUp /> Collection rate
        </div>
        <span className='db-badge' style={{ background: color + "22", color }}>
          {collectionRate}%
        </span>
      </div>
      <div className='db-rate-ring-row'>
        <svg
          width='72'
          height='72'
          viewBox='0 0 72 72'
          role='img'
          aria-label='Collection rate ring'
        >
          <circle
            cx='36'
            cy='36'
            r='28'
            fill='none'
            stroke='var(--color-background-secondary)'
            strokeWidth='10'
          />
          <circle
            cx='36'
            cy='36'
            r='28'
            fill='none'
            stroke={color}
            strokeWidth='10'
            strokeLinecap='round'
            strokeDasharray={`${arcLen} ${circ}`}
            style={{
              transform: "rotate(-90deg)",
              transformOrigin: "50% 50%",
              transition: "stroke-dasharray .6s ease",
            }}
          />
          <text
            x='36'
            y='40'
            textAnchor='middle'
            fontSize='13'
            fontWeight='500'
            fill='var(--color-text-primary)'
          >
            {collectionRate}%
          </text>
        </svg>
        <div className='db-rate-text'>
          <div className='db-rate-big'>{fmt(stats.totalPayments)}</div>
          <div className='db-rate-sub'>collected of {fmt(stats.totalFees)} expected</div>
          <div className='db-rate-sub' style={{ marginTop: 4 }}>
            {fmt(stats.outstanding)} gap remaining
          </div>
        </div>
      </div>
      <ProgressBar
        value={stats.totalPayments}
        max={stats.totalFees}
        color={color}
        label='Collected'
        sublabel={`${collectionRate}%`}
      />
      <ProgressBar
        value={stats.outstanding}
        max={stats.totalFees}
        color='#e24b4a'
        label='Outstanding'
        sublabel={`${outRate}%`}
      />
    </div>
  );
}

// Pure SVG bar chart
function TermTrendChart({ data }) {
  if (!data?.length)
    return <p style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No trend data yet.</p>;
  const max = Math.max(...data.map((d) => d.paid), 1);
  const W = 560;
  const H = 120;
  const barW = Math.max(Math.floor(W / data.length) - 14, 8);
  return (
    <svg
      width='100%'
      viewBox={`0 0 ${W} ${H + 32}`}
      style={{ overflow: "visible" }}
      role='img'
      aria-label='Term trend bar chart'
    >
      {data.map((d, i) => {
        const barH = Math.max((d.paid / max) * H, 3);
        const x = i * (W / data.length) + (W / data.length - barW) / 2;
        const y = H - barH;
        const label = String(d.term).replace(" Term", "").replace("/20", "/");
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} rx='3' fill='#b5d4f4' />
            <text
              x={x + barW / 2}
              y={H + 18}
              textAnchor='middle'
              fontSize='10'
              fill='var(--color-text-secondary)'
            >
              {label.slice(0, 10)}
            </text>
            <title>{`${d.term}: ${fmt(d.paid)}`}</title>
          </g>
        );
      })}
    </svg>
  );
}

// Class breakdown progress bars
function ClassBreakdown({ data }) {
  if (!data?.length)
    return (
      <p style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No class data available.</p>
    );
  return (
    <>
      {data.map((cls) => {
        const p = calcPct(cls.paid, cls.fees);
        return (
          <ProgressBar
            key={cls.classId}
            value={cls.paid}
            max={cls.fees}
            color={getRateColor(p)}
            label={cls.name}
            sublabel={`${p}% \u00b7 ${fmt(cls.paid)}`}
          />
        );
      })}
    </>
  );
}

// Payment methods donut
function MethodDonut({ data }) {
  if (!data?.length)
    return <p style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No method data.</p>;
  const total = data.reduce((s, d) => s + d.amount, 0);
  const r = 50;
  const cx = 70;
  const cy = 70;
  const circ = 2 * Math.PI * r;
  let cum = 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <svg
        width='140'
        height='140'
        viewBox='0 0 140 140'
        role='img'
        aria-label='Payment methods donut chart'
      >
        {data.map((d, i) => {
          const frac = d.amount / total;
          const dash = frac * circ;
          const offset = circ - cum * circ;
          cum += frac;
          return (
            <circle
              key={i}
              cx={cx}
              cy={cy}
              r={r}
              fill='none'
              stroke={METHOD_COLORS[i % METHOD_COLORS.length]}
              strokeWidth='26'
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={offset}
              style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}
            >
              <title>{`${d.method}: ${fmt(d.amount)}`}</title>
            </circle>
          );
        })}
        <circle cx={cx} cy={cy} r={r - 14} fill='var(--color-background-primary)' />
        <text
          x={cx}
          y={cy - 4}
          textAnchor='middle'
          fontSize='13'
          fontWeight='500'
          fill='var(--color-text-primary)'
        >
          {data.length}
        </text>
        <text
          x={cx}
          y={cy + 13}
          textAnchor='middle'
          fontSize='9'
          fill='var(--color-text-secondary)'
        >
          methods
        </text>
      </svg>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
        {data.map((d, i) => (
          <div
            key={d.method}
            style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: METHOD_COLORS[i % METHOD_COLORS.length],
                flexShrink: 0,
              }}
            />
            <span style={{ flex: 1, color: "var(--color-text-primary)" }}>{d.method}</span>
            <span style={{ color: "var(--color-text-secondary)" }}>
              {calcPct(d.amount, total)}%
            </span>
            <span style={{ color: "var(--color-text-secondary)", fontSize: 11 }}>
              {fmt(d.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Mini stat grid
function MiniStatGrid({ items }) {
  return (
    <div className='db-grid-2'>
      {items.map(({ label, value }) => (
        <div key={label} className='db-mini-stat'>
          <span className='db-mini-label'>{label}</span>
          <span className='db-mini-val'>{value}</span>
        </div>
      ))}
    </div>
  );
}

// Quick links
function QuickLinks({ links }) {
  return (
    <div className='db-card'>
      <div className='db-card-header'>
        <div className='db-card-title'>Quick access</div>
      </div>
      <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap" }}>
        {links.length ? (
          links.map((link) => (
            <button key={link.to} className='view-all-btn' onClick={link.onClick}>
              {link.icon} {link.label}
            </button>
          ))
        ) : (
          <p style={{ color: "var(--color-text-secondary)" }}>No quick links available.</p>
        )}
      </div>
    </div>
  );
}

// Recent transactions with method filter tabs
function RecentTransactions({ payments, title = "Recent transactions", onViewAll, canViewAll }) {
  const [filter, setFilter] = useState("All");
  const methods = ["All", ...new Set(payments.map((p) => p.method))];
  const filtered = filter === "All" ? payments : payments.filter((p) => p.method === filter);
  return (
    <div className='db-card'>
      <div className='db-card-header' style={{ flexWrap: "wrap", gap: "0.5rem" }}>
        <div className='db-card-title'>{title}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div className='db-tab-row'>
            {methods.map((m) => (
              <button
                key={m}
                className={`db-tab-btn ${filter === m ? "active" : ""}`}
                onClick={() => setFilter(m)}
              >
                {m}
              </button>
            ))}
          </div>
          {canViewAll && (
            <button className='view-all-btn' onClick={onViewAll}>
              View all <HiArrowRight />
            </button>
          )}
        </div>
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
          {filtered.length ? (
            filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <span className='student-name-small'>{p.studentName}</span>
                  <small className='block-date'>{formatDate(p.date)}</small>
                </td>
                <td>
                  <span className={METHOD_BADGE_CLASS[p.method] || "method-tag"}>{p.method}</span>
                </td>
                <td>
                  <span className='term-badge'>{p.term}</span>
                </td>
                <td className='text-right font-bold'>{fmt(p.amount)}</td>
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
}

// ─────────────────────────────────────────────
// ── ROLE-SPECIFIC DASHBOARD VIEWS ────────────
// Each view is purpose-built. Known roles get
// their own curated layout. Any new/unknown
// role falls through to GenericPermissionView
// which builds itself from permissions alone.
// ─────────────────────────────────────────────

function SuperAdminView({
  stats,
  collectionRate,
  academicYear,
  currentTerm,
  quickLinks,
  navigate,
  can,
}) {
  const outRate = calcPct(stats.outstanding, stats.totalFees);
  return (
    <>
      <div className='db-metric-grid'>
        <MetricCard
          label='Expected fees'
          value={fmt(stats.totalFees)}
          sub='Current term billing'
          icon={<HiCurrencyDollar />}
          iconBg='#e6f1fb'
          iconColor='#185fa5'
        />
        <MetricCard
          label='Collected'
          value={fmt(stats.totalPayments)}
          sub={`${collectionRate}% of expected`}
          pill={
            collectionRate >= 80 ? "On track" : collectionRate >= 50 ? "Needs attention" : "Behind"
          }
          pillClass={
            collectionRate >= 80 ? "pill-green" : collectionRate >= 50 ? "pill-amber" : "pill-red"
          }
          icon={<HiCash />}
          iconBg='#e1f5ee'
          iconColor='#0f6e56'
        />
        <MetricCard
          label='Outstanding'
          value={fmt(stats.outstanding)}
          sub={`${outRate}% uncollected`}
          pill={outRate <= 20 ? "Healthy" : outRate <= 50 ? "Monitor" : "High risk"}
          pillClass={outRate <= 20 ? "pill-green" : outRate <= 50 ? "pill-amber" : "pill-red"}
          icon={<HiTrendingUp />}
          iconBg='#fcebeb'
          iconColor='#a32d2d'
        />
        <MetricCard
          label='Collection rate'
          value={`${collectionRate}%`}
          sub='Performance indicator'
          pill={
            collectionRate >= 80
              ? "Excellent"
              : collectionRate >= 60
                ? "Good"
                : collectionRate >= 40
                  ? "Fair"
                  : "Poor"
          }
          pillClass={
            collectionRate >= 80
              ? "pill-green"
              : collectionRate >= 60
                ? "pill-green"
                : collectionRate >= 40
                  ? "pill-amber"
                  : "pill-red"
          }
          icon={<HiStar />}
          iconBg='#faeeda'
          iconColor='#854f0b'
        />
        <MetricCard
          label='Classes billed'
          value={stats.classBreakdown.length}
          sub='With fee data'
          icon={<HiOfficeBuilding />}
          iconBg='#eeedfe'
          iconColor='#534ab7'
        />
        <MetricCard
          label='Active students'
          value={stats.totalStudents ?? "\u2014"}
          sub='Enrolled this term'
          icon={<HiAcademicCap />}
          iconBg='#e1f5ee'
          iconColor='#0f6e56'
        />
      </div>

      <div className='db-grid-2'>
        <CollectionRateCard stats={stats} collectionRate={collectionRate} />
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiChartBar /> Term trend
            </div>
          </div>
          <TermTrendChart data={stats.termTrend} />
        </div>
      </div>

      <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiOfficeBuilding /> Class-by-class health
            </div>
          </div>
          <ClassBreakdown data={stats.classBreakdown} />
        </div>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiClipboardList /> Governance snapshot
            </div>
            <span className='db-badge'>Executive</span>
          </div>
          <MiniStatGrid
            items={[
              { label: "Term", value: currentTerm },
              { label: "Academic year", value: academicYear },
              { label: "Classes with billing", value: stats.classBreakdown.length },
              { label: "Payment methods used", value: stats.collectionByMethod.length },
              { label: "Total students", value: stats.totalStudents ?? "\u2014" },
              { label: "Outstanding gap", value: fmt(stats.outstanding) },
            ]}
          />
        </div>
      </div>

      <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiCash /> Payment methods mix
            </div>
          </div>
          <MethodDonut data={stats.collectionByMethod} />
        </div>
        <QuickLinks links={quickLinks} />
      </div>

      {stats.recentPayments.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <RecentTransactions
            payments={stats.recentPayments}
            title='Recent transactions'
            onViewAll={() => navigate("/payment-history")}
            canViewAll={can(PERMISSIONS.VIEW_PAYMENTS)}
          />
        </div>
      )}
    </>
  );
}

function AdminView({
  stats,
  collectionRate,
  academicYear,
  currentTerm,
  quickLinks,
  navigate,
  can,
}) {
  const outRate = calcPct(stats.outstanding, stats.totalFees);
  return (
    <>
      <div className='db-metric-grid'>
        <MetricCard
          label='Expected fees'
          value={fmt(stats.totalFees)}
          sub='Current term billing'
          icon={<HiCurrencyDollar />}
          iconBg='#e6f1fb'
          iconColor='#185fa5'
        />
        <MetricCard
          label='Collected'
          value={fmt(stats.totalPayments)}
          sub={`${collectionRate}% of fees`}
          pill={collectionRate >= 80 ? "On track" : "Needs follow-up"}
          pillClass={collectionRate >= 80 ? "pill-green" : "pill-amber"}
          icon={<HiCash />}
          iconBg='#e1f5ee'
          iconColor='#0f6e56'
        />
        <MetricCard
          label='Outstanding'
          value={fmt(stats.outstanding)}
          sub='Recoverable balance'
          pill={outRate > 50 ? "Action needed" : "Manageable"}
          pillClass={outRate > 50 ? "pill-red" : "pill-green"}
          icon={<HiTrendingUp />}
          iconBg='#fcebeb'
          iconColor='#a32d2d'
        />
        <MetricCard
          label='Collection rate'
          value={`${collectionRate}%`}
          sub='Admin performance'
          icon={<HiDocumentReport />}
          iconBg='#faeeda'
          iconColor='#854f0b'
        />
      </div>

      <div className='db-grid-2'>
        <CollectionRateCard stats={stats} collectionRate={collectionRate} />
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiOfficeBuilding /> Class collection health
            </div>
          </div>
          <ClassBreakdown data={stats.classBreakdown} />
        </div>
      </div>

      <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
        <QuickLinks links={quickLinks} />
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiClipboardList /> Period context
            </div>
          </div>
          <MiniStatGrid
            items={[
              { label: "Term", value: currentTerm },
              { label: "Academic year", value: academicYear },
              { label: "Classes covered", value: stats.classBreakdown.length },
              { label: "Total students", value: stats.totalStudents ?? "\u2014" },
            ]}
          />
        </div>
      </div>

      {stats.recentPayments.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <RecentTransactions
            payments={stats.recentPayments}
            title='Recent collections'
            onViewAll={() => navigate("/payment-history")}
            canViewAll={can(PERMISSIONS.VIEW_PAYMENTS)}
          />
        </div>
      )}
    </>
  );
}

function AccountantView({
  stats,
  collectionRate,
  academicYear,
  currentTerm,
  quickLinks,
  navigate,
  can,
}) {
  const outRate = calcPct(stats.outstanding, stats.totalFees);
  return (
    <>
      <div className='db-metric-grid'>
        <MetricCard
          label='Expected revenue'
          value={fmt(stats.totalFees)}
          sub='Current term billing'
          icon={<HiCurrencyDollar />}
          iconBg='#e6f1fb'
          iconColor='#185fa5'
        />
        <MetricCard
          label='Cash in flow'
          value={fmt(stats.totalPayments)}
          sub='Total collections'
          pill='Collected'
          pillClass='pill-green'
          icon={<HiCash />}
          iconBg='#e1f5ee'
          iconColor='#0f6e56'
        />
        <MetricCard
          label='Recoverable'
          value={fmt(stats.outstanding)}
          sub={`${outRate}% still owed`}
          pill={outRate > 40 ? "Review required" : "Within range"}
          pillClass={outRate > 40 ? "pill-red" : "pill-amber"}
          icon={<HiTrendingUp />}
          iconBg='#fcebeb'
          iconColor='#a32d2d'
        />
        <MetricCard
          label='Collection rate'
          value={`${collectionRate}%`}
          sub='Performance indicator'
          pill={collectionRate >= 80 ? "Excellent" : collectionRate >= 50 ? "Moderate" : "Low"}
          pillClass={
            collectionRate >= 80 ? "pill-green" : collectionRate >= 50 ? "pill-amber" : "pill-red"
          }
          icon={<HiStar />}
          iconBg='#faeeda'
          iconColor='#854f0b'
        />
      </div>

      <div className='db-grid-2'>
        <CollectionRateCard stats={stats} collectionRate={collectionRate} />
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiCash /> Payment methods mix
            </div>
          </div>
          <MethodDonut data={stats.collectionByMethod} />
        </div>
      </div>

      <div className='db-grid-2' style={{ marginTop: "1.25rem" }}>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiPresentationChartLine /> Method breakdown
            </div>
          </div>
          {stats.collectionByMethod.length ? (
            stats.collectionByMethod.map((m, i) => (
              <ProgressBar
                key={m.method}
                value={m.amount}
                max={stats.totalPayments || 1}
                color={METHOD_COLORS[i % METHOD_COLORS.length]}
                label={m.method}
                sublabel={fmt(m.amount)}
              />
            ))
          ) : (
            <p style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No method data.</p>
          )}
        </div>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiChartBar /> Term trend
            </div>
          </div>
          <TermTrendChart data={stats.termTrend} />
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <QuickLinks links={quickLinks} />
      </div>

      {stats.recentPayments.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <RecentTransactions
            payments={stats.recentPayments}
            title='Recent payments'
            onViewAll={() => navigate("/payment-history")}
            canViewAll={can(PERMISSIONS.VIEW_PAYMENTS)}
          />
        </div>
      )}
    </>
  );
}

function ITAdminView({ stats, academicYear, currentTerm, quickLinks, can }) {
  const securePaths = [
    can(PERMISSIONS.VIEW_ROLES),
    can(PERMISSIONS.ASSIGN_ROLES),
    can(PERMISSIONS.VIEW_SETTINGS),
    can(PERMISSIONS.EDIT_SETTINGS),
    can(PERMISSIONS.DANGER_ZONE),
  ].filter(Boolean).length;

  return (
    <>
      <div className='db-metric-grid'>
        <MetricCard
          label='Secure modules'
          value={securePaths}
          sub='Permissions enabled'
          pill='Active'
          pillClass='pill-green'
          icon={<HiLockClosed />}
          iconBg='#eeedfe'
          iconColor='#534ab7'
        />
        <MetricCard
          label='Classes active'
          value={stats.classBreakdown.length}
          sub='With data this term'
          icon={<HiOfficeBuilding />}
          iconBg='#e6f1fb'
          iconColor='#185fa5'
        />
        <MetricCard
          label='Students on record'
          value={stats.totalStudents ?? "\u2014"}
          sub='Enrolled this term'
          icon={<HiAcademicCap />}
          iconBg='#e1f5ee'
          iconColor='#0f6e56'
        />
        <MetricCard
          label='Payment channels'
          value={stats.collectionByMethod.length}
          sub='Configured methods'
          icon={<HiDatabase />}
          iconBg='#faeeda'
          iconColor='#854f0b'
        />
      </div>

      <div className='db-grid-2'>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiShieldCheck /> Access & security focus
            </div>
            <span className='db-badge'>IT Admin</span>
          </div>
          <MiniStatGrid
            items={[
              { label: "Term", value: currentTerm },
              { label: "Academic year", value: academicYear },
              { label: "Secure modules enabled", value: `${securePaths} / 5` },
              { label: "Classes active", value: stats.classBreakdown.length },
              { label: "Students on record", value: stats.totalStudents ?? "\u2014" },
              { label: "Payment methods configured", value: stats.collectionByMethod.length },
            ]}
          />
        </div>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiCog /> Platform health signals
            </div>
          </div>
          <ProgressBar
            value={stats.totalPayments}
            max={Math.max(stats.totalFees, 1)}
            color='#534ab7'
            label='Data collection throughput'
            sublabel={`${calcPct(stats.totalPayments, stats.totalFees)}%`}
          />
          <ProgressBar
            value={stats.collectionByMethod.length}
            max={6}
            color='#378add'
            label='Payment method coverage'
            sublabel={`${stats.collectionByMethod.length} / 6 methods`}
          />
          <ProgressBar
            value={securePaths}
            max={5}
            color='#1d9e75'
            label='Secure module coverage'
            sublabel={`${securePaths} / 5 modules`}
          />
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <QuickLinks links={quickLinks} />
      </div>
    </>
  );
}

function AdminOfficerView({ stats, academicYear, currentTerm, quickLinks, navigate, can }) {
  return (
    <>
      <div className='db-metric-grid'>
        <MetricCard
          label='Active students'
          value={stats.totalStudents ?? "\u2014"}
          sub='Enrolled this term'
          icon={<HiAcademicCap />}
          iconBg='#e1f5ee'
          iconColor='#0f6e56'
        />
        <MetricCard
          label='Classes covered'
          value={stats.classBreakdown.length}
          sub='With fee setup'
          icon={<HiOfficeBuilding />}
          iconBg='#e6f1fb'
          iconColor='#185fa5'
        />
        <MetricCard
          label='Current term'
          value={currentTerm}
          sub={academicYear}
          icon={<HiClipboardList />}
          iconBg='#eeedfe'
          iconColor='#534ab7'
        />
        <MetricCard
          label='Transactions logged'
          value={stats.recentPayments.length}
          sub='Recent activity'
          icon={<HiDocumentReport />}
          iconBg='#faeeda'
          iconColor='#854f0b'
        />
      </div>

      <div className='db-grid-2'>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiUserGroup /> Operations queue
            </div>
          </div>
          <MiniStatGrid
            items={[
              { label: "Active students", value: stats.totalStudents ?? "\u2014" },
              { label: "Classes covered", value: stats.classBreakdown.length },
              { label: "Term in focus", value: currentTerm },
              { label: "Academic year", value: academicYear },
            ]}
          />
        </div>
        <div className='db-card'>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiOfficeBuilding /> Class overview
            </div>
          </div>
          {stats.classBreakdown.length ? (
            stats.classBreakdown.map((cls) => (
              <div
                key={cls.classId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 0",
                  borderBottom: "0.5px solid var(--color-border-tertiary)",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--color-text-primary)", fontWeight: 500 }}>
                  {cls.name}
                </span>
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {fmt(cls.paid)} collected
                </span>
              </div>
            ))
          ) : (
            <p style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No class data.</p>
          )}
        </div>
      </div>

      <div style={{ marginTop: "1.25rem" }}>
        <QuickLinks links={quickLinks} />
      </div>

      {can(PERMISSIONS.VIEW_PAYMENTS) && stats.recentPayments.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <RecentTransactions
            payments={stats.recentPayments}
            title='Latest activity'
            onViewAll={() => navigate("/payment-history")}
            canViewAll={can(PERMISSIONS.VIEW_PAYMENTS)}
          />
        </div>
      )}
    </>
  );
}

// Catch-all for any new/custom role — builds entirely from permissions
function GenericPermissionView({
  stats,
  collectionRate,
  academicYear,
  currentTerm,
  quickLinks,
  navigate,
  can,
  canViewFinance,
  canViewStudents,
  canViewSystem,
}) {
  const outRate = calcPct(stats.outstanding, stats.totalFees);
  const hasNothing =
    !canViewFinance && !canViewStudents && !canViewSystem && quickLinks.length === 0;

  return (
    <>
      <div className='db-metric-grid'>
        {canViewFinance && (
          <>
            <MetricCard
              label='Expected fees'
              value={fmt(stats.totalFees)}
              sub='Current term'
              icon={<HiCurrencyDollar />}
              iconBg='#e6f1fb'
              iconColor='#185fa5'
            />
            <MetricCard
              label='Collected'
              value={fmt(stats.totalPayments)}
              sub={`${collectionRate}% of fees`}
              icon={<HiCash />}
              iconBg='#e1f5ee'
              iconColor='#0f6e56'
            />
            <MetricCard
              label='Outstanding'
              value={fmt(stats.outstanding)}
              sub={`${outRate}% owed`}
              icon={<HiTrendingUp />}
              iconBg='#fcebeb'
              iconColor='#a32d2d'
            />
            <MetricCard
              label='Collection rate'
              value={`${collectionRate}%`}
              sub='Performance'
              icon={<HiStar />}
              iconBg='#faeeda'
              iconColor='#854f0b'
            />
          </>
        )}
        {canViewStudents && (
          <MetricCard
            label='Active students'
            value={stats.totalStudents ?? "\u2014"}
            sub='This term'
            icon={<HiAcademicCap />}
            iconBg='#e1f5ee'
            iconColor='#0f6e56'
          />
        )}
        <MetricCard
          label='Classes'
          value={stats.classBreakdown.length}
          sub='With data'
          icon={<HiOfficeBuilding />}
          iconBg='#eeedfe'
          iconColor='#534ab7'
        />
      </div>

      {canViewFinance && (
        <div className='db-grid-2'>
          <CollectionRateCard stats={stats} collectionRate={collectionRate} />
          <div className='db-card'>
            <div className='db-card-header'>
              <div className='db-card-title'>
                <HiOfficeBuilding /> Class breakdown
              </div>
            </div>
            <ClassBreakdown data={stats.classBreakdown} />
          </div>
        </div>
      )}

      {canViewStudents && !canViewFinance && (
        <div className='db-card' style={{ marginTop: "1.25rem" }}>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiUserGroup /> Operations queue
            </div>
          </div>
          <MiniStatGrid
            items={[
              { label: "Active students", value: stats.totalStudents ?? "\u2014" },
              { label: "Classes covered", value: stats.classBreakdown.length },
              { label: "Term", value: currentTerm },
              { label: "Academic year", value: academicYear },
            ]}
          />
        </div>
      )}

      {canViewSystem && (
        <div className='db-card' style={{ marginTop: "1.25rem" }}>
          <div className='db-card-header'>
            <div className='db-card-title'>
              <HiShieldCheck /> System context
            </div>
          </div>
          <MiniStatGrid
            items={[
              { label: "Term", value: currentTerm },
              { label: "Academic year", value: academicYear },
              { label: "Classes active", value: stats.classBreakdown.length },
              { label: "Students on record", value: stats.totalStudents ?? "\u2014" },
            ]}
          />
        </div>
      )}

      {quickLinks.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <QuickLinks links={quickLinks} />
        </div>
      )}

      {can(PERMISSIONS.VIEW_PAYMENTS) && stats.recentPayments.length > 0 && (
        <div style={{ marginTop: "1.25rem" }}>
          <RecentTransactions
            payments={stats.recentPayments}
            title='Recent transactions'
            onViewAll={() => navigate("/payment-history")}
            canViewAll
          />
        </div>
      )}

      {hasNothing && (
        <div className='db-card' style={{ marginTop: "1.5rem" }}>
          <p style={{ color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
            Your account has limited dashboard access. Contact your admin to enable additional
            modules.
          </p>
          <MiniStatGrid
            items={[
              { label: "Academic year", value: academicYear || "Not set" },
              { label: "Current term", value: currentTerm || "Not set" },
            ]}
          />
        </div>
      )}
    </>
  );
}

// ─────────────────────────────────────────────
// Dashboard (main export)
// ─────────────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();
  const { role, can } = useRole();

  const roleMeta = ROLE_META[role] || null;
  const roleKey = role || ROLES.user;

  const canViewFinance = can(PERMISSIONS.VIEW_PAYMENTS) || can(PERMISSIONS.VIEW_FEES);
  const canViewStudents = can(PERMISSIONS.VIEW_STUDENTS) || can(PERMISSIONS.VIEW_FAMILIES);
  const canViewSystem = can(PERMISSIONS.VIEW_ROLES) || can(PERMISSIONS.VIEW_SETTINGS);

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
  useEffect(() => {
    const timer = setInterval(() => setActiveSlide((prev) => (prev + 1) % APP_SLIDES.length), 6000);
    return () => clearInterval(timer);
  }, []);

  if (loading) return <DashboardSkeleton />;
  if (error) {
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
  }

  const collectionRate =
    stats.totalFees > 0 ? Math.round((stats.totalPayments / stats.totalFees) * 100) : 0;

  const roleHeadings = {
    [ROLES.super_admin]: {
      title: "Super admin command center",
      sub: "Cross-role finance and operations intelligence",
    },
    [ROLES.admin]: {
      title: "Admin operations dashboard",
      sub: "Day-to-day collections and workflow tracking",
    },
    [ROLES.it_admin]: {
      title: "IT admin control desk",
      sub: "System access, permissions, and data health",
    },
    [ROLES.accountant]: {
      title: "Accountant finance dashboard",
      sub: "Billing, collection, and outstanding balances",
    },
    [ROLES.admin_officer]: {
      title: "Admin officer workbench",
      sub: "Operational queues and student workload",
    },
    [ROLES.user]: { title: "Workspace summary", sub: "Operational view for this account" },
  };
  const header = roleHeadings[roleKey] || { title: "Dashboard", sub: "Your workspace" };

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
      label: "Fee setup",
      to: "/fee-setup",
      icon: <HiCollection />,
    },
    {
      show: can(PERMISSIONS.VIEW_PAYMENTS),
      label: "Payments",
      to: "/payment-history",
      icon: <HiCurrencyDollar />,
    },
    { show: can(PERMISSIONS.VIEW_SETTINGS), label: "Settings", to: "/settings", icon: <HiCog /> },
    {
      show: can(PERMISSIONS.VIEW_ROLES),
      label: "Role management",
      to: "/roles",
      icon: <HiShieldCheck />,
    },
  ]
    .filter((l) => l.show)
    .map((l) => ({ ...l, onClick: () => navigate(l.to) }));

  const sharedProps = {
    stats,
    collectionRate,
    academicYear,
    currentTerm,
    quickLinks,
    navigate,
    can,
  };

  // Known roles get their curated view.
  // Any new role created outside these five falls through to GenericPermissionView.
  const dashboardView = {
    [ROLES.super_admin]: <SuperAdminView {...sharedProps} />,
    [ROLES.admin]: <AdminView {...sharedProps} />,
    [ROLES.accountant]: <AccountantView {...sharedProps} />,
    [ROLES.it_admin]: <ITAdminView {...sharedProps} />,
    [ROLES.admin_officer]: <AdminOfficerView {...sharedProps} />,
  }[roleKey] ?? (
    <GenericPermissionView
      {...sharedProps}
      canViewFinance={canViewFinance}
      canViewStudents={canViewStudents}
      canViewSystem={canViewSystem}
    />
  );

  return (
    <div className='dashboard-wrapper'>
      <div className='right'>
        <header className='dashboard-header'>
          <div>
            <h3>{header.title}</h3>
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

        {dashboardView}
      </div>

      <PromoSlider
        activeSlide={activeSlide}
        onSlideSelect={setActiveSlide}
        onSlideAction={(to) => navigate(to)}
      />
    </div>
  );
}
