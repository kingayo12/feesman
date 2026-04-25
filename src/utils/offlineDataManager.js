import { collection, query, where, getDocs, getDoc, doc } from "firebase/firestore";
import { db } from "../firebase/firestore";

/**
 * Offline Data Manager
 * Pre-caches and manages Firestore data for offline support
 * Reduces number of individual queries by batching operations
 */

// In-memory cache for frequently accessed data
const memoryCache = {
  settings: null,
  settingsExpiry: 0,
  families: null,
  familiesExpiry: 0,
  classes: null,
  classesExpiry: 0,
  discounts: null,
  discountsExpiry: 0,
  discountAssignments: null,
  discountAssignmentsExpiry: 0,
  students: {},
  payments: {},
  fees: {},
  studentFeeOverrides: {},
  previousBalances: {},
  users: null,
  usersExpiry: 0,
  roles: null,
  rolesExpiry: 0,
};

const CACHE_TTL = {
  settings: 5 * 60 * 1000, // 5 minutes
  lists: 15 * 60 * 1000, // 15 minutes
  data: 10 * 60 * 1000, // 10 minutes
};

/**
 * Get or fetch settings with in-memory caching
 */
export const getCachedSettings = async () => {
  const now = Date.now();
  if (memoryCache.settings && memoryCache.settingsExpiry > now) {
    return memoryCache.settings;
  }

  const q = query(collection(db, "settings"));
  const snapshot = await getDocs(q);
  const data = snapshot.docs[0]?.data() || null;

  memoryCache.settings = data;
  memoryCache.settingsExpiry = now + CACHE_TTL.settings;
  return data;
};

/**
 * Batch fetch all students for a family (cached)
 */
