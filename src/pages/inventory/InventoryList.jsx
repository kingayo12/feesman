import { Bone } from "@/components/common/Skeleton";
import { CATEGORIES, fmt, formatTs, UNITS } from "@/constants";
import { useInventoryAssign } from "@hooks/useInventoryAssign";
import { useCallback, useEffect, useState } from "react";
import {
  HiArchive,
  HiChevronDown,
  HiChevronUp,
  HiClock,
  HiCurrencyDollar,
  HiDocumentText,
  HiExclamationCircle,
  HiOutlineAcademicCap,
  HiPencil,
  HiPlus,
  HiRefresh,
  HiScale,
  HiSearch,
  HiTag,
  HiTrash,
  HiTrendingUp,
  HiUsers,
} from "react-icons/hi";
import { HiArchiveBox, HiSquare2Stack } from "react-icons/hi2";
import { useNavigate } from "react-router-dom";
import AssignItemModal from "../../components/common/AssignItemModal";
import { BulkAssignModal } from "../../components/common/BulkAssignModal";
import BulkInventoryModal from "../../components/common/BulkInventoryModal";
import CustomButton from "../../components/common/CustomButton";
import CustomInput from "../../components/common/Input";
import { FormModal, SuccessModal } from "../../components/common/Modal";
import CustomSelect from "../../components/common/SelectInput";
import CustomTextArea from "../../components/common/TextArea";
import { PERMISSIONS } from "../../config/permissions";
import { useAuth } from "../../context/AuthContext";
import { useRole } from "../../hooks/useRole";
import {
  createInventoryItem,
  deactivateInventoryItem,
  deleteInventoryItem,
  getInventoryItems,
  getItemPriceHistory,
  getItemStats,
  updateInventoryItem,
} from "../../services/inventory/inventoryService";

// ─── Skeleton bone ────────────────────────────────────────────────────────

