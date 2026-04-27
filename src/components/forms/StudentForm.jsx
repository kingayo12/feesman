import { useState, useEffect, useCallback } from "react";
import { createStudent, updateStudent } from "../../pages/students/studentService";
import { getCurrentEnrollment } from "../../pages/students/enrollmentService";
import { getClasses } from "../../pages/classes/classService";
import { getSettings } from "../../pages/settings/settingService";
import { getFamilies, getFamilyById } from "../../pages/families/familyService";
import {
  HiUser,
  HiIdentification,
  HiAcademicCap,
  HiCalendar,
  HiRefresh,
  HiLockClosed,
  HiLockOpen,
  HiClock,
} from "react-icons/hi";
import CustomInput from "../common/Input";
import CustomButton from "../common/CustomButton";
import CustomSelect from "../common/SelectInput";

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseClassName(name = "") {
  const m = name.trim().match(/^(.*?)(\d+)\s*([A-Za-z]?)$/);
  if (!m) return { prefix: name.trim(), level: Infinity, arm: "" };
  return { prefix: m[1].trim(), level: parseInt(m[2], 10), arm: m[3].toUpperCase() };
}

function getGroupOrder(prefix = "") {
  const p = prefix.toLowerCase();
  if (p.includes("creche") || p.includes("daycare")) return 0;
  if (p.includes("kg") || p.includes("kindergarten")) return 1;
  if (p.includes("nursery")) return 2;
  if (p.includes("primary")) return 3;
  if (p.includes("jss") || p.includes("junior")) return 4;
  if (p.includes("ss") || p.includes("senior") || p.includes("secondary")) return 5;
  return 6;
}

function sortClasses(list = []) {
  return [...list].sort((a, b) => {
    const pa = parseClassName(a.name);
    const pb = parseClassName(b.name);
    const go = getGroupOrder(pa.prefix) - getGroupOrder(pb.prefix);
    if (go !== 0) return go;
    if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix);
    if (pa.level !== pb.level) return pa.level - pb.level;
    return pa.arm.localeCompare(pb.arm);
  });
}

// ── Admission number generator ────────────────────────────────────────────────
// Format: ABBR/ST/YYYY/MMDD/RR  e.g. GCI/OY/2025/0115/47
function generateAdmissionNo(abbr = "SCH", state = "NG") {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 90) + 10);
  const abbrPart = (abbr || "SCH").toUpperCase().slice(0, 4).replace(/\s/g, "");
  const statePart = (state || "NG").toUpperCase().slice(0, 3).replace(/\s/g, "");
  return `${abbrPart}/${statePart}/${year}/${month}${day}/${rand}`;
}

const TERMS = ["1st Term", "2nd Term", "3rd Term"];

const EMPTY_IDENTITY = {
  firstName: "",
  otherName: "",
  lastName: "",
  admissionNo: "",
};

const EMPTY_ENROLLMENT = {
  classId: "",
  session: "",
  term: "",
};

// ── Component ─────────────────────────────────────────────────────────────────

/**
 * StudentForm
 *
 * CREATE mode — passes all fields (identity + enrollment) to createStudent(),
 *               which internally calls enrollStudent() via autoEnroll.
 *               No separate enrollStudent() call needed here.
 *
 * EDIT mode   — updates identity fields only via updateStudent().
 *               Current enrollment is shown read-only.
 *               To change class/session/term use the Promote flow.
 *
 * Props:
 *  - familyId    : string|null  — pre-selects & locks family (opened from FamilyDetails)
 *  - initialData : object|null  — switches to edit mode; must include student `id`
 *  - onSuccess   : () => void
 *  - onCancel    : () => void
 */