export const getCachedStudentsByFamily = async (familyId, academicYear) => {
  const key = `${familyId}:${academicYear}`;
  if (memoryCache.students[key]) {
    return memoryCache.students[key];
  }

  const q = query(
    collection(db, "students"),
    where("familyId", "==", familyId),
    where("session", "==", academicYear),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.students[key] = data;
  return data;
};

/**
 * Batch fetch all payments for a family (cached)
 */
export const getCachedPaymentsByFamily = async (familyId, academicYear, currentTerm) => {
  const key = `${familyId}:${academicYear}:${currentTerm}`;
  if (memoryCache.payments[key]) {
    return memoryCache.payments[key];
  }

  const q = query(
    collection(db, "payments"),
    where("familyId", "==", familyId),
    where("session", "==", academicYear),
    where("term", "==", currentTerm),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.payments[key] = data;
  return data;
};

/**
 * Batch fetch all fees for a class (cached)
 */
export const getCachedFeesByClass = async (classId, academicYear, currentTerm) => {
  const key = `${classId}:${academicYear}:${currentTerm}`;
  if (memoryCache.fees[key]) {
    return memoryCache.fees[key];
  }

  const q = query(
    collection(db, "fees"),
    where("classId", "==", classId),
    where("session", "==", academicYear),
    where("term", "==", currentTerm),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.fees[key] = data;
  return data;
};

/**
 * Batch fetch all families (cached)
 */
export const getCachedAllFamilies = async () => {
  const now = Date.now();
  if (memoryCache.families && memoryCache.familiesExpiry > now) {
    return memoryCache.families;
  }

  const snapshot = await getDocs(collection(db, "families"));
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.families = data;
  memoryCache.familiesExpiry = now + CACHE_TTL.lists;
  return data;
};

/**
 * Get cached family by ID
 */
export const getCachedFamilyById = async (familyId) => {
  const families = await getCachedAllFamilies();
  return families.find((f) => f.id === familyId) || null;
};

/**
 * Batch fetch all classes (cached)
 */
export const getCachedAllClasses = async () => {
  const now = Date.now();
  if (memoryCache.classes && memoryCache.classesExpiry > now) {
    return memoryCache.classes;
  }

  const snapshot = await getDocs(collection(db, "classes"));
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.classes = data;
  memoryCache.classesExpiry = now + CACHE_TTL.lists;
  return data;
};

/**
 * Get cached class by ID
 */
export const getCachedClassById = async (classId) => {
  const classes = await getCachedAllClasses();
  return classes.find((c) => c.id === classId) || null;
};

/**
 * Batch fetch all discounts (cached)
 */
export const getCachedAllDiscounts = async () => {
  const now = Date.now();
  if (memoryCache.discounts && memoryCache.discountsExpiry > now) {
    return memoryCache.discounts;
  }

  const snapshot = await getDocs(collection(db, "discounts"));
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.discounts = data;
  memoryCache.discountsExpiry = now + CACHE_TTL.lists;
  return data;
};

/**
 * Get active discounts for an academic year (from cached list)
 */
export const getCachedDiscounts = async (academicYear) => {
  const allDiscounts = await getCachedAllDiscounts();
  return allDiscounts.filter(
    (d) => d.active && (d.session === academicYear || d.session === "all"),
  );
};

/**
 * Batch fetch all discount assignments (cached)
 * Always initialises memoryCache.discountAssignments as an array, never leaves it null.
 */
export const getCachedAllDiscountAssignments = async () => {
  const now = Date.now();
  if (
    Array.isArray(memoryCache.discountAssignments) &&
    memoryCache.discountAssignmentsExpiry > now
  ) {
    return memoryCache.discountAssignments;
  }

  const snapshot = await getDocs(collection(db, "discountAssignments"));
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Always store as an array so downstream key-lookups never hit null
  memoryCache.discountAssignments = data;
  memoryCache.discountAssignmentsExpiry = now + CACHE_TTL.lists;
  return data;
};

/**
 * Get cached discount assignments for a family.
 * Guards against memoryCache.discountAssignments being null before the
 * bulk fetch has run (race condition on first load).
 */
export const getCachedAssignmentsForFamily = async (familyId, academicYear) => {
  // Ensure the bulk cache is populated first — this is the only safe entry point
  const allAssignments = await getCachedAllDiscountAssignments();

  return allAssignments.filter(
    (a) =>
      a.targetId === familyId &&
      a.targetType === "family" &&
      (a.session === academicYear || !a.session),
  );
};

/**
 * Get cached discount assignments for a student.
 * Guards against memoryCache.discountAssignments being null before the
 * bulk fetch has run (race condition on first load).
 */
export const getCachedAssignmentsForStudent = async (studentId, academicYear) => {
  // Ensure the bulk cache is populated first — this is the only safe entry point
  const allAssignments = await getCachedAllDiscountAssignments();

  return allAssignments.filter(
    (a) =>
      a.targetId === studentId &&
      a.targetType === "student" &&
      (a.session === academicYear || !a.session),
  );
};

/**
 * Batch fetch all student fee overrides for a student (cached)
 */
export const getCachedStudentFeeOverrides = async (studentId) => {
  const key = studentId;
  if (memoryCache.studentFeeOverrides[key]) {
    return memoryCache.studentFeeOverrides[key];
  }

  const q = query(collection(db, "studentFeeOverrides"), where("studentId", "==", studentId));
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.studentFeeOverrides[key] = data;
  return data;
};

/**
 * Batch fetch previous balance for a student (cached)
 */
export const getCachedPreviousBalance = async (studentId, session) => {
  const key = `${studentId}:${session}`;
  if (memoryCache.previousBalances[key]) {
    return memoryCache.previousBalances[key];
  }

  const q = query(
    collection(db, "previousBalances"),
    where("studentId", "==", studentId),
    where("session", "==", session),
  );
  const snapshot = await getDocs(q);
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.previousBalances[key] = data;
  return data;
};

/**
 * Get previous balance amount for a student
 */
export const getCachedPreviousBalanceAmount = async (studentId, session) => {
  try {
    const balances = await getCachedPreviousBalance(studentId, session);
    if (balances.length === 0) return 0;
    return balances.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  } catch (error) {
    console.warn(`Failed to fetch previous balance for ${studentId}:`, error);
    return 0;
  }
};

/**
 * Batch fetch all users (cached)
 */
export const getCachedAllUsers = async () => {
  const now = Date.now();
  if (memoryCache.users && memoryCache.usersExpiry > now) {
    return memoryCache.users;
  }

  const snapshot = await getDocs(collection(db, "users"));
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.users = data;
  memoryCache.usersExpiry = now + CACHE_TTL.lists;
  return data;
};

/**
 * Batch fetch all roles (cached)
 */
export const getCachedAllRoles = async () => {
  const now = Date.now();
  if (memoryCache.roles && memoryCache.rolesExpiry > now) {
    return memoryCache.roles;
  }

  const snapshot = await getDocs(collection(db, "roles"));
  const data = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));

  memoryCache.roles = data;
  memoryCache.rolesExpiry = now + CACHE_TTL.lists;
  return data;
};

/**
 * Pre-cache all required data for a family before calculating financials
 */
export const preCacheFamilyData = async (familyId, academicYear, currentTerm) => {
  try {
    const [students, payments, discounts, discountAssignments] = await Promise.all([
      getCachedStudentsByFamily(familyId, academicYear),
      getCachedPaymentsByFamily(familyId, academicYear, currentTerm),
      getCachedDiscounts(academicYear),
      getCachedAssignmentsForFamily(familyId, academicYear),
    ]);

    if (students?.length) {
      const studentPromises = students.map((s) =>
        Promise.all([
          s.classId
            ? getCachedFeesByClass(s.classId, academicYear, currentTerm)
            : Promise.resolve([]),
          getCachedStudentFeeOverrides(s.id),
          getCachedPreviousBalanceAmount(s.id, academicYear),
          getCachedAssignmentsForStudent(s.id, academicYear),
        ]),
      );
      await Promise.all(studentPromises);
    }

    return {
      success: true,
      students: students || [],
      payments: payments || [],
      discounts: discounts || [],
    };
  } catch (error) {
    console.error(`Error pre-caching family data for ${familyId}:`, error);
    return {
      success: false,
      students: [],
      payments: [],
      discounts: [],
      error,
    };
  }
};

/**
 * Clear memory cache (useful on logout or when switching contexts)
 */
export const clearMemoryCache = () => {
  memoryCache.settings = null;
  memoryCache.settingsExpiry = 0;
  memoryCache.families = null;
  memoryCache.familiesExpiry = 0;
  memoryCache.classes = null;
  memoryCache.classesExpiry = 0;
  memoryCache.discounts = null;
  memoryCache.discountsExpiry = 0;
  memoryCache.discountAssignments = null;
  memoryCache.discountAssignmentsExpiry = 0;
  memoryCache.students = {};
  memoryCache.payments = {};
  memoryCache.fees = {};
  memoryCache.studentFeeOverrides = {};
  memoryCache.previousBalances = {};
  memoryCache.users = null;
  memoryCache.usersExpiry = 0;
  memoryCache.roles = null;
  memoryCache.rolesExpiry = 0;
};

/**
 * Prefetch all families and their related data for better offline support
 */
export const prefetchAllFamiliesData = async (academicYear, currentTerm) => {
  try {
    await Promise.all([
      getCachedAllFamilies(),
      getCachedAllClasses(),
      getCachedAllDiscounts(),
      getCachedAllDiscountAssignments(),
    ]);

    const families = await getCachedAllFamilies();

    const results = await Promise.all(
      families.map((f) => preCacheFamilyData(f.id, academicYear, currentTerm)),
    );

    const successCount = results.filter((r) => r.success).length;
    // console.log(`Prefetched ${successCount}/${families.length} families`);

    return {
      success: true,
      familiesCount: families.length,
      cachedCount: successCount,
    };
  } catch (error) {
    console.error("Error prefetching families data:", error);
    return {
      success: false,
      error,
    };
  }
};

/**
 * Smart data fetcher that handles offline gracefully
 */
export const fetchWithOfflineFallback = async (fetchFn, fallbackValue = null) => {
  try {
    return await fetchFn();
  } catch (error) {
    console.warn("Fetch failed, using fallback:", error);
    return fallbackValue;
  }
};
