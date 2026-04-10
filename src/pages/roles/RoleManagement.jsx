/**
 * RoleManagement.jsx
 * Page for managing stored role definitions and assigning them to users.
 * Place in: src/pages/roles/RoleManagement.jsx
 * Route:    /roles
 */

import { useEffect, useMemo, useState } from "react";
import {
  archiveRoleDefinition,
  assignRole,
  deleteRoleDefinition,
  saveRoleDefinition,
  seedDefaultRoles,
  subscribeToRoles,
  subscribeToUsers,
} from "./userService";
import { useRole } from "../../hooks/useRole";
import { useAuth } from "../../context/AuthContext";
import {
  getAssignableRoleKeys,
  PERMISSION_GROUPS,
  PERMISSIONS,
  ROLE_META,
} from "../../config/permissions";
import RoleGuard from "../../components/common/RoleGuard";
import {
  HiArchive,
  HiCheckCircle,
  HiExclamationCircle,
  HiPencil,
  HiPlus,
  HiRefresh,
  HiSave,
  HiSearch,
  HiShieldCheck,
  HiTrash,
  HiUsers,
  HiX,
} from "react-icons/hi";
import { Bone } from "../../components/common/Skeleton";

const EMPTY_ROLE_FORM = {
  key: "",
  label: "",
  color: "#334155",
  bg: "#e2e8f0",
  permissions: [],
};

function toRoleKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function buildRoleForm(role) {
  if (!role) return { ...EMPTY_ROLE_FORM };

  return {
    key: role.key || "",
    label: role.label || "",
    color: role.color || "#334155",
    bg: role.bg || "#e2e8f0",
    permissions: Array.isArray(role.permissions) ? [...role.permissions] : [],
  };
}

