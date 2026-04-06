import { Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { getClasses, deleteClass } from "./classService";
import { getAllStudents } from "../students/studentService";
import { useRole } from "../../hooks/useRole";
import TableToolbar from "../../components/common/TableToolbar";
import ClassForm from "../../components/forms/ClassForm";
import { ClassListSkeleton } from "../../components/common/Skeleton";
import {
  HiCollection,
  HiViewGrid,
  HiClipboardList,
  HiPlusCircle,
  HiEye,
  HiTrash,
  HiLightningBolt,
  HiUserGroup,
  HiX,
  HiExclamationCircle,
} from "react-icons/hi";

/* ─────────────────────────────────────────────────────────────
   HELPER — parse "Primary 1A" → { prefix:"Primary", level:1, arm:"A" }
   Used to sort classes in a sensible academic order.
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
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, name }
  const [deleting, setDeleting] = useState(false);
  const { canDelete } = useRole();

  const loadAll = async () => {
    setLoading(true);
    const [classData, studentData] = await Promise.all([getClasses(), getAllStudents()]);
    setClasses(classData || []);
    setStudents(studentData || []);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  /* Student count per class */
  const countByClass = useMemo(
    () =>
      students.reduce((acc, s) => {
        if (s.classId) acc[s.classId] = (acc[s.classId] || 0) + 1;
        return acc;
      }, {}),
    [students],
  );

  const sortedClasses = useMemo(() => sortClasses(classes), [classes]);

  /* Delete */
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteClass(deleteTarget.id);
      setClasses((prev) => prev.filter((c) => c.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      console.error("Failed to delete class:", err);
      alert("Unable to delete class. It may be in use.");
    } finally {
      setDeleting(false);
    }
  };

  const exportHeaders = ["Class Name", "Section / Arm", "Academic Session", "Students"];
  const exportRows = sortedClasses.map((c) => [
    c.name,
    c.section || "—",
    c.session || "",
    countByClass[c.id] || 0,
  ]);

  if (loading) return <ClassListSkeleton />;

  return (
    <div className='class-list-container'>
      {/* ── Page header ── */}
      <div className='list-page-header'>
        <div className='header-title'>
          <HiCollection className='main-icon' />
          <div>
            <h2>Class Management</h2>
            <p>Organise classes, view enrolment, and promote students to the next level</p>
          </div>
        </div>
        <button
          className={`toggle-form-btn ${showForm ? "cancel" : "add"}`}
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? (
            "Close Form"
          ) : (
            <>
              <HiPlusCircle /> Add New Class
            </>
          )}
        </button>
      </div>

      {/* ── Add class form ── */}
      {showForm && (
        <div className='form-card-wrapper animate-slide'>
          <ClassForm
            onSuccess={() => {
              loadAll();
              setShowForm(false);
            }}
          />
        </div>
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
            <label>Total Students</label>
            <h3>{students.length}</h3>
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
                      {/* Promote link — visible when class has students.
                           The ClassDetails page enforces the 3rd-term-ended rule. */}
                      {count > 0 && (
                        <Link
                          to={`/classes/${cls.id}?promote=true`}
                          className='cl-promote-btn'
                          title='Open class to promote students (available after 3rd term ends)'
                        >
                          <HiLightningBolt /> Promote
                        </Link>
                      )}
                      {canDelete && (
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

      {/* ── Delete confirm modal ── */}
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
              This cannot be undone. Students in this class will <strong>not</strong> be deleted,
              but they will lose their class assignment.
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
                {deleting ? "Deleting…" : "Yes, delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Styles ── */}
      <style>{`
        /* Student count badge */
        .cl-count { display:inline-flex; align-items:center; gap:.3rem; font-size:.82rem; font-weight:600; color:#374151; }
        [data-theme="dark"] .cl-count { color:#d1d5db; }
        .cl-count--empty { color:#9ca3af; font-weight:400; }

        /* Promote quick-link */
        .cl-promote-btn {
          display:inline-flex; align-items:center; gap:.3rem;
          padding:.42rem .8rem; border-radius:8px;
          border:1px solid #99f6e4; background:#f0fdfa;
          color:#0d9488; font-size:.8rem; font-weight:600;
          text-decoration:none; transition:background .13s, border-color .13s;
        }
        .cl-promote-btn:hover { background:#ccfbf1; border-color:#5eead4; }
        [data-theme="dark"] .cl-promote-btn { background:#022c22; border-color:#134e4a; color:#6ee7b7; }
        [data-theme="dark"] .cl-promote-btn:hover { background:#134e4a; }

        /* Delete confirm modal */
        .cl-del-overlay { position:fixed; inset:0; background:rgba(15,23,42,.7); backdrop-filter:blur(4px); display:flex; align-items:center; justify-content:center; z-index:2000; padding:1rem; }
        .cl-del-modal { background:#fff; border-radius:16px; padding:1.75rem; max-width:400px; width:100%; box-shadow:0 32px 80px rgba(0,0,0,.25); text-align:center; }
        [data-theme="dark"] .cl-del-modal { background:#1e293b; }
        .cl-del-icon-wrap { width:52px; height:52px; border-radius:50%; background:#fef2f2; color:#dc2626; display:flex; align-items:center; justify-content:center; font-size:1.5rem; margin:0 auto .85rem; }
        .cl-del-modal h4 { margin:0 0 .5rem; font-size:1rem; color:#111827; }
        [data-theme="dark"] .cl-del-modal h4 { color:#f1f5f9; }
        .cl-del-modal p { margin:0 0 1rem; font-size:.84rem; color:#6b7280; line-height:1.5; }
        [data-theme="dark"] .cl-del-modal p { color:#94a3b8; }
        .cl-del-warn { display:flex; align-items:center; gap:.4rem; padding:.6rem .85rem; background:#fffbeb; border:1px solid #fde68a; border-radius:8px; font-size:.78rem; color:#92400e; margin-bottom:1rem; text-align:left; }
        .cl-del-actions { display:flex; gap:.6rem; justify-content:center; }
        .cl-del-cancel { padding:.5rem 1.1rem; border:1px solid #d1d5db; border-radius:8px; background:transparent; cursor:pointer; font-size:.875rem; color:#374151; }
        .cl-del-cancel:hover { background:#f3f4f6; }
        .cl-del-cancel:disabled { opacity:.45; cursor:not-allowed; }
        [data-theme="dark"] .cl-del-cancel { border-color:#475569; color:#d1d5db; }
        .cl-del-confirm { padding:.5rem 1.1rem; border:none; border-radius:8px; background:#dc2626; color:#fff; cursor:pointer; font-size:.875rem; font-weight:600; transition:background .14s; }
        .cl-del-confirm:hover { background:#b91c1c; }
        .cl-del-confirm:disabled { opacity:.45; cursor:not-allowed; }
      `}</style>
    </div>
  );
}
