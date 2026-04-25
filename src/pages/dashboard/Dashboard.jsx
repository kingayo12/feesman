import { useEffect, useState, useCallback } from "react";
import { getDashboardFinanceStats, getTodayPayments } from "./dashboardService";
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
import {
  DashboardSkeleton,
  PromoSlider,
  ProgressBar,
  MetricCard,
  CollectionRateCard,
  TermTrendChart,
  ClassBreakdown,
  MethodDonut,
  MiniStatGrid,
  QuickLinks,
  RecentTransactions,
  fmt,
  calcPct,
} from "./DashboardWidgets";

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const METHOD_COLORS = ["#378add", "#1d9e75", "#ef9f27", "#d4537e", "#534ab7", "#06b6d4"];
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

const EMPTY_TODAY = { total: 0, payments: [], count: 0 };

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

// Accountant — sees "Collected today" instead of "Expected fees",
// but keeps term-total collected, outstanding, and collection rate
function AccountantView({ stats, todayStats, collectionRate, quickLinks, navigate, can }) {
  const outRate = calcPct(stats.outstanding, stats.totalFees);
  return (
    <>
      <div className='db-metric-grid'>
        <MetricCard
          label='Collected today'
          value={fmt(todayStats.total)}
          sub={`${todayStats.count} transaction${todayStats.count !== 1 ? "s" : ""} today`}
          pill={todayStats.total > 0 ? "Active" : "None yet"}
          pillClass={todayStats.total > 0 ? "pill-green" : "pill-amber"}
          icon={<HiCash />}
          iconBg='#e1f5ee'
          iconColor='#0f6e56'
        />
        <MetricCard
          label='Cash in flow'
          value={fmt(stats.totalPayments)}
          sub='Total collections this term'
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

// IT Admin — no finance metrics at all
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

// Admin Officer — operational view, "Collected today" as activity signal
function AdminOfficerView({
  stats,
  todayStats,
  academicYear,
  currentTerm,
  quickLinks,
  navigate,
  can,
}) {
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
          label='Collected today'
          value={fmt(todayStats.total)}
          sub={`${todayStats.count} payment${todayStats.count !== 1 ? "s" : ""} logged`}
          pill={todayStats.total > 0 ? "Active" : "None yet"}
          pillClass={todayStats.total > 0 ? "pill-green" : "pill-amber"}
          icon={<HiCash />}
          iconBg='#e1f5ee'
          iconColor='#0f6e56'
        />
        <MetricCard
          label='Current term'
          value={currentTerm}
          sub={academicYear}
          icon={<HiClipboardList />}
          iconBg='#eeedfe'
          iconColor='#534ab7'
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
  todayStats,
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
              label='Collected today'
              value={fmt(todayStats.total)}
              sub={`${todayStats.count} transaction${todayStats.count !== 1 ? "s" : ""} today`}
              pill={todayStats.total > 0 ? "Active" : "None yet"}
              pillClass={todayStats.total > 0 ? "pill-green" : "pill-amber"}
              icon={<HiCash />}
              iconBg='#e1f5ee'
              iconColor='#0f6e56'
            />
            {/* <MetricCard
              label='Collected'
              value={fmt(stats.totalPayments)}
              sub={`${collectionRate}% of fees`}
              icon={<HiCash />}
              iconBg='#e1f5ee'
              iconColor='#0f6e56'
            /> */}
            <MetricCard
              label='Outstanding'
              value={fmt(stats.outstanding)}
              sub={`${outRate}% owed`}
              icon={<HiTrendingUp />}
              iconBg='#fcebeb'
              iconColor='#a32d2d'
            />
            {/* <MetricCard
              label='Collection rate'
              value={`${collectionRate}%`}
              sub='Performance'
              icon={<HiStar />}
              iconBg='#faeeda'
              iconColor='#854f0b'
            /> */}
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
          {/* <CollectionRateCard stats={stats} collectionRate={collectionRate} />. */}
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
  const [todayStats, setTodayStats] = useState(EMPTY_TODAY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [academicYear, setAcademicYear] = useState(null);
  const [currentTerm, setCurrentTerm] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const navigate = useNavigate();
  const { role, can } = useRole();

  const roleMeta = ROLE_META[role] || null;
  const roleKey = role || ROLES.user;

  // Only super_admin and admin see full term-level finance (expected fees, full collected)
  const isFinanceAdmin = roleKey === ROLES.super_admin || roleKey === ROLES.admin;

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

      // All roles get the general stats (class breakdown, student counts, etc.)
      const data = await getDashboardFinanceStats(academicYear, currentTerm);
      setStats({ ...EMPTY_STATS, ...data });

      // Non-finance-admin roles get today's collections instead of full term totals
      if (!isFinanceAdmin) {
        const today = await getTodayPayments(academicYear, currentTerm);
        setTodayStats(today);
      }
    } catch {
      setError("Failed to load dashboard statistics.");
      setStats(EMPTY_STATS);
    } finally {
      setLoading(false);
    }
  }, [academicYear, currentTerm, isFinanceAdmin]);

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
    todayStats,
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
        slides={APP_SLIDES}
        activeSlide={activeSlide}
        onSlideSelect={setActiveSlide}
        onSlideAction={(to) => navigate(to)}
      />
    </div>
  );
}
