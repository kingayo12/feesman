import { assignItemToStudent } from "@/services/inventory/inventoryService";
import { getSettings } from "@/services/settings/settingService";
import { getCurrentEnrollment } from "@/services/students/enrollmentService";
import { getAllStudents, getStudentById } from "@/services/students/studentService";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export function useInventoryAssign(onAssigned) {
  const { user } = useAuth();
  const [assignModal, setAssignModal] = useState(null);
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [assignForm, setAssignForm] = useState({ studentId: "", quantity: 1, note: "" });
  const [assignSaving, setAssignSaving] = useState(false);
  const [assignError, setAssignError] = useState(null);

  const openAssign = async (item) => {
    setAssignModal({ item });
    setAssignError(null);
    setAssignForm({ studentId: "", quantity: 1, note: "" });
    setLoadingStudents(true);

    try {
      const all = await getAllStudents();
      setStudents(all || []);
      if (all?.length) setAssignForm((f) => ({ ...f, studentId: all[0].id }));
    } catch (err) {
      console.error("Failed to load students:", err);
      setAssignError("Failed to load students.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const closeAssign = () => {
    setAssignModal(null);
    setAssignError(null);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    if (!assignModal?.item) return;
    setAssignError(null);
    if (!assignForm.studentId) return setAssignError("Select a student.");
    if (!assignForm.quantity || Number(assignForm.quantity) < 1)
      return setAssignError("Quantity must be at least 1.");

    setAssignSaving(true);
    try {
      const student = await getStudentById(assignForm.studentId);
      if (!student) throw new Error("Selected student not found.");

      const settings = await getSettings();
      const academicYear = settings?.currentSession || settings?.academicYear || null;
      const term = settings?.currentTerm || settings?.term || null;

      let classId = null;
      try {
        const enroll = await getCurrentEnrollment(assignForm.studentId);
        classId = enroll?.classId || null;
      } catch (_) {
        classId = null;
      }

      await assignItemToStudent({
        studentId: assignForm.studentId,
        studentName: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
        classId,
        itemId: assignModal.item.id,
        quantity: Number(assignForm.quantity),
        academicYear,
        term,
        note: assignForm.note,
        assignedBy: user?.uid || null,
      });

      const assignedItem = assignModal.item;
      closeAssign();
      if (typeof onAssigned === "function") {
        onAssigned(assignedItem, student);
      }
    } catch (err) {
      setAssignError(err.message || String(err));
    } finally {
      setAssignSaving(false);
    }
  };

  return {
    assignModal,
    students,
    loadingStudents,
    assignForm,
    assignSaving,
    assignError,
    openAssign,
    closeAssign,
    setAssignForm,
    handleAssignSubmit,
  };
}
