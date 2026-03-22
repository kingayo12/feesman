import { useEffect, useState } from "react";
import { createFamily, updateFamily } from "../../pages/families/familyService";
import { HiUserGroup, HiPhone, HiMail, HiLocationMarker, HiPlus, HiPencil } from "react-icons/hi";

const EMPTY_FORM = {
  familyName: "",
  phone: "",
  email: "",
  address: "",
};

export default function FamilyForm({ onSuccess, initialData, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync form with initialData when editing or clearing
  useEffect(() => {
    if (initialData) {
      setForm({
        familyName: initialData.familyName || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
      });
    } else {
      setForm(EMPTY_FORM); // Ensure form clears when initialData is null
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return; // Prevent double clicks

    setIsSubmitting(true);

    try {
      // Clean data before sending
      const submissionData = {
        ...form,
        familyName: form.familyName.trim(),
        email: form.email.trim().toLowerCase(),
      };

      if (initialData?.id) {
        await updateFamily(initialData.id, submissionData);
      } else {
        await createFamily(submissionData);
      }

      setForm(EMPTY_FORM);
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error("Family save failed:", error);
      alert("Failed to save family details. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='form-container'>
      <div className='form-header'>
        <h3>{initialData ? "Edit Family Profile" : "Register New Family"}</h3>
        <p>Fill in the details below to update the system records.</p>
      </div>

      <form className='modern-form' onSubmit={handleSubmit}>
        <div className='form-grid'>
          {/* Family Name */}
          <div className='input-group'>
            <label>Family Name</label>
            <div className='input-wrapper'>
              <HiUserGroup className='input-icon' />
              <input
                name='familyName'
                placeholder='e.g. Thompson Family'
                value={form.familyName}
                onChange={handleChange}
                required
                autoComplete='off'
              />
            </div>
          </div>

          {/* Phone */}
          <div className='input-group'>
            <label>Phone Number</label>
            <div className='input-wrapper'>
              <HiPhone className='input-icon' />
              <input
                type='tel'
                name='phone'
                placeholder='0800 000 0000'
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Email */}
          <div className='input-group'>
            <label>Email Address</label>
            <div className='input-wrapper'>
              <HiMail className='input-icon' />
              <input
                type='email'
                name='email'
                placeholder='family@example.com'
                value={form.email}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Address */}
          <div className='input-group'>
            <label>Residential Address</label>
            <div className='input-wrapper'>
              <HiLocationMarker className='input-icon' />
              <input
                name='address'
                placeholder='Street address, City'
                value={form.address}
                onChange={handleChange}
              />
            </div>
          </div>
        </div>

        <div className='form-actions'>
          <button
            type='submit'
            className={`submit-btn ${isSubmitting ? "loading" : ""}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              "Saving..."
            ) : initialData ? (
              <>
                <HiPencil /> Update Family
              </>
            ) : (
              <>
                <HiPlus /> Add Family Profile
              </>
            )}
          </button>

          {/* Show Cancel button if editing OR if form is partially filled */}
          {(initialData || form.familyName) && (
            <button
              type='button'
              className='cancel-btn'
              onClick={() => {
                setForm(EMPTY_FORM);
                if (onCancel) onCancel();
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
