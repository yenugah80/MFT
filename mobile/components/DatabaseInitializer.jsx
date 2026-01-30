/**
 * DatabaseInitializer Component
 * Initializes SQLite database on app startup
 * Ensures schema is ready before any hooks try to access it
 */

import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { TYPOGRAPHY } from '../constants/premiumTheme';
import { initDatabase, getDatabaseStats } from '../services/database';

export default function DatabaseInitializer({ children }) {
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        console.log('[DatabaseInitializer] Initializing database...');

        // Initialize database schema and run migrations
        await initDatabase();

        // Optional: Log database statistics for debugging
        if (__DEV__) {
          const stats = await getDatabaseStats();
          if (stats) {
            console.log('[DatabaseInitializer] Database ready:', stats);
          }
        }

        if (mounted) {
          setIsReady(true);
        }
      } catch (err) {
        console.error('[DatabaseInitializer] Failed to initialize database:', err);
        if (mounted) {
          setError(err.message);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  // Show loading screen while initializing
  if (!isReady && !error) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6B4EFF" />
        <Text style={styles.text}>Setting up your data...</Text>
      </View>
    );
  }

  // Show error screen if initialization failed
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Database Error</Text>
        <Text style={styles.errorDetails}>{error}</Text>
        <Text style={styles.errorHint}>
          Try restarting the app. If the problem persists, you may need to clear app data.
        </Text>
      </View>
    );
  }

  // Database ready - render children
  return children;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FF',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontFamily: TYPOGRAPHY.family.medium,
  },
  errorText: {
    fontSize: 20,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#EF4444',
    marginBottom: 12,
  },
  errorDetails: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.family.regular,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorHint: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.family.regular,
    color: '#9CA3AF',
    textAlign: 'center',
    marginTop: 16,
  },
});
