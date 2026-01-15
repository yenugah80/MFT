import React from 'react';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { handleApiError } from '@/utils/errorHandler';
import { createAsyncStoragePersister, persistOptions } from '@/utils/queryPersistence';

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Cache data for 5 minutes by default
      staleTime: 5 * 60 * 1000,
      // Keep unused data in cache for 10 minutes (gcTime replaces deprecated cacheTime in React Query v5)
      gcTime: 10 * 60 * 1000,
      // Retry failed requests 2 times
      retry: 2,
      // Retry with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      // Refetch on window focus (useful for web, safe for mobile)
      refetchOnWindowFocus: false,
      // Don't refetch on mount if data is still fresh
      refetchOnMount: true,
      // Error handler
      onError: (error) => {
        console.error('[React Query] Query error:', error);
      },
    },
    mutations: {
      // Retry mutations once
      retry: 1,
      // Error handler for mutations
      onError: (error, variables, context) => {
        console.error('[React Query] Mutation error:', error);
        // Show user-friendly error notification
        handleApiError(error, context?.apiContext || 'Mutation');
      },
    },
  },
});

// Create persister instance
const persister = createAsyncStoragePersister();

export const QueryProvider = ({ children }) => {
  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        ...persistOptions,
      }}
      onSuccess={() => {
        // Hydration completed successfully
        console.log('[Query Persister] Cache restored from storage');
      }}
      onError={(error) => {
        // If persistence fails, log error but don't crash the app
        console.error('[Query Persister] Failed to restore cache:', error);
        console.log('[Query Persister] Continuing without cached data');
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};

export { queryClient };
