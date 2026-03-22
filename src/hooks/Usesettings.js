import { useEffect, useState, useCallback } from "react";
import { getSettings } from "../pages/settings/settingService";

/**
 * Shared hook for school settings.
 * Use this in any component that needs academicYear or currentTerm
 * instead of calling getSettings() directly.
 *
 * Usage:
 *   const { settings, loading, error, reload } = useSettings();
 *   const { academicYear, currentTerm } = settings;
 */
export function useSettings() {
  const [settings, setSettings] = useState({
    name: "",
    academicYear: "",
    currentTerm: "",
    contactEmail: "",
    contactPhone: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getSettings();
      if (data) setSettings(data);
      else setError("School settings not configured. Please visit Settings.");
    } catch (err) {
      console.error("useSettings error:", err);
      setError("Failed to load school settings.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { settings, loading, error, reload: load };
}
