/**
 * PredictionCheckInProvider
 *
 * A context provider that manages the prediction check-in flow globally.
 * Wrap your app with this to enable:
 * - Push notification handling for check-ins
 * - In-app banners for pending check-ins
 * - Modal for detailed feedback
 * - Toast confirmations after submission
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from 'react';
import { AppState } from 'react-native';
import * as Notifications from 'expo-notifications';
import { useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import apiClient from '../../services/apiClient';
import PredictionCheckInModal from './PredictionCheckInModal';
import PredictionCheckInBanner from './PredictionCheckInBanner';
import { useNotification } from '../../providers/NotificationProvider';

// Context
const PredictionCheckInContext = createContext(null);

// Hook to use the context
export function usePredictionCheckInContext() {
  const context = useContext(PredictionCheckInContext);
  if (!context) {
    throw new Error(
      'usePredictionCheckInContext must be used within PredictionCheckInProvider'
    );
  }
  return context;
}

export default function PredictionCheckInProvider({ children }) {
  // State
  const [currentCheckIn, setCurrentCheckIn] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerData, setBannerData] = useState(null);
  const appStateRef = useRef(AppState.currentState);
  const queryClient = useQueryClient();

  // Get toast function from notification provider (if available)
  const notificationContext = useNotification?.();
  const showToast = notificationContext?.showToast;

  // Handle incoming push notifications
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;

        if (data?.type === 'prediction_check_in') {
          handleCheckInNotification(data, response.notification.request.content);
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
        checkForPendingCheckIns();
      }
      appStateRef.current = nextAppState;
    });

    return () => subscription.remove();
  }, []);

  // Handle push notification for check-in
  const handleCheckInNotification = useCallback((data, content) => {
    const checkIn = {
      id: parseInt(data.predictionId),
      checkInId: parseInt(data.checkInId),
      buttons: data.buttons ? JSON.parse(data.buttons) : getDefaultButtons(data.domain),
      domain: data.domain || 'food',
      title: content.title,
      body: content.body,
      emoji: data.emoji,
    };

    setCurrentCheckIn(checkIn);
    setModalVisible(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  }, []);

  // Check for any pending check-ins
  const checkForPendingCheckIns = useCallback(async () => {
    try {
      const response = await apiClient.get('/predictions/stories');
      const stories = response.data?.stories || [];

      // Also check for pending check-ins if that endpoint exists
      // For now, show stories as banners if we have new ones
      if (stories.length > 0 && !modalVisible && !bannerVisible) {
        const story = stories[0];
        setBannerData({
          id: story.id,
          title: story.storyTitle,
          body: story.storyBody,
          emoji: story.storyEmoji,
          domain: 'food', // Default domain for stories
          isStory: true,
        });
        setBannerVisible(true);
      }
    } catch (error) {
      // Silent fail - this is optional
      console.log('[CheckInProvider] No pending items');
    }
  }, [modalVisible, bannerVisible]);

  // Open modal for a check-in
  const openCheckIn = useCallback((checkIn) => {
    setCurrentCheckIn(checkIn);
    setModalVisible(true);
    setBannerVisible(false);
  }, []);

  // Close modal
  const closeModal = useCallback(() => {
    setModalVisible(false);
    setCurrentCheckIn(null);
  }, []);

  // Dismiss banner
  const dismissBanner = useCallback(() => {
    setBannerVisible(false);
    setBannerData(null);
  }, []);

  // Handle quick response from banner
  const handleQuickResponse = useCallback(
    async (predictionId, value) => {
      try {
        const response = await apiClient.post('/predictions/outcome', {
          predictionId,
          value,
          method: 'banner',
        });

        // Show success toast
        if (showToast) {
          showToast({
            type: 'success',
            title: response.data.wasAccurate
              ? 'Pattern confirmed!'
              : 'Thanks for the feedback!',
            message: response.data.message,
            duration: 3000,
          });
        }

        // Invalidate queries
        queryClient.invalidateQueries(['time-aware-prediction']);
        queryClient.invalidateQueries(['morning-prediction']);
        queryClient.invalidateQueries(['prediction-stories']);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        dismissBanner();
      } catch (error) {
        console.error('[CheckInProvider] Error submitting response:', error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    },
    [queryClient, showToast, dismissBanner]
  );

  // Handle expand from banner (open modal)
  const handleExpandBanner = useCallback(
    (data) => {
      if (data.isStory) {
        // Handle story differently - just dismiss for now
        dismissBanner();
      } else {
        openCheckIn(data);
      }
    },
    [openCheckIn, dismissBanner]
  );

  // Handle check-in completion
  const handleCheckInComplete = useCallback(
    (result) => {
      closeModal();

      if (showToast) {
        showToast({
          type: 'success',
          title: result.wasAccurate
            ? 'Pattern confirmed!'
            : 'Thanks for the feedback!',
          message: result.message,
          duration: 3000,
        });
      }
    },
    [closeModal, showToast]
  );

  // Context value
  const contextValue = {
    // Modal state
    modalVisible,
    currentCheckIn,
    openCheckIn,
    closeModal,

    // Banner state
    bannerVisible,
    bannerData,
    dismissBanner,

    // Actions
    checkForPendingCheckIns,
  };

  return (
    <PredictionCheckInContext.Provider value={contextValue}>
      {children}

      {/* Check-in banner */}
      <PredictionCheckInBanner
        visible={bannerVisible}
        data={bannerData}
        onDismiss={dismissBanner}
        onQuickResponse={handleQuickResponse}
        onExpand={handleExpandBanner}
      />

      {/* Check-in modal */}
      <PredictionCheckInModal
        visible={modalVisible}
        prediction={currentCheckIn}
        onClose={closeModal}
        onComplete={handleCheckInComplete}
      />
    </PredictionCheckInContext.Provider>
  );
}

// Helper to get default buttons by domain
function getDefaultButtons(domain) {
  const domainButtons = {
    food: [
      { label: '😴 Tired', value: 'tired' },
      { label: '😊 Fine', value: 'fine' },
      { label: '😐 Somewhat', value: 'somewhat' },
    ],
    hydration: [
      { label: '🥱 Feeling it', value: 'tired' },
      { label: '💪 Hydrated', value: 'fine' },
      { label: '🤷 Not sure', value: 'unsure' },
    ],
    mood: [
      { label: '😔 Low', value: 'tired' },
      { label: '😊 Good', value: 'fine' },
      { label: '😐 Okay', value: 'somewhat' },
    ],
    activity: [
      { label: '😫 Exhausted', value: 'tired' },
      { label: '💪 Strong', value: 'fine' },
      { label: '🦵 Sore', value: 'somewhat' },
    ],
  };

  return domainButtons[domain] || domainButtons.food;
}