function RoleBadge({ role, definition }) {
  const fallback = ROLE_META[role] || { label: role, color: "#64748b", bg: "#f1f5f9" };
  const meta = {
    label: definition?.label || fallback.label,
    color: definition?.color || fallback.color,
    bg: definition?.bg || fallback.bg,
  };

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

function RoleCard({ role, active, onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      style={{
        textAlign: "left",
        padding: "12px 14px",
        borderRadius: 12,
        border: active ? "1px solid #2563eb" : "1px solid #e2e8f0",
        background: active ? "#eff6ff" : "#fff",
        cursor: "pointer",
        opacity: role.archived ? 0.8 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <RoleBadge role={role.key} definition={role} />
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {role.archived && (
            <span style={{ fontSize: 11, color: "#9a3412", fontWeight: 700 }}>Archived</span>
          )}
          {role.protected && (
            <span style={{ fontSize: 11, color: "#92400e", fontWeight: 700 }}>Protected</span>
          )}
        </div>
      </div>
      <div style={{ fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 8 }}>
        {role.permissions?.length || 0} permissions
      </div>
      <div style={{ fontSize: 11, color: "var(--color-text-tertiary)", marginTop: 4 }}>
        {role.key}
      </div>
    </button>
  );
}

function RoleManagementInner() {
  const { user: authUser } = useAuth();
  const { role: myRole, can: hasPermission } = useRole();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingUid, setEditingUid] = useState(null);
  const [pendingAssignments, setPendingAssignments] = useState({});
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [savingRole, setSavingRole] = useState(false);
  const [seedingDefaults, setSeedingDefaults] = useState(false);
  const [selectedRoleKey, setSelectedRoleKey] = useState(null);
  const [isCreatingRole, setIsCreatingRole] = useState(false);
  const [roleForm, setRoleForm] = useState({ ...EMPTY_ROLE_FORM });
  const [roleFormDirty, setRoleFormDirty] = useState(false);
  const [toast, setToast] = useState(null);

  const rolesMap = useMemo(() => {
    return roles.reduce((acc, role) => {
      acc[role.key] = role;
      return acc;
    }, {});
  }, [roles]);

  const activeRoles = roles.filter((role) => !role.archived);
  const archivedRoles = roles.filter((role) => role.archived);
  const selectedRole = selectedRoleKey ? rolesMap[selectedRoleKey] : null;
  const assignedUserCount = selectedRole
    ? users.filter((user) => user.role === selectedRole.key).length
    : 0;
  const assignableRoleKeys = getAssignableRoleKeys(myRole, rolesMap);
  const canAssignRoles = hasPermission(PERMISSIONS.ASSIGN_ROLES);
  const canAssignHighRoles = hasPermission(PERMISSIONS.ASSIGN_HIGH_ROLES);
  const canEditSelectedRole = !selectedRole || canAssignHighRoles || !selectedRole.protected;
  const canArchiveSelectedRole =
    Boolean(selectedRole) && !selectedRole.system && !selectedRole.protected;
  const canDeleteSelectedRole =
    Boolean(selectedRole) && !selectedRole.system && assignedUserCount === 0;
  const canSeedDefaults = canAssignHighRoles;

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    setLoading(true);
    let usersLoaded = false;
    let rolesLoaded = false;

    const finishLoading = () => {
      if (usersLoaded && rolesLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeUsers = subscribeToUsers(
      (nextUsers) => {
        setUsers(nextUsers);
        usersLoaded = true;
        finishLoading();
      },
      () => {
        setUsers([]);
        usersLoaded = true;
        finishLoading();
        showToast("error", "Live user updates failed.");
      },
    );

    const unsubscribeRoles = subscribeToRoles(
      (nextRoles) => {
        setRoles(nextRoles);
        rolesLoaded = true;
        finishLoading();
      },
      () => {
        setRoles([]);
        rolesLoaded = true;
        finishLoading();
        showToast("error", "Live role updates failed.");
      },
    );

    return () => {
      unsubscribeUsers();
      unsubscribeRoles();
    };
  }, []);

  useEffect(() => {
    if (isCreatingRole) return;

    if (!selectedRoleKey) {
      const firstRole = activeRoles[0] || roles[0] || null;
      if (firstRole) {
        setSelectedRoleKey(firstRole.key);
      }
      return;
    }

    if (!rolesMap[selectedRoleKey]) {
      const fallbackRole = activeRoles[0] || roles[0] || null;
      setSelectedRoleKey(fallbackRole?.key || null);
    }
  }, [activeRoles, isCreatingRole, roles, rolesMap, selectedRoleKey]);

  useEffect(() => {
    if (isCreatingRole) {
      if (!roleFormDirty) {
        setRoleForm({ ...EMPTY_ROLE_FORM });
      }
      return;
    }

    if (!roleFormDirty) {
      setRoleForm(buildRoleForm(selectedRole));
    }
  }, [isCreatingRole, roleFormDirty, selectedRole]);

  const handleRoleSelect = (roleKey) => {
    setSelectedRoleKey(roleKey);
    setIsCreatingRole(false);
    setRoleFormDirty(false);
  };

  const handleNewRole = () => {
    setSelectedRoleKey(null);
    setIsCreatingRole(true);
    setRoleForm({ ...EMPTY_ROLE_FORM });
    setRoleFormDirty(false);
  };

  const handleRoleFormChange = (field, value) => {
    setRoleFormDirty(true);
    setRoleForm((prev) => {
      if (field === "label" && isCreatingRole) {
        return {
          ...prev,
          label: value,
          key: toRoleKey(value),
        };
      }

      if (field === "key") {
        return {
          ...prev,
          key: toRoleKey(value),
        };
      }

      return { ...prev, [field]: value };
    });
  };

  const togglePermission = (permissionKey) => {
    setRoleFormDirty(true);
    setRoleForm((prev) => {
      const selected = new Set(prev.permissions);
      if (selected.has(permissionKey)) {
        selected.delete(permissionKey);
      } else {
        selected.add(permissionKey);
      }

      return { ...prev, permissions: Array.from(selected) };
    });
  };

  const togglePermissionGroup = (groupPermissions) => {
    setRoleFormDirty(true);
    setRoleForm((prev) => {
      const selected = new Set(prev.permissions);
      const allSelected = groupPermissions.every((item) => selected.has(item.key));

      groupPermissions.forEach((item) => {
        if (allSelected) {
          selected.delete(item.key);
        } else {
          selected.add(item.key);
        }
      });

      return { ...prev, permissions: Array.from(selected) };
    });
  };

  const handleSaveRole = async () => {
    const roleKey = selectedRoleKey || toRoleKey(roleForm.key || roleForm.label);
    const label = roleForm.label.trim();
    const existingRole = selectedRoleKey ? rolesMap[selectedRoleKey] : rolesMap[roleKey];

    if (!label || !roleKey) {
      showToast("error", "Role name and role key are required.");
      return;
    }

    if (isCreatingRole && existingRole) {
      showToast("error", "A role with this key already exists.");
      return;
    }

    if (existingRole?.protected && !canAssignHighRoles) {
      showToast("error", "Only a super admin can change protected roles.");
      return;
    }

    setSavingRole(true);
    try {
      await saveRoleDefinition(
        roleKey,
        {
          key: roleKey,
          label,
          color: roleForm.color || "#334155",
          bg: roleForm.bg || "#e2e8f0",
          permissions: Array.from(new Set(roleForm.permissions)),
          protected: existingRole?.protected || false,
          system: existingRole?.system || false,
          archived: existingRole?.archived || false,
          createdAt: existingRole?.createdAt,
          archivedAt: existingRole?.archivedAt || null,
          archivedBy: existingRole?.archivedBy || null,
        },
        authUser.uid,
      );

      setSelectedRoleKey(roleKey);
      setIsCreatingRole(false);
      setRoleFormDirty(false);
      showToast("success", "Role saved successfully.");
    } catch {
      showToast("error", "Failed to save role.");
    } finally {
      setSavingRole(false);
    }
  };

  const handleArchiveToggle = async () => {
    if (!selectedRole || !canArchiveSelectedRole) {
      showToast("error", "Only custom roles can be archived.");
      return;
    }

    setSavingRole(true);
    try {
      await archiveRoleDefinition(selectedRole.key, !selectedRole.archived, authUser.uid);
      setRoleFormDirty(false);
      showToast(
        "success",
        selectedRole.archived ? "Role restored successfully." : "Role archived successfully.",
      );
    } catch {
      showToast("error", "Failed to change role archive status.");
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async () => {
    if (!selectedRole || !canDeleteSelectedRole) {
      showToast("error", "Only unused custom roles can be deleted.");
      return;
    }

    setSavingRole(true);
    try {
      await deleteRoleDefinition(selectedRole.key);
      setSelectedRoleKey(null);
      setIsCreatingRole(false);
      setRoleFormDirty(false);
      showToast("success", "Role deleted successfully.");
    } catch {
      showToast("error", "Failed to delete role.");
    } finally {
      setSavingRole(false);
    }
  };

  const handleSeedDefaults = async () => {
    if (!canSeedDefaults) {
      showToast("error", "Only a super admin can seed the default roles.");
      return;
    }

    setSeedingDefaults(true);
    try {
      await seedDefaultRoles(authUser.uid);
      showToast("success", "Default roles seeded to Firestore.");
    } catch {
      showToast("error", "Failed to seed default roles.");
    } finally {
      setSeedingDefaults(false);
    }
  };

  const startAssigningRole = (userId, currentRole) => {
    setEditingUid(userId);
    setPendingAssignments((prev) => ({ ...prev, [userId]: currentRole }));
  };

  const handleAssign = async (uid, currentRole) => {
    const nextRole = pendingAssignments[uid] || currentRole;

    if (!assignableRoleKeys.includes(nextRole)) {
      showToast("error", "You do not have permission to assign this role.");
      return;
    }

    setSavingAssignment(true);
    try {
      await assignRole(uid, nextRole, authUser.uid);
      setEditingUid(null);
      showToast("success", "User role updated successfully.");
    } catch {
      showToast("error", "Failed to update role.");
    } finally {
      setSavingAssignment(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return (
      (user.displayName || "").toLowerCase().includes(query) ||
      (user.email || "").toLowerCase().includes(query) ||
      (rolesMap[user.role]?.label || user.role || "").toLowerCase().includes(query)
    );
  });

  return (
    <div className='student-list-container'>
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

      <div className='list-page-header'>
        <div className='header-title'>
          <HiUsers className='main-icon' />
          <div>
            <h2>Role Management</h2>
            <p>
              Create roles, toggle permissions, save them to Firestore, then assign them to users.
            </p>
          </div>
        </div>
      </div>

      <div
        style={{
          background: "#eff6ff",
          border: "1px solid #bfdbfe",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13,
          color: "#1e40af",
          marginBottom: "1rem",
          lineHeight: 1.5,
        }}
      >
        <strong>Live updates:</strong> role definitions and user assignments refresh automatically
        from Firestore. Archived roles stay readable for existing users but are removed from new
        assignments.
      </div>

      <div
        style={{
          background: "#f8fafc",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "12px 16px",
          fontSize: 13,
          color: "#334155",
          marginBottom: "1.5rem",
          lineHeight: 1.5,
        }}
      >
        <strong>Roles you can assign:</strong>{" "}
        {assignableRoleKeys.length > 0
          ? assignableRoleKeys.map((roleKey) => rolesMap[roleKey]?.label || roleKey).join(", ")
          : "None"}
      </div>

      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 24 }}>
          <div className='table-card' style={{ padding: "1rem" }}>
            <Bone w={130} h={18} style={{ marginBottom: 12 }} />
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={`role-card-skel-${i}`}
                style={{
                  border: "1px solid var(--border-light,#e2e8f0)",
                  borderRadius: 12,
                  padding: "12px 14px",
                  marginBottom: 10,
                }}
              >
                <Bone w={88} h={20} r={99} />
                <Bone w={120} h={11} style={{ marginTop: 10 }} />
                <Bone w={95} h={10} style={{ marginTop: 6 }} />
              </div>
            ))}
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <div className='table-card' style={{ padding: "1.25rem" }}>
              <Bone w={180} h={18} style={{ marginBottom: 14 }} />
              <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
                <Bone w='100%' h={38} r={8} />
                <Bone w='100%' h={38} r={8} />
              </div>
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={`perm-group-skel-${i}`} style={{ marginBottom: 12 }}>
                  <Bone w={140} h={13} style={{ marginBottom: 8 }} />
                  <Bone w='100%' h={36} r={8} />
                </div>
              ))}
            </div>

            <div className='table-card' style={{ padding: "1.25rem" }}>
              <Bone w={190} h={18} style={{ marginBottom: 12 }} />
              <Bone w='100%' h={42} r={10} style={{ marginBottom: 12 }} />
              {Array.from({ length: 6 }).map((_, i) => (
                <Bone
                  key={`user-row-skel-${i}`}
                  w='100%'
                  h={34}
                  r={6}
                  style={{ marginBottom: 8 }}
                />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 360px) 1fr", gap: 24 }}>
          <div className='table-card' style={{ padding: "1rem" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16 }}>Saved roles</h3>
                <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-tertiary)" }}>
                  These role definitions are the ones that permission checks now use.
                </p>
              </div>
              <button
                type='button'
                className='btn-secondary'
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                onClick={handleNewRole}
              >
                <HiPlus /> New role
              </button>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {activeRoles.map((role) => (
                <RoleCard
                  key={role.key}
                  role={role}
                  active={!isCreatingRole && selectedRoleKey === role.key}
                  onClick={() => handleRoleSelect(role.key)}
                />
              ))}
            </div>

            {archivedRoles.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div
                  style={{
                    marginBottom: 10,
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-text-tertiary)",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}
                >
                  Archived roles
                </div>
                <div style={{ display: "grid", gap: 10 }}>
                  {archivedRoles.map((role) => (
                    <RoleCard
                      key={role.key}
                      role={role}
                      active={!isCreatingRole && selectedRoleKey === role.key}
                      onClick={() => handleRoleSelect(role.key)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: "grid", gap: 24 }}>
            <div className='table-card' style={{ padding: "1.25rem" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>
                    {isCreatingRole ? "Create role" : "Edit role"}
                  </h3>
                  <p
                    style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-tertiary)" }}
                  >
                    Toggle the permissions you want to save for this role.
                  </p>
                </div>
                <div
                  style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}
                >
                  <button
                    type='button'
                    className='btn-secondary'
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={handleSeedDefaults}
                    disabled={seedingDefaults || !canSeedDefaults}
                  >
                    <HiRefresh /> {seedingDefaults ? "Seeding..." : "Seed defaults"}
                  </button>
                  <button
                    type='button'
                    className='btn-primary'
                    style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                    onClick={handleSaveRole}
                    disabled={savingRole || !canEditSelectedRole}
                  >
                    <HiSave /> {savingRole ? "Saving..." : "Save role"}
                  </button>
                </div>
              </div>

              {!canEditSelectedRole && (
                <div
                  style={{
                    marginBottom: 16,
                    borderRadius: 10,
                    border: "1px solid #fed7aa",
                    background: "#fff7ed",
                    color: "#9a3412",
                    padding: "10px 12px",
                    fontSize: 12,
                  }}
                >
                  Only a super admin can change this protected role.
                </div>
              )}

              {selectedRole?.archived && (
                <div
                  style={{
                    marginBottom: 16,
                    borderRadius: 10,
                    border: "1px solid #fdba74",
                    background: "#fff7ed",
                    color: "#9a3412",
                    padding: "10px 12px",
                    fontSize: 12,
                  }}
                >
                  This role is archived. Existing users can still keep it, but it cannot be newly
                  assigned.
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
                <button
                  type='button'
                  className='btn-secondary'
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={handleArchiveToggle}
                  disabled={savingRole || !canArchiveSelectedRole}
                >
                  <HiArchive /> {selectedRole?.archived ? "Restore role" : "Archive role"}
                </button>
                <button
                  type='button'
                  className='btn-danger'
                  style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
                  onClick={handleDeleteRole}
                  disabled={savingRole || !canDeleteSelectedRole}
                >
                  <HiTrash /> Delete role
                </button>
                {!canDeleteSelectedRole &&
                  selectedRole &&
                  !selectedRole.system &&
                  assignedUserCount > 0 && (
                    <span
                      style={{
                        alignSelf: "center",
                        fontSize: 12,
                        color: "var(--color-text-tertiary)",
                      }}
                    >
                      Reassign {assignedUserCount} user{assignedUserCount === 1 ? "" : "s"} before
                      deleting.
                    </span>
                  )}
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 600 }}>
                  Role name
                  <input
                    type='text'
                    value={roleForm.label}
                    disabled={!canEditSelectedRole}
                    onChange={(e) => handleRoleFormChange("label", e.target.value)}
                    placeholder='Example: Bursar'
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 600 }}>
                  Role key
                  <input
                    type='text'
                    value={roleForm.key}
                    disabled={!isCreatingRole || !canEditSelectedRole}
                    onChange={(e) => handleRoleFormChange("key", e.target.value)}
                    placeholder='example_role'
                    style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 600 }}>
                  Badge text color
                  <input
                    type='color'
                    value={roleForm.color}
                    disabled={!canEditSelectedRole}
                    onChange={(e) => handleRoleFormChange("color", e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 42,
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                    }}
                  />
                </label>

                <label style={{ display: "grid", gap: 6, fontSize: 12, fontWeight: 600 }}>
                  Badge background
                  <input
                    type='color'
                    value={roleForm.bg}
                    disabled={!canEditSelectedRole}
                    onChange={(e) => handleRoleFormChange("bg", e.target.value)}
                    style={{
                      width: "100%",
                      minHeight: 42,
                      borderRadius: 10,
                      border: "1px solid #cbd5e1",
                    }}
                  />
                </label>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  background: "#f8fafc",
                  border: "1px solid #e2e8f0",
                  marginBottom: 16,
                }}
              >
                <HiShieldCheck style={{ width: 18, height: 18, color: "#1d4ed8" }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>Preview</div>
                  <div style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                    This is how the saved role will appear after you submit it to the database.
                  </div>
                </div>
                <div style={{ marginLeft: "auto" }}>
                  <RoleBadge
                    role={roleForm.key || roleForm.label || "new_role"}
                    definition={{
                      label: roleForm.label || "New Role",
                      color: roleForm.color,
                      bg: roleForm.bg,
                    }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                {PERMISSION_GROUPS.map((group) => {
                  const enabledCount = group.permissions.filter((item) =>
                    roleForm.permissions.includes(item.key),
                  ).length;

                  return (
                    <div
                      key={group.key}
                      style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "12px 14px",
                          background: "#f8fafc",
                          borderBottom: "1px solid #e2e8f0",
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{group.label}</div>
                          <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                            {enabledCount} of {group.permissions.length} enabled
                          </div>
                        </div>
                        <button
                          type='button'
                          className='action-link'
                          style={{
                            border: "none",
                            background: "none",
                            cursor: canEditSelectedRole ? "pointer" : "default",
                          }}
                          onClick={() => togglePermissionGroup(group.permissions)}
                          disabled={!canEditSelectedRole}
                        >
                          {enabledCount === group.permissions.length
                            ? "Clear group"
                            : "Enable group"}
                        </button>
                      </div>

                      <div style={{ display: "grid", gap: 1, background: "#e2e8f0" }}>
                        {group.permissions.map((permission) => {
                          const checked = roleForm.permissions.includes(permission.key);
                          return (
                            <label
                              key={permission.key}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 12,
                                padding: "12px 14px",
                                background: "#fff",
                                cursor: canEditSelectedRole ? "pointer" : "default",
                              }}
                            >
                              <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>
                                  {permission.label}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}>
                                  {permission.key}
                                </div>
                              </div>
                              <input
                                type='checkbox'
                                checked={checked}
                                disabled={!canEditSelectedRole}
                                onChange={() => togglePermission(permission.key)}
                                style={{ width: 18, height: 18 }}
                              />
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className='table-card'>
              <div
                style={{
                  padding: "1rem 1.25rem",
                  borderBottom: "1px solid var(--border-light, #f1f5f9)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: 16 }}>Assign roles to users</h3>
                  <p
                    style={{ margin: "4px 0 0", fontSize: 12, color: "var(--color-text-tertiary)" }}
                  >
                    Pick one of the saved roles and update the user document.
                  </p>
                </div>
                <div className='search-box' style={{ maxWidth: 320 }}>
                  <HiSearch className='search-icon' />
                  <input
                    type='text'
                    placeholder='Search name, email or role...'
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

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
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user) => {
                        const isMe = user.id === authUser?.uid;
                        const canEditUser =
                          canAssignRoles && !isMe && assignableRoleKeys.length > 0;
                        const isEditing = editingUid === user.id;
                        const selectedAssignment = pendingAssignments[user.id] || user.role;
                        const assignmentOptions = Array.from(
                          new Set([user.role, ...assignableRoleKeys]),
                        ).filter((roleKey) => rolesMap[roleKey]);

                        return (
                          <tr key={user.id}>
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
                                  {(user.displayName || user.email || "?")[0].toUpperCase()}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                                    {user.displayName || "-"}
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
                                  <div
                                    style={{ fontSize: 11, color: "var(--color-text-tertiary)" }}
                                  >
                                    {user.id?.slice(0, 8)}...
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td style={{ fontSize: 13, color: "var(--color-text-secondary)" }}>
                              {user.email}
                            </td>

                            <td>
                              {isEditing ? (
                                <select
                                  value={selectedAssignment}
                                  disabled={savingAssignment}
                                  autoFocus
                                  style={{
                                    padding: "5px 10px",
                                    borderRadius: 8,
                                    fontSize: 13,
                                    border: "1px solid #e2e8f0",
                                    background: "var(--color-background-primary)",
                                    color: "var(--color-text-primary)",
                                  }}
                                  onChange={(e) =>
                                    setPendingAssignments((prev) => ({
                                      ...prev,
                                      [user.id]: e.target.value,
                                    }))
                                  }
                                >
                                  {assignmentOptions.map((roleKey) => (
                                    <option key={roleKey} value={roleKey}>
                                      {rolesMap[roleKey]?.label || roleKey}
                                    </option>
                                  ))}
                                </select>
                              ) : (
                                <RoleBadge role={user.role} definition={rolesMap[user.role]} />
                              )}
                            </td>

                            <td style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                              {user.assignedBy ? user.assignedBy.slice(0, 8) + "..." : "System"}
                            </td>

                            <td className='text-center'>
                              {isEditing ? (
                                <div style={{ display: "inline-flex", gap: 8 }}>
                                  <button
                                    type='button'
                                    className='action-link'
                                    style={{
                                      border: "none",
                                      background: "none",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => handleAssign(user.id, user.role)}
                                    disabled={savingAssignment || selectedAssignment === user.role}
                                  >
                                    <HiSave /> Save
                                  </button>
                                  <button
                                    type='button'
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
                                </div>
                              ) : canEditUser ? (
                                <button
                                  type='button'
                                  className='action-link'
                                  style={{ border: "none", background: "none", cursor: "pointer" }}
                                  onClick={() => startAssigningRole(user.id, user.role)}
                                >
                                  <HiPencil /> Change role
                                </button>
                              ) : (
                                <span style={{ fontSize: 12, color: "var(--color-text-tertiary)" }}>
                                  {isMe ? "-" : "No permission"}
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
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RoleManagement() {
  return (
    <RoleGuard permission={PERMISSIONS.VIEW_ROLES}>
      <RoleManagementInner />
    </RoleGuard>
  );
}
