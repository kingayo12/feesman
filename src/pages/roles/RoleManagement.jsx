/**
 * RoleManagement.jsx
 * Page for super_admin, admin, and it_admin to assign roles to users.
 * Place in: src/pages/roles/RoleManagement.jsx
 * Route:    /roles
 */

import { useEffect, useState } from "react";
import { getAllUsers, assignRole } from "./userService";
import { useRole } from "../../hooks/useRole";
import { useAuth } from "../../context/AuthContext";
import { ASSIGNABLE_ROLES, ROLE_META, PERMISSIONS } from "../../config/permissions";
import RoleGuard from "../../components/common/RoleGuard";
import {
  HiUsers,
  HiCheckCircle,
  HiExclamationCircle,
  HiSearch,
  HiPencil,
  HiX,
} from "react-icons/hi";

function RoleBadge({ role }) {
  const meta = ROLE_META[role] || { label: role, color: "#64748b", bg: "#f1f5f9" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: 99,
        fontSize: 11,
        fontWeight: 700,
        background: meta.bg,
        color: meta.color,
        border: `1px solid ${meta.color}33`,
      }}
    >
      {meta.label}
    </span>
  );
}

function RoleManagementInner() {
  const { user: authUser } = useAuth();
  const { role: myRole } = useRole();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUid, setEditingUid] = useState(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const assignable = ASSIGNABLE_ROLES[myRole] || [];

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await getAllUsers());
    } catch (err) {
      showToast("error", "Failed to load users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAssign = async (uid, newRole) => {
    if (!assignable.includes(newRole)) {
      showToast("error", "You do not have permission to assign this role.");
      return;
    }
    setSaving(true);
    try {
      await assignRole(uid, newRole, authUser.uid);
      setUsers((prev) => prev.map((u) => (u.id === uid ? { ...u, role: newRole } : u)));
      setEditingUid(null);
      showToast("success", "Role updated successfully.");
    } catch (err) {
      showToast("error", "Failed to update role.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.displayName || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.role || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className='student-list-container'>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: "1.25rem",
            right: "1.25rem",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 16px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            background: toast.type === "success" ? "#dcfce7" : "#fee2e2",
            color: toast.type === "success" ? "#166534" : "#991b1b",
            border: `1px solid ${toast.type === "success" ? "#bbf7d0" : "#fecaca"}`,
            boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
          }}
        >
          {toast.type === "success" ? (
            <HiCheckCircle style={{ width: 16, height: 16 }} />
          ) : (
            <HiExclamationCircle style={{ width: 16, height: 16 }} />
          )}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div className='list-page-header'>
        <div className='header-title'>
          <HiUsers className='main-icon' />
          <div>
            <h2>Role Management</h2>
            <p>
              Assign and manage user roles · Your role: <RoleBadge role={myRole} />
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13,
          color: "#1e40af",
          marginBottom: "1.5rem",
          lineHeight: 1.5,
        }}
      >
        <strong>Roles you can assign:</strong>{" "}
        {assignable.length > 0
          ? assignable.map((r) => ROLE_META[r]?.label || r).join(", ")
          : "None — contact a super admin to change roles."}
      </div>

      {/* Table card */}
      <div className='table-card'>
        <div
          style={{
            padding: "1rem 1.25rem",
            borderBottom: "1px solid var(--border-light, #f1f5f9)",
          }}
        >
          <div className='search-box' style={{ maxWidth: 320 }}>
            <HiSearch className='search-icon' />
            <input
              type='text'
              placeholder='Search name, email or role…'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "3rem", textAlign: "center" }}>
            <div className='spinner' />
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className='data-table'>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Current Role</th>
                  <th>Assigned By</th>
                  <th className='text-center'>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 ? (
                  filtered.map((u) => {
                    const isMe = u.id === authUser?.uid;
                    const canEdit = !isMe && assignable.length > 0;
                    const isEditing = editingUid === u.id;

                    return (
                      <tr key={u.id}>
                        {/* Avatar + name */}
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div
                              style={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                background: "#eff6ff",
                                color: "#1d4ed8",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                fontWeight: 700,
                                flexShrink: 0,
                              }}
                            >
                              {(u.displayName || u.email || "?")[0].toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>
                                {u.displayName || "—"}
                                {isMe && (
                                  <span
                                    style={{
                                      marginLeft: 6,
                                      fontSize: 10,
                                      color: "#64748b",
                                      fontWeight: 400,
                                    }}
                                  >
                                    (you)
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                                {u.id?.slice(0, 8)}…
                              </div>
                            </div>
                          </div>
                        </td>

                        <td style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                          {u.email}
                        </td>

                        {/* Current role or inline selector */}
                        <td>
                          {isEditing ? (
                            <select
                              defaultValue={u.role}
                              disabled={saving}
                              autoFocus
                              style={{
                                padding: "5px 10px",
                                borderRadius: 8,
                                fontSize: 13,
                                border: "1px solid #e2e8f0",
                                background: "var(--color-background-primary)",
                                color: "var(--color-text-primary)",
                              }}
                              onChange={(e) => handleAssign(u.id, e.target.value)}
                            >
                              <option value={u.role} disabled>
                                {ROLE_META[u.role]?.label || u.role} (current)
                              </option>
                              {assignable
                                .filter((r) => r !== u.role)
                                .map((r) => (
                                  <option key={r} value={r}>
                                    {ROLE_META[r]?.label || r}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <RoleBadge role={u.role} />
                          )}
                        </td>

                        <td style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                          {u.assignedBy ? u.assignedBy.slice(0, 8) + "…" : "System"}
                        </td>

                        {/* Actions */}
                        <td className='text-center'>
                          {isEditing ? (
                            <button
                              className='action-link'
                              style={{
                                border: "none",
                                background: "none",
                                cursor: "pointer",
                                color: "#dc2626",
                              }}
                              onClick={() => setEditingUid(null)}
                            >
                              <HiX /> Cancel
                            </button>
                          ) : canEdit ? (
                            <button
                              className='action-link'
                              style={{ border: "none", background: "none", cursor: "pointer" }}
                              onClick={() => setEditingUid(u.id)}
                            >
                              <HiPencil /> Change role
                            </button>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                              {isMe ? "—" : "No permission"}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan='5' className='empty-row'>
                      {search ? `No users matching "${search}"` : "No users found."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Wrap in RoleGuard so only permitted roles can access
export default function RoleManagement() {
  return (
    <RoleGuard permission={PERMISSIONS.VIEW_ROLES}>
      <RoleManagementInner />
    </RoleGuard>
  );
}
