import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { getFamilyById } from "./familyService";
import { getStudentsByFamily } from "../students/studentService";
import { getPaymentsByFamily } from "../fees/paymentService";
import { getClasses } from "../classes/classService";
import StudentForm from "../../components/forms/StudentForm";
import { getSettings } from "../settings/settingService";
import FamilyReceipt from "./FamilyReciept";
import { formatDate } from "../../utils/helpers";
import { getFeesByClass } from "../fees/feesService";
import { getStudentFeeOverrides } from "../students/studentFeeOverrideService";
import { getPreviousBalanceAmount } from "../previous_balance/Previousbalanceservice";
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
  HiX,
} from "react-icons/hi";

export default function FamilyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [family, setFamily] = useState(null);
  const [students, setStudents] = useState([]);
  const [payments, setPayments] = useState([]);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [classes, setClasses] = useState([]);
  const [settings, setSettings] = useState({});
  const [showReceipt, setShowReceipt] = useState(false);
  const [feesByStudent, setFeesByStudent] = useState({}); // term fees
  const [prevByStudent, setPrevByStudent] = useState({}); // previous balances

  const loadAll = async () => {
    const appSettings = await getSettings();
    const session = appSettings?.academicYear;
    const term = appSettings?.currentTerm;

    if (!session || !term) {
      console.error("Missing session or term in settings:", appSettings);
      return;
    }

    const [fam, studs, pays, cls] = await Promise.all([
      getFamilyById(id),
      getStudentsByFamily(id, session),
      getPaymentsByFamily(id, session, term),
      getClasses(),
    ]);

    const feeMap = {};
    const prevMap = {};

    for (const student of studs) {
      const [studentFees, overrides, prevBal] = await Promise.all([
        getFeesByClass(student.classId, session, term),
        getStudentFeeOverrides(student.id),
        getPreviousBalanceAmount(student.id, session), // ← fetch previous balance
      ]);

      const disabledFeeIds = new Set(overrides.map((o) => o.feeId));
      const termTotal = studentFees.reduce(
        (sum, fee) => (disabledFeeIds.has(fee.id) ? sum : sum + Number(fee.amount)),
        0,
      );

      feeMap[student.id] = termTotal + prevBal; // term fees + arrears
      prevMap[student.id] = prevBal;
    }

    setFeesByStudent(feeMap);
    setPrevByStudent(prevMap);
    setFamily(fam);
    setStudents(studs);
    setPayments(pays);
    setClasses(cls);
    setSettings(appSettings);
  };

  useEffect(() => {
    loadAll();
  }, [id]);

  const getClassName = (classId) => classes.find((c) => c.id === classId)?.name ?? "Not Assigned";

  const getStudentPaid = (studentId) =>
    payments.filter((p) => p.studentId === studentId).reduce((sum, p) => sum + Number(p.amount), 0);

  const getStudentBalance = (studentId) =>
    (feesByStudent[studentId] || 0) - getStudentPaid(studentId);

  const familyTotalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const familyTotalFees = students.reduce((sum, s) => sum + (feesByStudent[s.id] || 0), 0);
  const familyBalance = familyTotalFees - familyTotalPaid;

  const totalArrears = students.reduce((sum, s) => sum + (prevByStudent[s.id] || 0), 0);

  if (!family)
    return (
      <div className='loading-state'>
        <div className='spinner' />
      </div>
    );

  return (
    <div className='details-container'>
      <button className='back-btn' onClick={() => navigate(-1)}>
        <HiArrowLeft /> Back to List
      </button>

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
      </div>

      <div className='details-grid'>
        {/* Students */}
        <div className='content-card students-section'>
          <div className='card-header'>
            <div className='title-row'>
              <HiAcademicCap className='icon' />
              <h3>Registered Students</h3>
            </div>
            <button
              className={`action-btn ${showAddStudent ? "cancel" : "add"}`}
              onClick={() => setShowAddStudent(!showAddStudent)}
            >
              {showAddStudent ? (
                "Cancel"
              ) : (
                <>
                  <HiUserAdd /> Add Student
                </>
              )}
            </button>
          </div>

          {showAddStudent && (
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
                        {student.session} • {getClassName(student.classId)}
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

        {/* Family Summary */}
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
