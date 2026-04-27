import { useEffect, useRef, useState } from "react";
import { getFamilies, deleteFamily } from "./familyService";
import CustomButton from "../../components/common/CustomButton";
import { filterData } from "../../utils/helpers";
import CustomSelect from "../../components/common/SelectInput";
import { computeStudentDiscount } from "../discount/Discountservice";
import { getSettings } from "../settings/settingService";
import FamilyForm from "../../components/forms/FamilyForm";
import { FamilyListSkeleton } from "../../components/common/Skeleton";
import { useRole } from "../../hooks/useRole";
import { PERMISSIONS } from "../../config/permissions";
import {
  preCacheFamilyData,
  getCachedStudentsByFamily,
  getCachedPaymentsByFamily,
  getCachedFeesByClass,
  getCachedDiscounts,
  getCachedStudentFeeOverrides,
  getCachedPreviousBalanceAmount,
  getCachedAssignmentsForFamily,
  getCachedAssignmentsForStudent,
  clearMemoryCache,
} from "../../utils/offlineDataManager";
import {
  HiOutlineUsers,
  HiPencilAlt,
  HiTrash,
  HiFilter,
  HiSearch,
  HiArrowRight,
} from "react-icons/hi";
import TableToolbar from "../../components/common/TableToolbar";
import $ from "jquery";
import "datatables.net";
import { ConfirmModal, FormModal } from "../../components/common/Modal";
import { createRoot } from "react-dom/client";

