/**
 * StudentInventory.jsx
 * Place in: src/pages/inventory/StudentInventory.jsx
 *
 * Usage — embed inside StudentDetails.jsx:
 *   import StudentInventory from "../inventory/StudentInventory";
 *   <StudentInventory studentId={student.id} studentName={student.name} classId={student.classId} />
 */

import { useEffect, useState, useCallback } from "react";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import { useAuth } from "../../context/AuthContext";
import { useSettings } from "../../hooks/Usesettings";
import {
  getInventoryItems,
  getStudentAssignments,
  assignItemToStudent,
  updateStudentAssignment,
  removeStudentAssignment,
  markAssignmentPaid,
} from "./inventoryService";
import {
  HiPlus,
  HiTrash,
  HiPencil,
  HiCheckCircle,
  HiExclamationCircle,
  HiArchive,
  HiX,
  HiRefresh,
  HiCurrencyDollar,
  HiTag,
} from "react-icons/hi";

const fmt = (n) => "\u20a6" + Math.round(n).toLocaleString();

function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className="skel-bone" style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);
  const bg = type === "error" ? "#fef2f2" : "#f0fdf4";
  const border = type === "error" ? "#fecaca" : "#bbf7d0";
  const color = type === "error" ? "#dc2626" : "#16a34a";
  return (
    <div style={{ position: "fixed", bottom: "1.5rem", right: "1.5rem", zIndex: 9999, background: bg, border: `1px solid ${border}`, color, borderRadius: 10, padding: "0.75rem 1.25rem", fontSize: 13, fontWeight: 500, display: "flex", alignItems: "center", gap: 10, boxShadow: "0 4px 16px rgba(0,0,0,0.10)", maxWidth: 360 }}>
      {type === "error" ? <HiExclamationCircle /> : <HiCheckCircle />}
      <span style={{ flex: 1 }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color, padding: 0 }}><HiX /></button>
    </div>
  );
}

