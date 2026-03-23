/**
 * RoleGuard.jsx
 * Place in: src/components/common/RoleGuard.jsx
 *
 * Usage — protect a route:
 *   <RoleGuard permission={PERMISSIONS.VIEW_REPORTS}>
 *     <Reports />
 *   </RoleGuard>
 *
 * Usage — hide a button:
 *   <RoleGuard permission={PERMISSIONS.DELETE_STUDENT} silent>
 *     <button>Delete</button>
 *   </RoleGuard>
 *
 * Props:
 *   permission  string       — required permission key
 *   silent      boolean      — if true, render nothing (not an error page) when denied
 *   redirect    string       — redirect to this path instead of showing error (optional)
 */

import { Navigate } from "react-router-dom";
import { useRole } from "../../hooks/useRole";
import { HiLockClosed } from "react-icons/hi";

export default function RoleGuard({ permission, children, silent = false, redirect }) {
  const { role, can, loading } = useRole();

  if (loading) return null;

  if (!can(permission)) {
    if (silent) return null;
    if (redirect) return <Navigate to={redirect} replace />;
    return <AccessDenied role={role} permission={permission} />;
  }

  return children;
}

function AccessDenied({ role }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "60vh",
        gap: "1rem",
        color: "var(--color-text-secondary)",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "#fee2e2",
          color: "#dc2626",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <HiLockClosed style={{ width: 24, height: 24 }} />
      </div>
      <h2 style={{ margin: 0, fontSize: "1.25rem", color: "var(--color-text-primary)" }}>
        Access denied
      </h2>
      <p style={{ margin: 0, maxWidth: 360, fontSize: 14 }}>
        Your current role <strong style={{ color: "var(--color-text-primary)" }}>({role})</strong>{" "}
        does not have permission to view this page. Contact your administrator to request access.
      </p>
    </div>
  );
}
