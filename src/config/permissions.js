/**
 * permissions.js
 * Single source of truth for RBAC.
 * Place in: src/config/permissions.js
 *
 * How it works:
 *  1. When a user registers, AuthContext writes role: "user" to Firestore users/{uid}.
 *  2. useRole() hook reads that role and exposes can(permission) helper.
 *  3. Every page / button checks can() before rendering.
 *  4. RoleGuard component wraps routes — redirects if role lacks the permission.
 */

// ── Role definitions (ordered highest → lowest) ───────────────────────────
export const ROLES = {
  super_admin: "super_admin",
  admin: "admin",
  it_admin: "it_admin",
  admin_officer: "admin_officer",
  accountant: "accountant",
  user: "user",
};

// ── Role display metadata ─────────────────────────────────────────────────
export const ROLE_META = {
  super_admin: { label: "Super Admin", color: "#7c3aed", bg: "#ede9fe" },
  admin: { label: "Admin", color: "#1d4ed8", bg: "#dbeafe" },
  it_admin: { label: "IT Admin", color: "#0369a1", bg: "#e0f2fe" },
  admin_officer: { label: "Admin Officer", color: "#0f766e", bg: "#ccfbf1" },
  accountant: { label: "Accountant", color: "#15803d", bg: "#dcfce7" },
  user: { label: "User", color: "#64748b", bg: "#f1f5f9" },
};

// ── Permissions ────────────────────────────────────────────────────────────
// Each is a string key — add new ones here as features grow.
export const PERMISSIONS = {
  // Dashboard
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_FULL_DASHBOARD: "view_full_dashboard",

  // Families
  VIEW_FAMILIES: "view_families",
  CREATE_FAMILY: "create_family",
  EDIT_FAMILY: "edit_family",
  DELETE_FAMILY: "delete_family",

  // Students
  VIEW_STUDENTS: "view_students",
  CREATE_STUDENT: "create_student",
  EDIT_STUDENT: "edit_student",
  DELETE_STUDENT: "delete_student",

  // Classes
  VIEW_CLASSES: "view_classes",
  CREATE_CLASS: "create_class",
  EDIT_CLASS: "edit_class",
  DELETE_CLASS: "delete_class",

  // Fees
  VIEW_FEES: "view_fees",
  CREATE_FEE: "create_fee",
  EDIT_FEE: "edit_fee",
  DELETE_FEE: "delete_fee",

  // Payments
  VIEW_PAYMENTS: "view_payments",
  RECORD_PAYMENT: "record_payment",
  DELETE_PAYMENT: "delete_payment",

  // Reports
  VIEW_REPORTS: "view_reports",
  VIEW_LETTERS: "view_letters",

  // Previous balances
  VIEW_BALANCES: "view_balances",
  EDIT_BALANCES: "edit_balances",

  // Discounts
  VIEW_DISCOUNTS: "view_discounts",
  MANAGE_DISCOUNTS: "manage_discounts",

  // Settings
  VIEW_SETTINGS: "view_settings",
  EDIT_SETTINGS: "edit_settings",
  DANGER_ZONE: "danger_zone",

  // Role management
  VIEW_ROLES: "view_roles",
  ASSIGN_ROLES: "assign_roles",
  ASSIGN_HIGH_ROLES: "assign_high_roles", // super_admin / admin / it_admin
};

