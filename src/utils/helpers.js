/**
 * Filters an array of objects based on a search query.
 * @param {Array} items - The list of families or students.
 * @param {String} query - The search text.
 * @param {Array} keys - The properties to search in (e.g., ['familyName', 'phone']).
 */
export const filterData = (items, query, keys) => {
  if (!query) return items;

  const lowerQuery = query.toLowerCase();

  return items.filter((item) =>
    keys.some((key) => item[key]?.toString().toLowerCase().includes(lowerQuery)),
  );
};

// src/utils/dateUtils.js

/**
 * Converts Firebase Timestamps or JS Dates into a readable string
 * @param {Object|Date|String} timestamp - The date object from Firestore
 * @returns {String} Formatted date (e.g., "Jan 12, 2024")
 */
export const formatDate = (timestamp) => {
  if (!timestamp) return "N/A";

  let date;

  // Handle Firebase Timestamp object {seconds, nanoseconds}
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  }
  // Handle standard JS Date objects or date strings
  else {
    date = new Date(timestamp);
  }

  // Modern unique formatting: "Jan 12, 2024"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// src/utils/classHelpers.js

export const getClassLevel = (name = "") => {
  const n = name.toLowerCase();

  if (n.includes("creche") || n.includes("daycare")) return 0;
  if (n.includes("kg")) return 1;
  if (n.includes("nursery")) return 2;
  if (n.includes("primary")) return 3;
  if (n.includes("jss")) return 4;
  if (n.includes("ss")) return 5;

  return 6;
};

export const getClassOrderNumber = (name = "") => {
  const match = name.match(/\d+/);
  return match ? Number(match[0]) : 0;
};

export const detectGroup = (cls = {}) => {
  if (cls.group) return cls.group;

  const name = cls.name?.toLowerCase() || "";

  if (name.includes("primary") || name.includes("nursery")) return "primary";
  if (name.includes("jss") || name.includes("ss") || name.includes("secondary")) return "secondary";

  return "unknown";
};

export const sortClasses = (list = []) => {
  return [...list].sort((a, b) => {
    const levelDiff = getClassLevel(a.name) - getClassLevel(b.name);
    if (levelDiff !== 0) return levelDiff;

    return getClassOrderNumber(a.name) - getClassOrderNumber(b.name);
  });
};

// ─── Format currency ──────────────────────────────────────────────────────
export const formatCurrency = (n) => {
  const num = typeof n === "number" ? n : parseFloat(n) || 0;
  return "₦" + Math.round(num).toLocaleString();
};
