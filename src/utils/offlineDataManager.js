import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase/firestore";

/**
 * Offline Data Manager
 * Pre-caches and manages Firestore data for offline support.
 * Reduces the number of individual queries by batching operations.
 */

// ─── In-memory cache ──────────────────────────────────────────────────────────
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
  students: {}, // key: `${familyId}:${academicYear}:${term}`
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
  settings: 5 * 60 * 1000, //  5 minutes
  lists: 15 * 60 * 1000, // 15 minutes
  data: 10 * 60 * 1000, // 10 minutes
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalize term strings so old data ("Second Term") matches new data ("2nd Term").
 * Mirrors the same helper in feesService / paymentService.
 */
function normalizeTerm(term) {
  if (!term) return "";
  const map = {
    "first term": "1st Term",
    "second term": "2nd Term",
    "third term": "3rd Term",
    "1st term": "1st Term",
    "2nd term": "2nd Term",
    "3rd term": "3rd Term",
  };
  return map[term.toLowerCase()] ?? term;
}

// ─── Settings ─────────────────────────────────────────────────────────────────

export const getCachedSettings = async () => {
  const now = Date.now();
  if (memoryCache.settings && memoryCache.settingsExpiry > now) {
    return memoryCache.settings;
  }
  const snapshot = await getDocs(query(collection(db, "settings")));
  const data = snapshot.docs[0]?.data() || null;
  memoryCache.settings = data;
  memoryCache.settingsExpiry = now + CACHE_TTL.settings;
  return data;
};

// ─── Students ─────────────────────────────────────────────────────────────────

/**
 * Fetch all active students for a family, enriched with their current
 * enrollment (classId / session / term) for the given academicYear + term.
 *
 * KEY CHANGE: student docs no longer carry classId / session / term —
 * those fields live in studentEnrollments. This function fetches both
 * collections and merges them so callers always get enriched objects.
 *
 * Cache key: `${familyId}:${academicYear}:${normalizedTerm}` — scoped to
 * the specific term so switching terms always gets fresh data.
 */
export const getCachedStudentsByFamily = async (familyId, academicYear, currentTerm) => {
  const normalizedTerm = normalizeTerm(currentTerm || "");
  const key = `${familyId}:${academicYear}:${normalizedTerm}`;

  if (memoryCache.students[key]) return memoryCache.students[key];

  try {
    // 1. Identity docs — no enrollment fields on these
    const studentSnap = await getDocs(
      query(
        collection(db, "students"),
        where("familyId", "==", familyId),
        where("status", "==", "active"),
      ),
    );
    const students = studentSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
    const studentIds = students.map((s) => s.id);

    if (studentIds.length === 0) {
      memoryCache.students[key] = [];
      return [];
    }

    // 2. Active enrollments for this session + term
    //    Filter by both session AND normalized term so we get the right classId
    const enrollSnap = await getDocs(
      query(
        collection(db, "studentEnrollments"),
        where("session", "==", academicYear),
        where("status", "==", "active"),
        // Note: we filter term client-side to handle old "Second Term" format
      ),
    );

    // Build map: studentId → enrollment (term-filtered client-side)
    const enrollmentMap = {};
    for (const d of enrollSnap.docs) {
      const e = d.data();
      if (
        studentIds.includes(e.studentId) &&
        (!normalizedTerm || normalizeTerm(e.term) === normalizedTerm)
      ) {
        enrollmentMap[e.studentId] = { id: d.id, ...e };
      }
    }

    // 3. Enrich students with enrollment data
    const enriched = students.map((s) => ({
      ...s,
      classId: enrollmentMap[s.id]?.classId || null,
      term: enrollmentMap[s.id]?.term || null,
      session: enrollmentMap[s.id]?.session || null,
    }));

    memoryCache.students[key] = enriched;
    return enriched;
  } catch (err) {
    console.error(`Error fetching students for family ${familyId}:`, err);
    memoryCache.students[key] = [];
    return [];
  }
};

// ─── Payments ─────────────────────────────────────────────────────────────────

