import { useEffect, useRef, useState } from "react";
import { getFamilies, deleteFamily } from "./familyService";
import { getStudentsByFamily } from "../students/studentService";
import { getPaymentsByFamily } from "../fees/paymentService";
import { getFeesByClass } from "../fees/feesService";
import { getStudentFeeOverrides } from "../students/studentFeeOverrideService";
import { getPreviousBalanceAmount } from "../previous_balance/Previousbalanceservice";
import {
  getActiveDiscounts,
  getAssignmentsForFamily,
  getAssignmentsForStudent,
  computeStudentDiscount,
} from "../discount/Discountservice";
import { getSettings } from "../settings/settingService";
import FamilyForm from "../../components/forms/FamilyForm";
import { FamilyListSkeleton } from "../../components/common/Skeleton";
import { Link } from "react-router-dom";
import { HiOutlineUsers, HiChevronRight, HiPencilAlt, HiTrash } from "react-icons/hi";
import $ from "jquery";
import "datatables.net";

export default function FamilyList() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFamily, setEditingFamily] = useState(null);
  const [currentTerm, setCurrentTerm] = useState("");
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);

  const calculateFamilyFinancials = async (familyId, settings, activeDiscounts) => {
    const { academicYear, currentTerm } = settings;

    const [students, payments] = await Promise.all([
      getStudentsByFamily(familyId, academicYear),
      getPaymentsByFamily(familyId, academicYear, currentTerm),
    ]);

    // Family-level discount assignments (fetched once per family)
    const famAssignments = await getAssignmentsForFamily(familyId, academicYear);

    let totalAssessed = 0;

    for (const student of students) {
      const [classFees, overrides, prevBal, stuAssignments] = await Promise.all([
        getFeesByClass(student.classId, academicYear, currentTerm),
        getStudentFeeOverrides(student.id),
        getPreviousBalanceAmount(student.id, academicYear),
        getAssignmentsForStudent(student.id, academicYear),
      ]);

      const disabledFeeIds = new Set(overrides.map((o) => o.feeId));
      const effectiveFees = classFees.filter((f) => !disabledFeeIds.has(f.id));
      const termFees = effectiveFees.reduce((s, f) => s + Number(f.amount || 0), 0);

      const { totalDiscount } = computeStudentDiscount({
        studentId: student.id,
        familyId,
        session: academicYear,
        fees: effectiveFees,
        siblingCount: students.length,
        activeDiscounts,
        familyAssignments: famAssignments,
        studentAssignments: stuAssignments,
      });

      totalAssessed += Math.max(termFees + prevBal - totalDiscount, 0);
    }

    const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
    const outstanding = Math.max(totalAssessed - totalPaid, 0);

    let status = "Unpaid";
    if (totalPaid > 0 && outstanding === 0) status = "Paid";
    else if (totalPaid > 0) status = "Partial";

    return { totalAmount: totalAssessed, totalPaid, outstanding, status };
  };

  const loadFamilies = async () => {
    setLoading(true);
    try {
      const [basicFamilyData, settings] = await Promise.all([getFamilies(), getSettings()]);

      if (!settings?.academicYear || !settings?.currentTerm) {
        setFamilies(
          basicFamilyData.map((f) => ({
            ...f,
            totalAmount: 0,
            totalPaid: 0,
            outstanding: 0,
            status: "Unpaid",
          })),
        );
        return;
      }

      setCurrentTerm(settings.currentTerm);

      // Pre-load active discounts once for the session
      const activeDiscounts = await getActiveDiscounts(settings.academicYear);

      const fullData = await Promise.all(
        basicFamilyData.map(async (family) => {
          try {
            return {
              ...family,
              ...(await calculateFamilyFinancials(family.id, settings, activeDiscounts)),
            };
          } catch (err) {
            console.error(`Financials failed for ${family.id}:`, err);
            return { ...family, totalAmount: 0, totalPaid: 0, outstanding: 0, status: "Error" };
          }
        }),
      );

      setFamilies(fullData);
    } catch (err) {
      console.error("Error loading families:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFamilies();
  }, []);

  useEffect(() => {
    if (families.length === 0 || loading) return;
    if ($.fn.DataTable.isDataTable(tableRef.current)) $(tableRef.current).DataTable().destroy();
    dataTableRef.current = $(tableRef.current).DataTable({
      pageLength: 10,
      responsive: true,
      columnDefs: [{ orderable: false, targets: [-1] }],
      order: [[3, "desc"]],
    });
    return () => dataTableRef.current?.destroy(false);
  }, [families, loading]);

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  };

  if (loading) return <FamilyListSkeleton />;

  return (
    <div className='page-wrapper'>
      <FamilyForm
        initialData={editingFamily}
        onSuccess={() => {
          setEditingFamily(null);
          loadFamilies();
        }}
        onCancel={() => setEditingFamily(null)}
      />
      <div className='table-card'>
        {currentTerm && (
          <p
            style={{ marginBottom: "0.75rem", color: "var(--color-text-secondary)", fontSize: 13 }}
          >
            Showing <strong>{currentTerm}</strong> figures (incl. arrears, discounts applied).
          </p>
        )}
        <table ref={tableRef} className='data-table display'>
          <thead>
            <tr>
              <th>Family Name</th>
              <th>Contact</th>
              <th>Term Fees (net)</th>
              <th>Term Paid</th>
              <th>Outstanding</th>
              <th>Status</th>
              <th>Created</th>
              <th className='align-center'>Actions</th>
            </tr>
          </thead>
          <tbody>
            {families.map((family) => (
              <tr key={family.id}>
                <td>
                  <div className='family-cell'>
                    <HiOutlineUsers className='icon' />
                    <strong>{family.familyName}</strong>
                  </div>
                </td>
                <td>
                  <div className='contact-cell'>
                    <span>{family.phone}</span>
                    <br />
                    <small>{family.email}</small>
                  </div>
                </td>
                <td>₦{(family.totalAmount || 0).toLocaleString()}</td>
                <td className='text-success'>₦{(family.totalPaid || 0).toLocaleString()}</td>
                <td className={family.outstanding > 0 ? "text-danger" : "text-success"}>
                  ₦{(family.outstanding || 0).toLocaleString()}
                </td>
                <td>
                  <span className={`status-pill align-center ${family.status?.toLowerCase()}`}>
                    {family.status}
                  </span>
                </td>
                <td>{formatDate(family.createdAt)}</td>
                <td>
                  <div className='action-btn'>
                    <button onClick={() => setEditingFamily(family)} className='edit-btn'>
                      <HiPencilAlt />
                    </button>
                    <button
                      className='delete-btn'
                      onClick={() => {
                        if (window.confirm("Delete family?"))
                          deleteFamily(family.id).then(loadFamilies);
                      }}
                    >
                      <HiTrash />
                    </button>
                    <Link to={`/families/${family.id}`} className='view-link'>
                      <HiChevronRight />
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
