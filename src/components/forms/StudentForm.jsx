import { EMPTY_ENROLLMENT, EMPTY_IDENTITY } from "@/fixtures/studentForm";
import { formatDateValue, generateAdmissionNo, sortClasses } from "@/utils/helpers";
import { useCallback, useEffect, useState } from "react";
import {
  HiAcademicCap,
  HiCalendar,
  HiClock,
  HiIdentification,
  HiLocationMarker,
  HiLockClosed,
  HiLockOpen,
  HiRefresh,
  HiUser,
} from "react-icons/hi";
import { TERMS } from "../../constants";
import { getClasses } from "../../services/class/classService";
import { getFamilies, getFamilyById } from "../../services/families/familyService";
import { getSettings } from "../../services/settings/settingService";
import { getCurrentEnrollment } from "../../services/students/enrollmentService";
import { createStudent, updateStudent } from "../../services/students/studentService";
import CustomButton from "../common/CustomButton";
import CustomInput from "../common/Input";
import CustomSelect from "../common/SelectInput";

export default function StudentForm({
  familyId,
  onSuccess,
  formId = "student-form",
  onSubmittingChange,
  initialData,
  onCancel,
}) {
  const isEditMode = Boolean(initialData?.id);
  const [classes, setClasses] = useState([]);
  const [families, setFamilies] = useState([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState(familyId || "");
  const [schoolAbbr, setSchoolAbbr] = useState("");
  const [schoolState, setSchoolState] = useState("");
  const [admLocked, setAdmLocked] = useState(true);
  const [currentEnrollment, setCurrentEnrollment] = useState(null);
  const [identity, setIdentity] = useState(EMPTY_IDENTITY);
  const [enrollment, setEnrollment] = useState(EMPTY_ENROLLMENT);
  const [isSubmitting, _setIsSubmitting] = useState(false);

  const setIsSubmitting = (val) => {
    _setIsSubmitting(val);
    onSubmittingChange?.(val);
  };

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
          gender: initialData.gender || "",
          dateOfBirth: formatDateValue(initialData.dateOfBirth),
          religion: initialData.religion || "",
          stateOfOrigin: initialData.stateOfOrigin || "",
          bloodGroup: initialData.bloodGroup || "",
          notes: initialData.notes || "",
        });

        try {
          const enr = await getCurrentEnrollment(initialData.id);
          setCurrentEnrollment(enr);
        } catch {
          setCurrentEnrollment(null);
        }
        return;
      }

      setEnrollment({ classId: "", session, term });
      setIdentity((prev) => ({
        ...prev,
        admissionNo: generateAdmissionNo(abbr, state),
        gender: "",
        dateOfBirth: "",
        religion: "",
        stateOfOrigin: "",
        bloodGroup: "",
        notes: "",
      }));

      if (familyId) {
        const family =
          (familyData || []).find((f) => f.id === familyId) || (await getFamilyById(familyId));
        setSelectedFamilyId(familyId);
        setIdentity((prev) => ({ ...prev, lastName: family?.familyName || "" }));
      }
    }

    load();
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

  const classOptions = classes.map((cls) => ({ value: cls.id, label: cls.name }));

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
        const identityPayload = { ...identity };
        if (identityPayload.dateOfBirth) {
          identityPayload.dateOfBirth = new Date(identityPayload.dateOfBirth);
        }
        await updateStudent(initialData.id, {
          ...identityPayload,
          familyId: effectiveFamilyId,
        });
      } else {
        const identityPayload = { ...identity };
        if (identityPayload.dateOfBirth) {
          identityPayload.dateOfBirth = new Date(identityPayload.dateOfBirth);
        }
        await createStudent(
          {
            ...identityPayload,
            familyId: effectiveFamilyId,
            classId: enrollment.classId,
            session: enrollment.session,
            term: enrollment.term,
          },
          { autoEnroll: true },
        );
        setIdentity({
          firstName: "",
          otherName: "",
          lastName: familyId ? families.find((f) => f.id === familyId)?.familyName || "" : "",
          admissionNo: generateAdmissionNo(schoolAbbr, schoolState),
          gender: "",
          dateOfBirth: "",
          religion: "",
          stateOfOrigin: "",
          bloodGroup: "",
          notes: "",
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <form id={formId} className='modern-form' onSubmit={handleSubmit}>
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

        <CustomSelect
          name='gender'
          labelName='Gender'
          icon={<HiUser />}
          value={identity.gender}
          onChange={handleIdentityChange}
          required={!isEditMode}
          placeholder='Select gender'
          options={[
            { value: "Male", label: "Male" },
            { value: "Female", label: "Female" },
            { value: "Other", label: "Other" },
          ]}
        />

        <CustomInput
          name='dateOfBirth'
          type='date'
          value={identity.dateOfBirth}
          onChange={handleIdentityChange}
          labelName='Date of Birth'
          icon={<HiCalendar />}
          required={!isEditMode}
        />

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

        <CustomInput
          name='religion'
          value={identity.religion}
          onChange={handleIdentityChange}
          labelName='Religion'
          icon={<HiUser />}
          placeholder='e.g. Christianity'
          autoComplete='off'
        />

        <CustomInput
          name='stateOfOrigin'
          value={identity.stateOfOrigin}
          onChange={handleIdentityChange}
          labelName='State of Origin'
          icon={<HiLocationMarker />}
          placeholder='e.g. Lagos'
          autoComplete='off'
        />

        <CustomInput
          name='bloodGroup'
          value={identity.bloodGroup}
          onChange={handleIdentityChange}
          labelName='Blood Group'
          icon={<HiIdentification />}
          placeholder='e.g. A+, O-'
          autoComplete='off'
        />

        <CustomInput
          name='notes'
          value={identity.notes}
          onChange={handleIdentityChange}
          labelName='Additional Notes'
          icon={<HiClock />}
          placeholder='Optional medical or admission notes'
          autoComplete='off'
        />
      </div>

      {/* ── Enrollment (create mode only) ── */}
      {!isEditMode && (
        <>
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
    </form>
  );
}
