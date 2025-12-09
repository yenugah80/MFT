import { useCallback, useEffect, useState } from "react";
import {
  getActivityLevels,
  createActivityLevel,
  updateActivityLevel,
  deleteActivityLevel,
} from "../services/activityLevelsAPI";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cachedLevels = null;
let cachedAt = 0;

const withinCacheWindow = () => cachedLevels && Date.now() - cachedAt < CACHE_TTL_MS;

const validateFactor = (factor) => {
  const numeric = typeof factor === "number" ? factor : Number(factor);
  if (Number.isNaN(numeric) || numeric < 1 || numeric > 2.5) {
    throw new Error("Factor must be between 1.0 and 2.5");
  }
  return numeric;
};

export default function useActivityLevels() {
  const [levels, setLevels] = useState(cachedLevels);
  const [loading, setLoading] = useState(!cachedLevels);
  const [error, setError] = useState(null);

  const syncCache = useCallback((next) => {
    const resolved = typeof next === "function" ? next(cachedLevels) : next;
    cachedLevels = resolved;
    cachedAt = Date.now();
    setLevels(resolved);
  }, []);

  const refresh = useCallback(async (force = false) => {
    if (!force && withinCacheWindow()) {
      setLevels(cachedLevels);
      return cachedLevels;
    }

    setLoading(true);
    try {
      const data = await getActivityLevels();
      setError(null);
      syncCache(data);
      return data;
    } catch (err) {
      setError(err.message || "Failed to load activity levels");
      throw err;
    } finally {
      setLoading(false);
    }
  }, [syncCache]);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const createLevel = useCallback(async (payload) => {
    const factor = validateFactor(payload.factor);
    const optimistic = { ...payload, factor, id: `temp-${Date.now()}` };

    syncCache((prev) => [...(prev ?? []), optimistic]);

    try {
      const created = await createActivityLevel({ ...payload, factor });
      syncCache((prev) => (prev ?? []).map((l) => (l.id === optimistic.id ? created : l)));
      return created;
    } catch (err) {
      setError(err.message || "Failed to create activity level");
      syncCache((prev) => (prev ?? []).filter((l) => l.id !== optimistic.id));
      throw err;
    }
  }, [syncCache]);

  const updateLevel = useCallback(async (id, payload) => {
    const factor = validateFactor(payload.factor);
    const previous = cachedLevels ?? [];
    syncCache((prev) => (prev ?? []).map((level) => (level.id === id ? { ...level, ...payload, factor } : level)));

    try {
      const updated = await updateActivityLevel(id, { ...payload, factor });
      syncCache((prev) => (prev ?? []).map((level) => (level.id === id ? updated : level)));
      return updated;
    } catch (err) {
      setError(err.message || "Failed to update activity level");
      syncCache(previous);
      throw err;
    }
  }, [syncCache]);

  const removeLevel = useCallback(async (id) => {
    const previous = cachedLevels ?? [];
    syncCache((prev) => (prev ?? []).filter((level) => level.id !== id));

    try {
      await deleteActivityLevel(id);
      return true;
    } catch (err) {
      setError(err.message || "Failed to delete activity level");
      syncCache(previous);
      throw err;
    }
  }, [syncCache]);

  return {
    levels,
    loading,
    error,
    refresh,
    createLevel,
    updateLevel,
    deleteLevel: removeLevel,
  };
}
