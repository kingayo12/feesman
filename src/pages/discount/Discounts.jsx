/**
 * Discounts.jsx
 * Full discount management page — define, assign, and review discounts.
 * Place in: src/pages/discounts/Discounts.jsx
 * Route:    /discounts
 */

import { useEffect, useState } from "react";
import {
  getAllDiscounts,
  createDiscount,
  updateDiscount,
  deleteDiscount,
  assignDiscount,
  removeAssignment,
  getAllAssignmentsForSession,
  getActiveDiscounts,
} from "./Discountservice";
import { getFamilies } from "../families/familyService";
import { getAllStudents } from "../students/studentService";
import { getSettings } from "../settings/settingService";
import { useRole } from "../../hooks/useRole";
import {
  HiTag,
  HiPlus,
  HiPencil,
  HiTrash,
  HiX,
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiUserGroup,
  HiUser,
} from "react-icons/hi";

// ── Skeleton ──────────────────────────────────────────────────────────────
function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

const TRIGGER_LABELS = {
  child_count: "Auto — child count",
  manual_family: "Manual — family",
  manual_student: "Manual — student",
};
const TYPE_LABELS = { fixed: "Fixed ₦", percentage: "Percentage %", free_child: "Free child" };
const SCOPE_LABELS = {
  school_fees: "School fees only",
  specific_types: "Specific fee types",
  all_fees: "All fees",
};

const EMPTY_FORM = {
  name: "",
  description: "",
  type: "fixed",
  value: "",
  scope: "school_fees",
  feeTypes: "",
  triggerType: "manual_family",
  triggerCount: "",
  session: "all",
  active: true,
};

