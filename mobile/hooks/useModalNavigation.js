import { useCallback, useEffect, useRef } from 'react';
import { InteractionManager } from 'react-native';

const MODAL_DISMISS_FALLBACK_MS = 450;

/**
 * Queues navigation until a native modal has finished dismissing.
 *
 * iOS calls onDismiss after the native presentation is gone. Android does not
 * reliably provide that callback for every modal presentation, so the guarded
 * fallback keeps the action working there without allowing a duplicate push.
 */
export default function useModalNavigation(router) {
  const pendingRouteRef = useRef(null);
  const fallbackTimerRef = useRef(null);
  const interactionRef = useRef(null);

  const clearScheduledWork = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    interactionRef.current?.cancel?.();
    interactionRef.current = null;
  }, []);

  const flushPendingRoute = useCallback(() => {
    const route = pendingRouteRef.current;
    if (!route) return;

    pendingRouteRef.current = null;
    clearScheduledWork();
    interactionRef.current = InteractionManager.runAfterInteractions(() => {
      interactionRef.current = null;
      router.push(route);
    });
  }, [clearScheduledWork, router]);

  const navigateAfterModalClose = useCallback((closeModal, route) => {
    if (!route) return;

    clearScheduledWork();
    pendingRouteRef.current = route;
    closeModal?.();
    fallbackTimerRef.current = setTimeout(
      flushPendingRoute,
      MODAL_DISMISS_FALLBACK_MS,
    );
  }, [clearScheduledWork, flushPendingRoute]);

  useEffect(() => () => {
    pendingRouteRef.current = null;
    clearScheduledWork();
  }, [clearScheduledWork]);

  return {
    navigateAfterModalClose,
    handleModalDismiss: flushPendingRoute,
  };
}

