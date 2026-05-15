/**
 * InventoryList.jsx
 * Place in: src/pages/inventory/InventoryList.jsx
 */

import { useEffect, useState, useCallback } from "react";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import {
  getInventoryItems,
  createInventoryItem,
  updateInventoryItem,
  deactivateInventoryItem,
  deleteInventoryItem,
  getItemPriceHistory,
  getItemStats,
} from "./inventoryService";
import { useAuth } from "../../context/AuthContext";
import { FormModal, ConfirmModal, SuccessModal } from "../../components/common/Modal";
import {
  HiPlus,
  HiPencil,
  HiTrash,
  HiRefresh,
  HiSearch,
  HiChevronDown,
  HiChevronUp,
  HiExclamationCircle,
  HiArchive,
  HiClock,
  HiTrendingUp,
  HiTag,
  HiScale,
  HiCurrencyDollar,
  HiDocumentText,
} from "react-icons/hi";
import CustomInput from "../../components/common/Input";
import CustomSelect from "../../components/common/SelectInput";
import CustomTextArea from "../../components/common/TextArea";
import { HiArchiveBox, HiSquare2Stack } from "react-icons/hi2";
import CustomButton from "../../components/common/CustomButton";

const fmt = (n) => "\u20a6" + Math.round(n).toLocaleString();

const CATEGORIES = [
  "Uniform",
  "Books",
  "Stationery",
  "Sportswear",
  "Lab Equipment",
  "Art Supplies",
  "Food & Tuck",
  "Other",
];

const UNITS = ["piece", "set", "pair", "pack", "bottle", "bag", "box", "roll", "sheet"];

// ─── Skeleton ─────────────────────────────────────────────────────────────
function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ─── Price history content — lives inside FormModal ───────────────────────
function PriceHistoryContent({ item }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getItemPriceHistory(item.id)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, [item.id]);

  const formatTs = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-NG", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[0, 1, 2].map((i) => (
          <Bone key={i} h={56} r={8} />
        ))}
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <p style={{ color: "var(--text-secondary)", textAlign: "center", padding: "1rem 0" }}>
        No price history found.
      </p>
    );
  }

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

// ─── Item form content — lives inside FormModal ───────────────────────────
function ItemFormContent({ item, onSaved, onClose }) {
  const { user } = useAuth();
  const isEdit = !!item;
  const [saving, setSaving] = useState(false);
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

    setSaving(true);
    try {
      if (isEdit) {
        await updateInventoryItem(item.id, form, user.uid);
      } else {
        await createInventoryItem(form, user.uid);
      }
      onSaved();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
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
          labelName='Stock'
          type='number'
          value={form.stock}
          onChange={(e) => set("stock", e.target.value)}
          placeholder='0'
          min='0'
          required
        />
      </div>

      <CustomTextArea
        icon={<HiDocumentText />}
        labelName='Description'
        value={form.description}
        onChange={(e) => set("description", e.target.value)}
        placeholder='Description'
        required={false}
      />

      {/* Price change warning — only visible when editing and price actually changed */}
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
            <strong>{fmt(Number(form.price))}</strong>. Existing student assignments keep their
            original price. New assignments will use the new price.
          </div>
          <CustomInput
            icon={<HiArchiveBox />}
            labelName='Reason for price change (optional)'
            value={form.priceChangeNote}
            onChange={(e) => set("priceChangeNote", e.target.value)}
            placeholder='e.g. Supplier increase, new session'
            required={false}
          />
        </div>
      )}

      {/* Footer actions */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
        <button type='button' className='btn btn-secondary' onClick={onClose} disabled={saving}>
          Cancel
        </button>
        <button type='submit' className='btn btn-primary' disabled={saving}>
          {saving ? "Saving…" : isEdit ? "Save changes" : "Add item"}
        </button>
      </div>
    </form>
  );
}

// ─── Remove item content — lives inside FormModal ─────────────────────────
// Gives the user the choice between soft-deactivate and hard-delete.
function RemoveItemContent({ item, onClose, onRemoved }) {
  const [mode, setMode] = useState(null); // "deactivate" | "delete"
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const handleAction = async () => {
    setBusy(true);
    setError(null);
    try {
      if (mode === "deactivate") {
        await deactivateInventoryItem(item.id);
      } else {
        await deleteInventoryItem(item.id);
      }
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
        deactivation is the safe option — all existing records are preserved.
      </p>

      {/* Deactivate */}
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
            Hides the item from new assignments. Existing student records are preserved.
            Recommended.
          </p>
        </div>
      </div>

      {/* Hard delete */}
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

// ─── Item assignment stats (shown in the expanded row) ────────────────────
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
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  const canEdit = can(PERMISSIONS.EDIT_FEE) || can(PERMISSIONS.MANAGE_DISCOUNTS);
  const canDelete = can(PERMISSIONS.DANGER_ZONE);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const isActiveOnly = filterStatus === "active";
      const data = await getInventoryItems({ activeOnly: isActiveOnly });
      setItems(data);
    } catch {
      // leave list empty; user can retry with Refresh
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  console.log("items", items);

  useEffect(() => {
    load();
  }, [load]);

  const handleSaved = (isEdit) => {
    closeModal();
    load();
    // Brief delay so the list reloads before success modal mounts
    setTimeout(() => {
      setModal({
        type: "success",
        title: isEdit ? "Item Updated" : "Item Added",
        message: isEdit
          ? "The inventory item has been updated successfully."
          : "The new item has been added to the inventory.",
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

  // Derived list
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

  const allCategories = ["All", ...CATEGORIES];

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
        </div>
      </div>

      {canEdit && (
        <CustomButton
          children='Add Item'
          className='submit-btn '
          icon={<HiPlus />}
          onClick={() => setModal({ type: "form", item: null })}
        />
      )}

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
              children={label}
              key={key}
              onClick={() => setFilterStatus(key)}
              color='var(--bg-primary)'
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
        {allCategories.map((cat) => (
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
                      {/* Name + badges */}
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

                      {/* Price + stock */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: 15, color: "#185fa5" }}>
                          {fmt(item.price)}
                        </p>
                        <p style={{ margin: 0, fontSize: 11, color: stockColor }}>{stockLabel}</p>
                      </div>

                      {/* Row actions */}
                      <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
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

                    {/* Expanded stats strip */}
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

      {/* ── Modals (using project's reusable Modal.jsx) ── */}

      {/* Add / edit item */}
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
        >
          <ItemFormContent
            item={modal.item}
            onClose={closeModal}
            onSaved={() => handleSaved(!!modal.item)}
          />
        </FormModal>
      )}

      {/* Price history */}
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

      {/* Remove — deactivate or hard delete choice */}
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

      {/* Success feedback */}
      {modal?.type === "success" && (
        <SuccessModal title={modal.title} message={modal.message} onClose={closeModal} />
      )}
    </div>
  );
}
