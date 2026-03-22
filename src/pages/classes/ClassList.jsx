import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getClasses, deleteClass } from "./classService";
import ClassForm from "../../components/forms/ClassForm";
import { ClassListSkeleton } from "../../components/common/Skeleton";
import {
  HiCollection,
  HiViewGrid,
  HiClipboardList,
  HiPlusCircle,
  HiEye,
  HiTrash,
} from "react-icons/hi";

export default function ClassList() {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadClasses = async () => {
    setLoading(true);
    const data = await getClasses();
    setClasses(data);
    setLoading(false);
  };

  useEffect(() => {
    loadClasses();
  }, []);

  const handleDelete = async (id) => {
    if (
      !window.confirm("Are you sure you want to delete this class? This action cannot be undone.")
    )
      return;
    try {
      await deleteClass(id);
      setClasses((prev) => prev.filter((c) => c.id !== id));
    } catch (error) {
      console.error("Failed to delete class:", error);
      alert("Unable to delete class. It may be in use.");
    }
  };

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) return <ClassListSkeleton />;

  return (
    <div className='class-list-container'>
      <div className='list-page-header'>
        <div className='header-title'>
          <HiCollection className='main-icon' />
          <div>
            <h2>Class Management</h2>
            <p>View and organize academic classes and sections</p>
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

      {showForm && (
        <div className='form-card-wrapper animate-slide'>
          <ClassForm
            onSuccess={() => {
              loadClasses();
              setShowForm(false);
            }}
          />
        </div>
      )}

      <div className='stats-row'>
        <div className='stat-card'>
          <HiViewGrid className='stat-icon' />
          <div className='stat-content'>
            <label>Total Classes</label>
            <h3>{classes.length}</h3>
          </div>
        </div>
      </div>

      <div className='table-card'>
        <div className='card-header'>
          <HiClipboardList />
          <h3>Class Directory</h3>
        </div>
        <table className='data-table'>
          <thead>
            <tr>
              <th>Class Name</th>
              <th>Section</th>
              <th>Academic Session</th>
              <th className='text-right'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.length > 0 ? (
              classes.map((cls) => (
                <tr key={cls.id}>
                  <td>
                    <div className='class-name-cell'>
                      <span className='class-avatar'>{cls.name.charAt(0)}</span>
                      <strong>{cls.name}</strong>
                    </div>
                  </td>
                  <td>
                    <span className='section-badge'>{cls.section || "N/A"}</span>
                  </td>
                  <td>{cls.session}</td>
                  <td className='actions-cell'>
                    <Link to={`/classes/${cls.id}`} className='view-btn'>
                      <HiEye /> View
                    </Link>
                    <button
                      className='delete-btn'
                      onClick={() => handleDelete(cls.id)}
                      title='Delete Class'
                    >
                      <HiTrash />
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan='4' className='empty-row'>
                  No classes found. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
