/**
 * Biometric Lock Service
 *
 * Thin, React-free wrapper around expo-local-authentication + SecureStore.
 *
 * Design notes:
 * - The enabled flag lives in SecureStore, NOT on the server. The lock has to
 *   work on a cold start, offline, before any network call resolves. The server
 *   copy (in the privacy blob) exists only so the setting is visible across
 *   devices; it never decides whether the app is gated.
 * - Every call is safe on web / unsupported platforms and returns a value that
 *   degrades to "unlocked" rather than throwing.
 */

import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';

const ENABLED_KEY = 'mft_biometric_lock_enabled';

const isSupportedPlatform = Platform.OS === 'ios' || Platform.OS === 'android';

/**
 * Errors that mean the device can no longer authenticate at all — biometrics
 * were removed, or no passcode is set. These must not brick the user out of
 * their own data; the caller offers an explicit way out.
 */
export const UNRECOVERABLE_ERRORS = ['not_enrolled', 'not_available', 'passcode_not_set'];

/**
 * What the device can actually do right now.
 * @returns {Promise<{hasHardware: boolean, isEnrolled: boolean, types: number[]}>}
 */
export async function getCapabilities() {
  if (!isSupportedPlatform) {
    return { hasHardware: false, isEnrolled: false, types: [] };
  }
  try {
    const [hasHardware, isEnrolled, types] = await Promise.all([
      LocalAuthentication.hasHardwareAsync(),
      LocalAuthentication.isEnrolledAsync(),
      LocalAuthentication.supportedAuthenticationTypesAsync(),
    ]);
    return { hasHardware, isEnrolled, types };
  } catch (error) {
    console.warn('[biometricLock] Capability check failed:', error);
    return { hasHardware: false, isEnrolled: false, types: [] };
  }
}

/**
 * Human label for the device's strongest enrolled method, for use in copy.
 * @param {number[]} types
 * @returns {string}
 */
export function describeMethod(types = []) {
  const { FACIAL_RECOGNITION, FINGERPRINT, IRIS } = LocalAuthentication.AuthenticationType;
  if (types.includes(FACIAL_RECOGNITION)) return Platform.OS === 'ios' ? 'Face ID' : 'face unlock';
  if (types.includes(FINGERPRINT)) return Platform.OS === 'ios' ? 'Touch ID' : 'fingerprint';
  if (types.includes(IRIS)) return 'iris unlock';
  return 'device passcode';
}

/**
 * Prompt the user to authenticate.
 *
 * Device-passcode fallback is deliberately left enabled: if a user's face or
 * fingerprint stops working, the passcode is what keeps them out of a lockout.
 *
 * @param {string} promptMessage
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function authenticate(promptMessage) {
  if (!isSupportedPlatform) return { success: true };
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: 'Cancel',
      fallbackLabel: 'Use Passcode',
      disableDeviceFallback: false,
      requireConfirmation: false,
    });
    return result.success
      ? { success: true }
      : { success: false, error: result.error };
  } catch (error) {
    console.warn('[biometricLock] authenticate threw:', error);
    return { success: false, error: 'unknown' };
  }
}

/**
 * Read the persisted enabled flag. Defaults to false on any read failure —
 * failing open here is correct: a corrupt keychain entry must not lock a user
 * out of an app they can no longer unlock.
 * @returns {Promise<boolean>}
 */
export async function isEnabledStored() {
  if (!isSupportedPlatform) return false;
  try {
    return (await SecureStore.getItemAsync(ENABLED_KEY)) === 'true';
  } catch (error) {
    console.warn('[biometricLock] Failed to read enabled flag:', error);
    return false;
  }
}

/**
 * Persist the enabled flag.
 * @param {boolean} enabled
 * @returns {Promise<boolean>} whether the write succeeded
 */
export async function setEnabledStored(enabled) {
  if (!isSupportedPlatform) return false;
  try {
    if (enabled) {
      await SecureStore.setItemAsync(ENABLED_KEY, 'true');
    } else {
      await SecureStore.deleteItemAsync(ENABLED_KEY);
    }
    return true;
  } catch (error) {
    console.warn('[biometricLock] Failed to persist enabled flag:', error);
    return false;
  }
}
