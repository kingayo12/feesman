import { useState, useEffect, useCallback } from "react";

const CONSENT_KEY = "cache_consent"; // "accepted" | "declined" | undefined
const IS_PROD = import.meta.env.PROD;

export function useCacheConsent() {
  const stored = localStorage.getItem(CONSENT_KEY);
  const [consent, setConsent] = useState(stored); // "accepted" | "declined" | null
  const [showBanner, setShowBanner] = useState(!stored); // show if no prior decision
  const [swRegistration, setSwRegistration] = useState(null);
  const [updateReady, setUpdateReady] = useState(false); // new SW waiting

  // ── Register SW ───────────────────────────────────────────────────────
  const registerSW = useCallback(async () => {
    if (!IS_PROD || !("serviceWorker" in navigator)) return;

    try {
      const reg = await navigator.serviceWorker.register("/service-worker.js", {
        scope: "/",
      });

      setSwRegistration(reg);

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setUpdateReady(true); // prompt user to refresh
          }
        });
      });

      setInterval(() => reg.update(), 60_000);
    } catch (err) {
      console.warn("Service worker registration failed:", err);
    }
  }, []);

  // ── Accept ────────────────────────────────────────────────────────────
  const acceptCache = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setConsent("accepted");
    setShowBanner(false);
    registerSW();
  }, [registerSW]);

  // ── Decline ───────────────────────────────────────────────────────────
  const declineCache = useCallback(() => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setConsent("declined");
    setShowBanner(false);
    // Unregister any existing SW
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()));
    }
  }, []);

  // ── Apply update (refresh to activate new SW) ─────────────────────────
  const applyUpdate = useCallback(() => {
    if (swRegistration?.waiting) {
      swRegistration.waiting.postMessage("SKIP_WAITING");
    }
    setUpdateReady(false);
    window.location.reload();
  }, [swRegistration]);

  // ── Clear cache (for Settings page) ───────────────────────────────────
  const clearCache = useCallback(async () => {
    if (swRegistration) {
      swRegistration.active?.postMessage("CLEAR_CACHE");
    } else {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  }, [swRegistration]);

  // ── On mount: if previously accepted, register straight away ──────────
  useEffect(() => {
    // In development, always remove existing registrations/caches to prevent stale chunks.
    if (!IS_PROD && "serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((r) => r.unregister());
      });
      if (typeof caches !== "undefined") {
        caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))));
      }
      return;
    }

    if (stored === "accepted") registerSW();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    consent,
    showBanner,
    updateReady,
    acceptCache,
    declineCache,
    applyUpdate,
    clearCache,
  };
}