export default function FamilyList() {
  const [families, setFamilies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingFamily, setEditingFamily] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentTerm, setCurrentTerm] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const tableRef = useRef(null);
  const dataTableRef = useRef(null);
  const actionRootsRef = useRef([]);
  const { can } = useRole();

  const formatDate = (ts) => {
    if (!ts) return "—";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString("en-NG", { year: "numeric", month: "short", day: "numeric" });
  };

  // ── Financial calculation per family ──────────────────────────────────────
  //
  // getCachedStudentsByFamily(familyId, academicYear) returns students already
  // enriched with classId/session/term from studentEnrollments — so we never
  // read student.classId from the identity doc directly.
  //
  // We still pass currentTerm when picking classId so we only use the enrollment
  // that matches the term being displayed.
  //
  const calculateFamilyFinancials = async (familyId, settings, activeDiscounts) => {
    const { academicYear, currentTerm } = settings;

    try {
      // Returns students enriched with classId/session/term from enrollments
      // The cache key includes academicYear so data is session-scoped
      const students = await getCachedStudentsByFamily(familyId, academicYear);

      if (!students?.length) {
        return { totalAmount: 0, totalPaid: 0, outstanding: 0, status: "Unpaid" };
      }

      const [payments, famAssignments] = await Promise.all([
        getCachedPaymentsByFamily(familyId, academicYear, currentTerm),
        getCachedAssignmentsForFamily(familyId, academicYear),
      ]);

      let totalAssessed = 0;

      for (const student of students) {
        try {
          // classId comes from the enrollment doc (already enriched by cache)
          // Only use it if the enrollment term matches the current term
          const classId = student.classId && student.term === currentTerm ? student.classId : null;

          const [classFees, overrides, prevBal, stuAssignments] = await Promise.all([
            classId
              ? getCachedFeesByClass(classId, academicYear, currentTerm)
              : Promise.resolve([]),
            getCachedStudentFeeOverrides(student.id),
            getCachedPreviousBalanceAmount(student.id, academicYear),
            getCachedAssignmentsForStudent(student.id, academicYear),
          ]);

          const disabledFeeIds = new Set(overrides?.map((o) => o.feeId) || []);
          const effectiveFees = (classFees || []).filter((f) => !disabledFeeIds.has(f.id));
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

          totalAssessed += Math.max(termFees + (prevBal || 0) - (totalDiscount || 0), 0);
        } catch (studentErr) {
          console.warn(`Student calculation error for ${student.id}:`, studentErr);
        }
      }

      const totalPaid = (payments || []).reduce((s, p) => s + Number(p.amount || 0), 0);
      const outstanding = Math.max(totalAssessed - totalPaid, 0);

      let status = "Unpaid";
      if (totalPaid > 0 && outstanding === 0) status = "Paid";
      else if (totalPaid > 0) status = "Partial";

      return { totalAmount: totalAssessed, totalPaid, outstanding, status };
    } catch (err) {
      console.error(`Financials calculation failed for ${familyId}:`, err);
      return { totalAmount: 0, totalPaid: 0, outstanding: 0, status: "Unpaid" };
    }
  };

  // ── Load ──────────────────────────────────────────────────────────────────
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

      // Pre-cache all family data concurrently
      await Promise.allSettled(
        basicFamilyData.map((f) =>
          preCacheFamilyData(f.id, settings.academicYear, settings.currentTerm).catch((e) => {
            console.warn(`Pre-cache failed for family ${f.id}:`, e);
            return { success: false };
          }),
        ),
      );

      const activeDiscounts = await getCachedDiscounts(settings.academicYear);

      // Calculate financials for all families concurrently
      const fullData = await Promise.all(
        basicFamilyData.map(async (family) => {
          try {
            return {
              ...family,
              ...(await calculateFamilyFinancials(family.id, settings, activeDiscounts)),
            };
          } catch (err) {
            console.error(`Financials failed for ${family.id}:`, err);
            return { ...family, totalAmount: 0, totalPaid: 0, outstanding: 0, status: "Unpaid" };
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
    return () => {
      clearMemoryCache();
    };
  }, []);

  // ── DataTables action root cleanup ────────────────────────────────────────
  //
  // root.unmount() must NEVER be called synchronously during a React render
  // cycle — defer to next macrotask via setTimeout.
  //
  const cleanupActionRoots = () => {
    const roots = actionRootsRef.current;
    actionRootsRef.current = [];
    if (roots.length === 0) return;
    setTimeout(() => {
      roots.forEach((root) => {
        try {
          root.unmount();
        } catch (_) {}
      });
    }, 0);
  };

  // ── DataTables setup ──────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || !tableRef.current) return;

    const filteredFamilies = filterData(families, searchQuery, [
      "familyName",
      "phone",
      "email",
      "status",
    ]).filter(
      (family) => !statusFilter || family.status?.toLowerCase() === statusFilter.toLowerCase(),
    );

    // Destroy existing instance before rebuilding
    if ($.fn.DataTable.isDataTable(tableRef.current)) {
      cleanupActionRoots();
      $(tableRef.current).DataTable().destroy();
      $(tableRef.current).find("tbody").empty();
    }

    const rows = filteredFamilies.map((family) => [
      `<div class="family-cell"><strong>${family.familyName ?? ""}</strong></div>`,
      `<div class="contact-cell"><span>${family.phone ?? ""}</span><br/><small>${family.email ?? ""}</small></div>`,
      `₦${(family.totalAmount || 0).toLocaleString()}`,
      `₦${(family.totalPaid || 0).toLocaleString()}`,
      `₦${(family.outstanding || 0).toLocaleString()}`,
      `<span class="status-pill align-center ${(family.status ?? "").toLowerCase()}">${family.status ?? ""}</span>`,
      formatDate(family.createdAt),
      `<div class="action-btn" data-family-id="${family.id}"></div>`,
    ]);

    const dt = $(tableRef.current).DataTable({
      pageLength: 10,
      responsive: true,
      searching: false,
      info: true,
      lengthChange: false,
      data: rows,
      columns: [
        { title: "Family Name" },
        { title: "Contact" },
        { title: "Term Fees (net)" },
        { title: "Term Paid", className: "text-success" },
        { title: "Outstanding" },
        { title: "Status" },
        { title: "Created" },
        { title: "Actions", orderable: false, className: "align-center" },
      ],
      order: [[3, "desc"]],
    });

    dataTableRef.current = dt;

    // Mount React action buttons into each row's placeholder div
    const mountActionButtons = () => {
      cleanupActionRoots();
      $(tableRef.current)
        .find("tbody [data-family-id]")
        .each(function () {
          const familyId = $(this).attr("data-family-id");
          const family = filteredFamilies.find((f) => f.id === familyId);
          if (!family) return;

          const root = createRoot(this);
          actionRootsRef.current.push(root);

          root.render(
            <>
              <a href={`/families/${family.id}`} className='view-btn'>
                <HiArrowRight /> View
              </a>
              {can(PERMISSIONS.EDIT_FAMILY) && (
                <button
                  onClick={() => {
                    setEditingFamily(family);
                    setModalOpen(true);
                  }}
                  className='edit-btn'
                >
                  <HiPencilAlt />
                </button>
              )}
              {can(PERMISSIONS.DELETE_FAMILY) && (
                <button className='delete-btn' onClick={() => setDeleteTarget(family)}>
                  <HiTrash />
                </button>
              )}
            </>,
          );
        });
    };

    dt.on("draw", mountActionButtons);
    mountActionButtons();

    return () => {
      dt.off("draw", mountActionButtons);
      cleanupActionRoots();
      try {
        if ($.fn.DataTable.isDataTable(tableRef.current)) dt.destroy();
      } catch (_) {}
    };
  }, [families, searchQuery, statusFilter, loading]);

  // ── Export ────────────────────────────────────────────────────────────────
  const filteredFamilies = filterData(families, searchQuery, [
    "familyName",
    "phone",
    "email",
    "status",
  ]);

  const exportHeaders = [
    "Family Name",
    "Contact",
    "Term Fees",
    "Term Paid",
    "Outstanding",
    "Status",
    "Created",
  ];
  const exportRows = families.map((family) => [
    family.familyName,
    [family.phone, family.email].filter(Boolean).join(" "),
    family.totalAmount || 0,
    family.totalPaid || 0,
    family.outstanding || 0,
    family.status || "",
    formatDate(family.createdAt),
  ]);

  // ── Render ────────────────────────────────────────────────────────────────
  if (loading) return <FamilyListSkeleton />;

  return (
    <div className='page-wrapper'>
      <div className='list-page-header'>
        <div className='header-title'>
          <HiOutlineUsers className='main-icon' />
          <div>
            <h2>Family Directory</h2>
            <p>Manage and view all enrolled families</p>
          </div>
        </div>
        <div className='header-stats'>
          <span className='stat-pill'>Total: {filteredFamilies.length}</span>
        </div>
      </div>

      {/* ── Add Family ── */}
      <div className='add_button'>
        {can(PERMISSIONS.CREATE_FAMILY) && (
          <CustomButton
            onClick={() => {
              setEditingFamily(null);
              setModalOpen(true);
            }}
            icon={<HiOutlineUsers />}
            variant='primary'
            otherClass='rounded-full'
          >
            Add Family
          </CustomButton>
        )}
      </div>

      {/* ── Family Form Modal ── */}
      {modalOpen && (
        <FormModal
          title={editingFamily ? "Edit Family Profile" : "Register New Family"}
          onClose={() => {
            setModalOpen(false);
            setEditingFamily(null);
          }}
        >
          <FamilyForm
            initialData={editingFamily}
            onSuccess={async () => {
              await loadFamilies();
              setModalOpen(false);
              setEditingFamily(null);
            }}
            onCancel={() => {
              setModalOpen(false);
              setEditingFamily(null);
            }}
          />
        </FormModal>
      )}

      {/* ── Search + Filter ── */}
      <div className='table-controls'>
        <div className='search-box'>
          <HiSearch className='search-icon' />
          <input
            type='text'
            placeholder='Search by name, phone, email or status...'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <CustomSelect
          value={statusFilter}
          placeholder='All Status'
          options={[
            { label: "All Status", value: "" },
            { label: "Paid", value: "Paid" },
            { label: "Partial", value: "Partial" },
            { label: "Unpaid", value: "Unpaid" },
            { label: "Error", value: "Error" },
          ]}
          onChange={(e) => setStatusFilter(e.target.value)}
          icon={<HiFilter />}
          variant='filter-btn'
        />
      </div>

      {/* ── Table ── */}
      <div className='table-card'>
        {currentTerm && (
          <p
            style={{ marginBottom: "0.75rem", color: "var(--color-text-secondary)", fontSize: 13 }}
          >
            Showing <strong>{currentTerm}</strong> figures (incl. arrears, discounts applied).
          </p>
        )}

        <TableToolbar fileName='families' headers={exportHeaders} rows={exportRows} />

        {/*
          tbody is intentionally left empty.
          DataTables fully owns row rendering via the `data` option.
          React only mounts action buttons into placeholder divs after each draw.
        */}
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
          <tbody />
        </table>

        {/* ── Delete Confirm ── */}
        {deleteTarget && (
          <ConfirmModal
            entityName={`family (${deleteTarget?.familyName})`}
            loading={deleting}
            onClose={() => !deleting && setDeleteTarget(null)}
            onConfirm={async () => {
              setDeleting(true);
              try {
                await deleteFamily(deleteTarget.id);
                await loadFamilies();
                setDeleteTarget(null);
              } catch (err) {
                console.error("Delete failed", err);
              } finally {
                setDeleting(false);
              }
            }}
          />
        )}
      </div>
    </div>
  );
}
