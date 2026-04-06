// ─────────────────────────────────────────────────────────────────────────────
// ADD TO: src/pages/students/studentService.js
//
// Step 1 — add "writeBatch" to your existing firebase/firestore import:
//   import { ..., writeBatch } from "firebase/firestore";
//
// Step 2 — paste the function below into studentService.js and export it.
// ─────────────────────────────────────────────────────────────────────────────

import { writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase/firestore";

/**
 * Promote a list of students to a new class and new academic session.
 *
 * Data model assumptions (from your codebase):
 *  - Classes are separate Firestore docs, each with { name, section, session }.
 *  - "Section/arm" = the letter suffix on a class (e.g. "A" in "Primary 1A").
 *  - A full section = one academic year covering 1st, 2nd and 3rd terms.
 *  - After completing all 3 terms, students in e.g. "Primary 1A" are promoted
 *    to "Primary 2A" and their session moves from e.g. 2024/2025 → 2025/2026.
 *  - Old fee/payment records are keyed by (studentId, session, term) and are
 *    NOT touched — historical data is fully preserved.
 *
 * @param {string[]} studentIds    - Firestore IDs of students to promote.
 * @param {string}   targetClassId - Firestore ID of the destination class.
 * @param {string}   newSession    - New session string e.g. "2025/2026".
 * @returns {Promise<{ promoted: string[], failed: string[] }>}
 */
export const promoteStudents = async (studentIds, targetClassId, newSession) => {
  if (!studentIds?.length || !targetClassId || !newSession?.trim()) {
    throw new Error("studentIds, targetClassId, and newSession are all required.");
  }

  const promoted = [];
  const failed = [];

  // Firestore batches allow max 500 writes — chunk conservatively at 499
  const CHUNK_SIZE = 499;
  for (let i = 0; i < studentIds.length; i += CHUNK_SIZE) {
    const chunk = studentIds.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const studentId of chunk) {
      try {
        const ref = doc(db, "students", studentId);
        batch.update(ref, {
          classId: targetClassId,
          session: newSession.trim(),
          promotedAt: new Date().toISOString(), // audit trail
        });
        promoted.push(studentId);
      } catch (err) {
        console.error(`Failed to queue student ${studentId}:`, err);
        failed.push(studentId);
      }
    }

    await batch.commit();
  }

  return { promoted, failed };
};
