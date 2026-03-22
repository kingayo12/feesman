import { useEffect, useState, useMemo } from "react";
import { getPaymentsByTerm } from "./paymentService";
import { getAllStudents } from "../students/studentService";
import { useSettings } from "../../hooks/useSettings";
import { formatDate } from "../../utils/helpers";
import {
  HiCash,
  HiSearch,
  HiDownload,
  HiChevronUp,
  HiChevronDown,
  HiSelector,
} from "react-icons/hi";

// ── Skeleton ──────────────────────────────────────────────────────────────
function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function Skeleton() {
  return (
    <div className='student-list-container'>
      <div className='list-page-header'>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Bone w={52} h={52} r={12} />
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <Bone w={160} h={22} />
            <Bone w={200} h={14} />
          </div>
        </div>
        <Bone w={120} h={32} r={99} />
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: "1.5rem" }}>
        {[0, 1, 2].map((i) => (
          <Bone key={i} w={100} h={38} r={8} />
        ))}
      </div>
      <div className='finance-grid' style={{ marginBottom: "1.5rem" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className='finance-card'>
            <Bone h={52} />
          </div>
        ))}
      </div>
      <div className='table-card' style={{ padding: "1rem" }}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "1rem",
              padding: "12px 0",
              borderBottom: "1px solid var(--border-light,#f1f5f9)",
            }}
          >
            <Bone w={80} h={13} />
            <Bone w={140} h={13} />
            <Bone w={70} h={13} />
            <Bone w={60} h={13} style={{ marginLeft: "auto" }} />
            <Bone w={80} h={13} />
          </div>
        ))}
      </div>
      <style>{`
        .skel-bone { background:linear-gradient(90deg,var(--skel-base,#e2e8f0) 25%,var(--skel-shine,#f1f5f9) 50%,var(--skel-base,#e2e8f0) 75%); background-size:200% 100%; animation:skel-shimmer 1.4s ease-in-out infinite; display:block; flex-shrink:0; }
        @keyframes skel-shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        [data-theme="dark"] .skel-bone { --skel-base:#1e293b; --skel-shine:#334155; }
      `}</style>
    </div>
  );
}

// ── Sort icon ─────────────────────────────────────────────────────────────
function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <HiSelector style={{ opacity: 0.3, width: 14, height: 14 }} />;
  return sortDir === "asc" ? (
    <HiChevronUp style={{ width: 14, height: 14 }} />
  ) : (
    <HiChevronDown style={{ width: 14, height: 14 }} />
  );
}

