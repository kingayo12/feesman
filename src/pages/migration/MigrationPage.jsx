/**
 * MigrationPage — Temporary admin tool
 *
 * HOW TO USE:
 *  1. Add this page to your router temporarily, e.g:
 *       <Route path="/admin/migrate" element={<MigrationPage />} />
 *  2. Log in as an admin and visit /admin/migrate
 *  3. Run Step 1 first, verify in Firestore, then run Step 2
 *  4. Remove this page and its route when done
 *
 * ⚠️  ALWAYS back up your Firestore data before running.
 *     Export your data from Firebase Console → Firestore → Export.
 */

import { useState } from "react";
import { migrateToEnrollments, cleanUpOldStudentFields } from "../students/migrateToEnrollments";

export default function MigrationPage() {
  const [step1Result, setStep1Result] = useState(null);
  const [step2Result, setStep2Result] = useState(null);
  const [step1Running, setStep1Running] = useState(false);
  const [step2Running, setStep2Running] = useState(false);

  const runStep1 = async () => {
    if (
      !window.confirm(
        "This will create studentEnrollments docs from existing student data.\n\nHave you exported/backed up your Firestore data?\n\nClick OK to proceed.",
      )
    )
      return;

    setStep1Running(true);
    setStep1Result(null);
    try {
      const result = await migrateToEnrollments();
      setStep1Result({ ok: true, ...result });
    } catch (err) {
      setStep1Result({ ok: false, error: err.message });
    } finally {
      setStep1Running(false);
    }
  };

  const runStep2 = async () => {
    if (
      !window.confirm(
        "This will REMOVE session/term/classId from student docs.\n\nOnly run this AFTER verifying Step 1 looks correct in Firestore.\n\nThis cannot be undone without a backup.\n\nProceed?",
      )
    )
      return;

    setStep2Running(true);
    setStep2Result(null);
    try {
      const result = await cleanUpOldStudentFields();
      setStep2Result({ ok: true, ...result });
    } catch (err) {
      setStep2Result({ ok: false, error: err.message });
    } finally {
      setStep2Running(false);
    }
  };

  return (
    <div
      style={{ maxWidth: 680, margin: "2rem auto", padding: "0 1rem", fontFamily: "sans-serif" }}
    >
      <h2 style={{ marginBottom: "0.25rem" }}>🛠 Data Migration</h2>
      <p style={{ color: "#6b7280", marginBottom: "2rem" }}>
        Moves student enrollment data (classId, session, term) from the <code>students</code>{" "}
        collection into the new <code>studentEnrollments</code> collection.
      </p>

      {/* ── Warning banner ── */}
      <div
        style={{
          padding: "1rem",
          borderRadius: 8,
          backgroundColor: "#fef3c7",
          border: "1px solid #f59e0b",
          marginBottom: "2rem",
          fontSize: 14,
        }}
      >
        <strong>⚠️ Before you start:</strong>
        <ul style={{ marginTop: "0.5rem", paddingLeft: "1.25rem" }}>
          <li>
            Export your Firestore data first: <strong>Firebase Console → Firestore → Export</strong>
          </li>
          <li>Run Step 1 and verify in Firestore before running Step 2</li>
          <li>Step 2 is irreversible without a backup</li>
          <li>Remove this page from your router when done</li>
        </ul>
      </div>

      {/* ── Step 1 ── */}
      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Step 1 — Create Enrollment Docs</h3>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          Reads every student doc that still has <code>session</code> / <code>classId</code> on it
          and creates a corresponding <code>studentEnrollments</code> doc. Student docs are{" "}
          <strong>not modified</strong> in this step.
        </p>
        <button onClick={runStep1} disabled={step1Running} style={btnStyle("#2563eb")}>
          {step1Running ? "Running…" : "Run Step 1"}
        </button>

        {step1Result && (
          <div style={resultStyle(step1Result.ok)}>
            {step1Result.ok ? (
              <>
                <strong>✅ Done</strong>
                <br />
                Created: <strong>{step1Result.created}</strong> enrollment docs
                <br />
                Skipped: <strong>{step1Result.skipped}</strong> (already migrated)
                <br />
                Errors: <strong>{step1Result.errors?.length ?? 0}</strong>
                {step1Result.errors?.length > 0 && (
                  <pre style={{ marginTop: "0.5rem", fontSize: 12, overflowX: "auto" }}>
                    {JSON.stringify(step1Result.errors, null, 2)}
                  </pre>
                )}
                <p style={{ marginTop: "0.75rem", color: "#065f46" }}>
                  ✔ Now go to <strong>Firebase Console → Firestore → studentEnrollments</strong> and
                  verify the docs look correct before running Step 2.
                </p>
              </>
            ) : (
              <>
                <strong>❌ Error</strong>
                <br />
                {step1Result.error}
              </>
            )}
          </div>
        )}
      </div>

      {/* ── Step 2 ── */}
      <div style={{ ...cardStyle, marginTop: "1.5rem" }}>
        <h3 style={{ marginTop: 0 }}>Step 2 — Clean Up Old Fields</h3>
        <p style={{ color: "#6b7280", fontSize: 14 }}>
          Removes <code>session</code>, <code>term</code>, and <code>classId</code> from student
          identity docs. Only run this <strong>after verifying Step 1</strong> in Firestore.
        </p>
        <button
          onClick={runStep2}
          disabled={step2Running || !step1Result?.ok}
          style={btnStyle(step1Result?.ok ? "#dc2626" : "#9ca3af")}
          title={!step1Result?.ok ? "Run Step 1 successfully first" : ""}
        >
          {step2Running ? "Running…" : "Run Step 2"}
        </button>
        {!step1Result?.ok && (
          <p style={{ fontSize: 13, color: "#9ca3af", marginTop: "0.5rem" }}>
            Step 2 is locked until Step 1 completes successfully.
          </p>
        )}

        {step2Result && (
          <div style={resultStyle(step2Result.ok)}>
            {step2Result.ok ? (
              <>
                <strong>✅ Done</strong>
                <br />
                Cleaned: <strong>{step2Result.cleaned}</strong> student docs
                <br />
                Errors: <strong>{step2Result.errors?.length ?? 0}</strong>
                {step2Result.errors?.length > 0 && (
                  <pre style={{ marginTop: "0.5rem", fontSize: 12, overflowX: "auto" }}>
                    {JSON.stringify(step2Result.errors, null, 2)}
                  </pre>
                )}
                <p style={{ marginTop: "0.75rem", color: "#065f46" }}>
                  🎉 Migration complete! You can now remove this page and its route.
                </p>
              </>
            ) : (
              <>
                <strong>❌ Error</strong>
                <br />
                {step2Result.error}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const cardStyle = {
  padding: "1.5rem",
  borderRadius: 8,
  border: "1px solid #e5e7eb",
  backgroundColor: "#fff",
};

const btnStyle = (bg) => ({
  padding: "0.6rem 1.25rem",
  backgroundColor: bg,
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontWeight: 600,
  fontSize: 14,
});

const resultStyle = (ok) => ({
  marginTop: "1rem",
  padding: "0.75rem 1rem",
  borderRadius: 6,
  backgroundColor: ok ? "#d1fae5" : "#fee2e2",
  border: `1px solid ${ok ? "#6ee7b7" : "#fca5a5"}`,
  color: ok ? "#065f46" : "#991b1b",
  fontSize: 14,
});
