/**
 * ApiInitializer - Initializes API client with Clerk token
 * This component should be placed inside ClerkProvider
 */

import { useEffect } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import apiClient from '@/services/apiClient';

const ApiInitializer = ({ children }) => {
  const { getToken, isLoaded } = useAuth();

  useEffect(() => {
    // Only set token provider once Clerk is fully loaded
    if (!isLoaded) {
      console.log('[ApiInitializer] Waiting for Clerk to load...');
      return;
    }

    // Set token provider for API client
    apiClient.setTokenProvider(async () => {
      try {
        return await getToken();
      } catch (error) {
        console.error('[ApiInitializer] Failed to get token:', error);
        return null;
      }
    });

    console.log('[ApiInitializer] API client initialized with Clerk token provider');
  }, [isLoaded]); // ✅ Remove getToken from dependencies - it's a reference that changes on every render

  // Render children regardless of Clerk load state
  // This prevents blocking the entire app if Clerk is slow to initialize
  return children;
};

export default ApiInitializer;
