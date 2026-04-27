import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllStudents, deleteStudentWithEnrollments } from "./studentService";
import { getEnrollmentsByFilter } from "./enrollmentService";
import SetTermButton from "./Settermbutton";
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
import CustomSelect from "../../components/common/SelectInput";
import { FormModal, ConfirmModal } from "../../components/common/Modal";

const TERMS = ["1st Term", "2nd Term", "3rd Term"];
const ITEMS_PER_PAGE = 10;

// ─── Sort helpers ─────────────────────────────────────────────────────────────
function parseClassName(name = "") {
  const m = name.trim().match(/^(.*?)(\d+)\s*([A-Za-z]?)$/);
  if (!m) return { prefix: name.trim(), level: Infinity, arm: "" };
  return { prefix: m[1].trim(), level: parseInt(m[2], 10), arm: m[3].toUpperCase() };
}

function getGroupOrder(prefix = "") {
  const p = prefix.toLowerCase();
  if (p.includes("creche") || p.includes("daycare")) return 0;
  if (p.includes("kg") || p.includes("kindergarten")) return 1;
  if (p.includes("nursery")) return 2;
  if (p.includes("primary")) return 3;
  if (p.includes("jss") || p.includes("junior")) return 4;
  if (p.includes("ss") || p.includes("senior") || p.includes("secondary")) return 5;
  return 6;
}

