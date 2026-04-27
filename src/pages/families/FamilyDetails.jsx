import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getFamilyById } from "./familyService";
import { getStudentsByFamily } from "../students/studentService";
import { getEnrollmentsByFilter } from "../students/enrollmentService";
import { getPaymentsByFamily } from "../fees/paymentService";
import { getClasses } from "../classes/classService";
import StudentForm from "../../components/forms/StudentForm";
import { Bone } from "../../components/common/Skeleton";
import { getSettings } from "../settings/settingService";
import FamilyReceipt from "./FamilyReciept";
import { formatDate } from "../../utils/helpers";
import { getFeesByClass } from "../fees/feesService";
import { getStudentFeeOverrides } from "../students/studentFeeOverrideService";
import { getPreviousBalanceAmount } from "../previous_balance/Previousbalanceservice";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import Logo from "../../assets/logo.png";
import {
  HiArrowLeft,
  HiPhone,
  HiMail,
  HiUserAdd,
  HiAcademicCap,
  HiIdentification,
  HiCurrencyDollar,
  HiPrinter,
  HiDocumentText,
  HiX,
} from "react-icons/hi";

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function FamilyDetailsSkeleton() {
  return (
    <div className='details-container'>
      <div
        className='profile-header'
        style={{ justifyContent: "space-between", alignItems: "flex-start", minHeight: 140 }}
      >
        <div style={{ display: "flex", gap: "1.5rem", flex: 1, alignItems: "center" }}>
          <Bone w={80} h={80} r={18} />
          <div style={{ display: "flex", flexDirection: "column", gap: 14, width: "100%" }}>
            <Bone w='50%' h={24} />
            <Bone w='30%' h={18} />
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
              <Bone w={120} h={32} r={99} />
              <Bone w={120} h={32} r={99} />
              <Bone w={120} h={32} r={99} />
            </div>
          </div>
        </div>
        <Bone w={120} h={42} r={12} />
      </div>
      <div className='details-grid'>
        <div className='content-card'>
          <div className='card-header'>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Bone w={140} h={22} />
            </div>
            <Bone w={100} h={36} r={10} />
          </div>
          <div style={{ display: "grid", gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 16,
                  alignItems: "center",
                  padding: "1rem 0",
                  borderBottom: "1px solid var(--border-light,#f1f5f9)",
                }}
              >
                <Bone w='100%' h={18} />
                <Bone w='100%' h={18} />
                <Bone w='100%' h={18} />
              </div>
            ))}
          </div>
        </div>
        <div className='content-card'>
          <Bone w='60%' h={22} style={{ marginBottom: 16 }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
              <Bone w='40%' h={18} />
              <Bone w='30%' h={18} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function FamilyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useRole();

  const [family, setFamily] = useState(null);
  const [students, setStudents] = useState([]); // enriched with enrollment data
  const [payments, setPayments] = useState([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [classes, setClasses] = useState([]);
  const [settings, setSettings] = useState({});
  const [showReceipt, setShowReceipt] = useState(false);
  const [feesByStudent, setFeesByStudent] = useState({});
  const [prevByStudent, setPrevByStudent] = useState({});
  const [loading, setLoading] = useState(true);

  // ── Load ──────────────────────────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true);
    try {
      const appSettings = await getSettings();
      const session = appSettings?.academicYear;
      const term = appSettings?.currentTerm;

      if (!session || !term) {
        console.error("Missing session or term in settings:", appSettings);
        setLoading(false);
        return;
      }

      const [fam, studs, pays, cls] = await Promise.all([
        getFamilyById(id),
        getStudentsByFamily(id), // identity only — no session arg
        getPaymentsByFamily(id, session, term),
        getClasses(),
      ]);

      const studentIds = (studs || []).map((s) => s.id);

      // Fetch active enrollments for current session+term,
      // then filter to only this family's students client-side
      let enrMap = {};
      if (studentIds.length > 0) {
        const allEnrollments = await getEnrollmentsByFilter({ session, term });
        for (const e of allEnrollments || []) {
          if (studentIds.includes(e.studentId)) {
            enrMap[e.studentId] = e;
          }
        }
      }

      // Enrich student identity docs with current enrollment fields
      const enrichedStudents = (studs || []).map((s) => ({
        ...s,
        classId: enrMap[s.id]?.classId || null,
        session: enrMap[s.id]?.session || null,
        term: enrMap[s.id]?.term || null,
      }));

      // Build fee + previous balance maps
      const feeMap = {};
      const prevMap = {};

      for (const student of enrichedStudents) {
        if (!student.classId) {
          feeMap[student.id] = 0;
          prevMap[student.id] = 0;
          continue;
        }

        const [studentFees, overrides, prevBal] = await Promise.all([
          getFeesByClass(student.classId, session, term),
          getStudentFeeOverrides(student.id),
          getPreviousBalanceAmount(student.id, session),
        ]);

        const disabledFeeIds = new Set(overrides.map((o) => o.feeId));
        const termTotal = (studentFees || []).reduce(
          (sum, fee) => (disabledFeeIds.has(fee.id) ? sum : sum + Number(fee.amount)),
          0,
        );

        feeMap[student.id] = termTotal + prevBal;
        prevMap[student.id] = prevBal;
      }

      setFamily(fam);
      setStudents(enrichedStudents);
      setPayments(pays || []);
      setClasses(cls || []);
      setSettings(appSettings);
      setFeesByStudent(feeMap);
      setPrevByStudent(prevMap);
    } catch (error) {
      console.error("Failed to load family details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getClassName = (classId) => classes.find((c) => c.id === classId)?.name ?? "Not Assigned";

  const getStudentPaid = (studentId) =>
    payments.filter((p) => p.studentId === studentId).reduce((sum, p) => sum + Number(p.amount), 0);

  const familyTotalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const familyTotalFees = students.reduce((sum, s) => sum + (feesByStudent[s.id] || 0), 0);
  const familyBalance = familyTotalFees - familyTotalPaid;
  const totalArrears = students.reduce((sum, s) => sum + (prevByStudent[s.id] || 0), 0);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading || !family) return <FamilyDetailsSkeleton />;

  return (
    <div className='details-container'>
      <button className='back-btn' onClick={() => navigate(-1)}>
        <HiArrowLeft /> Back to List
      </button>

      {/* ── Profile Header ── */}
      <div className='profile-header'>
        <div className='family-badge'>{family.familyName.charAt(0)}</div>
        <div className='header-info'>
          <h1>{family.familyName} Family</h1>
          <div className='contact-pills'>
            <span className='pill'>
              <HiPhone /> {family.phone || "N/A"}
            </span>
            <span className='pill'>
              <HiMail /> {family.email || "N/A"}
            </span>
            {totalArrears > 0 && (
              <span
                className='pill'
                style={{ background: "#fef9c3", color: "#854d0e", border: "1px solid #fde68a" }}
              >
                ₦{totalArrears.toLocaleString()} in arrears
              </span>
            )}
          </div>
        </div>
        <button
          className='outline-btn'
          onClick={() => navigate(`/letters?context=family&id=${id}&template=fees`)}
        >
          <HiDocumentText /> Generate Letter
        </button>
      </div>

      <div className='details-grid'>
        {/* ── Students ── */}
        <div className='content-card students-section'>
          <div className='card-header'>
            <div className='title-row'>
              <HiAcademicCap className='icon' />
              <h3>Registered Students</h3>
            </div>
            {can(PERMISSIONS.CREATE_STUDENT) && (
              <button
                className={`action-btn ${showAddStudent ? "cancel" : "add"}`}
                onClick={() => setShowAddStudent((v) => !v)}
              >
                {showAddStudent ? (
                  "Cancel"
                ) : (
                  <>
                    <HiUserAdd /> Add Student
                  </>
                )}
              </button>
            )}
          </div>

          {showAddStudent && can(PERMISSIONS.CREATE_STUDENT) && (
            <div className='form-slide-down'>
              <StudentForm
                familyId={id}
                onSuccess={() => {
                  loadAll();
                  setShowAddStudent(false);
                }}
              />
            </div>
          )}

          <div className='student-list'>
            {students.length === 0 ? (
              <div className='empty-state'>
                <p>No students enrolled.</p>
              </div>
            ) : (
              students.map((student) => {
                const prevBal = prevByStudent[student.id] || 0;
                return (
                  <div key={student.id} className='student-item'>
                    <div className='student-avatar'>
                      <HiIdentification />
                    </div>
                    <div className='student-meta'>
                      <h4>
                        {student.firstName} {student.lastName}
                      </h4>
                      <p>
                        {student.session
                          ? `${student.session} • ${getClassName(student.classId)}`
                          : "Not enrolled this term"}
                      </p>
                      {prevBal > 0 && (
                        <span style={{ fontSize: 11, color: "#d97706", fontWeight: 600 }}>
                          ₦{prevBal.toLocaleString()} arrears
                        </span>
                      )}
                    </div>
                    <Link to={`/students/${student.id}`} className='text-link'>
                      View Record
                    </Link>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Financial Summary ── */}
        <div className='content-card summary-section'>
          <h3>{family.familyName} Family Financial Summary</h3>

          <div className='summary-item'>
            <label>Total Students</label>
            <span>{students.length}</span>
          </div>

          {totalArrears > 0 && (
            <div className='summary-item'>
              <label>Previous Arrears</label>
              <span style={{ color: "#d97706", fontWeight: 700 }}>
                ₦{totalArrears.toLocaleString()}
              </span>
            </div>
          )}

          <button className='print-btn' onClick={() => setShowReceipt(true)}>
            <HiPrinter /> Generate Full Receipt
          </button>

          <div className='summary-item'>
            <label>Total Paid</label>
            <span className='money'>
              <HiCurrencyDollar /> ₦{familyTotalPaid.toLocaleString()}
            </span>
          </div>

          <div className='summary-card'>
            {students.map((student) => {
              const studentPayments = payments.filter((p) => p.studentId === student.id);
              const totalPaid = studentPayments.reduce((sum, p) => sum + Number(p.amount), 0);
              const prevBal = prevByStudent[student.id] || 0;

              return (
                <div key={student.id} className='student-breakdown'>
                  <h3>
                    {student.firstName} {student.lastName}
                  </h3>
                  <table className='mini-table'>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Ref</th>
                        <th>Paid</th>
                      </tr>
                    </thead>
                    <tbody>
                      {prevBal > 0 && (
                        <tr style={{ background: "#fefce8" }}>
                          <td colSpan='2' style={{ color: "#854d0e", fontSize: 11 }}>
                            Previous balance (arrears)
                          </td>
                          <td style={{ color: "#d97706", fontWeight: 700 }}>
                            ₦{prevBal.toLocaleString()}
                          </td>
                        </tr>
                      )}
                      {studentPayments.map((p) => (
                        <tr key={p.id}>
                          <td>{formatDate(p.date)}</td>
                          <td>{p.method}</td>
                          <td>₦{p.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr>
                        <td colSpan='2'>Student Subtotal:</td>
                        <td>
                          <strong>₦{totalPaid.toLocaleString()}</strong>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })}
          </div>

          {showReceipt && (
            <div className='modal-overlay'>
              <div className='modal-content receipt-modal'>
                <button className='close-modal' onClick={() => setShowReceipt(false)}>
                  <HiX />
                </button>
                <FamilyReceipt
                  family={family}
                  students={students}
                  payments={payments}
                  settings={settings}
                  feesByStudent={feesByStudent}
                  prevByStudent={prevByStudent}
                  Logo={Logo}
                  onClose={() => setShowReceipt(false)}
                />
              </div>
            </div>
          )}

          <div className='summary-item'>
            <label>Total Outstanding</label>
            <span className='money danger'>₦{familyBalance.toLocaleString()}</span>
          </div>
          <div className='summary-item'>
            <label>Status</label>
            <span className='status-pill active'>Active</span>
          </div>
        </div>
      </div>
    </div>
  );
}
