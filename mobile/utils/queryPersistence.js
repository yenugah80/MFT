/**
 * React Query Persistence Configuration
 *
 * Provides offline-first data persistence using AsyncStorage.
 * Cached queries are saved to storage and restored on app restart.
 */

import { createAsyncStoragePersister as createPersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Create AsyncStorage persister for React Native
 * Uses official @tanstack/query-async-storage-persister package
 */
export const createAsyncStoragePersister = () => {
  return createPersister({
    storage: AsyncStorage,
    throttleTime: 1000, // Throttle writes to storage (1 second)
  });
};

/**
 * Persistence options for React Query
 */
export const persistOptions = {
  // ✅ Reduced from 24 hours to 4 hours to prevent stale profile data
  // Profile changes should be reflected within 4 hours
  // Analytics data (less critical) can use longer cache
  maxAge: 1000 * 60 * 60 * 4, // 4 hours
  buster: '', // Change this to invalidate all cached data
  dehydrateOptions: {
    // Don't persist queries with errors
    shouldDehydrateQuery: (query) => {
      return query.state.status === 'success';
    },
  },
};

/**
 * Clear persisted query cache
 * Note: The async-storage-persister uses 'REACT_QUERY_OFFLINE_CACHE' as default key
 */
export const clearPersistedCache = async () => {
  try {
    await AsyncStorage.removeItem('REACT_QUERY_OFFLINE_CACHE');
    console.log('[Query Persister] Cache cleared successfully');
    return true;
  } catch (error) {
    console.error('[Query Persister] Failed to clear cache:', error);
    return false;
  }
};

export default {
  createAsyncStoragePersister,
  persistOptions,
  clearPersistedCache,
};
