import { useState } from "react";
import { createClass } from "../../pages/classes/classService";
import { HiPresentationChartBar, HiCollection, HiCalendar, HiPlus } from "react-icons/hi";

export default function ClassForm({ onSuccess }) {
  const [form, setForm] = useState({
    name: "",
    section: "",
    session: "",
    term: "1st Term", // ✅ FIXED: was "Second Term" — now matches settings/payments convention
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const detectSection = (className) => {
    const name = className.toLowerCase();
    if (name.includes("creche")) return "Creche";
    if (name.includes("kg")) return "Pre Nursery";
    if (name.includes("nursery")) return "Nursery";
    if (name.includes("primary")) return "Primary";
    if (name.includes("jss")) return "Junior Secondary";
    if (name.includes("ss")) return "Senior Secondary";
    return "";
  };

  const generateSessions = () => {
    const sessions = [];
    const startYear = new Date().getFullYear() - 5;
    const endYear = 2035;
    for (let year = startYear; year <= endYear; year++) {
      sessions.push(`${year}/${year + 1}`);
    }
    return sessions;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "name") {
      setForm((prev) => ({ ...prev, name: value, section: detectSection(value) }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createClass(form);
      setForm({ name: "", section: "", session: "", term: "1st Term" });
      onSuccess();
    } catch (error) {
      console.error("Error creating class:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='form-container'>
      <div className='form-header'>
        <h3>Add New Class</h3>
        <p>Define a class, academic session and current term.</p>
      </div>

      <form className='modern-form' onSubmit={handleSubmit}>
        <div className='form-grid'>
          <div className='input-group'>
            <label>Class Name</label>
            <div className='input-wrapper'>
              <HiPresentationChartBar className='input-icon' />
              <input
                name='name'
                placeholder='e.g. Primary 3A'
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className='input-group'>
            <label>Academic Section</label>
            <div className='input-wrapper'>
              <HiCollection className='input-icon' />
              <input value={form.section || "Auto-detected"} disabled className='disabled-input' />
            </div>
            <small className='hint'>Detected from class name</small>
          </div>

          <div className='input-group'>
            <label>Academic Year</label>
            <div className='input-wrapper'>
              <HiCalendar className='input-icon' />
              <select name='session' value={form.session} onChange={handleChange} required>
                <option value='' disabled>
                  Select Year
                </option>
                {generateSessions().map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* ✅ FIXED: options changed from "First Term" to "1st Term" etc. */}
          <div className='input-group'>
            <label>Current Term</label>
            <div className='input-wrapper'>
              <select name='term' value={form.term} onChange={handleChange} required>
                <option value='1st Term'>1st Term</option>
                <option value='2nd Term'>2nd Term</option>
                <option value='3rd Term'>3rd Term</option>
              </select>
            </div>
          </div>
        </div>

        <button type='submit' className='submit-btn' disabled={isSubmitting}>
          {isSubmitting ? (
            "Processing..."
          ) : (
            <>
              <HiPlus /> Create Class Record
            </>
          )}
        </button>
      </form>
    </div>
  );
}
