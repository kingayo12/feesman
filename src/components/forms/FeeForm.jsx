import { useState, useEffect } from "react";
import { createFee, updateFee, createBulkFees } from "../../pages/fees/feesService";
import { getClasses } from "../../pages/classes/classService";
import { getSettings } from "../../pages/settings/settingService";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import { HiCash, HiLibrary, HiCalendar, HiTag, HiClock } from "react-icons/hi";
import CustomSelect from "../common/SelectInput";
import CustomInput from "../common/Input";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];

const EMPTY_FORM = {
  classId: "",
  session: "",
  term: "",
  feeType: "",
  amount: "",
};

/**
 * FeeForm
 *
 * Props:
 *  - onSaved      : () => void   — called after a successful create/update so the
 *                                  parent (FeeSetup) can reload its fee list.
 *  - editingFee   : object|null  — when set, the form switches to "edit" mode and
 *                                  pre-fills with the fee's data.
 *  - onCancelEdit : () => void   — called when the user clicks "Cancel" while editing.
 */
const FeeForm = ({ onSaved, editingFee, onCancelEdit }) => {
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { can } = useRole();
  const canManageFees = can(PERMISSIONS.CREATE_FEE) || can(PERMISSIONS.EDIT_FEE);

  // ─── Helpers ────────────────────────────────────────────────────────
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

  // ─── Load classes + default session/term ────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        const [clsData, appSettings] = await Promise.all([getClasses(), getSettings()]);

        const enhanced = (clsData || []).map((c) => ({ ...c, group: detectGroup(c) }));
        setClasses(sortClasses(enhanced));

        // Only fill session/term when NOT in edit mode
        if (!editingFee) {
          setForm((prev) => ({
            ...prev,
            session: appSettings?.academicYear || "",
            term: appSettings?.currentTerm || "1st Term",
          }));
        }
      } catch (err) {
        console.error("FeeForm load error:", err);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Sync form when editingFee changes ──────────────────────────────
  useEffect(() => {
    if (editingFee) {
      setForm({
        classId: editingFee.classId,
        session: editingFee.session,
        term: editingFee.term,
        feeType: editingFee.feeType,
        amount: editingFee.amount,
      });
    } else {
      // Reset but keep session/term context
      setForm((prev) => ({
        ...EMPTY_FORM,
        session: prev.session,
        term: prev.term,
      }));
    }
  }, [editingFee]);

  // ─── Handlers ────────────────────────────────────────────────────────
  const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleCancel = () => {
    setForm((prev) => ({ ...EMPTY_FORM, session: prev.session, term: prev.term }));
    onCancelEdit?.();
  };

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

      const bulkTargets = ["all", "primary", "secondary"];

      if (bulkTargets.includes(form.classId)) {
        const targetClasses =
          form.classId === "all" ? classes : classes.filter((c) => c.group === form.classId);

        if (!targetClasses.length) {
          alert("No classes found for selected group.");
          return;
        }

        await createBulkFees(targetClasses.map((cls) => ({ ...payload, classId: cls.id })));
      } else if (editingFee) {
        await updateFee(editingFee.id, payload);
      } else {
        await createFee(payload);
      }

      // Reset form (keep session/term)
      setForm((prev) => ({ ...EMPTY_FORM, session: prev.session, term: prev.term }));
      onCancelEdit?.();
      onSaved?.();
    } catch (err) {
      console.error("Fee save failed:", err);
      alert("Failed to save fee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────
  if (!canManageFees) {
    return (
      <div className='form-header'>
        <h3>Fee Setup</h3>
        <p>You can view fees, but you do not have permission to create or edit them.</p>
      </div>
    );
  }

  const groups = [
    {
      label: "Bulk Actions",
      options: [
        { value: "all", label: "All Classes" },
        { value: "primary", label: "All Primary" },
        { value: "secondary", label: "All Secondary" },
      ],
    },
    {
      label: "Creche / Daycare",
      options: classes
        .filter((c) => getClassLevel(c.name) === 0)
        .map((cls) => ({ value: cls.id, label: cls.name })),
    },
    {
      label: "Nursery / KG",
      options: classes
        .filter((c) => getClassLevel(c.name) === 1 || getClassLevel(c.name) === 2)
        .map((cls) => ({ value: cls.id, label: cls.name })),
    },
    {
      label: "Primary",
      options: classes
        .filter((c) => getClassLevel(c.name) === 3)
        .map((cls) => ({ value: cls.id, label: cls.name })),
    },
    {
      label: "Secondary",
      options: classes
        .filter((c) => getClassLevel(c.name) >= 4)
        .map((cls) => ({ value: cls.id, label: cls.name })),
    },
  ];

  return (
    <>
      <div className='form-header'>
        <p>Set a charge for a class, session, and term.</p>
      </div>

      <form className='modern-form' onSubmit={handleSubmit}>
        <div className='form-grid'>
          {/* Class */}
          <CustomSelect
            name='classId'
            value={form.classId}
            onChange={handleChange}
            groups={groups}
            icon={<HiLibrary />}
            labelName='Class'
            placeholder='Select class'
            required={true}
          />

          {/* Session */}
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

          {/* Term */}
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

          {/* Fee Type */}
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

          {/* Amount */}
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
            {isSubmitting ? "Saving…" : editingFee ? "Update Fee" : "Add Fee"}
          </button>
          {editingFee && (
            <button type='button' className='cancel-btn' onClick={handleCancel}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </>
  );
};

export default FeeForm;
