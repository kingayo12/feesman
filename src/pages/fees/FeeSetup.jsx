import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import TableToolbar from "../../components/common/TableToolbar";
import { Bone } from "../../components/common/Skeleton";
import { createFee, getFees, updateFee, deleteFee, createBulkFees } from "./feesService";
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
  HiChevronDown,
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
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const { can } = useRole();
  const canManageFees = can(PERMISSIONS.CREATE_FEE) || can(PERMISSIONS.EDIT_FEE);

  // ─── Detect Group (fallback if DB doesn't have it) ────────────────
  const detectGroup = (cls) => {
    if (cls.group) return cls.group;

    const name = cls.name?.toLowerCase() || "";

    if (name.includes("primary") || name.includes("nursery")) return "primary";

    if (name.includes("jss") || name.includes("ss") || name.includes("secondary"))
      return "secondary";

    return "unknown";
  };

  // ─── Load ──────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [clsData, feesData, appSettings] = await Promise.all([
        getClasses(),
        getFees(),
        getSettings(),
      ]);

      const enhancedClasses = (clsData || []).map((c) => ({
        ...c,
        group: detectGroup(c),
      }));

      // ✅ SORT HERE
      const sortedClasses = sortClasses(enhancedClasses);

      setClasses(sortedClasses);

      // setClasses(enhancedClasses);
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

  // ─── Optimized Class Map ─────────────────────────────────────────
  const classMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.name])), [classes]);

  const getClassName = (id) => classMap[id] || "Unknown";

  // ─── Handlers ───────────────────────────────────────────────────
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const resetForm = () => {
    setEditingId(null);
    setForm((prev) => ({
      ...EMPTY_FORM,
      session: prev.session,
      term: prev.term,
    }));
  };

  const handleEdit = (fee) => {
    setEditingId(fee.id);
    setForm({
      classId: fee.classId,
      session: fee.session,
      term: fee.term,
      feeType: fee.feeType,
      amount: fee.amount,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDuplicate = (fee) => {
    setEditingId(null);
    setForm({
      classId: fee.classId,
      session: fee.session,
      term: fee.term,
      feeType: fee.feeType,
      amount: fee.amount,
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this fee?")) return;
    await deleteFee(id);
    loadData();
  };

  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) next.delete(groupKey);
      else next.add(groupKey);
      return next;
    });
  };

  const getClassLevel = (name = "") => {
    const n = name.toLowerCase();

    if (n.includes("creche") || n.includes("daycare")) return 0;
    if (n.includes("kg")) return 1;

    if (n.includes("nursery")) return 2;

    if (n.includes("primary")) return 3;

    if (n.includes("jss")) return 4;

    if (n.includes("ss")) return 5;

    return 6; // unknown last
  };

  const getClassOrderNumber = (name = "") => {
    const match = name.match(/\d+/);
    return match ? Number(match[0]) : 0;
  };

  const sortClasses = (classes = []) => {
    return [...classes].sort((a, b) => {
      const levelA = getClassLevel(a.name);
      const levelB = getClassLevel(b.name);

      if (levelA !== levelB) return levelA - levelB;

      return getClassOrderNumber(a.name) - getClassOrderNumber(b.name);
    });
  };

  // ─── Submit Logic (Upgraded) ─────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!canManageFees) {
      alert("You do not have permission to manage fees.");
      return;
    }
    setIsSubmitting(true);

    try {
      const payload = {
        ...form,
        amount: Number(form.amount),
        feeType: form.feeType.trim().toLowerCase(),
      };

      let targetClasses = [];

      if (form.classId === "all") {
        targetClasses = classes;
      } else if (form.classId === "primary") {
        targetClasses = classes.filter((c) => c.group === "primary");
      } else if (form.classId === "secondary") {
        targetClasses = classes.filter((c) => c.group === "secondary");
      }

      if (["all", "primary", "secondary"].includes(form.classId)) {
        if (!targetClasses.length) {
          alert("No classes found for selected group.");
          return;
        }

        await createBulkFees(
          targetClasses.map((cls) => ({
            ...payload,
            classId: cls.id,
          })),
        );
      } else if (editingId) {
        await updateFee(editingId, payload);
      } else {
        await createFee(payload);
      }

      resetForm();
      loadData();
    } catch (err) {
      console.error("Fee save failed:", err);
      alert("Failed to save fee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Submit ────────────────────────────────────────────────────────────

  // ─── Filtering — pure React state, no DataTables ───────────────────────
  // This is what was causing the crash: DataTables moves DOM rows,
  // then React can't find them to update/remove → "removeChild" error.
  const visibleFees = feeList
    .filter((f) => {
      const matchesTerm = !filterTerm || f.term === filterTerm;
      const matchesSearch =
        !search ||
        [getClassName(f.classId), f.feeType, f.session, f.term].some((val) =>
          val?.toLowerCase().includes(search.toLowerCase()),
        );
      return matchesTerm && matchesSearch;
    })
    .sort((a, b) => {
      const nameA = getClassName(a.classId);
      const nameB = getClassName(b.classId);

      const levelDiff = getClassLevel(nameA) - getClassLevel(nameB);

      if (levelDiff !== 0) return levelDiff;

      return getClassOrderNumber(nameA) - getClassOrderNumber(nameB);
    });

  const groupedFees = useMemo(() => {
    const groups = new Map();

    visibleFees.forEach((fee) => {
      const key = `${fee.classId}__${fee.session}__${fee.term}`;
      if (!groups.has(key)) {
        groups.set(key, {
          key,
          classId: fee.classId,
          session: fee.session,
          term: fee.term,
          fees: [],
          totalAmount: 0,
        });
      }

      const group = groups.get(key);
      group.fees.push(fee);
      group.totalAmount += Number(fee.amount || 0);
    });

    return Array.from(groups.values()).map((group) => ({
      ...group,
      fees: [...group.fees].sort((a, b) => String(a.feeType).localeCompare(String(b.feeType))),
    }));
  }, [visibleFees]);

  const totalVisible = visibleFees.reduce((sum, f) => sum + Number(f.amount || 0), 0);
  const allGroupsExpanded =
    groupedFees.length > 0 && groupedFees.every((group) => expandedGroups.has(group.key));

  const toggleAllGroups = () => {
    if (!groupedFees.length) return;
    if (allGroupsExpanded) {
      setExpandedGroups(new Set());
      return;
    }
    setExpandedGroups(new Set(groupedFees.map((group) => group.key)));
  };

  const exportHeaders = ["Class", "Session", "Term", "Fee Type", "Amount"];
  const exportRows = visibleFees.map((fee) => [
    getClassName(fee.classId),
    fee.session,
    fee.term,
    fee.feeType,
    `₦${Number(fee.amount).toLocaleString()}`,
  ]);

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div className='form-container'>
      {/* ── Form ───────────────────────────────────────────────── */}
      {canManageFees ? (
        <>
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

                    <optgroup label='Bulk Actions'>
                      <option value='all'>All Classes</option>
                      <option value='primary'>All Primary</option>
                      <option value='secondary'>All Secondary</option>
                    </optgroup>

                    <optgroup label='Creche / Daycare'>
                      {classes
                        .filter((c) => getClassLevel(c.name) === 0)
                        .map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                    </optgroup>

                    <optgroup label='Nursery'>
                      {classes
                        .filter((c) => getClassLevel(c.name) === 1)
                        .map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                    </optgroup>

                    <optgroup label='Primary'>
                      {classes
                        .filter((c) => getClassLevel(c.name) === 2)
                        .map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                    </optgroup>

                    <optgroup label='Secondary'>
                      {classes
                        .filter((c) => getClassLevel(c.name) >= 3)
                        .map((cls) => (
                          <option key={cls.id} value={cls.id}>
                            {cls.name}
                          </option>
                        ))}
                    </optgroup>
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
        </>
      ) : (
        <div className='form-header'>
          <h3>Fee Setup</h3>
          <p>You can view fees, but you do not have permission to create or edit them.</p>
        </div>
      )}

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className='table-card fee-setup-card' style={{ marginTop: "2rem" }}>
        {/* Controls row */}
        <div className='fee-table-controls'>
          {/* Term tabs */}
          <div className='fee-term-tabs'>
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

          <div className='fee-controls-right'>
            {/* Search */}
            <div className='search-box fee-search-box'>
              <HiSearch className='search-icon' />
              <input
                type='text'
                placeholder='Search class or fee type…'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {!!groupedFees.length && (
              <button type='button' className='fee-expand-all-btn' onClick={toggleAllGroups}>
                {allGroupsExpanded ? "Collapse all" : "Expand all"}
              </button>
            )}
          </div>
        </div>

        {/* Summary line */}
        {visibleFees.length > 0 && (
          <>
            <TableToolbar fileName='fees' headers={exportHeaders} rows={exportRows} />
            <p className='fee-summary-line'>
              {groupedFees.length} class group{groupedFees.length !== 1 ? "s" : ""} (
              {visibleFees.length} fee item{visibleFees.length !== 1 ? "s" : ""}) — total ₦
              <strong>{totalVisible.toLocaleString()}</strong>
              {filterTerm ? ` for ${filterTerm}` : ""}
            </p>
          </>
        )}

        {/* Table — rendered by React only, no DataTables */}
        <div className='fee-table-wrapper'>
          <table className='data-table fee-setup-table'>
            <thead>
              <tr>
                <th>Class</th>
                <th>Session</th>
                <th>Term</th>
                <th className='text-right'>Total Amount</th>
                <th>Fee Breakdown</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={`fee-skel-${i}`}>
                    <td>
                      <Bone w={130} h={14} r={4} />
                    </td>
                    <td>
                      <Bone w={90} h={14} r={4} />
                    </td>
                    <td>
                      <Bone w={70} h={24} r={99} />
                    </td>
                    <td className='text-right'>
                      <Bone w={90} h={14} r={4} style={{ marginLeft: "auto" }} />
                    </td>
                    <td>
                      <Bone w={150} h={28} r={8} />
                    </td>
                  </tr>
                ))
              ) : groupedFees.length ? (
                groupedFees.map((group) => {
                  const isOpen = expandedGroups.has(group.key);
                  return [
                    <tr
                      key={`${group.key}-parent`}
                      className={`fee-parent-row ${isOpen ? "is-open" : ""} ${
                        group.fees.some((fee) => editingId === fee.id) ? "row-editing" : ""
                      }`}
                    >
                      <td className='fee-class-cell'>
                        <strong>{getClassName(group.classId)}</strong>
                        <div className='fee-group-meta'>
                          {group.fees.length} fee type{group.fees.length !== 1 ? "s" : ""}
                        </div>
                      </td>
                      <td>{group.session}</td>
                      <td>
                        <span className='term-badge'>{group.term}</span>
                      </td>
                      <td className='text-right'>
                        <strong>₦{Number(group.totalAmount).toLocaleString()}</strong>
                      </td>
                      <td>
                        <button
                          type='button'
                          className='fee-breakdown-toggle'
                          onClick={() => toggleGroup(group.key)}
                          aria-expanded={isOpen}
                        >
                          <span className='fee-breakdown-label'>
                            {isOpen ? "Hide fee types" : "Show fee types"}
                          </span>
                          <span className='fee-breakdown-badge'>{group.fees.length}</span>
                          <HiChevronDown
                            className={`fee-breakdown-chevron ${isOpen ? "open" : ""}`}
                          />
                        </button>
                      </td>
                    </tr>,

                    <tr
                      key={`${group.key}-child`}
                      className={`fee-child-row ${isOpen ? "open" : ""}`}
                    >
                      <td colSpan='5' className={`fee-child-cell ${isOpen ? "open" : ""}`}>
                        <div className={`fee-breakdown-panel ${isOpen ? "open" : ""}`}>
                          <div className='fee-breakdown-list'>
                            <table className='fee-nested-table'>
                              <thead>
                                <tr>
                                  <th>Fee Type</th>
                                  <th className='text-right'>Amount</th>
                                  <th>Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {group.fees.map((fee) => (
                                  <tr key={fee.id}>
                                    <td>{fee.feeType}</td>
                                    <td className='text-right'>
                                      ₦{Number(fee.amount).toLocaleString()}
                                    </td>
                                    <td>
                                      <div className='actions-cell fee-breakdown-actions'>
                                        {can(PERMISSIONS.EDIT_FEE) && (
                                          <button
                                            title='Edit'
                                            className='edit-btn'
                                            onClick={() => handleEdit(fee)}
                                          >
                                            <HiPencil />
                                          </button>
                                        )}
                                        {canManageFees && (
                                          <button
                                            title='Duplicate into form'
                                            className='edit-btn'
                                            onClick={() => handleDuplicate(fee)}
                                          >
                                            <HiDuplicate />
                                          </button>
                                        )}
                                        {can(PERMISSIONS.DELETE_FEE) && (
                                          <button
                                            title='Delete'
                                            className='delete-btn'
                                            onClick={() => handleDelete(fee.id)}
                                          >
                                            <HiTrash />
                                          </button>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </td>
                    </tr>,
                  ];
                })
              ) : (
                <tr>
                  <td colSpan='5' className='empty-row'>
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
