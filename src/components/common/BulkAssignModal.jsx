import { fmt } from "@/constants";
import { useEffect, useState } from "react";
import { HiCheck, HiExclamationCircle, HiPlus, HiSearch, HiX } from "react-icons/hi";
import { HiUser } from "react-icons/hi2";
import CustomInput from "../../components/common/Input";
import CustomSelect from "../../components/common/SelectInput";
import { useAuth } from "../../context/AuthContext";
import { getSettings } from "../../services/settings/settingService";
import { getCurrentEnrollment } from "../../services/students/enrollmentService";
import { getAllStudents, getStudentById } from "../../services/students/studentService";
import { FormModal } from "./Modal";
import { Bone } from "./Skeleton";

export function BulkAssignModal({ allItems, onClose, onSuccess }) {
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
