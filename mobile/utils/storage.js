/**
 * Safe AsyncStorage wrapper with error handling
 *
 * Provides a resilient interface to AsyncStorage with:
 * - Automatic error recovery
 * - JSON serialization/deserialization
 * - Type safety helpers
 * - Fallback mechanisms
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Storage keys - centralized for consistency
 */
export const STORAGE_KEYS = {
  REACT_QUERY_CACHE: 'react-query-cache',
  USER_PREFERENCES: 'user-preferences',
  OFFLINE_QUEUE: 'offline-queue',
  LAST_SYNC: 'last-sync',
  HYDRATION_CELEBRATION: 'hydration-celebration-key',
  INSIGHTS_FILTER_DAYS: 'insights-filter-days',
};

/**
 * Safe get item from storage
 */
export const getItem = async (key) => {
  try {
    const value = await AsyncStorage.getItem(key);
    if (value === null) return null;

    // Try to parse as JSON, fallback to raw value
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  } catch (error) {
    console.error(`[Storage] Failed to get item "${key}":`, error);
    return null;
  }
};

/**
 * Safe set item to storage
 */
export const setItem = async (key, value) => {
  try {
    const stringValue = typeof value === 'string'
      ? value
      : JSON.stringify(value);

    await AsyncStorage.setItem(key, stringValue);
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to set item "${key}":`, error);
    return false;
  }
};

/**
 * Safe remove item from storage
 */
export const removeItem = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`[Storage] Failed to remove item "${key}":`, error);
    return false;
  }
};

/**
 * Safe clear all storage
 */
export const clear = async () => {
  try {
    await AsyncStorage.clear();
    return true;
  } catch (error) {
    console.error('[Storage] Failed to clear storage:', error);
    return false;
  }
};

/**
 * Get multiple items at once
 */
export const multiGet = async (keys) => {
  try {
    const results = await AsyncStorage.multiGet(keys);
    return results.reduce((acc, [key, value]) => {
      if (value !== null) {
        try {
          acc[key] = JSON.parse(value);
        } catch {
          acc[key] = value;
        }
      }
      return acc;
    }, {});
  } catch (error) {
    console.error('[Storage] Failed to get multiple items:', error);
    return {};
  }
};

/**
 * Set multiple items at once
 */
export const multiSet = async (keyValuePairs) => {
  try {
    const pairs = keyValuePairs.map(([key, value]) => [
      key,
      typeof value === 'string' ? value : JSON.stringify(value),
    ]);
    await AsyncStorage.multiSet(pairs);
    return true;
  } catch (error) {
    console.error('[Storage] Failed to set multiple items:', error);
    return false;
  }
};

/**
 * Get all storage keys
 */
export const getAllKeys = async () => {
  try {
    return await AsyncStorage.getAllKeys();
  } catch (error) {
    console.error('[Storage] Failed to get all keys:', error);
    return [];
  }
};

/**
 * Get storage size estimate (for debugging)
 */
export const getStorageSize = async () => {
  try {
    const keys = await getAllKeys();
    const values = await AsyncStorage.multiGet(keys);
    const totalSize = values.reduce((sum, [, value]) => {
      return sum + (value?.length || 0);
    }, 0);
    return {
      keys: keys.length,
      bytes: totalSize,
      kilobytes: (totalSize / 1024).toFixed(2),
    };
  } catch (error) {
    console.error('[Storage] Failed to calculate storage size:', error);
    return { keys: 0, bytes: 0, kilobytes: '0' };
  }
};

/**
 * Create a namespaced storage instance
 */
export const createNamespacedStorage = (namespace) => {
  const prefixKey = (key) => `${namespace}:${key}`;

  return {
    get: (key) => getItem(prefixKey(key)),
    set: (key, value) => setItem(prefixKey(key), value),
    remove: (key) => removeItem(prefixKey(key)),
    clear: async () => {
      const keys = await getAllKeys();
      const namespacedKeys = keys.filter((k) => k.startsWith(`${namespace}:`));
      await Promise.all(namespacedKeys.map(removeItem));
    },
  };
};

export default {
  getItem,
  setItem,
  removeItem,
  clear,
  multiGet,
  multiSet,
  getAllKeys,
  getStorageSize,
  createNamespacedStorage,
  STORAGE_KEYS,
};
