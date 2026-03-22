/**
 * Skeleton.jsx
 * Shared skeleton loading components used across all list/detail pages.
 * Place in: src/components/common/Skeleton.jsx
 *
 * Usage:
 *   import { StudentListSkeleton } from "../../components/common/Skeleton";
 *   if (loading) return <StudentListSkeleton />;
 */

const SHIMMER = `
  .skel-bone {
    background: linear-gradient(
      90deg,
      var(--skel-base,  #e2e8f0) 25%,
      var(--skel-shine, #f1f5f9) 50%,
      var(--skel-base,  #e2e8f0) 75%
    );
    background-size: 200% 100%;
    animation: skel-shimmer 1.4s ease-in-out infinite;
    display: block;
    flex-shrink: 0;
  }
  @keyframes skel-shimmer {
    0%   { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
  [data-theme="dark"] .skel-bone {
    --skel-base:  #1e293b;
    --skel-shine: #334155;
  }
`;

let shimmerInjected = false;
function injectShimmer() {
  if (shimmerInjected) return;
  const tag = document.createElement("style");
  tag.textContent = SHIMMER;
  document.head.appendChild(tag);
  shimmerInjected = true;
}

// ── Bone ──────────────────────────────────────────────────────────────────
export function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  injectShimmer();
  return <span className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ── Helpers ───────────────────────────────────────────────────────────────
