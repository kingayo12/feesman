import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAllStudents, deleteStudent } from "./studentService";
import { HiSearch, HiOutlineAcademicCap, HiEye, HiFilter, HiTrash } from "react-icons/hi";
import { filterData } from "../../utils/helpers";
import { getClasses } from "../classes/classService";
import { getFamilies } from "../families/familyService";
import { StudentListSkeleton } from "../../components/common/Skeleton";

export default function StudentList() {
  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    async function loadAllData() {
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
    }
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
                  <td className='actions-cell'>
                    <Link to={`/students/${student.id}`} className='action-link'>
                      <HiEye /> View
                    </Link>
                    <button
                      className='delete-btn'
                      onClick={() => handleDelete(student.id)}
                      title='Delete Student'
                    >
                      <HiTrash /> Delete
                    </button>
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
    </div>
  );
}
