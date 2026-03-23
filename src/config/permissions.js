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

// ── Helper ────────────────────────────────────────────────────────────────
export function can(role, permission) {
  const set = ROLE_PERMISSIONS[role];
  return set ? set.has(permission) : false;
}