export const getCachedPaymentsByFamily = async (familyId, academicYear, currentTerm) => {
  const normalizedTerm = normalizeTerm(currentTerm);
  const key = `${familyId}:${academicYear}:${normalizedTerm}`;
  if (memoryCache.payments[key]) return memoryCache.payments[key];

  // Query by familyId + session, filter term client-side to handle old formats
  const snap = await getDocs(
    query(
      collection(db, "payments"),
      where("familyId", "==", familyId),
      where("session", "==", academicYear),
    ),
  );

  const data = snap.docs
    .map((d) => ({ id: d.id, ...d.data(), term: normalizeTerm(d.data().term) }))
    .filter((p) => !normalizedTerm || p.term === normalizedTerm);

  memoryCache.payments[key] = data;
  return data;
};

// ─── Fees ─────────────────────────────────────────────────────────────────────

/**
 * Fetch fees for a class/session/term.
 *
 * FIX: previously queried term directly in Firestore, which missed old docs
 * stored as "Second Term". Now queries by classId + session only, then
 * filters term client-side after normalizing — mirrors feesService.getFeesByClass.
 */
export const getCachedFeesByClass = async (classId, academicYear, currentTerm) => {
  if (!classId || !academicYear || !currentTerm) return [];

  const normalizedTerm = normalizeTerm(currentTerm);
  const key = `${classId}:${academicYear}:${normalizedTerm}`;
  if (memoryCache.fees[key]) return memoryCache.fees[key];

  const snap = await getDocs(
    query(
      collection(db, "fees"),
      where("classId", "==", classId),
      where("session", "==", academicYear),
      // term filtered client-side to handle "Second Term" / "2nd Term" variants
    ),
  );

  const data = snap.docs
    .map((d) => ({
      id: d.id,
      ...d.data(),
      term: normalizeTerm(d.data().term),
      session: d.data().session || d.data().academicYear || "",
    }))
    .filter((f) => f.term === normalizedTerm);

  memoryCache.fees[key] = data;
  return data;
};

// ─── Families ─────────────────────────────────────────────────────────────────

export const getCachedAllFamilies = async () => {
  const now = Date.now();
  if (memoryCache.families && memoryCache.familiesExpiry > now) return memoryCache.families;
  const snap = await getDocs(collection(db, "families"));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  memoryCache.families = data;
  memoryCache.familiesExpiry = now + CACHE_TTL.lists;
  return data;
};

export const getCachedFamilyById = async (familyId) => {
  const families = await getCachedAllFamilies();
  return families.find((f) => f.id === familyId) || null;
};

// ─── Classes ─────────────────────────────────────────────────────────────────

export const getCachedAllClasses = async () => {
  const now = Date.now();
  if (memoryCache.classes && memoryCache.classesExpiry > now) return memoryCache.classes;
  const snap = await getDocs(collection(db, "classes"));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  memoryCache.classes = data;
  memoryCache.classesExpiry = now + CACHE_TTL.lists;
  return data;
};

export const getCachedClassById = async (classId) => {
  const classes = await getCachedAllClasses();
  return classes.find((c) => c.id === classId) || null;
};

// ─── Discounts ────────────────────────────────────────────────────────────────

export const getCachedAllDiscounts = async () => {
  const now = Date.now();
  if (memoryCache.discounts && memoryCache.discountsExpiry > now) return memoryCache.discounts;
  const snap = await getDocs(collection(db, "discounts"));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  memoryCache.discounts = data;
  memoryCache.discountsExpiry = now + CACHE_TTL.lists;
  return data;
};

export const getCachedDiscounts = async (academicYear) => {
  const all = await getCachedAllDiscounts();
  return all.filter((d) => d.active && (d.session === academicYear || d.session === "all"));
};

// ─── Discount assignments ─────────────────────────────────────────────────────

export const getCachedAllDiscountAssignments = async () => {
  const now = Date.now();
  if (
    Array.isArray(memoryCache.discountAssignments) &&
    memoryCache.discountAssignmentsExpiry > now
  ) {
    return memoryCache.discountAssignments;
  }
  const snap = await getDocs(collection(db, "discountAssignments"));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  memoryCache.discountAssignments = data;
  memoryCache.discountAssignmentsExpiry = now + CACHE_TTL.lists;
  return data;
};

export const getCachedAssignmentsForFamily = async (familyId, academicYear) => {
  const all = await getCachedAllDiscountAssignments();
  return all.filter(
    (a) =>
      a.targetId === familyId &&
      a.targetType === "family" &&
      (a.session === academicYear || !a.session),
  );
};