function sortClasses(list = []) {
  return [...list].sort((a, b) => {
    const pa = parseClassName(a.name);
    const pb = parseClassName(b.name);
    const go = getGroupOrder(pa.prefix) - getGroupOrder(pb.prefix);
    if (go !== 0) return go;
    if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix);
    if (pa.level !== pb.level) return pa.level - pb.level;
    return pa.arm.localeCompare(pb.arm);
  });
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [hasEnrollments, setHasEnrollments] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [classes, setClasses] = useState([]);
  const [families, setFamilies] = useState([]);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [editStudent, setEditStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedSession, setSelectedSession] = useState(null);
  const [selectedTerm, setSelectedTerm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [allSessions, setAllSessions] = useState([]);
  const { can } = useRole();

  // ── Load ──────────────────────────────────────────────────────────────────
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

      // Enrollments for current session/term (active only)
      const enrollmentData = await getEnrollmentsByFilter({
        session: defaultSession || undefined,
        term: defaultTerm || undefined,
      });

      // Check if ANY active enrollments exist (unfiltered) to detect model
      // status: "active" is already applied inside getEnrollmentsByFilter
      const anyEnrollments = await getEnrollmentsByFilter({});
      const newModel = (anyEnrollments || []).length > 0;

      setStudents(studentData || []);
      setClasses(classData || []);
      setFamilies(familyData || []);
      setEnrollments(enrollmentData || []);
      setHasEnrollments(newModel);
      setSelectedSession(defaultSession);
      setSelectedTerm(defaultTerm);

      // Sessions list from enrollment docs (new model) or student docs (old model)
      const sessionSource = newModel
        ? anyEnrollments.map((e) => e.session)
        : (studentData || []).map((s) => s.session);

      setAllSessions([...new Set(sessionSource.filter(Boolean))].sort().reverse());
    } catch (error) {
      console.error("Error loading Student List data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  // ── Reload enrollments when filters change ────────────────────────────────
  const reloadEnrollments = async (session, term, classId) => {
    try {
      setEnrollmentsLoading(true);
      const data = await getEnrollmentsByFilter({
        session: session || undefined,
        term: term || undefined,
        classId: classId || undefined,
      });
      setEnrollments(data || []);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error reloading enrollments:", error);
    } finally {
      setEnrollmentsLoading(false);
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getClassName = (cid) => classes.find((c) => c.id === cid)?.name ?? "Not Assigned";
  const getFamilyName = (fid) => families.find((f) => f.id === fid)?.familyName ?? "No Family";

  // ── Build display rows ────────────────────────────────────────────────────
  const displayData = hasEnrollments
    ? enrollments
        .map((enrollment) => {
          const student = students.find((s) => s.id === enrollment.studentId);
          if (!student) return null;
          return {
            ...student,
            classId: enrollment.classId,
            session: enrollment.session,
            term: enrollment.term,
            enrollmentId: enrollment.id,
            resolvedClassName: getClassName(enrollment.classId),
            resolvedFamilyName: getFamilyName(student.familyId),
          };
        })
        .filter(Boolean)
    : students.map((s) => ({
        ...s,
        resolvedClassName: getClassName(s.classId),
        resolvedFamilyName: getFamilyName(s.familyId),
      }));

  // ── Search ────────────────────────────────────────────────────────────────
  let finalFilteredStudents = filterData(displayData, searchQuery, [
    "firstName",
    "lastName",
    "resolvedClassName",
    "resolvedFamilyName",
  ]);

  // Old model: filter client-side
  if (!hasEnrollments) {
    if (selectedClassId)
      finalFilteredStudents = finalFilteredStudents.filter((s) => s.classId === selectedClassId);
    if (selectedSession)
      finalFilteredStudents = finalFilteredStudents.filter(
        (s) => String(s.session || "").trim() === String(selectedSession).trim(),
      );
    if (selectedTerm)
      finalFilteredStudents = finalFilteredStudents.filter((s) => s.term === selectedTerm);
  }

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(finalFilteredStudents.length / ITEMS_PER_PAGE));

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const paginatedStudents = finalFilteredStudents.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // ── Export ────────────────────────────────────────────────────────────────
  const exportHeaders = ["Student Name", "Class", "Session", "Term", "Family", "Status"];
  const exportRows = finalFilteredStudents.map((s) => [
    `${s.firstName} ${s.lastName}`,
    s.resolvedClassName,
    s.session,
    s.term,
    s.resolvedFamilyName,
    "Active",
  ]);

  // ── Filter handlers ───────────────────────────────────────────────────────
  const handleClassChange = (e) => {
    const val = e.target.value || null;
    setSelectedClassId(val);
    if (hasEnrollments) reloadEnrollments(selectedSession, selectedTerm, val);
    else setCurrentPage(1);
  };

  const handleSessionChange = (e) => {
    const val = e.target.value || null;
    setSelectedSession(val);
    if (hasEnrollments) reloadEnrollments(val, selectedTerm, selectedClassId);
    else setCurrentPage(1);
  };

  const handleTermChange = (e) => {
    const val = e.target.value || null;
    setSelectedTerm(val);
    if (hasEnrollments) reloadEnrollments(selectedSession, val, selectedClassId);
    else setCurrentPage(1);
  };

  const activeFilters = [
    selectedClassId && {
      key: "class",
      label: `Class: ${getClassName(selectedClassId)}`,
      clear: () => {
        setSelectedClassId(null);
        if (hasEnrollments) reloadEnrollments(selectedSession, selectedTerm, null);
        else setCurrentPage(1);
      },
    },
    selectedSession && {
      key: "session",
      label: `Session: ${selectedSession}`,
      clear: () => {
        setSelectedSession(null);
        if (hasEnrollments) reloadEnrollments(null, selectedTerm, selectedClassId);
        else setCurrentPage(1);
      },
    },
    selectedTerm && {
      key: "term",
      label: `Term: ${selectedTerm}`,
      clear: () => {
        setSelectedTerm(null);
        if (hasEnrollments) reloadEnrollments(selectedSession, null, selectedClassId);
        else setCurrentPage(1);
      },
    },
  ].filter(Boolean);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteStudentWithEnrollments(deleteTarget.id);
      setStudents((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      setEnrollments((prev) => prev.filter((e) => e.studentId !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Delete failed:", err);
      alert("Failed to delete student. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <StudentListSkeleton />;

  return (
    <div className='student-list-container'>
      {/* ── Header ── */}
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
          <span className='stat-pill'>Showing: {finalFilteredStudents.length}</span>
        </div>
      </div>

      <SetTermButton onDone={() => loadAllData()} />

      {/* ── Add Student ── */}
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

      {/* ── Form Modal ── */}
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

      {/* ── Search ── */}
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

      {/* ── Filters ── */}
      <div className='student-filters'>
        <CustomSelect
          name='class'
          value={selectedClassId || ""}
          placeholder='All Classes'
          labelName='Class'
          onChange={handleClassChange}
          options={[
            { value: "", label: "All Classes" },
            ...sortClasses(classes).map((cls) => ({ value: cls.id, label: cls.name })),
          ]}
        />
        <CustomSelect
          name='session'
          value={selectedSession || ""}
          placeholder='All Sessions'
          labelName='Session'
          onChange={handleSessionChange}
          options={[
            { value: "", label: "All Sessions" },
            ...allSessions.map((s) => ({ value: s, label: s })),
          ]}
        />
        <CustomSelect
          name='term'
          value={selectedTerm || ""}
          placeholder='All Terms'
          labelName='Term'
          onChange={handleTermChange}
          options={[
            { value: "", label: "All Terms" },
            ...TERMS.map((t) => ({ value: t, label: t })),
          ]}
        />
      </div>

      {/* ── Active filter pills ── */}
      {activeFilters.length > 0 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            marginBottom: "0.75rem",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Active filters:</span>
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type='button'
              onClick={filter.clear}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.35rem",
                padding: "0.25rem 0.65rem",
                borderRadius: "999px",
                border: "1px solid var(--accent)",
                backgroundColor: "var(--accent-muted)",
                color: "var(--accent)",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {filter.label}
              <span style={{ fontSize: 14, lineHeight: 1 }}>×</span>
            </button>
          ))}
          {activeFilters.length > 1 && (
            <button
              type='button'
              onClick={() => {
                setSelectedClassId(null);
                setSelectedSession(null);
                setSelectedTerm(null);
                if (hasEnrollments) reloadEnrollments(null, null, null);
                else setCurrentPage(1);
              }}
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                background: "none",
                border: "none",
                cursor: "pointer",
                textDecoration: "underline",
              }}
            >
              Clear all
            </button>
          )}
        </div>
      )}

      {/* ── Table ── */}
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
            {enrollmentsLoading ? (
              <tr>
                <td colSpan='7' className='empty-row'>
                  Loading...
                </td>
              </tr>
            ) : paginatedStudents.length > 0 ? (
              paginatedStudents.map((student) => (
                <tr key={`${student.id}-${student.enrollmentId || student.id}`}>
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
                  <td>{student.term || "—"}</td>
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

        {/* ── Pagination ── */}
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
            {finalFilteredStudents.length > 0
              ? `${(currentPage - 1) * ITEMS_PER_PAGE + 1}–${Math.min(currentPage * ITEMS_PER_PAGE, finalFilteredStudents.length)} of ${finalFilteredStudents.length}`
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

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <ConfirmModal
          entityName={`${deleteTarget.firstName} ${deleteTarget.lastName}`}
          loading={deleting}
          onClose={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
