import {
  DASHBOARD_CACHE_PREFIX,
  SESSION_EXPIRY_KEY,
  DASHBOARD_CACHE_TTL_MS,
  DEFAULT_SESSION_TTL_MS,
} from "../constants";

const safeParse = (value) => {
  if (!value) return null;

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

const getStorageValue = (key) => {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(key);
  return safeParse(raw);
};

const setStorageValue = (key, value) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
};

const removeStorageValue = (key) => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(key);
};

export const getCacheItem = (key) => {
  const entry = getStorageValue(key);

  if (!entry || !entry.expiresAt || Date.now() > entry.expiresAt) {
    removeStorageValue(key);
    return null;
  }

  return entry.data ?? null;
};

export const setCacheItem = (key, data, ttlMs = DASHBOARD_CACHE_TTL_MS) => {
  setStorageValue(key, {
    data,
    expiresAt: Date.now() + ttlMs,
  });
};

export const clearStoragePrefix = (prefix) => {
  if (typeof window === "undefined") return;

  Object.keys(window.localStorage).forEach((key) => {
    if (key.startsWith(prefix)) {
      window.localStorage.removeItem(key);
    }
  });
};

export const clearDashboardCache = () => clearStoragePrefix(DASHBOARD_CACHE_PREFIX);

export const getDashboardCacheKey = (session, term) =>
  `${DASHBOARD_CACHE_PREFIX}${session}_${term}`;

export const SETTINGS_CACHE_KEY = "feesman_settings";

export const setSessionExpiry = (ttlMs = DEFAULT_SESSION_TTL_MS) => {
  setStorageValue(SESSION_EXPIRY_KEY, {
    expiresAt: Date.now() + ttlMs,
  });
};

export const getSessionExpiry = () => {
  const entry = getStorageValue(SESSION_EXPIRY_KEY);
  return entry?.expiresAt ?? null;
};

export const clearSessionExpiry = () => removeStorageValue(SESSION_EXPIRY_KEY);

export const isSessionExpired = () => {
  const expiresAt = getSessionExpiry();
  return expiresAt !== null && Date.now() > expiresAt;
};
