import { useState, useEffect, useCallback } from "react";
import { createStudent } from "../../pages/students/studentService";
import { getClasses } from "../../pages/classes/classService";
import { getSettings } from "../../pages/settings/settingService";
import {
  HiUser,
  HiIdentification,
  HiAcademicCap,
  HiCalendar,
  HiRefresh,
  HiLockClosed,
  HiLockOpen,
} from "react-icons/hi";

// ── Admission number generator ────────────────────────────────────────────
// Format: ABBR/ST/YYYY/MMDD/RR
// Example: GCI/OY/2025/0115/47
//   ABBR  = school abbreviation (up to 4 chars), e.g. GCI
//   ST    = first 2–3 letters of state uppercased, e.g. OY (Oyo)
//   YYYY  = current 4-digit year
//   MMDD  = month + day (zero-padded), e.g. 0115 for Jan 15
//   RR    = 2-digit random suffix for uniqueness within the same day
function generateAdmissionNo(abbr = "SCH", state = "NG") {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 90) + 10); // 10-99

  const abbrPart = (abbr || "SCH").toUpperCase().slice(0, 4).replace(/\s/g, "");
  const statePart = (state || "NG").toUpperCase().slice(0, 3).replace(/\s/g, "");

  return `${abbrPart}/${statePart}/${year}/${month}${day}/${rand}`;
}

export default function StudentForm({ familyId, onSuccess }) {
  const [classes, setClasses] = useState([]);
  const [currentSession, setCurrentSession] = useState("");
  const [schoolAbbr, setSchoolAbbr] = useState("");
  const [schoolState, setSchoolState] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admLocked, setAdmLocked] = useState(true); // true = auto, false = manual override

  const [form, setForm] = useState({
    firstName: "",
    otherName: "",
    lastName: "",
    admissionNo: "",
    classId: "",
    session: "",
  });

  // Generate a fresh number using current settings
  const regenerate = useCallback(
    (abbr, state) => {
      setForm((prev) => ({
        ...prev,
        admissionNo: generateAdmissionNo(abbr || schoolAbbr, state || schoolState),
      }));
    },
    [schoolAbbr, schoolState],
  );

  useEffect(() => {
    async function loadInitialData() {
      const [clsData, appSettings] = await Promise.all([getClasses(), getSettings()]);

      setClasses(clsData || []);

      const session = appSettings?.academicYear || "";
      const abbr = appSettings?.abbr || "SCH";
      const state = appSettings?.state || "NG";

      setCurrentSession(session);
      setSchoolAbbr(abbr);
      setSchoolState(state);

      // Auto-generate on mount
      setForm((prev) => ({
        ...prev,
        session,
        admissionNo: generateAdmissionNo(abbr, state),
      }));
    }
    loadInitialData();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createStudent({ ...form, familyId });
      // Reset form but generate a new admission number
      const newAdm = generateAdmissionNo(schoolAbbr, schoolState);
      setForm({
        firstName: "",
        otherName: "",
        lastName: "",
        admissionNo: newAdm,
        classId: "",
        session: currentSession,
      });
      setAdmLocked(true);
      onSuccess();
    } catch (error) {
      console.error("Error creating student:", error);
      alert("Failed to add student. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className='modern-form' onSubmit={handleSubmit}>
      <div className='form-grid'>
        {/* First Name */}
        <div className='input-group'>
          <label>First Name</label>
          <div className='input-wrapper'>
            <HiUser className='input-icon' />
            <input
              name='firstName'
              placeholder='First Name'
              value={form.firstName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Other Name */}
        <div className='input-group'>
          <label>
            Other Name <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span>
          </label>
          <div className='input-wrapper'>
            <HiUser className='input-icon' />
            <input
              name='otherName'
              placeholder='Middle / Other Name'
              value={form.otherName}
              onChange={handleChange}
            />
          </div>
        </div>

        {/* Last Name */}
        <div className='input-group'>
          <label>Last Name</label>
          <div className='input-wrapper'>
            <HiUser className='input-icon' />
            <input
              name='lastName'
              placeholder='Last Name'
              value={form.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Admission Number — auto-generated, with regenerate + manual override */}
        <div className='input-group'>
          <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span>Admission Number</span>
            <span style={{ fontSize: 10, color: "var(--color-text-tertiary)", fontWeight: 400 }}>
              auto-generated
            </span>
          </label>
          <div className='input-wrapper' style={{ position: "relative" }}>
            <HiIdentification className='input-icon' />
            <input
              name='admissionNo'
              value={form.admissionNo}
              onChange={handleChange}
              required
              readOnly={admLocked}
              style={{
                paddingRight: 76,
                background: admLocked ? "var(--color-background-secondary, #f8fafc)" : undefined,
                fontFamily: "monospace",
                letterSpacing: "0.04em",
                fontSize: 13,
              }}
            />
            {/* Regenerate button */}
            <button
              type='button'
              title='Generate new number'
              onClick={() => regenerate()}
              style={{
                position: "absolute",
                right: 36,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "#4f46e5",
                padding: "4px",
                display: "flex",
                alignItems: "center",
              }}
            >
              <HiRefresh style={{ width: 15, height: 15 }} />
            </button>
            {/* Lock / unlock manual edit */}
            <button
              type='button'
              title={admLocked ? "Click to edit manually" : "Lock to auto-mode"}
              onClick={() => setAdmLocked((l) => !l)}
              style={{
                position: "absolute",
                right: 8,
                top: "50%",
                transform: "translateY(-50%)",
                background: "none",
                border: "none",
                cursor: "pointer",
                color: admLocked ? "#94a3b8" : "#4f46e5",
                padding: "4px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {admLocked ? (
                <HiLockClosed style={{ width: 14, height: 14 }} />
              ) : (
                <HiLockOpen style={{ width: 14, height: 14 }} />
              )}
            </button>
          </div>
          <small className='hint'>
            Format:{" "}
            <code style={{ fontSize: 11 }}>
              {schoolAbbr || "SCH"}/{(schoolState || "NG").slice(0, 3).toUpperCase()}/YYYY/MMDD/RR
            </code>
            {" · "}
            <button
              type='button'
              style={{
                fontSize: 11,
                color: "#4f46e5",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              onClick={() => regenerate()}
            >
              Regenerate
            </button>
            {" · "}
            <button
              type='button'
              style={{
                fontSize: 11,
                color: "#64748b",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
              onClick={() => setAdmLocked((l) => !l)}
            >
              {admLocked ? "Edit manually" : "Use auto"}
            </button>
          </small>
        </div>

        {/* Session — read-only */}
        <div className='input-group'>
          <label>Academic Session</label>
          <div className='input-wrapper'>
            <HiCalendar className='input-icon' />
            <input
              value={currentSession || "Loading..."}
              readOnly
              className='disabled-input'
              title='Session is set from School Settings'
            />
          </div>
          <small className='hint'>Pulled from school settings</small>
        </div>

        {/* Class */}
        <div className='input-group'>
          <label>Class</label>
          <div className='input-wrapper'>
            <HiAcademicCap className='input-icon' />
            <select name='classId' value={form.classId} onChange={handleChange} required>
              <option value=''>Select Class</option>
              {classes.map((cls) => (
                <option key={cls.id} value={cls.id}>
                  {cls.name} ({cls.session})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <button className='submit-btn' type='submit' disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Add Student"}
      </button>
    </form>
  );
}
