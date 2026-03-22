import { useEffect, useState } from "react";
import { getClasses } from "../classes/classService";
import { getAllStudents } from "../students/studentService";
import { useSettings } from "../../hooks/useSettings";
import { calculateStudentBalance } from "../../hooks/Usestudentbalance"; // ✅ fixed: was Usestudentbalance
import {
  HiChartBar,
  HiRefresh,
  HiExclamationCircle,
  HiCheckCircle,
  HiDownload,
} from "react-icons/hi";

// ── Skeleton bone ──────────────────────────────────────────────────────────
function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ── Inline bar (used in table rate column) ─────────────────────────────────
function InlineBar({ pct }) {
  const col = pct >= 80 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
      <div
        style={{
          width: 60,
          height: 6,
          background: "var(--color-border-tertiary)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div style={{ width: `${pct}%`, height: "100%", background: col, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 12 }}>{pct}%</span>
    </div>
  );
}

// ── Horizontal bar chart ───────────────────────────────────────────────────
function HBar({ data, height = 220 }) {
  if (!data?.length) return null;
  const max = Math.max(...data.map((d) => d.totalFees), 1);
  const rowH = Math.floor((height - 10) / data.length);

  return (
    <svg width='100%' viewBox={`0 0 520 ${height}`}>
      {data.map((d, i) => {
        const feeW = (d.totalFees / max) * 400;
        const paidW = (d.totalPaid / max) * 400;
        const y = i * rowH + 4;
        return (
          <g key={d.classId}>
            <text
              x='0'
              y={y + rowH / 2 + 4}
              fontSize='10'
              fill='var(--color-text-secondary)'
              style={{ fontFamily: "sans-serif" }}
            >
              {d.className.slice(0, 12)}
            </text>
            {/* Fee bar (ghost) */}
            <rect x={110} y={y + 3} width={feeW} height={rowH - 8} rx='3' fill='#e0e7ff' />
            {/* Paid bar */}
            <rect
              x={110}
              y={y + 3}
              width={paidW}
              height={rowH - 8}
              rx='3'
              fill='#4f46e5'
              opacity='0.85'
            />
          </g>
        );
      })}
      {/* Legend */}
      <rect x={0} y={height - 14} width={10} height={10} rx='2' fill='#e0e7ff' />
      <text x={14} y={height - 5} fontSize='9' fill='var(--color-text-secondary)'>
        Expected
      </text>
      <rect x={70} y={height - 14} width={10} height={10} rx='2' fill='#4f46e5' />
      <text x={84} y={height - 5} fontSize='9' fill='var(--color-text-secondary)'>
        Collected
      </text>
    </svg>
  );
}

// ── CSV export ────────────────────────────────────────────────────────────
function exportCSV(reportData, term, session) {
  const header = [
    "Class",
    "Students",
    "Expected (₦)",
    "Collected (₦)",
    "Outstanding (₦)",
    "Rate (%)",
    "Fully Paid",
    "Owing",
  ];
  const rows = reportData.map((r) => [
    r.className,
    r.studentCount,
    r.totalFees,
    r.totalPaid,
    r.outstanding,
    r.collectionRate,
    r.fullyPaid,
    r.withBalance,
  ]);
  const csv = [header, ...rows].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `report_${session}_${term}.csv`.replace(/\//g, "-").replace(/\s/g, "_");
  a.click();
}

// ── Reports page ──────────────────────────────────────────────────────────
export default function Reports() {
  const { settings, loading: settingsLoading } = useSettings();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [viewMode, setViewMode] = useState("table"); // "table" | "cards" | "chart"

  useEffect(() => {
    if (settings.currentTerm && !selectedTerm) setSelectedTerm(settings.currentTerm);
  }, [settings.currentTerm]);

  useEffect(() => {
    if (!settings.academicYear || !selectedTerm) return;
    generateReport();
  }, [settings.academicYear, selectedTerm]);

  const generateReport = async () => {
    setLoading(true);
    try {
      const [classData, allStudents] = await Promise.all([getClasses(), getAllStudents()]);

      const classReports = await Promise.all(
        classData.map(async (cls) => {
          const classStudents = allStudents.filter((s) => s.classId === cls.id);
          if (!classStudents.length) return null;

          const balances = await Promise.all(
            classStudents.map((s) =>
              calculateStudentBalance(s.id, s.classId, settings.academicYear, selectedTerm),
            ),
          );

          const totalFees = balances.reduce((s, b) => s + b.totalFees, 0);
          const totalPaid = balances.reduce((s, b) => s + b.totalPaid, 0);
          const outstanding = totalFees - totalPaid;
          const fullyPaid = balances.filter((b) => b.balance <= 0).length;
          const withBalance = balances.filter((b) => b.balance > 0).length;
          const collectionRate = totalFees > 0 ? Math.round((totalPaid / totalFees) * 100) : 0;

          return {
            classId: cls.id,
            className: cls.name,
            studentCount: classStudents.length,
            totalFees,
            totalPaid,
            outstanding,
            fullyPaid,
            withBalance,
            collectionRate,
          };
        }),
      );

      setReportData(classReports.filter(Boolean));
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const grandFees = reportData.reduce((s, r) => s + r.totalFees, 0);
  const grandPaid = reportData.reduce((s, r) => s + r.totalPaid, 0);
  const grandOutstanding = grandFees - grandPaid;
  const overallRate = grandFees > 0 ? Math.round((grandPaid / grandFees) * 100) : 0;

  if (settingsLoading)
    return (
      <div className='student-list-container'>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr 1fr",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className='finance-card'>
              <Bone h={60} />
            </div>
          ))}
        </div>
        <Bone h={300} r={12} />
        <style>{`
        .skel-bone { background:linear-gradient(90deg,var(--skel-base,#e2e8f0) 25%,var(--skel-shine,#f1f5f9) 50%,var(--skel-base,#e2e8f0) 75%); background-size:200% 100%; animation:skel-shimmer 1.4s ease-in-out infinite; display:block; }
        @keyframes skel-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        [data-theme="dark"] .skel-bone { --skel-base:#1e293b; --skel-shine:#334155; }
      `}</style>
      </div>
    );

  return (
    <div className='student-list-container'>
      {/* ── Header ──────────────────────────────────────────── */}
      <div className='list-page-header'>
        <div className='header-title'>
          <HiChartBar className='main-icon' />
          <div>
            <h2>Collection Reports</h2>
            <p>
              {settings.academicYear} — {selectedTerm}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <button className='filter-btn' onClick={generateReport} disabled={loading}>
            <HiRefresh /> Refresh
          </button>
          {reportData.length > 0 && (
            <button
              className='filter-btn'
              onClick={() => exportCSV(reportData, selectedTerm, settings.academicYear)}
            >
              <HiDownload /> CSV
            </button>
          )}
        </div>
      </div>

      {/* ── Term tabs ────────────────────────────────────────── */}
      <div className='term-selector-tabs' style={{ marginBottom: "1.5rem" }}>
        {["1st Term", "2nd Term", "3rd Term"].map((t) => (
          <button
            key={t}
            className={`term-tab ${selectedTerm === t ? "active" : ""}`}
            onClick={() => setSelectedTerm(t)}
          >
            {t}
          </button>
        ))}
      </div>

      {/* ── Summary cards ────────────────────────────────────── */}
      <div className='finance-grid' style={{ marginBottom: "1.5rem" }}>
        {[
          { label: "Expected Revenue", val: `₦${grandFees.toLocaleString()}`, cls: "" },
          { label: "Collected", val: `₦${grandPaid.toLocaleString()}`, cls: "cleared" },
          {
            label: "Outstanding",
            val: `₦${grandOutstanding.toLocaleString()}`,
            cls: grandOutstanding > 0 ? "debt" : "cleared",
          },
          {
            label: "Collection Rate",
            val: `${overallRate}%`,
            cls: overallRate >= 80 ? "cleared" : overallRate >= 50 ? "" : "debt",
          },
        ].map(({ label, val, cls }) => (
          <div key={label} className='finance-card'>
            <div className='f-data'>
              <label>{label}</label>
              <h3 className={cls}>{val}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* ── View toggle + chart ───────────────────────────────── */}
      <div className='table-card' style={{ marginBottom: "1.25rem", padding: "1.25rem" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1rem",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Collection by Class</h3>
          <div style={{ display: "flex", gap: "0.375rem" }}>
            {["table", "cards", "chart"].map((m) => (
              <button
                key={m}
                onClick={() => setViewMode(m)}
                style={{
                  padding: "5px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  border: "1px solid var(--color-border-secondary)",
                  background: viewMode === m ? "#4f46e5" : "transparent",
                  color: viewMode === m ? "#fff" : "var(--color-text-secondary)",
                }}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "2rem", textAlign: "center" }}>
            <div className='spinner' />
            <p style={{ marginTop: "1rem", color: "var(--color-text-secondary)", fontSize: 13 }}>
              Calculating balances…
            </p>
          </div>
        ) : reportData.length === 0 ? (
          <p className='empty-row'>No data for {selectedTerm}. Make sure fees are configured.</p>
        ) : viewMode === "chart" ? (
          <HBar data={reportData} height={Math.max(reportData.length * 32, 120)} />
        ) : viewMode === "cards" ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))",
              gap: "1rem",
            }}
          >
            {reportData.map((row) => {
              const col =
                row.collectionRate >= 80
                  ? "#10b981"
                  : row.collectionRate >= 50
                    ? "#f59e0b"
                    : "#ef4444";
              return (
                <div
                  key={row.classId}
                  style={{
                    background: "var(--color-background-secondary)",
                    borderRadius: 12,
                    padding: "1rem",
                    border: "1px solid var(--color-border-tertiary)",
                  }}
                >
                  <p style={{ fontWeight: 700, margin: "0 0 0.75rem", fontSize: 14 }}>
                    {row.className}
                  </p>
                  <div
                    style={{
                      height: 4,
                      background: "var(--color-border-tertiary)",
                      borderRadius: 2,
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: `${row.collectionRate}%`,
                        height: "100%",
                        background: col,
                        borderRadius: 2,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "var(--color-text-secondary)" }}>Students</span>
                    <span style={{ fontWeight: 600 }}>{row.studentCount}</span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: 12,
                      marginBottom: 4,
                    }}
                  >
                    <span style={{ color: "var(--color-text-secondary)" }}>Collected</span>
                    <span style={{ fontWeight: 600, color: col }}>
                      ₦{row.totalPaid.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ color: "var(--color-text-secondary)" }}>Outstanding</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: row.outstanding > 0 ? "#ef4444" : "#10b981",
                      }}
                    >
                      ₦{row.outstanding.toLocaleString()}
                    </span>
                  </div>
                  <div style={{ marginTop: "0.75rem", textAlign: "right" }}>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 700,
                        color: col,
                        background: col + "22",
                        padding: "2px 8px",
                        borderRadius: 99,
                      }}
                    >
                      {row.collectionRate}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Table view */
          <div style={{ overflowX: "auto" }}>
            <table className='data-table'>
              <thead>
                <tr>
                  <th>Class</th>
                  <th className='text-center'>Students</th>
                  <th className='text-right'>Expected</th>
                  <th className='text-right'>Collected</th>
                  <th className='text-right'>Outstanding</th>
                  <th className='text-center'>Rate</th>
                  <th className='text-center'>Paid</th>
                  <th className='text-center'>Owing</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row) => (
                  <tr key={row.classId}>
                    <td>
                      <strong>{row.className}</strong>
                    </td>
                    <td className='text-center'>{row.studentCount}</td>
                    <td className='text-right'>₦{row.totalFees.toLocaleString()}</td>
                    <td className='text-right text-success'>₦{row.totalPaid.toLocaleString()}</td>
                    <td className={`text-right ${row.outstanding > 0 ? "text-danger" : ""}`}>
                      ₦{row.outstanding.toLocaleString()}
                    </td>
                    <td className='text-center'>
                      <InlineBar pct={row.collectionRate} />
                    </td>
                    <td className='text-center'>
                      <span
                        style={{
                          color: "var(--color-text-success)",
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          justifyContent: "center",
                        }}
                      >
                        <HiCheckCircle /> {row.fullyPaid}
                      </span>
                    </td>
                    <td className='text-center'>
                      {row.withBalance > 0 ? (
                        <span
                          style={{
                            color: "var(--color-text-danger)",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            justifyContent: "center",
                          }}
                        >
                          <HiExclamationCircle /> {row.withBalance}
                        </span>
                      ) : (
                        <span style={{ color: "var(--color-text-success)" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr
                  style={{ fontWeight: 600, borderTop: "2px solid var(--color-border-secondary)" }}
                >
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td className='text-center'>
                    {reportData.reduce((s, r) => s + r.studentCount, 0)}
                  </td>
                  <td className='text-right'>₦{grandFees.toLocaleString()}</td>
                  <td className='text-right text-success'>₦{grandPaid.toLocaleString()}</td>
                  <td className={`text-right ${grandOutstanding > 0 ? "text-danger" : ""}`}>
                    ₦{grandOutstanding.toLocaleString()}
                  </td>
                  <td className='text-center'>
                    <InlineBar pct={overallRate} />
                  </td>
                  <td className='text-center'>{reportData.reduce((s, r) => s + r.fullyPaid, 0)}</td>
                  <td className='text-center'>
                    {reportData.reduce((s, r) => s + r.withBalance, 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
