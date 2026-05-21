/**
 * userService.js
 * Firestore helpers for user profile + role management.
 * Place in: src/pages/roles/userService.js
 *
 * Firestore collection: users
 * Document shape:
 *   {
 *     uid:         string,
 *     email:       string,
 *     displayName: string,
 *     role:        "super_admin"|"admin"|"it_admin"|"admin_officer"|"accountant"|"user",
 *     createdAt:   Timestamp,
 *     updatedAt:   Timestamp,
 *   }
 */

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { DEFAULT_ROLE_DEFINITIONS } from "../../config/permissions";

const USERS_COL = "users";
const ROLES_COL = "roles";

const sortRoles = (roles) => {
  return [...roles].sort((left, right) => {
    if (Boolean(left.archived) !== Boolean(right.archived)) return left.archived ? 1 : -1;
    if (left.protected !== right.protected) return left.protected ? -1 : 1;
    return (left.label || left.key).localeCompare(right.label || right.key);
  });
};

const mergeRoles = (storedRoles, { includeArchived = true } = {}) => {
  const mergedRoles = { ...DEFAULT_ROLE_DEFINITIONS };

  storedRoles.forEach((role) => {
    mergedRoles[role.id] = {
      ...mergedRoles[role.id],
      ...role,
      key: role.id,
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
      archived: Boolean(role.archived),
    };
  });

  const roles = Object.values(mergedRoles);
  return sortRoles(includeArchived ? roles : roles.filter((role) => !role.archived));
};

// ── Called from AuthContext after registration ────────────────────────────
export const createUserProfile = async (uid, { email, displayName = "" }) => {
  await setDoc(
    doc(db, USERS_COL, uid),
    {
      uid,
      email,
      displayName,
      role: "user", // every new user starts as "user"
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

// ── Read ──────────────────────────────────────────────────────────────────
export const getUserProfile = async (uid) => {
  const snap = await getDoc(doc(db, USERS_COL, uid));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
};

export const getAllUsers = async () => {
  const snap = await getDocs(query(collection(db, USERS_COL), orderBy("createdAt", "desc")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export const getAllRoles = async () => {
  const snap = await getDocs(collection(db, ROLES_COL));
  const storedRoles = snap.docs.map((roleDoc) => ({ id: roleDoc.id, ...roleDoc.data() }));
  return mergeRoles(storedRoles);
};

export const getRoleDefinitionsMap = async () => {
  const roles = await getAllRoles();
  return roles.reduce((acc, role) => {
    acc[role.key] = role;
    return acc;
  }, {});
};

export const subscribeToUsers = (onNext, onError) => {
  return onSnapshot(
    query(collection(db, USERS_COL), orderBy("createdAt", "desc")),
    (snapshot) => {
      onNext(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    onError,
  );
};

export const subscribeToRoles = (onNext, onError, options = {}) => {
  return onSnapshot(
    collection(db, ROLES_COL),
    (snapshot) => {
      const storedRoles = snapshot.docs.map((roleDoc) => ({ id: roleDoc.id, ...roleDoc.data() }));
      onNext(mergeRoles(storedRoles, options));
    },
    onError,
  );
};

export const subscribeToRoleDefinitionsMap = (onNext, onError) => {
  return subscribeToRoles((roles) => {
    onNext(
      roles.reduce((acc, role) => {
        acc[role.key] = role;
        return acc;
      }, {}),
    );
  }, onError);
};

export const saveRoleDefinition = async (roleKey, data, updatedBy) => {
  await setDoc(
    doc(db, ROLES_COL, roleKey),
    {
      ...data,
      key: roleKey,
      updatedBy,
      updatedAt: serverTimestamp(),
      createdAt: data.createdAt || serverTimestamp(),
      archived: Boolean(data.archived),
      archivedAt: data.archived ? data.archivedAt || serverTimestamp() : null,
      archivedBy: data.archived ? data.archivedBy || updatedBy : null,
    },
    { merge: true },
  );
};

export const archiveRoleDefinition = async (roleKey, archived, updatedBy) => {
  await updateDoc(doc(db, ROLES_COL, roleKey), {
    archived,
    archivedAt: archived ? serverTimestamp() : null,
    archivedBy: archived ? updatedBy : null,
    updatedAt: serverTimestamp(),
    updatedBy,
  });
};

export const deleteRoleDefinition = async (roleKey) => {
  await deleteDoc(doc(db, ROLES_COL, roleKey));
};

export const seedDefaultRoles = async (updatedBy) => {
  await Promise.all(
    Object.entries(DEFAULT_ROLE_DEFINITIONS).map(([roleKey, roleDefinition]) => {
      return setDoc(
        doc(db, ROLES_COL, roleKey),
        {
          ...roleDefinition,
          key: roleKey,
          updatedAt: serverTimestamp(),
          updatedBy,
          seededAt: serverTimestamp(),
          archived: false,
        },
        { merge: true },
      );
    }),
  );
};

// ── Assign role ───────────────────────────────────────────────────────────
export const assignRole = async (uid, newRole, assignedBy) => {
  await updateDoc(doc(db, USERS_COL, uid), {
    role: newRole,
    assignedBy,
    updatedAt: serverTimestamp(),
  });
};
