import { useState, useEffect, useCallback } from "react";
import { createStudent, updateStudent } from "../../pages/students/studentService";
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
} from "react-icons/hi";
import CustomInput from "../common/Input";
import CustomButton from "../common/CustomButton";
import CustomSelect from "../common/SelectInput";
import useToast from "../../hooks/UseToast";

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

export default function StudentForm({ familyId, onSuccess, initialData, onCancel }) {
  const [classes, setClasses] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(familyId || "");
  const [currentSession, setCurrentSession] = useState("");
  const [schoolAbbr, setSchoolAbbr] = useState("");
  const [schoolState, setSchoolState] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [admLocked, setAdmLocked] = useState(true);

  const [form, setForm] = useState({
    firstName: "",
    otherName: "",
    lastName: "",
    admissionNo: "",
    classId: "",
    session: "",
  });

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
      const [clsData, appSettings, familyData] = await Promise.all([
        getClasses(),
        getSettings(),
        getFamilies(),
      ]);

      setClasses(clsData || []);
      setFamilies(familyData || []);

      const session = appSettings?.academicYear || "";
      const abbr = appSettings?.abbr || "SCH";
      const state = appSettings?.state || "NG";

      setCurrentSession(session);
      setSchoolAbbr(abbr);
      setSchoolState(state);

      // ✅ EDIT MODE
      if (initialData) {
        setSelectedFamilyId(initialData.familyId || "");

        setForm({
          firstName: initialData.firstName || "",
          otherName: initialData.otherName || "",
          lastName: initialData.lastName || "",
          admissionNo: initialData.admissionNo || generateAdmissionNo(abbr, state),
          classId: initialData.classId || "",
          session: initialData.session || session,
        });

        return;
      }

      // ✅ CREATE MODE
      setForm((prev) => ({
        ...prev,
        session,
        admissionNo: generateAdmissionNo(abbr, state),
      }));

      // If opened inside family details page
      if (familyId) {
        const family =
          (familyData || []).find((f) => f.id === familyId) || (await getFamilyById(familyId));

        const familyName = family?.familyName || "";

        setSelectedFamilyId(familyId);

        setForm((prev) => ({
          ...prev,
          lastName: familyName,
        }));
      }
    }

    loadInitialData();
  }, [familyId, initialData]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSurnameSelect = (e) => {
    const nextFamilyId = e.target.value;
    const family = families.find((f) => f.id === nextFamilyId);

    setSelectedFamilyId(nextFamilyId);

    setForm((prev) => ({
      ...prev,
      lastName: family?.familyName || "",
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const effectiveFamilyId = familyId || selectedFamilyId;

      const payload = {
        ...form,
        familyId: effectiveFamilyId,
      };

      // ✅ UPDATE
      if (initialData?.id) {
        await updateStudent(initialData.id, payload);
      }
      // ✅ CREATE
      else {
        await createStudent(payload);
      }

      // Reset only when creating
      if (!initialData) {
        const newAdm = generateAdmissionNo(schoolAbbr, schoolState);

        setForm({
          firstName: "",
          otherName: "",
          lastName:
            familyId || selectedFamilyId
              ? families.find((f) => f.id === (familyId || selectedFamilyId))?.familyName ||
                form.lastName
              : "",
          admissionNo: newAdm,
          classId: "",
          session: currentSession,
        });

        if (!familyId) {
          setSelectedFamilyId("");
        }

        setAdmLocked(true);
      }

      onSuccess?.();
    } catch (error) {
      console.error("Error saving student:", error);
      alert(initialData ? "Failed to update student." : "Failed to add student.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className='modern-form' onSubmit={handleSubmit}>
      <div className='form-grid'>
        {/* First Name */}

        <CustomInput
          name='firstName'
          value={form.firstName}
          placeholder='First Name'
          onChange={handleChange}
          labelName='First Name'
          icon={<HiUser />}
          variant='default'
          required={true}
          autoComplete='off'
          // error={errors.firstName}
        />

        <CustomInput
          name='otherName'
          value={form.otherName}
          placeholder='Middle / Other Name'
          onChange={handleChange}
          labelName='Other Name (optional)'
          icon={<HiUser />}
          variant='default'
          required={false}
          autoComplete='off'
          // error={errors.otherName}
        />

        {/* Other Name */}
        {/* <div className='input-group'>
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
        </div> */}

        {familyId ? (
          <div className='input-wrapper'>
            <HiUser className='input-icon' />
            <input
              name='lastName'
              placeholder='Surname'
              value={form.lastName}
              readOnly
              required
              title='Surname is auto-filled from selected family'
            />
          </div>
        ) : (
          <CustomSelect
            name='familyId'
            labelName='Surname'
            icon={<HiUser />}
            placeholder='Select Surname (Family)'
            value={selectedFamilyId}
            onChange={handleSurnameSelect}
            required={true}
            options={families.map((family) => ({
              label: family.familyName,
              value: family.id,
            }))}
          />
        )}

        {/* Admission Number — auto-generated, with regenerate + manual override */}
        <CustomInput
          name='admissionNo'
          value={form.admissionNo}
          onChange={handleChange}
          labelName='Admission Number'
          icon={<HiIdentification />}
          required={true}
          disabled={false}
          hint={
            <>
              <CustomButton
                type='button'
                variant='ghost'
                otherClass='inline-btn'
                icon={<HiRefresh />}
                onClick={() => regenerate()}
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

        {/* Session — read-only */}
        {/* Academic Session */}
        <CustomInput
          name='session'
          value={currentSession || "Loading..."}
          labelName='Academic Session'
          icon={<HiCalendar />}
          disabled={true}
          hint='Pulled from school settings'
        />

        {/* Class */}
        <CustomSelect
          name='classId'
          labelName='Class'
          icon={<HiAcademicCap />}
          value={form.classId}
          onChange={handleChange}
          required={true}
          placeholder='Select Class'
          options={classes.map((cls) => ({
            label: `${cls.name} (${cls.session})`,
            value: cls.id,
          }))}
        />
      </div>

      <CustomButton
        type='submit'
        loading={isSubmitting}
        loadingText='Saving...'
        icon={<HiAcademicCap />}
        otherClass='submit-btn'
      >
        {initialData ? "Update Student" : "Add Student"}
      </CustomButton>
    </form>
  );
}
