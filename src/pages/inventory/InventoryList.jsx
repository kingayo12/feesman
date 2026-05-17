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
  assignItemToStudent,
} from "./inventoryService";
import { useAuth } from "../../context/AuthContext";
import { FormModal, SuccessModal } from "../../components/common/Modal";
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
  HiX,
  HiCheck,
} from "react-icons/hi";
import { HiUsers, HiOutlineAcademicCap } from "react-icons/hi";
import { useNavigate } from "react-router-dom";
import { getAllStudents, getStudentById } from "../students/studentService";
import { getCurrentEnrollment } from "../students/enrollmentService";
import CustomInput from "../../components/common/Input";
import CustomSelect from "../../components/common/SelectInput";
import CustomTextArea from "../../components/common/TextArea";
import { getSettings } from "../settings/settingService";
import {
  HiArchiveBox,
  HiSquare2Stack,
  HiOutlineHashtag,
  HiOutlinePencil,
  HiUser,
} from "react-icons/hi2";
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

// ─── Skeleton bone ────────────────────────────────────────────────────────
function Bone({ w = "100%", h = 16, r = 6, style = {} }) {
  return <div className='skel-bone' style={{ width: w, height: h, borderRadius: r, ...style }} />;
}

// ─── Price history ────────────────────────────────────────────────────────
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

