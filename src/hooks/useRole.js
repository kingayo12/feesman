/**
 * useRole.js
 * Place in: src/hooks/useRole.js
 *
 * Usage:
 *   const { role, can, loading } = useRole();
 *   if (can(PERMISSIONS.DELETE_STUDENT)) { ... }
 */

import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/firestore";
import { useAuth } from "../context/AuthContext";
import { can as canFn, ROLE_PERMISSIONS } from "../config/permissions";

export function useRole() {
  const { user } = useAuth();
  const [role, setRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (!cancelled) setRole(snap.exists() ? snap.data().role || "user" : "user");
      } catch {
        if (!cancelled) setRole("user");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const can = (permission) => canFn(role, permission);

  return { role, can, loading };
}
