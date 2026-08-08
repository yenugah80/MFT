/**
 * BiometricLockScreen
 *
 * Full-screen opaque cover rendered above the whole app while it is locked or
 * merely inactive. It is deliberately opaque rather than blurred: the
 * app-switcher snapshot is taken from this view, and a blur can still leak
 * legible shapes.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '@clerk/clerk-expo';

import {
  BRAND,
  TYPOGRAPHY,
  SPACING,
  RADIUS,
} from '../constants/premiumTheme';

/** User-facing copy for the failure modes worth explaining. */
const ERROR_COPY = {
  user_cancel: 'Authentication cancelled.',
  system_cancel: 'Authentication was interrupted.',
  app_cancel: 'Authentication was interrupted.',
  authentication_failed: "That didn't match. Try again.",
  lockout: 'Too many attempts. Use your device passcode to continue.',
  not_enrolled: 'No biometrics are set up on this device anymore.',
  not_available: 'Biometric authentication is unavailable on this device.',
  passcode_not_set: 'This device no longer has a passcode set.',
  user_fallback: 'Use your device passcode to continue.',
};

export default function BiometricLockScreen({
  requiresAuth,
  error,
  method,
  onUnlock,
  onDisableAfterLockout,
}) {
  const { signOut } = useAuth();
  const [isBusy, setIsBusy] = useState(false);
  // Prompt automatically once. After a cancel the user taps to retry, so a
  // declined prompt never turns into a loop.
  const hasAutoPromptedRef = useRef(false);

  const handleUnlock = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      await onUnlock();
    } finally {
      setIsBusy(false);
    }
  }, [isBusy, onUnlock]);

  useEffect(() => {
    if (!requiresAuth || hasAutoPromptedRef.current) return;
    hasAutoPromptedRef.current = true;
    handleUnlock();
  }, [requiresAuth, handleUnlock]);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'You can sign back in to regain access. Your data stays in your account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
            } catch (signOutError) {
              console.error('[BiometricLockScreen] Sign out failed', signOutError);
            }
          },
        },
      ]
    );
  }, [signOut]);

  const handleTurnOffLock = useCallback(() => {
    Alert.alert(
      'Turn Off App Lock',
      'This device can no longer authenticate you, so the lock cannot be satisfied. Turning it off restores access to the app.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Turn Off Lock', style: 'destructive', onPress: onDisableAfterLockout },
      ]
    );
  }, [onDisableAfterLockout]);

  return (
    <View style={styles.overlay}>
      <LinearGradient
        colors={[BRAND.primary, BRAND.primaryDark || BRAND.primary]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.content}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={40} color="#FFFFFF" />
        </View>

        <Text style={styles.title}>MFT is locked</Text>

        {requiresAuth ? (
          <Text style={styles.subtitle}>
            Unlock with {method} to continue.
          </Text>
        ) : (
          <Text style={styles.subtitle}>Your data is hidden.</Text>
        )}

        {requiresAuth && error && ERROR_COPY[error] && (
          <Text style={styles.error}>{ERROR_COPY[error]}</Text>
        )}

        {requiresAuth && (
          <>
            <TouchableOpacity
              style={styles.unlockButton}
              onPress={handleUnlock}
              disabled={isBusy}
              accessibilityRole="button"
              accessibilityLabel="Unlock app"
            >
              {isBusy ? (
                <ActivityIndicator size="small" color={BRAND.primary} />
              ) : (
                <>
                  <Ionicons name="finger-print" size={20} color={BRAND.primary} />
                  <Text style={styles.unlockText}>Unlock</Text>
                </>
              )}
            </TouchableOpacity>

            {onDisableAfterLockout && (
              <TouchableOpacity style={styles.secondaryButton} onPress={handleTurnOffLock}>
                <Text style={styles.secondaryText}>Turn off app lock</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.secondaryButton} onPress={handleSignOut}>
              <Text style={styles.secondaryText}>Sign out instead</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    // Above every screen, modal and toast in the tree below.
    zIndex: 9999,
    elevation: 9999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: SPACING[6],
    gap: SPACING[3],
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING[2],
  },
  title: {
    fontSize: TYPOGRAPHY.size['2xl'],
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: '#FFFFFF',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.size.base,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  error: {
    fontSize: TYPOGRAPHY.size.sm,
    color: '#FFFFFF',
    backgroundColor: 'rgba(0,0,0,0.22)',
    paddingHorizontal: SPACING[3],
    paddingVertical: SPACING[2],
    borderRadius: RADIUS.md,
    textAlign: 'center',
    overflow: 'hidden',
  },
  unlockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING[2],
    backgroundColor: '#FFFFFF',
    paddingVertical: SPACING[3],
    paddingHorizontal: SPACING[6],
    borderRadius: RADIUS.full,
    marginTop: SPACING[3],
    minWidth: 180,
    minHeight: 48,
  },
  unlockText: {
    fontSize: TYPOGRAPHY.size.base,
    fontWeight: TYPOGRAPHY.weight.bold,
    fontFamily: TYPOGRAPHY.family.bold,
    color: BRAND.primary,
  },
  secondaryButton: {
    paddingVertical: SPACING[2],
    paddingHorizontal: SPACING[3],
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryText: {
    fontSize: TYPOGRAPHY.size.sm,
    color: 'rgba(255,255,255,0.9)',
    textDecorationLine: 'underline',
  },
});
