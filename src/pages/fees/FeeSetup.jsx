import { useEffect, useState, useMemo } from "react";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import TableToolbar from "../../components/common/TableToolbar";
import { Bone } from "../../components/common/Skeleton";
import { getFees, deleteFee } from "./feesService";
import { getClasses } from "../classes/classService";
import { getSettings } from "../settings/settingService";
import {
  HiPencil,
  HiTrash,
  HiDuplicate,
  HiSearch,
  HiChevronDown,
  HiPlus,
  HiOutlineCash,
} from "react-icons/hi";
import CustomButton from "../../components/common/CustomButton";
import { FormModal, ConfirmModal } from "../../components/common/Modal";
import FeeForm from "../../components/forms/FeeForm";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];

export default function FeeSetup() {
  const [classes, setClasses] = useState([]);
  const [feeList, setFeeList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFee, setEditingFee] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [filterTerm, setFilterTerm] = useState("");
  const [search, setSearch] = useState("");
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const { can } = useRole();
  const canManageFees = can(PERMISSIONS.CREATE_FEE) || can(PERMISSIONS.EDIT_FEE);

  // ─── Helpers ──────────────────────────────────────────────────────────
  const getClassLevel = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("creche") || n.includes("daycare")) return 0;
    if (n.includes("kg")) return 1;
    if (n.includes("nursery")) return 2;
    if (n.includes("primary")) return 3;
    if (n.includes("jss")) return 4;
    if (n.includes("ss")) return 5;
    return 6;
  };

  const getClassOrderNumber = (name = "") => {
    const match = name.match(/\d+/);
    return match ? Number(match[0]) : 0;
  };

  const detectGroup = (cls) => {
    if (cls.group) return cls.group;
    const name = cls.name?.toLowerCase() || "";
    if (name.includes("primary") || name.includes("nursery")) return "primary";
    if (name.includes("jss") || name.includes("ss") || name.includes("secondary"))
      return "secondary";
    return "unknown";
  };

  const sortClasses = (list = []) =>
    [...list].sort((a, b) => {
      const levelDiff = getClassLevel(a.name) - getClassLevel(b.name);
      if (levelDiff !== 0) return levelDiff;
      return getClassOrderNumber(a.name) - getClassOrderNumber(b.name);
    });

  // ─── Load ──────────────────────────────────────────────────────────────
  const loadData = async () => {
    setLoading(true);
    try {
      const [clsData, feesData, appSettings] = await Promise.all([
        getClasses(),
        getFees(),
        getSettings(),
      ]);

      const enhanced = (clsData || []).map((c) => ({ ...c, group: detectGroup(c) }));
      setClasses(sortClasses(enhanced));
      setFeeList(feesData || []);

      if (!filterTerm) {
        setFilterTerm(appSettings?.currentTerm || "");
      }
    } catch (err) {
      console.error("FeeSetup load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Class map ────────────────────────────────────────────────────────
  const classMap = useMemo(() => Object.fromEntries(classes.map((c) => [c.id, c.name])), [classes]);
  const getClassName = (id) => classMap[id] || "Unknown";

  // ─── Modal helpers ────────────────────────────────────────────────────
  const openModal = (fee = null) => {
    setEditingFee(fee);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingFee(null);
  };

  // ─── Action handlers ──────────────────────────────────────────────────
  const handleEdit = (fee) => openModal(fee);

  // Duplicate: open modal pre-filled but no id → create mode
  const handleDuplicate = (fee) => openModal({ ...fee, id: null });

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteFee(deleteTarget.id);
      setFeeList((prev) => prev.filter((f) => f.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete fee:", err);
    } finally {
      setDeleting(false);
    }
  };

  // ─── Group toggle ─────────────────────────────────────────────────────
  const toggleGroup = (groupKey) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(groupKey) ? next.delete(groupKey) : next.add(groupKey);
      return next;
    });
  };

  // ─── Filtered + grouped fees ──────────────────────────────────────────
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
      const levelDiff =
        getClassLevel(getClassName(a.classId)) - getClassLevel(getClassName(b.classId));
      if (levelDiff !== 0) return levelDiff;
      return (
        getClassOrderNumber(getClassName(a.classId)) - getClassOrderNumber(getClassName(b.classId))
      );
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
    groupedFees.length > 0 && groupedFees.every((g) => expandedGroups.has(g.key));

  const toggleAllGroups = () => {
    if (!groupedFees.length) return;
    setExpandedGroups(allGroupsExpanded ? new Set() : new Set(groupedFees.map((g) => g.key)));
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
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className='list-page-header'>
        <div className='header-title'>
          <HiOutlineCash className='main-icon' />
          <div>
            <h2>Fee Setup</h2>
            <p>Define charges per class, session, and term.</p>
          </div>
        </div>
        <div className='header-stats'>
          <span className='stat-pill'>Total: {feeList.length}</span>
        </div>
      </div>

      {/* ── Add Fee Button ──────────────────────────────────────── */}
      <div className='add_button'>
        {canManageFees && (
          <CustomButton
            onClick={() => openModal(null)}
            icon={<HiPlus />}
            variant='primary'
            otherClass='rounded-full'
          >
            Add Fee
          </CustomButton>
        )}
      </div>

      {/* ── Form Modal ──────────────────────────────────────────── */}
      {modalOpen && (
        <FormModal title={editingFee?.id ? "Edit Fee" : "Add Fee"} onClose={closeModal}>
          <FeeForm
            editingFee={editingFee}
            onSaved={async () => {
              await loadData();
              closeModal();
            }}
            onCancel={closeModal}
          />
        </FormModal>
      )}

      {/* ── Table ──────────────────────────────────────────────── */}
      <div className='table-card fee-setup-card' style={{ marginTop: "2rem" }}>
        {/* Controls row */}
        <div className='fee-table-controls'>
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

        {/* Table */}
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
                      className={`fee-parent-row ${isOpen ? "is-open" : ""}`}
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
                                            onClick={() => setDeleteTarget(fee)}
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

      {/* ── Confirm Delete Modal ────────────────────────────────── */}
      {deleteTarget && (
        <ConfirmModal
          entityName={`${deleteTarget.feeType} fee for ${getClassName(deleteTarget.classId)}`}
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
