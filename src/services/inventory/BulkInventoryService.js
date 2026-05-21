import ExcelJS from "exceljs";
import { createInventoryItem, getInventoryItems } from "./inventoryService";

const C = {
  name: 1,
  description: 2,
  category: 3,
  unit: 4,
  price: 5,
  stock: 6,
};

const DATA_START_ROW = 5;
const VALID_CATEGORIES = [
  "Uniform",
  "Books",
  "Stationery",
  "Sportswear",
  "Lab Equipment",
  "Art Supplies",
  "Food & Tuck",
  "Other",
];
const VALID_UNITS = ["piece", "set", "pair", "pack", "bottle", "bag", "box", "roll", "sheet"];

const str = (v) => (v !== null && v !== undefined ? String(v).trim() : "");

export async function parseInventoryFile(file) {
  const workbook = new ExcelJS.Workbook();
  const arrayBuffer = await file.arrayBuffer();
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.worksheets[0];
  const parsed = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber < DATA_START_ROW) return;

    const rowData = {
      _rowIndex: rowNumber,
      name: str(row.getCell(C.name).value),
      description: str(row.getCell(C.description).value),
      category: str(row.getCell(C.category).value),
      unit: str(row.getCell(C.unit).value),
      price: str(row.getCell(C.price).value),
      stock: str(row.getCell(C.stock).value),
    };

    if (rowData.name || rowData.category || rowData.unit || rowData.price || rowData.stock) {
      parsed.push(rowData);
    }
  });

  return parsed;
}

export async function loadExistingItems() {
  return getInventoryItems({ activeOnly: false });
}

export function validateRows(rows, existingItems = []) {
  const existingMap = new Map(
    existingItems.map((item) => [
      `${String(item.name).trim().toLowerCase()}|${String(item.category).trim().toLowerCase()}`,
      item,
    ]),
  );

  const seenKeys = new Set();

  return rows.map((row) => {
    const errors = [];
    const warnings = [];
    const name = row.name.trim();
    const category = row.category.trim();
    const unit = row.unit.trim();
    const priceValue = Number(row.price);
    const stockValue = row.stock === "" ? -1 : Number(row.stock);

    if (!name) errors.push("Name is required.");
    if (!category) errors.push("Category is required.");
    if (!unit) errors.push("Unit is required.");
    if (row.price === "") {
      errors.push("Price is required.");
    } else if (Number.isNaN(priceValue) || priceValue < 0) {
      errors.push("Price must be a valid non-negative number.");
    }
    if (
      row.stock !== "" &&
      (Number.isNaN(stockValue) || !Number.isInteger(stockValue) || stockValue < -1)
    ) {
      errors.push("Stock must be a whole number or blank for unlimited.");
    }

    if (category && !VALID_CATEGORIES.some((cat) => cat.toLowerCase() === category.toLowerCase())) {
      warnings.push(`Category "${category}" is not one of the standard categories.`);
    }
    if (unit && !VALID_UNITS.some((u) => u.toLowerCase() === unit.toLowerCase())) {
      warnings.push(`Unit "${unit}" is not one of the standard units.`);
    }

    const key = `${name.toLowerCase()}|${category.toLowerCase()}`;
    if (seenKeys.has(key)) {
      warnings.push("Duplicate row in file.");
    } else {
      seenKeys.add(key);
    }

    if (existingMap.has(key)) {
      warnings.push("Item already exists and will be skipped.");
    }

    const isDuplicate = existingMap.has(key) || warnings.includes("Duplicate row in file.");
    const valid = errors.length === 0 && !isDuplicate;

    return {
      ...row,
      name,
      category,
      unit,
      price: priceValue,
      stock: stockValue,
      _errors: errors,
      _warnings: warnings,
      _valid: valid,
      _status: errors.length > 0 ? "Error" : isDuplicate ? "Skipped" : "Ready",
    };
  });
}

export async function importRows(validatedRows, userId, { onProgress } = {}) {
  const result = {
    imported: 0,
    skipped: 0,
    errors: [],
    warnings: [],
  };

  const rowsToImport = validatedRows.filter((row) => row._valid);
  const total = rowsToImport.length;

  for (let index = 0; index < rowsToImport.length; index += 1) {
    const row = rowsToImport[index];
    onProgress?.({ current: index + 1, total, row });

    try {
      await createInventoryItem(
        {
          name: row.name,
          description: row.description,
          category: row.category,
          unit: row.unit,
          price: row.price,
          stock: row.stock,
        },
        userId,
      );
      result.imported += 1;
    } catch (error) {
      result.errors.push({ row: row._rowIndex, error: error.message || String(error) });
    }
  }

  const skipped = validatedRows.length - rowsToImport.length;
  result.skipped = skipped;
  validatedRows.forEach((row) => {
    if (!row._valid && row._warnings?.length) {
      row._warnings.forEach((warning) => result.warnings.push({ row: row._rowIndex, warning }));
    }
  });

  return result;
}