export const PERMISSION_GROUPS = [
  {
    key: "dashboard",
    label: "Dashboard",
    permissions: [
      { key: PERMISSIONS.VIEW_DASHBOARD, label: "View dashboard" },
      { key: PERMISSIONS.VIEW_FULL_DASHBOARD, label: "View full dashboard" },
    ],
  },
  {
    key: "families",
    label: "Families",
    permissions: [
      { key: PERMISSIONS.VIEW_FAMILIES, label: "View families" },
      { key: PERMISSIONS.CREATE_FAMILY, label: "Create family" },
      { key: PERMISSIONS.EDIT_FAMILY, label: "Edit family" },
      { key: PERMISSIONS.DELETE_FAMILY, label: "Delete family" },
    ],
  },
  {
    key: "students",
    label: "Students",
    permissions: [
      { key: PERMISSIONS.VIEW_STUDENTS, label: "View students" },
      { key: PERMISSIONS.CREATE_STUDENT, label: "Create student" },
      { key: PERMISSIONS.EDIT_STUDENT, label: "Edit student" },
      { key: PERMISSIONS.DELETE_STUDENT, label: "Delete student" },
    ],
  },
  {
    key: "classes",
    label: "Classes",
    permissions: [
      { key: PERMISSIONS.VIEW_CLASSES, label: "View classes" },
      { key: PERMISSIONS.CREATE_CLASS, label: "Create class" },
      { key: PERMISSIONS.EDIT_CLASS, label: "Edit class" },
      { key: PERMISSIONS.DELETE_CLASS, label: "Delete class" },
    ],
  },
  {
    key: "fees",
    label: "Fees",
    permissions: [
      { key: PERMISSIONS.VIEW_FEES, label: "View fees" },
      { key: PERMISSIONS.CREATE_FEE, label: "Create fee" },
      { key: PERMISSIONS.EDIT_FEE, label: "Edit fee" },
      { key: PERMISSIONS.DELETE_FEE, label: "Delete fee" },
    ],
  },
  {
    key: "payments",
    label: "Payments",
    permissions: [
      { key: PERMISSIONS.VIEW_PAYMENTS, label: "View payments" },
      { key: PERMISSIONS.RECORD_PAYMENT, label: "Record payment" },
      { key: PERMISSIONS.DELETE_PAYMENT, label: "Delete payment" },
    ],
  },
  {
    key: "reports",
    label: "Reports & Letters",
    permissions: [
      { key: PERMISSIONS.VIEW_REPORTS, label: "View reports" },
      { key: PERMISSIONS.VIEW_LETTERS, label: "View letters" },
    ],
  },
  {
    key: "balances",
    label: "Previous balances",
    permissions: [
      { key: PERMISSIONS.VIEW_BALANCES, label: "View balances" },
      { key: PERMISSIONS.EDIT_BALANCES, label: "Edit balances" },
    ],
  },
  {
    key: "discounts",
    label: "Discounts",
    permissions: [
      { key: PERMISSIONS.VIEW_DISCOUNTS, label: "View discounts" },
      { key: PERMISSIONS.MANAGE_DISCOUNTS, label: "Manage discounts" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    permissions: [
      { key: PERMISSIONS.VIEW_SETTINGS, label: "View settings" },
      { key: PERMISSIONS.EDIT_SETTINGS, label: "Edit settings" },
      { key: PERMISSIONS.DANGER_ZONE, label: "Use danger zone" },
    ],
  },
  {
    key: "roles",
    label: "Role management",
    permissions: [
      { key: PERMISSIONS.VIEW_ROLES, label: "View role management" },
      { key: PERMISSIONS.ASSIGN_ROLES, label: "Assign roles" },
      { key: PERMISSIONS.ASSIGN_HIGH_ROLES, label: "Assign high-level roles" },
    ],
  },
];

// ── Permission sets per role ───────────────────────────────────────────────
const ALL = Object.values(PERMISSIONS);

const ACCOUNTANT_SET = [
  PERMISSIONS.VIEW_DASHBOARD,
  PERMISSIONS.VIEW_FULL_DASHBOARD,
  PERMISSIONS.VIEW_FAMILIES,
  PERMISSIONS.VIEW_STUDENTS,
  PERMISSIONS.VIEW_CLASSES,
  PERMISSIONS.VIEW_FEES,
  PERMISSIONS.CREATE_FEE,
  PERMISSIONS.EDIT_FEE,
  PERMISSIONS.VIEW_PAYMENTS,
  PERMISSIONS.RECORD_PAYMENT,
  PERMISSIONS.VIEW_REPORTS,
  PERMISSIONS.VIEW_LETTERS,
  PERMISSIONS.VIEW_BALANCES,
  PERMISSIONS.EDIT_BALANCES,
  PERMISSIONS.VIEW_DISCOUNTS,
  PERMISSIONS.MANAGE_DISCOUNTS,
];

const ADMIN_OFFICER_SET = [
  ...ACCOUNTANT_SET,
  PERMISSIONS.CREATE_FAMILY,
  PERMISSIONS.EDIT_FAMILY,
  PERMISSIONS.CREATE_STUDENT,
  PERMISSIONS.EDIT_STUDENT,
  PERMISSIONS.CREATE_CLASS,
  PERMISSIONS.EDIT_CLASS,
  PERMISSIONS.VIEW_SETTINGS,
];

const IT_ADMIN_SET = [
  ...ADMIN_OFFICER_SET,
  PERMISSIONS.DELETE_FAMILY,
  PERMISSIONS.DELETE_STUDENT,
  PERMISSIONS.DELETE_CLASS,
  PERMISSIONS.DELETE_FEE,
  PERMISSIONS.DELETE_PAYMENT,
  PERMISSIONS.EDIT_SETTINGS,
  PERMISSIONS.VIEW_ROLES,
  PERMISSIONS.ASSIGN_ROLES, // can assign admin_officer, accountant, user
];

const ADMIN_SET = [
  ...IT_ADMIN_SET,
  PERMISSIONS.DANGER_ZONE,
  PERMISSIONS.ASSIGN_ROLES, // can assign up to it_admin (NOT high roles)
];

export const ROLE_PERMISSIONS = {
  super_admin: new Set(ALL),
  admin: new Set(ADMIN_SET),
  it_admin: new Set(IT_ADMIN_SET),
  admin_officer: new Set(ADMIN_OFFICER_SET),
  accountant: new Set(ACCOUNTANT_SET),
  user: new Set([
    PERMISSIONS.VIEW_DASHBOARD, // limited view — just welcome card
  ]),
};

export const DEFAULT_ROLE_DEFINITIONS = {
  super_admin: {
    key: ROLES.super_admin,
    label: ROLE_META.super_admin.label,
    color: ROLE_META.super_admin.color,
    bg: ROLE_META.super_admin.bg,
    permissions: ALL,
    system: true,
    protected: true,
  },
  admin: {
    key: ROLES.admin,
    label: ROLE_META.admin.label,
    color: ROLE_META.admin.color,
    bg: ROLE_META.admin.bg,
    permissions: [...ADMIN_SET],
    system: true,
    protected: true,
  },
  it_admin: {
    key: ROLES.it_admin,
    label: ROLE_META.it_admin.label,
    color: ROLE_META.it_admin.color,
    bg: ROLE_META.it_admin.bg,
    permissions: [...IT_ADMIN_SET],
    system: true,
    protected: true,
  },
  admin_officer: {
    key: ROLES.admin_officer,
    label: ROLE_META.admin_officer.label,
    color: ROLE_META.admin_officer.color,
    bg: ROLE_META.admin_officer.bg,
    permissions: [...ADMIN_OFFICER_SET],
    system: true,
    protected: false,
  },
  accountant: {
    key: ROLES.accountant,
    label: ROLE_META.accountant.label,
    color: ROLE_META.accountant.color,
    bg: ROLE_META.accountant.bg,
    permissions: [...ACCOUNTANT_SET],
    system: true,
    protected: false,
  },
  user: {
    key: ROLES.user,
    label: ROLE_META.user.label,
    color: ROLE_META.user.color,
    bg: ROLE_META.user.bg,
    permissions: [PERMISSIONS.VIEW_DASHBOARD],
    system: true,
    protected: false,
  },
};

// ── Which roles each assigner can grant ───────────────────────────────────
// super_admin can assign anything.
// admin can assign only non-destructive roles (no super_admin, admin, it_admin).
// it_admin same as admin but can also grant it_admin (peer).
export const ASSIGNABLE_ROLES = {
  super_admin: Object.values(ROLES),
  admin: [ROLES.admin_officer, ROLES.accountant, ROLES.user],
  it_admin: [ROLES.it_admin, ROLES.admin_officer, ROLES.accountant, ROLES.user],
  admin_officer: [],
  accountant: [],
  user: [],
};

export function getDefaultRoleDefinition(roleKey) {
  return DEFAULT_ROLE_DEFINITIONS[roleKey] || null;
}

export function getRoleDefinition(roleKey, roleDefinitions = {}) {
  const dynamicRole = roleDefinitions[roleKey];
  if (dynamicRole) {
    return {
      ...getDefaultRoleDefinition(roleKey),
      ...dynamicRole,
      key: dynamicRole.key || roleKey,
      permissions: Array.isArray(dynamicRole.permissions) ? dynamicRole.permissions : [],
    };
  }

  return getDefaultRoleDefinition(roleKey);
}

export function getPermissionSetForRole(roleKey, roleDefinitions = {}) {
  const roleDefinition = getRoleDefinition(roleKey, roleDefinitions);
  return new Set(roleDefinition?.permissions || []);
}

export function getAssignableRoleKeys(actorRole, roleDefinitions = {}) {
  if (!actorRole) return [];

  const allRoleKeys = Array.from(
    new Set([...Object.keys(DEFAULT_ROLE_DEFINITIONS), ...Object.keys(roleDefinitions)]),
  ).filter((roleKey) => !getRoleDefinition(roleKey, roleDefinitions)?.archived);

  if (actorRole === ROLES.super_admin) {
    return allRoleKeys;
  }

  const baseline = new Set(ASSIGNABLE_ROLES[actorRole] || []);
  return allRoleKeys.filter((roleKey) => {
    if (baseline.has(roleKey)) return true;
    const definition = getRoleDefinition(roleKey, roleDefinitions);
    return Boolean(definition) && !definition.protected;
  });
}

// ── Helper ────────────────────────────────────────────────────────────────
export function can(role, permission, roleDefinitions = {}) {
  if (!role || !permission) return false;

  if (Object.keys(roleDefinitions).length > 0) {
    return getPermissionSetForRole(role, roleDefinitions).has(permission);
  }

  const set = ROLE_PERMISSIONS[role];
  return set ? set.has(permission) : false;
}