export const getCachedAssignmentsForStudent = async (studentId, academicYear) => {
  const all = await getCachedAllDiscountAssignments();
  return all.filter(
    (a) =>
      a.targetId === studentId &&
      a.targetType === "student" &&
      (a.session === academicYear || !a.session),
  );
};

// ─── Fee overrides ────────────────────────────────────────────────────────────

export const getCachedStudentFeeOverrides = async (studentId) => {
  if (memoryCache.studentFeeOverrides[studentId]) {
    return memoryCache.studentFeeOverrides[studentId];
  }
  const snap = await getDocs(
    query(collection(db, "studentFeeOverrides"), where("studentId", "==", studentId)),
  );
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  memoryCache.studentFeeOverrides[studentId] = data;
  return data;
};

// ─── Previous balances ────────────────────────────────────────────────────────

export const getCachedPreviousBalance = async (studentId, session) => {
  const key = `${studentId}:${session}`;
  if (memoryCache.previousBalances[key]) return memoryCache.previousBalances[key];
  const snap = await getDocs(
    query(
      collection(db, "previousBalances"),
      where("studentId", "==", studentId),
      where("session", "==", session),
    ),
  );
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  memoryCache.previousBalances[key] = data;
  return data;
};

export const getCachedPreviousBalanceAmount = async (studentId, session) => {
  try {
    const balances = await getCachedPreviousBalance(studentId, session);
    return balances.reduce((sum, b) => sum + (Number(b.amount) || 0), 0);
  } catch (err) {
    console.warn(`Failed to fetch previous balance for ${studentId}:`, err);
    return 0;
  }
};

// ─── Users & Roles ────────────────────────────────────────────────────────────

export const getCachedAllUsers = async () => {
  const now = Date.now();
  if (memoryCache.users && memoryCache.usersExpiry > now) return memoryCache.users;
  const snap = await getDocs(collection(db, "users"));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  memoryCache.users = data;
  memoryCache.usersExpiry = now + CACHE_TTL.lists;
  return data;
};

export const getCachedAllRoles = async () => {
  const now = Date.now();
  if (memoryCache.roles && memoryCache.rolesExpiry > now) return memoryCache.roles;
  const snap = await getDocs(collection(db, "roles"));
  const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  memoryCache.roles = data;
  memoryCache.rolesExpiry = now + CACHE_TTL.lists;
  return data;
};

// ─── Pre-cache ────────────────────────────────────────────────────────────────

/**
 * Pre-cache all required data for a family before calculating financials.
 * Must pass currentTerm so getCachedStudentsByFamily uses the right cache key.
 */
export const preCacheFamilyData = async (familyId, academicYear, currentTerm) => {
  try {
    const [students, payments, , famAssignments] = await Promise.all([
      getCachedStudentsByFamily(familyId, academicYear, currentTerm), // ← term required
      getCachedPaymentsByFamily(familyId, academicYear, currentTerm),
      getCachedDiscounts(academicYear),
      getCachedAssignmentsForFamily(familyId, academicYear),
    ]);

    if (students?.length) {
      await Promise.all(
        students.map((s) =>
          Promise.all([
            s.classId
              ? getCachedFeesByClass(s.classId, academicYear, currentTerm)
              : Promise.resolve([]),
            getCachedStudentFeeOverrides(s.id),
            getCachedPreviousBalanceAmount(s.id, academicYear),
            getCachedAssignmentsForStudent(s.id, academicYear),
          ]),
        ),
      );
    }

    return { success: true, students: students || [], payments: payments || [] };
  } catch (err) {
    console.error(`Error pre-caching family data for ${familyId}:`, err);
    return { success: false, students: [], payments: [], error: err };
  }
};

// ─── Clear cache ──────────────────────────────────────────────────────────────

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

// ─── Prefetch all ─────────────────────────────────────────────────────────────

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

    return {
      success: true,
      familiesCount: families.length,
      cachedCount: results.filter((r) => r.success).length,
    };
  } catch (err) {
    console.error("Error prefetching families data:", err);
    return { success: false, error: err };
  }
};

// ─── Offline fallback ─────────────────────────────────────────────────────────

export const fetchWithOfflineFallback = async (fetchFn, fallbackValue = null) => {
  try {
    return await fetchFn();
  } catch (err) {
    console.warn("Fetch failed, using fallback:", err);
    return fallbackValue;
  }
};
