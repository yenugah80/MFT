/**
 * ConnectionStatus Component
 * Shows a banner when backend is unreachable
 * Auto-checks connection health every 30 seconds
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { API_URL, API_BASE_URL } from '../../constants/api';

export function ConnectionStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'connected' | 'disconnected'
  const [lastChecked, setLastChecked] = useState(null);
  const [error, setError] = useState(null);

  const checkConnection = async () => {
    setStatus('checking');
    setError(null);

    try {
      // Call health endpoint (without /api suffix)
      const healthUrl = `${API_BASE_URL}/health`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(healthUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        setStatus('connected');
        setLastChecked(new Date());
      } else {
        setStatus('disconnected');
        setError(`Server returned ${response.status}`);
      }
    } catch (err) {
      console.error('[ConnectionStatus] Health check failed:', err.message);
      setStatus('disconnected');

      // Provide helpful error message
      if (err.name === 'AbortError') {
        setError('Connection timeout (5s)');
      } else if (err.message === 'Network request failed') {
        setError(
          Platform.OS === 'android'
            ? 'Cannot reach backend. Start: cd backend && npm run dev'
            : 'Backend not running. Start: cd backend && npm run dev'
        );
      } else {
        setError(err.message);
      }
    }
  };

  useEffect(() => {
    // Check immediately on mount
    checkConnection();

    // Then check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => clearInterval(interval);
  }, []);

  // Don't show banner when connected
  if (status === 'connected') {
    return null;
  }

  return (
    <View
      style={[
        styles.banner,
        status === 'checking' ? styles.checking : styles.disconnected,
      ]}
    >
      <View style={styles.content}>
        <Text style={styles.title}>
          {status === 'checking' ? '⏳ Checking connection...' : '❌ Backend Offline'}
        </Text>
        {status === 'disconnected' && error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>

      {status === 'disconnected' && (
        <TouchableOpacity onPress={checkConnection} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  checking: {
    backgroundColor: '#FFF3CD',
    borderBottomColor: '#FFEAA7',
  },
  disconnected: {
    backgroundColor: '#F8D7DA',
    borderBottomColor: '#F5C6CB',
  },
  content: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
});
