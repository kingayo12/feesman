import ExcelJS from "exceljs";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  Timestamp,
  getDoc,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/firestore";

/**
 * Column mapping (ExcelJS is 1-indexed)
 */
const C = {
  firstName: 1,
  lastName: 2,
  otherName: 3,
  dob: 4,
  gender: 5,
  admissionNo: 6,
  familyName: 7,
  parentName: 8,
  phone: 9,
  altPhone: 10,
  email: 11,
  address: 12,
  className: 13,
  academicYear: 14,
  term: 15,
  religion: 16,
  stateOfOrigin: 17,
  bloodGroup: 18,
  notes: 19,
};

const VALID_TERMS = ["1st Term", "2nd Term", "3rd Term"];
const DATA_START_ROW = 5; // Row 1-4 are headers/examples. Data starts at 5.

const str = (v) => (v !== null && v !== undefined ? String(v).trim() : "");

/**
 * Generate admission number if not provided
 * Format: ABBR/STATE/YYYY/MMDD/RR
 */
function generateAdmissionNo(abbr = "SCH", state = "NG") {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 90) + 10);
  const abbrPart = (abbr || "SCH").toUpperCase().slice(0, 4).replace(/\s/g, "");
  const statePart = (state || "NG").toUpperCase().slice(0, 3).replace(/\s/g, "");
  return `${abbrPart}/${statePart}/${year}/${month}${day}/${rand}`;
}

/**
 * Parses Excel file using ExcelJS
 */
export async function parseEnrolmentFile(file) {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  const parsed = [];

  worksheet.eachRow((row, rowNumber) => {
    // Skip header rows and the example row
    if (rowNumber < DATA_START_ROW) return;

    const rowData = {
      _rowIndex: rowNumber,
      firstName: str(row.getCell(C.firstName).value),
      lastName: str(row.getCell(C.lastName).value),
      otherName: str(row.getCell(C.otherName).value),
      dob: row.getCell(C.dob).value instanceof Date ? row.getCell(C.dob).value : null,
      gender: str(row.getCell(C.gender).value),
      admissionNo: str(row.getCell(C.admissionNo).value),
      familyName: str(row.getCell(C.familyName).value),
      parentName: str(row.getCell(C.parentName).value),
      phone: str(row.getCell(C.phone).value),
      altPhone: str(row.getCell(C.altPhone).value),
      email: str(row.getCell(C.email).value),
      address: str(row.getCell(C.address).value),
      className: str(row.getCell(C.className).value),
      academicYear: str(row.getCell(C.academicYear).value),
      term: str(row.getCell(C.term).value),
      religion: str(row.getCell(C.religion).value),
      stateOfOrigin: str(row.getCell(C.stateOfOrigin).value),
      bloodGroup: str(row.getCell(C.bloodGroup).value),
      notes: str(row.getCell(C.notes).value),
    };

    // Filter out rows that are effectively empty
    if (rowData.firstName || rowData.lastName || rowData.familyName) {
      parsed.push(rowData);
    }
  });

  return parsed;
}

export function validateRows(
  rows,
  classes,
  {
    existingStudents = [],
    existingFamilies = [],
    existingEnrollments = [],
    schoolAbbr = "SCH",
    schoolState = "NG",
  } = {},
) {
  const classMap = {};
  classes.forEach((c) => {
    classMap[c.name.toLowerCase()] = c;
  });

  const familyMap = {};
  existingFamilies.forEach((f) => {
    familyMap[(f.familyName || "").toLowerCase()] = f;
  });

  return rows.map((row) => {
    const errors = [];
    const warnings = [];

    // Validate required fields
    if (!row.firstName) errors.push("First Name is required.");
    if (!row.lastName) errors.push("Last Name is required.");
    if (!row.gender || !["male", "female"].includes(row.gender.toLowerCase()))
      errors.push("Gender must be Male or Female.");
    if (!row.familyName) errors.push("Family Name is required.");
    if (!row.parentName) errors.push("Parent/Guardian is required.");
    if (!row.phone) errors.push("Phone Number is required.");
    if (!row.className) errors.push("Class Name is required.");
    if (!row.academicYear) errors.push("Academic Year is required.");
    if (!row.term || !VALID_TERMS.includes(row.term))
      errors.push(`Term must be: ${VALID_TERMS.join(", ")}.`);

    const resolvedClass = classMap[row.className.toLowerCase()];
    if (row.className && !resolvedClass) errors.push(`Class "${row.className}" not found.`);

    // Check for existing family
    const existingFamily = familyMap[row.familyName.toLowerCase()];
    let _existingFamilyId = existingFamily?.id || null;

    // Check for existing student (if family found)
    let _existingStudentId = null;
    if (_existingFamilyId) {
      const existing = existingStudents.find(
        (s) =>
          s.familyId === _existingFamilyId &&
          s.firstName.toLowerCase() === row.firstName.toLowerCase() &&
          s.lastName.toLowerCase() === row.lastName.toLowerCase(),
      );
      if (existing) {
        _existingStudentId = existing.id;
        warnings.push(`Student "${row.firstName} ${row.lastName}" already exists in this family.`);
      }
    }

    // Check for existing enrollment (if student found)
    let _existingEnrollmentId = null;
    if (_existingStudentId && resolvedClass) {
      const existing = existingEnrollments.find(
        (e) =>
          e.studentId === _existingStudentId &&
          e.classId === resolvedClass.id &&
          e.session === row.academicYear &&
          e.term === row.term,
      );
      if (existing) {
        _existingEnrollmentId = existing.id;
        warnings.push(
          `This student is already enrolled in ${resolvedClass.name} for ${row.academicYear} ${row.term}.`,
        );
      }
    }

    // Auto-generate admission number if not provided
    let finalAdmissionNo = row.admissionNo;
    if (!finalAdmissionNo) {
      finalAdmissionNo = generateAdmissionNo(schoolAbbr, schoolState);
    }

    return {
      ...row,
      admissionNo: finalAdmissionNo,
      _errors: errors,
      _warnings: warnings,
      _valid: errors.length === 0,
      _resolvedClassId: resolvedClass?.id || null,
      _resolvedClassName: resolvedClass?.name || row.className,
      _existingFamilyId,
      _existingStudentId,
      _existingEnrollmentId,
      _action: _existingEnrollmentId ? "skip" : _existingStudentId ? "enroll" : "create", // default action
    };
  });
}

