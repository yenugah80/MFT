/**
 * TurnstileVerification Component
 *
 * Shows Cloudflare Turnstile human verification in a modal WebView.
 * Used for sensitive actions like:
 * - Account deletion
 * - Password changes
 * - High-value transactions
 *
 * Usage:
 * ```jsx
 * const { verify, isVerifying, TurnstileModal } = useTurnstile();
 *
 * // Before sensitive action
 * const token = await verify();
 * if (token) {
 *   // Proceed with action, include token in request
 *   await apiClient.post('/sensitive-action', { turnstileToken: token });
 * }
 *
 * // Render modal
 * return <>{TurnstileModal}</>
 * ```
 */

import React, { useState, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { getApiUrl } from '../../constants/api';

const TurnstileVerification = ({
  visible,
  onVerified,
  onCancel,
  onError,
  action = 'verify',
}) => {
  const [isLoading, setIsLoading] = useState(true);

  const verificationUrl = `${getApiUrl().replace('/api', '')}/api/verify/turnstile?action=${action}`;

  const handleMessage = useCallback(
    (event) => {
      try {
        const data = JSON.parse(event.nativeEvent.data);

        if (data.type === 'turnstile_success') {
          onVerified?.(data.token);
        } else if (data.type === 'turnstile_error') {
          onError?.(data.error || 'Verification failed');
        } else if (data.type === 'close') {
          // Auto-close after success
          onVerified?.(null);
        }
      } catch (e) {
        console.warn('[Turnstile] Failed to parse message:', e);
      }
    },
    [onVerified, onError]
  );

  const handleLoadEnd = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleLoadError = useCallback(
    (syntheticEvent) => {
      const { nativeEvent } = syntheticEvent;
      console.error('[Turnstile] WebView error:', nativeEvent.description);
      onError?.('Failed to load verification page');
    },
    [onError]
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={onCancel}
            style={styles.closeButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color="#6b7280" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Security Check</Text>
          <View style={styles.placeholder} />
        </View>

        {/* WebView */}
        <View style={styles.webViewContainer}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#6366f1" />
              <Text style={styles.loadingText}>Loading verification...</Text>
            </View>
          )}
          <WebView
            source={{ uri: verificationUrl }}
            onMessage={handleMessage}
            onLoadEnd={handleLoadEnd}
            onError={handleLoadError}
            style={styles.webView}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            scalesPageToFit={true}
            originWhitelist={['*']}
            // Security settings
            allowsBackForwardNavigationGestures={false}
            allowsInlineMediaPlayback={false}
            mediaPlaybackRequiresUserAction={true}
          />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Ionicons name="shield-checkmark" size={16} color="#9ca3af" />
          <Text style={styles.footerText}>
            Powered by Cloudflare Turnstile
          </Text>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#ffffff',
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1f2937',
  },
  placeholder: {
    width: 40,
  },
  webViewContainer: {
    flex: 1,
    position: 'relative',
  },
  webView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: '#6b7280',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerText: {
    marginLeft: 6,
    fontSize: 13,
    color: '#9ca3af',
  },
});

export default TurnstileVerification;
