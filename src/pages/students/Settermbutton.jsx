import { useState } from "react";
import { collection, getDocs, query, where, writeBatch, doc } from "firebase/firestore";
import { db } from "../../firebase/firestore";
import { getSettings } from "../../pages/settings/settingService";
import CustomButton from "../../components/common/CustomButton";

/**
 * SetTermButton
 *
 * Works on BOTH data models:
 *  1. Old model — students collection has session/classId directly on the doc
 *  2. New model — studentEnrollments collection (after migration)
 *
 * It checks both collections and updates whichever has records missing a term.
 */
export default function SetTermButton({ onDone }) {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);

  const handleSetTerm = async () => {
    if (
      !window.confirm(
        "This will set the current term on all student records that are missing a term. Continue?",
      )
    )
      return;

    setRunning(true);
    setResult(null);

    try {
      const settings = await getSettings();
      const currentTerm = settings?.currentTerm;

      if (!currentTerm) {
        alert("No current term found in settings. Please configure it first.");
        setRunning(false);
        return;
      }

      let updatedStudents = 0;
      let skippedStudents = 0;
      let updatedEnrollments = 0;
      let skippedEnrollments = 0;
      let errors = 0;

      // ─────────────────────────────────────────────────────────────────
      // 1. OLD MODEL — patch term directly on student docs
      //    Targets: active students that have a session but no term
      // ─────────────────────────────────────────────────────────────────
      const studentsSnap = await getDocs(
        query(collection(db, "students"), where("status", "==", "active")),
      );

      const studentsMissingTerm = studentsSnap.docs.filter((d) => {
        const data = d.data();
        // Only touch old-model docs (those that still carry session on the student doc)
        const hasSessionOnDoc = !!data.session;
        const missingTerm = !data.term || String(data.term).trim() === "";
        return hasSessionOnDoc && missingTerm;
      });

      skippedStudents = studentsSnap.docs.length - studentsMissingTerm.length;

      if (studentsMissingTerm.length > 0) {
        const CHUNK = 499;
        for (let i = 0; i < studentsMissingTerm.length; i += CHUNK) {
          const chunk = studentsMissingTerm.slice(i, i + CHUNK);
          const batch = writeBatch(db);
          for (const d of chunk) {
            try {
              batch.update(doc(db, "students", d.id), { term: currentTerm });
              updatedStudents++;
            } catch (err) {
              console.error(`Failed student ${d.id}:`, err);
              errors++;
            }
          }
          await batch.commit();
        }
      }

      // ─────────────────────────────────────────────────────────────────
      // 2. NEW MODEL — patch term on studentEnrollments docs
      //    Targets: active enrollments missing a term
      // ─────────────────────────────────────────────────────────────────
      const enrollmentsSnap = await getDocs(
        query(collection(db, "studentEnrollments"), where("status", "==", "active")),
      );

      const enrollmentsMissingTerm = enrollmentsSnap.docs.filter((d) => {
        const term = d.data().term;
        return !term || String(term).trim() === "";
      });

      skippedEnrollments = enrollmentsSnap.docs.length - enrollmentsMissingTerm.length;

      if (enrollmentsMissingTerm.length > 0) {
        const CHUNK = 499;
        for (let i = 0; i < enrollmentsMissingTerm.length; i += CHUNK) {
          const chunk = enrollmentsMissingTerm.slice(i, i + CHUNK);
          const batch = writeBatch(db);
          for (const d of chunk) {
            try {
              batch.update(doc(db, "studentEnrollments", d.id), { term: currentTerm });
              updatedEnrollments++;
            } catch (err) {
              console.error(`Failed enrollment ${d.id}:`, err);
              errors++;
            }
          }
          await batch.commit();
        }
      }

      const r = {
        updatedStudents,
        skippedStudents,
        updatedEnrollments,
        skippedEnrollments,
        errors,
        currentTerm,
      };

      setResult(r);
      onDone?.(r);
    } catch (err) {
      console.error("Set term failed:", err);
      alert("Something went wrong. Check the console for details.");
    } finally {
      setRunning(false);
    }
  };

  const totalUpdated = result ? result.updatedStudents + result.updatedEnrollments : 0;
  const hasErrors = result?.errors > 0;

  return (
    <div
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "0.4rem",
        padding: "0.75rem 1rem",
        border: "1px dashed var(--input-border, #d1d5db)",
        borderRadius: "var(--border-radius-sm, 8px)",
        backgroundColor: "var(--card-bg, #fff)",
        marginBottom: "0.75rem",
      }}
    >
      <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
        🛠 Admin Tool
      </p>

      <CustomButton
        type='button'
        variant='secondary'
        loading={running}
        loadingText='Setting term on records...'
        onClick={handleSetTerm}
      >
        Set Current Term on Existing Students
      </CustomButton>

      {result && (
        <div
          style={{
            fontSize: 12,
            color: hasErrors ? "var(--color-danger, #ef4444)" : "var(--color-success, #16a34a)",
            lineHeight: 1.6,
          }}
        >
          {totalUpdated > 0 ? (
            <>
              ✅ Term set to <strong>"{result.currentTerm}"</strong>
              {result.updatedStudents > 0 && (
                <>
                  {" "}
                  — {result.updatedStudents} student doc
                  {result.updatedStudents !== 1 ? "s" : ""} updated
                </>
              )}
              {result.updatedEnrollments > 0 && (
                <>
                  {" "}
                  — {result.updatedEnrollments} enrollment
                  {result.updatedEnrollments !== 1 ? "s" : ""} updated
                </>
              )}
              {result.skippedStudents + result.skippedEnrollments > 0 && (
                <>
                  , {result.skippedStudents + result.skippedEnrollments} already had a term
                  (skipped)
                </>
              )}
              {hasErrors && <>, {result.errors} failed — check console</>}
            </>
          ) : (
            <>✅ All records already have a term — nothing to update.</>
          )}
        </div>
      )}
    </div>
  );
}