export default function StudentForm({ familyId, onSuccess, initialData, onCancel }) {
  const isEditMode = Boolean(initialData?.id);

  const [classes, setClasses] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(familyId || "");
  const [schoolAbbr, setSchoolAbbr] = useState("");
  const [schoolState, setSchoolState] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admLocked, setAdmLocked] = useState(true);
  const [currentEnrollment, setCurrentEnrollment] = useState(null);

  // Identity fields → students collection
  const [identity, setIdentity] = useState(EMPTY_IDENTITY);

  // Enrollment fields → studentEnrollments (create mode only)
  // These are passed into createStudent() which handles enrollment internally
  const [enrollment, setEnrollment] = useState(EMPTY_ENROLLMENT);

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      const [clsData, appSettings, familyData] = await Promise.all([
        getClasses(),
        getSettings(),
        getFamilies(),
      ]);

      const raw = Array.isArray(clsData) ? clsData : (clsData?.data ?? clsData?.classes ?? []);
      setClasses(sortClasses(raw));
      setFamilies(familyData || []);

      const session = appSettings?.academicYear || "";
      const term = appSettings?.currentTerm || "1st Term";
      const abbr = appSettings?.abbr || "SCH";
      const state = appSettings?.state || "NG";

      setSchoolAbbr(abbr);
      setSchoolState(state);

      if (isEditMode) {
        setSelectedFamilyId(initialData.familyId || "");
        setIdentity({
          firstName: initialData.firstName || "",
          otherName: initialData.otherName || "",
          lastName: initialData.lastName || "",
          admissionNo: initialData.admissionNo || generateAdmissionNo(abbr, state),
        });

        // Fetch current active enrollment to show read-only
        try {
          const enr = await getCurrentEnrollment(initialData.id);
          setCurrentEnrollment(enr);
        } catch {
          setCurrentEnrollment(null);
        }
        return;
      }

      // CREATE MODE — pre-fill session/term from settings
      setEnrollment({ classId: "", session, term });
      setIdentity((prev) => ({
        ...prev,
        admissionNo: generateAdmissionNo(abbr, state),
      }));

      // Pre-fill surname when opened from a family page
      if (familyId) {
        const family =
          (familyData || []).find((f) => f.id === familyId) || (await getFamilyById(familyId));
        setSelectedFamilyId(familyId);
        setIdentity((prev) => ({ ...prev, lastName: family?.familyName || "" }));
      }
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId, initialData]);

  // ── Regenerate admission number ───────────────────────────────────────────
  const regenerate = useCallback(() => {
    setIdentity((prev) => ({
      ...prev,
      admissionNo: generateAdmissionNo(schoolAbbr, schoolState),
    }));
  }, [schoolAbbr, schoolState]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleIdentityChange = (e) => {
    const { name, value } = e.target;
    setIdentity((prev) => ({ ...prev, [name]: value }));
  };

  const handleEnrollmentChange = (e) => {
    const { name, value } = e.target;
    setEnrollment((prev) => ({ ...prev, [name]: value }));
  };

  const handleSurnameSelect = (e) => {
    const nextFamilyId = e.target.value;
    const family = families.find((f) => f.id === nextFamilyId);
    setSelectedFamilyId(nextFamilyId);
    setIdentity((prev) => ({ ...prev, lastName: family?.familyName || "" }));
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const effectiveFamilyId = familyId || selectedFamilyId;

      if (isEditMode) {
        // EDIT: identity only — enrollment unchanged
        await updateStudent(initialData.id, {
          ...identity,
          familyId: effectiveFamilyId,
        });
      } else {
        // CREATE: pass identity + enrollment fields together.
        // createStudent() strips enrollment fields from the student doc
        // and calls enrollStudent() internally via autoEnroll: true.
        await createStudent(
          {
            ...identity,
            familyId: effectiveFamilyId,
            // Enrollment fields — picked up by createStudent, not saved on student doc
            classId: enrollment.classId,
            session: enrollment.session,
            term: enrollment.term,
          },
          { autoEnroll: true },
        );

        // Reset for next entry (keep session/term context)
        setIdentity({
          firstName: "",
          otherName: "",
          lastName: familyId ? families.find((f) => f.id === familyId)?.familyName || "" : "",
          admissionNo: generateAdmissionNo(schoolAbbr, schoolState),
        });
        setEnrollment((prev) => ({ classId: "", session: prev.session, term: prev.term }));
        if (!familyId) setSelectedFamilyId("");
        setAdmLocked(true);
      }

      onSuccess?.();
    } catch (err) {
      console.error("Error saving student:", err);
      alert(isEditMode ? "Failed to update student." : `Failed to add student: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Class options ─────────────────────────────────────────────────────────
  const classOptions = classes.map((cls) => ({ value: cls.id, label: cls.name }));

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form className='modern-form' onSubmit={handleSubmit}>
      {/* ── Student Identity ── */}
      <div className='form-section-label'>Student Details</div>
      <div className='form-grid'>
        <CustomInput
          name='firstName'
          value={identity.firstName}
          placeholder='First Name'
          onChange={handleIdentityChange}
          labelName='First Name'
          icon={<HiUser />}
          required
          autoComplete='off'
        />

        <CustomInput
          name='otherName'
          value={identity.otherName}
          placeholder='Middle / Other Name'
          onChange={handleIdentityChange}
          labelName='Other Name (optional)'
          icon={<HiUser />}
          autoComplete='off'
        />

        {/* Surname — locked when opened from FamilyDetails */}
        {familyId ? (
          <div className='input-group'>
            <label>Surname</label>
            <div className='input-wrapper'>
              <HiUser className='input-icon' />
              <input
                name='lastName'
                placeholder='Surname'
                value={identity.lastName}
                readOnly
                required
                title='Surname is auto-filled from selected family'
              />
            </div>
          </div>
        ) : (
          <CustomSelect
            name='familyId'
            labelName='Surname'
            icon={<HiUser />}
            placeholder='Select Surname (Family)'
            value={selectedFamilyId}
            onChange={handleSurnameSelect}
            required
            options={families.map((f) => ({ label: f.familyName, value: f.id }))}
          />
        )}

        {/* Admission Number */}
        <CustomInput
          name='admissionNo'
          value={identity.admissionNo}
          onChange={handleIdentityChange}
          labelName='Admission Number'
          icon={<HiIdentification />}
          required
          disabled={admLocked}
          hint={
            <>
              <CustomButton
                type='button'
                variant='ghost'
                otherClass='inline-btn'
                icon={<HiRefresh />}
                onClick={regenerate}
              >
                Regenerate
              </CustomButton>
              {" • "}
              <CustomButton
                type='button'
                variant='ghost'
                otherClass='inline-btn'
                icon={admLocked ? <HiLockClosed /> : <HiLockOpen />}
                onClick={() => setAdmLocked((l) => !l)}
              >
                {admLocked ? "Edit manually" : "Use auto"}
              </CustomButton>
            </>
          }
        />
      </div>

      {/* ── Enrollment (create mode only) ── */}
      {!isEditMode && (
        <>
          <div className='form-section-label' style={{ marginTop: "1.25rem" }}>
            Enrollment
          </div>
          <div className='form-grid'>
            <CustomSelect
              name='classId'
              labelName='Class'
              icon={<HiAcademicCap />}
              value={enrollment.classId}
              onChange={handleEnrollmentChange}
              required
              placeholder='Select Class'
              options={classOptions}
            />

            <div className='input-group'>
              <label>Academic Session</label>
              <div className='input-wrapper'>
                <HiCalendar className='input-icon' />
                <input
                  name='session'
                  value={enrollment.session}
                  onChange={handleEnrollmentChange}
                  placeholder='e.g. 2024/2025'
                  required
                />
              </div>
            </div>

            <div className='input-group'>
              <label>Term</label>
              <div className='input-wrapper'>
                <HiClock className='input-icon' />
                <select
                  name='term'
                  value={enrollment.term}
                  onChange={handleEnrollmentChange}
                  required
                >
                  <option value=''>Select term</option>
                  {TERMS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Current Enrollment (edit mode, read-only) ── */}
      {isEditMode && (
        <>
          <div className='form-section-label' style={{ marginTop: "1.25rem" }}>
            Current Enrollment
          </div>
          <div className='form-grid'>
            <div className='input-group'>
              <label>Class</label>
              <div className='input-wrapper input-disabled'>
                <HiAcademicCap className='input-icon' />
                <input
                  readOnly
                  value={
                    classes.find((c) => c.id === currentEnrollment?.classId)?.name || "Not enrolled"
                  }
                />
              </div>
              <div className='hint'>To change class, use the Promote flow</div>
            </div>

            <div className='input-group'>
              <label>Session</label>
              <div className='input-wrapper input-disabled'>
                <HiCalendar className='input-icon' />
                <input readOnly value={currentEnrollment?.session || "—"} />
              </div>
            </div>

            <div className='input-group'>
              <label>Term</label>
              <div className='input-wrapper input-disabled'>
                <HiClock className='input-icon' />
                <input readOnly value={currentEnrollment?.term || "—"} />
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── Actions ── */}
      <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
        <CustomButton
          type='submit'
          loading={isSubmitting}
          loadingText='Saving...'
          icon={<HiAcademicCap />}
          otherClass='submit-btn'
        >
          {isEditMode ? "Update Student" : "Add Student"}
        </CustomButton>

        {onCancel && (
          <CustomButton type='button' variant='cancel' onClick={onCancel}>
            Cancel
          </CustomButton>
        )}
      </div>
    </form>
  );
}
