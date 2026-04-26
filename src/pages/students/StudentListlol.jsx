import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllStudents, deleteStudent } from "./studentService";
import { getEnrollmentsByFilter } from "./enrollmentService";
import {
  HiSearch,
  HiOutlineAcademicCap,
  HiEye,
  HiTrash,
  HiPlus,
  HiPencilAlt,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import { filterData } from "../../utils/helpers";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import TableToolbar from "../../components/common/TableToolbar";
import StudentForm from "../../components/forms/StudentForm";
import { getClasses } from "../classes/classService";
import { getFamilies } from "../families/familyService";
import { getSettings } from "../settings/settingService";
import { StudentListSkeleton } from "../../components/common/Skeleton";
import CustomButton from "../../components/common/CustomButton";
import CustomInput from "../../components/common/Input";
import { FormModal, ConfirmModal } from "../../components/common/Modal";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const ITEMS_PER_PAGE = 10;

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [families, setFamilies] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const { can } = useRole();

  // ─── Load everything ────────────────────────────────────────────────────
  const loadAllData = async () => {
    try {
      setLoading(true);

      const [studentData, classData, familyData, appSettings] = await Promise.all([
        getAllStudents(),
        getClasses(),
        getFamilies(),
        getSettings(),
      ]);

      const defaultSession = appSettings?.academicYear || null;
      const defaultTerm = appSettings?.currentTerm || null;

      // Load enrollments filtered to current session + term by default
      const enrollmentData = await getEnrollmentsByFilter({
        session: defaultSession || undefined,
        term: defaultTerm || undefined,
      });

      setStudents(studentData || []);
      setClasses(classData || []);
      setFamilies(familyData || []);
      setEnrollments(enrollmentData || []);
      setSelectedSession(defaultSession);
      setSelectedTerm(defaultTerm);
    } catch (error) {
      console.error("Error loading Student List data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ─── Re-fetch enrollments when filters change ───────────────────────────
  const reloadEnrollments = async (session, term, classId) => {
    try {
      const enrollmentData = await getEnrollmentsByFilter({
        session: session || undefined,
        term: term || undefined,
        classId: classId || undefined,
      });
      setEnrollments(enrollmentData || []);
    } catch (error) {
      console.error("Error reloading enrollments:", error);
    }
  };

  // ─── Helpers ────────────────────────────────────────────────────────────
  const getClassName = (classId) =>
    classes.find((c) => c.id === classId)?.name ?? "Not Assigned";

  const getFamilyName = (familyId) =>
    families.find((f) => f.id === familyId)?.familyName ?? "No Family";

  const getClassLevel = (name = "") => {
    const n = name.toLowerCase();
    if (n.includes("creche") || n.includes("daycare")) return 0;
    if (n.includes("kg")) return 1;
    if (n.includes("nursery")) return 2;
    if (n.includes("primary")) return 3;
    if (n.includes("jss")) return 4;
    if (n.includes("ss")) return 5;
    return 6;
  };

  const getClassOrderNumber = (name = "") => {
    const match = name.match(/\d+/);
    return match ? Number(match[0]) : 0;
  };

  const sortClasses = (list = []) =>
    [...list].sort((a, b) => {
      const levelDiff = getClassLevel(a.name) - getClassLevel(b.name);
      if (levelDiff !== 0) return levelDiff;
      return getClassOrderNumber(a.name) - getClassOrderNumber(b.name);
    });

  // ─── Extract unique sessions from enrollments ───────────────────────────
  const uniqueSessions = [
    ...new Set(enrollments.map((e) => e.session).filter(Boolean)),
  ]
    .sort()
    .reverse();

  // ─── Join students with their enrollment data ───────────────────────────
  // Each student is shown once per enrollment in the current filter set.
  const displayData = enrollments
    .map((enrollment) => {
      const student = students.find((s) => s.id === enrollment.studentId);
      if (!student) return null;

      return {
        ...student,
        // Enrollment-sourced fields (authoritative for filtering)
        classId: enrollment.classId,
        session: enrollment.session,
        term: enrollment.term,
        enrollmentId: enrollment.id,
        enrollmentStatus: enrollment.status,
        // Resolved display fields
        resolvedClassName: getClassName(enrollment.classId),
        resolvedFamilyName: getFamilyName(student.familyId),
      };
    })
    .filter(Boolean);

  // ─── Search filter (client-side on joined data) ─────────────────────────
  const filteredStudents = filterData(displayData, searchQuery, [
    "firstName",
    "lastName",
    "resolvedClassName",
    "resolvedFamilyName",
  ]);

  // ─── Pagination ──────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedStudents = filteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ─── Export ──────────────────────────────────────────────────────────────
  const exportHeaders = ["Student Name", "Class", "Session", "Term", "Family", "Status"];
  const exportRows = filteredStudents.map((student) => [
    `${student.firstName} ${student.lastName}`,
    student.resolvedClassName,
    student.session,
    student.term,
    student.resolvedFamilyName,
    "Active",
  ]);

  // ─── Filter change handlers ──────────────────────────────────────────────
  const handleClassChange = (option) => {
    const val = option?.value ?? null;
    setSelectedClassId(val);
    setCurrentPage(1);
    reloadEnrollments(selectedSession, selectedTerm, val);
  };

  const handleSessionChange = (option) => {
    const val = option?.value ?? null;
    setSelectedSession(val);
    setCurrentPage(1);
    reloadEnrollments(val, selectedTerm, selectedClassId);
  };

  const handleTermChange = (option) => {
    const val = option?.value ?? null;
    setSelectedTerm(val);
    setCurrentPage(1);
    reloadEnrollments(selectedSession, val, selectedClassId);
  };

  // ─── Skeleton ─────────────────────────────────────────────────────────────
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
          <span className='stat-pill'>Showing: {filteredStudents.length}</span>
        </div>
      </div>

      {/* ─── Add Student Button ─── */}
      <div className='add_button'>
        {can(PERMISSIONS.CREATE_STUDENT) && (
          <CustomButton
            onClick={() => {
              setEditStudent(null);
              if (showAddStudent) {
                setModalOpen(false);
                setShowAddStudent(false);
              } else {
                setModalOpen(true);
                setShowAddStudent(true);
              }
            }}
            icon={!showAddStudent && <HiPlus />}
            variant={showAddStudent ? "cancel" : "primary"}
            otherClass='rounded-full'
          >
            {showAddStudent ? "Cancel" : "Add Student"}
          </CustomButton>
        )}
      </div>

      {/* ─── Form Modal ─── */}
      {modalOpen && (
        <FormModal
          title={editStudent ? "Edit Student" : "Add Student"}
          onClose={() => {
            setModalOpen(false);
            setEditStudent(null);
            setShowAddStudent(false);
          }}
        >
          <StudentForm
            initialData={editStudent}
            onSuccess={async () => {
              await loadAllData();
              setModalOpen(false);
              setEditStudent(null);
              setShowAddStudent(false);
            }}
            onCancel={() => {
              setModalOpen(false);
              setEditStudent(null);
              setShowAddStudent(false);
            }}
          />
        </FormModal>
      )}

      {/* ─── Search ─── */}
      <div className='table-controls'>
        <div className='search-box'>
          <HiSearch className='search-icon' />
          <input
            type='text'
            placeholder='Search by name, class, or family...'
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
      </div>

      <TableToolbar fileName='students' headers={exportHeaders} rows={exportRows} />

      {/* ─── Filters ─── */}
      <div className='student-filters'>
        <CustomInput
          isRawSelect
          name='class'
          value={
            selectedClassId != null
              ? { value: selectedClassId, label: getClassName(selectedClassId) }
              : null
          }
          placeholder='All Classes'
          onChange={handleClassChange}
          labelName='Class'
          isSelect={true}
          isSearchable={true}
          options={[
            { value: null, label: "All Classes" },
            ...sortClasses(classes).map((cls) => ({
              value: cls.id,
              label: cls.name,
            })),
          ]}
        />

        <CustomInput
          isRawSelect
          name='session'
          value={selectedSession != null ? { value: selectedSession, label: selectedSession } : null}
          placeholder='All Sessions'
          onChange={handleSessionChange}
          labelName='Session'
          isSelect={true}
          isSearchable={true}
          options={[
            { value: null, label: "All Sessions" },
            ...uniqueSessions.map((session) => ({
              value: session,
              label: session,
            })),
          ]}
        />

        <CustomInput
          isRawSelect
          name='term'
          value={selectedTerm != null ? { value: selectedTerm, label: selectedTerm } : null}
          placeholder='All Terms'
          onChange={handleTermChange}
          labelName='Term'
          isSelect={true}
          isSearchable={false}
          options={[
            { value: null, label: "All Terms" },
            ...TERMS.map((term) => ({ value: term, label: term })),
          ]}
        />
      </div>

      {/* ─── Table ─── */}
      <div className='table-card'>
        <table className='data-table'>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Class</th>
              <th>Session</th>
              <th>Term</th>
              <th>Family</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {paginatedStudents.length > 0 ? (
              paginatedStudents.map((student) => (
                <tr key={`${student.id}-${student.enrollmentId}`}>
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
                  <td>{student.term}</td>
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
                <td colSpan='7' className='empty-row'>
                  {searchQuery
                    ? `No results found for "${searchQuery}"`
                    : "No students found for the selected filters"}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* ─── Pagination ─── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "0.75rem",
            padding: "1rem 1.25rem",
            borderTop: "1px solid var(--border-light, #e5e7eb)",
            flexWrap: "wrap",
          }}
        >
          <span style={{ color: "var(--color-text-secondary, #6b7280)", fontSize: 14 }}>
            {filteredStudents.length > 0
              ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(
                  currentPage * ITEMS_PER_PAGE,
                  filteredStudents.length,
                )} of ${filteredStudents.length}`
              : "No students to display."}
          </span>

          {totalPages > 1 && (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
              >
                <HiChevronLeft /> Prev
              </button>
              <span style={{ alignSelf: "center", fontSize: 14 }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Next <HiChevronRight />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Delete Confirm ─── */}
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
              setEnrollments((prev) =>
                prev.filter((e) => e.studentId !== deleteTarget.id),
              );
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
