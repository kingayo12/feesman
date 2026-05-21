/**
 * inventoryService.js
 * Place in: src/pages/inventory/inventoryService.js
 *
 * Data model
 * ──────────
 * inventory/{itemId}
 *   name        string
 *   description string
 *   category    string   e.g. "Uniform", "Books", "Stationery"
 *   unit        string   e.g. "piece", "set", "pair"
 *   price       number   current price (NGN)
 *   stock       number   available quantity (-1 = unlimited)
 *   isActive    boolean
 *   createdAt   Timestamp
 *   updatedAt   Timestamp
 *
 * inventory/{itemId}/priceHistory/{historyId}
 *   price       number
 *   changedAt   Timestamp
 *   changedBy   string (uid)
 *   note        string
 *
 * studentInventory/{studentItemId}   (top-level collection, queried by studentId)
 *   studentId       string
 *   studentName     string
 *   classId         string
 *   itemId          string
 *   itemName        string   snapshot
 *   category        string   snapshot
 *   unit            string   snapshot
 *   priceSnapshot   number   price AT TIME OF ASSIGNMENT — never changes
 *   quantity        number
 *   totalAmount     number   priceSnapshot × quantity
 *   academicYear    string
 *   term            string
 *   assignedAt      Timestamp
 *   assignedBy      string (uid)
 *   note            string
 *   isPaid          boolean
 *   paidAt          Timestamp | null
 *
 * Price snapshot rule
 * ───────────────────
 * When an item is assigned to a student the CURRENT price is copied into
 * priceSnapshot. Subsequent price changes on the inventory item do NOT
 * touch existing studentInventory records. If the price changes within
 * the same term, only NEW assignments in that term use the new price.
 */

import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";

const INVENTORY_COL = "inventory";
const STUDENT_INVENTORY_COL = "studentInventory";

// ─────────────────────────────────────────────
// Inventory CRUD
// ─────────────────────────────────────────────