// ─── Assign modal ─────────────────────────────────────────────────────────
function AssignModal({ studentId, studentName, classId, academicYear, term, onClose, onAssigned }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ itemId: "", quantity: 1, note: "" });
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    getInventoryItems({ activeOnly: true })
      .then((data) => { setItems(data); if (data.length) setForm((f) => ({ ...f, itemId: data[0].id })); })
      .finally(() => setLoadingItems(false));
  }, []);

  useEffect(() => {
    const found = items.find((i) => i.id === form.itemId);
    setSelectedItem(found || null);
  }, [form.itemId, items]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const previewTotal = selectedItem ? selectedItem.price * Number(form.quantity || 0) : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.itemId) return setError("Select an item.");
    if (!form.quantity || Number(form.quantity) < 1) return setError("Quantity must be at least 1.");
    setSaving(true);
    try {
      await assignItemToStudent({
        studentId,
        studentName,
        classId,
        itemId: form.itemId,
        quantity: Number(form.quantity),
        academicYear,
        term,
        note: form.note,
        assignedBy: user.uid,
      });
      onAssigned();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  // Group items by category for the select
  const grouped = items.reduce((acc, it) => {
    if (!acc[it.category]) acc[it.category] = [];
    acc[it.category].push(it);
    return acc;
  }, {});

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Assign Item to {studentName}</h3>
          <button className="modal-close" onClick={onClose}><HiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {error && <div className="form-error-banner"><HiExclamationCircle /> {error}</div>}

            <div className="form-row">
              <label className="form-label">Item *</label>
              {loadingItems ? (
                <Bone h={40} r={8} />
              ) : items.length === 0 ? (
                <p style={{ fontSize: 13, color: "#dc2626" }}>No active inventory items. Add items in the Inventory section first.</p>
              ) : (
                <select className="form-input" value={form.itemId} onChange={(e) => set("itemId", e.target.value)} required>
                  {Object.entries(grouped).map(([cat, catItems]) => (
                    <optgroup key={cat} label={cat}>
                      {catItems.map((it) => (
                        <option key={it.id} value={it.id} disabled={it.stock === 0}>
                          {it.name} — {fmt(it.price)}/{it.unit}
                          {it.stock === 0 ? " (out of stock)" : it.stock !== -1 ? ` (${it.stock} left)` : ""}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              )}
            </div>

            {/* Item preview */}
            {selectedItem && (
              <div style={{ background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "0.75rem 1rem", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 600 }}>{selectedItem.name}</p>
                  <p style={{ margin: 0, fontSize: 12, color: "var(--color-text-secondary)" }}>
                    {selectedItem.category} · {selectedItem.unit}
                    {selectedItem.stock !== -1 && <span style={{ marginLeft: 8 }}>{selectedItem.stock} in stock</span>}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#185fa5" }}>{fmt(selectedItem.price)}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "var(--color-text-secondary)" }}>per {selectedItem.unit}</p>
                </div>
              </div>
            )}

            <div className="form-row-2">
              <div className="form-row">
                <label className="form-label">Quantity *</label>
                <input
                  className="form-input"
                  type="number"
                  min="1"
                  max={selectedItem?.stock !== -1 ? selectedItem?.stock : undefined}
                  value={form.quantity}
                  onChange={(e) => set("quantity", e.target.value)}
                  required
                />
              </div>
              <div className="form-row">
                <label className="form-label">Total amount</label>
                <div className="form-input" style={{ background: "var(--color-background-secondary)", color: "#185fa5", fontWeight: 700 }}>
                  {previewTotal ? fmt(previewTotal) : "—"}
                </div>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">Note (optional)</label>
              <input className="form-input" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="e.g. Replacement, special order" />
            </div>

            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 8, padding: "0.625rem 0.875rem" }}>
              <p style={{ margin: 0, fontSize: 12, color: "#1d4ed8" }}>
                <strong>Price snapshot:</strong> The current price ({selectedItem ? fmt(selectedItem.price) : "—"}) will be locked to this assignment. Future price changes will not affect it.
              </p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={saving || items.length === 0 || loadingItems}>
              {saving ? "Assigning…" : "Assign item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit assignment modal ────────────────────────────────────────────────
function EditAssignmentModal({ assignment, onClose, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [form, setForm] = useState({ quantity: assignment.quantity, note: assignment.note || "" });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const previewTotal = assignment.priceSnapshot * Number(form.quantity || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.quantity || Number(form.quantity) < 1) return setError("Quantity must be at least 1.");
    setSaving(true);
    try {
      await updateStudentAssignment(assignment.id, { quantity: Number(form.quantity), note: form.note });
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" style={{ maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Assignment — {assignment.itemName}</h3>
          <button className="modal-close" onClick={onClose}><HiX /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
            {error && <div className="form-error-banner"><HiExclamationCircle /> {error}</div>}

            <div style={{ background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 10, padding: "0.75rem 1rem" }}>
              <p style={{ margin: "0 0 2px", fontSize: 12, color: "var(--color-text-secondary)" }}>Locked price (snapshot)</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: "#185fa5" }}>{fmt(assignment.priceSnapshot)} / {assignment.unit}</p>
            </div>

            <div className="form-row-2">
              <div className="form-row">
                <label className="form-label">Quantity</label>
                <input className="form-input" type="number" min="1" value={form.quantity} onChange={(e) => set("quantity", e.target.value)} required />
              </div>
              <div className="form-row">
                <label className="form-label">New total</label>
                <div className="form-input" style={{ background: "var(--color-background-secondary)", color: "#185fa5", fontWeight: 700 }}>{fmt(previewTotal)}</div>
              </div>
            </div>

            <div className="form-row">
              <label className="form-label">Note</label>
              <input className="form-input" value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Optional note" />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="cancel-btn" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="submit-btn" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────
export default function StudentInventory({ studentId, studentName, classId }) {
  const { user } = useAuth();
  const { can } = useRole();
  const { settings } = useSettings();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterTerm, setFilterTerm] = useState(settings.currentTerm || "");
  const [showAssign, setShowAssign] = useState(false);
  const [editAssignment, setEditAssignment] = useState(null);
  const [removingId, setRemovingId] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [toast, setToast] = useState(null);

  const canAssign = can(PERMISSIONS.EDIT_STUDENT) || can(PERMISSIONS.EDIT_FEE);
  const canRemove = can(PERMISSIONS.DELETE_PAYMENT) || can(PERMISSIONS.DANGER_ZONE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getStudentAssignments(studentId, {
        academicYear: settings.academicYear,
        term: filterTerm || undefined,
      });
      setAssignments(data);
    } catch (err) {
      setToast({ message: "Failed to load inventory assignments.", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [studentId, settings.academicYear, filterTerm]);

  useEffect(() => { load(); }, [load]);

  // Sync term filter when settings load
  useEffect(() => {
    if (settings.currentTerm && !filterTerm) setFilterTerm(settings.currentTerm);
  }, [settings.currentTerm]);

  const showToast = (message, type = "success") => setToast({ message, type });

  const handleRemove = async (id) => {
    if (!window.confirm("Remove this item from the student's record?")) return;
    setRemovingId(id);
    try {
      await removeStudentAssignment(id);
      showToast("Assignment removed.");
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setRemovingId(null);
    }
  };

  const handleTogglePaid = async (assignment) => {
    setTogglingId(assignment.id);
    try {
      await markAssignmentPaid(assignment.id, !assignment.isPaid);
      showToast(assignment.isPaid ? "Marked as unpaid." : "Marked as paid.");
      load();
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setTogglingId(null);
    }
  };

  // Totals
  const totalAmount = assignments.reduce((s, a) => s + a.totalAmount, 0);
  const totalPaid = assignments.filter((a) => a.isPaid).reduce((s, a) => s + a.totalAmount, 0);
  const totalOutstanding = totalAmount - totalPaid;

  const TERMS = ["1st Term", "2nd Term", "3rd Term"];

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });
  };

  return (
    <div>
      {/* Section header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <HiArchive style={{ fontSize: 18, color: "var(--color-text-secondary)" }} />
          <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Inventory Assignments</h3>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          {/* Term filter */}
          <div style={{ display: "flex", gap: "0.25rem" }}>
            <button
              className={`filter-btn ${!filterTerm ? "active" : ""}`}
              style={{ fontSize: 12 }}
              onClick={() => setFilterTerm("")}
            >
              All
            </button>
            {TERMS.map((t) => (
              <button
                key={t}
                className={`filter-btn ${filterTerm === t ? "active" : ""}`}
                style={{ fontSize: 12 }}
                onClick={() => setFilterTerm(t)}
              >
                {t}
              </button>
            ))}
          </div>
          <button className="icon-btn" onClick={load} title="Refresh"><HiRefresh /></button>
          {canAssign && (
            <button className="submit-btn" style={{ width: "auto", fontSize: 13 }} onClick={() => setShowAssign(true)}>
              <HiPlus /> Assign Item
            </button>
          )}
        </div>
      </div>

      {/* Summary bar */}
      {assignments.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", flexWrap: "wrap" }}>
          {[
            { label: "Total items", value: `${assignments.length} assignment${assignments.length !== 1 ? "s" : ""}`, color: "var(--color-text-primary)" },
            { label: "Total value", value: fmt(totalAmount), color: "#185fa5" },
            { label: "Paid", value: fmt(totalPaid), color: "#0f6e56" },
            { label: "Outstanding", value: fmt(totalOutstanding), color: totalOutstanding > 0 ? "#dc2626" : "#0f6e56" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, padding: "0.5rem 0.875rem" }}>
              <p style={{ margin: "0 0 2px", fontSize: 11, color: "var(--color-text-secondary)" }}>{label}</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[0, 1, 2].map((i) => <Bone key={i} h={64} r={10} />)}
        </div>
      ) : assignments.length === 0 ? (
        <div style={{ textAlign: "center", padding: "1.5rem", background: "var(--color-background-secondary)", borderRadius: 10, border: "1px dashed var(--color-border-secondary)" }}>
          <HiArchive style={{ fontSize: 28, color: "var(--color-text-secondary)", marginBottom: 8 }} />
          <p style={{ margin: "0 0 0.75rem", color: "var(--color-text-secondary)", fontSize: 13 }}>
            No inventory items assigned{filterTerm ? ` for ${filterTerm}` : ""}.
          </p>
          {canAssign && (
            <button className="submit-btn" style={{ width: "auto", fontSize: 13 }} onClick={() => setShowAssign(true)}>
              <HiPlus /> Assign first item
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {assignments.map((a) => (
            <div
              key={a.id}
              style={{
                border: "1px solid var(--color-border-tertiary)",
                borderRadius: 10,
                padding: "0.875rem 1rem",
                background: a.isPaid ? "var(--color-background-secondary)" : "var(--color-background-primary)",
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              {/* Paid indicator */}
              <div
                style={{
                  width: 6,
                  alignSelf: "stretch",
                  borderRadius: 3,
                  background: a.isPaid ? "#10b981" : "#f59e0b",
                  flexShrink: 0,
                }}
              />

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 14 }}>{a.itemName}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{a.category}</span>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>·</span>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {a.quantity} {a.unit}{a.quantity !== 1 ? "s" : ""} × {fmt(a.priceSnapshot)}
                      </span>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>·</span>
                      <span style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>{a.term}</span>
                    </div>
                    {a.note && (
                      <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--color-text-secondary)", fontStyle: "italic" }}>{a.note}</p>
                    )}
                    <p style={{ margin: "3px 0 0", fontSize: 11, color: "var(--color-text-secondary)" }}>
                      Assigned {formatDate(a.assignedAt)}
                    </p>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <p style={{ margin: "0 0 4px", fontWeight: 700, fontSize: 15, color: "#185fa5" }}>{fmt(a.totalAmount)}</p>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: 99,
                        background: a.isPaid ? "#dcfce7" : "#fef3c7",
                        color: a.isPaid ? "#15803d" : "#b45309",
                      }}
                    >
                      {a.isPaid ? "Paid" : "Unpaid"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
                {canAssign && (
                  <button
                    className="icon-btn"
                    title={a.isPaid ? "Mark as unpaid" : "Mark as paid"}
                    style={{ color: a.isPaid ? "#d97706" : "#16a34a" }}
                    disabled={togglingId === a.id}
                    onClick={() => handleTogglePaid(a)}
                  >
                    {togglingId === a.id ? "…" : a.isPaid ? <HiExclamationCircle /> : <HiCheckCircle />}
                  </button>
                )}
                {canAssign && (
                  <button
                    className="icon-btn"
                    title="Edit quantity"
                    onClick={() => setEditAssignment(a)}
                  >
                    <HiPencil />
                  </button>
                )}
                {canRemove && (
                  <button
                    className="icon-btn"
                    title="Remove assignment"
                    style={{ color: "#dc2626" }}
                    disabled={removingId === a.id}
                    onClick={() => handleRemove(a.id)}
                  >
                    {removingId === a.id ? "…" : <HiTrash />}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showAssign && (
        <AssignModal
          studentId={studentId}
          studentName={studentName}
          classId={classId}
          academicYear={settings.academicYear}
          term={filterTerm || settings.currentTerm}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); load(); showToast("Item assigned successfully."); }}
        />
      )}
      {editAssignment && (
        <EditAssignmentModal
          assignment={editAssignment}
          onClose={() => setEditAssignment(null)}
          onSaved={() => { setEditAssignment(null); load(); showToast("Assignment updated."); }}
        />
      )}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}