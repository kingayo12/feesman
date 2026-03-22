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
