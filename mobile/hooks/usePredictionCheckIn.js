/**
 * usePredictionCheckIn Hook
 *
 * Manages the prediction check-in flow:
 * - Detects when to show check-in prompts
 * - Handles push notification deep links
 * - Tracks pending check-ins
 * - Shows in-app banners for check-ins
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import apiClient from '../services/apiClient';

// Fetch any pending predictions that need check-in
async function fetchPendingCheckIns() {
  const response = await apiClient.get('/predictions/pending-check-ins');
  return response.data;
}

// Submit outcome
async function submitOutcome(data) {
  const response = await apiClient.post('/predictions/outcome', data);
  return response.data;
}

// Fetch stories
async function fetchStories() {
  const response = await apiClient.get('/predictions/stories');
  return response.data;
}

/**
 * Hook for managing prediction check-ins
 */
export function usePredictionCheckIn() {
  const [currentCheckIn, setCurrentCheckIn] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerData, setBannerData] = useState(null);
  const appStateRef = useRef(AppState.currentState);
  const queryClient = useQueryClient();

  // Mutation for submitting outcomes
  const outcomeMutation = useMutation({
    mutationFn: submitOutcome,
    onSuccess: (data) => {
      queryClient.invalidateQueries(['time-aware-prediction']);
      queryClient.invalidateQueries(['morning-prediction']);
      queryClient.invalidateQueries(['predictions-stories']);
    },
  });

  // Fetch stories for "Remember when" moments
  const storiesQuery = useQuery({
    queryKey: ['predictions-stories'],
    queryFn: fetchStories,
    staleTime: 10 * 60 * 1000, // 10 minutes
    refetchOnWindowFocus: true,
  });

  // Handle incoming push notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (data?.type === 'prediction_check_in') {
          // Parse the check-in data
          const checkIn = {
            id: parseInt(data.predictionId),
            checkInId: parseInt(data.checkInId),
            buttons: data.buttons ? JSON.parse(data.buttons) : null,
            domain: data.domain || 'food',
            title: response.notification.request.content.title,
            body: response.notification.request.content.body,
            emoji: data.emoji,
          };

          setCurrentCheckIn(checkIn);
          setModalVisible(true);
        }
      }
    );

    return () => subscription.remove();
  }, []);

  // Check for pending check-ins when app comes to foreground
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (
        appStateRef.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        // App came to foreground - check for pending check-ins
        checkForPendingCheckIns();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // Check for any pending check-ins that weren't shown as notifications
  const checkForPendingCheckIns = useCallback(async () => {
    try {
      const response = await apiClient.get('/predictions/pending-check-ins');
      const pending = response.data?.checkIns || [];

      if (pending.length > 0) {
        // Show the most recent one as a banner
        const mostRecent = pending[0];
        setBannerData({
          id: mostRecent.predictionId,
          title: mostRecent.title,
          body: mostRecent.body,
          emoji: mostRecent.emoji,
          domain: mostRecent.domain,
          buttons: mostRecent.buttons,
        });
        setBannerVisible(true);
      }
    } catch (error) {
      // Silently fail - this is optional UX enhancement
      console.log('[CheckIn] No pending check-ins');
    }
  }, []);

  // Open the modal for a check-in
  const openCheckIn = useCallback((checkIn) => {
    setCurrentCheckIn(checkIn);
    setModalVisible(true);
    setBannerVisible(false);
  }, []);

  // Close the modal
  const closeCheckIn = useCallback(() => {
    setModalVisible(false);
    setCurrentCheckIn(null);
  }, []);

  // Dismiss the banner
  const dismissBanner = useCallback(() => {
    setBannerVisible(false);
    setBannerData(null);
  }, []);

  // Submit a quick response from the banner
  const submitQuickResponse = useCallback(
    async (predictionId, value) => {
      try {
        await outcomeMutation.mutateAsync({
          predictionId,
          value,
          method: 'banner',
        });
        dismissBanner();
        return { success: true };
      } catch (error) {
        console.error('[CheckIn] Error submitting quick response:', error);
        return { success: false, error };
      }
    },
    [outcomeMutation, dismissBanner]
  );

  // Handle completion of check-in (for callbacks)
  const handleCheckInComplete = useCallback(
    (result) => {
      closeCheckIn();

      // Show a toast or update UI based on result
      // This will be handled by the component using this hook
      return result;
    },
    [closeCheckIn]
  );

  return {
    // Modal state
    modalVisible,
    currentCheckIn,
    openCheckIn,
    closeCheckIn,

    // Banner state
    bannerVisible,
    bannerData,
    dismissBanner,

    // Actions
    submitQuickResponse,
    handleCheckInComplete,
    checkForPendingCheckIns,

    // Mutation state
    isSubmitting: outcomeMutation.isPending,
    submitError: outcomeMutation.error,

    // Stories
    stories: storiesQuery.data?.stories || [],
    hasStories: storiesQuery.data?.hasStories || false,
    storiesLoading: storiesQuery.isLoading,
  };
}

export default usePredictionCheckIn;
