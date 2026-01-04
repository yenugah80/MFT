/**
 * useErrorHandler Hook
 *
 * Provides error handling, user messages, and recovery in React components.
 *
 * Usage:
 *   const { handleError, showError, isRetryable } = useErrorHandler();
 *
 *   const fetchData = async () => {
 *     try {
 *       const data = await api.getData();
 *     } catch (error) {
 *       const { message, retry } = handleError(error, { operation: 'Fetch data' });
 *       showError(message);
 *       if (retry) {
 *         // Show retry button
 *       }
 *     }
 *   };
 */

import { useCallback, useState } from 'react';
import { Toast } from 'react-native-toast-message';
import {
  handleError,
  shouldRetry,
  logError,
  getUserMessage,
} from '@/services/errorHandler';

export function useErrorHandler() {
  const [lastError, setLastError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Show error to user via toast
   */
  const showError = useCallback((message, duration = 4000) => {
    Toast.show({
      type: 'error',
      text1: 'Error',
      text2: message,
      duration,
      position: 'bottom',
    });
  }, []);

  /**
   * Show success message
   */
  const showSuccess = useCallback((message) => {
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: message,
      duration: 2000,
      position: 'bottom',
    });
  }, []);

  /**
   * Show info message
   */
  const showInfo = useCallback((message) => {
    Toast.show({
      type: 'info',
      text1: 'Info',
      text2: message,
      duration: 2000,
      position: 'bottom',
    });
  }, []);

  /**
   * Handle error and show to user
   */
  const handleAndShow = useCallback((error, context = {}) => {
    const result = handleError(error, context);
    setLastError(result);

    // Show user message
    showError(result.message);

    return result;
  }, [showError]);

  /**
   * Execute async function with error handling
   */
  const executeAsync = useCallback(async (fn, context = {}) => {
    try {
      setIsLoading(true);
      const result = await fn();
      setLastError(null);
      return { success: true, data: result };
    } catch (error) {
      const result = handleAndShow(error, context);
      return { success: false, error: result };
    } finally {
      setIsLoading(false);
    }
  }, [handleAndShow]);

  /**
   * Execute with retry capability
   */
  const executeWithRetry = useCallback(
    async (fn, context = {}, maxRetries = 3) => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          setIsLoading(true);
          const result = await fn();
          setLastError(null);
          return { success: true, data: result };
        } catch (error) {
          if (!shouldRetry(error) || attempt === maxRetries - 1) {
            const result = handleAndShow(error, context);
            return { success: false, error: result };
          }

          // Wait before retry
          const delay = Math.pow(2, attempt) * 1000;
          showInfo(`Retrying... (attempt ${attempt + 2}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } finally {
          setIsLoading(false);
        }
      }
    },
    [handleAndShow, showInfo]
  );

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);

  /**
   * Get user message for error
   */
  const getUserMsg = useCallback((error, operation) => {
    return getUserMessage(error, operation);
  }, []);

  return {
    // State
    lastError,
    isLoading,

    // Messages
    showError,
    showSuccess,
    showInfo,

    // Error handling
    handleError: handleAndShow,
    handleAndShow,
    executeAsync,
    executeWithRetry,
    clearError,
    getUserMsg,

    // Utilities
    isRetryable: (error) => shouldRetry(error),
  };
}

export default useErrorHandler;
