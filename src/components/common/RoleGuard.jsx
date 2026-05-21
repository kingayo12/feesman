import { Navigate } from "react-router-dom";
import { useRole } from "../../hooks/useRole";

export default function RoleGuard({
  permission,
  children,
  silent = false,
  redirectTo = "/dashboard",
}) {
  const { can, loading } = useRole();

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
