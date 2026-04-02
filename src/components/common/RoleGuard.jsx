/**
 * RoleGuard.jsx
 * Place in: src/components/common/RoleGuard.jsx
 *
 * Blocks route access BEFORE the page component mounts.
 * Shows a spinner while the role is loading from Firestore,
 * then redirects to /dashboard if the role lacks permission.
 * The page component never renders — no data fetching happens.
 *
 * Usage in routes.jsx:
 *   <Route path="/reports" element={
 *     <ProtectedRoute>
 *       <RoleGuard permission={PERMISSIONS.VIEW_REPORTS}>
 *         <Reports />
 *       </RoleGuard>
 *     </ProtectedRoute>
 *   } />
 *
 * Usage to hide a button / element silently:
 *   <RoleGuard permission={PERMISSIONS.DELETE_STUDENT} silent>
 *     <button>Delete</button>
 *   </RoleGuard>
 */

import { Navigate } from "react-router-dom";
import { useRole } from "../../hooks/useRole";

export default function RoleGuard({
  permission,
  children,
  silent = false, // render nothing (no redirect) when denied — for inline UI
  redirectTo = "/dashboard",
}) {
  const { can, loading } = useRole();

  // While Firestore role is loading, render nothing so page doesn't flash
  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
        }}
      >
        <div className='spinner' />
      </div>
    );
  }

  // Access denied — redirect immediately, page never mounts
  if (!can(permission)) {
    if (silent) return null;
    return <Navigate to={redirectTo} replace />;
  }

  return children;
}
