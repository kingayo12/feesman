import { useState } from "react";
import { createClass } from "../../pages/classes/classService";
import { HiPresentationChartBar, HiCollection, HiCalendar, HiPlus } from "react-icons/hi";
import CustomInput from "../common/Input";
import CustomSelect from "../common/SelectInput";
import CustomButton from "../common/CustomButton";

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
    <div>
      <div className='form-header'>
        <p>Define a class, academic session and current term.</p>
      </div>

      <form className='modern-form' onSubmit={handleSubmit}>
        <div className='form-grid'>
          <CustomInput
            name='name'
            value={form.name}
            placeholder='e.g. Primary 3A'
            onChange={handleChange}
            labelName='Class Name'
            icon=<HiPresentationChartBar />
            variant='default'
            required={true}
          />

          <CustomInput
            name='name'
            value={form.section || "Auto-detected"}
            placeholder='e.g. Primary 3A'
            onChange={handleChange}
            labelName='Academic Section'
            icon=<HiCollection />
            variant='default'
            required={true}
            disabled={true}
            hint='Detected from class name'
          />

          <CustomSelect
            name='session'
            value={form.session}
            onChange={handleChange}
            options={generateSessions()}
            icon=<HiCalendar />
            labelName='Academic Year'
            placeholder=' Select Year'
            variant='default'
            required={true}
          />

          <CustomSelect
            name='term'
            value={form.term}
            onChange={handleChange}
            options={["1st Term", "2nd Term", "3rd Term"]}
            icon=<HiCalendar />
            labelName='Current Term'
            placeholder=' Select Year'
            variant='default'
            required={true}
          />
        </div>

        <CustomButton
          type='submit'
          variant='primary'
          otherClass='submit-btn'
          loading={isSubmitting}
          icon={<HiPlus />}
        >
          Create Class Record
        </CustomButton>
        {/* <button type='submit' className='submit-btn' disabled={isSubmitting}>
          {isSubmitting ? (
            "Processing..."
          ) : (
            <>
              <HiPlus /> Create Class Record
            </>
          )}
        </button> */}
      </form>
    </div>
  );
}