// ─── Price history ────────────────────────────────────────────────────────
function PriceHistoryContent({ item }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItemPriceHistory(item.id)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [item.id]);

  if (loading)
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <Bone key={i} h={56} r={8} />
        ))}
      </div>
    );

  if (history.length === 0)
    return (
      <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "1rem 0" }}>
        No price history found.
      </p>
    );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {history.map((h, i) => (
        <div
          key={h.id}
          style={{
            background: i === 0 ? "var(--bg-secondary)" : "transparent",
            border: "1px solid var(--border-muted)",
            borderRadius: 8,
            padding: "0.75rem 1rem",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
          }}
        >
          <div>
            <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 14 }}>
              {fmt(h.price)}
              {i === 0 && (
                <span
                  style={{
                    marginLeft: 8,
                    fontSize: 11,
                    color: "#0f6e56",
                    background: "#e1f5ee",
                    padding: "1px 7px",
                    borderRadius: 99,
                    fontWeight: 600,
                  }}
                >
                  Current
                </span>
              )}
            </p>
            {h.previousPrice !== undefined && (
              <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
                Was {fmt(h.previousPrice)} · {h.price > h.previousPrice ? "▲" : "▼"}{" "}
                {fmt(Math.abs(h.price - h.previousPrice))}
              </p>
            )}
            {h.note && (
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  fontStyle: "italic",
                }}
              >
                {h.note}
              </p>
            )}
          </div>
          <span
            style={{
              fontSize: 11,
              color: "var(--text-secondary)",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <HiClock style={{ verticalAlign: "middle", marginRight: 3 }} />
            {formatTs(h.changedAt)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Item form ────────────────────────────────────────────────────────────
function ItemFormContent({ item, onSaved, formId = "inventory-item-form", onSubmittingChange }) {
  const { user } = useAuth();
  const isEdit = !!item;
  const [error, setError] = useState(null);
  const [form, setForm] = useState({
    name: item?.name || "",
    description: item?.description || "",
    category: item?.category || CATEGORIES[0],
    unit: item?.unit || UNITS[0],
    price: item?.price ?? "",
    stock: item?.stock === -1 ? "" : (item?.stock ?? ""),
    priceChangeNote: "",
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const priceChanged = isEdit && form.price !== "" && Number(form.price) !== item.price;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!form.name.trim()) return setError("Item name is required.");
    if (form.price === "" || isNaN(Number(form.price)) || Number(form.price) < 0)
      return setError("Enter a valid price.");

    onSubmittingChange?.(true);
    try {
      if (isEdit) {
        await updateInventoryItem(item.id, form, user.uid);
      } else {
        await createInventoryItem(form, user.uid);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      onSubmittingChange?.(false);
    } finally {
      onSubmittingChange?.(false);
    }
  };

  return (
    <form
      id={formId}
      onSubmit={handleSubmit}
      style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
    >
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--bg-danger)",
            color: "var(--text-danger)",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "0.625rem 0.875rem",
            fontSize: 13,
          }}
        >
          <HiExclamationCircle style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}
      <CustomInput
        icon={<HiTag />}
        labelName='Item name'
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder='e.g. School Shirt'
        required
      />
      <div className='form-grid'>
        <CustomSelect
          icon={<HiSquare2Stack />}
          labelName='Category'
          value={form.category}
          onChange={(e) => set("category", e.target.value)}
          options={CATEGORIES}
          placeholder='Select category'
          required
        />
        <CustomSelect
          icon={<HiScale />}
          labelName='Unit'
          value={form.unit}
          onChange={(e) => set("unit", e.target.value)}
          options={UNITS}
          placeholder='Select unit'
          required
        />
        <CustomInput
          icon={<HiCurrencyDollar />}
          labelName='Price'
          type='number'
          step='0.01'
          value={form.price}
          onChange={(e) => set("price", e.target.value)}
          placeholder='0.00'
          required
        />
        <CustomInput
          icon={<HiArchiveBox />}
          labelName='Stock (blank = unlimited)'
          type='number'
          value={form.stock}
          onChange={(e) => set("stock", e.target.value)}
          placeholder='Unlimited'
          min='0'
        />
      </div>
      <CustomTextArea
        icon={<HiDocumentText />}
        labelName='Description'
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder='Optional description'
        required={false}
      />
      {priceChanged && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div
            style={{
              background: "#fffbeb",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "0.625rem 0.875rem",
              fontSize: 13,
              color: "#92400e",
            }}
          >
            ⚠ Price changing: <strong>{fmt(item.price)}</strong> →{" "}
            <strong>{fmt(Number(form.price))}</strong>. Existing assignments keep their original
            price.
          </div>
          <CustomInput
            icon={<HiDocumentText />}
            labelName='Reason for price change (optional)'
            value={form.priceChangeNote}
            onChange={(e) => set("priceChangeNote", e.target.value)}
            placeholder='e.g. Supplier increase'
          />
        </div>
      )}
    </form>
  );
}

