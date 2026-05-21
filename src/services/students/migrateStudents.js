import { collection, getDocs, addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase/firestore";

export const migrateToEnrollments = async () => {
  const snapshot = await getDocs(collection(db, "students"));
  const enrollmentRef = collection(db, "studentEnrollments");

  let created = 0;
  let skipped = 0;

  for (const d of snapshot.docs) {
    const data = d.data();

    // Skip if already migrated (no session on student doc)
    if (!data.session && !data.classId) {
      skipped++;
      continue;
    }

    // Create enrollment from existing student fields
    await addDoc(enrollmentRef, {
      studentId: d.id,
      classId: data.classId || null,
      session: data.session || "2024/2025",
      term: data.term || "1st Term",
      status: "active",
      enrolledAt: data.createdAt || serverTimestamp(),
      promotedAt: null,
    });

    // Remove session/term/classId from student identity doc
    await updateDoc(doc(db, "students", d.id), {
      session: null, // or use deleteField() from firebase/firestore
      term: null,
      classId: null,
    });

    created++;
  }

  console.log(`Migration done — ${created} enrollments created, ${skipped} skipped`);
};
