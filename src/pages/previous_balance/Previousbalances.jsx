/**
 * PreviousBalances.jsx
 * Management page: enter, view, and edit carried-forward balances per student.
 *
 * Place in: src/pages/previousBalances/PreviousBalances.jsx
 * Add route: <Route path="/previous-balances" element={<PreviousBalances />} />
 * Add to sidebar nav.
 */

import { useEffect, useState } from "react";
import { getAllStudents } from "../students/studentService";
import { getFamilies } from "../families/familyService";
import { getSettings } from "../settings/settingService";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import TableToolbar from "../../components/common/TableToolbar";
import {
  getAllPreviousBalancesForSession,
  setPreviousBalance,
  deletePreviousBalance,
} from "./Previousbalanceservice";
import {
  HiCurrencyDollar,
  HiSearch,
  HiPencil,
  HiTrash,
  HiCheckCircle,
  HiExclamationCircle,
  HiInformationCircle,
  HiPlus,
  HiX,
} from "react-icons/hi";
import { Bone } from "../../components/common/Skeleton";

export default function PreviousBalances() {
  const [students, setStudents] = useState([]);
  const [families, setFamilies] = useState([]);
  const [balances, setBalances] = useState([]); // existing records
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null); // docId being edited
  const { can } = useRole();
  const canManageBalances = can(PERMISSIONS.EDIT_BALANCES);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    studentId: "",
    amount: "",
    note: "",
  });

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    try {
      const [appSettings, studentData, familyData] = await Promise.all([
        getSettings(),
        getAllStudents(),
        getFamilies(),
      ]);
      setSettings(appSettings || {});
      setStudents(studentData || []);
      setFamilies(familyData || []);

      if (appSettings?.academicYear) {
        const existing = await getAllPreviousBalancesForSession(appSettings.academicYear);
        setBalances(existing);
      }
    } catch (err) {
      console.error("PreviousBalances load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const getStudent = (id) => students.find((s) => s.id === id);
  const getFamily = (id) => families.find((f) => f.id === id);

  const resetForm = () => {
    setForm({ studentId: "", amount: "", note: "" });
    setEditingId(null);
    setShowForm(false);
  };

  // Students who already have a balance record (for the table)
  const balanceMap = Object.fromEntries(balances.map((b) => [b.studentId, b]));

  // Students visible in the table — filtered by search
  const filteredStudents = students.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    const family = getFamily(s.familyId);
    return (
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.admissionNo?.toLowerCase().includes(q) ||
      family?.familyName?.toLowerCase().includes(q)
    );
  });

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.studentId || form.amount === "") return;

    setSaving(true);
    try {
      const student = getStudent(form.studentId);
      await setPreviousBalance({
        studentId: form.studentId,
        familyId: student?.familyId || "",
        session: settings.academicYear,
        amount: Number(form.amount),
        note: form.note,
        recordedBy: "admin",
      });

      showToast("success", `Balance saved for ${student?.firstName} ${student?.lastName}`);
      resetForm();
      // Reload balances only
      const updated = await getAllPreviousBalancesForSession(settings.academicYear);
      setBalances(updated);
    } catch (err) {
      console.error("Save failed:", err);
      showToast("error", "Failed to save balance. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (record) => {
    setForm({
      studentId: record.studentId,
      amount: record.amount,
      note: record.note || "",
    });
    setEditingId(record.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async (record) => {
    const student = getStudent(record.studentId);
    const name = student ? `${student.firstName} ${student.lastName}` : "this student";
    if (!window.confirm(`Remove previous balance for ${name}?`)) return;

    try {
      await deletePreviousBalance(record.id);
      showToast("success", `Balance removed for ${name}`);
      setBalances((prev) => prev.filter((b) => b.id !== record.id));
    } catch (err) {
      showToast("error", "Delete failed.");
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────────
  const totalArrears = balances.reduce((s, b) => s + Number(b.amount || 0), 0);
  const studentsOwing = balances.filter((b) => Number(b.amount) > 0).length;

  const exportHeaders = ["Student", "Family", "Admission No", "Previous Balance", "Note"];
  const exportRows = filteredStudents.map((student) => {
    const record = balanceMap[student.id];
    const family = getFamily(student.familyId);

    return [
      `${student.firstName} ${student.lastName}`,
      family?.familyName || "—",
      student.admissionNo || "—",
      record != null ? `₦${Number(record.amount).toLocaleString()}` : "Not set",
      record?.note || "—",
    ];
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className='pb-page'>
      {/* ── Toast ─────────────────────────────────────────────────── */}
      {toast && (
        <div className={`pb-toast ${toast.type}`}>
          {toast.type === "success" ? <HiCheckCircle /> : <HiExclamationCircle />}
          {toast.msg}
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────── */}
      <div className='pb-header'>
        <div className='pb-header-left'>
          <div className='pb-icon-wrap'>
            <HiCurrencyDollar />
          </div>
          <div>
            <h2>Previous Balances</h2>
            <p>
              Carry-forward arrears for{" "}
              <strong>{settings.academicYear || "current session"}</strong>
            </p>
          </div>
        </div>
        {canManageBalances && (
          <button
            className={`submit-btn ${showForm ? "cancel-mode" : ""}`}
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
                <HiPlus /> Add Balance
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Info banner ───────────────────────────────────────────── */}
      <div className='pb-info-banner'>
        <HiInformationCircle />
        <p>
          Previous balances are amounts students owed from sessions before{" "}
          <strong>{settings.academicYear}</strong>. They are added on top of the current term's fees
          and shown as a separate line item on receipts. Enter ₦0 to clear a student's arrears.
        </p>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────── */}
      <div className='pb-stats'>
        <div className='pb-stat-card'>
          <span className='pb-stat-label'>Students with arrears</span>
          <span className='pb-stat-value'>{studentsOwing}</span>
        </div>
        <div className='pb-stat-card'>
          <span className='pb-stat-label'>Total carried forward</span>
          <span className='pb-stat-value danger'>₦{totalArrears.toLocaleString()}</span>
        </div>
        <div className='pb-stat-card'>
          <span className='pb-stat-label'>Records entered</span>
          <span className='pb-stat-value'>{balances.length}</span>
        </div>
      </div>

      {/* ── Entry form ────────────────────────────────────────────── */}
      {showForm && canManageBalances && (
        <div className='pb-form-card animate-slide'>
          <h3 style={{ marginBottom: "1.25rem", fontSize: "1rem", fontWeight: 600 }}>
            {editingId ? "Edit Previous Balance" : "Add Previous Balance"}
          </h3>
          <form onSubmit={handleSave} className='modern-form'>
            <div className='form-grid'>
              {/* Student picker */}
              <div className='input-group'>
                <label>Student</label>
                <div className='input-wrapper'>
                  <select
                    name='studentId'
                    value={form.studentId}
                    onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                    required
                    disabled={!!editingId}
                  >
                    <option value=''>Select student</option>
                    {students.map((s) => {
                      const fam = getFamily(s.familyId);
                      return (
                        <option key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                          {s.admissionNo ? ` — ${s.admissionNo}` : ""}
                          {fam ? ` (${fam.familyName})` : ""}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Session — read-only */}
              <div className='input-group'>
                <label>Session</label>
                <div className='input-wrapper'>
                  <input value={settings.academicYear || ""} readOnly className='disabled-input' />
                </div>
                <small className='hint'>Arrears are applied to the current session</small>
              </div>

              {/* Amount */}
              <div className='input-group'>
                <label>Amount Owed (₦)</label>
                <div className='input-wrapper'>
                  <HiCurrencyDollar className='input-icon' />
                  <input
                    type='number'
                    min='0'
                    step='0.01'
                    placeholder='e.g. 45000'
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* Note */}
              <div className='input-group'>
                <label>
                  Note <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
                </label>
                <div className='input-wrapper'>
                  <input
                    placeholder='e.g. "Arrears from 2023/2024 — 2nd Term"'
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
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
                {saving ? "Saving…" : editingId ? "Update Balance" : "Save Balance"}
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

      {/* ── Table ─────────────────────────────────────────────────── */}
      <div className='table-card' style={{ marginTop: "1.5rem" }}>
        <div
          style={{
            padding: "1rem 1.25rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            borderBottom: "1px solid var(--border-light,#f1f5f9)",
          }}
        >
          <h3 style={{ margin: 0, fontSize: "0.95rem" }}>
            Balance Records — {settings.academicYear}
          </h3>
          <div className='search-box' style={{ maxWidth: 280 }}>
            <HiSearch className='search-icon' />
            <input
              type='text'
              placeholder='Search student or family…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        {filteredStudents.length > 0 && (
          <div style={{ padding: "1rem 1.25rem" }}>
            <TableToolbar fileName='previous_balances' headers={exportHeaders} rows={exportRows} />
          </div>
        )}

        {loading ? (
          <div style={{ padding: "1rem 1.25rem" }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={`pb-skel-${i}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.1fr 1fr 1fr 1.3fr 1fr",
                  gap: "0.75rem",
                  padding: "10px 0",
                  borderBottom: "1px solid var(--border-light,#f1f5f9)",
                  alignItems: "center",
                }}
              >
                <Bone w='86%' h={14} r={4} />
                <Bone w='82%' h={14} r={4} />
                <Bone w='70%' h={14} r={4} />
                <Bone w='60%' h={14} r={4} />
                <Bone w='84%' h={14} r={4} />
                <Bone w={74} h={28} r={8} />
              </div>
            ))}
          </div>
        ) : (
          <table className='data-table'>
            <thead>
              <tr>
                <th>Student</th>
                <th>Family</th>
                <th>Admission No</th>
                <th className='text-right'>Previous Balance</th>
                <th>Note</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => {
                  const record = balanceMap[student.id];
                  const family = getFamily(student.familyId);
                  const amount = record ? Number(record.amount) : null;

                  return (
                    <tr key={student.id} className={amount > 0 ? "pb-row-owing" : ""}>
                      <td>
                        <div className='student-profile'>
                          <div className='student-initials'>
                            {student.firstName?.[0]}
                            {student.lastName?.[0]}
                          </div>
                          <div className='student-name-meta'>
                            <span className='full-name'>
                              {student.firstName} {student.lastName}
                            </span>
                            <span className='id-sub'>{student.session}</span>
                          </div>
                        </div>
                      </td>
                      <td>{family?.familyName || "—"}</td>
                      <td>{student.admissionNo || "—"}</td>
                      <td className='text-right'>
                        {amount != null ? (
                          <span className={`pb-amount ${amount > 0 ? "danger" : "clear"}`}>
                            ₦{amount.toLocaleString()}
                          </span>
                        ) : (
                          <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
                            Not set
                          </span>
                        )}
                      </td>
                      <td
                        style={{
                          fontSize: 12,
                          color: "var(--color-text-secondary)",
                          maxWidth: 180,
                        }}
                      >
                        {record?.note || "—"}
                      </td>
                      <td className='actions-cell'>
                        {record ? (
                          can(PERMISSIONS.EDIT_BALANCES) && (
                            <button className='edit-btn' onClick={() => handleEdit(record)}>
                              <HiPencil /> Edit
                            </button>
                          )
                        ) : canManageBalances ? (
                          <button
                            className='edit-btn'
                            onClick={() => {
                              setForm({ studentId: student.id, amount: "", note: "" });
                              setShowForm(true);
                              window.scrollTo({ top: 0, behavior: "smooth" });
                            }}
                          >
                            <HiPencil /> Set
                          </button>
                        ) : null}
                        {record && can(PERMISSIONS.EDIT_BALANCES) && (
                          <button className='delete-btn' onClick={() => handleDelete(record)}>
                            <HiTrash />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan='6' className='empty-row'>
                    {search ? `No students matching "${search}"` : "No students found."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
