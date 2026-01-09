/**
 * useFeatureFlags - Client-side feature flag management
 *
 * Provides access to feature flags for progressive rollout.
 * Syncs with backend /api/flags endpoint and caches locally.
 *
 * Usage:
 *   const { isEnabled, isLoading } = useFeatureFlags();
 *   if (isEnabled('HYDRATION_V2_DASHBOARD')) { ... }
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useUser } from '@clerk/clerk-expo';
import apiClient from '../services/apiClient';

// ============================================================================
// CONSTANTS
// ============================================================================

const CACHE_KEY = '@feature_flags';
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const STALE_WHILE_REVALIDATE_MS = 60 * 1000; // 1 minute

// Default flag values (fallback when offline/error)
const DEFAULT_FLAGS = {
  HYDRATION_V2_DASHBOARD: false,
  PREDICTIVE_INSIGHTS: false,
  CALENDAR_INTEGRATION: false,
  HYDRATION_ANALYTICS: false,
  COLD_START_UX: false,
};

// ============================================================================
// FLAG NAMES
// ============================================================================

export const FLAG_NAMES = {
  HYDRATION_V2_DASHBOARD: 'HYDRATION_V2_DASHBOARD',
  PREDICTIVE_INSIGHTS: 'PREDICTIVE_INSIGHTS',
  CALENDAR_INTEGRATION: 'CALENDAR_INTEGRATION',
  HYDRATION_ANALYTICS: 'HYDRATION_ANALYTICS',
  COLD_START_UX: 'COLD_START_UX',
};

// ============================================================================
// HOOK
// ============================================================================

export function useFeatureFlags() {
  const { user } = useUser();
  const [flags, setFlags] = useState(DEFAULT_FLAGS);
  const [isLoading, setIsLoading] = useState(true);
  const [lastFetch, setLastFetch] = useState(null);
  const [error, setError] = useState(null);

  // Load cached flags on mount
  useEffect(() => {
    loadCachedFlags();
  }, []);

  // Fetch flags when user changes
  useEffect(() => {
    if (user?.id) {
      fetchFlags();
    }
  }, [user?.id]);

  /**
   * Load cached flags from AsyncStorage
   */
  const loadCachedFlags = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem(CACHE_KEY);
      if (cached) {
        const { flags: cachedFlags, timestamp } = JSON.parse(cached);
        const age = Date.now() - timestamp;

        // Use cached flags if not too stale
        if (age < CACHE_TTL_MS) {
          setFlags(cachedFlags);
          setLastFetch(timestamp);
        }

        // Background refresh if slightly stale
        if (age > STALE_WHILE_REVALIDATE_MS) {
          fetchFlags();
        }
      }
    } catch (err) {
      console.warn('[FeatureFlags] Failed to load cached flags:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Fetch flags from backend
   */
  const fetchFlags = useCallback(async () => {
    try {
      const response = await apiClient.get('/flags');
      const fetchedFlags = response.data?.flags || DEFAULT_FLAGS;

      // Merge with defaults to ensure all flags exist
      const mergedFlags = {
        ...DEFAULT_FLAGS,
        ...fetchedFlags,
      };

      setFlags(mergedFlags);
      setLastFetch(Date.now());
      setError(null);

      // Cache flags
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
        flags: mergedFlags,
        timestamp: Date.now(),
      }));
    } catch (err) {
      console.error('[FeatureFlags] Failed to fetch flags:', err);
      setError(err);

      // In development, enable V2 features for testing even if API fails
      if (__DEV__) {
        const devFlags = {
          ...DEFAULT_FLAGS,
          HYDRATION_V2_DASHBOARD: true,
          COLD_START_UX: true,
        };
        setFlags(devFlags);
      }
      // Keep using cached/default flags on error
    }
  }, []);

  /**
   * Check if a specific flag is enabled
   */
  const isEnabled = useCallback((flagName) => {
    return flags[flagName] ?? DEFAULT_FLAGS[flagName] ?? false;
  }, [flags]);

  /**
   * Get all flags (for debugging)
   */
  const getAllFlags = useCallback(() => {
    return { ...flags };
  }, [flags]);

  /**
   * Force refresh flags
   */
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchFlags();
    setIsLoading(false);
  }, [fetchFlags]);

  return useMemo(() => ({
    isEnabled,
    isLoading,
    error,
    lastFetch,
    refresh,
    getAllFlags,
    FLAG_NAMES,
  }), [isEnabled, isLoading, error, lastFetch, refresh, getAllFlags]);
}

// ============================================================================
// CONVENIENCE HOOK
// ============================================================================

/**
 * Check a single feature flag
 * @param {string} flagName
 * @returns {{ enabled: boolean, isLoading: boolean }}
 */
export function useFeatureFlag(flagName) {
  const { isEnabled, isLoading } = useFeatureFlags();

  return useMemo(() => ({
    enabled: isEnabled(flagName),
    isLoading,
  }), [isEnabled, isLoading, flagName]);
}

export default useFeatureFlags;