// ── CSV export ────────────────────────────────────────────────────────────
function exportCSV(rows, session, term) {
  const header = ["Date", "Student", "Term", "Method", "Amount (N)"];
  const body = rows.map((r) => [r._dateStr, r._studentName, r.term, r.method, r.amount]);
  const csv = [header, ...body].map((r) => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `payments_${session}_${term}`.replace(/\//g, "-").replace(/\s/g, "_") + ".csv";
  a.click();
}

const PAGE_SIZE = 15;

// ── Page ──────────────────────────────────────────────────────────────────
export default function PaymentHistory() {
  const { settings, loading: settingsLoading } = useSettings();
  const [payments, setPayments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sortCol, setSortCol] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);

  useEffect(() => {
    if (settings.currentTerm && !selectedTerm) setSelectedTerm(settings.currentTerm);
  }, [settings.currentTerm]);

  useEffect(() => {
    if (!settings.academicYear || !selectedTerm) return;
    setSearch("");
    setPage(1);
    (async () => {
      setLoading(true);
      try {
        const [payData, studentData] = await Promise.all([
          getPaymentsByTerm(settings.academicYear, selectedTerm),
          getAllStudents(),
        ]);
        setStudents(studentData || []);
        setPayments(payData || []);
      } catch (err) {
        console.error("Failed to load payment history:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [settings.academicYear, selectedTerm]);

  // Name lookup map
  const nameMap = useMemo(() => {
    const m = {};
    students.forEach((s) => {
      m[s.id] = `${s.firstName} ${s.lastName}`;
    });
    return m;
  }, [students]);

  // Enrich
  const enriched = useMemo(
    () =>
      payments.map((p) => ({
        ...p,
        _studentName: nameMap[p.studentId] || "Unknown Student",
        _dateStr: formatDate(p.date),
        _dateVal:
          p.date instanceof Date
            ? p.date
            : p.date?.toDate
              ? p.date.toDate()
              : new Date(p.date || 0),
      })),
    [payments, nameMap],
  );

  // Filter
  const filtered = useMemo(() => {
    if (!search.trim()) return enriched;
    const q = search.toLowerCase();
    return enriched.filter(
      (p) =>
        p._studentName.toLowerCase().includes(q) ||
        (p.method || "").toLowerCase().includes(q) ||
        (p.term || "").toLowerCase().includes(q) ||
        p._dateStr.toLowerCase().includes(q),
    );
  }, [enriched, search]);

  // Sort
  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        let va, vb;
        if (sortCol === "date") {
          va = a._dateVal;
          vb = b._dateVal;
        } else if (sortCol === "student") {
          va = a._studentName;
          vb = b._studentName;
        } else if (sortCol === "method") {
          va = a.method || "";
          vb = b.method || "";
        } else if (sortCol === "term") {
          va = a.term || "";
          vb = b.term || "";
        } else if (sortCol === "amount") {
          va = Number(a.amount);
          vb = Number(b.amount);
        } else {
          return 0;
        }
        if (va < vb) return sortDir === "asc" ? -1 : 1;
        if (va > vb) return sortDir === "asc" ? 1 : -1;
        return 0;
      }),
    [filtered, sortCol, sortDir],
  );

  // Paginate
  const totalPages = Math.max(Math.ceil(sorted.length / PAGE_SIZE), 1);
  const paginated = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortCol(col);
      setSortDir("asc");
    }
    setPage(1);
  };

  // Summary figures (from filtered set so they respect search)
  const totalCollected = filtered.reduce((s, p) => s + Number(p.amount || 0), 0);
  const methodBreakdown = filtered.reduce((acc, p) => {
    const m = p.method || "Other";
    acc[m] = (acc[m] || 0) + Number(p.amount || 0);
    return acc;
  }, {});

  if (settingsLoading) return <Skeleton />;

  // Pagination page numbers with ellipsis
  const pageNums = Array.from({ length: totalPages }, (_, i) => i + 1)
    .filter((n) => n === 1 || n === totalPages || Math.abs(n - page) <= 1)
    .reduce((acc, n, i, arr) => {
      if (i > 0 && n - arr[i - 1] > 1) acc.push("…");
      acc.push(n);
      return acc;
    }, []);

  return (
    <div className='student-list-container'>
      {/* Header */}
      <div className='list-page-header'>
        <div className='header-title'>
          <HiCash className='main-icon' />
          <div>
            <h2>Payment History</h2>
            <p>
              {settings.academicYear} — {selectedTerm}
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span className='stat-pill'>₦{totalCollected.toLocaleString()}</span>
          {sorted.length > 0 && (
            <button
              className='filter-btn'
              onClick={() => exportCSV(sorted, settings.academicYear, selectedTerm)}
            >
              <HiDownload /> CSV
            </button>
          )}
        </div>
      </div>

      {/* Term tabs */}
      <div className='term-selector-tabs' style={{ marginBottom: "1.5rem" }}>
        {["1st Term", "2nd Term", "3rd Term"].map((term) => (
          <button
            key={term}
            className={`term-tab ${selectedTerm === term ? "active" : ""}`}
            onClick={() => {
              setSelectedTerm(term);
              setPage(1);
            }}
          >
            {term}
          </button>
        ))}
      </div>

      {/* Method cards */}
      <div className='finance-grid' style={{ marginBottom: "1.5rem" }}>
        {Object.entries(methodBreakdown).map(([method, amount]) => (
          <div className='finance-card' key={method}>
            <div className='f-data'>
              <label>{method}</label>
              <h3>₦{Number(amount).toLocaleString()}</h3>
            </div>
          </div>
        ))}
        <div className='finance-card balance-card'>
          <div className='f-data'>
            <label>Grand Total ({filtered.length} payments)</label>
            <h3 className='cleared'>₦{totalCollected.toLocaleString()}</h3>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className='table-card'>
        {/* Search */}
        <div
          style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border-light,#f1f5f9)" }}
        >
          <div className='search-box' style={{ maxWidth: 320 }}>
            <HiSearch className='search-icon' />
            <input
              type='text'
              placeholder='Search student, method, date…'
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "2.5rem", textAlign: "center" }}>
            <div className='spinner' />
            <p style={{ marginTop: "1rem", color: "var(--color-text-secondary)", fontSize: 13 }}>
              Loading payments…
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table className='data-table'>
                <thead>
                  <tr>
                    {[
                      { key: "date", label: "Date" },
                      { key: "student", label: "Student" },
                      { key: "term", label: "Term" },
                      { key: "method", label: "Method" },
                      { key: "amount", label: "Amount", right: true },
                    ].map(({ key, label, right }) => (
                      <th
                        key={key}
                        className={right ? "text-right" : ""}
                        style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}
                        onClick={() => toggleSort(key)}
                      >
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                          {label}
                          <SortIcon col={key} sortCol={sortCol} sortDir={sortDir} />
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.length > 0 ? (
                    paginated.map((p) => (
                      <tr key={p.id}>
                        <td style={{ whiteSpace: "nowrap" }}>{p._dateStr}</td>
                        <td>{p._studentName}</td>
                        <td>
                          <span className='class-tag'>{p.term}</span>
                        </td>
                        <td>
                          <span className='method-tag'>{p.method}</span>
                        </td>
                        <td className='text-right font-bold'>
                          ₦{Number(p.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan='5' className='empty-row'>
                        {search
                          ? `No payments matching "${search}"`
                          : `No payments recorded for ${selectedTerm}.`}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.75rem 1.25rem",
                  borderTop: "1px solid var(--border-light,#f1f5f9)",
                  fontSize: 13,
                  flexWrap: "wrap",
                  gap: "0.5rem",
                }}
              >
                <span style={{ color: "var(--color-text-secondary)" }}>
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of{" "}
                  {sorted.length}
                </span>
                <div style={{ display: "flex", gap: "0.375rem", flexWrap: "wrap" }}>
                  <button
                    className='ph-btn'
                    onClick={() => setPage((p) => Math.max(p - 1, 1))}
                    disabled={page === 1}
                  >
                    ← Prev
                  </button>
                  {pageNums.map((n, i) =>
                    n === "…" ? (
                      <span
                        key={`el-${i}`}
                        style={{ padding: "4px 8px", color: "var(--color-text-tertiary)" }}
                      >
                        …
                      </span>
                    ) : (
                      <button
                        key={n}
                        className={`ph-btn ${page === n ? "active" : ""}`}
                        onClick={() => setPage(n)}
                      >
                        {n}
                      </button>
                    ),
                  )}
                  <button
                    className='ph-btn'
                    onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    Next →
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        .ph-btn {
          padding:4px 10px; border-radius:6px; font-size:12px; font-weight:500;
          border:1px solid var(--color-border-secondary,#e2e8f0);
          background:transparent; color:var(--color-text-secondary); cursor:pointer;
          transition:background 0.15s;
        }
        .ph-btn:hover:not(:disabled) { background:var(--color-background-secondary,#f8fafc); }
        .ph-btn.active { background:#4f46e5; color:#fff; border-color:#4f46e5; }
        .ph-btn:disabled { opacity:0.4; cursor:not-allowed; }
        [data-theme="dark"] .ph-btn              { border-color:#334155; color:#94a3b8; }
        [data-theme="dark"] .ph-btn.active       { background:#4f46e5; color:#fff; border-color:#4f46e5; }
        [data-theme="dark"] .ph-btn:hover:not(:disabled) { background:#1e293b; }
      `}</style>
    </div>
  );
}