// ─── Bulk Assign Modal ────────────────────────────────────────────────────
// Step 1: pick a student
// Step 2: add items from the inventory list with quantities
// Step 3: review and confirm — assigns all in one go
function BulkAssignModal({ allItems, onClose, onSuccess }) {
  const { user } = useAuth();

  const [step, setStep] = useState(1); // 1 = student, 2 = items, 3 = confirm
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [selectedStudentId, setSelectedStudentId] = useState("");
  const [searchItem, setSearchItem] = useState("");

  // cart: [{ item, quantity, note }]
  const [cart, setCart] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(""); // e.g. "Assigning 2 of 4…"

  useEffect(() => {
    getAllStudents()
      .then((all) => {
        setStudents(all || []);
        if (all?.length) setSelectedStudentId(all[0].id);
      })
      .catch(console.error)
      .finally(() => setLoadingStudents(false));
  }, []);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  // ── Cart helpers ──────────────────────────────────────────────────────────
  const isInCart = (itemId) => cart.some((c) => c.item.id === itemId);

  const addToCart = (item) => {
    if (isInCart(item.id)) return;
    setCart((prev) => [...prev, { item, quantity: 1, note: "" }]);
  };

  const removeFromCart = (itemId) => {
    setCart((prev) => prev.filter((c) => c.item.id !== itemId));
  };

  const updateCart = (itemId, field, value) => {
    setCart((prev) => prev.map((c) => (c.item.id === itemId ? { ...c, [field]: value } : c)));
  };

  const cartTotal = cart.reduce((s, c) => s + Number(c.quantity || 0) * c.item.price, 0);

  // ── Filtered items for step 2 picker ─────────────────────────────────────
  const activeItems = allItems.filter((it) => it.isActive);
  const filteredItems = activeItems.filter(
    (it) =>
      it.name.toLowerCase().includes(searchItem.toLowerCase()) ||
      it.category.toLowerCase().includes(searchItem.toLowerCase()),
  );

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleConfirm = async () => {
    setError(null);
    if (!selectedStudentId) return setError("No student selected.");
    if (cart.length === 0) return setError("Add at least one item.");
    for (const c of cart) {
      if (!c.quantity || Number(c.quantity) < 1)
        return setError(`Quantity for "${c.item.name}" must be at least 1.`);
    }

    setSaving(true);
    try {
      const student = await getStudentById(selectedStudentId);
      if (!student) throw new Error("Student not found.");

      const settings = await getSettings();
      const academicYear = settings?.currentSession || settings?.academicYear || null;
      const term = settings?.currentTerm || settings?.term || null;

      let classId = null;
      try {
        const enroll = await getCurrentEnrollment(selectedStudentId);
        classId = enroll?.classId || null;
      } catch (_) {}

      const studentName = `${student.firstName || ""} ${student.lastName || ""}`.trim();

      for (let i = 0; i < cart.length; i++) {
        const { item, quantity, note } = cart[i];
        setProgress(`Assigning ${i + 1} of ${cart.length}: ${item.name}…`);
        await assignItemToStudent({
          studentId: selectedStudentId,
          studentName,
          classId,
          itemId: item.id,
          quantity: Number(quantity),
          academicYear,
          term,
          note,
          assignedBy: user?.uid || null,
        });
      }

      onSuccess(cart.length, student.firstName);
    } catch (err) {
      setError(err.message || String(err));
      setSaving(false);
      setProgress("");
    }
  };

  // ── Step labels ───────────────────────────────────────────────────────────
  const stepLabel = ["Select Student", "Pick Items", "Review & Confirm"];

  return (
    <FormModal
      title='Bulk Assign Items'
      subtitle='Assign multiple items to one student in a single action.'
      onClose={onClose}
      maxWidth='600px'
    >
      {/* Step indicator */}
      <div style={{ display: "flex", gap: 0, marginBottom: "1.25rem" }}>
        {stepLabel.map((label, idx) => {
          const num = idx + 1;
          const done = step > num;
          const active = step === num;
          return (
            <div
              key={label}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {idx > 0 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: done || active ? "#4f46e5" : "var(--border-muted)",
                      transition: "background 0.2s",
                    }}
                  />
                )}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    fontWeight: 700,
                    flexShrink: 0,
                    background: done ? "#4f46e5" : active ? "#4f46e5" : "var(--bg-secondary)",
                    color: done || active ? "#fff" : "var(--text-secondary)",
                    border: active ? "2px solid #4f46e5" : "2px solid transparent",
                    transition: "all 0.2s",
                  }}
                >
                  {done ? <HiCheck /> : num}
                </div>
                {idx < stepLabel.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: done ? "#4f46e5" : "var(--border-muted)",
                      transition: "background 0.2s",
                    }}
                  />
                )}
              </div>
              <span
                style={{
                  fontSize: 11,
                  color: active ? "#4f46e5" : "var(--text-secondary)",
                  fontWeight: active ? 600 : 400,
                  whiteSpace: "nowrap",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

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
            padding: "0.6rem 0.875rem",
            fontSize: 13,
            marginBottom: "1rem",
          }}
        >
          <HiExclamationCircle style={{ flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* ── STEP 1: Select student ── */}
      {step === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {loadingStudents ? (
            <Bone h={44} r={8} />
          ) : (
            <CustomSelect
              icon={<HiUser />}
              labelName='Student'
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              placeholder='Select student'
              options={students.map((s) => ({
                value: s.id,
                label: `${s.firstName} ${s.lastName}`,
              }))}
              required
            />
          )}

          {selectedStudent && (
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 10,
                padding: "0.75rem 1rem",
                fontSize: 13,
              }}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>
                {selectedStudent.firstName} {selectedStudent.lastName}
              </p>
              <p style={{ margin: "2px 0 0", color: "var(--text-secondary)", fontSize: 12 }}>
                ID: #{selectedStudent.id?.slice(0, 6)}
              </p>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 4 }}>
            <button className='btn btn-secondary' onClick={onClose}>
              Cancel
            </button>
            <button
              className='btn btn-primary'
              disabled={!selectedStudentId || loadingStudents}
              onClick={() => setStep(2)}
            >
              Next: Pick Items →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 2: Pick items ── */}
      {step === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {/* Student reminder */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: "0.5rem 0.875rem",
              fontSize: 13,
              color: "#1e40af",
            }}
          >
            <HiUser style={{ flexShrink: 0 }} />
            Assigning to:{" "}
            <strong>
              {selectedStudent?.firstName} {selectedStudent?.lastName}
            </strong>
          </div>

          {/* Search */}
          <div className='search-box'>
            <CustomInput
              type='text'
              placeholder='Search items to add...'
              icon={<HiSearch />}
              value={searchItem}
              onChange={(e) => setSearchItem(e.target.value)}
            />
          </div>

          {/* Item picker list */}
          <div
            style={{
              maxHeight: 280,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              paddingRight: 2,
            }}
          >
            {filteredItems.length === 0 ? (
              <p
                style={{
                  textAlign: "center",
                  color: "var(--text-secondary)",
                  fontSize: 13,
                  padding: "1rem 0",
                }}
              >
                No active items found.
              </p>
            ) : (
              filteredItems.map((item) => {
                const inCart = isInCart(item.id);
                return (
                  <div
                    key={item.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "0.65rem 0.875rem",
                      border: `1px solid ${inCart ? "#4f46e5" : "var(--border-muted)"}`,
                      borderRadius: 10,
                      background: inCart ? "#f5f3ff" : "transparent",
                      transition: "all 0.15s",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{item.name}</p>
                      <p style={{ margin: 0, fontSize: 11, color: "var(--text-secondary)" }}>
                        {item.category} · {fmt(item.price)} per {item.unit}
                        {item.stock !== -1 && (
                          <span
                            style={{ marginLeft: 6, color: item.stock < 5 ? "#d97706" : "inherit" }}
                          >
                            · {item.stock} in stock
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      className={inCart ? "btn btn-secondary" : "btn btn-primary"}
                      style={{ fontSize: 12, padding: "4px 12px", flexShrink: 0 }}
                      onClick={() => (inCart ? removeFromCart(item.id) : addToCart(item))}
                    >
                      {inCart ? (
                        <>
                          <HiX style={{ verticalAlign: "middle" }} /> Remove
                        </>
                      ) : (
                        <>
                          <HiPlus style={{ verticalAlign: "middle" }} /> Add
                        </>
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart summary — items added so far with qty + note inputs */}
          {cart.length > 0 && (
            <div style={{ marginTop: 4 }}>
              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                }}
              >
                Added ({cart.length})
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cart.map((c) => (
                  <div
                    key={c.item.id}
                    style={{
                      background: "var(--bg-secondary)",
                      borderRadius: 10,
                      padding: "0.75rem 1rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{c.item.name}</span>
                      <span style={{ fontSize: 12, color: "#4f46e5", fontWeight: 600 }}>
                        {fmt(Number(c.quantity || 0) * c.item.price)}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 10 }}>
                      <div style={{ flex: "0 0 90px" }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            marginBottom: 3,
                          }}
                        >
                          Qty
                        </label>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            border: "1px solid var(--border-muted)",
                            borderRadius: 8,
                            overflow: "hidden",
                            height: 38,
                            background: "var(--bg-primary)",
                          }}
                        >
                          <button
                            type='button'
                            onClick={() =>
                              updateCart(
                                c.item.id,
                                "quantity",
                                Math.max(1, Number(c.quantity || 1) - 1),
                              )
                            }
                            style={{
                              width: 34,
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              color: "var(--text-primary)",
                            }}
                          >
                            −
                          </button>

                          <div
                            style={{
                              flex: 1,
                              textAlign: "center",
                              fontWeight: 700,
                              fontSize: 14,
                              color: "var(--text-primary)",
                            }}
                          >
                            {c.quantity}
                          </div>

                          <button
                            type='button'
                            onClick={() =>
                              updateCart(c.item.id, "quantity", Number(c.quantity || 1) + 1)
                            }
                            style={{
                              width: 34,
                              border: "none",
                              background: "transparent",
                              cursor: "pointer",
                              color: "var(--text-primary)",
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div style={{ flex: 1 }}>
                        <label
                          style={{
                            display: "block",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "var(--text-secondary)",
                            marginBottom: 3,
                          }}
                        >
                          Note (optional)
                        </label>
                        <input
                          type='text'
                          value={c.note}
                          onChange={(e) => updateCart(c.item.id, "note", e.target.value)}
                          placeholder={`e.g. Size M`}
                          style={{
                            width: "100%",
                            padding: "0.4rem 0.6rem",
                            borderRadius: 6,
                            border: "1px solid var(--border-muted)",
                            fontSize: 14,
                            background: "var(--bg-primary)",
                            color: "var(--text-primary)",
                            boxSizing: "border-box",
                          }}
                        />
                      </div>
                      <button
                        onClick={() => removeFromCart(c.item.id)}
                        title='Remove'
                        style={{
                          alignSelf: "flex-end",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "#dc2626",
                          padding: "0.4rem",
                          borderRadius: 6,
                        }}
                      >
                        <HiX style={{ fontSize: 16 }} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 4 }}>
            <button className='btn btn-secondary' onClick={() => setStep(1)}>
              ← Back
            </button>
            <button
              className='btn btn-primary'
              disabled={cart.length === 0}
              onClick={() => {
                setError(null);
                setStep(3);
              }}
            >
              Next: Review ({cart.length} item{cart.length !== 1 ? "s" : ""}) →
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 3: Review & Confirm ── */}
      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Student */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "#eff6ff",
              border: "1px solid #bfdbfe",
              borderRadius: 8,
              padding: "0.6rem 0.875rem",
              fontSize: 13,
              color: "#1e40af",
            }}
          >
            <HiUser style={{ flexShrink: 0 }} />
            <span>
              Assigning to:{" "}
              <strong>
                {selectedStudent?.firstName} {selectedStudent?.lastName}
              </strong>
            </span>
          </div>

          {/* Item list review */}
          <div
            style={{
              border: "1px solid var(--border-muted)",
              borderRadius: 10,
              overflow: "hidden",
            }}
          >
            {cart.map((c, i) => (
              <div
                key={c.item.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  padding: "0.75rem 1rem",
                  borderBottom: i < cart.length - 1 ? "1px solid var(--border-muted)" : "none",
                  gap: 12,
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.item.name}</p>
                  <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--text-secondary)" }}>
                    {c.quantity} {c.item.unit} × {fmt(c.item.price)}
                    {c.note && (
                      <>
                        {" "}
                        · <em>{c.note}</em>
                      </>
                    )}
                  </p>
                </div>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#185fa5", flexShrink: 0 }}>
                  {fmt(Number(c.quantity) * c.item.price)}
                </span>
              </div>
            ))}

            {/* Grand total */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "0.75rem 1rem",
                background: "var(--bg-secondary)",
                borderTop: "2px solid var(--border-muted)",
              }}
            >
              <span style={{ fontWeight: 700 }}>Total</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: "#185fa5" }}>
                {fmt(cartTotal)}
              </span>
            </div>
          </div>

          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: "var(--text-secondary)",
              background: "#fefce8",
              border: "1px solid #fde68a",
              borderRadius: 8,
              padding: "0.6rem 0.875rem",
            }}
          >
            ⚠ Items will be assigned as <strong>unpaid</strong>. Record payment separately from the
            student's profile page.
          </p>

          {saving && progress && (
            <p style={{ margin: 0, fontSize: 13, color: "#4f46e5", fontWeight: 500 }}>{progress}</p>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, paddingTop: 4 }}>
            <button className='btn btn-secondary' onClick={() => setStep(2)} disabled={saving}>
              ← Back
            </button>
            <button className='btn btn-primary' onClick={handleConfirm} disabled={saving}>
              {saving
                ? "Assigning…"
                : `Confirm & Assign ${cart.length} item${cart.length !== 1 ? "s" : ""}`}
            </button>
          </div>
        </div>
      )}
    </FormModal>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────
