import { Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { getClasses, deleteClass } from "./classService";
import { getAllStudents } from "../students/studentService";
import { getEnrollmentsByFilter } from "../students/enrollmentService";
import { getSettings } from "../settings/settingService";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import TableToolbar from "../../components/common/TableToolbar";
import ClassForm from "../../components/forms/ClassForm";
import { ClassListSkeleton } from "../../components/common/Skeleton";
import CustomButton from "../../components/common/CustomButton";
import { FormModal } from "../../components/common/Modal";
import {
  HiCollection,
  HiViewGrid,
  HiClipboardList,
  HiPlusCircle,
  HiUserGroup,
  HiEye,
  HiTrash,
  HiLightningBolt,
  HiExclamationCircle,
} from "react-icons/hi";

/* ─────────────────────────────────────────────────────────────
   HELPER — parse "Primary 1A" → { prefix:"Primary", level:1, arm:"A" }
───────────────────────────────────────────────────────────── */
function parseClassName(name = "") {
  const m = name.trim().match(/^(.*?)(\d+)\s*([A-Za-z]?)$/);
  if (!m) return { prefix: name.trim(), level: Infinity, arm: "" };
  return { prefix: m[1].trim(), level: parseInt(m[2], 10), arm: m[3].toUpperCase() };
}

function sortClasses(classes) {
  return [...classes].sort((a, b) => {
    const pa = parseClassName(a.name);
    const pb = parseClassName(b.name);
    if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix);
    if (pa.level !== pb.level) return pa.level - pb.level;
    return pa.arm.localeCompare(pb.arm);
  });
}

