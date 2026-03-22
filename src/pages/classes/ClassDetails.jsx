import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { getClassById } from "./classService";
import { getAllStudents } from "../students/studentService";
import { ClassDetailsSkeleton } from "../../components/common/Skeleton";
import { HiCollection, HiArrowLeft, HiOutlineAcademicCap } from "react-icons/hi";

export default function ClassDetails() {
  const { id } = useParams();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [cls, allStudents] = await Promise.all([getClassById(id), getAllStudents()]);
        setClassData(cls);
        setStudents((allStudents || []).filter((s) => s.classId === id));
      } catch (error) {
        console.error("Failed to load class details:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  // ── Skeleton ─────────────────────────────────────────────────────────────
  if (loading) return <ClassDetailsSkeleton />;

  if (!classData)
    return (
      <div className='empty-state'>
        <p>Class not found.</p>
        <Link to='/classes' className='back-link'>
          <HiArrowLeft /> Back to Classes
        </Link>
      </div>
    );

  return (
    <div className='class-details-container'>
      <div className='details-header'>
        <div className='header-left'>
          <HiCollection className='main-icon' />
          <div>
            <h2>{classData.name}</h2>
            <p>Class Details & Enrolled Students</p>
          </div>
        </div>
        <Link to='/classes' className='back-btn'>
          <HiArrowLeft /> Back
        </Link>
      </div>

      <div className='details-grid'>
        {[
          { label: "Class Name", value: classData.name },
          { label: "Section", value: classData.section || "N/A" },
          { label: "Academic Session", value: classData.session },
          { label: "Total Students", value: students.length },
        ].map(({ label, value }) => (
          <div key={label} className='info-card'>
            <label>{label}</label>
            <h3>{value}</h3>
          </div>
        ))}
      </div>

      <div className='table-card'>
        <div className='card-header'>
          <HiOutlineAcademicCap />
          <h3>Students in this Class</h3>
        </div>
        <table className='data-table'>
          <thead>
            <tr>
              <th>Student Name</th>
              <th>Session</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {students.length > 0 ? (
              students.map((student) => (
                <tr key={student.id}>
                  <td>
                    {student.firstName} {student.lastName}
                  </td>
                  <td>{student.session}</td>
                  <td>
                    <span className='status-badge active'>{student.status || "Active"}</span>
                  </td>
                  <td>
                    <Link to={`/students/${student.id}`} className='action-link'>
                      View
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan='4' className='empty-row'>
                  No students assigned to this class.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
