import { useState, useEffect } from "react";
import { createStudent } from "../../pages/students/studentService";
import { getClasses } from "../../pages/classes/classService";
import { getSettings } from "../../pages/settings/settingService";
import { HiUser, HiIdentification, HiAcademicCap, HiCalendar } from "react-icons/hi";

export default function StudentForm({ familyId, onSuccess }) {
  const [classes, setClasses] = useState([]);
  const [currentSession, setCurrentSession] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    otherName: "",
    lastName: "",
    admissionNo: "",
    classId: "",
    session: "",
  });

  useEffect(() => {
    async function loadInitialData() {
      const [clsData, appSettings] = await Promise.all([getClasses(), getSettings()]);

      setClasses(clsData || []);

      // ✅ FIXED: auto-populate session from settings.academicYear
      // Previously the form had a free-text input, which meant students could be
      // created with a session that didn't match the active academic year.
      const session = appSettings?.academicYear || "";
      setCurrentSession(session);
      setForm((prev) => ({ ...prev, session }));
    }

    loadInitialData();
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      await createStudent({ ...form, familyId });

      setForm({
        firstName: "",
        otherName: "",
        lastName: "",
        admissionNo: "",
        classId: "",
        session: currentSession, // reset to current session, not blank
      });

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

        {/* Admission Number */}
        <div className='input-group'>
          <label>Admission No</label>
          <div className='input-wrapper'>
            <HiIdentification className='input-icon' />
            <input
              name='admissionNo'
              placeholder='e.g. SCH/2024/001'
              value={form.admissionNo}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        {/* Session — read-only, pulled from settings */}
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