// ── Main page ─────────────────────────────────────────────────────────────
export default function Discounts() {
  const [discounts, setDiscounts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [families, setFamilies] = useState([]);
  const [students, setStudents] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("discounts"); // "discounts" | "assign"
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);
  const { canEdit, canDelete } = useRole();
  const [assignForm, setAssignForm] = useState({
    discountId: "",
    targetType: "family",
    targetId: "",
    note: "",
  });
  const [assigning, setAssigning] = useState(false);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const appSettings = await getSettings();
      setSettings(appSettings || {});
      const session = appSettings?.academicYear;

      const [disc, fam, studs] = await Promise.all([
        getAllDiscounts(),
        getFamilies(),
        getAllStudents(),
      ]);
      setDiscounts(disc);
      setFamilies(fam);
      setStudents(studs);

      if (session) {
        const asgn = await getAllAssignmentsForSession(session);
        setAssignments(asgn);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ── Form helpers ──────────────────────────────────────────────────────
  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const handleEdit = (d) => {
    setForm({
      name: d.name,
      description: d.description || "",
      type: d.type,
      value: d.value,
      scope: d.scope,
      feeTypes: (d.feeTypes || []).join(", "),
      triggerType: d.triggerType,
      triggerCount: d.triggerCount || "",
      session: d.session || "all",
      active: d.active,
    });
    setEditingId(d.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        value: Number(form.value) || 0,
        triggerCount: Number(form.triggerCount) || 0,
        feeTypes: form.feeTypes
          ? form.feeTypes
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean)
          : [],
      };
      if (editingId) await updateDiscount(editingId, payload);
      else await createDiscount(payload);
      showToast("success", editingId ? "Discount updated" : "Discount created");
      resetForm();
      await loadAll();
    } catch (err) {
      showToast("error", "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (d) => {
    if (!window.confirm(`Delete "${d.name}"? All assignments will also be removed.`)) return;
    try {
      await deleteDiscount(d.id);
      showToast("success", "Discount deleted");
      await loadAll();
    } catch {
      showToast("error", "Delete failed.");
    }
  };

  // ── Assignment ────────────────────────────────────────────────────────
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignForm.discountId || !assignForm.targetId) return;
    setAssigning(true);
    try {
      await assignDiscount({
        discountId: assignForm.discountId,
        targetType: assignForm.targetType,
        targetId: assignForm.targetId,
        session: settings.academicYear,
        note: assignForm.note,
        assignedBy: "admin",
      });
      showToast("success", "Discount assigned successfully");
      setAssignForm({ discountId: "", targetType: "family", targetId: "", note: "" });
      const asgn = await getAllAssignmentsForSession(settings.academicYear);
      setAssignments(asgn);
    } catch {
      showToast("error", "Assignment failed.");
    } finally {
      setAssigning(false);
    }
  };

  const handleRemoveAssignment = async (a) => {
    if (!window.confirm("Remove this assignment?")) return;
    try {
      await removeAssignment(a.id);
      showToast("success", "Assignment removed");
      setAssignments((prev) => prev.filter((x) => x.id !== a.id));
    } catch {
      showToast("error", "Failed to remove.");
    }
  };

  // ── Lookup helpers ────────────────────────────────────────────────────
  const discountName = (id) => discounts.find((d) => d.id === id)?.name || id;
  const targetName = (a) => {
    if (a.targetType === "family") {
      const f = families.find((f) => f.id === a.targetId);
      return f ? `${f.familyName} Family` : a.targetId;
    }
    const s = students.find((s) => s.id === a.targetId);
    return s ? `${s.firstName} ${s.lastName}` : a.targetId;
  };

  const manualDiscounts = discounts.filter(
    (d) => d.triggerType === "manual_family" || d.triggerType === "manual_student",
  );

  if (loading)
    return (
      <div className='student-list-container'>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} h={64} r={12} />
          ))}
        </div>
        <style>{`.skel-bone{background:linear-gradient(90deg,var(--skel-base,#e2e8f0) 25%,var(--skel-shine,#f1f5f9) 50%,var(--skel-base,#e2e8f0) 75%);background-size:200% 100%;animation:skel-shimmer 1.4s ease-in-out infinite;display:block}@keyframes skel-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}[data-theme=dark] .skel-bone{--skel-base:#1e293b;--skel-shine:#334155}`}</style>
      </div>
    );

  return (
    <div className='student-list-container'>
      {/* Toast */}
      {toast && (
        <div
          className={`pb-toast ${toast.type}`}
          style={{
            position: "fixed",
            top: "1.25rem",
            right: "1.25rem",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.25rem",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
            animation: "slideIn .2s ease",
          }}
        >
          {toast.type === "success" ? (
            <HiCheckCircle style={{ width: 17, height: 17 }} />
          ) : (
            <HiExclamationCircle style={{ width: 17, height: 17 }} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className='list-page-header'>
        <div className='header-title'>
          <HiTag className='main-icon' />
          <div>
            <h2>Discounts</h2>
            <p>Define and assign fee discounts — {settings.academicYear}</p>
          </div>
        </div>
        {tab === "discounts" && (
          <button
            className={`submit-btn ${showForm ? "" : ""}`}
            style={{ marginTop: 0, width: "auto" }}
            onClick={() => {
              if (showForm) resetForm();
              else setShowForm(true);
            }}
          >
            {showForm ? (
              <>
                <HiX /> Cancel
              </>
            ) : (
              <>
                <HiPlus /> New Discount
              </>
            )}
          </button>
        )}
      </div>

      {/* Info banner */}
      <div
        style={{
          display: "flex",
          gap: 10,
          alignItems: "flex-start",
          padding: "12px 16px",
          borderRadius: 8,
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          color: "#1e40af",
          fontSize: 13,
          marginBottom: "1.5rem",
        }}
      >
        <HiInformationCircle style={{ width: 18, height: 18, flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, lineHeight: 1.5 }}>
          <strong>Child-count discounts</strong> apply automatically when a family reaches the
          threshold. <strong>Manual discounts</strong> must be assigned to a specific family or
          student in the Assignments tab. Discounts reduce school fees by default unless configured
          otherwise.
        </p>
      </div>

      {/* Tabs */}
      <div className='term-selector-tabs' style={{ marginBottom: "1.5rem" }}>
        {[
          ["discounts", "Discount Definitions"],
          ["assign", "Assignments"],
        ].map(([key, label]) => (
          <button
            key={key}
            className={`term-tab ${tab === key ? "active" : ""}`}
            onClick={() => {
              setTab(key);
              resetForm();
            }}
          >
            {label}
            {key === "assign" && assignments.length > 0 && (
              <span
                style={{
                  marginLeft: 6,
                  background: "#4f46e5",
                  color: "#fff",
                  borderRadius: 99,
                  padding: "1px 7px",
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {assignments.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── DISCOUNTS TAB ─────────────────────────────────────── */}
      {tab === "discounts" && (
        <>
          {/* Form */}
          {showForm && (
            <div
              className='pb-form-card animate-slide'
              style={{
                background: "white",
                borderRadius: 16,
                padding: "1.5rem",
                border: "1px solid #e2e8f0",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 600 }}>
                {editingId ? "Edit Discount" : "New Discount"}
              </h3>
              <form onSubmit={handleSave} className='modern-form'>
                <div className='form-grid'>
                  {/* Name */}
                  <div className='input-group' style={{ gridColumn: "1/-1" }}>
                    <label>Discount name</label>
                    <div className='input-wrapper'>
                      <input
                        placeholder='e.g. "Sibling discount — 3 children"'
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div className='input-group' style={{ gridColumn: "1/-1" }}>
                    <label>
                      Description <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                    </label>
                    <div className='input-wrapper'>
                      <input
                        placeholder='Additional notes about this discount'
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Type */}
                  <div className='input-group'>
                    <label>Discount type</label>
                    <div className='input-wrapper'>
                      <select
                        value={form.type}
                        onChange={(e) => setForm({ ...form, type: e.target.value })}
                      >
                        <option value='fixed'>Fixed amount (₦)</option>
                        <option value='percentage'>Percentage (%)</option>
                        <option value='free_child'>Free child (waive all eligible fees)</option>
                      </select>
                    </div>
                    <small className='hint'>
                      {form.type === "free_child"
                        ? "All eligible fees for the student are waived — no value needed."
                        : form.type === "percentage"
                          ? "Enter a number between 1–100."
                          : "Enter the exact naira amount to deduct."}
                    </small>
                  </div>

                  {/* Value — hidden for free_child */}
                  {form.type !== "free_child" && (
                    <div className='input-group'>
                      <label>{form.type === "percentage" ? "Percentage (%)" : "Amount (₦)"}</label>
                      <div className='input-wrapper'>
                        <input
                          type='number'
                          min='0'
                          step={form.type === "percentage" ? "0.1" : "1"}
                          placeholder={form.type === "percentage" ? "e.g. 10" : "e.g. 10000"}
                          value={form.value}
                          onChange={(e) => setForm({ ...form, value: e.target.value })}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Scope */}
                  <div className='input-group'>
                    <label>Applies to</label>
                    <div className='input-wrapper'>
                      <select
                        value={form.scope}
                        onChange={(e) => setForm({ ...form, scope: e.target.value })}
                      >
                        <option value='school_fees'>School fees only (default)</option>
                        <option value='all_fees'>All fees</option>
                        <option value='specific_types'>Specific fee types</option>
                      </select>
                    </div>
                  </div>

                  {/* Fee types — only when scope = specific_types */}
                  {form.scope === "specific_types" && (
                    <div className='input-group'>
                      <label>Fee type names</label>
                      <div className='input-wrapper'>
                        <input
                          placeholder='e.g. "Tuition, Library Fee"'
                          value={form.feeTypes}
                          onChange={(e) => setForm({ ...form, feeTypes: e.target.value })}
                        />
                      </div>
                      <small className='hint'>
                        Comma-separated. Must match fee type names exactly.
                      </small>
                    </div>
                  )}

                  {/* Trigger */}
                  <div className='input-group'>
                    <label>Trigger</label>
                    <div className='input-wrapper'>
                      <select
                        value={form.triggerType}
                        onChange={(e) => setForm({ ...form, triggerType: e.target.value })}
                      >
                        <option value='child_count'>Auto — family child count</option>
                        <option value='manual_family'>Manual — assign to family</option>
                        <option value='manual_student'>Manual — assign to student</option>
                      </select>
                    </div>
                  </div>

                  {/* Child count threshold */}
                  {form.triggerType === "child_count" && (
                    <div className='input-group'>
                      <label>Minimum children</label>
                      <div className='input-wrapper'>
                        <input
                          type='number'
                          min='2'
                          placeholder='e.g. 3'
                          value={form.triggerCount}
                          onChange={(e) => setForm({ ...form, triggerCount: e.target.value })}
                          required
                        />
                      </div>
                      <small className='hint'>
                        Discount applies when the family has this many or more active students.
                      </small>
                    </div>
                  )}

                  {/* Session */}
                  <div className='input-group'>
                    <label>Session</label>
                    <div className='input-wrapper'>
                      <select
                        value={form.session}
                        onChange={(e) => setForm({ ...form, session: e.target.value })}
                      >
                        <option value='all'>All sessions</option>
                        {settings.academicYear && (
                          <option value={settings.academicYear}>{settings.academicYear}</option>
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", marginTop: "1.5rem" }}>
                  <button
                    type='submit'
                    className='submit-btn'
                    disabled={saving}
                    style={{ marginTop: 0, width: "auto" }}
                  >
                    {saving ? "Saving…" : editingId ? "Update" : "Create Discount"}
                  </button>
                  <button
                    type='button'
                    className='cancel-btn'
                    onClick={resetForm}
                    style={{ marginTop: 0 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Discount cards */}
          {discounts.length === 0 ? (
            <div className='empty-state-container'>
              <HiTag style={{ width: 40, height: 40, opacity: 0.3 }} />
              <p style={{ color: "var(--color-text-secondary)", marginTop: "0.75rem" }}>
                No discounts defined yet. Create your first one above.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              {discounts.map((d) => {
                const assignCount = assignments.filter((a) => a.discountId === d.id).length;
                return (
                  <div key={d.id} className='discount-card'>
                    <div className='discount-card-left'>
                      <div
                        className='discount-icon-wrap'
                        style={{
                          background: d.active ? "#f0fdf4" : "#f8fafc",
                          color: d.active ? "#15803d" : "#94a3b8",
                        }}
                      >
                        <HiTag style={{ width: 20, height: 20 }} />
                      </div>
                      <div>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <strong style={{ fontSize: 14 }}>{d.name}</strong>
                          {!d.active && (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "1px 8px",
                                borderRadius: 99,
                                background: "#f1f5f9",
                                color: "#94a3b8",
                                fontWeight: 600,
                              }}
                            >
                              Inactive
                            </span>
                          )}
                          <span className='dc-pill purple'>{TYPE_LABELS[d.type]}</span>
                          <span className='dc-pill teal'>{SCOPE_LABELS[d.scope]}</span>
                          <span className='dc-pill amber'>{TRIGGER_LABELS[d.triggerType]}</span>
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-text-secondary)",
                            marginTop: 4,
                            display: "flex",
                            gap: "1rem",
                            flexWrap: "wrap",
                          }}
                        >
                          {d.type !== "free_child" && (
                            <span>
                              Value:{" "}
                              <strong style={{ color: "var(--color-text-primary)" }}>
                                {d.type === "percentage"
                                  ? `${d.value}%`
                                  : `₦${Number(d.value).toLocaleString()}`}
                              </strong>
                            </span>
                          )}
                          {d.triggerType === "child_count" && (
                            <span>
                              Min children:{" "}
                              <strong style={{ color: "var(--color-text-primary)" }}>
                                {d.triggerCount}
                              </strong>
                            </span>
                          )}
                          {d.session !== "all" && (
                            <span>
                              Session:{" "}
                              <strong style={{ color: "var(--color-text-primary)" }}>
                                {d.session}
                              </strong>
                            </span>
                          )}
                          {assignCount > 0 && (
                            <span style={{ color: "#4f46e5", fontWeight: 600 }}>
                              {assignCount} assignment{assignCount > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        {d.description && (
                          <p
                            style={{
                              fontSize: 12,
                              color: "var(--color-text-tertiary)",
                              margin: "4px 0 0",
                            }}
                          >
                            {d.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                      {canEdit && (
                        <button className='edit-btn' onClick={() => handleEdit(d)}>
                          <HiPencil /> Edit
                        </button>
                      )}
                      {canDelete && (
                        <button className='delete-btn' onClick={() => handleDelete(d)}>
                          <HiTrash />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── ASSIGNMENTS TAB ───────────────────────────────────── */}
      {tab === "assign" && (
        <>
          {/* Assignment form */}
          {manualDiscounts.length > 0 ? (
            <div
              className='pb-form-card animate-slide'
              style={{
                background: "white",
                borderRadius: 16,
                padding: "1.5rem",
                border: "1px solid #e2e8f0",
                marginBottom: "1.5rem",
              }}
            >
              <h3 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 600 }}>
                Assign Discount
              </h3>
              <form onSubmit={handleAssign} className='modern-form'>
                <div className='form-grid'>
                  <div className='input-group'>
                    <label>Discount</label>
                    <div className='input-wrapper'>
                      <select
                        value={assignForm.discountId}
                        onChange={(e) =>
                          setAssignForm({ ...assignForm, discountId: e.target.value })
                        }
                        required
                      >
                        <option value=''>Select discount</option>
                        {manualDiscounts.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className='input-group'>
                    <label>Assign to</label>
                    <div className='input-wrapper'>
                      <select
                        value={assignForm.targetType}
                        onChange={(e) =>
                          setAssignForm({ ...assignForm, targetType: e.target.value, targetId: "" })
                        }
                      >
                        <option value='family'>Family</option>
                        <option value='student'>Student</option>
                      </select>
                    </div>
                  </div>

                  <div className='input-group'>
                    <label>{assignForm.targetType === "family" ? "Family" : "Student"}</label>
                    <div className='input-wrapper'>
                      <select
                        value={assignForm.targetId}
                        onChange={(e) => setAssignForm({ ...assignForm, targetId: e.target.value })}
                        required
                      >
                        <option value=''>Select {assignForm.targetType}</option>
                        {assignForm.targetType === "family"
                          ? families.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.familyName} Family
                              </option>
                            ))
                          : students.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.firstName} {s.lastName}
                                {s.admissionNo ? ` — ${s.admissionNo}` : ""}
                              </option>
                            ))}
                      </select>
                    </div>
                  </div>

                  <div className='input-group'>
                    <label>
                      Note <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                    </label>
                    <div className='input-wrapper'>
                      <input
                        placeholder='Reason for this assignment'
                        value={assignForm.note}
                        onChange={(e) => setAssignForm({ ...assignForm, note: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type='submit'
                  className='submit-btn'
                  disabled={assigning}
                  style={{ marginTop: "1.25rem", width: "auto" }}
                >
                  {assigning ? "Assigning…" : "Assign Discount"}
                </button>
              </form>
            </div>
          ) : (
            <div
              style={{
                padding: "1rem 1.25rem",
                background: "#fffbeb",
                border: "1px solid #fde68a",
                borderRadius: 8,
                color: "#854d0e",
                fontSize: 13,
                marginBottom: "1.5rem",
              }}
            >
              No manual discounts defined. Create a discount with trigger type "Manual — family" or
              "Manual — student" first.
            </div>
          )}

          {/* Assignment list */}
          <div className='table-card'>
            <div
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--border-light,#f1f5f9)",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Active Assignments — {settings.academicYear}
              <span
                style={{
                  marginLeft: 8,
                  fontSize: 12,
                  fontWeight: 400,
                  color: "var(--color-text-secondary)",
                }}
              >
                ({assignments.length} total)
              </span>
            </div>
            {assignments.length === 0 ? (
              <div
                style={{
                  padding: "2.5rem",
                  textAlign: "center",
                  color: "var(--color-text-tertiary)",
                  fontSize: 13,
                }}
              >
                No assignments yet.
              </div>
            ) : (
              <table className='data-table'>
                <thead>
                  <tr>
                    <th>Discount</th>
                    <th>Assigned To</th>
                    <th>Type</th>
                    <th>Note</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((a) => (
                    <tr key={a.id}>
                      <td>
                        <strong>{discountName(a.discountId)}</strong>
                      </td>
                      <td>{targetName(a)}</td>
                      <td>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            fontSize: 12,
                            padding: "2px 8px",
                            borderRadius: 6,
                            background: a.targetType === "family" ? "#eff6ff" : "#f5f3ff",
                            color: a.targetType === "family" ? "#1d4ed8" : "#6d28d9",
                          }}
                        >
                          {a.targetType === "family" ? (
                            <HiUserGroup style={{ width: 13, height: 13 }} />
                          ) : (
                            <HiUser style={{ width: 13, height: 13 }} />
                          )}
                          {a.targetType}
                        </span>
                      </td>
                      <td style={{ fontSize: 12, color: "var(--color-text-secondary)" }}>
                        {a.note || "—"}
                      </td>
                      <td>
                        {canDelete && (
                          <button className='delete-btn' onClick={() => handleRemoveAssignment(a)}>
                            <HiTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <style>{`
        .discount-card {
          background: var(--color-background-primary, #fff);
          border: 1px solid var(--color-border-tertiary, #f1f5f9);
          border-radius: 12px; padding: 1rem 1.25rem;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem;
          transition: box-shadow .15s;
        }
        .discount-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }
        [data-theme="dark"] .discount-card { background: #1e293b; border-color: #334155; }
        .discount-card-left { display: flex; align-items: flex-start; gap: 0.875rem; flex: 1; }
        .discount-icon-wrap { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dc-pill { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 99px; }
        .dc-pill.purple { background: #ede9fe; color: #6d28d9; }
        .dc-pill.teal   { background: #e1f5ee; color: #0f6e56; }
        .dc-pill.amber  { background: #fef9c3; color: #854d0e; }
        [data-theme="dark"] .dc-pill.purple { background: #2e1065; color: #c4b5fd; }
        [data-theme="dark"] .dc-pill.teal   { background: #04342c; color: #5dcaa5; }
        [data-theme="dark"] .dc-pill.amber  { background: #412402; color: #fac775; }
        [data-theme="dark"] .pb-form-card   { background: #1e293b !important; border-color: #334155 !important; }
        .pb-toast.success { background:#dcfce7;color:#166534;border:1px solid #bbf7d0; }
        .pb-toast.error   { background:#fee2e2;color:#991b1b;border:1px solid #fecaca; }
        @keyframes slideIn { from{opacity:0;transform:translateY(-8px)} to{opacity:1} }
      `}</style>
    </div>
  );
}
