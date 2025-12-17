/**
 * Hook for persisted state management
 *
 * Similar to useState, but automatically persists to AsyncStorage
 * Usage: const [value, setValue] = usePersistedState('key', defaultValue);
 */

import { useState, useEffect, useCallback } from 'react';
import { getItem, setItem, removeItem } from '@/utils/storage';

export const usePersistedState = (key, defaultValue) => {
  const [state, setState] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load persisted value on mount
  useEffect(() => {
    const loadPersistedValue = async () => {
      try {
        setIsLoading(true);
        const persistedValue = await getItem(key);

        if (persistedValue !== null) {
          setState(persistedValue);
        }
      } catch (err) {
        console.error(`[usePersistedState] Failed to load key "${key}":`, err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadPersistedValue();
  }, [key]);

  // Wrapper for setState that also persists
  const setPersistedState = useCallback(
    async (value) => {
      try {
        // Support functional updates like regular setState
        const newValue = typeof value === 'function' ? value(state) : value;

        setState(newValue);
        await setItem(key, newValue);
      } catch (err) {
        console.error(`[usePersistedState] Failed to persist key "${key}":`, err);
        setError(err);
      }
    },
    [key, state]
  );

  // Clear persisted value
  const clearPersistedState = useCallback(async () => {
    try {
      setState(defaultValue);
      await removeItem(key);
    } catch (err) {
      console.error(`[usePersistedState] Failed to clear key "${key}":`, err);
      setError(err);
    }
  }, [key, defaultValue]);

  return [state, setPersistedState, { isLoading, error, clear: clearPersistedState }];
};

export default usePersistedState;
