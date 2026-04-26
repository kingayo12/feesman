/**
 * MIGRATION SCRIPT — Run once to move session/term/classId
 * from student docs into the new studentEnrollments collection.
 *
 * HOW TO RUN:
 *   1. Import and call migrateToEnrollments() from a temporary
 *      admin page, a script, or your browser console (after auth).
 *   2. Check Firestore — studentEnrollments should have one doc
 *      per student with their existing session/term/classId.
 *   3. Verify everything looks correct before removing old fields.
 *   4. Optionally call cleanUpOldStudentFields() to remove the
 *      now-redundant session/term/classId from student docs.
 *
 * ⚠️  ALWAYS test on a copy of your data first.
 */

import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  deleteField,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";

/* =========================
   STEP 1 — Migrate
   Creates enrollment docs from existing student fields.
========================= */
export const migrateToEnrollments = async () => {
  const studentsSnap = await getDocs(collection(db, "students"));
  const enrollmentRef = collection(db, "studentEnrollments");

  let created = 0;
  let skipped = 0;
  const errors = [];

  for (const d of studentsSnap.docs) {
    const data = d.data();

    // Skip students that were already migrated (no session/classId on doc)
    if (!data.session && !data.classId) {
      skipped++;
      continue;
    }

    try {
      await addDoc(enrollmentRef, {
        studentId: d.id,
        classId: data.classId || null,
        session: data.session || "2024/2025",
        term: data.term || "1st Term",
        status: "active",
        enrolledAt: data.createdAt || serverTimestamp(),
        promotedAt: null,
      });

      created++;
    } catch (err) {
      console.error(`Failed to migrate student ${d.id}:`, err);
      errors.push({ studentId: d.id, error: err.message });
    }
  }

  console.log(`
  ✅ Migration complete
  ─────────────────────────
  Created : ${created} enrollment docs
  Skipped : ${skipped} (already migrated)
  Errors  : ${errors.length}
  `);

  if (errors.length) {
    console.error("Failed students:", errors);
  }

  return { created, skipped, errors };
};

/* =========================
   STEP 2 — Clean up old fields from student docs
   Run ONLY after verifying migration is correct.
========================= */
export const cleanUpOldStudentFields = async () => {
  const studentsSnap = await getDocs(collection(db, "students"));

  let cleaned = 0;
  const errors = [];

  for (const d of studentsSnap.docs) {
    const data = d.data();

    // Only touch docs that still have the old fields
    if (!data.session && !data.classId && !data.term) continue;

    try {
      await updateDoc(doc(db, "students", d.id), {
        session: deleteField(),
        term: deleteField(),
        classId: deleteField(),
      });
      cleaned++;
    } catch (err) {
      console.error(`Failed to clean student ${d.id}:`, err);
      errors.push({ studentId: d.id, error: err.message });
    }
  }

  console.log(`
  ✅ Cleanup complete
  ─────────────────────────
  Cleaned : ${cleaned} student docs
  Errors  : ${errors.length}
  `);

  return { cleaned, errors };
};