export default function ClassList() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [settings, setSettings] = useState({});
  const [currentTerm, setCurrentTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const { can } = useRole();

  // true = studentEnrollments has data (new model)
  // false = students still carry classId directly (old model)
  const isNewModel = enrollments.length > 0;

  const isThirdTermEnded = useMemo(() => {
    if (settings?.currentTerm !== "3rd Term") return false;
    const termEndDate = toDateValue(settings?.termEndDate);
    if (!termEndDate) return false;
    const cutoff = new Date(termEndDate);
    cutoff.setHours(23, 59, 59, 999);
    return Date.now() > cutoff.getTime();
  }, [settings]);

  const loadAll = async () => {
    try {
      setLoading(true);

      const [classData, studentData, appSettings] = await Promise.all([
        getClasses(),
        getAllStudents(),
        getSettings(),
      ]);

      const session = appSettings?.academicYear || null;
      const term = appSettings?.currentTerm || null;

      setCurrentSession(session);
      setCurrentTerm(term);
      setClasses(classData || []);
      setStudents(studentData || []);

      // Try to load enrollments for current session+term
      const enrollmentData = await getEnrollmentsByFilter({
        session: session || undefined,
        term: term || undefined,
      });

      setEnrollments(enrollmentData || []);
    } catch (error) {
      console.error("Error loading classes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* ── Student count per class ─────────────────────────────────────────────
     NEW MODEL: count from enrollments (scoped to current session+term)
     OLD MODEL: count from student docs directly (classId on student doc)
  ──────────────────────────────────────────────────────────────────────── */
  const countByClass = useMemo(() => {
    if (isNewModel) {
      return enrollments.reduce((acc, enrollment) => {
        if (enrollment.classId) {
          acc[enrollment.classId] = (acc[enrollment.classId] || 0) + 1;
        }
        return acc;
      }, {});
    }

    // OLD MODEL — filter by session+term if available on student doc
    return students
      .filter((s) => {
        if (currentSession && s.session !== currentSession) return false;
        if (currentTerm && s.term && s.term !== currentTerm) return false;
        return true;
      })
      .reduce((acc, student) => {
        if (student.classId) {
          acc[student.classId] = (acc[student.classId] || 0) + 1;
        }
        return acc;
      }, {});
  }, [students, enrollments, isNewModel, currentSession, currentTerm]);

  const totalStudentsShown = useMemo(
    () => Object.values(countByClass).reduce((sum, n) => sum + n, 0),
    [countByClass],
  );

  const sortedClasses = useMemo(() => sortClasses(classes), [classes]);

  /* ── Delete ──────────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClass(deleteTarget.id);
      setClasses((prev) => prev.filter((cls) => cls.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (error) {
      console.error("Failed to delete class:", error);
      alert("Unable to delete class. It may be in use.");
    } finally {
      setDeleting(false);
    }
  };

  const exportHeaders = ["Class Name", "Section / Arm", "Academic Session", "Students"];
  const exportRows = sortedClasses.map((cls) => [
    cls.name,
    cls.section || "—",
    cls.session || "",
    countByClass[cls.id] || 0,
  ]);

  if (loading) return <ClassListSkeleton />;

  return (
    <div className='class-list-container'>
      {/* ── Header ── */}
      <div className='list-page-header'>
        <div className='header-title'>
          <HiCollection className='main-icon' />
          <div>
            <h2>Class Management</h2>
            <p>Organise classes, view enrolment, and promote students to the next level</p>
          </div>
        </div>
        <div className='header-stats'>
          <span className='stat-pill'>Total: {classes.length}</span>
          {currentSession && (
            <span className='stat-pill' title='Currently viewing this session + term'>
              {currentSession} · {currentTerm || "All Terms"}
            </span>
          )}
        </div>
      </div>

      {isThirdTermEnded && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            padding: "0.75rem 1rem",
            marginBottom: "1rem",
            borderRadius: "var(--border-radius-sm, 8px)",
            backgroundColor: "var(--accent-muted)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          <HiLightningBolt style={{ flexShrink: 0, fontSize: 18 }} />
          <span>
            The 3rd term has ended — the <strong>Promote</strong> button is now active on classes
            with enrolled students.
          </span>
        </div>
      )}

      {/* ── Add Button ── */}
      <div className='add_button'>
        {can(PERMISSIONS.CREATE_CLASS) && (
          <CustomButton
            onClick={() => setModalOpen(true)}
            variant='primary'
            icon={<HiPlusCircle />}
            otherClass='rounded-full'
          >
            Add New Class
          </CustomButton>
        )}
      </div>

      {/* ── Form Modal ── */}
      {modalOpen && (
        <FormModal title='Add New Class' onClose={() => setModalOpen(false)}>
          <ClassForm
            onSuccess={async () => {
              await loadAll();
              setModalOpen(false);
            }}
            onCancel={() => setModalOpen(false)}
          />
        </FormModal>
      )}

      {/* ── Stats ── */}
      <div className='stats-row'>
        <div className='stat-card'>
          <HiViewGrid className='stat-icon' />
          <div className='stat-content'>
            <label>Total Classes</label>
            <h3>{classes.length}</h3>
          </div>
        </div>

        <div className='stat-card'>
          <HiUserGroup className='stat-icon' />
          <div className='stat-content'>
            <label>
              Students
              {currentTerm ? ` (${currentTerm})` : ""}
            </label>
            <h3>{totalStudentsShown}</h3>
          </div>
        </div>
      </div>

      {/* ── Table ── */}
      <div className='table-card'>
        <div className='card-header'>
          <HiClipboardList />
          <h3>Class Directory</h3>
        </div>

        <TableToolbar fileName='classes' headers={exportHeaders} rows={exportRows} />

        <table className='data-table'>
          <thead>
            <tr>
              <th>Class Name</th>
              <th>Section / Arm</th>
              <th>Academic Session</th>
              <th className='text-right'>Students</th>
              <th className='text-right'>Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedClasses.length > 0 ? (
              sortedClasses.map((cls) => {
                const count = countByClass[cls.id] || 0;
                return (
                  <tr key={cls.id}>
                    <td>
                      <div className='class-name-cell'>
                        <span className='class-avatar'>{cls.name.charAt(0)}</span>
                        <strong>{cls.name}</strong>
                      </div>
                    </td>

                    <td>
                      <span className='section-badge'>{cls.section || "—"}</span>
                    </td>

                    <td>{cls.session || "—"}</td>

                    <td className='text-right'>
                      <span className={`cl-count ${count === 0 ? "cl-count--empty" : ""}`}>
                        <HiUserGroup /> {count}
                      </span>
                    </td>

                    <td className='actions-cell'>
                      <Link to={`/classes/${cls.id}`} className='view-btn'>
                        <HiEye /> View
                      </Link>

                      {isThirdTermEnded && count > 0 && (
                        <Link
                          to={`/classes/${cls.id}?promote=true`}
                          className='cl-promote-btn'
                          title='Promote students to next class'
                        >
                          <HiLightningBolt /> Promote
                        </Link>
                      )}

                      {can(PERMISSIONS.DELETE_CLASS) && (
                        <button
                          className='delete-btn'
                          onClick={() => setDeleteTarget({ id: cls.id, name: cls.name })}
                          title='Delete class'
                        >
                          <HiTrash />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan='5' className='empty-row'>
                  No classes found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Delete Modal ── */}
      {deleteTarget && (
        <div className='cl-del-overlay' onClick={() => !deleting && setDeleteTarget(null)}>
          <div className='cl-del-modal' onClick={(e) => e.stopPropagation()}>
            <div className='cl-del-icon-wrap'>
              <HiExclamationCircle />
            </div>

            <h4>
              Delete <em>{deleteTarget.name}</em>?
            </h4>

            <p>
              This cannot be undone. Students in this class will
              <strong> not </strong>
              be deleted, but they will lose their class assignment.
            </p>

            {countByClass[deleteTarget.id] > 0 && (
              <div className='cl-del-warn'>
                <HiExclamationCircle />
                {countByClass[deleteTarget.id]} student
                {countByClass[deleteTarget.id] !== 1 ? "s" : ""} are currently enrolled in this
                class.
              </div>
            )}

            <div className='cl-del-actions'>
              <button
                className='cl-del-cancel'
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button className='cl-del-confirm' onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
