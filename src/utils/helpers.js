export const filterData = (items, query, keys) => {
  if (!query) return items;

  const lowerQuery = query.toLowerCase();

  return items.filter((item) =>
    keys.some((key) => item[key]?.toString().toLowerCase().includes(lowerQuery)),
  );
};

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

export const getGroupOrder = (prefix = "") => {
  const p = prefix.toLowerCase();

  const rank = {
    earlyYears: ["creche", "daycare"],
    kindergarten: ["kg", "kindergarten"],
    nursery: ["nursery"],
    primary: ["primary"],
    junior: ["jss", "junior"],
    senior: ["ss", "senior", "secondary"],
  };

  if (rank.earlyYears.some((word) => p.includes(word))) return 0;
  if (rank.kindergarten.some((word) => p.includes(word))) return 1;
  if (rank.nursery.some((word) => p.includes(word))) return 2;
  if (rank.primary.some((word) => p.includes(word))) return 3;
  if (rank.junior.some((word) => p.includes(word))) return 4;
  if (rank.senior.some((word) => p.includes(word))) return 5;

  return 6; // Unknown/Other
};

export const sortClasses = (list = []) => {
  return [...list].sort((a, b) => {
    const pa = parseClassName(a.name);
    const pb = parseClassName(b.name);
    const groupOrder = getGroupOrder(pa.prefix) - getGroupOrder(pb.prefix);
    if (groupOrder !== 0) return groupOrder;
    if (pa.prefix !== pb.prefix) return pa.prefix.localeCompare(pb.prefix);
    if (pa.level !== pb.level) return pa.level - pb.level;
    return pa.arm.localeCompare(pb.arm);
  });
};

// ─── Format currency ──────────────────────────────────────────────────────
export const formatCurrency = (n) => {
  const num = typeof n === "number" ? n : parseFloat(n) || 0;
  return "₦" + Math.round(num).toLocaleString();
};

export const parseClassName = (name = "") => {
  const m = name.trim().match(/^(.*?)(\d+)\s*([A-Za-z]?)$/);
  if (!m) return { prefix: name.trim(), level: Infinity, arm: "" };
  return { prefix: m[1].trim(), level: parseInt(m[2], 10), arm: m[3].toUpperCase() };
};

export const formatDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.toDate === "function") {
    return value.toDate().toISOString().slice(0, 10);
  }
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return "";
};

export const generateAdmissionNo = (abbr = "SCH", state = "NG") => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const rand = String(Math.floor(Math.random() * 90) + 10);
  const abbrPart = (abbr || "SCH").toUpperCase().slice(0, 4).replace(/\s/g, "");
  const statePart = (state || "NG").toUpperCase().slice(0, 3).replace(/\s/g, "");
  return `${abbrPart}/${statePart}/${year}/${month}${day}/${rand}`;
};
