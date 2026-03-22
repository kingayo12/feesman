/**
 * MigrateTerms.jsx
 * ==================
 * Drop this into your app temporarily, add a route for it (e.g. /migrate),
 * visit the page, click "Run Migration", then delete the file and route.
 *
 * Place in: src/pages/settings/MigrateTerms.jsx
 * Add route: <Route path="/migrate" element={<MigrateTerms />} />
 */

import { useState } from "react";
import { collection, getDocs, writeBatch } from "firebase/firestore";
import { db } from "../../firebase/firestore";

const TERM_MAP = {
  "First Term": "1st Term",
  "Second Term": "2nd Term",
  "Third Term": "3rd Term",
};

const COLLECTIONS_WITH_TERM = ["fees", "payments", "classes"];

export default function MigrateTerms() {
  const [log, setLog] = useState([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  const addLog = (msg) => setLog((prev) => [...prev, msg]);

  const runMigration = async () => {
    setRunning(true);
    setLog([]);
    setDone(false);

    let totalUpdated = 0;

    try {
      for (const collName of COLLECTIONS_WITH_TERM) {
        addLog(`📂 Scanning "${collName}"...`);

        const snapshot = await getDocs(collection(db, collName));
        const toUpdate = [];

        snapshot.forEach((docSnap) => {
          const oldTerm = docSnap.data().term;
          const newTerm = TERM_MAP[oldTerm];
          if (newTerm) toUpdate.push({ ref: docSnap.ref, oldTerm, newTerm });
        });

        addLog(`   ${snapshot.size} docs scanned — ${toUpdate.length} need updating`);

        if (toUpdate.length === 0) {
          addLog(`   ✅ Already up to date`);
          continue;
        }

        // Firestore batch limit = 500; use 400 to be safe
        const BATCH_SIZE = 400;
        for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
          const batch = writeBatch(db);
          const chunk = toUpdate.slice(i, i + BATCH_SIZE);
          chunk.forEach(({ ref, newTerm }) => batch.update(ref, { term: newTerm }));
          await batch.commit();
          totalUpdated += chunk.length;
          addLog(`   ✅ Batch committed: ${chunk.length} docs`);
        }
      }

      // Fix settings.currentTerm too
      addLog(`📂 Checking "settings"...`);
      const settingsSnap = await getDocs(collection(db, "settings"));
      const settingsBatch = writeBatch(db);
      let settingsUpdated = 0;

      settingsSnap.forEach((docSnap) => {
        const newTerm = TERM_MAP[docSnap.data().currentTerm];
        if (newTerm) {
          settingsBatch.update(docSnap.ref, { currentTerm: newTerm });
          settingsUpdated++;
          addLog(`   Updating currentTerm → "${newTerm}"`);
        }
      });

      if (settingsUpdated > 0) {
        await settingsBatch.commit();
        addLog(`   ✅ Settings updated`);
      } else {
        addLog(`   ✅ Settings already correct`);
      }

      addLog(`\n🎉 Done! ${totalUpdated + settingsUpdated} documents updated total.`);
      setDone(true);
    } catch (err) {
      addLog(`❌ Error: ${err.message}`);
      console.error(err);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "2rem auto", padding: "0 1rem" }}>
      <div
        style={{
          background: "var(--color-background-secondary)",
          border: "1px solid var(--color-border-secondary)",
          borderRadius: 12,
          padding: "2rem",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Term Migration</h2>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "1.5rem" }}>
          Renames <code>"First Term"</code>, <code>"Second Term"</code>, <code>"Third Term"</code> →{" "}
          <code>"1st Term"</code>, <code>"2nd Term"</code>, <code>"3rd Term"</code> across{" "}
          <strong>fees</strong>, <strong>payments</strong>, <strong>classes</strong>, and{" "}
          <strong>settings</strong>.
        </p>

        <button
          onClick={runMigration}
          disabled={running || done}
          style={{
            padding: "10px 24px",
            background: done ? "var(--color-background-success)" : "var(--color-text-info)",
            color: "#fc0404",
            border: "none",
            borderRadius: 8,
            cursor: running || done ? "not-allowed" : "pointer",
            fontSize: 14,
            fontWeight: 500,
          }}
        >
          {running ? "Running..." : done ? "✅ Migration Complete" : "Run Migration"}
        </button>

        {log.length > 0 && (
          <pre
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: "var(--color-background-tertiary)",
              borderRadius: 8,
              fontSize: 13,
              lineHeight: 1.7,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "var(--color-text-primary)",
              maxHeight: 400,
              overflowY: "auto",
            }}
          >
            {log.join("\n")}
          </pre>
        )}

        {done && (
          <p
            style={{
              marginTop: "1rem",
              padding: "12px 16px",
              background: "var(--color-background-success)",
              borderRadius: 8,
              color: "var(--color-text-success)",
              fontSize: 13,
            }}
          >
            Migration complete. Remove this page and its route from your app.
          </p>
        )}
      </div>
    </div>
  );
}
