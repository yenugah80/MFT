/**
 * BiometricLockProvider
 *
 * Gates the app behind Face ID / Touch ID / fingerprint when the user has
 * enabled the lock in Privacy & Security.
 *
 * Behaviour:
 * - Cold start with the lock enabled -> locked.
 * - Returning to the foreground after more than GRACE_PERIOD_MS in the
 *   background -> locked. Short trips out (photo picker, share sheet, a
 *   permission dialog) do not re-prompt.
 * - Any time the app is not active, an opaque cover is shown so the iOS/Android
 *   app-switcher snapshot never contains the user's data.
 *
 * Two things this deliberately gets right:
 * 1. The system auth dialog itself pushes the app to 'inactive'. Without a
 *    re-entrancy guard that re-triggers the lock and prompts forever.
 * 2. If the device can no longer authenticate at all (biometrics removed, no
 *    passcode), the user is offered an explicit way out instead of being
 *    permanently locked out of their own diary.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState, Platform } from 'react-native';
import { useAuth } from '@clerk/clerk-expo';

import {
  authenticate,
  getCapabilities,
  isEnabledStored,
  setEnabledStored,
  describeMethod,
  UNRECOVERABLE_ERRORS,
} from '../services/biometricLock';
import BiometricLockScreen from '../components/BiometricLockScreen';

/**
 * How long the app may sit in the background before it re-locks. Long enough to
 * survive a round trip through the photo picker or a permission sheet, short
 * enough that a phone left on a table is not left open.
 */
const GRACE_PERIOD_MS = 15000;

const BiometricLockContext = createContext(null);

export function useBiometricLock() {
  const context = useContext(BiometricLockContext);
  if (!context) {
    throw new Error('useBiometricLock must be used within a BiometricLockProvider');
  }
  return context;
}

