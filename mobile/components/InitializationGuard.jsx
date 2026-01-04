/**
 * Initialization Guard Component
 *
 * PROBLEM SOLVED:
 * - Components were rendering before ProductionStartup completed
 * - Features/modules might not be available yet
 * - Database not initialized
 *
 * SOLUTION:
 * - Wraps app content
 * - Waits for startup to complete
 * - Shows loading state while initializing
 * - Prevents premature renders
 */

import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { isInitialized, getStartupReport } from '@/services/productionStartup';

export default function InitializationGuard({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [startupError, setStartupError] = useState(null);
  const [timeoutExceeded, setTimeoutExceeded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;

    const checkInitialization = async () => {
      try {
        // Timeout protection: max 30s wait for initialization
        timeoutId = setTimeout(() => {
          if (isMounted) {
            console.warn('[InitializationGuard] Startup taking longer than 30s - proceeding with degraded mode');
            setTimeoutExceeded(true);
            setIsReady(true); // Force ready to prevent infinite loading
          }
        }, 30000);

        // Check initialization status every 100ms
        let attempts = 0;
        const maxAttempts = 300; // 30 seconds at 100ms intervals

        while (!isInitialized() && attempts < maxAttempts) {
          await new Promise((resolve) => setTimeout(resolve, 100));
          attempts++;
        }

        if (isMounted) {
          if (isInitialized()) {
            console.debug('[InitializationGuard] ✓ Initialization complete');
            setIsReady(true);
          } else {
            // Timeout occurred
            const report = getStartupReport();
            console.error('[InitializationGuard] Startup timeout exceeded', report);
            // Still proceed, but log the issue
            setIsReady(true);
          }
        }
      } catch (error) {
        if (isMounted) {
          console.error('[InitializationGuard] Initialization check failed:', error);
          setStartupError(error);
          setIsReady(true); // Force ready to show error
        }
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }
    };

    checkInitialization();

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, []);

  // Show loading screen while initializing
  if (!isReady) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#f5f5f5',
        }}
      >
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          Initializing App...
        </Text>
      </View>
    );
  }

  // Show error state if initialization failed critically
  if (startupError) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#fff3cd',
          padding: 20,
        }}
      >
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#856404', marginBottom: 12 }}>
          ⚠ Initialization Error
        </Text>
        <Text style={{ fontSize: 14, color: '#856404', textAlign: 'center' }}>
          {startupError.message}
        </Text>
        <Text style={{ fontSize: 12, color: '#856404', marginTop: 12, textAlign: 'center' }}>
          The app may not function correctly. Please restart the app.
        </Text>
      </View>
    );
  }

  // Show warning if timeout was exceeded but app is running
  if (timeoutExceeded) {
    console.warn('[InitializationGuard] Running in degraded mode due to startup timeout');
  }

  // App is ready - render children
  return children;
}
