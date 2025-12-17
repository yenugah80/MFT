/**
 * Hook for managing user preferences
 *
 * Provides reactive access to user preferences with automatic persistence
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPreferences,
  updatePreferences,
  resetPreferences,
  DEFAULT_PREFERENCES,
} from '@/utils/preferences';

export const usePreferences = () => {
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setIsLoading(true);
        const prefs = await getPreferences();
        setPreferences(prefs);
      } catch (err) {
        console.error('[usePreferences] Failed to load preferences:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Update preferences
  const update = useCallback(async (updates) => {
    try {
      const updated = await updatePreferences(updates);
      setPreferences(updated);
      return updated;
    } catch (err) {
      console.error('[usePreferences] Failed to update preferences:', err);
      setError(err);
      throw err;
    }
  }, []);

  // Reset preferences
  const reset = useCallback(async () => {
    try {
      const defaults = await resetPreferences();
      setPreferences(defaults);
      return defaults;
    } catch (err) {
      console.error('[usePreferences] Failed to reset preferences:', err);
      setError(err);
      throw err;
    }
  }, []);

  // Update specific preference
  const set = useCallback(
    async (key, value) => {
      try {
        const updated = await updatePreferences({ [key]: value });
        setPreferences(updated);
        return updated;
      } catch (err) {
        console.error(`[usePreferences] Failed to set preference "${key}":`, err);
        setError(err);
        throw err;
      }
    },
    []
  );

  return {
    preferences,
    isLoading,
    error,
    update,
    reset,
    set,
  };
};

export default usePreferences;