export default function InventoryList() {
  const { can } = useRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("All");
  const [filterStatus, setFilterStatus] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [modal, setModal] = useState(null);
  const closeModal = () => setModal(null);

  // Single assign modal state
  const [assignModal, setAssignModal] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [assignForm, setAssignForm] = useState({ studentId: "", quantity: 1, note: "" });
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState(null);

  // Bulk assign modal
  const [showBulkAssign, setShowBulkAssign] = useState(false);

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

  // ── Single assign ─────────────────────────────────────────────────────────
  const openAssign = async (item) => {
    setAssignModal({ item });
    setAssignError(null);
    setAssignForm({ studentId: "", quantity: 1, note: "" });
    setLoadingStudents(true);
    try {
      const all = await getAllStudents();
      setStudents(all || []);
      if (all?.length) setAssignForm((f) => ({ ...f, studentId: all[0].id }));
    } catch (err) {
      console.error("Failed to load students:", err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignModal?.item) return;
    setAssignError(null);
    if (!assignForm.studentId) return setAssignError("Select a student.");
    if (!assignForm.quantity || Number(assignForm.quantity) < 1)
      return setAssignError("Quantity must be at least 1.");

    setAssignSaving(true);
    try {
      const student = await getStudentById(assignForm.studentId);
      if (!student) throw new Error("Selected student not found.");

      const settings = await getSettings();
      const academicYear = settings?.currentSession || settings?.academicYear || null;
      const term = settings?.currentTerm || settings?.term || null;

      let classId = null;
      try {
        const enroll = await getCurrentEnrollment(assignForm.studentId);
        classId = enroll?.classId || null;
      } catch (_) {}

      await assignItemToStudent({
        studentId: assignForm.studentId,
        studentName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
        classId,
        itemId: assignModal.item.id,
        quantity: Number(assignForm.quantity),
        academicYear,
        term,
        note: assignForm.note,
        assignedBy: user?.uid || null,
      });

      setAssignModal(null);
      load();
      setModal({
        type: "success",
        title: "Item Assigned",
        message: `${assignModal.item.name} assigned to ${student.firstName}. Record payment from the student's profile.`,
      });
    } catch (err) {
      setAssignError(err.message || String(err));
    } finally {
      setAssignSaving(false);
    }
  };

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
        >
          <ItemFormContent
            item={modal.item}
            onClose={closeModal}
            onSaved={() => handleSaved(!!modal.item)}
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
      {assignModal && (
        <FormModal
          title={`Assign: ${assignModal.item.name}`}
          subtitle={`${fmt(assignModal.item.price)} per ${assignModal.item.unit} · Payment is recorded from the student's profile.`}
          onClose={() => setAssignModal(null)}
          maxWidth='500px'
        >
          <form onSubmit={handleAssignSubmit}>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {assignError && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "var(--bg-danger)",
                    color: "var(--text-danger)",
                    border: "1px solid #fecaca",
                    borderRadius: 8,
                    padding: "0.6rem 0.875rem",
                    fontSize: 13,
                  }}
                >
                  <HiExclamationCircle style={{ flexShrink: 0 }} />
                  {assignError}
                </div>
              )}
              {loadingStudents ? (
                <Bone h={44} r={8} />
              ) : (
                <CustomSelect
                  icon={<HiUser />}
                  labelName='Student'
                  value={assignForm.studentId}
                  onChange={(e) => setAssignForm((f) => ({ ...f, studentId: e.target.value }))}
                  placeholder='Select student'
                  options={students.map((s) => ({
                    value: s.id,
                    label: `${s.firstName} ${s.lastName}`,
                  }))}
                  required
                />
              )}
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label
                    style={{
                      display: "block",
                      marginBottom: 6,
                      fontSize: 13,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    Quantity
                  </label>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      border: "1px solid var(--border-color)",
                      borderRadius: 10,
                      overflow: "hidden",
                      height: 44,
                      background: "var(--bg-primary)",
                    }}
                  >
                    <button
                      type='button'
                      onClick={() =>
                        setAssignForm((f) => ({
                          ...f,
                          quantity: Math.max(1, Number(f.quantity || 1) - 1),
                        }))
                      }
                      style={{
                        width: 44,
                        height: "100%",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 20,
                        color: "var(--text-primary)",
                      }}
                    >
                      −
                    </button>

                    <div
                      style={{
                        flex: 1,
                        textAlign: "center",
                        fontWeight: 600,
                        fontSize: 15,
                      }}
                    >
                      {assignForm.quantity || 1}
                    </div>

                    <button
                      type='button'
                      onClick={() =>
                        setAssignForm((f) => ({
                          ...f,
                          quantity: Number(f.quantity || 1) + 1,
                        }))
                      }
                      style={{
                        width: 44,
                        height: "100%",
                        border: "none",
                        background: "transparent",
                        cursor: "pointer",
                        fontSize: 20,
                        color: "var(--text-primary)",
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>
                <div style={{ flex: 2 }}>
                  <CustomInput
                    name='note'
                    type='text'
                    labelName='Note (optional)'
                    value={assignForm.note}
                    onChange={(e) => setAssignForm((f) => ({ ...f, note: e.target.value }))}
                    icon={<HiOutlinePencil />}
                    placeholder='e.g. Size M'
                  />
                </div>
              </div>
              {assignForm.quantity >= 1 && (
                <div
                  style={{
                    background: "var(--bg-secondary)",
                    borderRadius: 8,
                    padding: "0.6rem 0.875rem",
                    fontSize: 13,
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span style={{ color: "var(--text-secondary)" }}>Total to collect</span>
                  <strong>{fmt(Number(assignForm.quantity || 0) * assignModal.item.price)}</strong>
                </div>
              )}
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button
                  type='button'
                  className='btn btn-secondary'
                  onClick={() => setAssignModal(null)}
                  disabled={assignSaving}
                >
                  Cancel
                </button>
                <button type='submit' className='btn btn-primary' disabled={assignSaving}>
                  {assignSaving ? "Assigning…" : "Assign item"}
                </button>
              </div>
            </div>
          </form>
        </FormModal>
      )}

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
    </div>
  );
}
