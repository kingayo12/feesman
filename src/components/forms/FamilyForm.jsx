import { useEffect, useState } from "react";
import { createFamily, updateFamily } from "../../pages/families/familyService";
import { HiUserGroup, HiPhone, HiMail, HiLocationMarker, HiPlus, HiPencil } from "react-icons/hi";
import CustomInput from "../common/Input";
import CustomButton from "../common/CustomButton";
import useToast from "../../hooks/UseToast";

const EMPTY_FORM = {
  familyName: "",
  phone: "",
  email: "",
  address: "",
};

export default function FamilyForm({ onSuccess, initialData, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({}); // ✅ THIS WAS MISSING
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (initialData) {
      setForm({
        familyName: initialData.familyName || "",
        phone: initialData.phone || "",
        email: initialData.email || "",
        address: initialData.address || "",
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors = {};

    if (!form.familyName.trim()) {
      newErrors.familyName = "Family name is required";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10,15}$/.test(form.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Invalid phone number";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^\S+@\S+\.\S+$/.test(form.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!form.address.trim()) {
      newErrors.address = "Address is required";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    const isValid = validate();
    if (!isValid) return;

    setIsSubmitting(true);

    try {
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
      setErrors({});
      onSuccess?.();
    } catch (error) {
      console.error("Family save failed:", error);
      alert("Failed to save family details. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className=''>
      <ToastComponent />
      <div className='form-header'>
        {/* <h3>{initialData ? "Edit Family Profile" : "Register New Family"}</h3> */}
        <p>Fill in the details below to update the system records.</p>
      </div>

      <form className='modern-form' onSubmit={handleSubmit}>
        <div className='form-grid'>
          <CustomInput
            name='familyName'
            value={form.familyName}
            placeholder='e.g. Adewumi Family'
            onChange={handleChange}
            labelName='Family Name'
            icon={<HiUserGroup />}
            variant='default'
            required={true}
            autoComplete='off'
            error={errors.familyName} // ✅ Wire up error display
          />

          <CustomInput
            name='phone'
            value={form.phone}
            placeholder='e.g. 0800 000 0000'
            onChange={handleChange}
            labelName='Phone Number'
            icon={<HiPhone />}
            variant='default'
            required={true}
            autoComplete='off'
            error={errors.phone} // ✅ Wire up error display
          />

          <CustomInput
            name='email'
            value={form.email}
            placeholder='family@example.com'
            onChange={handleChange}
            labelName='Email Address'
            icon={<HiMail />}
            variant='default'
            required={true}
            autoComplete='off'
            error={errors.email} // ✅ Wire up error display
          />

          <CustomInput
            name='address'
            value={form.address}
            placeholder='Street address, City'
            onChange={handleChange}
            labelName='Residential Address'
            icon={<HiLocationMarker />}
            variant='default'
            required={true}
            autoComplete='off'
            error={errors.address} // ✅ Wire up error display
          />
        </div>

        <div className='form-actions'>
          <CustomButton
            type='submit'
            loading={isSubmitting}
            loadingText='Saving...'
            otherClass='submit-btn'
            icon={initialData ? <HiPencil /> : <HiPlus />}
          >
            {initialData ? "Update Family" : "Add Family Profile"}
          </CustomButton>

          {(initialData || form.familyName) && (
            <CustomButton
              type='button'
              variant='cancel'
              onClick={() => {
                setForm(EMPTY_FORM);
                setErrors({});
                if (onCancel) onCancel();
              }}
            >
              Cancel
            </CustomButton>
          )}
        </div>
      </form>
    </div>
  );
}