// ─── Remove item ──────────────────────────────────────────────────────────
function RemoveItemContent({ item, onClose, onRemoved }) {
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleAction = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "deactivate") await deactivateInventoryItem(item.id);
      else await deleteInventoryItem(item.id);
      onRemoved();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
      {error && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--bg-danger)",
            color: "var(--text-danger)",
            border: "1px solid #fecaca",
            borderRadius: 8,
            padding: "0.625rem 0.875rem",
            fontSize: 13,
          }}
        >
          <HiExclamationCircle style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)" }}>
        Choose how to remove <strong>{item.name}</strong>. If it has been assigned to students,
        deactivation is the safe option.
      </p>
      <div
        onClick={() => setMode("deactivate")}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "0.875rem 1rem",
          border: `2px solid ${mode === "deactivate" ? "var(--accent)" : "var(--border-muted)"}`,
          borderRadius: 10,
          cursor: "pointer",
          background: mode === "deactivate" ? "var(--accent-light)" : "transparent",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <HiArchive style={{ fontSize: 20, color: "var(--accent)", marginTop: 2, flexShrink: 0 }} />
        <div>
          <p style={{ margin: "0 0 2px", fontWeight: 600, fontSize: 14 }}>Deactivate</p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
            Hides the item from new assignments. Existing records are preserved. Recommended.
          </p>
        </div>
      </div>
      <div
        onClick={() => setMode("delete")}
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          padding: "0.875rem 1rem",
          border: `2px solid ${mode === "delete" ? "var(--text-danger)" : "var(--border-muted)"}`,
          borderRadius: 10,
          cursor: "pointer",
          background: mode === "delete" ? "var(--bg-danger)" : "transparent",
          transition: "border-color 0.15s, background 0.15s",
        }}
      >
        <HiTrash
          style={{ fontSize: 20, color: "var(--text-danger)", marginTop: 2, flexShrink: 0 }}
        />
        <div>
          <p
            style={{
              margin: "0 0 2px",
              fontWeight: 600,
              fontSize: 14,
              color: "var(--text-danger)",
            }}
          >
            Permanently delete
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)" }}>
            Only possible if the item has never been assigned to a student. Cannot be undone.
          </p>
        </div>
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
        <button className='btn btn-secondary' onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button
          className={mode === "delete" ? "btn btn-danger" : "btn btn-primary"}
          disabled={!mode || busy}
          onClick={handleAction}
        >
          {busy
            ? "Processing…"
            : mode === "delete"
              ? "Delete permanently"
              : mode === "deactivate"
                ? "Deactivate item"
                : "Choose an option above"}
        </button>
      </div>
    </div>
  );
}

