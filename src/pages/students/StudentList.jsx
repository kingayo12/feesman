import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllStudents, deleteStudent, updateStudent } from "./studentService";
import {
  HiSearch,
  HiOutlineAcademicCap,
  HiEye,
  HiFilter,
  HiTrash,
  HiPlus,
  HiPencilAlt,
} from "react-icons/hi";
import { filterData } from "../../utils/helpers";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import TableToolbar from "../../components/common/TableToolbar";
import StudentForm from "../../components/forms/StudentForm";
import { getClasses } from "../classes/classService";
import { getFamilies } from "../families/familyService";
import { StudentListSkeleton } from "../../components/common/Skeleton";
import CustomButton from "../../components/common/CustomButton";
import { FormModal, ConfirmModal } from "../../components/common/Modal";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [families, setFamilies] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { can } = useRole();

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [studentData, classData, familyData] = await Promise.all([
        getAllStudents(),
        getClasses(),
        getFamilies(),
      ]);
      setStudents(studentData || []);
      setClasses(classData || []);
      setFamilies(familyData || []);
    } catch (error) {
      console.error("Error loading Student List data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const getClassName = (classId) => classes.find((c) => c.id === classId)?.name ?? "Not Assigned";
  const getFamilyName = (familyId) =>
    families.find((f) => f.id === familyId)?.familyName ?? "No Family";

  const handleDelete = async (studentId) => {
    if (
      !window.confirm("Are you sure you want to delete this student? This action cannot be undone.")
    )
      return;
    try {
      await deleteStudent(studentId);
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
    } catch (error) {
      console.error("Failed to delete student:", error);
      alert("Failed to delete student. Please try again.");
    }
  };

  const displayData = students.map((s) => ({
    ...s,
    resolvedClassName: getClassName(s.classId),
    resolvedFamilyName: getFamilyName(s.familyId),
  }));

  const filteredStudents = filterData(displayData, searchQuery, [
    "firstName",
    "lastName",
    "resolvedClassName",
    "resolvedFamilyName",
  ]);

  const exportHeaders = ["Student Name", "Class", "Session", "Family", "Status"];
  const exportRows = filteredStudents.map((student) => [
    `${student.firstName} ${student.lastName}`,
    student.resolvedClassName,
    student.session,
    student.resolvedFamilyName,
    "Active",
  ]);

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) return <StudentListSkeleton />;

  return (
    <div className='student-list-container'>
      <div className='list-page-header'>
        <div className='header-title'>
          <HiOutlineAcademicCap className='main-icon' />
          <div>
            <h2>Student Directory</h2>
            <p>Manage and view all enrolled students</p>
          </div>
        </div>
        <div className='header-stats'>
          <span className='stat-pill'>Total: {students.length}</span>
        </div>
      </div>

      <div className='add_button'>
        {can(PERMISSIONS.CREATE_STUDENT) && (
          <CustomButton
            onClick={() => {
              setEditStudent(null);
              setModalOpen(true);
            }}
            icon={!showAddStudent && <HiPlus />}
            variant={showAddStudent ? "cancel" : "primary"}
            otherClass='rounded-full'
          >
            {showAddStudent ? "Cancel" : "Add Student"}
          </CustomButton>
        )}
      </div>

      {/* ───────── FORM MODAL ───────── */}
      {modalOpen && (
        <FormModal
          title={editStudent ? "Edit Student" : "Add Student"}
          onClose={() => {
            setModalOpen(false);
            setEditStudent(null);
          }}
        >
          <StudentForm
            initialData={editStudent}
            onSuccess={async () => {
              await loadAllData();
              setModalOpen(false);
              setEditStudent(null);
            }}
            onCancel={() => {
              setModalOpen(false);
              setEditStudent(null);
            }}
          />
        </FormModal>
      )}

      <div className='table-controls'>
        <div className='search-box'>
          <HiSearch className='search-icon' />
          <input
            type='text'
            placeholder='Search by name, class, or family...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <button className='filter-btn'>
          <HiFilter /> Filter
        </button>
      </div>
      <TableToolbar fileName='students' headers={exportHeaders} rows={exportRows} />

      <div className='table-card'>
        <table className='data-table'>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Class</th>
              <th>Session</th>
              <th>Family</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredStudents.length > 0 ? (
              filteredStudents.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className='student-profile'>
                      <div className='student-initials'>
                        {student.firstName?.[0] || ""}
                        {student.lastName?.[0] || ""}
                      </div>
                      <div className='student-name-meta'>
                        <span className='full-name'>
                          {student.firstName} {student.lastName}
                        </span>
                        <span className='id-sub'>ID: #{student.id?.slice(0, 5) || "N/A"}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className='class-tag'>{student.resolvedClassName}</span>
                  </td>
                  <td>{student.session}</td>
                  <td className='family-cell'>{student.resolvedFamilyName}</td>
                  <td>
                    <span className='status-badge active'>Active</span>
                  </td>
                  <td className='actions-btn'>
                    <Link to={`/students/${student.id}`} className='view-btn'>
                      <HiEye />
                      <p>View</p>
                    </Link>
                    {can(PERMISSIONS.DELETE_STUDENT) && (
                      <button
                        className='delete-btn'
                        onClick={() => setDeleteTarget(student)}
                        title='Delete Student'
                      >
                        <HiTrash />
                        <p>Delete</p>
                      </button>
                    )}

                    {can(PERMISSIONS.EDIT_STUDENT) && (
                      <button
                        className='edit-btn'
                        onClick={() => {
                          setEditStudent(student);
                          setModalOpen(true);
                        }}
                        title='Edit Student'
                      >
                        <HiPencilAlt />
                        <p>Edit</p>
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan='6' className='empty-row'>
                  {searchQuery ? `No results found for "${searchQuery}"` : "No students found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteTarget && (
        <ConfirmModal
          entityName={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          loading={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            setDeleting(true);
            try {
              await deleteStudent(deleteTarget.id);
              setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
              setDeleteTarget(null);
            } catch (err) {
              console.error(err);
            } finally {
              setDeleting(false);
            }
          }}
        />
      )}
    </div>
  );
}
