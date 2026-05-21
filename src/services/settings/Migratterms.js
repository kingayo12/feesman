/**
 * ONE-TIME FIRESTORE TERM MIGRATION
 * ===================================
 * Run this in your browser console on any page that already has Firebase
 * initialized (e.g. your running app at localhost:5173).
 *
 * It will scan the fees, payments, classes, and settings collections
 * and rename any "First Term" / "Second Term" / "Third Term" values
 * to "1st Term" / "2nd Term" / "3rd Term".
 *
 * Safe to run multiple times — already-normalized docs are skipped.
 */

import { db } from "./src/firebase/firestore";
import { collection, getDocs, writeBatch, doc } from "firebase/firestore";

const TERM_MAP = {
  "First Term": "1st Term",
  "Second Term": "2nd Term",
  "Third Term": "3rd Term",
};

const COLLECTIONS_WITH_TERM = ["fees", "payments", "classes"];

async function migratTerms() {
  let totalScanned = 0;
  let totalUpdated = 0;

  for (const collName of COLLECTIONS_WITH_TERM) {
    console.log(`\n📂 Scanning "${collName}"...`);

    const snapshot = await getDocs(collection(db, collName));
    const docsToUpdate = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const oldTerm = data.term;
      const newTerm = TERM_MAP[oldTerm];

      totalScanned++;

      if (newTerm) {
        docsToUpdate.push({ ref: docSnap.ref, newTerm, oldTerm });
      }
    });

    console.log(`   Found ${docsToUpdate.length} docs to update out of ${snapshot.size}`);

    // Firestore batch limit is 500 writes per batch
    const BATCH_SIZE = 400;
    for (let i = 0; i < docsToUpdate.length; i += BATCH_SIZE) {
      const batch = writeBatch(db);
      const chunk = docsToUpdate.slice(i, i + BATCH_SIZE);

      chunk.forEach(({ ref, newTerm }) => {
        batch.update(ref, { term: newTerm });
      });

      await batch.commit();
      totalUpdated += chunk.length;
      console.log(`   ✅ Committed batch of ${chunk.length} updates`);
    }
  }

  // Also fix settings.currentTerm if it uses the old format
  console.log(`\n📂 Checking "settings"...`);
  const settingsSnap = await getDocs(collection(db, "settings"));
  const settingsBatch = writeBatch(db);
  let settingsUpdated = 0;

  settingsSnap.forEach((docSnap) => {
    const data = docSnap.data();
    const newTerm = TERM_MAP[data.currentTerm];
    if (newTerm) {
      settingsBatch.update(docSnap.ref, { currentTerm: newTerm });
      settingsUpdated++;
      console.log(`   Updating settings currentTerm: "${data.currentTerm}" → "${newTerm}"`);
    }
  });

  if (settingsUpdated > 0) {
    await settingsBatch.commit();
    console.log(`   ✅ Settings updated`);
  } else {
    console.log(`   Settings already using correct format`);
  }

  console.log(`\n🎉 Migration complete!`);
  console.log(`   Total docs scanned: ${totalScanned}`);
  console.log(`   Total docs updated: ${totalUpdated + settingsUpdated}`);
}

migratTerms().catch(console.error);