export async function importRows(validatedRows, { onProgress } = {}) {
  const rows = validatedRows.filter((r) => r._valid);
  const results = { imported: 0, skipped: 0, errors: [], warnings: [] };
  const familyCache = {};

  const famSnap = await getDocs(collection(db, "families"));
  famSnap.forEach((d) => {
    familyCache[(d.data().familyName || "").toLowerCase()] = d.id;
  });

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    onProgress?.({ current: i + 1, total: rows.length, row });

    try {
      let familyId = row._existingFamilyId || familyCache[row.familyName.toLowerCase()];

      if (!familyId) {
        // Create new family
        const famRef = await addDoc(collection(db, "families"), {
          familyName: row.familyName,
          parentName: row.parentName,
          phone: row.phone,
          altPhone: row.altPhone || "",
          email: row.email || "",
          address: row.address || "",
          createdAt: serverTimestamp(),
          source: "bulk_import",
        });
        familyId = famRef.id;
        familyCache[row.familyName.toLowerCase()] = familyId;
      } else if (!row._existingFamilyId) {
        // Family exists but wasn't marked as existing during validation
        // Update it with any new information provided
        const existingFam = await getDoc(doc(db, "families", familyId));
        if (existingFam.exists()) {
          const existingData = existingFam.data();
          const updateData = {};
          // Only update if new value is provided and different
          if (row.phone && row.phone !== existingData.phone) updateData.phone = row.phone;
          if (row.altPhone && row.altPhone !== existingData.altPhone)
            updateData.altPhone = row.altPhone;
          if (row.email && row.email !== existingData.email) updateData.email = row.email;
          if (row.address && row.address !== existingData.address) updateData.address = row.address;

          if (Object.keys(updateData).length > 0) {
            await updateDoc(doc(db, "families", familyId), updateData);
            results.warnings.push({
              row: row._rowIndex,
              warning: `Family "${row.familyName}" updated with new contact info.`,
            });
          }
        }
      }

      // Handle student creation or re-enrollment
      let studentId = row._existingStudentId;

      if (!studentId) {
        // Create new student
        const studentPayload = {
          firstName: row.firstName,
          lastName: row.lastName,
          otherName: row.otherName || "",
          gender: row.gender,
          familyId,
          classId: row._resolvedClassId,
          admissionNo: row.admissionNo,
          religion: row.religion || "",
          stateOfOrigin: row.stateOfOrigin || "",
          bloodGroup: row.bloodGroup || "",
          notes: row.notes || "",
          status: "active",
          createdAt: serverTimestamp(),
          source: "bulk_import",
        };
        if (row.dob) studentPayload.dateOfBirth = Timestamp.fromDate(row.dob);
        const stuRef = await addDoc(collection(db, "students"), studentPayload);
        studentId = stuRef.id;
      }

      // Handle enrollment
      if (row._existingEnrollmentId) {
        // Enrollment already exists - skip
        results.skipped++;
        results.warnings.push({
          row: row._rowIndex,
          warning: `Enrollment already exists for ${row.firstName} ${row.lastName} in ${row._resolvedClassName} (${row.academicYear} ${row.term}).`,
        });
      } else {
        // Create new enrollment
        const enrolSnap = await getDocs(
          query(
            collection(db, "enrollments"),
            where("studentId", "==", studentId),
            where("classId", "==", row._resolvedClassId),
            where("session", "==", row.academicYear),
            where("term", "==", row.term),
          ),
        );

        if (enrolSnap.empty) {
          await addDoc(collection(db, "enrollments"), {
            studentId,
            familyId,
            classId: row._resolvedClassId,
            className: row._resolvedClassName,
            session: row.academicYear,
            term: row.term,
            status: "active",
            createdAt: serverTimestamp(),
            source: "bulk_import",
          });
        }
        results.imported++;
      }
    } catch (err) {
      results.errors.push({ row: row._rowIndex, error: err.message });
      results.skipped++;
    }
  }
  return results;
}