const row = (style = {}) => ({
  display: "flex",
  alignItems: "center",
  gap: 12,
  ...style,
});
const col = (style = {}) => ({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  ...style,
});
const tableRow = (cols, key) => (
  <tr key={key} style={{ borderBottom: "1px solid var(--border-light, #f1f5f9)" }}>
    {cols.map((c, i) => (
      <td key={i} style={{ padding: "14px 16px" }}>
        <Bone w={c.w || "80%"} h={c.h || 14} r={c.r || 6} />
        {c.sub && <Bone w={c.sub} h={11} r={4} style={{ marginTop: 6 }} />}
      </td>
    ))}
  </tr>
);

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT LIST SKELETON
// ═══════════════════════════════════════════════════════════════════════════
export function StudentListSkeleton() {
  return (
    <div className='student-list-container'>
      {/* Header */}
      <div className='list-page-header'>
        <div style={row()}>
          <Bone w={52} h={52} r={12} />
          <div style={col()}>
            <Bone w={180} h={22} />
            <Bone w={240} h={14} />
          </div>
        </div>
        <Bone w={90} h={30} r={99} />
      </div>

      {/* Controls */}
      <div className='table-controls'>
        <Bone w='100%' h={42} r={10} />
        <Bone w={90} h={42} r={10} />
      </div>

      {/* Table */}
      <div className='table-card'>
        <table className='data-table' style={{ width: "100%" }}>
          <thead>
            <tr>
              {["Student Name", "Class", "Session", "Family", "Status", "Action"].map((h) => (
                <th
                  key={h}
                  style={{ padding: "12px 16px", background: "var(--bg-secondary,#f8fafc)" }}
                >
                  <Bone w={h.length * 7} h={11} r={4} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 8 }).map((_, i) =>
              tableRow(
                [
                  { w: 180, h: 14, sub: "60px" },
                  { w: 80 },
                  { w: 90 },
                  { w: 110 },
                  { w: 60, h: 22, r: 99 },
                  { w: 70 },
                ],
                i,
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDENT DETAILS SKELETON
// ═══════════════════════════════════════════════════════════════════════════
export function StudentDetailsSkeleton() {
  return (
    <div className='student-details-wrapper'>
      {/* Back link */}
      <Bone w={140} h={16} r={6} style={{ marginBottom: 24 }} />

      {/* Profile hero */}
      <div className='profile-hero' style={{ marginBottom: "1.5rem" }}>
        <div style={row()}>
          <Bone w={64} h={64} r={50} />
          <div style={col()}>
            <Bone w={220} h={28} />
            <Bone w={180} h={14} />
          </div>
        </div>
        <Bone w={140} h={42} r={12} />
      </div>

      {/* Term tabs */}
      <div style={{ ...row(), gap: 8, marginBottom: 20 }}>
        {[120, 120, 120].map((w, i) => (
          <Bone key={i} w={w} h={40} r={8} />
        ))}
      </div>

      {/* Finance cards */}
      <div className='finance-grid' style={{ marginBottom: "2rem" }}>
        {[0, 1, 2].map((i) => (
          <div key={i} className='finance-card'>
            <Bone w={48} h={48} r={14} />
            <div style={col({ gap: 6 })}>
              <Bone w={100} h={11} />
              <Bone w={130} h={26} r={4} />
            </div>
          </div>
        ))}
      </div>

      {/* Ledger + payments side-by-side */}
      <div className='finance_details'>
        {/* Fee breakdown */}
        <div className='billing-card' style={{ flex: 1 }}>
          <div className='card-top' style={{ marginBottom: "1rem" }}>
            <Bone w={160} h={18} />
            <Bone w={90} h={24} r={8} />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Description", "Amount", "Status"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px" }}>
                    <Bone w={h.length * 7} h={11} r={4} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 4 }).map((_, i) =>
                tableRow([{ w: 120 }, { w: 80 }, { w: 70, h: 28, r: 6 }], i),
              )}
            </tbody>
          </table>
        </div>

        {/* Payments */}
        <div className='history-card' style={{ flex: 1 }}>
          <div className='card-top' style={{ marginBottom: "1rem" }}>
            <Bone w={140} h={18} />
            <Bone w={60} h={24} r={8} />
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {["Date", "Method", "Amount", "Action"].map((h) => (
                  <th key={h} style={{ padding: "10px 12px" }}>
                    <Bone w={h.length * 7} h={11} r={4} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 3 }).map((_, i) =>
                tableRow([{ w: 80 }, { w: 60 }, { w: 80 }, { w: 70, h: 28, r: 6 }], i),
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FAMILY LIST SKELETON
// ═══════════════════════════════════════════════════════════════════════════
export function FamilyListSkeleton() {
  return (
    <div className='page-wrapper'>
      {/* FamilyForm placeholder */}
      <div
        style={{
          marginBottom: "1.5rem",
          padding: "1.5rem",
          borderRadius: 12,
          border: "1px solid var(--border-light,#f1f5f9)",
        }}
      >
        <Bone w={200} h={22} style={{ marginBottom: 8 }} />
        <Bone w={300} h={14} style={{ marginBottom: 20 }} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} style={col({ gap: 6 })}>
              <Bone w={80} h={12} />
              <Bone w='100%' h={40} r={4} />
            </div>
          ))}
        </div>
        <Bone w={160} h={42} r={10} style={{ marginTop: 20 }} />
      </div>

      {/* Table */}
      <div className='table-container'>
        <Bone w={280} h={13} r={6} style={{ marginBottom: 12 }} />
        <table className='data-table' style={{ width: "100%" }}>
          <thead>
            <tr>
              {[
                "Family Name",
                "Contact",
                "Term Fees",
                "Term Paid",
                "Outstanding",
                "Status",
                "Created",
                "Actions",
              ].map((h) => (
                <th
                  key={h}
                  style={{ padding: "12px 16px", background: "var(--bg-secondary,#f8fafc)" }}
                >
                  <Bone w={h.length * 7} h={11} r={4} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) =>
              tableRow(
                [
                  { w: 140 },
                  { w: 120, sub: "90px" },
                  { w: 80 },
                  { w: 80 },
                  { w: 80 },
                  { w: 60, h: 22, r: 99 },
                  { w: 90 },
                  { w: 80 },
                ],
                i,
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS LIST SKELETON
// ═══════════════════════════════════════════════════════════════════════════
export function ClassListSkeleton() {
  return (
    <div className='class-list-container'>
      {/* Header */}
      <div className='list-page-header'>
        <div style={row()}>
          <Bone w={52} h={52} r={12} />
          <div style={col()}>
            <Bone w={200} h={22} />
            <Bone w={260} h={14} />
          </div>
        </div>
        <Bone w={140} h={40} r={10} />
      </div>

      {/* Stat card */}
      <div className='stats-row'>
        <div className='stat-card' style={{ width: "fit-content", minWidth: 200, gap: 12 }}>
          <Bone w={32} h={32} r={8} />
          <div style={col({ gap: 6 })}>
            <Bone w={90} h={11} />
            <Bone w={40} h={24} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className='table-card'>
        <div className='card-header'>
          <Bone w={20} h={20} r={4} />
          <Bone w={120} h={18} />
        </div>
        <table className='data-table' style={{ width: "100%" }}>
          <thead>
            <tr>
              {["Class Name", "Section", "Academic Session", "Actions"].map((h) => (
                <th
                  key={h}
                  style={{ padding: "12px 16px", background: "var(--bg-secondary,#f8fafc)" }}
                >
                  <Bone w={h.length * 7} h={11} r={4} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 6 }).map((_, i) =>
              tableRow([{ w: 160 }, { w: 80, h: 22, r: 6 }, { w: 100 }, { w: 90 }], i),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CLASS DETAILS SKELETON
// ═══════════════════════════════════════════════════════════════════════════
export function ClassDetailsSkeleton() {
  return (
    <div className='class-details-container'>
      {/* Header */}
      <div className='details-header'>
        <div style={row()}>
          <Bone w={36} h={36} r={8} />
          <div style={col()}>
            <Bone w={180} h={22} />
            <Bone w={220} h={14} />
          </div>
        </div>
        <Bone w={80} h={34} r={6} />
      </div>

      {/* Info cards */}
      <div className='details-grid'>
        {["Class Name", "Section", "Academic Session", "Total Students"].map((label) => (
          <div key={label} className='info-card' style={col({ gap: 8 })}>
            <Bone w={label.length * 7} h={11} r={4} />
            <Bone w='60%' h={22} />
          </div>
        ))}
      </div>

      {/* Students table */}
      <div className='table-card'>
        <div className='card-header'>
          <Bone w={20} h={20} r={4} />
          <Bone w={170} h={18} />
        </div>
        <table className='data-table' style={{ width: "100%" }}>
          <thead>
            <tr>
              {["Student Name", "Session", "Status", "Action"].map((h) => (
                <th
                  key={h}
                  style={{ padding: "12px 16px", background: "var(--bg-secondary,#f8fafc)" }}
                >
                  <Bone w={h.length * 7} h={11} r={4} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, i) =>
              tableRow([{ w: 160 }, { w: 90 }, { w: 60, h: 22, r: 99 }, { w: 50 }], i),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