// ─── Item stats strip ─────────────────────────────────────────────────────
function ItemStatsRow({ itemId }) {
  const [stats, setStats] = useState(null);
  useEffect(() => {
    getItemStats(itemId).then(setStats);
  }, [itemId]);
  if (!stats) return <Bone h={20} r={6} w='50%' />;
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        fontSize: 12,
        color: "var(--text-secondary)",
        flexWrap: "wrap",
      }}
    >
      <span>
        <strong style={{ color: "var(--text-primary)" }}>{stats.totalStudents}</strong> student
        {stats.totalStudents !== 1 ? "s" : ""} assigned
      </span>
      <span>
        <strong style={{ color: "#0f6e56" }}>{fmt(stats.totalPaid)}</strong> collected
      </span>
      {stats.totalOutstanding > 0 && (
        <span>
          <strong style={{ color: "#dc2626" }}>{fmt(stats.totalOutstanding)}</strong> outstanding
        </span>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function InventoryList() {
  const { can } = useRole();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null);
  const [formSaving, setFormSaving] = useState(false);
  const closeModal = () => setModal(null);

  // Single assign modal state
  const {
    assignModal,
    students,
    loadingStudents,
    assignForm,
    assignSaving,
    assignError,
    openAssign,
    closeAssign,
    setAssignForm,
    handleAssignSubmit,
  } = useInventoryAssign((assignedItem, student) => {
    load();
    setModal({
      type: "success",
      title: "Item Assigned",
      message: `${assignedItem.name} assigned to ${student.firstName}. Record payment from the student's profile.`,
    });
  });

  // Bulk assign modal
  const [showBulkAssign, setShowBulkAssign] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const canEdit = can(PERMISSIONS.EDIT_FEE) || can(PERMISSIONS.MANAGE_DISCOUNTS);
  const canDelete = can(PERMISSIONS.DANGER_ZONE);

  // ── Load items ────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInventoryItems({ activeOnly: filterStatus === "active" });
      setItems(data);
    } catch {
      // user can retry
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    load();
  }, [load]);

  // ── Saved / removed ───────────────────────────────────────────────────────
  const handleSaved = (isEdit) => {
    closeModal();
    load();
    setTimeout(() => {
      setModal({
        type: "success",
        title: isEdit ? "Item Updated" : "Item Added",
        message: isEdit ? "Inventory item updated successfully." : "New item added to inventory.",
      });
    }, 120);
  };

  const handleRemoved = () => {
    closeModal();
    load();
    setTimeout(() => {
      setModal({
        type: "success",
        title: "Item Removed",
        message: "The item has been removed from the inventory.",
      });
    }, 120);
  };

  // ── Filtering ─────────────────────────────────────────────────────────────
  const filtered = items.filter((it) => {
    const matchSearch =
      it.name.toLowerCase().includes(search.toLowerCase()) ||
      it.category.toLowerCase().includes(search.toLowerCase());
    const matchCategory = filterCategory === "All" || it.category === filterCategory;
    return matchSearch && matchCategory;
  });

  const grouped = filtered.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className='student-list-container'>
      {/* ── Page header ── */}
      <div className='list-page-header'>
        <div className='header-title'>
          <HiArchive className='main-icon' />
          <div>
            <h2>Inventory</h2>
            <p>Manage school items and assign them to students</p>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <button className='filter-btn' onClick={load} disabled={loading}>
            <HiRefresh /> Refresh
          </button>
          <button className='filter-btn' onClick={() => navigate("/students")}>
            <HiOutlineAcademicCap /> Students
          </button>
          <button className='filter-btn' onClick={() => navigate("/fees")}>
            <HiCurrencyDollar /> Fees
          </button>
        </div>
      </div>

      {/* ── Top actions ── */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {canEdit && (
          <CustomButton
            children='Add Item'
            className='submit-btn'
            icon={<HiPlus />}
            onClick={() => setModal({ type: "form", item: null })}
          />
        )}
        {canEdit && (
          <CustomButton
            children='Bulk Upload Items'
            icon={<HiDocumentText />}
            variant='outline'
            className='filter-btn'
            style={{ fontWeight: 600 }}
            onClick={() => setShowBulkUpload(true)}
          />
        )}
        {(can(PERMISSIONS.EDIT_STUDENT) || can(PERMISSIONS.MANAGE_INVENTORY)) && (
          <CustomButton
            children='Assign to Student'
            icon={<HiUsers />}
            variant='outline'
            className='filter-btn'
            style={{ fontWeight: 600 }}
            onClick={() => setShowBulkAssign(true)}
          />
        )}
      </div>

      {/* ── Search + status filter ── */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          marginBottom: "1.25rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div className='search-box' style={{ flex: 1, minWidth: 200 }}>
          <CustomInput
            type='text'
            placeholder='Search items...'
            icon={<HiSearch />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div style={{ display: "flex", gap: "0.375rem" }}>
          {[
            { key: "active", label: "Active only" },
            { key: "all", label: "Show all" },
          ].map(({ key, label }) => (
            <CustomButton
              key={key}
              children={label}
              onClick={() => setFilterStatus(key)}
              variant='filter'
              className={`filter-btn ${filterStatus === key ? "active" : ""}`}
            />
          ))}
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "0.25rem",
          marginBottom: "1.25rem",
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {["All", ...CATEGORIES].map((cat) => (
          <button
            key={cat}
            onClick={() => setFilterCategory(cat)}
            style={{
              padding: "5px 14px",
              borderRadius: 99,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              border: "1px solid var(--border-muted)",
              whiteSpace: "nowrap",
              flexShrink: 0,
              background: filterCategory === cat ? "#4f46e5" : "transparent",
              color: filterCategory === cat ? "#fff" : "var(--text-secondary)",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Summary bar ── */}
      {!loading && items.length > 0 && (
        <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1.25rem", flexWrap: "wrap" }}>
          {[
            { label: "Total items", value: items.length },
            { label: "Active", value: items.filter((i) => i.isActive).length },
            { label: "Categories", value: new Set(items.map((i) => i.category)).size },
            { label: "Unlimited stock", value: items.filter((i) => i.stock === -1).length },
          ].map(({ label, value }) => (
            <div
              key={label}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border-muted)",
                borderRadius: 10,
                padding: "0.6rem 1rem",
              }}
            >
              <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>{label}</p>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 18 }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── List ── */}
      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} h={72} r={12} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className='table-card' style={{ padding: "2rem", textAlign: "center" }}>
          <p style={{ color: "var(--text-secondary)", marginBottom: "1rem" }}>
            {search ? `No items matching "${search}".` : "No inventory items yet."}
          </p>
          {canEdit && !search && (
            <button
              className='submit-btn'
              style={{ width: "auto" }}
              onClick={() => setModal({ type: "form", item: null })}
            >
              <HiPlus /> Add first item
            </button>
          )}
        </div>
      ) : (
        Object.entries(grouped).map(([category, catItems]) => (
          <div key={category} style={{ marginBottom: "1.5rem" }}>
            <h4
              style={{
                margin: "0 0 0.6rem",
                fontSize: 13,
                fontWeight: 600,
                color: "var(--text-secondary)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              {category} <span style={{ fontWeight: 400 }}>({catItems.length})</span>
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {catItems.map((item) => {
                const expanded = expandedId === item.id;
                const stockLabel = item.stock === -1 ? "Unlimited" : `${item.stock} in stock`;
                const stockColor =
                  item.stock === 0
                    ? "#dc2626"
                    : item.stock !== -1 && item.stock < 5
                      ? "#d97706"
                      : "var(--text-secondary)";

                return (
                  <div
                    key={item.id}
                    className='table-card'
                    style={{
                      padding: 0,
                      overflow: "hidden",
                      opacity: item.isActive ? 1 : 0.6,
                      border: !item.isActive ? "1px dashed var(--border-muted)" : undefined,
                    }}
                  >
                    <div
                      style={{
                        padding: "0.875rem 1.125rem",
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        cursor: "pointer",
                      }}
                      onClick={() => setExpandedId(expanded ? null : item.id)}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{item.name}</span>
                          {!item.isActive && (
                            <span
                              style={{
                                fontSize: 11,
                                color: "#92400e",
                                background: "#fef3c7",
                                padding: "1px 7px",
                                borderRadius: 99,
                                fontWeight: 600,
                              }}
                            >
                              Inactive
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-secondary)",
                              background: "var(--bg-secondary)",
                              padding: "1px 7px",
                              borderRadius: 99,
                            }}
                          >
                            {item.unit}
                          </span>
                        </div>
                        {item.description && (
                          <p
                            style={{
                              margin: "2px 0 0",
                              fontSize: 12,
                              color: "var(--text-secondary)",
                            }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#185fa5" }}>
                          {fmt(item.price)}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: stockColor }}>{stockLabel}</p>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                        {can(PERMISSIONS.VIEW_STUDENTS) && (
                          <button
                            className='icon-btn'
                            title='View assigned students'
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/students?itemId=${item.id}`);
                            }}
                          >
                            <HiUsers />
                          </button>
                        )}
                        {(can(PERMISSIONS.EDIT_STUDENT) || can(PERMISSIONS.MANAGE_INVENTORY)) && (
                          <button
                            className='icon-btn'
                            title='Assign to one student'
                            onClick={(e) => {
                              e.stopPropagation();
                              openAssign(item);
                            }}
                          >
                            <HiPlus />
                          </button>
                        )}
                        {can(PERMISSIONS.VIEW_FEES) && (
                          <button
                            className='icon-btn'
                            title='Use in fees setup'
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/fees?itemId=${item.id}`);
                            }}
                          >
                            <HiCurrencyDollar />
                          </button>
                        )}
                        {canEdit && (
                          <button
                            className='icon-btn'
                            title='Edit item'
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: "form", item });
                            }}
                          >
                            <HiPencil />
                          </button>
                        )}
                        <button
                          className='icon-btn'
                          title='Price history'
                          onClick={(e) => {
                            e.stopPropagation();
                            setModal({ type: "history", item });
                          }}
                        >
                          <HiTrendingUp />
                        </button>
                        {canDelete && (
                          <button
                            className='icon-btn'
                            title='Remove item'
                            style={{ color: "#dc2626" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setModal({ type: "remove", item });
                            }}
                          >
                            <HiTrash />
                          </button>
                        )}
                        <span
                          className='icon-btn'
                          style={{ color: "var(--text-secondary)", pointerEvents: "none" }}
                        >
                          {expanded ? <HiChevronUp /> : <HiChevronDown />}
                        </span>
                      </div>
                    </div>
                    {expanded && (
                      <div
                        style={{
                          borderTop: "1px solid var(--border-muted)",
                          padding: "0.75rem 1.125rem",
                          background: "var(--bg-secondary)",
                        }}
                      >
                        <ItemStatsRow itemId={item.id} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}

      {/* ── Modals ── */}
      {modal?.type === "form" && (
        <FormModal
          title={modal.item ? "Edit Item" : "Add Inventory Item"}
          subtitle={
            modal.item
              ? `Editing "${modal.item.name}" — price changes are logged in history`
              : "Fill in the details. Leave stock blank for unlimited."
          }
          onClose={closeModal}
          maxWidth='540px'
          footer={
            <>
              <button
                type='button'
                className='btn btn-secondary'
                onClick={closeModal}
                disabled={formSaving}
              >
                Cancel
              </button>
              <button
                type='submit'
                form='inventory-item-form'
                className='btn btn-primary'
                disabled={formSaving}
              >
                {formSaving ? "Saving…" : modal.item ? "Save changes" : "Add item"}
              </button>
            </>
          }
        >
          <ItemFormContent
            formId='inventory-item-form'
            item={modal.item}
            onClose={closeModal}
            onSaved={() => handleSaved(!!modal.item)}
            onSubmittingChange={setFormSaving}
          />
        </FormModal>
      )}

      {modal?.type === "history" && (
        <FormModal
          title='Price History'
          subtitle={`All recorded price changes for "${modal.item.name}"`}
          onClose={closeModal}
          maxWidth='500px'
        >
          <PriceHistoryContent item={modal.item} />
        </FormModal>
      )}

      {modal?.type === "remove" && (
        <FormModal
          title='Remove Item'
          subtitle='Choose whether to deactivate or permanently delete this item.'
          onClose={closeModal}
          maxWidth='460px'
        >
          <RemoveItemContent item={modal.item} onClose={closeModal} onRemoved={handleRemoved} />
        </FormModal>
      )}

      {modal?.type === "success" && (
        <SuccessModal title={modal.title} message={modal.message} onClose={closeModal} />
      )}

      {/* ── Single assign modal ── */}
      <AssignItemModal
        assignModal={assignModal}
        students={students}
        loadingStudents={loadingStudents}
        assignForm={assignForm}
        assignSaving={assignSaving}
        assignError={assignError}
        closeAssign={closeAssign}
        setAssignForm={setAssignForm}
        handleAssignSubmit={handleAssignSubmit}
      />

      {/* ── Bulk assign modal ── */}
      {showBulkAssign && (
        <BulkAssignModal
          allItems={items}
          onClose={() => setShowBulkAssign(false)}
          onSuccess={(count, firstName) => {
            setShowBulkAssign(false);
            load();
            setModal({
              type: "success",
              title: "Items Assigned",
              message: `${count} item${count !== 1 ? "s" : ""} assigned to ${firstName}. Record payment from their profile.`,
            });
          }}
        />
      )}

      {showBulkUpload && (
        <BulkInventoryModal
          onClose={() => setShowBulkUpload(false)}
          onComplete={() => {
            setShowBulkUpload(false);
            load();
          }}
        />
      )}
    </div>
  );
}