export function BiometricLockProvider({ children }) {
  const { isSignedIn, isLoaded, userId } = useAuth();

  const [isEnabled, setIsEnabled] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [isObscured, setIsObscured] = useState(false);
  const [lastError, setLastError] = useState(null);
  const [method, setMethod] = useState('device passcode');

  // Guards against the auth dialog's own AppState churn re-entering the lock.
  const isAuthenticatingRef = useRef(false);
  const backgroundedAtRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  // Mirrors isLocked for use inside the AppState listener without resubscribing.
  const isLockedRef = useRef(false);

  useEffect(() => {
    isLockedRef.current = isLocked;
  }, [isLocked]);

  // Load the persisted flag once. Locked starts true if the lock is on, so no
  // frame of real content is ever painted before the first auth.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [enabled, capabilities] = await Promise.all([
        isEnabledStored(),
        getCapabilities(),
      ]);
      if (cancelled) return;
      setMethod(describeMethod(capabilities.types));
      setIsEnabled(enabled);
      setIsLocked(enabled);
      setIsReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Signing out clears the gate: the sign-in screen holds nothing sensitive,
  // and a locked overlay on top of it would be a dead end.
  useEffect(() => {
    if (!isSignedIn) {
      setIsLocked(false);
      setIsObscured(false);
      backgroundedAtRef.current = null;
    }
  }, [isSignedIn]);

  // Re-read the stored flag when the account changes within one app session —
  // account deletion clears it, so the next user must not inherit the previous
  // one's lock. Deliberately does not touch isLocked: whoever just completed a
  // Clerk sign-in should not be immediately locked back out.
  const previousUserIdRef = useRef(userId);
  useEffect(() => {
    if (!isReady) return;
    if (previousUserIdRef.current === userId) return;
    previousUserIdRef.current = userId;

    let cancelled = false;
    (async () => {
      const enabled = await isEnabledStored();
      if (!cancelled) setIsEnabled(enabled);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, isReady]);

  useEffect(() => {
    if (Platform.OS === 'web') return undefined;

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      const previous = appStateRef.current;
      appStateRef.current = nextAppState;

      // The system auth dialog backgrounds us. Ignore everything until it ends.
      if (isAuthenticatingRef.current) return;

      if (nextAppState === 'active') {
        setIsObscured(false);
        const backgroundedAt = backgroundedAtRef.current;
        backgroundedAtRef.current = null;
        if (
          isEnabled &&
          backgroundedAt !== null &&
          Date.now() - backgroundedAt > GRACE_PERIOD_MS
        ) {
          setIsLocked(true);
        }
        return;
      }

      // Cover the UI the moment we stop being active so the app-switcher
      // snapshot is the lock screen, not the user's data.
      if (isEnabled && !isLockedRef.current) {
        setIsObscured(true);
      }

      // Only a real background start the grace clock; 'inactive' fires for
      // transient things like a control-centre swipe.
      if (nextAppState === 'background' && previous !== 'background') {
        backgroundedAtRef.current = Date.now();
      }
    });

    return () => subscription.remove();
  }, [isEnabled]);

  /**
   * Prompt for authentication to lift an active lock.
   */
  const unlock = useCallback(async () => {
    if (isAuthenticatingRef.current) return false;
    isAuthenticatingRef.current = true;
    setLastError(null);
    try {
      const result = await authenticate('Unlock MFT');
      if (result.success) {
        setIsLocked(false);
        setIsObscured(false);
        backgroundedAtRef.current = null;
        return true;
      }
      setLastError(result.error || 'unknown');
      return false;
    } finally {
      // Let the dialog's trailing AppState events settle before listening again.
      setTimeout(() => {
        isAuthenticatingRef.current = false;
      }, 500);
    }
  }, []);

  /**
   * Turn the lock on. Requires a successful authentication first, so the
   * setting can never be enabled on a device that cannot satisfy it.
   * @returns {Promise<{ok: boolean, reason?: string}>}
   */
  const enable = useCallback(async () => {
    const capabilities = await getCapabilities();
    if (!capabilities.hasHardware) {
      return { ok: false, reason: 'no_hardware' };
    }
    if (!capabilities.isEnrolled) {
      return { ok: false, reason: 'not_enrolled' };
    }

    if (isAuthenticatingRef.current) return { ok: false, reason: 'busy' };
    isAuthenticatingRef.current = true;
    try {
      const result = await authenticate('Confirm to turn on app lock');
      if (!result.success) {
        return { ok: false, reason: result.error || 'unknown' };
      }
      const persisted = await setEnabledStored(true);
      if (!persisted) {
        return { ok: false, reason: 'storage_failed' };
      }
      setMethod(describeMethod(capabilities.types));
      setIsEnabled(true);
      return { ok: true };
    } finally {
      setTimeout(() => {
        isAuthenticatingRef.current = false;
      }, 500);
    }
  }, []);

  /**
   * Turn the lock off. Requires authentication so that someone holding an
   * already-open phone cannot quietly remove the protection.
   * @returns {Promise<{ok: boolean, reason?: string}>}
   */
  const disable = useCallback(async () => {
    if (isAuthenticatingRef.current) return { ok: false, reason: 'busy' };
    isAuthenticatingRef.current = true;
    try {
      const result = await authenticate('Confirm to turn off app lock');
      if (!result.success) {
        return { ok: false, reason: result.error || 'unknown' };
      }
      await setEnabledStored(false);
      setIsEnabled(false);
      setIsLocked(false);
      return { ok: true };
    } finally {
      setTimeout(() => {
        isAuthenticatingRef.current = false;
      }, 500);
    }
  }, []);

  /**
   * Escape hatch used only from the lock screen when the device can no longer
   * authenticate. Skips the auth requirement by necessity — there is no way to
   * satisfy it — and is surfaced as an explicit, user-initiated choice.
   */
  const disableAfterLockout = useCallback(async () => {
    await setEnabledStored(false);
    setIsEnabled(false);
    setIsLocked(false);
    setLastError(null);
  }, []);

  // While Clerk is still resolving, `isSignedIn` is undefined. Cover during that
  // window too, otherwise a locked app can paint a frame of cached content
  // before the session is known. Once Clerk reports signed out, uncover — the
  // sign-in screen must never be trapped behind a lock.
  const showLockScreen = (isLocked || isObscured) && (isSignedIn || !isLoaded);

  const value = {
    isEnabled,
    isReady,
    isLocked,
    method,
    enable,
    disable,
    unlock,
  };

  return (
    <BiometricLockContext.Provider value={value}>
      {children}
      {showLockScreen && (
        <BiometricLockScreen
          // Only offer the unlock action once the app is actually locked; while
          // merely obscured there is nothing to unlock.
          requiresAuth={isLocked}
          error={lastError}
          method={method}
          onUnlock={unlock}
          onDisableAfterLockout={
            UNRECOVERABLE_ERRORS.includes(lastError) ? disableAfterLockout : null
          }
        />
      )}
    </BiometricLockContext.Provider>
  );
}

export default BiometricLockProvider;
