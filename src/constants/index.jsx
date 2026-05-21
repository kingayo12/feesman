export const STORAGE_KEYS = {
  LETTER_TEMPLATES: "feesman_letter_templates_v2",
};

export const TERMS = ["1st Term", "2nd Term", "3rd Term"];

export const DEFAULTS = {
  CURRENCY: "₦",
};

export const CURRENCIES = ["NGN (₦)", "USD ($)", "GBP (£)", "GHS (₵)", "KES (Ksh)"];

export const ITEMS_PER_PAGE = 10;

export const DASHBOARD_CACHE_PREFIX = "feesman_dashboard_cache_";
export const SESSION_EXPIRY_KEY = "feesman_session_expiry";
export const DASHBOARD_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const DEFAULT_SESSION_TTL_MS = 60 * 60 * 1000; // 60 minutes

export const fmtd = (d) =>
  d
    ? (d.toDate ? d.toDate() : new Date(d)).toLocaleDateString("en-NG", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
    : "—";

export const CATEGORIES = [
  "Uniform",
  "Books",
  "Stationery",
  "Sportswear",
  "Lab Equipment",
  "Art Supplies",
  "Food & Tuck",
  "Other",
];

export const UNITS = ["piece", "set", "pair", "pack", "bottle", "bag", "box", "roll", "sheet"];

export const fmt = (n) => "₦" + Math.round(n).toLocaleString();

export const formatTs = (ts) => {
  if (!ts) return "—";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};
