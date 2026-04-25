import { useState } from "react";
import { HiArrowRight } from "react-icons/hi";
import { formatDate } from "../../utils/helpers";

const METHOD_COLORS = ["#378add", "#1d9e75", "#ef9f27", "#d4537e", "#534ab7", "#06b6d4"];
const METHOD_BADGE_CLASS = {
  "Bank Transfer": "method-tag method-blue",
  Cash: "method-tag method-teal",
  POS: "method-tag method-purple",
  Online: "method-tag method-amber",
};

function calcPct(value, max) {
  return max > 0 ? Math.min(Math.round((value / max) * 100), 100) : 0;
}

function getRateColor(rate) {
  return rate >= 80 ? "#1d9e75" : rate >= 50 ? "#ef9f27" : "#e24b4a";
}

function fmt(amount) {
  return "\u20a6" + Math.round(amount).toLocaleString();
}

export function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

export function DashboardSkeleton() {
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

export function PromoSlider({ slides, activeSlide, onSlideSelect, onSlideAction }) {
  const slide = slides[activeSlide];
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
        {slides.map((item, idx) => (
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

export function ProgressBar({ value, max, color = "#378add", label, sublabel }) {
  const pct = calcPct(value, max);
  return (
    <div className='db-progress-row'>
      <div className='db-progress-labels'>
        <span>{label}</span>
        <span style={{ color: "var(--color-text-secondary)" }}>{sublabel || `${pct}%`}</span>
      </div>
      <div className='db-progress-track'>
        <div className='db-progress-fill' style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

export function MetricCard({ label, value, sub, pill, pillClass, icon, iconBg, iconColor }) {
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

export function CollectionRateCard({ stats, collectionRate }) {
  const color = getRateColor(collectionRate);
  const outRate = calcPct(stats.outstanding, stats.totalFees);
  const circ = 2 * Math.PI * 28;
  const arcLen = (collectionRate / 100) * circ;

  return (
    <div className='db-card'>
      <div className='db-card-header'>
        <div className='db-card-title'>
          <span>Collection rate</span>
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

export function TermTrendChart({ data }) {
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

export function ClassBreakdown({ data }) {
  if (!data?.length)
    return (
      <p style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No class data available.</p>
    );

  return (
    <>
      {data.map((cls) => {
        const pct = calcPct(cls.paid, cls.fees);
        return (
          <ProgressBar
            key={cls.classId}
            value={cls.paid}
            max={cls.fees}
            color={getRateColor(pct)}
            label={cls.name}
            sublabel={`${pct}% · ${fmt(cls.paid)}`}
          />
        );
      })}
    </>
  );
}

export function MethodDonut({ data }) {
  if (!data?.length)
    return <p style={{ color: "var(--color-text-tertiary)", fontSize: 13 }}>No method data.</p>;

  const total = data.reduce((sum, segment) => sum + segment.amount, 0);
  const r = 50;
  const cx = 70;
  const cy = 70;
  const circ = 2 * Math.PI * r;

  const segments = data.map((d, i) => {
    const frac = d.amount / total;
    return {
      ...d,
      frac,
      cumulative: data.slice(0, i).reduce((sum, prev) => sum + prev.amount / total, 0),
    };
  });

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
      <svg
        width='140'
        height='140'
        viewBox='0 0 140 140'
        role='img'
        aria-label='Payment methods donut chart'
      >
        {segments.map((segment, i) => {
          const dash = segment.frac * circ;
          const offset = circ - segment.cumulative * circ;
          return (
            <circle
              key={segment.method}
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
              <title>{`${segment.method}: ${fmt(segment.amount)}`}</title>
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

export function MiniStatGrid({ items }) {
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

export function QuickLinks({ links }) {
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

export function RecentTransactions({
  payments,
  title = "Recent transactions",
  onViewAll,
  canViewAll,
}) {
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

export { calcPct, fmt, getRateColor };