/** Fetch all inventory items (active or all) */
export async function getInventoryItems({ activeOnly = false } = {}) {
  const q = activeOnly
    ? query(
        collection(db, INVENTORY_COL),
        where("isActive", "==", true),
        orderBy("category"),
        orderBy("name"),
      )
    : query(collection(db, INVENTORY_COL), orderBy("category"), orderBy("name"));

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Fetch a single item */
export async function getInventoryItem(itemId) {
  const snap = await getDoc(doc(db, INVENTORY_COL, itemId));
  if (!snap.exists()) throw new Error("Item not found");
  return { id: snap.id, ...snap.data() };
}

/** Create a new inventory item */
export async function createInventoryItem(data, userId) {
  const payload = {
    name: data.name.trim(),
    description: (data.description || "").trim(),
    category: data.category.trim(),
    unit: (data.unit || "piece").trim(),
    price: Number(data.price),
    stock: data.stock !== undefined && data.stock !== "" ? Number(data.stock) : -1,
    isActive: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const ref = await addDoc(collection(db, INVENTORY_COL), payload);

  // Record initial price in history
  await addDoc(collection(db, INVENTORY_COL, ref.id, "priceHistory"), {
    price: payload.price,
    changedAt: serverTimestamp(),
    changedBy: userId,
    note: "Initial price",
  });

  return ref.id;
}

/** Update an inventory item. If price changed, record history. */
export async function updateInventoryItem(itemId, data, userId) {
  const existing = await getInventoryItem(itemId);
  const newPrice = Number(data.price);
  const priceChanged = newPrice !== existing.price;

  const payload = {
    name: data.name.trim(),
    description: (data.description || "").trim(),
    category: data.category.trim(),
    unit: (data.unit || "piece").trim(),
    price: newPrice,
    stock: data.stock !== undefined && data.stock !== "" ? Number(data.stock) : -1,
    isActive: data.isActive !== undefined ? data.isActive : existing.isActive,
    updatedAt: serverTimestamp(),
  };

  await updateDoc(doc(db, INVENTORY_COL, itemId), payload);

  if (priceChanged) {
    await addDoc(collection(db, INVENTORY_COL, itemId, "priceHistory"), {
      price: newPrice,
      previousPrice: existing.price,
      changedAt: serverTimestamp(),
      changedBy: userId,
      note: (data.priceChangeNote || "").trim(),
    });
  }
}

/** Soft-delete: mark inactive */
export async function deactivateInventoryItem(itemId) {
  await updateDoc(doc(db, INVENTORY_COL, itemId), {
    isActive: false,
    updatedAt: serverTimestamp(),
  });
}

/** Hard delete — only if no student assignments exist */
export async function deleteInventoryItem(itemId) {
  const assigned = await getDocs(
    query(collection(db, STUDENT_INVENTORY_COL), where("itemId", "==", itemId)),
  );
  if (!assigned.empty) {
    throw new Error(
      "This item has been assigned to students and cannot be deleted. Deactivate it instead.",
    );
  }
  await deleteDoc(doc(db, INVENTORY_COL, itemId));
}

/** Fetch price history for an item */
export async function getItemPriceHistory(itemId) {
  const snap = await getDocs(
    query(collection(db, INVENTORY_COL, itemId, "priceHistory"), orderBy("changedAt", "desc")),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ─────────────────────────────────────────────
// Student inventory assignment
// ─────────────────────────────────────────────

/**
 * Assign an inventory item to a student.
 * Snapshots the current price — future price changes on the item
 * will NOT affect this record.
 */
export async function assignItemToStudent({
  studentId,
  studentName,
  classId,
  itemId,
  quantity,
  academicYear,
  term,
  note,
  assignedBy,
}) {
  const item = await getInventoryItem(itemId);

  if (!item.isActive) throw new Error("This item is no longer active.");

  if (item.stock !== -1 && item.stock < quantity) {
    throw new Error(`Only ${item.stock} unit(s) in stock.`);
  }

  const priceSnapshot = item.price; // frozen at this moment
  const totalAmount = priceSnapshot * Number(quantity);

  const payload = {
    studentId,
    studentName,
    classId,
    itemId,
    itemName: item.name, // snapshot
    category: item.category, // snapshot
    unit: item.unit, // snapshot
    priceSnapshot, // KEY: never changes after this point
    quantity: Number(quantity),
    totalAmount,
    academicYear,
    term,
    assignedAt: serverTimestamp(),
    assignedBy,
    note: (note || "").trim(),
    isPaid: false,
    paidAt: null,
  };

  const ref = await addDoc(collection(db, STUDENT_INVENTORY_COL), payload);

  // Decrement stock if tracked
  if (item.stock !== -1) {
    await updateDoc(doc(db, INVENTORY_COL, itemId), {
      stock: item.stock - Number(quantity),
      updatedAt: serverTimestamp(),
    });
  }

  return ref.id;
}

/** Update an existing student assignment (quantity, note) */
export async function updateStudentAssignment(assignmentId, { quantity, note }) {
  const snap = await getDoc(doc(db, STUDENT_INVENTORY_COL, assignmentId));
  if (!snap.exists()) throw new Error("Assignment not found");
  const existing = snap.data();

  const newQty = Number(quantity);
  const qtyDiff = newQty - existing.quantity;

  // Check stock for the difference if tracked
  if (qtyDiff > 0) {
    const item = await getInventoryItem(existing.itemId);
    if (item.stock !== -1 && item.stock < qtyDiff) {
      throw new Error(`Only ${item.stock} additional unit(s) available.`);
    }
    if (item.stock !== -1) {
      await updateDoc(doc(db, INVENTORY_COL, existing.itemId), {
        stock: item.stock - qtyDiff,
        updatedAt: serverTimestamp(),
      });
    }
  }

  // Restore stock if quantity reduced
  if (qtyDiff < 0) {
    const item = await getInventoryItem(existing.itemId);
    if (item.stock !== -1) {
      await updateDoc(doc(db, INVENTORY_COL, existing.itemId), {
        stock: item.stock + Math.abs(qtyDiff),
        updatedAt: serverTimestamp(),
      });
    }
  }

  await updateDoc(doc(db, STUDENT_INVENTORY_COL, assignmentId), {
    quantity: newQty,
    totalAmount: existing.priceSnapshot * newQty, // still uses the original snapshot price
    note: (note || "").trim(),
  });
}

/** Mark a student assignment as paid */
export async function markAssignmentPaid(assignmentId, paid = true) {
  await updateDoc(doc(db, STUDENT_INVENTORY_COL, assignmentId), {
    isPaid: paid,
    paidAt: paid ? serverTimestamp() : null,
  });
}

/** Remove an assignment and restore stock */
export async function removeStudentAssignment(assignmentId) {
  const snap = await getDoc(doc(db, STUDENT_INVENTORY_COL, assignmentId));
  if (!snap.exists()) throw new Error("Assignment not found");
  const data = snap.data();

  // Restore stock
  const item = await getDoc(doc(db, INVENTORY_COL, data.itemId));
  if (item.exists() && item.data().stock !== -1) {
    await updateDoc(doc(db, INVENTORY_COL, data.itemId), {
      stock: item.data().stock + data.quantity,
      updatedAt: serverTimestamp(),
    });
  }

  await deleteDoc(doc(db, STUDENT_INVENTORY_COL, assignmentId));
}

/** Get all inventory assignments for a student (optionally filtered by term) */
export async function getStudentAssignments(studentId, { academicYear, term } = {}) {
  let q = query(
    collection(db, STUDENT_INVENTORY_COL),
    where("studentId", "==", studentId),
    orderBy("assignedAt", "desc"),
  );

  if (academicYear) {
    q = query(q, where("academicYear", "==", academicYear));
  }
  if (term) {
    q = query(q, where("term", "==", term));
  }

  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Get all assignments for a class in a given term */
export async function getClassAssignments(classId, academicYear, term) {
  const snap = await getDocs(
    query(
      collection(db, STUDENT_INVENTORY_COL),
      where("classId", "==", classId),
      where("academicYear", "==", academicYear),
      where("term", "==", term),
      orderBy("studentName"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Get all assignments for an inventory item */
export async function getItemAssignments(itemId) {
  const snap = await getDocs(
    query(
      collection(db, STUDENT_INVENTORY_COL),
      where("itemId", "==", itemId),
      orderBy("assignedAt", "desc"),
    ),
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Summary stats for an item: total assigned, total paid */
export async function getItemStats(itemId) {
  const assignments = await getItemAssignments(itemId);
  const totalAssigned = assignments.reduce((s, a) => s + a.totalAmount, 0);
  const totalPaid = assignments.filter((a) => a.isPaid).reduce((s, a) => s + a.totalAmount, 0);
  const totalStudents = new Set(assignments.map((a) => a.studentId)).size;
  return {
    totalAssigned,
    totalPaid,
    totalOutstanding: totalAssigned - totalPaid,
    totalStudents,
    totalRecords: assignments.length,
  };
}
