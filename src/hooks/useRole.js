/**
 * useRole.js
 * Place in: src/hooks/useRole.js
 *
 * Usage:
 *   const { role, can, loading } = useRole();
 *   if (can(PERMISSIONS.DELETE_STUDENT)) { ... }
 */

import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { can as canFn, ROLES, PERMISSIONS } from "../config/permissions";
import { subscribeToRoleDefinitionsMap } from "../pages/roles/userService";

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [roleDefinitions, setRoleDefinitions] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setRoleDefinitions({});
      setLoading(false);
      return;
    }

    setLoading(true);

    let userLoaded = false;
    let rolesLoaded = false;

    const markLoaded = () => {
      if (userLoaded && rolesLoaded) {
        setLoading(false);
      }
    };

    const unsubscribeUser = onSnapshot(
      doc(db, "users", user.uid),
      (snapshot) => {
        setRole(snapshot.exists() ? snapshot.data().role || "user" : "user");
        userLoaded = true;
        markLoaded();
      },
      () => {
        setRole("user");
        userLoaded = true;
        markLoaded();
      },
    );

    const unsubscribeRoles = subscribeToRoleDefinitionsMap(
      (definitions) => {
        setRoleDefinitions(definitions);
        rolesLoaded = true;
        markLoaded();
      },
      () => {
        setRoleDefinitions({});
        rolesLoaded = true;
        markLoaded();
      },
    );

    return () => {
      unsubscribeUser();
      unsubscribeRoles();
    };
  }, [user?.uid]);

  const can = (permission) => canFn(role, permission, roleDefinitions);
  const isSuperAdmin = role === ROLES.super_admin;
  const isAdminOrSuperAdmin = role === ROLES.super_admin || role === ROLES.admin;
  // Generic helpers kept for backward compat; prefer calling can(PERMISSIONS.X) directly in pages
  const canEdit =
    can(PERMISSIONS.EDIT_FAMILY) ||
    can(PERMISSIONS.EDIT_STUDENT) ||
    can(PERMISSIONS.EDIT_CLASS) ||
    can(PERMISSIONS.EDIT_FEE) ||
    can(PERMISSIONS.EDIT_BALANCES) ||
    can(PERMISSIONS.MANAGE_DISCOUNTS);
  const canDelete =
    can(PERMISSIONS.DELETE_FAMILY) ||
    can(PERMISSIONS.DELETE_STUDENT) ||
    can(PERMISSIONS.DELETE_CLASS) ||
    can(PERMISSIONS.DELETE_FEE) ||
    can(PERMISSIONS.DELETE_PAYMENT);

  return {
    role,
    roleDefinitions,
    can,
    loading,
    isSuperAdmin,
    isAdminOrSuperAdmin,
    canEdit,
    canDelete,
  };
}
