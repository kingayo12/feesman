// ─── Inline progress bar ──────────────────────────────────────────────────
export function InlineBar({ pct }) {
  const col = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <div
        style={{ flex: 1, height: 6, background: "#e5e7eb", borderRadius: 3, overflow: "hidden" }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: col,
            borderRadius: 3,
            transition: "width 0.6s ease",
          }}
        />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: col, minWidth: 36 }}>{pct}%</span>
    </div>
  );
}

// ─── Small SVG donut ──────────────────────────────────────────────────────
export function Donut({ pct, size = 56, stroke = 7 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const col = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          stroke='#e5e7eb'
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill='none'
          stroke={col}
          strokeWidth={stroke}
          strokeDasharray={`${(pct / 100) * circ} ${circ}`}
          strokeLinecap='round'
          style={{ transition: "stroke-dasharray 0.8s ease" }}
        />
      </svg>
      <span
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          color: col,
        }}
      >
        {pct}%
      </span>
    </div>
  );
}

// ─── Milestone Tracker Component ───────────────────────────────────────────
export function MilestoneTracker({ rate }) {
  const milestones = [
    { pct: 25, label: "Quarter", icon: "🌱" },
    { pct: 50, label: "Halfway", icon: "⚡" },
    { pct: 75, label: "¾ Way", icon: "🔥" },
    { pct: 90, label: "Near Full", icon: "🎯" },
    { pct: 100, label: "Complete", icon: "🏆" },
  ];
  const col = rate >= 80 ? "#10b981" : rate >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ padding: "0.75rem 0 1.25rem" }}>
      <div
        style={{
          height: 4,
          background: "#e5e7eb",
          borderRadius: 2,
          position: "relative",
          marginBottom: "1.75rem",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${Math.min(rate, 100)}%`,
            background: col,
            borderRadius: 2,
            transition: "width 1s ease",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: `${Math.min(rate, 100)}%`,
            top: "50%",
            transform: "translate(-50%,-50%)",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: col,
            border: "2px solid white",
            boxShadow: `0 0 0 3px ${col}44`,
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {milestones.map((m) => {
          const reached = rate >= m.pct;
          return (
            <div
              key={m.pct}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                opacity: reached ? 1 : 0.38,
              }}
            >
              <span style={{ fontSize: 18 }}>{m.icon}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  color: reached ? "#111827" : "#9ca3af",
                  textAlign: "center",
                }}
              >
                {m.label}
              </span>
              <span style={{ fontSize: 10, color: "#6b7280" }}>{m.pct}%</span>
              {reached && <span style={{ fontSize: 9, color: "#10b981", fontWeight: 700 }}>✓</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Insight Card Component ───────────────────────────────────────────────
export function InsightCard({ insight }) {
  const colors = {
    success: { bg: "#f0fdf4", border: "#bbf7d0", title: "#15803d" },
    warning: { bg: "#fffbeb", border: "#fde68a", title: "#b45309" },
    danger: { bg: "#fff1f2", border: "#fecdd3", title: "#be123c" },
    info: { bg: "#eff6ff", border: "#bfdbfe", title: "#1d4ed8" },
  };
  const c = colors[insight.type] || colors.info;
  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 12,
        padding: "1rem 1.25rem",
        marginBottom: "0.75rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem" }}>
        <span style={{ fontSize: 22, lineHeight: 1, flexShrink: 0 }}>{insight.icon}</span>
        <div>
          <p style={{ margin: "0 0 0.4rem", fontWeight: 700, fontSize: 14, color: c.title }}>
            {insight.title}
          </p>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "#374151",
              lineHeight: 1.7,
              whiteSpace: "pre-line",
            }}
          >
            {insight.body}
          </p>
        </div>
      </div>
    </div>
  );
}
