import CustomInput from "@/components/common/Input";
import { FormModal } from "@/components/common/Modal";
import CustomSelect from "@/components/common/SelectInput";
import { Bone } from "@/components/common/Skeleton";
import { fmt } from "@/constants";
import { HiExclamationCircle, HiOutlinePencil } from "react-icons/hi";

export default function AssignItemModal({
  assignModal,
  students,
  loadingStudents,
  assignForm,
  assignSaving,
  assignError,
  closeAssign,
  setAssignForm,
  handleAssignSubmit,
}) {
  if (!assignModal) return null;

  return (
    <FormModal
      title={`Assign: ${assignModal.item.name}`}
      subtitle={`${fmt(assignModal.item.price)} per ${assignModal.item.unit} · Payment is recorded from the student's profile.`}
      onClose={closeAssign}
      maxWidth='500px'
      footer={
        <>
          <button
            type='button'
            className='btn btn-secondary'
            onClick={closeAssign}
            disabled={assignSaving}
          >
            Cancel
          </button>
          <button
            type='submit'
            form='assign-form'
            className='btn btn-primary'
            disabled={assignSaving}
          >
            {assignSaving ? "Assigning…" : "Assign item"}
          </button>
        </>
      }
    >
      <form id='assign-form' onSubmit={handleAssignSubmit}>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {assignError && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "var(--bg-danger)",
                color: "var(--text-danger)",
                border: "1px solid #fecaca",
                borderRadius: 8,
                padding: "0.6rem 0.875rem",
                fontSize: 13,
              }}
            >
              <HiExclamationCircle style={{ flexShrink: 0 }} />
              {assignError}
            </div>
          )}

          {loadingStudents ? (
            <Bone h={44} r={8} />
          ) : (
            <CustomSelect
              icon={<HiOutlinePencil />}
              labelName='Student'
              value={assignForm.studentId}
              onChange={(e) => setAssignForm((f) => ({ ...f, studentId: e.target.value }))}
              placeholder='Select student'
              options={students.map((s) => ({
                value: s.id,
                label: `${s.firstName} ${s.lastName}`,
              }))}
              required
            />
          )}

          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  marginBottom: 6,
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-primary)",
                }}
              >
                Quantity
              </label>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid var(--border-color)",
                  borderRadius: 10,
                  overflow: "hidden",
                  height: 44,
                  background: "var(--bg-primary)",
                }}
              >
                <button
                  type='button'
                  onClick={() =>
                    setAssignForm((f) => ({
                      ...f,
                      quantity: Math.max(1, Number(f.quantity || 1) - 1),
                    }))
                  }
                  style={{
                    width: 44,
                    height: "100%",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 20,
                    color: "var(--text-primary)",
                  }}
                >
                  −
                </button>

                <div
                  style={{
                    flex: 1,
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 15,
                  }}
                >
                  {assignForm.quantity || 1}
                </div>

                <button
                  type='button'
                  onClick={() =>
                    setAssignForm((f) => ({
                      ...f,
                      quantity: Number(f.quantity || 1) + 1,
                    }))
                  }
                  style={{
                    width: 44,
                    height: "100%",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    fontSize: 20,
                    color: "var(--text-primary)",
                  }}
                >
                  +
                </button>
              </div>
            </div>

            <div style={{ flex: 2 }}>
              <CustomInput
                name='note'
                type='text'
                labelName='Note (optional)'
                value={assignForm.note}
                onChange={(e) => setAssignForm((f) => ({ ...f, note: e.target.value }))}
                icon={<HiOutlinePencil />}
                placeholder='e.g. Size M'
              />
            </div>
          </div>

          {assignForm.quantity >= 1 && (
            <div
              style={{
                background: "var(--bg-secondary)",
                borderRadius: 8,
                padding: "0.6rem 0.875rem",
                fontSize: 13,
                display: "flex",
                justifyContent: "space-between",
              }}
            >
              <span style={{ color: "var(--text-secondary)" }}>Total to collect</span>
              <strong>{fmt(Number(assignForm.quantity || 0) * assignModal.item.price)}</strong>
            </div>
          )}
        </div>
      </form>
    </FormModal>
  );
}
