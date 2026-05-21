import { useEffect, useState } from "react";
import { HiLocationMarker, HiMail, HiPhone, HiUser, HiUserGroup } from "react-icons/hi";
import useToast from "../../hooks/UseToast";
import { createFamily, updateFamily } from "../../services/families/familyService";
import CustomInput from "../common/Input";

const EMPTY_FORM = {
  familyName: "",
  parentName: "",
  phone: "",
  altPhone: "",
  email: "",
  address: "",
};

export default function FamilyForm({
  onSuccess,
  initialData,
  onCancel,
  formId = "family-form",
  onSubmittingChange,
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showToast, ToastComponent } = useToast();

  useEffect(() => {
    if (initialData) {
      setForm({
        familyName: initialData.familyName || "",
        parentName: initialData.parentName || initialData.headName || "",
        phone: initialData.phone || "",
        altPhone: initialData.altPhone || "",
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

    if (!form.parentName.trim()) {
      newErrors.parentName = "Parent/Guardian name is required";
    }

    if (!form.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!/^\d{10,15}$/.test(form.phone.replace(/\s/g, ""))) {
      newErrors.phone = "Invalid phone number";
    }

    if (form.altPhone.trim() && !/^\d{10,15}$/.test(form.altPhone.replace(/\s/g, ""))) {
      newErrors.altPhone = "Invalid alternate phone number";
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
    onSubmittingChange?.(true);

    try {
      const submissionData = {
        ...form,
        familyName: form.familyName.trim(),
        parentName: form.parentName.trim(),
        altPhone: form.altPhone.trim(),
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
      onSubmittingChange?.(false);
    }
  };

  return (
    <>
      <ToastComponent />
      <form id={formId} className='modern-form' onSubmit={handleSubmit}>
        <div className='form-grid'>
          <CustomInput
            name='familyName'
            value={form.familyName}
            placeholder='e.g. Adewumi Family'
            onChange={handleChange}
            labelName='Family Name'
            icon={<HiUserGroup />}
            required
            autoComplete='off'
            error={errors.familyName}
          />

          <CustomInput
            name='parentName'
            value={form.parentName}
            placeholder='e.g. Mr. Olalekan Adewumi'
            onChange={handleChange}
            labelName='Parent / Guardian Name'
            icon={<HiUser />}
            required
            autoComplete='off'
            error={errors.parentName}
          />

          <CustomInput
            name='phone'
            value={form.phone}
            placeholder='e.g. 0800 000 0000'
            onChange={handleChange}
            labelName='Primary Phone Number'
            icon={<HiPhone />}
            required
            autoComplete='off'
            error={errors.phone}
          />

          <CustomInput
            name='altPhone'
            value={form.altPhone}
            placeholder='e.g. 0800 000 0001'
            onChange={handleChange}
            labelName='Alternate Phone'
            icon={<HiPhone />}
            autoComplete='off'
            error={errors.altPhone}
          />

          <CustomInput
            name='email'
            type='email'
            value={form.email}
            placeholder='e.g. family@example.com'
            onChange={handleChange}
            labelName='Email Address'
            icon={<HiMail />}
            required
            autoComplete='off'
            error={errors.email}
          />

          <CustomInput
            name='address'
            value={form.address}
            placeholder='Street address, City'
            onChange={handleChange}
            labelName='Residential Address'
            icon={<HiLocationMarker />}
            required
            autoComplete='off'
            error={errors.address}
          />
        </div>
      </form>
    </>
  );
}
