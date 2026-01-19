/**
 * useTurnstile Hook
 *
 * Provides human verification via Cloudflare Turnstile for sensitive actions.
 *
 * Usage:
 * ```jsx
 * function DeleteAccountButton() {
 *   const { verify, isVerifying, TurnstileModal } = useTurnstile();
 *
 *   const handleDelete = async () => {
 *     const token = await verify('delete_account');
 *     if (token) {
 *       await deleteAccount({ turnstileToken: token });
 *     }
 *   };
 *
 *   return (
 *     <>
 *       <Button onPress={handleDelete} disabled={isVerifying}>
 *         Delete Account
 *       </Button>
 *       {TurnstileModal}
 *     </>
 *   );
 * }
 * ```
 */

import React, { useState, useCallback, useRef } from 'react';
import TurnstileVerification from '../components/security/TurnstileVerification';

export function useTurnstile() {
  const [isVisible, setIsVisible] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [action, setAction] = useState('verify');

  // Store resolve/reject for the promise
  const resolveRef = useRef(null);
  const rejectRef = useRef(null);

  /**
   * Trigger verification flow
   * @param {string} actionName - Action identifier (e.g., 'delete_account', 'change_password')
   * @returns {Promise<string|null>} - Turnstile token or null if cancelled
   */
  const verify = useCallback((actionName = 'verify') => {
    return new Promise((resolve, reject) => {
      resolveRef.current = resolve;
      rejectRef.current = reject;

      setAction(actionName);
      setIsVerifying(true);
      setIsVisible(true);
    });
  }, []);

  /**
   * Handle successful verification
   */
  const handleVerified = useCallback((token) => {
    setIsVisible(false);
    setIsVerifying(false);

    if (resolveRef.current) {
      resolveRef.current(token);
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  /**
   * Handle cancellation
   */
  const handleCancel = useCallback(() => {
    setIsVisible(false);
    setIsVerifying(false);

    if (resolveRef.current) {
      resolveRef.current(null); // Resolve with null, not reject
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  /**
   * Handle error
   */
  const handleError = useCallback((error) => {
    setIsVisible(false);
    setIsVerifying(false);

    if (rejectRef.current) {
      rejectRef.current(new Error(error));
      resolveRef.current = null;
      rejectRef.current = null;
    }
  }, []);

  /**
   * Modal component to render
   */
  const TurnstileModal = (
    <TurnstileVerification
      visible={isVisible}
      action={action}
      onVerified={handleVerified}
      onCancel={handleCancel}
      onError={handleError}
    />
  );

  return {
    verify,
    isVerifying,
    isVisible,
    TurnstileModal,
  };
}

export default useTurnstile;
