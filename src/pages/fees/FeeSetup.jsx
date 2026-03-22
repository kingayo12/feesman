import { useEffect, useState } from "react";
import { createFee, getFees, updateFee, deleteFee } from "./feesService";
import { getClasses } from "../classes/classService";
import { getSettings } from "../settings/settingService";
import {
  HiCash,
  HiLibrary,
  HiCalendar,
  HiTag,
  HiClock,
  HiPencil,
  HiTrash,
  HiDuplicate,
  HiSearch,
} from "react-icons/hi";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];

const EMPTY_FORM = {
  classId: "",
  session: "",
  term: "",
  feeType: "",
  amount: "",
};

export default function FeeSetup() {
  const [classes, setClasses] = useState([]);
  const [feeList, setFeeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterTerm, setFilterTerm] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  // ─── Load ──────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [clsData, feesData, appSettings] = await Promise.all([
        getClasses(),
        getFees(),
        getSettings(),
      ]);
      setClasses(clsData || []);
      setFeeList(feesData || []);

      if (!editingId) {
        const term = appSettings?.currentTerm || "1st Term";
        const session = appSettings?.academicYear || "";
        setForm((prev) => ({ ...prev, session, term }));
        setFilterTerm(term);
      }
    } catch (err) {
      console.error("FeeSetup load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ─── Helpers ──────────────────────────────────────────────────────────
  const getClassName = (id) => classes.find((c) => c.id === id)?.name ?? "Unknown";

  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = (keepSessionTerm = true) => {
    setEditingId(null);
    setForm((prev) =>
      keepSessionTerm ? { ...EMPTY_FORM, session: prev.session, term: prev.term } : EMPTY_FORM,
    );
  };

  const handleEdit = (fee) => {
    setEditingId(fee.id);
    setForm({
      classId: fee.classId || "",
      session: fee.session || "",
      term: fee.term || "",
      feeType: fee.feeType || "",
      amount: fee.amount || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicate = (fee) => {
    setEditingId(null);
    setForm({
      classId: fee.classId || "",
      session: fee.session || "",
      term: fee.term || "",
      feeType: fee.feeType || "",
      amount: fee.amount || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this fee?")) return;
    await deleteFee(id);
    loadData();
  };

  // ─── Submit ────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const payload = { ...form, amount: Number(form.amount) };

      if (form.classId === "all") {
        await Promise.all(classes.map((cls) => createFee({ ...payload, classId: cls.id })));
      } else if (editingId) {
        await updateFee(editingId, payload);
      } else {
        await createFee(payload);
      }

      resetForm();
      loadData();
    } catch (err) {
      console.error("Fee save failed:", err);
      alert("Failed to save fee. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Filtering — pure React state, no DataTables ───────────────────────
  // This is what was causing the crash: DataTables moves DOM rows,
  // then React can't find them to update/remove → "removeChild" error.
  const visibleFees = feeList.filter((f) => {
    const matchesTerm = !filterTerm || f.term === filterTerm;
    const matchesSearch =
      !search ||
      [getClassName(f.classId), f.feeType, f.session, f.term].some((val) =>
        val?.toLowerCase().includes(search.toLowerCase()),
      );
    return matchesTerm && matchesSearch;
  });

  // Group by class for a cleaner summary line
  const totalVisible = visibleFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className='form-container'>
      {/* ── Form ───────────────────────────────────────────────── */}
      <div className='form-header'>
        <h3>{editingId ? "Edit Fee" : "Add Fee"}</h3>
        <p>Set a charge for a class, session, and term.</p>
      </div>

      <form className='modern-form' onSubmit={handleSubmit}>
        <div className='form-grid'>
          <div className='input-group'>
            <label>Class</label>
            <div className='input-wrapper'>
              <HiLibrary className='input-icon' />
              <select name='classId' value={form.classId} onChange={handleChange} required>
                <option value=''>Select class</option>
                <option value='all'>— All classes —</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='input-group'>
            <label>Session</label>
            <div className='input-wrapper'>
              <HiCalendar className='input-icon' />
              <input
                name='session'
                value={form.session}
                onChange={handleChange}
                placeholder='e.g. 2024/2025'
                required
              />
            </div>
          </div>

          <div className='input-group'>
            <label>Term</label>
            <div className='input-wrapper'>
              <HiClock className='input-icon' />
              <select name='term' value={form.term} onChange={handleChange} required>
                <option value=''>Select term</option>
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className='input-group'>
            <label>Fee Type</label>
            <div className='input-wrapper'>
              <HiTag className='input-icon' />
              <input
                name='feeType'
                value={form.feeType}
                onChange={handleChange}
                placeholder='e.g. Tuition, PTA Levy'
                required
              />
            </div>
          </div>

          <div className='input-group'>
            <label>Amount (₦)</label>
            <div className='input-wrapper'>
              <HiCash className='input-icon' />
              <input
                name='amount'
                type='number'
                value={form.amount}
                onChange={handleChange}
                placeholder='0'
                required
                min='1'
              />
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className='submit-btn' disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : editingId ? "Update Fee" : "Add Fee"}
          </button>
          {editingId && (
            <button type='button' className='cancel-btn' onClick={() => resetForm()}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className='table-card' style={{ marginTop: "2rem" }}>
        {/* Controls row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "0.75rem",
            marginBottom: "1rem",
          }}
        >
          {/* Term tabs */}
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className={`term-tab ${filterTerm === "" ? "active" : ""}`}
              onClick={() => setFilterTerm("")}
            >
              All
            </button>
            {TERMS.map((t) => (
              <button
                key={t}
                className={`term-tab ${filterTerm === t ? "active" : ""}`}
                onClick={() => setFilterTerm(t)}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className='search-box' style={{ minWidth: 220 }}>
            <HiSearch className='search-icon' />
            <input
              type='text'
              placeholder='Search class or fee type…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Summary line */}
        {visibleFees.length > 0 && (
          <p style={{ fontSize: 13, color: "var(--color-text-secondary)", marginBottom: "0.5rem" }}>
            {visibleFees.length} fee{visibleFees.length !== 1 ? "s" : ""} — total ₦
            {totalVisible.toLocaleString()}
            {filterTerm ? ` for ${filterTerm}` : ""}
          </p>
        )}

        {/* Table — rendered by React only, no DataTables */}
        <div style={{ overflowX: "auto" }}>
          <table className='data-table'>
            <thead>
              <tr>
                <th>Class</th>
                <th>Session</th>
                <th>Term</th>
                <th>Fee Type</th>
                <th className='text-right'>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan='6' className='empty-row'>
                    Loading…
                  </td>
                </tr>
              ) : visibleFees.length ? (
                visibleFees.map((fee) => (
                  <tr key={fee.id} className={editingId === fee.id ? "row-editing" : ""}>
                    <td>
                      <strong>{getClassName(fee.classId)}</strong>
                    </td>
                    <td>{fee.session}</td>
                    <td>
                      <span className='term-badge'>{fee.term}</span>
                    </td>
                    <td>{fee.feeType}</td>
                    <td className='text-right'>₦{Number(fee.amount).toLocaleString()}</td>
                    <td className='actions-cell'>
                      <button title='Edit' className='edit-btn' onClick={() => handleEdit(fee)}>
                        <HiPencil />
                      </button>
                      <button
                        title='Duplicate into form'
                        className='edit-btn'
                        onClick={() => handleDuplicate(fee)}
                      >
                        <HiDuplicate />
                      </button>
                      <button
                        title='Delete'
                        className='delete-btn'
                        onClick={() => handleDelete(fee.id)}
                      >
                        <HiTrash />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan='6' className='empty-row'>
                    {search
                      ? `No fees matching "${search}"`
                      : `No fees defined for ${filterTerm || "any term"} yet.`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
